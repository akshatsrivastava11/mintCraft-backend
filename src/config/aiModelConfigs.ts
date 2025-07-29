import { createSignerFromKeypair, signerIdentity ,publicKey} from '@metaplex-foundation/umi';
import {initializeGlobalState,initializeUser} from '../../clients/generated/umi/src'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import {getKeypairFromFile} from '@solana-developers/helpers'
import { PublicKey, SystemProgram } from '@solana/web3.js';

const MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID="6pKDeeU6C4t2i6C9FnTfgiFKQM5EhNbyZNJ2jwU2DuPw"
const getGlobalState = async () => {
try {
    const wallet= await getKeypairFromFile();
    console.log("wallet",wallet.publicKey)
    const umi = createUmi("http://127.0.0.1:8899");
    const keypair=umi.eddsa.createKeypairFromSecretKey(wallet.secretKey);
    const signer=createSignerFromKeypair(umi,keypair)
    umi.use(signerIdentity(signer));

    const globalState=await  umi.eddsa.findPda(
        publicKey(MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID),
        [Buffer.from("globalAiState")],
    )
    // console.log("Mintcreaft model registry",MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID)
    const globalStateIx=await initializeGlobalState(umi,{
        authority:signer,
        globalState:globalState,
        systemProgram:publicKey(SystemProgram.programId)
    })
    console.log("Mintcreaft program id",MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID)
    globalStateIx.sendAndConfirm(umi)
} catch (error) {
    console.error("Error initializing global state:", error);
    throw error;
  }
}    

export const getUserConfig = async (userPublicKeyis:any) => {
    try {
        const userPublicKey=publicKey(userPublicKeyis)
            const wallet= await getKeypairFromFile();

        const userpublickey=new PublicKey(userPublicKeyis)
        const umi = createUmi("http://127.0.0.1:8899 ");
            const keypair=umi.eddsa.createKeypairFromSecretKey(wallet.secretKey);
    const signer=createSignerFromKeypair(umi,keypair)
    umi.use(signerIdentity(signer));
        const userConfig=umi.eddsa.findPda(
            publicKey(MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID),
            [Buffer.from("user_config"),userpublickey.toBuffer()]
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
// getGlobalState()