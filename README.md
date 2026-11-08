# Paymaster

`@dfarchon/paymaster` is an Aztec 6 project-sponsored fee
paymaster. It pays transaction fees from the Fee Juice balance held by its own
FPC address and restricts sponsored calls to an immutable list of target
contracts and account classes.

It deliberately has no per-user, per-day, seat, or transaction-count quota. The
FPC's Fee Juice balance is the sponsorship budget.

## Origin and thanks

This project started from [Alejo Amiras's quota-paymaster](https://github.com/alejoamiras/ecosystem-tooling/tree/main/packages/quota-paymaster).
Thank you to Alejo for the original paymaster design and implementation. This
repository keeps that foundation while adapting it for Aztec 6 and project
deployment, removing quota/seat logic, adding target and account-class
allowlisting, and providing a reusable browser/server SDK, funding helpers, and
deployment CLI.

## Packages

- `@dfarchon/paymaster`: contract artifact, SDK, funding helpers,
  and deployment utilities.
- `paymaster`: deployment CLI.
- `paymaster-fund`: L1 deposit and L2 claim CLI.
- `contracts/sponsored_fpc`: Noir FPC contract.

Aztec CLI `6.0.0` and Node `24.22.1` are required.

## Build and test

```sh
pnpm install
pnpm build
pnpm test
```

## Complete integration example

The following example assumes an application contract called `ExampleApp` and
an initializerless Schnorr account class.

### 1. Install the SDK

```sh
pnpm add github:dfarchon/paymaster#<commit>
```

Pin a commit in production so the deployed artifact and SDK cannot drift.

### 2. Configure the FPC

Copy `config/example.json` to `config/example-app.json` and replace the
environment references:

```json
{
  "name": "example-app",
  "maxFeeWei": "25000000000000000000",
  "allowedTargets": [
    { "name": "ExampleApp", "address": "env:EXAMPLE_APP_ADDRESS" }
  ],
  "allowedAccountClasses": [
    {
      "name": "SchnorrInitializerlessAccount",
      "classId": "0x<account-class-id>"
    }
  ],
  "requireUnpublishedAccounts": true
}
```

The target allowlist is contract-address based. Every method on an allowed
target is eligible, provided the call does not hide the user's sender. The SDK
also exposes `isMethodSupported()` to check an address and, when a contract
wrapper is supplied, the method name before sending.

### 3. Deploy the FPC

Create a context module that returns the deployer wallet and fee settings:

```ts
export default async function createContext() {
  return { wallet, deployer, sendOptions };
}
```

Deploy with:

```sh
pnpm exec paymaster deploy \
  --config ./config/example-app.json \
  --context ./deploy-context.ts
```

The CLI prints `SPONSORED_FPC_CONTRACT_ADDRESS`. Save that Aztec address; it is
the recipient to fund and the address the frontend must configure.

### 4. Deposit Fee Juice from Ethereum L1

The FPC does not bridge or claim funds by itself. The project operator supplies
a funding context containing an L1 wallet client and an Aztec operator wallet:

```sh
pnpm exec paymaster-fund deposit \
  --context ./funding-context.ts \
  --recipient <SPONSORED_FPC_AZTEC_ADDRESS> \
  --amount 100 \
  --output ./fpc-claim.json
```

`--amount` is in the L1 fee token's human-readable 18-decimal units. The
command uses `L1FeeJuicePortalManager.bridgeTokensPublic`, which performs the
L1 approval and deposit. The L1 wallet needs both `$AZTEC` and ETH for L1 gas.
Keep `fpc-claim.json` private until the claim succeeds; it contains the claim
secret.

### 5. Claim on Aztec L2

After the L1→L2 message is included, use the operator wallet in the same
funding context:

```sh
pnpm exec paymaster-fund claim \
  --context ./funding-context.ts \
  --claim-file ./fpc-claim.json
```

The operator account pays the claim transaction fee. The resulting Fee Juice is
credited to the FPC recipient, not the operator account. A claim can be
submitted by any party holding the secret, but each deposit can only be claimed
once.

### 6. Configure and use it in the frontend

```sh
VITE_SPONSOR_MODE=true
VITE_SPONSORED_FPC_ADDRESS=0x<deployed-fpc-address>
```

```ts
const fpc = new SponsoredFpcClient({
  node,
  wallet,
  address: import.meta.env.VITE_SPONSORED_FPC_ADDRESS,
  gasProfile,
  nodeUrl: import.meta.env.VITE_AZTEC_NODE_URL,
});

await fpc.register();
const supported = await fpc.isMethodSupported(
  exampleApp.address,
  "increment",
  exampleApp,
);
if (!supported) throw new Error("ExampleApp.increment is not sponsored");
await fpc.sendMethod({
  contract: exampleApp,
  method: "increment",
  args: [1n],
  player: accountAddress,
});
```

The SDK builds the account payload, authorization witness, fee settings, proof,
and broadcast. The frontend never needs to call `sponsor_and_execute` directly.

## Funding library

```ts
import { claimFeeJuice, depositFeeJuice } from "@dfarchon/paymaster";
```

`depositFeeJuice` returns the claim secret, amount, message hash, and leaf
index. `claimFeeJuice` submits `FeeJuice.claim` from the operator wallet and
credits the fixed FPC address.

## Method support query

```ts
const supported = await fpc.isMethodSupported(
  targetAddress,
  "methodName",
  contractWrapper,
);
```

The current on-chain policy is target-level, not function-selector-level. The
query returns false for a non-allowlisted target, and otherwise also checks the
method exists in the supplied wrapper. It does not imply a selector-level rule.
