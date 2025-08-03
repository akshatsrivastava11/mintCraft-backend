export async function uploadFileToIPFS(
  data: any, 
  type: 'metadata' | 'content', 
  wallet: string
): Promise<string> {
  // Generate a mock IPFS hash for testing
  const mockHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
  
  console.log(`Mock upload for ${type}:`, data)
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return `ipfs://${mockHash}`
}