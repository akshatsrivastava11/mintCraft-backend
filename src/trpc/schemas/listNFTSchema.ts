import {z} from 'zod'
export const ListNFTSchema=z.object({
    nftMint:z.string(),
    price:z.number().positive(),
    
})