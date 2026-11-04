import { AztecAddress } from "@aztec-labs/aztec.js/addresses";
import { Fr } from "@aztec-labs/aztec.js/fields";
import { getFeeJuiceBalance } from "@aztec-labs/aztec.js/utils";
import { DefaultEntrypoint } from "@aztec-labs/entrypoints/default";
import { EncodedAppEntrypointCalls } from "@aztec-labs/entrypoints/encoding";
import { Gas, GasFees, GasSettings } from "@aztec-labs/stdlib/gas";
import { ExecutionPayload } from "@aztec-labs/stdlib/tx";
import { SponsoredFpcContract, SponsoredFpcContractArtifact, } from "./artifacts/SponsoredFpc.js";
import { maxFeePerGasWithHeadroom, sponsoredFeeFloorWei, } from "./gas.js";
import { SendOnceContext } from "./send-once.js";
const ACCOUNT_MAX_CALLS = 5;
export class SponsoredFpcClient {
    options;
    address;
    sendContext;
    contract;
    constructor(options) {
        this.options = options;
        this.address =
            typeof options.address === "string"
                ? AztecAddress.fromStringUnsafe(options.address)
                : options.address;
        this.sendContext = new SendOnceContext(options.nodeUrl);
    }
    async register() {
        const wallet = this.options.wallet;
        const instance = await this.options.node.getContract(this.address);
        if (!instance)
            throw new Error(`SponsoredFpc is not deployed at ${this.address}`);
        await wallet.registerContractClass(SponsoredFpcContractArtifact);
        await wallet.registerContract(instance, SponsoredFpcContractArtifact);
        this.contract = SponsoredFpcContract.at(this.address, wallet);
    }
    async balance() {
        return getFeeJuiceBalance(this.address, this.options.node);
    }
    async sendMethod(args) {
        const requested = await args.contract.methods[args.method](...args.args).request();
        const calls = (requested.calls ??
            requested);
        return this.sendCalls(calls, args.player);
    }
    async sendCalls(calls, player) {
        if (!this.contract)
            await this.register();
        if (calls.length === 0 || calls.length > ACCOUNT_MAX_CALLS) {
            throw new Error(`A sponsored transaction needs 1-${ACCOUNT_MAX_CALLS} calls; got ${calls.length}`);
        }
        const encoded = await EncodedAppEntrypointCalls.create(calls, Fr.random());
        const authWitness = await this.options.wallet.createAuthWit(player, {
            consumer: player,
            innerHash: await encoded.hash(),
        });
        const outer = await this.contract.methods.sponsor_and_execute(encoded, player).request();
        const payload = new ExecutionPayload(outer.calls, [authWitness, ...outer.authWitnesses], [...outer.capsules], [...encoded.hashedArguments, ...outer.extraHashedArgs], this.address);
        return this.proveAndSend(payload, player);
    }
    async proveAndSend(payload, player) {
        const wallet = this.options.wallet;
        const fees = await this.options.node.getCurrentMinFees();
        const profile = this.options.gasProfile;
        const floor = sponsoredFeeFloorWei(profile, BigInt(fees.feePerDaGas), BigInt(fees.feePerL2Gas));
        const raw = await this.contract.methods.get_max_fee().simulate({
            from: player,
        });
        const maxFee = BigInt(raw.result ?? raw);
        if (maxFee < floor)
            throw new Error(`Sponsorship covers ${maxFee} wei, but this transaction needs ${floor}`);
        const settings = GasSettings.fallback({
            gasLimits: new Gas(profile.daGasLimit, profile.l2GasLimit),
            teardownGasLimits: new Gas(profile.teardownDaGasLimit, profile.teardownL2GasLimit),
            maxFeesPerGas: new GasFees(maxFeePerGasWithHeadroom(profile, BigInt(fees.feePerDaGas)), maxFeePerGasWithHeadroom(profile, BigInt(fees.feePerL2Gas))),
        });
        const request = await new DefaultEntrypoint().createTxExecutionRequest(payload, settings, (await wallet.getChainInfo()));
        const proven = await wallet.pxe.proveTx(request, { scopes: [player] });
        const tx = await proven.toTx();
        await this.sendContext.attemptSend(() => this.sendContext.node.sendTx(tx));
        return tx.getTxHash();
    }
}
//# sourceMappingURL=client.js.map