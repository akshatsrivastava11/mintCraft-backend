import {procedures, router} from '..'
import {z} from 'zod'
export const authRouter=router({
    auth:router({
        connectWallet:procedures.input(z.object({
            walletAddress:z.string(),
        }))
        .mutation(async({input,ctx})=>{
            //create or update the user state in the db
            //return user profile data
        })
    }),
    getProfile:procedures.query(async({ctx})=>{
        //return current user's profile
    })
})