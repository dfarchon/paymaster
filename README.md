# Sponsored FPC

An Aztec 5.2 project-sponsored fee-paying contract with no per-user, per-day,
seat, or transaction-count quota. The contract's FeeJuice balance is the total
sponsorship budget.

The contract only sponsors calls to configured target contracts, only accepts
configured account classes, and enforces an immutable per-transaction fee cap.

## Packages

- `@dfarchon/sponsored-fpc`: artifact, browser/server SDK, deployment helper.
- `@dfarchon/sponsored-fpc-cli`: deployment CLI using a caller-owned wallet context.
- `contracts/sponsored_fpc`: Noir contract.

## Build and test

```sh
pnpm install
pnpm build
pnpm test
```

Aztec CLI `6.0.0` is required.

## Deploy

Copy `config/example.json` and provide a context module whose default export is
an async function returning `{ wallet, deployer, sendOptions? }`. The consuming
project remains responsible for keys and fee-payment setup.

```sh
pnpm exec sponsored-fpc deploy \
  --config ./config/my-project.json \
  --context ./deploy-context.ts
```

## Frontend

Create one `SponsoredFpcClient`, call `register()` after wallet setup, then call
`sendMethod({ contract, method, args, player })`. The SDK owns payload encoding,
auth witnesses, gas settings, proving, send-once safety, and FeeJuice balance
queries.
