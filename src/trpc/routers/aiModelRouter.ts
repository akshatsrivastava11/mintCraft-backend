import {z} from 'zod'
import { procedures, router } from '..'
import { RegisterAIModelSchema } from '../schemas/registerAIModelSchema'
import { TRPCError } from '@trpc/server'
import {PrismaClient} from '../../database/generated/prisma'
const prismaClient=new PrismaClient()

export const aiModelRouter=router({
    //register a new Ai Model
    register:procedures.input(RegisterAIModelSchema)
            .mutation(async({input,ctx})=>{
                try {
                    
                    //sends the transaction 
                    
                    if(!ctx.user){
                        throw new TRPCError({
                            code: 'UNAUTHORIZED',
                            message: 'You must be logged in to register an AI Model.'
                        })
                    }
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