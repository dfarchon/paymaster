export type GasProfile = {
  daGasLimit: number;
  l2GasLimit: number;
  teardownDaGasLimit: number;
  teardownL2GasLimit: number;
  feeHeadroomMultiplier: number;
};

export function maxFeePerGasWithHeadroom(
  profile: GasProfile,
  feePerGas: bigint,
): bigint {
  const scaled = BigInt(Math.ceil(profile.feeHeadroomMultiplier * 1000));
  return (feePerGas * scaled + 999n) / 1000n;
}

export function sponsoredFeeFloorWei(
  profile: GasProfile,
  feePerDaGas: bigint,
  feePerL2Gas: bigint,
): bigint {
  return (
    BigInt(profile.daGasLimit) *
      maxFeePerGasWithHeadroom(profile, feePerDaGas) +
    BigInt(profile.l2GasLimit) * maxFeePerGasWithHeadroom(profile, feePerL2Gas)
  );
}
