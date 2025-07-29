//@ts-nocheck
import {z} from 'zod'
import { procedures,router } from '..'
import {list,MINT_CRAFT_MARKETPLACE_PROGRAM_ID} from '../../../clients/marketplaceProgram/umi/src'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { publicKey } from '@metaplex-foundation/umi'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import {findAssociatedTokenPda} from '@metaplex-foundation/mpl-toolbox'
// import { TOKEN_PROGRAM_ADDRESS } from 'gill/programs'
import {TOKEN_PROGRAM_ADDRESS} from 'gill/programs'
import { PrismaClient } from '../../database/generated/prisma'
import { TRPCError } from '@trpc/server'
const umi=createUmi("https://api.devnet.solana.com")
const prismaClient=new PrismaClient()
export const marketplaceRouter=router({
    listNft:procedures.input(z.object({
        nft_mint:z.string(),
        price:z.number().positive(),
        marketplaceId:z.number()
    })).mutation(async({input,ctx})=>{
    try {

        const marketplace=umi.eddsa.findPda(
            MINT_CRAFT_MARKETPLACE_PROGRAM_ID,
            [Buffer.from("marketplace")]
        )
        const marketplaceForPda=PublicKey.findProgramAddressSync(
            [Buffer.from("marketplace")],
            new PublicKey(MINT_CRAFT_MARKETPLACE_PROGRAM_ID)
        )[0]

        const listing =umi.eddsa.findPda(
            MINT_CRAFT_MARKETPLACE_PROGRAM_ID,
            [Buffer.from("listing"),marketplaceForPda.toBuffer(),ctx.wallet.toBuffer()]
        )
        const userConfig=umi.eddsa.findPda(
            MINT_CRAFT_MARKETPLACE_PROGRAM_ID,
            [Buffer.from("user"),ctx.wallet.toBuffer()]
        )

        const userMintAta=findAssociatedTokenPda(
            umi,
            {
                mint:publicKey(input.nft_mint),
                owner:ctx.wallet,
                tokenProgramId:publicKey(TOKEN_PROGRAM_ADDRESS)
            }
        )
        const nft=await prismaClient.nFT.findUnique(
         {
            where:{
                mintAddress:input.nft_mint
            }
         }   
        )
        if(!nft){
            throw new Error("NFT not found");
        }
        
        const vaultMint=findAssociatedTokenPda(
            umi,
            {
                mint:publicKey(input.nft_mint),
                owner:publicKey(listing),
                tokenProgramId:publicKey(TOKEN_PROGRAM_ADDRESS)
            }
        )
        
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
        const transactionBuilder=await list(umi,{
            maker:ctx.wallet,
            mint:publicKey(input.nft_mint),
            price:input.price,
            associatedTokenProgram:publicKey("associatedTokenProgram"),
            listing,
            marketplace,    
            systemProgram:publicKey(SystemProgram.programId),
        tokenProgram:publicKey(TOKEN_PROGRAM_ADDRESS),
        userConfig,
        userMintAta,
        vaultMint
        })
        const transaction=await transactionBuilder.buildAndSign(umi)
        const serializedTransaction=umi.transactions.serialize(transaction)
        const id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)

        const pendingList=await prismaClient.pendingListing.create({
            data:{
                nftId:nft.id,
                expiresAt:new Date(Date.now() + 24 * 60 * 60 * 1000),
                price:input.price,
                serializedTransaction:Buffer.from(serializedTransaction).toString('base64'),
                createdAt:new Date(),
                sellerId:user.id,
                id:id,
                marketplaceId:input.marketplaceId,

            }
        })

        return{
                          success: true,
                    message: "Transaction created successfully. Please sign with your wallet.",
                    serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
                    pendingListId:pendingList.id
                    }
    
    } catch (error) {
        console.log("An error occured in the listing process:", error);
        throw new Error("Failed to list NFT");
    }
    }),
    confirmListing:procedures.input(z.object({
        transactionSignature: z.string(),
        pendingListId: z.number(),
    })
    ).mutation(async({input,ctx})=>{
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

        const pendingList=await prismaClient.pendingListing.findUnique({
            where:{id:input.pendingListId}
        })
        if(!pendingList){
            throw new Error("Pending listing not found");
        }
        if(pendingList.sellerId!==user.id){
            throw new Error("You are not the seller of this listing");
        }
        const listing=await prismaClient.listing.create({
            data:{
                price:pendingList.price,
                nftId:pendingList.nftId,
                sellerId:pendingList.sellerId,
                createdAt:pendingList.createdAt,
                id:pendingList.id,
                marketplaceId:pendingList.marketplaceId,
                isActive:true,
            }
        })
        return {
            success: true,
            message: "Listing created successfully",
            listingId:listing.id
        }


        } catch (error) {
            console.log("An error occurred while confirming listing:", error);
            throw new Error("Failed to confirm listing");
        }
    }),
    buyNft:procedures.input(z.object({})).mutation(async({input,ctx})=>{}),
    getListings:procedures.input(z.object({})).query(async(ctx)=>{}),
    getMyListings:procedures.input(z.object({})).query(async({ctx})=>{}),
    getMyPurchases:procedures.input(z.object({})).query(async({ctx})=>{})

})
