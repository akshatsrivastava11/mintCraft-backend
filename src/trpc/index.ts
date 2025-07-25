import { initTRPC} from '@trpc/server'
import { Context } from './context';
const t = initTRPC.context<Context>().create();
export const middlewares=t.middleware;
export const procedures=t.procedure;
export const router=t.router
