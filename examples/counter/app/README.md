# Counter local test console

Start the reference console from the repository root:

```sh
pnpm counter-ui
```

It binds to `127.0.0.1:8788`, reads Paymaster Fee Juice balance through the
Aztec node, and lets you create an ephemeral initializerless test account. The
account is registered in the local PXE and has no separate deployment
transaction. The
`Counter.increment()` call is sent exclusively through `SponsoredFpcClient`
and the project Paymaster, so this console actually tests the project FPC.
The same page also contains the optional L1-to-L2 claim form. Once a bridge
message has been created, claiming it only needs the Aztec node and the local
claimer account; an L1 client is not needed for the claim step.

The testnet-safe DA gas default is `100000`. For a local node or another
network, override the limits with `PAYMASTER_DA_GAS_LIMIT`,
`PAYMASTER_L2_GAS_LIMIT`, `PAYMASTER_TEARDOWN_DA_GAS_LIMIT`, and
`PAYMASTER_TEARDOWN_L2_GAS_LIMIT`.
