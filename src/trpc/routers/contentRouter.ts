//@ts-nocheck
import { procedures, router } from "..";
import { createContentSchema } from "../schemas/createContentSchema";
import { bigint, string, xid, z } from 'zod'
import { BN } from '@coral-xyz/anchor'
import { PrismaClient } from "../../database/generated/prisma";
import { uploadFileToIPFS } from "../../utils/upload";
// import { submitContent, MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID, mintContentAsNft } from '../../clients/nftProgram/umi/src'
import * as nftProgram from '../../clients/nftProgram/js/src'
import { Connection, PublicKey, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from "@solana/web3.js";
import { uuid } from "zod";
// import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { ASSOCIATED_TOKEN_PROGRAM_ADDRESS, SYSTEM_PROGRAM_ADDRESS, TOKEN_METADATA_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from 'gill/programs';
import { address, createRpc, AccountRole, LAMPORTS_PER_SOL } from 'gill'
// import { publicKey } from "@metaplex-foundation/umi";
// import { findMetadataPda } from "@metaplex-foundation/mpl-token-metadata";
// import { findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox'
import { TRPCError } from "@trpc/server";
import { sendRequest, blobToBase64 } from "../../utils/request";
// import 
const prismaClient = new PrismaClient();
// const MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS=address("W626GLKRRbE1rPZnNgi5kHgUUfFTiyzPqdvS196NdaZ")
import { rpc } from '../index'
import { initializeUserConfig } from "../config/nftProgramConfigs";
const findAssociatedTokenAddress = async (mint: PublicKey, owner: String): Promise<[PublicKey, number]> => {
    return await PublicKey.findProgramAddressSync(
        [
            new PublicKey(owner).toBuffer(),
            new PublicKey(TOKEN_PROGRAM_ADDRESS).toBuffer(),
            mint.toBuffer(),
        ],
        new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ADDRESS)
    );
};

const findMetadataAddress = async (mint: PublicKey): Promise<[PublicKey, number]> => {
    return await PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            new PublicKey(TOKEN_METADATA_PROGRAM_ADDRESS).toBuffer(),
            mint.toBuffer(),
        ],
        new PublicKey(TOKEN_METADATA_PROGRAM_ADDRESS)
    );
};

