import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AztecAddress } from "@aztec-labs/aztec.js/addresses";
import { SponsoredFeePaymentMethod } from "@aztec-labs/aztec.js/fee/testing";
import { Fr } from "@aztec-labs/aztec.js/fields";
import { createAztecNodeClient } from "@aztec-labs/aztec.js/node";
import { getFeeJuiceBalance } from "@aztec-labs/aztec.js/utils";
import { getContractInstanceFromInstantiationParams } from "@aztec-labs/aztec.js/contracts";
import { Fq } from "@aztec-labs/foundation/curves/bn254";
import { EmbeddedWallet } from "@aztec-labs/wallets/embedded";
import { SponsoredFPCContractArtifact } from "@aztec-labs/noir-contracts.js/SponsoredFPC";
import {
  CounterContract,
  CounterContractArtifact,
} from "../../../target/Counter.js";
import { SponsoredFpcClient } from "../../../src/client.js";
import { claimFeeJuice, parseFpcClaim } from "../../../src/funding.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const nodeUrl = process.env.AZTEC_NODE_URL ?? "https://aztec-testnet.drpc.org";
const node = createAztecNodeClient(nodeUrl);
function gasLimit(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(`${name} must be a positive integer`);
  return value;
}

const gasProfile = {
  // Aztec Testnet currently allows 117,624 DA gas per transaction.
  // Keep the default below that limit; local deployments can override it.
  daGasLimit: gasLimit("PAYMASTER_DA_GAS_LIMIT", 100_000),
  l2GasLimit: gasLimit("PAYMASTER_L2_GAS_LIMIT", 2_000_000),
  teardownDaGasLimit: gasLimit("PAYMASTER_TEARDOWN_DA_GAS_LIMIT", 20_000),
  teardownL2GasLimit: gasLimit("PAYMASTER_TEARDOWN_L2_GAS_LIMIT", 200_000),
  feeHeadroomMultiplier: 1.2,
};

type TestWallet = Awaited<ReturnType<typeof EmbeddedWallet.create>>;
type TestAccount = Awaited<
  ReturnType<TestWallet["createSchnorrInitializerlessAccount"]>
>;
let wallet: TestWallet | undefined;
let account: TestAccount | undefined;
let counter: CounterContract | undefined;
let fpc: SponsoredFpcClient | undefined;
let officialPaymentMethod: SponsoredFeePaymentMethod | undefined;

async function readJson(request: import("node:http").IncomingMessage) {
  let body = "";
  for await (const chunk of request) body += chunk;
  return JSON.parse(body) as Record<string, string>;
}

async function createTestAccount(
  counterAddress: string,
  paymasterAddress: string,
) {
  wallet = await EmbeddedWallet.create(nodeUrl, { ephemeral: true });
  const secretKey = Fr.random();
  const salt = Fr.random();
  const signingKey = Fq.random();
  account = await wallet.createSchnorrInitializerlessAccount(
    secretKey,
    salt,
    signingKey,
    "counter-test-account",
  );

  // Initializerless accounts are registered in PXE and do not have a deployment
  // transaction. The Counter call below deliberately does not use the official FPC.
  const officialInstance = await getContractInstanceFromInstantiationParams(
    SponsoredFPCContractArtifact,
    { salt: new Fr(0) },
  );
  await wallet.registerContract(officialInstance, SponsoredFPCContractArtifact);
  officialPaymentMethod = new SponsoredFeePaymentMethod(
    officialInstance.address,
  );
  const address = AztecAddress.fromStringUnsafe(counterAddress);
  const instance = await node.getContract(address);
  if (!instance) throw new Error("Counter contract is not deployed");
  await wallet.registerContractClass(CounterContractArtifact);
  await wallet.registerContract(instance, CounterContractArtifact);
  counter = CounterContract.at(address, wallet);
  fpc = new SponsoredFpcClient({
    wallet,
    node,
    address: paymasterAddress,
    gasProfile,
    nodeUrl,
  });
  await fpc.register();
  return {
    address: account.address.toString(),
    accountClassId: account.getInstance().currentContractClassId.toString(),
    secretKey: secretKey.toString(),
    signingKey: signingKey.toString(),
    salt: salt.toString(),
  };
}

async function claimToPaymaster(value: Record<string, string>) {
  if (!account || !wallet || !officialPaymentMethod)
    throw new Error("Create the test account first");
  return claimFeeJuice(
    {
      node,
      wallet,
      claimer: account.address,
      sendOptions: {
        fee: {
          paymentMethod: officialPaymentMethod,
        },
      },
    },
    parseFpcClaim(value),
  );
}

const server = createServer(async (request, response) => {
  response.setHeader("access-control-allow-origin", "null");
  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(await readFile(resolve(root, "index.html")));
    return;
  }
  if (request.method === "GET" && request.url?.startsWith("/api/balance?")) {
    try {
      const address = new URL(request.url, "http://127.0.0.1").searchParams.get(
        "address",
      );
      if (!address) throw new Error("address is required");
      const balance = await getFeeJuiceBalance(
        AztecAddress.fromStringUnsafe(address),
        node,
      );
      response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      response.end(balance.toString());
    } catch (error) {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : String(error));
    }
    return;
  }
  try {
    if (request.method === "POST" && request.url === "/api/account") {
      const body = await readJson(request);
      const result = await createTestAccount(body.counter, body.paymaster);
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(result));
      return;
    }
    if (request.method === "POST" && request.url === "/api/increment") {
      if (!account || !counter || !fpc)
        throw new Error("Create the test account first");
      const txHash = await fpc.sendMethod({
        contract: counter,
        method: "increment",
        args: [],
        player: account.address,
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, txHash: txHash.toString() }));
      return;
    }
    if (request.method === "POST" && request.url === "/api/claim") {
      const result = await claimToPaymaster(await readJson(request));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          ok: true,
          txHash: String((result as { txHash?: unknown })?.txHash ?? result),
        }),
      );
      return;
    }
    response.writeHead(404).end();
  } catch (error) {
    response.writeHead(400, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
});

server.listen(
  Number(process.env.PAYMASTER_APP_PORT ?? 8788),
  "127.0.0.1",
  () => {
    console.log(
      "Counter test console: http://127.0.0.1:" +
        (process.env.PAYMASTER_APP_PORT ?? 8788),
    );
  },
);
