#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { parseUnits } from "viem";
import { claimFeeJuice, depositFeeJuice, parseFpcClaim, serializeFpcClaim, } from "./funding.js";
function usage() {
    throw new Error("Usage: allowlist-sponsored-fpc-fund <deposit|claim> --context <module> [options]\n" +
        "  deposit: --recipient <aztec-address> --amount <fee-juice> [--output <json>]\n" +
        "  claim:   --claim-file <json>");
}
function option(name) {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
}
async function loadContext() {
    const contextPath = option("--context");
    if (!contextPath)
        usage();
    const loaded = await import(pathToFileURL(resolve(contextPath)).href);
    const createContext = loaded.default;
    if (typeof createContext !== "function")
        throw new Error("Funding context must default-export an async factory.");
    return createContext();
}
async function main() {
    const command = process.argv[2];
    const context = await loadContext();
    if (command === "deposit") {
        const recipient = option("--recipient");
        const amount = option("--amount");
        if (!recipient || !amount)
            usage();
        const claim = await depositFeeJuice({
            context,
            recipient,
            amount: parseUnits(amount, 18),
        });
        const serialized = serializeFpcClaim(claim);
        const output = option("--output");
        if (output)
            await writeFile(resolve(output), `${JSON.stringify(serialized, null, 2)}\n`);
        console.log(JSON.stringify(serialized, null, 2));
        return;
    }
    if (command === "claim") {
        const claimFile = option("--claim-file");
        if (!claimFile)
            usage();
        const claim = parseFpcClaim(JSON.parse(await readFile(resolve(claimFile), "utf8")));
        const result = await claimFeeJuice(context, claim);
        console.log(`Fee Juice claim submitted for ${claim.recipient.toString()}.`);
        console.log(result);
        return;
    }
    usage();
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
//# sourceMappingURL=fund-cli.js.map