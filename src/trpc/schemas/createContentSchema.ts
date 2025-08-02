import { deserializeAccount } from '@metaplex-foundation/umi'
import {string, z} from 'zod'

export const createContentSchema=z.object({
    aiModelId:z.number(),
    prompt:z.string().max(1000),
    contentType:z.enum(["image","music","text","video"]),
    name:z.string(),
    description:z.string(),
})
