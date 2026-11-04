import { AztecAddress } from "@aztec-labs/aztec.js/addresses";
import { Fr } from "@aztec-labs/aztec.js/fields";
export const MAX_ALLOWED_TARGETS = 12;
export const MAX_ALLOWED_ACCOUNT_CLASSES = 4;
export function resolveConfigValue(value, env = process.env) {
    if (!value.startsWith("env:"))
        return value;
    const key = value.slice(4);
    const resolved = env[key]?.trim();
    if (!resolved)
        throw new Error(`Missing required environment variable ${key}`);
    return resolved;
}
export function constructorArgs(config, env = process.env) {
    if (config.allowedTargets.length === 0)
        throw new Error("At least one allowed target is required");
    if (config.allowedTargets.length > MAX_ALLOWED_TARGETS)
        throw new Error(`At most ${MAX_ALLOWED_TARGETS} targets are supported`);
    if (config.allowedAccountClasses.length === 0)
        throw new Error("At least one allowed account class is required");
    if (config.allowedAccountClasses.length > MAX_ALLOWED_ACCOUNT_CLASSES)
        throw new Error(`At most ${MAX_ALLOWED_ACCOUNT_CLASSES} account classes are supported`);
    const targets = config.allowedTargets.map(({ address }) => AztecAddress.fromStringUnsafe(resolveConfigValue(address, env)));
    const classes = config.allowedAccountClasses.map(({ classId }) => Fr.fromString(resolveConfigValue(classId, env)));
    while (targets.length < MAX_ALLOWED_TARGETS)
        targets.push(AztecAddress.ZERO);
    while (classes.length < MAX_ALLOWED_ACCOUNT_CLASSES)
        classes.push(Fr.ZERO);
    return [
        BigInt(config.maxFeeWei),
        targets,
        classes,
        config.requireUnpublishedAccounts,
    ];
}
//# sourceMappingURL=config.js.map