import {z} from 'zod'

export const RegisterAIModelSchema=z.object({
    name:z.string(),
    description:z.string(),
    apiEndpoint:z.string(),
    royaltyPerGeneration:z.number().min(0).max(50),
})