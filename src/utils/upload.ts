import {PinataSDK} from 'pinata'
import dotenv from 'dotenv'
dotenv.config()
console.log("process.env.PINATA_JWT",process.env.PINATA_JWT)
const pinata=new PinataSDK({
  pinataJwt:process.env.PINATA_JWT,
})
type MetadataInput={
                title: string,
                description: string,
                contentType: string,
                aiModelId: string,
                prompt: string,
                wallet: string,
                content_uri: string
}

export async function uploadFileToIPFS(
  data: MetadataInput | Blob, 
  type: 'metadata' | 'content', 
  wallet: string
): Promise<string|Error> {
 
  // Generate a mock IPFS hash for testing
  if (type=='content' && data instanceof Blob){
     console.log("Is a content")
     console.log("the data content is ",data)
const file = new File([data], "NFTIMAGE", { type: data.type || 'image/png' })
     const upload=await pinata.upload.public.file(file)
     console.log("The upload",upload)
     return upload.cid
     
  }
  else{     

    let metadata:Record<string,any>;
  if (typeof data === 'object' && !(data instanceof Blob)) {
      metadata = {
        name: data.title,
        description: data.description,
        prompt: data.prompt,
        properties: {
          aiModelId: data.aiModelId,
          contentType: data.contentType,
          creator: data.wallet,
          content_uri: data.content_uri
        }
      }
    }
      else{
        return Error("Invalid metadata")
      }
      console.log("Is a metadata")
      const upload=await pinata.upload.public.json(metadata)
      console.log("The upload",upload)
    return upload.cid
    
  }
}