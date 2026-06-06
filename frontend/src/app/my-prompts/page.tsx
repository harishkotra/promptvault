"use client";

import { useAccount } from "wagmi";
import { useMyPrompts } from "@/hooks/useMyPrompts";
import { ConnectWallet } from "@/components/ConnectWallet";
import { ListingGrid } from "@/components/ListingGrid";
import { NavBar } from "@/components/NavBar";

export default function MyPromptsPage() {
  const { isConnected } = useAccount();
  const { data: prompts, isLoading, error } = useMyPrompts();

  return (
    <div>
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">My Prompts</h1>

        {!isConnected ? (
          <div className="text-center py-8">
            <p className="mb-4 text-gray-600">
              Connect your wallet to see your purchased prompts.
            </p>
            <ConnectWallet />
          </div>
        ) : (
          <ListingGrid
            listings={prompts ?? []}
            isLoading={isLoading}
            error={error}
          />
        )}
      </main>
    </div>
  );
}
