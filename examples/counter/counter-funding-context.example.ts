import { createExtendedL1Client } from "@aztec-labs/ethereum/client";
import { createAztecNodeClient } from "@aztec-labs/aztec.js/node";

/**
 * Copy this file to counter-funding-context.ts and provide the values through
 * environment variables. Do not commit the copied file or the secrets.
 */
export default async function createFundingContext() {
  const nodeUrl =
    process.env.AZTEC_NODE_URL ?? "https://aztec-testnet.drpc.org";
  const l1RpcUrl = process.env.ETHEREUM_HOST;
  const l1PrivateKey = process.env.L1_PRIVATE_KEY;
  if (!l1RpcUrl || !l1PrivateKey) {
    throw new Error("Set ETHEREUM_HOST and L1_PRIVATE_KEY");
  }

  const node = createAztecNodeClient(nodeUrl);
  const l1Client = createExtendedL1Client([l1RpcUrl], l1PrivateKey);
  // The counter UI supplies the wallet and claimer account. It only needs the
  // L1 client and node from this context to consume the bridge message.
  return { node, l1Client } as never;
}
