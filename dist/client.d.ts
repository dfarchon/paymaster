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
export type ContractMethodMap = {
    methods: Record<string, unknown>;
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
    /**
     * Check whether a contract method can be sent through this FPC.
     *
     * The on-chain policy is target-contract based, not selector based: every
     * method on an allowlisted target is accepted as long as it preserves the
     * sender. When a contract wrapper is supplied, this also checks that the
     * requested method exists in that wrapper.
     */
    isMethodSupported(target: AztecAddress | string, method: string, contract?: ContractMethodMap): Promise<boolean>;
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