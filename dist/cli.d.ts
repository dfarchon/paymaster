#!/usr/bin/env node
import type { AztecAddress } from "@aztec-labs/aztec.js/addresses";
import type { Wallet } from "@aztec-labs/aztec.js/wallet";
export type DeploymentContext = {
    wallet: Wallet;
    deployer: AztecAddress;
    sendOptions?: Record<string, unknown>;
};
//# sourceMappingURL=cli.d.ts.map