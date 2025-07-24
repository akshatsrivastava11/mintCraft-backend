import {procedures, router} from '..';
import {z} from 'zod';
import { PrismaClient } from '../../database/generated/prisma';
import { uploadFileToIPFS } from '../../utils/upload';  
const prismaClient = new PrismaClient();
const nftRouter=router({
    getAll:procedures.query(async(ctx)=>{
        const nfts=await prismaClient.nFT.findMany({})
        return nfts;
    }),
    getbyId:procedures.input(z.object({
        id:z.number()
    })).query(async({input})=>{
        const nft=await prismaClient.nFT.findUnique({
            where:{
                id:input.id
            }
        })
        if(!nft){
            throw new Error("NFT not found");
        }
        return nft;
    }),
    getByMintAddress:procedures.input(z.object({
        mintAddress:z.string()
    })).query(async({input})=>{
        try {
            const nft=await prismaClient.nFT.findUnique({
                where:{
                    mintAddress:input.mintAddress
                }
            })
            if(!nft){
                throw new Error("NFT not found");
            }
            return nft;
            
        } catch (error) {
            console.log("An error occurred while fetching NFT by mint address:", error);
            throw new Error("Failed to fetch NFT by mint address");
        }

    }),
    getMyNfts:procedures.query(async({ctx})=>{
        try {
            const nfts=await prismaClient.nFT.findMany({
                where:{
                    owner:{
                        wallet:ctx.wallet
                    }
                }
            })
            return nfts;
            
        } catch (error) {
            console.log("An error occurred while fetching user's NFTs:", error);
            throw new Error("Failed to fetch user's NFTs");
        }

    })

})