import *  as marketplaceProgram from '../../../clients/marketplaceProgram/js/src'
import { AccountMeta, Connection, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import { AccountRole, address, createKeyPairSignerFromPrivateKeyBytes } from 'gill'
import { PrismaClient } from '../../database/generated/prisma'
import { TRPCError } from '@trpc/server'
import { getKeypairFromFile } from '@solana-developers/helpers'
import { rpc } from '..'
// import { PrismaClient } from '../../database/generated/prisma'
const prismaClient = new PrismaClient()
const initializeGlobalMarketplace = async () => {
    try {
        const marketplace = await PublicKey.findProgramAddressSync(
            [Buffer.from("marketplace")],
            new PublicKey(marketplaceProgram.MINT_CRAFT_MARKETPLACE_PROGRAM_ADDRESS)
        )
        const keypair = await getKeypairFromFile()

        // const walletSigner=await generateKeyPairSigner()
        //    const walletSigner=await generateKeyPairSigner()
        const walletSigner = await createKeyPairSignerFromPrivateKeyBytes(keypair.secretKey.slice(0, 32))

        const transactionIx = marketplaceProgram.getInitializeMarketplaceInstruction({
            authority: walletSigner,
            fees: 1,
            marketplace: address(marketplace[0].toString()),
            systemProgram: address(SystemProgram.programId.toString())
        },{
            programAddress:marketplaceProgram.MINT_CRAFT_MARKETPLACE_PROGRAM_ADDRESS
        })
        const keys: AccountMeta[] = (transactionIx.accounts).map((account) => {
            return {
                pubkey: new PublicKey(account.address),
                isSigner: account.address.toString() == walletSigner.address.toString(),
                isWritable: account.role === AccountRole.WRITABLE_SIGNER || account.role === AccountRole.WRITABLE,
            };

        });
        const convertedIx = new TransactionInstruction({
            keys,
            programId: new PublicKey(transactionIx.programAddress),
            data: Buffer.from(transactionIx.data)
        })
        const transaction = new Transaction()

        transaction.add(convertedIx)
        const recentBlockhash = await (await rpc.getLatestBlockhash()).send().then((data) => {
            return data.value.blockhash.toString()
        });
        transaction.feePayer = keypair.publicKey
        transaction.recentBlockhash = recentBlockhash
        const connection = new Connection("https://api.devnet.solana.com")
        transaction.feePayer = new PublicKey(walletSigner.address)
        // const sign = await sendAndConfirmTransaction(connection, transaction, [keypair])
        // console.log("marketplace initialized ", sign)
        const marketplaceDb=await prismaClient.marketplace.create({
            data:{
                createdAt:new Date(),                
            }
        })
        console.log("marketplace from db is ",marketplaceDb)


    } catch (error) {
        console.log("An error occured in initializing marketplace:", error)
        throw new Error("Failed to initialize marketplace")
    }
}
export const initializeUserConfig = async (userPubkey: string) => {
    try {
        const userConfig = PublicKey.findProgramAddressSync(
            [Buffer.from("user"), new PublicKey(userPubkey).toBuffer()],
            new PublicKey(marketplaceProgram.MINT_CRAFT_MARKETPLACE_PROGRAM_ADDRESS)
        )
        console.log("userConfig", userConfig)
        const transactionIx = await marketplaceProgram.getInitializeUserInstruction({
            user: address(userPubkey) as any,
            userConfig: address(userConfig[0].toString()),
            systemProgram: address(SystemProgram.programId.toString())
        })

        const keys: AccountMeta[] = (transactionIx.accounts).map((account) => {
            return {
                pubkey: new PublicKey(account.address),
                isSigner: account.address.toString() == userPubkey.toString(),
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
        const serializedTransaction = Tx.serialize({ requireAllSignatures: false })
        return serializedTransaction
    } catch (error) {
        console.log("An error occured in initializing user config:", error)
        throw new Error("Failed to initialize user config")
    }

}
// initializeGlobalMarketplace()