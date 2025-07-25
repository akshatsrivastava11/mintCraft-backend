import {z} from 'zod'
import { procedures, router } from '..'
import { TRPCError } from '@trpc/server'
import {PrismaClient} from '../../database/generated/prisma'
import { RegisterAIModelSchema } from '../schemas/registerAIModelSchema'
import {registerAiModel} from '../../../clients/generated/umi/src'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { generateSigner } from '@metaplex-foundation/umi'
import { SYSTEM_PROGRAM_ADDRESS } from 'gill/programs'
import { PublicKey } from '@solana/web3.js'
const prismaClient=new PrismaClient()
const umi=createUmi("https://api.devnet.solana.com");
export const aiModelRouter=router({
    //register a new Ai Model
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
//seeds=[b"ai",name.as_bytes(),signer.key().as_ref(),global_state.key().as_ref()],

                    let [aiModelPda,bump]=PublicKey.findProgramAddressSync(
                        [Buffer.from("ai"),ctx.user.wallet.toBuffer(),globalState.toBuffer()],
                    AI_MODEL_PROGRAM_ID
                    )
                    const aiModelPdaWithBump{
                        publicKey:aiModelPda,
                        bump:bump
                    };

                    const id=
                    //sends the transaction 
                   const aiModelAccount=generateSigner(umi);
                   const transactionBuilder=registerAiModel(umi,{
                    name:input.name,
                    description:input.description,
                    apiEndpoint:input.apiEndpoint,
                    royaltyPercentage:input.royaltyPerGeneration,
                    aiModel:aiModelPdaWithBump,
                    signer:ctx.user.wallet,
                    id:,
                    globalState:,
                    systemProgram:SYSTEM_PROGRAM_ADDRESS,
                    userConfig:,
                    })




                    //create an ai model in the database
                    const aiModel=await prismaClient.aIModel.create({
                        data:{
                            ownerId:ctx.user.id,
                            name:input.name,
                            description:input.description,
                            apiEndpoint:input.apiEndpoint,
                            royaltyPercentage:input.royaltyPerGeneration,
                            isActive:true,
                            aiModelPublicKey:input.aiModelPublicKey,

                        },
                        include:{
                            owner:{
                                select:{
                                    id:true,
                                    wallet:true
                                }
                            }
                        }
                    });
                    return {
                        success:true,
                        message:"AI Model registered successfully",
                        aiModel:aiModel
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