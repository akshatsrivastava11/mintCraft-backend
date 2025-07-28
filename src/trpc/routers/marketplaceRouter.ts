import {z} from 'zod'
import { procedures,router } from '..'
import {list,MINT_CRAFT_MARKETPLACE_PROGRAM_ID} from '../../../clients/marketplaceProgram/umi/src'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { publicKey } from '@metaplex-foundation/umi'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import {findAssociatedTokenPda} from '@metaplex-foundation/mpl-toolbox'
import { TOKEN_PROGRAM_ADDRESS } from 'gill/programs'
const umi=createUmi("https://")
export const marketplaceRouter=router({
    listNft:procedures.input(z.object({})).mutation(async({input,ctx})=>{
    try {
        if (!ctx.user) {
            throw new Error("User not authenticated");
            
        }
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
            [Buffer.from("listing"),marketplaceForPda.toBuffer(),ctx.user.wallet.toBuffer()]
        )
        const userConfig=umi.eddsa.findPda(
            MINT_CRAFT_MARKETPLACE_PROGRAM_ID,
            [Buffer.from("user"),ctx.user.wallet.toBuffer()]
        )

        const userMintAta=findAssociatedTokenPda(
            umi,
            {
                mint:publicKey("nftmint"),,
                owner:ctx.user.wallet,
                tokenProgramId:publicKey(TOKEN_PROGRAM_ADDRESS)
            }
        )
        const vaultMint=findAssociatedTokenPda(
            umi,
            {
                mint:publicKey("nftmint"),
                owner:publicKey(listing),
                tokenProgramId:publicKey(TOKEN_PROGRAM_ADDRESS)
            }
        )
        
        const transactionBuilder=await list(umi,{
            maker:ctx.user.wallet,
            mint:publicKey("nftmint"),
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
    
    } catch (error) {
        console.log("An error occured in the listing process:", error);
        throw new Error("Failed to list NFT");
    }
    }),
    buyNft:procedures.input(z.object({})).mutation(async({input,ctx})=>{}),
    getListings:procedures.input(z.object({})).query(async(ctx)=>{}),
    getMyListings:procedures.input(z.object({})).query(async({ctx})=>{}),
    getMyPurchases:procedures.input(z.object({})).query(async({ctx})=>{})

})
