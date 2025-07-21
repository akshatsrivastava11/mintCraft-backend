import {initTRPC} from '@trpc/server'
export const t=initTRPC.create();
export const middlewares=t.middleware;
export const procedures=t.procedure;
export const router=t.router
