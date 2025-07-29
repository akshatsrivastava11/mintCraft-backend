import {z} from 'zod'
import { procedures, router } from '..'
import { TRPCError } from '@trpc/server'
import {PrismaClient} from '../../database/generated/prisma'
import { RegisterAIModelSchema } from '../schemas/registerAIModelSchema'
import {registerAiModel,MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID} from '../../../clients/generated/umi/src'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createSignerFromKeypair, generateSigner, publicKey, signerIdentity } from '@metaplex-foundation/umi'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { uuid } from 'zod'
// import {} from 'gill/programs'
// import { generateKeyPair } from 'gill/programs'
import { getUserConfig } from '../../config/aiModelConfigs'
import { getKeypairFromFile } from '@solana-developers/helpers'
const prismaClient=new PrismaClient()
const umi=createUmi("http://127.0.0.1:8899");
let wallet:Keypair;
 getKeypairFromFile().then((data)=>{
    wallet=data
    const keypair=umi.eddsa.createKeypairFromSecretKey(wallet.secretKey);
    const signer=createSignerFromKeypair(umi,keypair)
    umi.use(signerIdentity(signer));
 })
export const aiModelRouter=router({
    //register a new Ai Model
    //done
    initializeUserConfig:procedures.mutation(async({ctx})=>{
        console.log("wallet",ctx.wallet)
        console.log(typeof ctx.wallet)
        const serializedTransaction=await getUserConfig(ctx.wallet);
        return {
            success: true,
            message: "User config initialized successfully",
            serializedTransaction: Buffer.from(serializedTransaction).toString('base64')      
    }}),
    //done
    register:procedures.input(RegisterAIModelSchema)
            .mutation(async({input,ctx})=>{
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
                    let userPubkey=new PublicKey(ctx.wallet)
                    console.log("register")
                    const globalStatePda=await PublicKey.findProgramAddressSync(
                        [Buffer.from("global_state")],
                        new PublicKey(MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID)
                    )[0]
                    const aiModelPda=umi.eddsa.findPda(MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID,
                        [Buffer.from("ai"), Buffer.from(input.name), userPubkey.toBuffer(), globalStatePda.toBuffer()],
                    )
                    const globalState=umi.eddsa.findPda(
                        MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID,
                        [Buffer.from("global_state")],
                    )
const id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
                    //sends the transaction 
                    const userConfig=umi.eddsa.findPda(
                        MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID,
                        [Buffer.from("user_config"), userPubkey.toBuffer()]
                    )
                    if (!userConfig) {
                        throw new TRPCError({
                            code: 'NOT_FOUND',      
                        })
                    }
                    console.log(userConfig,globalState)
                   const transactionBuilder=registerAiModel(umi,{
                    name:input.name,
                    description:input.description,
                    apiEndpoint:input.apiEndpoint,
                    royaltyPercentage:input.royaltyPerGeneration,
                    aiModel:aiModelPda,
                    signer:ctx.wallet,
                    id:id,
                    globalState:globalState,
                    systemProgram:publicKey(SystemProgram.programId),
                    userConfig:userConfig,
                    })
                    const transaction =await transactionBuilder.buildAndSign(umi)
                    const serializedTransaction=umi.transactions.serialize(transaction);
                    console.log("serailized transaction",serializedTransaction)
                    const user=await prismaClient.user.findUnique({
                        where: {
                            wallet: userPubkey.toString()
                        }
                    })
                    if(!user){
                        throw new TRPCError({
                            code: 'NOT_FOUND',      
                        })
                    }
                    const pendingTransaction=await prismaClient.pendingAIModelRegistration.create({
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
            
            const pendingRegistration=await prismaClient.pendingAIModelRegistration.findUnique({
                where:{
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
            const whereClause={
                owner:user.id
            }
            const models=await prismaClient.aIModel.findMany({
                where:{
                    ownerId:user.id
                }
            });
            return models
            
        } catch (error) {
        console.log("An error occurred while fetching user's AI Models:", error);
            throw new Error("Failed to fetch user's AI Models");   
        }
    })

    
})