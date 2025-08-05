import {procedures, router} from '..'
import {z} from 'zod'
import { PrismaClient } from '../../database/generated/prisma'
import { TRPCError } from '@trpc/server'
const prismaClient=new PrismaClient()
export const authRouter=router({

        connectWallet:procedures.input(z.object({
            walletAddress:z.string(),
        }))
        .mutation(async({input,ctx})=>{
            try {
                let user=await prismaClient.user.findUnique({
                    where:{
                        wallet:input.walletAddress
                    },
                })
                console.log(user)
                if (!user){
                    user=await prismaClient.user.create({
                        data:{
                            wallet:input.walletAddress
                        }
                    })
                }
                return{
                    success:true,
                    message:"Wallet connected successfully",
                    user:user
                }

            } catch (error) {
                console.log("An error occurred while connecting wallet:", error);
                throw new Error("Failed to connect wallet");
            }
        }),
    getProfile:procedures.query(async({ctx})=>{
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
            const userfound=await prismaClient.user.findUnique({
                where:{
                    id:user.id
                },
                include:{
                    aiModels:true,
                    contents:true,
                    nfts:true,
                    listings:true,
                    
                }
            })
            if (!user) {
                throw new Error("User not found");
            }
            return {
                success: true,
                message: "Profile fetched successfully",
                user: user
            }

        } catch (error) {
            console.log("An error occurred while fetching profile:", error);
            throw new Error("Failed to fetch profile");
        }
    })
})