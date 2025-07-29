import express from 'express'
import { approuter } from './src/trpc/routers'
import * as trpcExpress from '@trpc/server/adapters/express'
import cors from 'cors'
import { createContext } from './src/trpc/context'
const app=express()
app.use(cors())
app.use('/trpc',trpcExpress.createExpressMiddleware({
    router:approuter,
    createContext:createContext
}))
app.get('/',(req,res)=>{
    res.send("Are janab aap yha")
})
app.listen(4000,()=>{
    console.log("app is listening on port 4000")
})

