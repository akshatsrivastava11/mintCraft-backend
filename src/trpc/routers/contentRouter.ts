import { procedures, router } from "..";
import { createContentSchema } from "../schemas/createContentSchema";
import { xid, z } from 'zod'
import { PrismaClient } from "../../database/generated/prisma";
import { uploadFileToIPFS } from "../../utils/upload";
import { submitContent, MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID,mintContentAsNft } from '../../clients/nftProgram/umi/src'
import { PublicKey } from "@solana/web3.js";
import { uuid } from "zod";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { SYSTEM_PROGRAM_ADDRESS } from "gill/programs";
import { publicKey } from "@metaplex-foundation/umi";
import { TRPCError } from "@trpc/server";
const prismaClient = new PrismaClient();
const umi = createUmi("https://api.devnet.solana.com");
export const contentRouter = router({
    generate: procedures.input(createContentSchema).mutation(async ({ input, ctx }) => {
        try {
            if (!ctx.user) {
                throw new Error("User not authenticated");
            }
            const id = Number(uuid().length(14))

            // const contentAccount=PublicKey.findProgramAddressSync(
            //     [Buffer.from("content"),Buffer.from(id.toString())],
            //     new PublicKey(MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID)
            // 


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
                wallet: ctx.user.wallet,
            }, "metadata", ctx.user.wallet);
            const contentUri = await uploadFileToIPFS(input.contentData, "content", ctx.user.wallet);

            const transactionBuilder = await submitContent(umi, {
                aiModelUsed: publicKey(aiModel.aiModelPublicKey),
                creator: ctx.user.wallet,
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
                    expiredAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
                    createdAt: new Date(),
                    serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
                    creatorId: ctx.user.id,
                    contentType: contentTypeId,
                    prompt: input.prompt,
                    id: id,
                    user: ctx.user.wallet
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
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated'
                });
            }
            const pendingContent = await prismaClient.pendingContentSubmission.findUnique({
                where: {
                    id: input.pendingContentId,
                    creatorId: ctx.user.id
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
                    creator: ctx.user.wallet,
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
                if (!ctx.user) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'User not authenticated'
                    });
                }

                const content=await prismaClient.content.findUnique({
                    where:{
                        id:input.contentId,
                        creatorId:ctx.user.id
                    }
                })

            if (!content) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Content not found or you are not the creator'
                });
            }
            

            const transactionBuilder=await mintContentAsNft(umi,{
                contentId:content.id,
                creator:ctx.user.wallet,
                metadata:content.metadataUri,
                nftName:input.name,
                nftSymbol:input.symbol,
                
            })




            return {
                success: true,
                message: "NFT mint transaction created successfully",
                // serializedTransaction, pendingMintId, etc.
            }




            } catch (error) {
                console.log("An error occurred while minting as NFT:", error);
                throw new Error("Failed to mint as NFT");
            }

        }),
    getMyContent: procedures.input(z.object({})).query(async ({ input, ctx }) => { }),

})