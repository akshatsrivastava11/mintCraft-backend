import { router } from "..";
import { aiModelRouter } from "./aiModelRouter";
import { authRouter } from "./authRouter";
import { contentRouter } from "./contentRouter";
import { marketplaceRouter } from "./marketplaceRouter";

export const approuter=router({
    aiModelRouter,
    authRouter,
    contentRouter,
    marketplaceRouter
})
