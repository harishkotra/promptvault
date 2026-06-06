import type {
  WalletClient,
  PublicClient,
  Transport,
  Chain,
  Account,
} from "viem";
import type { CofheClient } from "@cofhe/sdk";

let cofheClient: CofheClient | null = null;

async function initClient() {
  if (typeof window === "undefined") return;
  const [{ createCofheClient, createCofheConfig }, { sepolia }] =
    await Promise.all([
      import("@cofhe/sdk/web"),
      import("@cofhe/sdk/chains"),
    ]);
  const config = createCofheConfig({ supportedChains: [sepolia] });
  cofheClient = createCofheClient(config);
}

export async function getCofheClient(): Promise<CofheClient> {
  if (!cofheClient) {
    await initClient();
  }
  if (!cofheClient) {
    throw new Error("CoFHE client not available (browser only)");
  }
  return cofheClient;
}

export async function connectCofhe(
  walletClient: WalletClient<Transport, Chain, Account>,
  publicClient: PublicClient<Transport, Chain>
) {
  const client = await getCofheClient();
  await client.connect(publicClient, walletClient);
  await client.permits.getOrCreateSelfPermit();
}

export function disconnectCofhe() {
  if (cofheClient) {
    cofheClient.disconnect();
    cofheClient = null;
  }
}
