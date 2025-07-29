import { CreateNextContextOptions } from '@trpc/server/adapters/next';

export async function createContext({ req, res }: CreateNextContextOptions) {

  const wallet = req.headers['x-wallet'] || req.headers['x-wallet-address'] || '';
  console.log('tRPC Context - Received wallet address:', wallet);
  if (wallet) {
    try {
      // Replace this with your actual user lookup logic
      // console.log('tRPC Context - Found user:', user);
      console.log(wallet)
    } catch (error) {
      console.error('tRPC Context - Error fetching user:', error);
    }
  }
  return {
    req,
    res,
    wallet,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
