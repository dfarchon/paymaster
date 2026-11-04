import { AztecAddress } from "@aztec-labs/aztec.js/addresses";
import { Fr } from "@aztec-labs/aztec.js/fields";
export declare const MAX_ALLOWED_TARGETS = 12;
export declare const MAX_ALLOWED_ACCOUNT_CLASSES = 4;
export type NamedValue = {
    name: string;
    address: string;
};
export type NamedClass = {
    name: string;
    classId: string;
};
export type SponsoredFpcConfig = {
    name?: string;
    description?: string;
    maxFeeWei: string;
    allowedTargets: NamedValue[];
    allowedAccountClasses: NamedClass[];
    requireUnpublishedAccounts: boolean;
};
export declare function resolveConfigValue(value: string, env?: NodeJS.ProcessEnv): string;
export declare function constructorArgs(config: SponsoredFpcConfig, env?: NodeJS.ProcessEnv): readonly [bigint, AztecAddress[], Fr[], boolean];
//# sourceMappingURL=config.d.ts.map