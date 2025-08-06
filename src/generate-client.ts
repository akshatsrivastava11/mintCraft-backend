import { AnchorIdl, rootNodeFromAnchorWithoutDefaultVisitor } from "@codama/nodes-from-anchor";
import { renderJavaScriptUmiVisitor, renderJavaScriptVisitor, renderRustVisitor } from "@codama/renderers";
import { visit } from "@codama/visitors-core";
import {createCodamaConfig} from 'gill'
// import anchorIdl from "../src/idl/mint_craft_model_registry.json"; 
// import anchorIdl from '../src/idl/mint-craft-nft-program.json'
// Note: if you initiated your project with a different name, you may need to change this path
// import anchorIdl from '../src/idl/mint-craft-nft-program.json'
// import anchorIdl from '../src/idl/mint_craft_marketplace.json'
import anchorIdl from '../src/idl/mint_craft_marketplace.json'

async function generateClients() {
    const node = rootNodeFromAnchorWithoutDefaultVisitor(anchorIdl as AnchorIdl);

    const clients = [
        { type: "JS", dir: "clients/marketplaceProgram/js/src", renderVisitor: renderJavaScriptVisitor },
        { type: "Umi", dir: "clients/marketplaceProgram/umi/src", renderVisitor: renderJavaScriptUmiVisitor },
        { type: "Rust", dir: "clients/marketplaceProgram/rust/src", renderVisitor: renderRustVisitor }
    ];

    for (const client of clients) {
        try {
            await visit(
                node,
                await client.renderVisitor(client.dir)
            ); console.log(`✅ Successfully generated ${client.type} client for directory: ${client.dir}!`);
        } catch (e) {
            console.error(`Error in ${client.renderVisitor.name}:`, e);
            throw e;
        }
    }
  
    
}

export default createCodamaConfig({
        idl:"../idl/mint_craft_model_registry.json",
        clientJs:"../../clients/generated/js/src"
    })
generateClients();