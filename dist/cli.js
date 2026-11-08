#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { deploySponsoredFpc } from "./deploy.js";
function option(name) {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
}
async function main() {
    const command = process.argv[2];
    if (command !== "deploy") {
        throw new Error("Usage: paymaster deploy --config <file> --context <module>");
    }
    const configPath = option("--config");
    const contextPath = option("--context");
    if (!configPath || !contextPath)
        throw new Error("--config and --context are required");
    const config = JSON.parse(await readFile(resolve(configPath), "utf8"));
    const loaded = await import(pathToFileURL(resolve(contextPath)).href);
    const createContext = loaded.default;
    if (typeof createContext !== "function")
        throw new Error("Context module must default-export an async factory");
    const context = await createContext();
    const result = await deploySponsoredFpc({ ...context, config });
    console.log(`SPONSORED_FPC_CONTRACT_ADDRESS=${result.address}`);
    console.log(`SPONSORED_FPC_DEPLOYMENT_SALT=${result.salt}`);
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
//# sourceMappingURL=cli.js.map