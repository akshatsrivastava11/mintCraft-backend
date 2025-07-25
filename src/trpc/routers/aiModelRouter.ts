import {z} from 'zod'
import { procedures, router } from '..'
import { TRPCError } from '@trpc/server'
import {PrismaClient} from '../../database/generated/prisma'
import { RegisterAIModelSchema } from '../schemas/registerAIModelSchema'
import {registerAiModel,MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID} from '../../../clients/generated/umi/src'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { generateSigner, publicKey } from '@metaplex-foundation/umi'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { uuid } from 'zod'
import { generateKeyPair } from 'gill'
import { getUserConfig } from '../../config/aiModelConfigs'
const prismaClient=new PrismaClient()
const umi=createUmi("https://api.devnet.solana.com");
export const aiModelRouter=router({
    //register a new Ai Model
    //done
    initializeUserConfig:procedures.mutation(async({ctx})=>{
        const serializedTransaction=await getUserConfig(ctx.user.wallet);
        return {
            success: true,
            message: "User config initialized successfully",
            serializedTransaction: Buffer.from(serializedTransaction).toString('base64')        
    }}),
    //done
    register:procedures.input(RegisterAIModelSchema)
            .mutation(async({input,ctx})=>{
                try {
                    if(!ctx.user){
                        throw new TRPCError({
                            code: 'UNAUTHORIZED',
                            message: 'You must be logged in to register an AI Model.'
                        })
                    }
                    if(input.aiModelPublicKey==undefined){
                        throw new TRPCError({
                            code: 'BAD_REQUEST',
                            message: 'AI Model Public Key is required.'
                        })
                    }
                    const globalStatePda=await PublicKey.findProgramAddressSync(
                        [Buffer.from("global_state")],
                        new PublicKey(MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID)
                    )[0]
                    const aiModelPda=umi.eddsa.findPda(MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID,
                        [Buffer.from("ai"), Buffer.from(input.name), ctx.user.wallet.toBuffer(), globalStatePda.toBuffer()],
                    )
                    const globalState=umi.eddsa.findPda(
                        MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID,
                        [Buffer.from("global_state")],
                    )
                    const id=Number(uuid().length(14))
                    //sends the transaction 
                    const userConfig=umi.eddsa.findPda(
                        MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID,
                        [Buffer.from("user_config"), ctx.user.wallet.toBuffer()]
                    )
                    if (!userConfig) {
                        throw new TRPCError({
                            code: 'NOT_FOUND',      
                        })
                    }
                   const aiModelAccount=generateSigner(umi);
                   const transactionBuilder=registerAiModel(umi,{
                    name:input.name,
                    description:input.description,
                    apiEndpoint:input.apiEndpoint,
                    royaltyPercentage:input.royaltyPerGeneration,
                    aiModel:aiModelPda,
                    signer:ctx.user.wallet,
                    id:id,
                    globalState:globalState,
                    systemProgram:publicKey(SystemProgram.programId),
                    userConfig:userConfig,
                    })
                    const transaction =await transactionBuilder.buildAndSign(umi)
                    const serializedTransaction=umi.transactions.serialize(transaction);
                    
                    const pendingTransaction=await prismaClient.pendingAIModelRegistration.create({
                          data: {
                        userId: ctx.user.id,
                        name: input.name,
                        description: input.description,
                        apiEndpoint: input.apiEndpoint,
                        royaltyPercentage: input.royaltyPerGeneration,
                        aiModelPublicKey: aiModelPda.toString(),
                        modelId: id,
                        serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
                        createdAt: new Date(),
                        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
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
                    console.log("An error occurred while registering AI Model:", error);
                    throw new Error("Failed to register AI Model");
                }
          }),
    getAll:procedures.query(async (ctx)=>{
        const aiModels=await prismaClient.aIModel.findMany({
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
    confirmRegistration:procedures.input(z.object({
        transactionSignature: z.string(),
        pendingRegistrationId: z.number(),
    })).mutation(async({input,ctx})=>{
        try {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to confirm AI Model registration.'
                });
            }
            const pendingRegistration=await prismaClient.pendingAIModelRegistration.findUnique({
                where:{
                    id: input.pendingRegistrationId,
                    userId: ctx.user.id
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
                    ownerId: ctx.user.id,
                    name: pendingRegistration.name,
                    description: pendingRegistration.description,
                    apiEndpoint: pendingRegistration.apiEndpoint,
                    royaltyPercentage: pendingRegistration.royaltyPercentage,
                    isActive: true,
                    aiModelPublicKey: pendingRegistration.aiModelPublicKey,
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
    getById:procedures.input(z.object({id:z.number()})).query(async({input})=>{
        try {
            const aiModel=await prismaClient.aIModel.findUnique({
                where:{
                    id:input.id
                }
            })
            if(!aiModel){
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
    getMyModels:procedures.query(async({ctx})=>{
        try {
            if (!ctx.user){
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to view your AI Models.'
                });
            }
            const whereClause={
                owner:ctx.user.id
            }
            const models=await prismaClient.aIModel.findMany({
                where:whereClause
            });
            return models
            
        } catch (error) {
        console.log("An error occurred while fetching user's AI Models:", error);
            throw new Error("Failed to fetch user's AI Models");   
        }
    })

    
})