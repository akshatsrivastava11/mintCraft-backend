import { CreateNextContextOptions } from "@trpc/server/adapters/next";

export async function createContext({req,res}:CreateNextContextOptions) {
    const user=req.body.user;
    return {
        req,res,user
}
}

export type Context=Awaited<ReturnType<typeof createContext>>;