import { createSignerFromKeypair, signerIdentity ,publicKey} from '@metaplex-foundation/umi';
import {initializeGlobalState,initializeUser,MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID} from '../../clients/generated/umi/src'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import {} from '@solana-developers/helpers'
import { SystemProgram } from '@solana/web3.js';

const getGlobalState = async () => {
// try {
//     const wallet= await getKeypairFromFile();
//     const umi = createUmi("https://api.devnet.solana.com");
//     const keypair=umi.eddsa.createKeypairFromSecretKey(wallet.secretKey);
//     const signer=createSignerFromKeypair(umi,keypair)
//     umi.use(signerIdentity(signer));


//    const globalState=await  umi.eddsa.findPda(
//     MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID,
//     [Buffer.from("global_state")],
//    )
//     const globalStateIx=await initializeGlobalState(umi,{
//         authority:signer,
//         globalState:globalState,
//         systemProgram:publicKey(SystemProgram.programId)
//     })
//     globalStateIx.sendAndConfirm(umi)
// } catch (error) {
//     console.error("Error initializing global state:", error);
//     throw error;
//   }
}    

export const getUserConfig = async (userPublicKey:any) => {
    try {
        const umi = createUmi("https://api.devnet.solana.com");
        const userConfig=umi.eddsa.findPda(
            MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID,
            [Buffer.from("user_config"),userPublicKey.toBuffer()]
        )
        const userConfigIx=await initializeUser(umi,{
            user:userPublicKey,
            userConfig:userConfig,
        systemProgram:publicKey(SystemProgram.programId)
        })
        const transaction=await userConfigIx.buildAndSign(umi);
        const serializedTransaction = umi.transactions.serialize(transaction)
        return serializedTransaction;
    } catch (error) {
        console.error("Error initializing user config:", error);
        throw error;
    }
}
