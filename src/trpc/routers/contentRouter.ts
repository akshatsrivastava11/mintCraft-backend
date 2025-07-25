import { procedures, router } from "..";
import { createContentSchema } from "../schemas/createContentSchema";
import {z} from 'zod'
import { PrismaClient } from "../../database/generated/prisma";
import { uploadFileToIPFS } from "../../utils/upload";
const prismaClient = new PrismaClient();
export const contentRouter=router({
    generate:procedures.input(createContentSchema).mutation(async({input,ctx})=>{
        try {
            if(!ctx.user){
                throw new Error("User not authenticated");
            }
            const aiModel=await prismaClient.aIModel.findUnique({
                where:{
                    id:input.aiModelId
                }
            })
            if(!aiModel){
                throw new Error("AI Model not found");
            }

            const contentType=input.contentType;
            if (!contentType){
                throw new Error("Content type is required");
            }
            const arr=["image","music","text","video"]
            if (!arr.includes(contentType)){
                throw new Error("Invalid content type");
            }
            const contentTypeId= arr.indexOf(contentType) ; 
            const metadataUri= await uploadFileToIPFS({
                title: input.title,
                description: input.description,
                contentType: contentType,
                aiModelId: input.aiModelId,
                prompt: input.prompt,
                wallet: ctx.user.wallet,
            }, "metadata", ctx.user.wallet);
            const contentUri = await uploadFileToIPFS(input.contentData, "content", ctx.user.wallet);
            

            const content=await prismaClient.content.create({
                data:{
                    aiModel:aiModel.aiModelPublicKey,
                    contentType:contentTypeId,
                    metadataUri:metadataUri,
                    contentData:input.contentData,
                    prompt:input.prompt,
                    contentUri:contentUri,
                    creatorId:ctx.user.id,
                    createdAt:new Date(),
                                }
            })

        } catch (error) {
            console.log("An error occurred while generating content:", error);
            throw new Error("Failed to generate content");
        }
    }),
    mintAsNft:procedures.input(z.object({
        contentId: z.number(),
        name: z.string().min(1).max(50),
        symbol: z.string().min(1).max(10),
        royaltyPercentage: z.number().min(0).max(50).default(10)}))
                            .mutation(async({input,ctx})=>{}),
        getMyContent:procedures.input(z.object({})).query(async({input,ctx})=>{}),
        
})