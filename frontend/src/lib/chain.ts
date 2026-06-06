import { defineChain } from "viem";

export const sepolia = /*#__PURE__*/ defineChain({
  id: 11_155_111,
  name: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://sepolia.etherscan.io",
      apiUrl: "https://api-sepolia.etherscan.io/api",
    },
  },
  contracts: {},
});
