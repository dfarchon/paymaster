import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { claimFeeJuice, parseFpcClaim } from "../../src/funding.js";
import { Fr } from "@aztec-labs/aztec.js/fields";
import { SponsoredFeePaymentMethod } from "@aztec-labs/aztec.js/fee/testing";
import { getContractInstanceFromInstantiationParams } from "@aztec-labs/stdlib/contract";
import { SponsoredFPCContractArtifact } from "@aztec-labs/noir-contracts.js/SponsoredFPC";
import { Fq } from "@aztec-labs/foundation/curves/bn254";
import { EmbeddedWallet } from "@aztec-labs/wallets/embedded";

const root = dirname(fileURLToPath(import.meta.url));
const contextPath = process.env.PAYMASTER_FUNDING_CONTEXT;
const createContext = contextPath
  ? ((await import(pathToFileURL(resolve(contextPath)).href))
      .default as () => Promise<Parameters<typeof claimFeeJuice>[0]>)
  : undefined;
let localWallet: Awaited<ReturnType<typeof EmbeddedWallet.create>> | undefined;
let localClaimer:
  | Awaited<
      ReturnType<
        NonNullable<typeof localWallet>["createSchnorrInitializerlessAccount"]
      >
    >
  | undefined;
let officialSponsoredPaymentMethod: SponsoredFeePaymentMethod | undefined;

async function configureOfficialSponsoredFpc(
  wallet: NonNullable<typeof localWallet>,
) {
  const instance = await getContractInstanceFromInstantiationParams(
    SponsoredFPCContractArtifact,
    { salt: new Fr(0) },
  );
  await wallet.registerContract(instance, SponsoredFPCContractArtifact);
  officialSponsoredPaymentMethod = new SponsoredFeePaymentMethod(
    instance.address,
  );
}

async function getContext() {
  if (!localWallet || !localClaimer) {
    if (!createContext) throw new Error("Create a local claimer account first");
    return createContext();
  }
  const context = createContext ? await createContext() : {};
  return {
    ...context,
    wallet: localWallet,
    claimer: localClaimer.address,
    sendOptions: {
      ...(context.sendOptions ?? {}),
      fee: {
        ...((context.sendOptions?.fee as Record<string, unknown> | undefined) ??
          {}),
        paymentMethod: officialSponsoredPaymentMethod,
      },
    },
  } as unknown as Parameters<typeof claimFeeJuice>[0];
}

const server = createServer(async (request, response) => {
  response.setHeader("access-control-allow-origin", "null");
  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(await readFile(resolve(root, "index.html")));
    return;
  }
  if (request.method === "POST" && request.url === "/api/account") {
    try {
      localWallet = await EmbeddedWallet.create(
        process.env.AZTEC_NODE_URL ?? "https://aztec-testnet.drpc.org",
        { ephemeral: true },
      );
      const secretKey = Fr.random();
      const salt = Fr.random();
      const signingKey = Fq.random();
      localClaimer = await localWallet.createSchnorrInitializerlessAccount(
        secretKey,
        salt,
        signingKey,
        "local-claimer",
      );
      await configureOfficialSponsoredFpc(localWallet);
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          address: localClaimer.address.toString(),
          secretKey: secretKey.toString(),
          signingKey: signingKey.toString(),
          salt: salt.toString(),
        }),
      );
    } catch (error) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
    return;
  }
  if (request.method !== "POST" || request.url !== "/api/claim") {
    response.writeHead(404).end();
    return;
  }
  try {
    let body = "";
    for await (const chunk of request) body += chunk;
    const claim = parseFpcClaim(JSON.parse(body));
    const result = await claimFeeJuice(await getContext(), claim);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        ok: true,
        txHash: String((result as { txHash?: unknown })?.txHash ?? result),
      }),
    );
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
  Number(process.env.PAYMASTER_CLAIM_PORT ?? 8787),
  "127.0.0.1",
  () => {
    console.log(
      "Paymaster Claim UI: http://127.0.0.1:" +
        (process.env.PAYMASTER_CLAIM_PORT ?? 8787),
    );
  },
);
