import { z } from 'zod'
import { procedures, router } from '..'
import { TRPCError } from '@trpc/server'
import { PrismaClient } from '../../database/generated/prisma'
import { RegisterAIModelSchema } from '../schemas/registerAIModelSchema'
// import {registerAiModel,aIModelProgramClient.MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ADDRESS} from '../../../clients/generated/umi/src'
import * as aIModelProgramClient from '../../../clients/generated/js/src'
// import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
// import { createSignerFromKeypair, generateSigner, publicKey, signerIdentity } from '@metaplex-foundation/umi'
import { AccountMeta, Connection, Keypair, PublicKey, SendTransactionError, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import { uuid } from 'zod'
import { AccountRole, createTransaction } from 'gill'
// import { generateKeyPair } from 'gill/programs'
import { getUserConfig } from '../config/aiModelConfigs'
// import { getKeypairFromFile } from '@solana-developers/helpers'
import { address, createSolanaRpc } from 'gill'
// import { aIModelProgramClient.MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ADDRESS } from '../../../clients/generated/umi/src'
const prismaClient = new PrismaClient()
import {rpc} from '../index'

export const aiModelRouter = router({
    //register a new Ai Model
    //done
    initializeUserConfig: procedures.mutation(async ({ ctx }) => {
        console.log("wallet", ctx.wallet)
        console.log("In the initializeUserConfig")
        const connection=new Connection("https://api.devnet.solana.com")
        const accountInfo = await connection.getAccountInfo(new PublicKey(ctx.wallet),{commitment:'confirmed'});
        console.log('accountInfo',accountInfo)
if (accountInfo !== null) {
  console.log("Account exists!");
  return {
    sucess:true,

  }
} else {
  console.log("Account does NOT exist!");


        const serializedTransaction = await getUserConfig(ctx.wallet);
        return {
            success: true,
            message: "User config initialized successfully",
            serializedTransaction: Buffer.from(serializedTransaction).toString('base64')
        }
    }
    }),
    //done
    register: procedures.input(RegisterAIModelSchema)
        .mutation(async ({ input, ctx }) => {
            try {
                console.log("triggered")
                // if(!ctx.user){
                //     return {
                //         success: false,
                //         message: "You must be logged in to register an AI Model."
                //     }
                //     throw new TRPCError({
                //         code: 'UNAUTHORIZED',
                //         message: 'You must be logged in to register an AI Model.'
                //     })
                // }
                let userPubkey = new PublicKey(ctx.wallet)
                console.log("register")
                const globalStatePda = await PublicKey.findProgramAddressSync(
                    [Buffer.from("globalAiState")],
                    new PublicKey(aIModelProgramClient.MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ADDRESS)
                )[0]
                console.log("globalStatePda", globalStatePda)
                const aiModelPda = await PublicKey.findProgramAddressSync(
                    [Buffer.from("ai"), Buffer.from(input.name), userPubkey.toBuffer(), globalStatePda.toBuffer()],
                    new PublicKey(aIModelProgramClient.MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ADDRESS)
                )[0]
                // const aiModelPda=umi.eddsa.findPda(aIModelProgramClient.MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ADDRESS,
                //     [Buffer.from("ai"), Buffer.from(input.name), userPubkey.toBuffer(), globalStatePda.toBuffer()],
                // )

                // const globalState=umi.eddsa.findPda(
                //     aIModelProgramClient.MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ADDRESS,
                //     [Buffer.from("global_state")],
                // )
                const id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
                //sends the transaction 
                // const userConfig=umi.eddsa.findPda(
                //     aIModelProgramClient.MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ADDRESS,
                //     [Buffer.from("user_config"), userPubkey.toBuffer()]
                // )
                const userConfig = await PublicKey.findProgramAddressSync(
                    [Buffer.from("user"), userPubkey.toBuffer()],
                    new PublicKey(aIModelProgramClient.MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ADDRESS)
                )[0]
                console.log("user config is ",userConfig)
                if (!userConfig) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                    })
                }
                // console.log(userConfig,globalState)
                const transactionIx = aIModelProgramClient.getRegisterAiModelInstruction({
                    name: input.name,
                    aiModel: address(aiModelPda.toString()),
                    signer: ctx.wallet,
                    id: id,
                    globalState: address(globalStatePda.toString()),
                    apiEndpoint: input.apiEndpoint,
                    description: input.description,
                    royaltyPercentage: input.royaltyPerGeneration,
                    userConfig: address(userConfig.toString()),
                    systemProgram: address(SystemProgram.programId.toString())
                }, {
                    programAddress: address(aIModelProgramClient.MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ADDRESS)
                })
                console.log("transactionIx is ", transactionIx)
                // transactionIx.accounts[0].signer
                const keys: AccountMeta[] = (transactionIx.accounts).map((account) => {
                    return {
                        pubkey:new PublicKey(account.address),
                        isSigner: account.address.toString()==ctx.wallet.toString(),
                        isWritable: account.role === AccountRole.WRITABLE_SIGNER || account.role === AccountRole.WRITABLE,
                    };

                });
                console.log("keys is ",keys)
                const convertedIx = new TransactionInstruction({
                    keys: keys,
                    programId: new PublicKey(transactionIx.programAddress),
                    data: Buffer.from(transactionIx.data), // Ensure it's a Buffer/Uint8Array
                });
                console.log("convertedIx", convertedIx)
                const recentBlockhash = await (await rpc.getLatestBlockhash()).send().then((data) => {
                    return data.value.blockhash.toString()
                });
                console.log("recentBlockhash", recentBlockhash)
                const Tx = new Transaction({
                    feePayer: new PublicKey(ctx.wallet),
                    recentBlockhash: recentBlockhash
                }).add(convertedIx)
                // Tx.partialSign()
                const serializedTransaction = Tx.serialize({requireAllSignatures:false})
                //    const transactionBuilder=registerAiModel(umi,{
                //     name:input.name,
                //     description:input.description,
                //     apiEndpoint:input.apiEndpoint,
                //     royaltyPercentage:input.royaltyPerGeneration,
                //     aiModel:aiModelPda,
                //     signer:ctx.wallet,
                //     id:id,
                //     globalState:globalState,
                //     systemProgram:publicKey(SystemProgram.programId),
                //     userConfig:userConfig,
                //     })
                // const transaction =await transactionBuilder.buildAndSign(umi)
                // const serializedTransaction=umi.transactions.serialize(transaction);
                console.log("serailized transaction", serializedTransaction)
                const user = await prismaClient.user.findUnique({
                    where: {
                        wallet: userPubkey.toString()
                    }
                })
                if (!user) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                    })
                }
                const pendingTransaction = await prismaClient.pendingAIModelRegistration.create({
                    data: {
                        ownerId: user.id,
                        name: input.name,
                        description: input.description,
                        apiEndpoint: input.apiEndpoint,
                        royaltyPercentage: input.royaltyPerGeneration,
                        aiModelPublicKey: aiModelPda.toString(),
                        modelId: id,
                        serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
                        createdAt: new Date(),
                        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
                        headersJSON: input.headersJSONstring,
                        bodyTemplate:input.bodyTemplate,
                        httpMethod:input.httpMethod,
                        userPromptField:input.userPromptField,
                        finalContentField:input.finalContentField,
                        responseTemplate:input.responseTemplate
                    }
                })

                return {
                    success: true,
                    message: "Transaction created successfully. Please sign with your wallet.",
                    serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
                    aiModelPublicKey: aiModelPda.toString(),
                    pendingRegistrationId: pendingTransaction.id,
                    modelId: id
                }
                
            } catch (error) {
                if(error instanceof SendTransactionError){
            console.log("send transaction errors :", error.getLogs(new Connection("https://api.devnet.solana.com")));
        }
                console.log("An error occurred while registering AI Model:", error);
                throw new Error("Failed to register AI Model");
            }
        }),
    getAll: procedures.query(async (ctx) => {
        console.log("getAll triggered")
        const aiModels = await prismaClient.aIModel.findMany({
            where: {
                isActive: true
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        wallet: true
                    }
                }
            }
        });
        return aiModels;
    }),
    confirmRegistration: procedures.input(z.object({
        transactionSignature: z.string(),
        pendingRegistrationId: z.number(),
    })).mutation(async ({ input, ctx }) => {
        try {
            console.log("In the confirm registration function")
            const user = await prismaClient.user.findUnique({
                where: {
                    wallet: ctx.wallet
                }
            })
            if (!user) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                })
            }

            const pendingRegistration = await prismaClient.pendingAIModelRegistration.findUnique({
                where: {
                    id: input.pendingRegistrationId,
                    ownerId: user.id
                }
            })
            if (!pendingRegistration) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Pending AI Model registration not found or does not belong to the user.'
                });
            }
            const aiModel = await prismaClient.aIModel.create({
                data: {
                    ownerId: user.id,
                    name: pendingRegistration.name,
                    description: pendingRegistration.description,
                    apiEndpoint: pendingRegistration.apiEndpoint,
                    royaltyPercentage: pendingRegistration.royaltyPercentage,
                    isActive: true,
                    aiModelPublicKey: pendingRegistration.aiModelPublicKey,
                    headersJSON: pendingRegistration.headersJSON ?? {},
                    createdAt: new Date(),
                    id: pendingRegistration.id,
                    bodyTemplate:pendingRegistration.bodyTemplate,
                    httpMethod:pendingRegistration.httpMethod,
                    userPromptField:pendingRegistration.userPromptField,
                    finalContentField:pendingRegistration.finalContentField,
                    responseTemplate:pendingRegistration.responseTemplate
                },
                include: {
                    owner: {
                        select: {
                            id: true,
                            wallet: true
                        }
                    }
                }
            });
            await prismaClient.pendingAIModelRegistration.delete({
                where: {
                    id: input.pendingRegistrationId
                }
            });
            return {
                success: true,
                message: "AI Model registered successfully",
                aiModel: aiModel
            }


        } catch (error) {
            console.log("An error occurred while confirming AI Model registration:", error);
            throw new Error("Failed to confirm AI Model registration");
        }
    }),
    getById: procedures.input(z.object({ id: z.number() })).query(async ({ input }) => {
        try {
            const aiModel = await prismaClient.aIModel.findUnique({
                where: {
                    id: input.id
                }
            })
            if (!aiModel) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'AI Model not found'
                })
            }
            return aiModel;
        } catch (error) {
            console.log("An error occurred while fetching AI Model by ID:", error);
            throw new Error("Failed to fetch AI Model by ID");
        }
    }),
    //getMyModels
    getMyModels: procedures.query(async ({ ctx }) => {
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
            const whereClause = {
                owner: user.id
            }
            const models = await prismaClient.aIModel.findMany({
                where: {
                    ownerId: user.id
                }
            });
            return models

        } catch (error) {
            console.log("An error occurred while fetching user's AI Models:", error);
            throw new Error("Failed to fetch user's AI Models");
        }
    })


})