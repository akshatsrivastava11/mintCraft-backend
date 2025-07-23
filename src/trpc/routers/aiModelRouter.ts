import {z} from 'zod'
import { procedures, router } from '..'
import { RegisterAIModelSchema } from '../schemas/registerAIModelSchema'

export const aiModelRouter=router({
    register:procedures.input(RegisterAIModelSchema)
            .mutation(async({input,ctx})=>{

            }),
    getAll:procedures.input(z.object({

    })).query(async (ctx)=>{}),
    
})