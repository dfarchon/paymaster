import { AztecAddress } from "@aztec-labs/aztec.js/addresses";
import { type L2AmountClaim } from "@aztec-labs/aztec.js/ethereum";
import type { ExtendedViemWalletClient } from "@aztec-labs/ethereum/types";
import type { AztecNode } from "@aztec-labs/aztec.js/node";
import type { Wallet } from "@aztec-labs/aztec.js/wallet";
export type FpcFundingContext = {
    /** Aztec node used to discover the L1 portals and submit the claim. */
    node: AztecNode;
    /** L1 wallet client used to approve and deposit the L1 fee token. */
    l1Client: ExtendedViemWalletClient;
    /** Aztec wallet used by the operator to submit the L2 claim. */
    wallet: Wallet;
    /** Aztec account that pays the L2 claim transaction fee. */
    claimer: AztecAddress;
    /** Optional fee settings for the operator's claim transaction. */
    sendOptions?: Record<string, unknown>;
};
export type FpcClaim = Pick<L2AmountClaim, "claimAmount" | "claimSecret" | "messageLeafIndex" | "messageHash"> & {
    recipient: AztecAddress;
};
/**
 * Deposit L1 fee tokens for a project FPC. The returned secret must be kept
 * until claimFeeJuice succeeds; anyone with it can submit the one-time claim,
 * but the balance is always credited to the fixed recipient.
 */
export declare function depositFeeJuice(options: {
    context: Pick<FpcFundingContext, "node" | "l1Client">;
    recipient: AztecAddress | string;
    amount: bigint;
    mint?: boolean;
}): Promise<FpcClaim>;
/**
 * Consume a ready L1→L2 message and credit Fee Juice to the FPC address.
 * `claimer` pays this transaction; it does not receive the bridged balance.
 */
export declare function claimFeeJuice(context: FpcFundingContext, claim: FpcClaim): Promise<unknown>;
export declare function serializeFpcClaim(claim: FpcClaim): Record<string, string>;
export declare function parseFpcClaim(value: Record<string, string>): FpcClaim;
//# sourceMappingURL=funding.d.ts.map