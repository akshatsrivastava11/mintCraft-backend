//@ts-nocheck
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults'
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi';
import { file } from 'zod';
import { th } from 'zod/v4/locales';
import * as create from 'ipfs-http-client'
const ipfs = create.create({
  host: 'ipfs.infura.io', // or your IPFS node
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: `Basic ${Buffer.from(`${process.env.INFURA_PROJECT_ID}:${process.env.INFURA_PROJECT_SECRET}`).toString('base64')}`
  }
});
interface MetadataInput {
  title: string;
  description: string;
  contentType: string;
  aiModelId: string;
  prompt: string;
  wallet: string;
}

export async function uploadFileToIPFS(data,uploadType,wallet) {
   try {
    let fileToUpload: Buffer;
    let fileName: string;
    let mimeType: string;
    if(uploadType==='metadata'){
        const metadataObj=data as MetadataInput //string/buffer/uint8
        const metadata={
        name: metadataObj.title,
        description: metadataObj.description,
        contentType: metadataObj.contentType,
        aiModelId: metadataObj.aiModelId,
        prompt: metadataObj.prompt,
        creator: wallet,
        createdAt: new Date().toISOString(),
        // Add any other metadata fields you need
        attributes: [
          {
            trait_type: "Content Type",
            value: metadataObj.contentType
          },
          {
            trait_type: "AI Model ID", 
            value: metadataObj.aiModelId
          },
          {
            trait_type: "Creator",
            value: wallet
          }
        ]
      };
      fileToUpload=Buffer.from(JSON.stringify(metadata,null,2));
      fileName=`metadata_${Date.now()}.json`;
      mimeType='application/json';
    }
    else{
        if (typeof data=='string'){
            if (data.startsWith("data:")){
                const [mimeInfo,base64Data]=data.split(",")
                mimeType=mimeInfo.split(":")[1].split(";")[0]
                fileToUpload=Buffer.from(base64Data,'base64')

            }
            else{
                fileToUpload=Buffer.from(data,'base64')
                mimeType='application/octet-stream'
            }
        }
        else if(Buffer.isBuffer(data)){
                fileToUpload=data
                mimeType="application/octet-stream"
        }
        else if(data instanceof Uint8Array){
            fileToUpload=Buffer.from(data)
            mimeType="application/octet-stream"
        }
        else{
            throw new Error("Invalid data type")
        }
        const timeStamp=Date.now()
        const extension=getFileExtension(mimeType)
        fileName=`content_${timeStamp}${extension}`

    }
   const result = await ipfs.add({
      path: fileName,
      content: fileToUpload
    }, {
      pin: true, // Pin the file to prevent garbage collection
    });
       const ipfsHash = result.cid.toString();
    const ipfsUri = `ipfs://${ipfsHash}`;
       
    console.log(`Successfully uploaded ${uploadType} to IPFS:`, ipfsUri);
    return ipfsUri;
   } catch (error) {
    console.log("An error occured during uploading the data to IPFS",error)
   }
}