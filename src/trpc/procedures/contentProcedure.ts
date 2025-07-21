import { procedures } from "..";
import {$input, z} from 'zod'
import { uploadFileToIPFS } from "../../utils/upload";

// z.object()
export const createContentType=z.object({
    wallet:z.string(),
    title:z.string(),
    description:z.string(),
    contentData:z.string(),
    aiModel:z.string(),
    prompt:z.string(),
    contentType:z.enum(["1","2","3"]),

})
export const createContent=procedures.input(createContentType).query(async({input})=>{
        //validate inputs
        if(input.contentData=="" || input.wallet=="" || input.aiModel==""|| input.prompt==""){
            return ;
        }
        //create content
        //upload to IPFS
        const contentUri=await uploadFileToIPFS(input.contentData,"content",input.wallet);
        const metadataForNft={

        }
        const metadataUri=await uploadFileToIPFS(metadataForNft,"metadata",input.wallet);
        // const contentId=await 
})
