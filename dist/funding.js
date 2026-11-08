import { AztecAddress } from "@aztec-labs/aztec.js/addresses";
import { FeeJuiceContract } from "@aztec-labs/aztec.js/protocol";
import { L1FeeJuicePortalManager, } from "@aztec-labs/aztec.js/ethereum";
import { Fr } from "@aztec-labs/aztec.js/fields";
import { createLogger } from "@aztec-labs/aztec.js/log";
/**
 * Deposit L1 fee tokens for a project FPC. The returned secret must be kept
 * until claimFeeJuice succeeds; anyone with it can submit the one-time claim,
 * but the balance is always credited to the fixed recipient.
 */
export async function depositFeeJuice(options) {
    const recipient = typeof options.recipient === "string"
        ? AztecAddress.fromStringUnsafe(options.recipient)
        : options.recipient;
    const manager = await L1FeeJuicePortalManager.new(options.context.node, options.context.l1Client, createLogger("allowlist-sponsored-fpc-funding"));
    const claim = await manager.bridgeTokensPublic(recipient, options.amount, options.mint ?? false);
    return { ...claim, recipient };
}
/**
 * Consume a ready L1→L2 message and credit Fee Juice to the FPC address.
 * `claimer` pays this transaction; it does not receive the bridged balance.
 */
export async function claimFeeJuice(context, claim) {
    const recipient = claim.recipient;
    const interaction = FeeJuiceContract.withWallet(context.wallet).methods.claim(recipient, claim.claimAmount, claim.claimSecret, claim.messageLeafIndex);
    return interaction.send({
        from: context.claimer,
        ...(context.sendOptions ?? {}),
    });
}
export function serializeFpcClaim(claim) {
    return {
        recipient: claim.recipient.toString(),
        claimAmount: claim.claimAmount.toString(),
        claimSecret: claim.claimSecret.toString(),
        messageLeafIndex: claim.messageLeafIndex.toString(),
        messageHash: claim.messageHash,
    };
}
export function parseFpcClaim(value) {
    return {
        recipient: AztecAddress.fromStringUnsafe(value.recipient),
        claimAmount: BigInt(value.claimAmount),
        claimSecret: Fr.fromString(value.claimSecret),
        messageLeafIndex: BigInt(value.messageLeafIndex),
        messageHash: value.messageHash,
    };
}
//# sourceMappingURL=funding.js.map