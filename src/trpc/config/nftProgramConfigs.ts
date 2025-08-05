import { AccountMeta, Connection, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import *as nftProgram from '../../clients/nftProgram/js/src'
import { AccountRole, address, createKeyPairSignerFromPrivateKeyBytes } from 'gill'
import { getKeypairFromFile } from '@solana-developers/helpers'
import { rpc } from '..'
import { config } from 'dotenv'
const initializeGlobalState=async()=>{
    try {
        
        const config=await PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            new PublicKey(nftProgram.MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS)
        )
            const keypair=await getKeypairFromFile()
            
            // const walletSigner=await generateKeyPairSigner()
            //    const walletSigner=await generateKeyPairSigner()
            const walletSigner=await createKeyPairSignerFromPrivateKeyBytes(keypair.secretKey.slice(0,32))
        
        const transactionIx=await nftProgram.getInitializeConfigInstruction({
            config:address(config[0].toString()),
            platformFees:1,
            signer:walletSigner,
            systemProgram:address(SystemProgram.programId.toString()),
        })
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
        console.log("an error",error)   
    }
}

export const initializeUserConfig=async(userPubkey:string)=>{
    try {
        const config=await PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            new PublicKey(nftProgram.MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS)
        )
        const userConfig=await PublicKey.findProgramAddressSync(
            [Buffer.from("user_config"),config[0].toBuffer(),new PublicKey(userPubkey).toBuffer()],
            new PublicKey(nftProgram.MINT_CRAFT_NFT_PROGRAM_PROGRAM_ADDRESS)
        )
        const transactionIx=await nftProgram.getInitializeUserInstruction({
            config:address(config[0].toString()),
            user:address(userPubkey) as any,
            userConfig:address(userConfig[0].toString()),
            systemProgram:address(SystemProgram.programId.toString()),
        })
         const keys:AccountMeta[]=(transactionIx.accounts).map((account) => {
                                return {
                                    pubkey:new PublicKey(account.address),
                                    isSigner: account.address.toString()==userPubkey.toString(),
                                    isWritable: account.role === AccountRole.WRITABLE_SIGNER || account.role === AccountRole.WRITABLE,
                                };
            
                            });
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
                            feePayer: new PublicKey(userPubkey),
                            recentBlockhash: recentBlockhash
                        }).add(convertedIx)
                        // Tx.partialSign()
                        const serializedTransaction = Tx.serialize({requireAllSignatures:false})
                        return serializedTransaction
    } catch (error) {
        console.log("an error",error)
    }
}
// initializeGlobalState()