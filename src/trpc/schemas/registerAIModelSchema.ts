import {z} from 'zod'

export const RegisterAIModelSchema=z.object({
    name:z.string(),
    description:z.string(),
    apiEndpoint:z.string(),
    royaltyPerGeneration:z.number().min(0).max(50),
    headersJSONstring:z.record(z.string(),z.string())
})