//@ts-nocheck
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults'
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi';

export async function uploadFileToIPFS(file,filetype,wallet) {
    try {
        const umi=createUmi("https://api.devnet.solana.com");
            let keypair=umi.eddsa.createKeypairFromFile(wallet);
            const signer=createSignerFromKeypair(umi,keypair)
            umi.use(irysUploader())
            umi.use(signerIdentity(signer))
            if (filetype=="content") {
                const contentUri = await umi.uploadFile({
                    file,
                    name: "content",
                    description: "Content file uploaded to IPFS",
                });
                return contentUri;
            }
            else if (filetype=="metadata") {
                const metadataUri = await umi.uploadFile({
                    file,
                    name: "metadata",
                    description: "Metadata file uploaded to IPFS",
                });
                return metadataUri;
            }



    } catch (error) {
        console.log("AN ERROR OCCURED WHILE UPLOADING FILE TO IPFS",error);
        throw new Error("Failed to upload file to IPFS");
    }
}