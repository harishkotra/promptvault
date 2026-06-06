import hre from "hardhat";
import { Encryptable } from "@cofhe/sdk";
import type { CofheClient } from "@cofhe/sdk";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export async function encryptedUint128(
  client: CofheClient,
  value0: bigint,
  value1: bigint
): Promise<[any, any]> {
  const result = await client
    .encryptInputs([Encryptable.uint128(value0), Encryptable.uint128(value1)])
    .execute();
  return [result[0], result[1]];
}

export async function getPlaintext(ctHash: string): Promise<bigint> {
  return hre.cofhe.mocks.getPlaintext(ctHash);
}

export async function expectPlaintext(
  ctHash: string,
  expected: bigint
): Promise<void> {
  return hre.cofhe.mocks.expectPlaintext(ctHash, expected);
}

export async function createClient(
  signer: HardhatEthersSigner
): Promise<CofheClient> {
  return hre.cofhe.createClientWithBatteries(signer);
}
