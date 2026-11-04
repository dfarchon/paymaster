import { AztecAddress } from '@aztec-labs/aztec.js/addresses';
import { type AztecAddressLike, type ContractArtifact, type FieldLike, type FunctionSelectorLike, type OptionLike } from '@aztec-labs/aztec.js/abi';
import { ContractBase, ContractFunctionInteraction, type ContractMethod, type ContractStorageLayout, type DeployInstantiationOptions, DeployMethod } from '@aztec-labs/aztec.js/contracts';
import type { Wallet } from '@aztec-labs/aztec.js/wallet';
export declare const SponsoredFpcContractArtifact: ContractArtifact;
/**
 * Type-safe interface for contract SponsoredFpc;
 */
export declare class SponsoredFpcContract extends ContractBase {
    private constructor();
    /**
     * Creates a contract instance.
     * @param address - The deployed contract's address.
     * @param wallet - The wallet to use when interacting with the contract.
     * @returns A new Contract instance.
     */
    static at(address: AztecAddress, wallet: Wallet): SponsoredFpcContract;
    /**
     * Creates a tx to deploy a new instance of this contract.
     * @param instantiation - Optional address-affecting parameters (salt, deployer / universalDeploy, publicKeys).
     *                       Salt defaults to a random value; the deployer is locked lazily from the first send-time `from`.
     */
    static deploy(wallet: Wallet, max_fee: (bigint | number), allowed_targets: AztecAddressLike[], allowed_account_classes: FieldLike[], require_unpublished_account: boolean, instantiation?: DeployInstantiationOptions): DeployMethod<SponsoredFpcContract>;
    /**
     * Creates a tx to deploy a new instance of this contract using the specified constructor method.
     */
    static deployWithOpts<M extends keyof SponsoredFpcContract['methods']>(opts: {
        method?: M;
        wallet: Wallet;
        instantiation?: DeployInstantiationOptions;
    }, ...args: Parameters<SponsoredFpcContract['methods'][M]>): DeployMethod<SponsoredFpcContract>;
    /**
     * Returns this contract's artifact.
     */
    static get artifact(): ContractArtifact;
    /**
     * Returns this contract's artifact with public bytecode.
     */
    static get artifactForPublic(): ContractArtifact;
    static get storage(): ContractStorageLayout<'max_fee' | 'allowed_targets' | 'allowed_account_classes' | 'require_unpublished_account'>;
    /** Type-safe wrappers for the public methods exposed by the contract. */
    methods: {
        /** constructor(max_fee: integer, allowed_targets: array, allowed_account_classes: array, require_unpublished_account: boolean) */
        constructor: ((max_fee: (bigint | number), allowed_targets: AztecAddressLike[], allowed_account_classes: FieldLike[], require_unpublished_account: boolean) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
        /** get_allowed_account_classes() */
        get_allowed_account_classes: (() => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
        /** get_allowed_targets() */
        get_allowed_targets: (() => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
        /** get_max_fee() */
        get_max_fee: (() => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
        /** offchain_receive(messages: struct) */
        offchain_receive: ((messages: {
            ciphertext: FieldLike[];
            recipient: AztecAddressLike;
            tx_hash: OptionLike<FieldLike>;
            anchor_block_timestamp: (bigint | number);
        }[]) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
        /** public_dispatch(selector: field) */
        public_dispatch: ((selector: FieldLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
        /** sponsor_and_execute(app_payload: struct, player: struct) */
        sponsor_and_execute: ((app_payload: {
            function_calls: {
                args_hash: FieldLike;
                function_selector: FunctionSelectorLike;
                target_address: AztecAddressLike;
                is_public: boolean;
                hide_msg_sender: boolean;
                is_static: boolean;
            }[];
            tx_nonce: FieldLike;
        }, player: AztecAddressLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
        /** sync_state(scope: struct) */
        sync_state: ((scope: AztecAddressLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
    };
}
//# sourceMappingURL=SponsoredFpc.d.ts.map