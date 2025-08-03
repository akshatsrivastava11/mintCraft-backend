import Arweave from 'arweave'
const arweave=Arweave.init({
  host:'127.0.0.1',
  port:1984,
  protocol:'http'
})

export async function uploadFileToIPFS(
  data: any, 
  type: 'metadata' | 'content', 
  wallet: string
): Promise<string> {
  const arweaveKey=await arweave.wallets.generate()
  const arweaveWalletAddress=await arweave.wallets.jwkToAddress(arweaveKey)
  // Generate a mock IPFS hash for testing
  if (type=='content'){
    let transaction=await arweave.createTransaction({data},arweaveKey)
    transaction.addTag('Content-Type', 'image/png')
    await arweave.transactions.sign(transaction,arweaveKey)
    const response=await arweave.transactions.post(transaction)
    const status=await arweave.transactions.getStatus(transaction.id)
    console.log(status)
    return `https://arweave.net/${transaction.id}`
  }
  else{
    let transaction=await arweave.createTransaction({data},arweaveKey)
    transaction.addTag('Content-Type', 'application/json')
    await arweave.transactions.sign(transaction,arweaveKey)
    const response=await arweave.transactions.post(transaction)
    const status=await arweave.transactions.getStatus(transaction.id)
    console.log(status)
    return `https://arweave.net/${transaction.id}`
  }
}