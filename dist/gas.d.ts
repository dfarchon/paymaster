export type GasProfile = {
    daGasLimit: number;
    l2GasLimit: number;
    teardownDaGasLimit: number;
    teardownL2GasLimit: number;
    feeHeadroomMultiplier: number;
};
export declare function maxFeePerGasWithHeadroom(profile: GasProfile, feePerGas: bigint): bigint;
export declare function sponsoredFeeFloorWei(profile: GasProfile, feePerDaGas: bigint, feePerL2Gas: bigint): bigint;
//# sourceMappingURL=gas.d.ts.map