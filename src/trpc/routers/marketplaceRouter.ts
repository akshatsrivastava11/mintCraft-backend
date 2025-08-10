
import {z} from 'zod'
import { procedures,router, rpc } from '..'
import * as marketplaceProgram from '../../../clients/marketplaceProgram/js/src'
import { AccountMeta, Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import { PrismaClient } from '../../database/generated/prisma'
import { TRPCError } from '@trpc/server'
import { AccountRole, address } from 'gill'
import { initializeUserConfig } from '../config/marketplaceConfigs'
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token'
import { SYSTEM_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/native/system'
const prismaClient=new PrismaClient()
const findAssociatedTokenAddress = async (mint: PublicKey, owner: String): Promise<[PublicKey, number]> => {
    return await PublicKey.findProgramAddressSync(
        [
            new PublicKey(owner).toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
        ],
        ASSOCIATED_PROGRAM_ID
    );
};

const findMetadataAddress = async (mint: PublicKey): Promise<[PublicKey, number]> => {
    return await PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            TOKEN_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
        ],
        new PublicKey("metaqbxxUerdq28cj1RbTgwchQrWCC9hdzvzZqCEzNs")
    );
};

export const marketplaceRouter=router({
    initilizeUserConfig:procedures.mutation(async({ctx})=>{
        try {
            
            //initialize the marketplace in the anchor program config
            //initialize the marketplace in the database
             console.log("wallet", ctx.wallet);
                    console.log("In the initializeUserConfig for the marketplace");
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
                 console.log("marketpalce is ",marketplace)
                 const userConfigPda=PublicKey.findProgramAddressSync(
                     [Buffer.from("user"),new PublicKey(ctx.wallet).toBuffer()],
                     new PublicKey(marketplaceProgram.MINT_CRAFT_MARKETPLACE_PROGRAM_ADDRESS)
                 )
                 console.log("userConfigPda is ",userConfigPda)
            
                    // ✅ Check if the PDA exists
                    const accountInfo = await connection.getAccountInfo(userConfigPda[0], {
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
        } catch (error) {
            console.log("an error occured during marketplace user initialization",error)
        }
    }),
    listNft:procedures.input(z.object({
        nft_mint_address:z.string(),
        price:z.number().positive(),
        marketplaceId:z.number()
    })).mutation(async({input,ctx})=>{
    try {
        console.log("in the list nft procedure")
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
            let listingId=crypto.getRandomValues(new Uint32Array(1))[0] % 2_000_000
            const idBuffer = Buffer.allocUnsafe(4);
            idBuffer.writeUInt32LE(listingId, 0);
        const listing=await PublicKey.findProgramAddressSync(
            [Buffer.from("listing"),marketplace.toBuffer(),idBuffer,new PublicKey(ctx.wallet).toBuffer()],
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
        const userMintAta=await findAssociatedTokenAddress(new PublicKey(input.nft_mint_address),ctx.wallet)
        console.log("the listing,userConfig,userMintAta are ",listing,userConfig,userMintAta)
        const nft=await prismaClient.nFT.findUnique(
         {
            where:{
                mintAddress:input.nft_mint_address
            }
         }   
        )
        console.log("the nft is ",nft)
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
        const vaultMint=await findAssociatedTokenAddress(new PublicKey(input.nft_mint_address),listing[0].toString())
        console.log("the vault mint is ",vaultMint) 
                     const user=await prismaClient.user.findUnique({
                        where: {
                            wallet: ctx.wallet
                        }
                    })
                    if(!user){
                        throw new TRPCError({
                            code: 'NOT_FOUND',      
                        })
                    }
                    console.log("the user is ",user)
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
        console.log("the input price is ",input)
        const transactionIx=await marketplaceProgram.getListInstruction({
            listing:address(listing[0].toString()),
            maker:address(ctx.wallet),
            marketplace:address(marketplace.toString()),
            mint:address(input.nft_mint_address),
            price:input.price,
            userConfig:address(userConfig[0].toString()),
            userMintAta:address(userMintAta[0].toString()),
            vaultMint:address(vaultMint[0].toString()),
            systemProgram:address(SystemProgram.programId.toString()),
            associatedTokenProgram:address(ASSOCIATED_PROGRAM_ID.toString()),
            tokenProgram:address(TOKEN_PROGRAM_ID.toString()),
            id:listingId
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
                marketplaceId:input.marketplaceId,
                listingId:listingId

            }
        })
        console.log("the pending list is ",pendingList)

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
            console.log("In the confirm listing",input)
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
        console.log("the pending list is ",pendingList)
        console.log("the user is ",user)
        if(pendingList.sellerId!==user.id){
            throw new Error("You are not the seller of this listing");
        }
        // console.log("the pending list is ",pendingList)
        const listing=await prismaClient.listing.create({
            data:{
                price:pendingList.price,
                nftId:pendingList.nftId,
                sellerId:pendingList.sellerId,
                createdAt:pendingList.createdAt,
                marketplaceId:pendingList.marketplaceId,
                isActive:true,
                listingId:pendingList.listingId,

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
    buyNft:procedures.input(z.object({
        listingId:z.number(),

    })).mutation(async({input,ctx})=>{
        try {
            console.log("the input from the buyNft is ",input)
            let authority=new PublicKey("ET38XidWgif4n8u8T3hChmtL2MuCodbtPhBnGC9S13Nr")
            const listingfromDb=await prismaClient.listing.findUnique({
                where:{
                    listingId:input.listingId
                },
                include:{
                    nft:true,
                    marketplace:true,
                    seller:true
                }
            })
            console.log("the listing frmo db is ",listingfromDb)
            const marketplace=PublicKey.findProgramAddressSync(
                [Buffer.from("marketplace")],
                new PublicKey(marketplaceProgram.MINT_CRAFT_MARKETPLACE_PROGRAM_ADDRESS)
            )[0]
    
            // const listing =umi.eddsa.findPda(
                //     MINT_CRAFT_MARKETPLACE_PROGRAM_ID,
                //     [Buffer.from("listing"),marketplaceForPda.toBuffer(),ctx.wallet.toBuffer()]
                // )
                let listingId=listingfromDb?.listingId
                console.log("listing id is ",listingId)
                if(!listingId){
                    throw new Error("Listing not found")
                }
                if(!listingfromDb?.sellerId){
                    throw new Error("Seller not found")
                }
            //         let listingId=crypto.getRandomValues(new Uint32Array(1))[0] % 2_000_000
            // const idBuffer = Buffer.allocUnsafe(4);
            // idBuffer.writeUInt32LE(listingId, 0);
                const idBuffer = Buffer.allocUnsafe(4);
                idBuffer.writeUInt32LE(listingId, 0);
                console.log("sellet wallet is ",listingfromDb.seller.wallet.toString())
            const listing=PublicKey.findProgramAddressSync(
                [Buffer.from("listing"),marketplace.toBuffer(),idBuffer,new PublicKey(listingfromDb.seller.wallet).toBuffer()],
                new PublicKey(marketplaceProgram.MINT_CRAFT_MARKETPLACE_PROGRAM_ADDRESS)
            )
            // const userConfig=umi.eddsa.findPda(
            //     MINT_CRAFT_MARKETPLACE_PROGRAM_ID,
            //     [Buffer.from("user"),ctx.wallet.toBuffer()]
            // )
            const makerConfig=PublicKey.findProgramAddressSync(
                [Buffer.from("user"),new PublicKey(listingfromDb.seller.wallet.toString()).toBuffer()],
                new PublicKey(marketplaceProgram.MINT_CRAFT_MARKETPLACE_PROGRAM_ADDRESS)
            )
    
            const makerMintAta=await findAssociatedTokenAddress(new PublicKey(listingfromDb.nft.mintAddress),listingfromDb.seller.wallet)
            console.log("the listing,userConfig,userMintAta are ",listing,makerConfig,makerMintAta)
            const nft=await prismaClient.nFT.findUnique(
             {
                where:{
                    mintAddress:listingfromDb.nft.mintAddress
                }
             }   
            )
            console.log("the nft is ",nft)
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
            const vaultMint=await findAssociatedTokenAddress(new PublicKey(listingfromDb.nft.mintAddress),listing[0].toString())
            console.log("the vault mint is ",vaultMint) 
                         const user=await prismaClient.user.findUnique({
                            where: {
                                wallet: listingfromDb.seller.wallet
                            }
                        })
                        if(!user){
                            throw new TRPCError({
                                code: 'NOT_FOUND',      
                            })
                        }
                        console.log("the user is ",user)
                            const takerAta=await findAssociatedTokenAddress(new PublicKey(listingfromDb.nft.mintAddress),ctx.wallet)
        const takerConfig=PublicKey.findProgramAddressSync(
                [Buffer.from("user"),new PublicKey(ctx.wallet).toBuffer()],
                new PublicKey(marketplaceProgram.MINT_CRAFT_MARKETPLACE_PROGRAM_ADDRESS)
            )
    
            const transactionIx=await marketplaceProgram.getPurchaseInstruction({
                authority:address(authority.toString()),
                listing:address(listing[0].toString()),
                maker:address(listingfromDb.seller.wallet.toString()),
                makerAta:address(makerMintAta[0].toString()),
                makerConfig:address(makerConfig[0].toString()),
                marketplace:address(marketplace.toString()),
                mint:address(listingfromDb.nft.mintAddress),
                taker:address(ctx.wallet),
                takerAta:address(takerAta[0].toString()),
                takerConfig:address(takerConfig[0].toString()),
                vault:address(vaultMint[0].toString()),
                associatedTokenProgram:address(ASSOCIATED_PROGRAM_ID.toString()),
                systemProgram:address(SYSTEM_PROGRAM_ID.toString()),
                tokenProgram:address(TOKEN_PROGRAM_ID.toString()),
            })
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
                return {
                    serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
                    listingId:listingId
                }
        } catch (error) {
            console.log("An error  occurred while buying NFT:", error);
            throw new Error("Failed to buy NFT");
        }
    }),
    
    getListings:procedures.query(async(ctx)=>{
        try {
            
            console.log("in the get Listing serv")
            const listings=await prismaClient.listing.findMany({})
            console.log("the listings are",listings)
            return listings.map((listing) => ({
  ...listing,
  price: listing.price.toString(), // or Number(listing.price)
}));
        } catch (error) {
            console.log("An error occurred while fetching user's NFTs:", error);
                throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch listings",
      cause: error,
    });
        
        }
    }),
    getMyListings:procedures.input(z.object({userPubkey:z.string()})).query(async({ctx})=>{
        const listings=await prismaClient.listing.findMany({
            where:{
                sellerId:ctx.wallet
            }
        })
        return listings
    }),
    getMyPurchases:procedures.input(z.object({})).query(async({ctx})=>{})

})
