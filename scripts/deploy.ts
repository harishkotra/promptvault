import { ethers } from "hardhat";

async function main() {
  const Factory = await ethers.getContractFactory("PromptVault");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("PromptVault deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
