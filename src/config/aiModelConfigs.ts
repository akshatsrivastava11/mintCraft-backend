import { createSignerFromKeypair, publicKey, signerIdentity } from '@metaplex-foundation/umi';
import {initializeGlobalState,initializeUser} from '../../clients/generated/umi/src'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import {getKeypairFromFile} from '@solana-developers/helpers'
import { PublicKey } from '@metaplex-foundation/umi';
import { SystemProgram } from '@solana/web3.js';
import { SYSTEM_PROGRAM_ADDRESS } from 'gill/programs';
const getGlobalState = async () => {
try {
    const wallet= await getKeypairFromFile();
    const umi = createUmi("https://api.devnet.solana.com");
    const keypair=umi.eddsa.createKeypairFromSecretKey(wallet.secretKey);
    const signer=createSignerFromKeypair(umi,keypair)
    umi.use(signerIdentity(signer));


   const globalState=umi.eddsa.findPda(
    AI_MODEL_PROGRAM_ID,
    [Buffer.from("global_state")],
   )
    const globalStateIx=await initializeGlobalState(umi,{
        globalState:globalState,
        systemProgram:SYSTEM_PROGRAM_ADDRESS
    })
    globalStateIx.sendAndConfirm(umi)
} catch (error) {
    console.error("Error initializing global state:", error);
    throw error;
  }
}    

export const getUserConfig = async (userPublicKey) => {
    try {
        const umi = createUmi("https://api.devnet.solana.com");
        const userConfig=umi.eddsa.findPda(
            AI_MODEL_PROGRAM_ID,
            [Buffer.from("user_config"),userPublicKey.toBuffer()]
        )
        const userConfigIx=await initializeUser(umi,{
            userConfig:userConfig,
        systemProgram:SYSTEM_PROGRAM_ADDRESS
        })
        const transaction=await userConfigIx.buildAndSign(umi);
        const serializedTransaction = umi.transactions.serialize(transaction)
        return serializedTransaction;
    } catch (error) {
        console.error("Error initializing user config:", error);
        throw error;
    }
}
