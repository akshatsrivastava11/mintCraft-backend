export const sendRequest=async (apiEndpoint:string,headers:Record<string,string>,body:string,responseTemplate:string,toBeplaced:string)=>{
    console.log("In the send request")
    console.log("the headers",headers)

    console.log("the body",body)
    // console.log("the headers",JSON.parse(headers))

    const str={
        headers,
        method:"POST",
        body:JSON.parse(body)
    }
    console.log("the str",str)
    console.log("the api endpoint",apiEndpoint)
    const response=await fetch(apiEndpoint,str)
    const json=await response.json()
    const path=findFinalBlobPath(JSON.parse(responseTemplate),toBeplaced)
    console.log("the final path is ",path)
    console.log("response is ",response)
    console.log("json is ",json)
    const finalResponse=getValueAtPath(json,path[0])
    console.log("the final response is ",finalResponse)
      // console.log("the result",base64)
      //   const blob = base64ToBlob(base64, "image/png"); // or "image/jpeg" depending on model
    //     console.log("The blob ",blob)
    // return blob
    return finalResponse//for tests only
}
 function base64ToBlob(base64:any, mimeType = "image/png") {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let i = 0; i < byteCharacters.length; i += 512) {
    const slice = byteCharacters.slice(i, i + 512);
    const byteNumbers = new Array(slice.length).fill(0).map((_, i) => slice.charCodeAt(i));
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mimeType });
}
export async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}


function findFinalBlobPath(obj:JSON, targetPlaceholder:string) {
  const path:any = [];

  function dfs(current:any, currentPath:any) {
    if (current === targetPlaceholder) {
      path.push([...currentPath]);
    } else if (typeof current === "object" && current !== null) {
      for (const key in current) {
        dfs(current[key], [...currentPath, key]);
      }
    }
  }

  dfs(obj, []);
  return path;
}

function getValueAtPath(obj:any, path:any) {
  return path.reduce((acc:any, key:any) => acc && acc[key], obj);
}