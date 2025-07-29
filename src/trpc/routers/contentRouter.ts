//@ts-nocheck
import { procedures, router } from "..";
import { createContentSchema } from "../schemas/createContentSchema";
import { xid, z } from 'zod'
import { PrismaClient } from "../../database/generated/prisma";
import { uploadFileToIPFS } from "../../utils/upload";
import { submitContent, MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID, mintContentAsNft } from '../../clients/nftProgram/umi/src'
import { PublicKey, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { uuid } from "zod";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { ASSOCIATED_TOKEN_PROGRAM_ADDRESS, SYSTEM_PROGRAM_ADDRESS, TOKEN_METADATA_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from 'gill/programs';

import { publicKey } from "@metaplex-foundation/umi";
import { findMetadataPda } from "@metaplex-foundation/mpl-token-metadata";
import { findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox'
import { TRPCError } from "@trpc/server";
const prismaClient = new PrismaClient();
const umi = createUmi("https://api.devnet.solana.com");
export const contentRouter = router({
    generate: procedures.input(createContentSchema).mutation(async ({ input, ctx }) => {
        try {
                 const user=await prismaClient.user.findUnique({
                               where: {
                                   wallet: ctx.wallet.toString()
                               }
                           })
                           if(!user){
                               throw new TRPCError({
                                   code: 'NOT_FOUND',      
                               })
                           }
const id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
            const contentAccount = umi.eddsa.findPda(MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID,
                [Buffer.from("content"), Buffer.from(id.toString())]
            )
            const aiModel = await prismaClient.aIModel.findUnique({
                where: {
                    id: input.aiModelId
                }
            })
            if (!aiModel) {
                throw new Error("AI Model not found");
            }

            const contentType = input.contentType;
            if (!contentType) {
                throw new Error("Content type is required");
            }
            const arr = ["image", "music", "text", "video"]
            if (!arr.includes(contentType)) {
                throw new Error("Invalid content type");
            }
            const contentTypeId = arr.indexOf(contentType);
            const metadataUri = await uploadFileToIPFS({
                title: input.title,
                description: input.description,
                contentType: contentType,
                aiModelId: input.aiModelId,
                prompt: input.prompt,
                wallet: ctx.wallet,
            }, "metadata", ctx.wallet);
            const contentUri = await uploadFileToIPFS(input.contentData, "content", ctx.wallet);

            const transactionBuilder = await submitContent(umi, {
                aiModelUsed: publicKey(aiModel.aiModelPublicKey),
                creator: ctx.wallet,
                contentAccount: contentAccount,
                systemProgram: publicKey(SYSTEM_PROGRAM_ADDRESS)

            }, {
                aiModelRoyalty: aiModel.royaltyPercentage,
                aiModelUsed: publicKey(aiModel.aiModelPublicKey),
                contentIpfs: contentUri,
                contentType: contentTypeId,
                id: id,
                metadataIpfs: metadataUri,
                prompt: input.prompt
            })
            const transaction = await transactionBuilder.buildAndSign(umi)
            const serializedTransaction = umi.transactions.serialize(transaction);

            const pendingTransaction = await prismaClient.pendingContentSubmission.create({
                data: {
                    aiModel: aiModel.aiModelPublicKey,
                    contentUri: contentUri,
                    metadataUri: metadataUri,
                    contentId:id,
                    expiredAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
                    createdAt: new Date(),
                    serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
                    creatorId: user.id,
                    contentType: contentTypeId,
                    prompt: input.prompt,
                    user: ctx.wallet
                }
            })
            return {
                success: true,
                message: "Content transaction created successfully. Please sign with your wallet.",
                serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
                contentAccountPublicKey: contentAccount.toString(),
                pendingContentId: pendingTransaction.id,
                contentId: id
            }

        } catch (error) {
            console.log("An error occurred while generating content:", error);
            throw new Error("Failed to generate content");
        }
    }),
    confirmContentSubmission: procedures.input(z.object({
        transactionSignature: z.string(),
        pendingContentId: z.number()
    })).mutation(async ({ input, ctx }) => {
        try {
                  const user=await prismaClient.user.findUnique({
                                where: {
                                    wallet: ctx.wallet.toString()
                                }
                            })
                            if(!user){
                                throw new TRPCError({
                                    code: 'NOT_FOUND',      
                                })
                            }
            const pendingContent = await prismaClient.pendingContentSubmission.findUnique({
                where: {
                    id: input.pendingContentId,
                    creatorId: user.id
                }
            })
            if (!pendingContent) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Pending content submission not found'
                });
            }
            if (new Date() > pendingContent.expiredAt) {
                await prismaClient.pendingContentSubmission.delete({
                    where: { id: input.pendingContentId }
                });
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Content submission expired. Please try again.'
                });
            }
            const content = await prismaClient.content.create({
                data: {
                    aiModel: pendingContent.aiModel,
                    contentType: pendingContent.contentType,
                    contentUri: pendingContent.contentUri,
                    metadataUri: pendingContent.metadataUri,
                    prompt: pendingContent.prompt,
                    createdAt: pendingContent.createdAt,
                    creator: ctx.wallet,
                    creatorId: pendingContent.creatorId,
                    id: pendingContent.id,
                },
                include: {
                    creator: {
                        select: {
                            id: true,
                            wallet: true
                        }
                    }
                }

            })
            await prismaClient.pendingContentSubmission.delete({
                where: {
                    id: input.pendingContentId
                }
            })
            return {
                success: true,
                message: "Content submitted successfully",
                content: content
            }



        } catch (error) {
            console.log("An error occurred while confirming content submission:", error);
            throw new Error("Failed to confirm content submission");
        }
    }),
    mintAsNft: procedures.input(z.object({
        contentId: z.number(),
        name: z.string().min(1).max(50),
        symbol: z.string().min(1).max(10),
        royaltyPercentage: z.number().min(0).max(50).default(10)
    }))
        .mutation(async ({ input, ctx }) => {
            try {
             const user=await prismaClient.user.findUnique({
                           where: {
                               wallet: ctx.wallet.toString()
                           }
                       })
                       if(!user){
                           throw new TRPCError({
                               code: 'NOT_FOUND',      
                           })
                       }

                const content = await prismaClient.content.findUnique({
                    where: {
                        id: input.contentId,
                        creatorId: user.id
                    }
                })

                if (!content) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Content not found or you are not the creator'
                    });
                }
                const mint = umi.eddsa.findPda(
                    MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID,
                    [Buffer.from("mint"), Buffer.from(content.id.toString(16).padStart(16, '0'), 'hex')]
                )

                const metadata = findMetadataPda(umi, {
                    mint: publicKey(mint[0].toString())
                })
                const contentAccount = umi.eddsa.findPda(
                    MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID,
                    [Buffer.from("content"), Buffer.from(content.id.toString())]
                )
                const config = umi.eddsa.findPda(
                    MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID,
                    [Buffer.from("config")]
                )
                const userConfig = umi.eddsa.findPda(
                    MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID,
                    [Buffer.from("user_config"), ctx.wallet.toBuffer()]
                )
                const nftMetadata = umi.eddsa.findPda(
                    MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID,
                    [Buffer.from("nft_metadata"), Buffer.from(content.id.toString(16).padStart(16, '0'), 'hex')]
                )
                const tokenAccount = findAssociatedTokenPda(
                    umi,
                    {
                        mint: publicKey(mint),
                        owner: ctx.wallet,
                    }
                )
                const transactionBuilder = await mintContentAsNft(umi, {
                    contentId: content.id,
                    creator: ctx.wallet,
                    metadata: metadata,
                    nftName: input.name,
                    nftSymbol: input.symbol,
                    mint: mint,
                    config,
                    rent: publicKey(SYSVAR_RENT_PUBKEY),
                    contentAccount: contentAccount,
                    nftMetadata,
                    associatedTokenProgram: publicKey(ASSOCIATED_TOKEN_PROGRAM_ADDRESS),
                    systemProgram: publicKey(SYSTEM_PROGRAM_ADDRESS),
                    tokenAccount,
                    tokenMetadataProgram: publicKey(TOKEN_METADATA_PROGRAM_ADDRESS),
                    tokenProgram: publicKey(TOKEN_PROGRAM_ADDRESS),
                    userConfig
                })

                const transaction = await transactionBuilder.buildAndSign(umi)
                const serializedTransaction = umi.transactions.serialize(transaction);
    const id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
                const pendingNft = await prismaClient.pendingNFTSubmission.create({
                    data: {
                        mintAddress: mint.toString(),
                        serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
                        contentId: content.id,
                        createdAt: new Date(),
                        owner: ctx.wallet,
                        ownerId: content.creatorId,
                        tokenAccount: tokenAccount.toString(),
                        nftId:id
                    }
                })
                return {
                    success: true,
                    message: "Content transaction created successfully. Please sign with your wallet.",
                    serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
                    pendingNftId: pendingNft.id,
                    nftId: id
                }
            } catch (error) {
                console.log("An error occurred while minting as NFT:", error);
                throw new Error("Failed to mint as NFT");
            }

        }),
    confirmNFTSubmission: procedures.input(z.object({
        transactionSignature: z.string(),
        pendingNftId: z.number()
    })).mutation(async ({ input, ctx }) => {
        try {
          const user=await prismaClient.user.findUnique({
                        where: {
                            wallet: ctx.wallet.toString()
                        }
                    })
                    if(!user){
                        throw new TRPCError({
                            code: 'NOT_FOUND',      
                        })
                    }
            
            const pendingNFT = await prismaClient.pendingNFTSubmission.findUnique({
                where: {
                    id: input.pendingNftId,
                    ownerId: user.id
                }
            })
            if (!pendingNFT) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Pending NFT submission not found'
                });
            }

            const nft =await prismaClient.nFT.create({
                data:{
                    mintAddress: pendingNFT.mintAddress,
                    ownerId: pendingNFT.ownerId,
                    
                    tokenAccount: pendingNFT.tokenAccount,
                    contentId:pendingNFT.contentId,
                    createdAt:pendingNFT.createdAt,
                    id:pendingNFT.id,
                }
            })
               
            await prismaClient.pendingNFTSubmission.delete({
                where: {
                    id: input.pendingNftId
                }
            })
            return {
                success: true,
                message: "Content submitted successfully",
                nft: nft
            }

        } catch (error) {
            console.log("An error occurred while confirming NFT submission:", error);
            throw new Error("Failed to confirm NFT submission");
        }
    }),

})