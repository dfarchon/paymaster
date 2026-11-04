import { AztecAddress } from "@aztec-labs/aztec.js/addresses";
import type { ContractMethod } from "@aztec-labs/aztec.js/contracts";
import type { AztecNode } from "@aztec-labs/aztec.js/node";
import type { Wallet } from "@aztec-labs/aztec.js/wallet";
import { type TxHash } from "@aztec-labs/stdlib/tx";
import { type GasProfile } from "./gas.js";
import { SendOnceContext } from "./send-once.js";
export type SponsoredFpcClientOptions = {
    wallet: Wallet;
    node: AztecNode;
    address: AztecAddress | string;
    gasProfile: GasProfile;
    nodeUrl: string;
};
export declare class SponsoredFpcClient {
    private readonly options;
    readonly address: AztecAddress;
    readonly sendContext: SendOnceContext;
    private contract?;
    constructor(options: SponsoredFpcClientOptions);
    register(): Promise<void>;
    balance(): Promise<bigint>;
    sendMethod(args: {
        contract: {
            methods: Record<string, ContractMethod>;
        };
        method: string;
        args: unknown[];
        player: AztecAddress;
    }): Promise<TxHash>;
    sendCalls(calls: unknown[], player: AztecAddress): Promise<TxHash>;
    private proveAndSend;
}
//# sourceMappingURL=client.d.ts.map