import { s } from 'pinata/dist/gateway-tools-l9hk7kz4'
import {z} from 'zod'

export const RegisterAIModelSchema=z.object({
    name:z.string(),
    description:z.string(),
    apiEndpoint:z.string(),
    royaltyPerGeneration:z.number().min(0).max(50),
    headersJSONstring:z.record(z.string(),z.string()),
    bodyTemplate:z.string(),
    userPromptField: z.string(),
    httpMethod: z.string(),
    responseTemplate: z.string(), // Fixed: Added missing field
    finalContentField: z.string(), // 
})