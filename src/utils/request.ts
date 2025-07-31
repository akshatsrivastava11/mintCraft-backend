export const sendRequest=async (apiEndpoint:string,headers:string,body:string)=>{

    const response=await fetch(apiEndpoint,{
        headers:JSON.parse(headers),
        method:"POST",
        body:JSON.stringify(body)
    })
    const result=response.blob()
    return result
}