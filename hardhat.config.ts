import "@cofhe/hardhat-plugin";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

function getAccounts(): string[] {
  const pk = process.env.PRIVATE_KEY;
  if (pk && pk.startsWith("0x") && pk.length === 66) return [pk];
  return [];
}

const config: any = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: getAccounts(),
    },
  },
};

export default config;
