# Counter testnet example

This example is intentionally small: `Counter.increment()` and
`Counter.add()` are the only application calls. The paymaster is deployed with
the Counter address in its immutable target allowlist, then the same call is
sent through `SponsoredFpcClient`.

The example is compiled with the repository's Aztec 6 toolchain:

```sh
pnpm contract:build
```

The generated bindings are written to `target/Counter.ts` and the artifact to
`target/counter-Counter.json`.

## Aztec testnet runbook

Aztec testnet is the public v6 network on Ethereum Sepolia. Set the node URL
before running the wallet commands:

```sh
export NODE_URL=https://aztec-testnet.drpc.org
export ACCOUNT_CLASS_ID=0x<initializerless-schnorr-class-id>
```

The official testnet Sponsored FPC can bootstrap the operator account and the
Counter deployment. This does not fund the project Paymaster; it only pays the
bootstrap transactions:

```sh
aztec-wallet register-contract \
  --node-url "$NODE_URL" \
  --alias sponsoredfpc \
  contracts:SponsoredFPC SponsoredFPC --salt 0

aztec-wallet create-account \
  --node-url "$NODE_URL" \
  --alias paymaster-operator \
  --type schnorr_initializerless \
  --payment method=fpc-sponsored,fpc=contracts:SponsoredFPC

aztec-wallet deploy \
  --node-url "$NODE_URL" \
  --from accounts:paymaster-operator \
  --payment method=fpc-sponsored,fpc=contracts:SponsoredFPC \
  --alias counter \
  target/counter-Counter.json --args 0
```

Use [`paymaster.config.json`](./paymaster.config.json), set
`COUNTER_ADDRESS` to the resulting Counter address and
`ACCOUNT_CLASS_ID` to the class ID of the account type used above. Deploy the
project Paymaster with the repository CLI and an application wallet context:

```sh
COUNTER_ADDRESS=0x<counter-address> \
ACCOUNT_CLASS_ID=0x<initializerless-schnorr-class-id> \
pnpm exec paymaster deploy \
  --config ./examples/counter/paymaster.config.json \
  --context ./counter-deploy-context.ts
```

The returned Paymaster address is the recipient for Fee Juice. On testnet,
first try the [Nethermind Aztec Faucet](https://aztec-faucet.nethermind.io):
select `Testnet`, paste the Paymaster address, and request `Fee Juice`. After
the relay completes, verify it:

```sh
aztec-wallet --node-url "$NODE_URL" get-fee-juice-balance \
  0x<paymaster-address> --exact
```

If you have testnet `$AZTEC`, use the repository recharge script instead. It
requires a real `counter-funding-context.ts`; this file must construct the L1
wallet client and Aztec operator wallet and is intentionally not generated from
an address alone:

```sh
pnpm exec tsx src/fund-cli.ts deposit \
  --context ./counter-funding-context.ts \
  --recipient 0x<paymaster-address> \
  --amount 100 \
  --output ./counter-claim.json

pnpm exec tsx src/fund-cli.ts claim \
  --context ./counter-funding-context.ts \
  --claim-file ./counter-claim.json
```

The claim transaction is paid by the operator account and credits the Paymaster
address. A Sepolia ETH balance alone is insufficient for this bridge path: the
L1 wallet also needs testnet `$AZTEC`.
Finally, call `Counter.increment()` through `SponsoredFpcClient`; the target
address is allowlisted and the account class is accepted by the Paymaster.

For an automated run, the only values that must remain outside this repository
are the L1 RPC URL, the L1 private-key file, and the operator wallet context.
Never commit or paste those secrets. The L1 wallet needs Sepolia ETH for portal
gas and testnet AZTEC tokens for a direct Fee Juice deposit; ETH alone is not
the Fee Juice asset.

For a real testnet run, use the deployment/funding context supplied by your
application. The operator needs an Aztec account capable of paying deployment
and claim transactions. Keep all wallet secrets outside the repository.
