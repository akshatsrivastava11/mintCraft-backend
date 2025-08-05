//@ts-nocheck
import {z} from 'zod'
import { procedures,router } from '..'
import * as marketplaceProgram from '../../../clients/marketplaceProgram/js/src'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { PrismaClient } from '../../database/generated/prisma'
import { TRPCError } from '@trpc/server'
import { address } from 'gill'
import { initializeUserConfig } from '../config/marketplaceConfigs'
const prismaClient=new PrismaClient()
const findAssociatedTokenAddress = async (mint: PublicKey, owner: String): Promise<[PublicKey, number]> => {
    return await PublicKey.findProgramAddressSync(
        [
            new PublicKey(owner).toBuffer(),
            new PublicKey(TOKEN_PROGRAM_ADDRESS).toBuffer(),
            mint.toBuffer(),
        ],
        new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ADDRESS)
    );
};

const findMetadataAddress = async (mint: PublicKey): Promise<[PublicKey, number]> => {
    return await PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            new PublicKey(TOKEN_METADATA_PROGRAM_ADDRESS).toBuffer(),
            mint.toBuffer(),
        ],
        new PublicKey(TOKEN_METADATA_PROGRAM_ADDRESS)
    );
};

export const marketplaceRouter=router({
    initilizeUserConfig:procedures.mutation(async({ctx})=>{
       //initialize the marketplace in the anchor program config
       //initialize the marketplace in the database
        console.log("wallet", ctx.wallet);
               console.log("In the initializeUserConfig");
            //    const config=await PublicKey.findProgramAddressSync(
            //        [Buffer.from("config")],
            //        new PublicKey(nftProgram.MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS)
            //    )
               const connection = new Connection("https://api.devnet.solana.com");
       
               // ✅ Derive user_config PDA
            //    const [userConfigPda] = PublicKey.findProgramAddressSync(
            //        [Buffer.from("user_config"), config[0].toBuffer(),new PublicKey(ctx.wallet).toBuffer()],
            //        new PublicKey(nftProgram.MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS)
            //    );
            const marketplace=PublicKey.findProgramAddressSync(
                [Buffer.from("marketplace")],
                new PublicKey(marketplaceProgram.MINT_CRAFT_MARKETPLACE_PROGRAM_ADDRESS)
            )
            const userConfigPda=PublicKey.findProgramAddressSync(
                [Buffer.from("user"),new PublicKey(ctx.wallet).toBuffer()],
                new PublicKey(marketplaceProgram.MINT_CRAFT_MARKETPLACE_PROGRAM_ADDRESS)
            )
       
               // ✅ Check if the PDA exists
               const accountInfo = await connection.getAccountInfo(userConfigPda, {
                   commitment: "confirmed",
               });
               console.log("777777777777777",accountInfo)
               if (accountInfo?.data) {
                   console.log("User config already exists!");
                   return {
                       success: true,
                       alreadyExists:true,
                       message:"User configs already exists",
                       serializedTransaction: null,
                   };
               } else {
                   console.log("User config does NOT exist! Initializing...");
       
                   const serializedTransaction = await initializeUserConfig(ctx.wallet);
       
                   return {
                       success: true,
                       message: "User config initialized successfully",
                       alreadyExists:false,
                       serializedTransaction: Buffer.from(serializedTransaction).toString("base64"),
                   };
               }
    }),
    listNft:procedures.input(z.object({
        nft_mint:z.string(),
        price:z.number().positive(),
        marketplaceId:z.number()
    })).mutation(async({input,ctx})=>{
    try {

        // const marketplace=umi.eddsa.findPda(
        //     MINT_CRAFT_MARKETPLACE_PROGRAM_ID,
        //     [Buffer.from("marketplace")]
        // )
        // const marketplace=await PublicKey.findProgramAddressSync
        const marketplace=PublicKey.findProgramAddressSync(
            [Buffer.from("marketplace")],
            new PublicKey(marketplaceProgram.MINT_CRAFT_MARKETPLACE_PROGRAM_ADDRESS)
        )[0]

        // const listing =umi.eddsa.findPda(
        //     MINT_CRAFT_MARKETPLACE_PROGRAM_ID,
        //     [Buffer.from("listing"),marketplaceForPda.toBuffer(),ctx.wallet.toBuffer()]
        // )
        const listing=await PublicKey.findProgramAddressSync(
            [Buffer.from("listing"),marketplace.toBuffer(),new PublicKey(ctx.wallet).toBuffer()],
            new PublicKey(marketplaceProgram.MINT_CRAFT_MARKETPLACE_PROGRAM_ADDRESS)
        )
        // const userConfig=umi.eddsa.findPda(
        //     MINT_CRAFT_MARKETPLACE_PROGRAM_ID,
        //     [Buffer.from("user"),ctx.wallet.toBuffer()]
        // )
        const userConfig=await PublicKey.findProgramAddressSync(
            [Buffer.from("user"),new PublicKey(ctx.wallet).toBuffer()],
            new PublicKey(marketplaceProgram.MINT_CRAFT_MARKETPLACE_PROGRAM_ADDRESS)
        )
        const userMintAta=findAssociatedTokenAddress(new PublicKey(input.nft_mint),ctx.wallet)

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
        
        // const vaultMint=findAssociatedTokenPda(
        //     umi,
        //     {
        //         mint:publicKey(input.nft_mint),
        //         owner:publicKey(listing),
        //         tokenProgramId:publicKey(TOKEN_PROGRAM_ADDRESS)
        //     }
        // )
        const vaultMint=await findAssociatedTokenAddress(new PublicKey(input.nft_mint),listing[0].toString())
        
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
        // const transactionBuilder=await list(umi,{
        //     maker:ctx.wallet,
        //     mint:publicKey(input.nft_mint),
        //     price:input.price,
        //     associatedTokenProgram:publicKey("associatedTokenProgram"),
        //     listing,
        //     marketplace,    
        //     systemProgram:publicKey(SystemProgram.programId),
        // tokenProgram:publicKey(TOKEN_PROGRAM_ADDRESS),
        // userConfig,
        // userMintAta,
        // vaultMint
        // })
        // const transaction=await transactionBuilder.buildAndSign(umi)
        // const serializedTransaction=umi.transactions.serialize(transaction)
        const transactionIx=await marketplaceProgram.getListInstruction({
            listing:listing[0],
            maker:address(ctx.wallet),
            marketplace:address(marketplace[0]),
            mint:address(input.nft_mint),
            price:input.price,
            userConfig:address(userConfig[0]),
            userMintAta:address(userMintAta[0]),
            vaultMint:address(vaultMint[0]),
            systemProgram:address(SystemProgram.programId),
            associatedTokenProgram:address(ASSOCIATED_TOKEN_PROGRAM_ID),
            tokenProgram:address(TOKEN_PROGRAM_ID),
        })
            const id = crypto.getRandomValues(new Uint32Array(1))[0] % 2_000_000_000;
          const keys: AccountMeta[] = transactionIx.accounts.map((account) => ({
                pubkey: new PublicKey(account.address),
                isSigner: account.address.toString() === ctx.wallet.toString(),
                isWritable: account.role === AccountRole.WRITABLE_SIGNER || account.role === AccountRole.WRITABLE,
            }));

            const convertedSubmitIx = new TransactionInstruction({
                keys: keys,
                programId: new PublicKey(transactionIx.programAddress),
                data: Buffer.from(transactionIx.data),
            });

            // Create transaction with both payment and content submission
            const recentBlockhash = await rpc.getLatestBlockhash().send()
                .then(data => data.value.blockhash.toString());

            const transaction = new Transaction({
                feePayer: new PublicKey(ctx.wallet),
                recentBlockhash: recentBlockhash
            })           // Payment for metadata first
                .add(convertedSubmitIx);  // Then content submission

            const serializedTransaction = transaction.serialize({ requireAllSignatures: false });
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
