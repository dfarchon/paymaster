export function maxFeePerGasWithHeadroom(profile, feePerGas) {
    const scaled = BigInt(Math.ceil(profile.feeHeadroomMultiplier * 1000));
    return (feePerGas * scaled + 999n) / 1000n;
}
export function sponsoredFeeFloorWei(profile, feePerDaGas, feePerL2Gas) {
    return (BigInt(profile.daGasLimit) *
        maxFeePerGasWithHeadroom(profile, feePerDaGas) +
        BigInt(profile.l2GasLimit) * maxFeePerGasWithHeadroom(profile, feePerL2Gas));
}
//# sourceMappingURL=gas.js.map