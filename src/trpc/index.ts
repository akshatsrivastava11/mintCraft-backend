import { initTRPC} from '@trpc/server'
import { Context } from './context';
import { createSolanaRpc } from 'gill';
export const t = initTRPC.context<Context>().create();
export const middlewares=t.middleware;
export const procedures=t.procedure;
export const router=t.router
export const rpc = createSolanaRpc("https://api.devnet.solana.com");
