import { AztecAddress } from "@aztec-labs/aztec.js/addresses";
import { FeeJuiceContract } from "@aztec-labs/aztec.js/protocol";
import {
  L1FeeJuicePortalManager,
  type L2AmountClaim,
} from "@aztec-labs/aztec.js/ethereum";
import type { ExtendedViemWalletClient } from "@aztec-labs/ethereum/types";
import type { AztecNode } from "@aztec-labs/aztec.js/node";
import type { Wallet } from "@aztec-labs/aztec.js/wallet";
import { Fr } from "@aztec-labs/aztec.js/fields";
import { createLogger } from "@aztec-labs/aztec.js/log";

export type FpcFundingContext = {
  /** Aztec node used to discover the L1 portals and submit the claim. */
  node: AztecNode;
  /** Aztec wallet used by the operator to submit the L2 claim. */
  wallet: Wallet;
  /** Aztec account that pays the L2 claim transaction fee. */
  claimer: AztecAddress;
  /** Optional fee settings for the operator's claim transaction. */
  sendOptions?: Record<string, unknown>;
};

export type FpcDepositContext = FpcFundingContext & {
  /** L1 wallet client used to approve and deposit the L1 fee token. */
  l1Client: ExtendedViemWalletClient;
};

export type FpcClaim = Pick<
  L2AmountClaim,
  "claimAmount" | "claimSecret" | "messageLeafIndex" | "messageHash"
> & { recipient: AztecAddress };

/**
 * Deposit L1 fee tokens for a project FPC. The returned secret must be kept
 * until claimFeeJuice succeeds; anyone with it can submit the one-time claim,
 * but the balance is always credited to the fixed recipient.
 */
export async function depositFeeJuice(options: {
  context: FpcDepositContext;
  recipient: AztecAddress | string;
  amount: bigint;
  mint?: boolean;
}): Promise<FpcClaim> {
  const recipient =
    typeof options.recipient === "string"
      ? AztecAddress.fromStringUnsafe(options.recipient)
      : options.recipient;
  const manager = await L1FeeJuicePortalManager.new(
    options.context.node,
    options.context.l1Client,
    createLogger("paymaster-funding"),
  );
  const claim = await manager.bridgeTokensPublic(
    recipient,
    options.amount,
    options.mint ?? false,
  );
  return { ...claim, recipient };
}

/**
 * Consume a ready L1→L2 message and credit Fee Juice to the FPC address.
 * `claimer` pays this transaction; it does not receive the bridged balance.
 */
export async function claimFeeJuice(
  context: FpcFundingContext,
  claim: FpcClaim,
): Promise<unknown> {
  const recipient = claim.recipient;
  const interaction = FeeJuiceContract.withWallet(context.wallet).methods.claim(
    recipient,
    claim.claimAmount,
    claim.claimSecret,
    claim.messageLeafIndex,
  );
  return interaction.send({
    from: context.claimer,
    ...(context.sendOptions ?? {}),
  });
}

export function serializeFpcClaim(claim: FpcClaim): Record<string, string> {
  return {
    recipient: claim.recipient.toString(),
    claimAmount: claim.claimAmount.toString(),
    claimSecret: claim.claimSecret.toString(),
    messageLeafIndex: claim.messageLeafIndex.toString(),
    messageHash: claim.messageHash,
  };
}

export function parseFpcClaim(value: Record<string, string>): FpcClaim {
  return {
    recipient: AztecAddress.fromStringUnsafe(value.recipient),
    claimAmount: BigInt(value.claimAmount),
    claimSecret: Fr.fromString(value.claimSecret),
    messageLeafIndex: BigInt(value.messageLeafIndex),
    messageHash: value.messageHash as `0x${string}`,
  };
}
