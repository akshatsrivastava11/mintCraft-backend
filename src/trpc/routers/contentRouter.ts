import { procedures, router } from "..";
import { createContentSchema } from "../schemas/createContentSchema";
import {z} from 'zod'
import { PrismaClient } from "../../database/generated/prisma";
import { uploadFileToIPFS } from "../../utils/upload";
import {submitContent,MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID} from '../../clients/nftProgram/umi/src'
import { PublicKey } from "@solana/web3.js";
import { uuid } from "zod";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { SYSTEM_PROGRAM_ADDRESS } from "gill/programs";
import { publicKey } from "@metaplex-foundation/umi";
const prismaClient = new PrismaClient();
const umi=createUmi("https://api.devnet.solana.com");
export const contentRouter=router({
    generate:procedures.input(createContentSchema).mutation(async({input,ctx})=>{
        try {
            if(!ctx.user){
                throw new Error("User not authenticated");
            }
            const id=Number(uuid().length(14))

            // const contentAccount=PublicKey.findProgramAddressSync(
            //     [Buffer.from("content"),Buffer.from(id.toString())],
            //     new PublicKey(MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID)
            // 

            
            const contentAccount=umi.eddsa.findPda(MINT_CRAFT_NFT_PROGRAM_PROGRAM_ID,
                [Buffer.from("content"),Buffer.from(id.toString())]
            )
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
            
            const serializedTransaction=await submitContent(umi,{
                aiModelUsed:publicKey(aiModel.aiModelPublicKey),
                creator:ctx.user.wallet,
                contentAccount:contentAccount,
                systemProgram:publicKey(SYSTEM_PROGRAM_ADDRESS)

            },{
                aiModelRoyalty:aiModel.royaltyPercentage,
                aiModelUsed:publicKey(aiModel.aiModelPublicKey),
                contentIpfs:contentUri,
                contentType:contentTypeId,
                id:id,
                metadataIpfs:metadataUri,
                prompt:input.prompt
            })

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