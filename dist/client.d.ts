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
    /** Return the target contracts accepted by this deployed FPC instance. */
    allowedTargets(): Promise<AztecAddress[]>;
    /** Check whether a target contract is allowlisted by this FPC instance. */
    isContractSupported(target: AztecAddress | string): Promise<boolean>;
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