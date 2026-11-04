import {
  Contract,
  DeployMethod,
  getContractInstanceFromInstantiationParams,
} from "@aztec-labs/aztec.js/contracts";
import { Fr } from "@aztec-labs/aztec.js/fields";
import { PublicKeys } from "@aztec-labs/aztec.js/keys";
import type { AztecAddress } from "@aztec-labs/aztec.js/addresses";
import type { Wallet } from "@aztec-labs/aztec.js/wallet";
import { getDefaultInitializer } from "@aztec-labs/stdlib/abi";

import { SponsoredFpcContractArtifact } from "./artifacts/SponsoredFpc.js";
import { constructorArgs, type SponsoredFpcConfig } from "./config.js";

export type DeploySponsoredFpcOptions = {
  wallet: Wallet;
  deployer: AztecAddress;
  config: SponsoredFpcConfig;
  env?: NodeJS.ProcessEnv;
  sendOptions?: Record<string, unknown>;
  timeoutMs?: number;
};

export async function deploySponsoredFpc(options: DeploySponsoredFpcOptions) {
  const args = constructorArgs(options.config, options.env) as never;
  const initializer = getDefaultInitializer(SponsoredFpcContractArtifact);
  const salt = Fr.random();
  const instance = await getContractInstanceFromInstantiationParams(
    SponsoredFpcContractArtifact,
    {
      publicKeys: PublicKeys.default(),
      constructorArtifact: initializer,
      constructorArgs: args,
      deployer: options.deployer,
      salt,
    },
  );
  const method = DeployMethod.create(
    options.wallet,
    {
      artifact: SponsoredFpcContractArtifact,
      postDeployCtor: (deployed, wallet) =>
        Contract.at(deployed.address, SponsoredFpcContractArtifact, wallet),
      args,
      constructorNameOrArtifact: initializer?.name,
    },
    { salt, deployer: options.deployer, publicKeys: instance.publicKeys },
  );
  await method.send({
    from: options.deployer,
    ...(options.sendOptions ?? {}),
    wait: { timeout: options.timeoutMs ?? 120_000 },
  } as never);
  await options.wallet.registerContract(instance, SponsoredFpcContractArtifact);
  return { address: instance.address, salt };
}
