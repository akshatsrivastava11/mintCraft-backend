import {z} from 'zod'
import { procedures,router } from '..'
export const marketplaceRouter=router({
    listNft:procedures.input(z.object({})).mutation(async({input,ctx})=>{}),
    buyNft:procedures.input(z.object({})).mutation(async({input,ctx})=>{}),
    getListings:procedures.input(z.object({})).query(async(ctx)=>{}),
    getMyListings:procedures.input(z.object({})).query(async({ctx})=>{}),
    getMyPurchases:procedures.input(z.object({})).query(async({ctx})=>{})
})