export const contentRouter = router({
    initilizeUserConfig: procedures.mutation(async ({ ctx }) => {
        console.log("wallet", ctx.wallet);
        console.log("In the initializeUserConfig");
        const config=await PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            new PublicKey(nftProgram.MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS)
        )
        const connection = new Connection("https://api.devnet.solana.com");

        // ✅ Derive user_config PDA
        const [userConfigPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("user_config"), config[0].toBuffer(),new PublicKey(ctx.wallet).toBuffer()],
            new PublicKey(nftProgram.MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS)
        );

        // ✅ Check if the PDA exists
        const accountInfo = await connection.getAccountInfo(userConfigPda, {
            commitment: "confirmed",
        });
        console.log("777777777777777",accountInfo)
        if (accountInfo?.data) {
            console.log("User config already exists!");
            return {
                success: true,
                alreadyExists:true,
                message:"User configs already exists",
                serializedTransaction: null,
            };
        } else {
            console.log("User config does NOT exist! Initializing...");

            const serializedTransaction = await initializeUserConfig(ctx.wallet);

            return {
                success: true,
                message: "User config initialized successfully",
                alreadyExists:false,
                serializedTransaction: Buffer.from(serializedTransaction).toString("base64"),
            };
        }
    }),
    generate: procedures.input(createContentSchema).mutation(async ({ input, ctx }) => {
        try {
            console.log("contentRouter generate with payment integration");

            const user = await prismaClient.user.findUnique({
                where: { wallet: ctx.wallet.toString() }
            });
            console.log("the user is ", user)

            if (!user) {
                throw new TRPCError({ code: 'NOT_FOUND' });
            }

            const aiModel = await prismaClient.aIModel.findUnique({
                where: { id: input.aiModelId }
            });

            if (!aiModel) {
                throw new TRPCError({ code: 'NOT_FOUND' });
            }

            // Generate content first
            const headers = aiModel.headersJSON;
            const apiEndpoint = aiModel.apiEndpoint;
            const body=aiModel.bodyTemplate
            const userprompt=aiModel.userPromptField
            console.log("user prompt is ", userprompt)
            console.log("the body is ", body)
            console.log("the input is ", input)
            const newBody=body.replace(userprompt,input.prompt)
            const responseTemplate=aiModel.responseTemplate
            const toBeplaced=aiModel.finalContentField
            console.log("the body is ", newBody)
            console.log("the json body is ", JSON.stringify(newBody),responseTemplate,toBeplaced)
            console.log("Calling AI model API...");
            console.log("header and apiEndpoint", headers, apiEndpoint)
            
            // const body = input.prompt
            // const response = await sendRequest(apiEndpoint, headers, JSON.stringify(newBody),responseTemplate,toBeplaced);
            console.log("AI response received");

            const response = "https://ipfs.io/ipfs/bafkreigf3s3eg6ilsgi5q72byqmzrlgcmfvv6m3aevhb6jai6avmv7tw2i"
            // Upload content to IPFS first (free operation)
            let contentUri;
            if(typeof response=="string" ){
                if(response.startsWith("http://") || response.startsWith("https://")){
                    contentUri=response
                }
                else{
                    
                    contentUri = await uploadFileToIPFS(response, "content", ctx.wallet);
                }
            }
            else{
                contentUri = await uploadFileToIPFS(response, "content", ctx.wallet);
            }
            console.log("Content uploaded to IPFS:", contentUri);

            // Prepare metadata for upload
            const metadataToUpload = {
                title: input.title,
                description: input.description,
                contentType: input.contentType,
                aiModelId: input.aiModelId,
                prompt: input.prompt,
                wallet: ctx.wallet,
                content_uri: contentUri,
                // Additional NFT metadata
                attributes: [
                    {
                        trait_type: "Generation Date",
                        value: new Date().toISOString().split('T')[0]
                    },
                    {
                        trait_type: "AI Model Version",
                        value: aiModel.version || "1.0"
                    }
                ],
                // Add external_url based on environment
                external_url: process.env.NODE_ENV === 'production'
                    ? `${process.env.NEXT_PUBLIC_APP_URL}/content/${ctx.wallet}/${input.contentType}`
                    : `http://localhost:3000/content/${ctx.wallet}/${input.contentType}`,
                // Add animation_url for video/audio content
                ...(["video", "music"].includes(input.contentType) && {
                    animation_url: contentUri
                })
            };

            // Upload metadata to IPFS (this is what costs money)
            console.log("Uploading metadata to IPFS...");
            const metadataUri = await uploadFileToIPFS(metadataToUpload, "metadata", ctx.wallet);
            console.log("Metadata uploaded to IPFS:", metadataUri);

            // Create blockchain transaction data
            const id = crypto.getRandomValues(new Uint32Array(1))[0] % 2_000_000_000;
            const contentAccount = await PublicKey.findProgramAddressSync(
                [Buffer.from("content"), new BN(id).toArrayLike(Buffer, "le", 8)],
                new PublicKey(nftProgram.MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS)
            );
            console.log("00000000000000000000000",id)
            console.log("22222222222222222222222", contentAccount[0])

            console.log("8888888888888888888888888888888", id)
            // Validate content type
            const validContentTypes = ["image", "music", "text", "video"];
            if (!validContentTypes.includes(input.contentType)) {
                throw new Error("Invalid content type");
            }
            const contentTypeId = validContentTypes.indexOf(input.contentType);

            // Create the submit content instruction
            const transactionIx = await nftProgram.getSubmitContentInstruction({
                aiModelRoyalty: aiModel.royaltyPercentage,
                aiModelUsed: address(aiModel.aiModelPublicKey),
                aiModelUsedArg: address(aiModel.aiModelPublicKey),
                contentAccount: contentAccount,
                contentIpfs: contentUri,
                contentType: contentTypeId,
                id: id,
                metadataIpfs: metadataUri,
                prompt: input.prompt,
                systemProgram: address(SYSTEM_PROGRAM_ADDRESS),
                creator: address(ctx.wallet),
            }, {
                programAddress: nftProgram.MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS
            });

            // Add payment instruction for metadata upload cost
            // const METADATA_UPLOAD_COST = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL
            // const TREASURY_WALLET = new PublicKey(process.env.TREASURY_WALLET_ADDRESS!);

            // const paymentIx = SystemProgram.transfer({
            //     fromPubkey: new PublicKey(ctx.wallet),
            //     toPubkey: TREASURY_WALLET,
            //     lamports: METADATA_UPLOAD_COST
            // });

            // Convert submit content instruction
            const keys: AccountMeta[] = transactionIx.accounts.map((account) => ({
                pubkey: new PublicKey(account.address),
                isSigner: account.address.toString() === ctx.wallet.toString(),
                isWritable: account.role === AccountRole.WRITABLE_SIGNER || account.role === AccountRole.WRITABLE,
            }));

            const convertedSubmitIx = new TransactionInstruction({
                keys: keys,
                programId: new PublicKey(transactionIx.programAddress),
                data: Buffer.from(transactionIx.data),
            });

            // Create transaction with both payment and content submission
            const recentBlockhash = await rpc.getLatestBlockhash().send()
                .then(data => data.value.blockhash.toString());

            const transaction = new Transaction({
                feePayer: new PublicKey(ctx.wallet),
                recentBlockhash: recentBlockhash
            })           // Payment for metadata first
                .add(convertedSubmitIx);  // Then content submission

            const serializedTransaction = transaction.serialize({ requireAllSignatures: false });
            // const response1 = await blobToBase64(response)
            // Store pending 
            console.log("user id is ", user.id)
            const pendingTransaction = await prismaClient.pendingContentSubmission.create({
                data: {
                    aiModel: aiModel.aiModelPublicKey,

                    contentUri: contentUri,
                    metadataUri: metadataUri,
                    expiredAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
                    createdAt: new Date(),
                    serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
                    creatorId: user.id || null,
                    response: Buffer.from(response,'utf-8'),
                    contentType: contentTypeId,
                    prompt: input.prompt,
                    contentId: id
                }
            });
            console.log("3333333333333333333333", pendingTransaction)
            // console.log("PRogram addresss is",transactionIx.programAddress)
            return {
                success: true,
                message: "Content and metadata prepared. Please sign the transaction to pay for metadata storage and submit content.",
                serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
                contentAccountPublicKey: contentAccount[0].toString(),
                pendingContentId: pendingTransaction.id,
                contentId: id.toString(),
                contentUri: contentUri,
                metadataUri: metadataUri,
                paymentDescription: "Payment for IPFS metadata storage"
            };

        } catch (error) {
            console.error("Error in content generation:", error);

            // If this was an IPFS-related error, provide specific feedback
            if (error.message.includes('IPFS') || error.message.includes('Pinata')) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to upload to IPFS storage. Please try again.'
                });
            }

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to generate content. Please try again.'
            });
        }
    }),

    confirmContentSubmission: procedures.input(z.object({
        transactionSignature: z.string(),
        pendingContentId: z.number()
    })).mutation(async ({ input, ctx }) => {
        try {
            console.log("in the confirm content submission")
            // const pendingContentId=BigInt(input.pendingContentId)
            // console.log("pending contentid is",pendingContentId)
            const user = await prismaClient.user.findUnique({
                where: {
                    wallet: ctx.wallet.toString()
                }
            })
            if (!user) {
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
            console.log("pending content is ", pendingContent)
            console.log("pending content is", input.pendingContentId)
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
            // console.log("")
            const content = await prismaClient.content.create({
                data: {
                    aiModel: pendingContent.aiModel,
                    contentType: pendingContent.contentType,
                    contentUri: pendingContent.contentUri,
                    metadataUri: pendingContent.metadataUri,
                    prompt: pendingContent.prompt,
                    createdAt: pendingContent.createdAt,
                    creatorId: pendingContent.creatorId,
                    response: pendingContent.response,
                    contentId: pendingContent.contentId,
                    id: pendingContent.id
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
            console.log('content is ', content)
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
                // const contentId=BigInt(input.contentIdis)
                const user = await prismaClient.user.findUnique({
                    where: {
                        wallet: ctx.wallet.toString()
                    }
                })
                if (!user) {
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
                console.log("The content is ", content)
                // const mint = umi.eddsa.findPda(
                //     MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID,
                //     [Buffer.from("mint"), Buffer.from(content.id.toString(16).padStart(16, '0'), 'hex')]
                // )
                            console.log("00000000000000000000000",content.contentId)

                const mint = await PublicKey.findProgramAddressSync(
                    [Buffer.from("mint"), new BN(content.contentId).toArrayLike(Buffer, "le", 8)],
                    new PublicKey(nftProgram.MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS)
                )


                const metadata = await findMetadataAddress(mint[0]);
                // const metadata=await PublicKey.findProgramAddressSync(

                // )
                // const contentAccount = umi.eddsa.findPda(
                //     MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID,
                //     [Buffer.from("content"), Buffer.from(content.id.toString())]
                // )
                const contentAccount = await PublicKey.findProgramAddressSync(
                    [Buffer.from("content"), new BN(content.contentId).toArrayLike(Buffer, "le", 8)],
                    new PublicKey(nftProgram.MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS)
                )
                console.log("22222222222222222222222", contentAccount[0])
                // const config = umi.eddsa.findPda(
                //     MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID,
                //     [Buffer.from("config")]
                // )
                const config = await PublicKey.findProgramAddressSync(
                    [Buffer.from("config")],
                    new PublicKey(nftProgram.MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS)
                )
                // const userConfig = umi.eddsa.findPda(
                //     MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID,
                //     [Buffer.from("user_config"), ctx.wallet.toBuffer()]
                // )
                const userConfig = await PublicKey.findProgramAddressSync(
                    [Buffer.from("user_config"),config[0].toBuffer() ,new PublicKey(ctx.wallet).toBuffer()],
                    new PublicKey(nftProgram.MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS)
                )
                // const nftMetadata = umi.eddsa.findPda(
                //     MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID,
                //     [Buffer.from("nft_metadata"), Buffer.from(content.id.toString(16).padStart(16, '0'), 'hex')]
                // )
                const nftMetadata = await PublicKey.findProgramAddressSync(
                    [Buffer.from("nft_metadata"), new BN(content.contentId).toArrayLike(Buffer, "le", 8)],
                    new PublicKey(nftProgram.MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS)
                )
                console.log("THE NFT METADATA IS", nftMetadata[0].toString())
                console.log("NFTNAME IS",input.name)
                console.log("SYMBOL IS",input.symbol)

                const tokenAccount = await findAssociatedTokenAddress(mint[0], ctx.wallet);
                const transactionIx = await nftProgram.getMintContentAsNftInstruction({
                    contentId: content.contentId,
                    creator: address(ctx.wallet),
                    metadata: address(metadata[0].toString()),
                    nftName: input.name,
                    nftSymbol: input.symbol,
                    mint: address(mint[0].toString()),
                    config: address(config[0].toString()),
                    rent: address(SYSVAR_RENT_PUBKEY.toString()),
                    contentAccount: address(contentAccount[0].toString()),
                    nftMetadata: address(nftMetadata[0].toString()),
                    associatedTokenProgram: address(ASSOCIATED_TOKEN_PROGRAM_ADDRESS),
                    systemProgram: address(SYSTEM_PROGRAM_ADDRESS),
                    tokenAccount: address(tokenAccount[0].toString()),
                    tokenMetadataProgram: address(TOKEN_METADATA_PROGRAM_ADDRESS),
                    tokenProgram: address(TOKEN_PROGRAM_ADDRESS),
                    userConfig: address(userConfig[0].toString()),
                    royaltyPercentage: input.royaltyPercentage
                }, {
                    programAddress: nftProgram.MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS
                });

                const keys: AccountMeta[] = transactionIx.accounts.map((account) => ({
                    pubkey: new PublicKey(account.address),
                    isSigner: account.address.toString() === ctx.wallet.toString(),
                    isWritable: account.role === AccountRole.WRITABLE_SIGNER || account.role === AccountRole.WRITABLE,
                }));

                const convertedMintIx = new TransactionInstruction({
                    keys: keys,
                    programId: new PublicKey(transactionIx.programAddress),
                    data: Buffer.from(transactionIx.data),
                });

                // Create transaction
                const recentBlockhash = await rpc.getLatestBlockhash().send()
                    .then(data => data.value.blockhash.toString());

                const transaction = new Transaction({
                    feePayer: new PublicKey(ctx.wallet),
                    recentBlockhash: recentBlockhash
                }).add(convertedMintIx);

                const serializedTransaction = transaction.serialize({ requireAllSignatures: false });

                // Generate a unique NFT ID
                const nftId = crypto.getRandomValues(new Uint32Array(1))[0] % 2_000_000_000;
                console.log("the nft id is ", nftId)
                // Store pending NFT submission
                const pendingNft = await prismaClient.pendingNFTSubmission.create({
                    data: {
                        mintAddress: mint[0].toString(),
                        serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
                        contentId: content.id,
                        createdAt: new Date(),
                        ownerId: user.id,
                        tokenAccount: tokenAccount[0].toString(),
                        nftId: nftId,
                        expiresAt: new Date(Date.now() + 10 * 60 * 1000) //10min,

                    }
                });
                console.log("the pending nft id is ",pendingNft.id)

                return {
                    success: true,
                    message: "NFT minting transaction prepared. Please sign with your wallet.",
                    serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
                    pendingNftId: pendingNft.id,
                    nftId: nftId,
                    mintAddress: mint[0].toString(),
                    tokenAccount: tokenAccount[0].toString()
                };
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
            const user = await prismaClient.user.findUnique({
                where: {
                    wallet: ctx.wallet.toString()
                }
            })
            if (!user) {
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

            const nft = await prismaClient.nFT.create({
                data: {
                    mintAddress: pendingNFT.mintAddress,
                    ownerId: pendingNFT.ownerId,

                    tokenAccount: pendingNFT.tokenAccount,
                    contentId: pendingNFT.contentId,
                    createdAt: pendingNFT.createdAt,
                    id: pendingNFT.id,
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