import { createSignerFromKeypair, signerIdentity ,publicKey} from '@metaplex-foundation/umi';
// import {initializeGlobalState,initializeUser} from '../../../clients/generated/umi/src'
import * as aIModelProgramClient from '../../../clients/generated/js/src'
// import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import {getKeypairFromFile} from '@solana-developers/helpers'
import { AccountMeta, Connection, Keypair, PublicKey, sendAndConfirmTransaction, SendTransactionError, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { AccountRole, address, generateKeyPairSigner, TransactionModifyingSigner, TransactionPartialSigner, TransactionSendingSigner}from 'gill';
// import { MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ID } from '../../clients/generated/umi/src';
// import rpc from '../index'
import { TransactionSigner,KeyPairSigner,createSignerFromKeyPair,createKeyPairSignerFromPrivateKeyBytes} from 'gill';
// import { getKeypairFromFile } from '@solana-developers/helpers';
import { rpc } from '..';
interface Signer {
    publicKey: PublicKey;
    secretKey: Uint8Array;
}
const getGlobalState = async () => {
try {
        console.log("in the global state")
    // const wallet= await getKeypairFromFile();
    const global_state=await PublicKey.findProgramAddressSync(
        [Buffer.from("globalAiState")],
        new PublicKey(aIModelProgramClient.MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ADDRESS)
    )
    console.log("global state is",global_state)

    const keypair=await getKeypairFromFile()
    
    // const walletSigner=await generateKeyPairSigner()
    //    const walletSigner=await generateKeyPairSigner()
    const walletSigner=await createKeyPairSignerFromPrivateKeyBytes(keypair.secretKey.slice(0,32))

    // const walletSigner=await createKeyPairFromPrivateKeyBytes(keypair.secretKey)
    // const signer=await createSignerFromKeypair(,walletSigner)
    const transactionIx=aIModelProgramClient.getInitializeGlobalStateInstruction({
        authority: walletSigner,
        globalState:address(global_state[0].toString()),
        systemProgram: address(SystemProgram.programId.toString())
    })
    // console.log("wallet signer is",walletSigner.keyPair.privateKey)
    // const keypair=Keypair.fromSecretKey(walletSigner.keyPair.privateKey.usages.toString())
    const keys:AccountMeta[]=(transactionIx.accounts).map((account) => {
                            return {
                                pubkey:new PublicKey(account.address),
                                isSigner: account.address.toString()==walletSigner.address.toString(),
                                isWritable: account.role === AccountRole.WRITABLE_SIGNER || account.role === AccountRole.WRITABLE,
                            };
        
                        });
    const convertedIx=new TransactionInstruction({
        keys,
        programId:new PublicKey(transactionIx.programAddress),
        data:Buffer.from(transactionIx.data)
    })
    const transaction=new Transaction()
    
    transaction.add(convertedIx)
    const recentBlockhash = await (await rpc.getLatestBlockhash()).send().then((data) => {
                            return data.value.blockhash.toString()
                        });
    transaction.feePayer=keypair.publicKey
   transaction.recentBlockhash=recentBlockhash
   const connection=new Connection("https://api.devnet.solana.com")
                    transaction.feePayer=new PublicKey(walletSigner.address)
   const sign=await sendAndConfirmTransaction(connection,transaction,[keypair])                     
              console.log("global state is ",sign)      

} catch (error) {
    console.error("Error initializing global state:", error);
    throw error;
  }
}    


export const getUserConfig = async (userPublicKeyis:string) => {
    try {
        const userConfig=await PublicKey.findProgramAddressSync(
            [Buffer.from('user'),new PublicKey(userPublicKeyis).toBuffer()],
            new PublicKey(aIModelProgramClient.MINT_CRAFT_MODEL_REGISTRY_PROGRAM_ADDRESS)
        )
        
        const transactionIx=aIModelProgramClient.getInitializeUserInstruction({
            user:address(userPublicKeyis.toString()) as any,
            userConfig:address(userConfig[0].toString()),
            systemProgram:address(SystemProgram.programId.toString())
        })
        const keys: AccountMeta[] = (transactionIx.accounts).map((account) => {
                            return {
                                pubkey:new PublicKey(account.address),
                                isSigner: account.address.toString()==userPublicKeyis.toString(),
                                isWritable: account.role === AccountRole.WRITABLE_SIGNER || account.role === AccountRole.WRITABLE,
                            };
        
                        });
                        console.log("keys is ",keys)
                        const convertedIx = new TransactionInstruction({
                            keys: keys,
                            programId: new PublicKey(transactionIx.programAddress),
                            data: Buffer.from(transactionIx.data), // Ensure it's a Buffer/Uint8Array
                        });
                        console.log("convertedIx", convertedIx)
                        const recentBlockhash = await (await rpc.getLatestBlockhash()).send().then((data) => {
                            return data.value.blockhash.toString()
                        });
                        console.log("recentBlockhash", recentBlockhash)
                        const Tx = new Transaction({
                            feePayer: new PublicKey(userPublicKeyis),
                            recentBlockhash: recentBlockhash
                        }).add(convertedIx)
                        // Tx.partialSign()
                        const serializedTransaction = Tx.serialize({requireAllSignatures:false})
                        return serializedTransaction
    } catch (error) {
        if(error==SendTransactionError){
            console.log("send transaction errors :", error);
        }
        console.error("Error initializing user config:", error);
        throw error;
    }
}
// getGlobalState()
 