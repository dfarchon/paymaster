import { AztecAddress } from "@aztec-labs/aztec.js/addresses";
import type { ContractMethod } from "@aztec-labs/aztec.js/contracts";
import { Fr } from "@aztec-labs/aztec.js/fields";
import type { AztecNode } from "@aztec-labs/aztec.js/node";
import { getFeeJuiceBalance } from "@aztec-labs/aztec.js/utils";
import type { Wallet } from "@aztec-labs/aztec.js/wallet";
import { DefaultEntrypoint } from "@aztec-labs/entrypoints/default";
import { EncodedAppEntrypointCalls } from "@aztec-labs/entrypoints/encoding";
import { Gas, GasFees, GasSettings } from "@aztec-labs/stdlib/gas";
import { ExecutionPayload, type TxHash } from "@aztec-labs/stdlib/tx";

import {
  SponsoredFpcContract,
  SponsoredFpcContractArtifact,
} from "./artifacts/SponsoredFpc.js";
import {
  maxFeePerGasWithHeadroom,
  sponsoredFeeFloorWei,
  type GasProfile,
} from "./gas.js";
import { SendOnceContext } from "./send-once.js";

const ACCOUNT_MAX_CALLS = 5;

export type SponsoredFpcClientOptions = {
  wallet: Wallet;
  node: AztecNode;
  address: AztecAddress | string;
  gasProfile: GasProfile;
  nodeUrl: string;
};

export type ContractMethodMap = {
  methods: Record<string, unknown>;
};

export class SponsoredFpcClient {
  readonly address: AztecAddress;
  readonly sendContext: SendOnceContext;
  private contract?: ReturnType<typeof SponsoredFpcContract.at>;

  constructor(private readonly options: SponsoredFpcClientOptions) {
    this.address =
      typeof options.address === "string"
        ? AztecAddress.fromStringUnsafe(options.address)
        : options.address;
    this.sendContext = new SendOnceContext(options.nodeUrl);
  }

  async register(): Promise<void> {
    const wallet = this.options.wallet;
    const instance = await this.options.node.getContract(this.address);
    if (!instance)
      throw new Error(`SponsoredFpc is not deployed at ${this.address}`);
    await wallet.registerContractClass(SponsoredFpcContractArtifact);
    await wallet.registerContract(instance, SponsoredFpcContractArtifact);
    this.contract = SponsoredFpcContract.at(this.address, wallet);
  }

  async balance(): Promise<bigint> {
    return getFeeJuiceBalance(this.address, this.options.node);
  }

  /** Return the target contracts accepted by this deployed FPC instance. */
  async allowedTargets(): Promise<AztecAddress[]> {
    if (!this.contract) await this.register();
    const result =
      await this.contract!.methods.get_allowed_targets().simulate();
    const values = ((result as { result?: AztecAddress[] }).result ??
      result) as AztecAddress[];
    return values.filter((value) => !value.isZero());
  }

  /**
   * Check whether a contract method can be sent through this FPC.
   *
   * The on-chain policy is target-contract based, not selector based: every
   * method on an allowlisted target is accepted as long as it preserves the
   * sender. When a contract wrapper is supplied, this also checks that the
   * requested method exists in that wrapper.
   */
  async isMethodSupported(
    target: AztecAddress | string,
    method: string,
    contract?: ContractMethodMap,
  ): Promise<boolean> {
    const address =
      typeof target === "string"
        ? AztecAddress.fromStringUnsafe(target)
        : target;
    const allowed = (await this.allowedTargets()).some((value) =>
      value.equals(address),
    );
    if (!allowed) return false;
    return (
      contract === undefined || typeof contract.methods[method] === "function"
    );
  }

  async sendMethod(args: {
    contract: { methods: Record<string, ContractMethod> };
    method: string;
    args: unknown[];
    player: AztecAddress;
  }): Promise<TxHash> {
    const requested = await args.contract.methods[args.method](
      ...(args.args as never[]),
    ).request();
    const calls = ((requested as { calls?: unknown[] }).calls ??
      requested) as unknown[];
    return this.sendCalls(calls, args.player);
  }

  async sendCalls(calls: unknown[], player: AztecAddress): Promise<TxHash> {
    if (!this.contract) await this.register();
    if (calls.length === 0 || calls.length > ACCOUNT_MAX_CALLS) {
      throw new Error(
        `A sponsored transaction needs 1-${ACCOUNT_MAX_CALLS} calls; got ${calls.length}`,
      );
    }
    const encoded = await EncodedAppEntrypointCalls.create(
      calls as never,
      Fr.random(),
    );
    const authWitness = await this.options.wallet.createAuthWit(player, {
      consumer: player,
      innerHash: await encoded.hash(),
    });
    const outer = await this.contract!.methods.sponsor_and_execute(
      encoded as never,
      player,
    ).request();
    const payload = new ExecutionPayload(
      outer.calls,
      [authWitness, ...outer.authWitnesses],
      [...outer.capsules],
      [...encoded.hashedArguments, ...outer.extraHashedArgs],
      this.address,
    );
    return this.proveAndSend(payload, player);
  }

  private async proveAndSend(
    payload: ExecutionPayload,
    player: AztecAddress,
  ): Promise<TxHash> {
    const wallet = this.options.wallet as Wallet & {
      pxe: {
        proveTx(
          request: unknown,
          opts: { scopes: AztecAddress[] },
        ): Promise<{ toTx(): Promise<any> }>;
      };
      getChainInfo(): Promise<unknown>;
    };
    const fees = await this.options.node.getCurrentMinFees();
    const profile = this.options.gasProfile;
    const floor = sponsoredFeeFloorWei(
      profile,
      BigInt(fees.feePerDaGas),
      BigInt(fees.feePerL2Gas),
    );
    const raw = await this.contract!.methods.get_max_fee().simulate({
      from: player,
    });
    const maxFee = BigInt(
      (raw as { result?: bigint }).result ?? (raw as unknown as bigint),
    );
    if (maxFee < floor)
      throw new Error(
        `Sponsorship covers ${maxFee} wei, but this transaction needs ${floor}`,
      );

    const settings = GasSettings.fallback({
      gasLimits: new Gas(profile.daGasLimit, profile.l2GasLimit),
      teardownGasLimits: new Gas(
        profile.teardownDaGasLimit,
        profile.teardownL2GasLimit,
      ),
      maxFeesPerGas: new GasFees(
        maxFeePerGasWithHeadroom(profile, BigInt(fees.feePerDaGas)),
        maxFeePerGasWithHeadroom(profile, BigInt(fees.feePerL2Gas)),
      ),
    });
    const request = await new DefaultEntrypoint().createTxExecutionRequest(
      payload,
      settings,
      (await wallet.getChainInfo()) as never,
    );
    const proven = await wallet.pxe.proveTx(request, { scopes: [player] });
    const tx = await proven.toTx();
    await this.sendContext.attemptSend(() => this.sendContext.node.sendTx(tx));
    return tx.getTxHash();
  }
}
