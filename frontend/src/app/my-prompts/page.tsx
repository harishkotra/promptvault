"use client";

import { useAccount } from "wagmi";
import { useMyPrompts } from "@/hooks/useMyPrompts";
import { NavBar } from "@/components/NavBar";
import { ConnectWallet } from "@/components/ConnectWallet";
import { ListingGrid } from "@/components/ListingGrid";
import { Sparkles, Library } from "lucide-react";

export default function MyPromptsPage() {
  const { isConnected } = useAccount();
  const { data: prompts, isLoading, error } = useMyPrompts();

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main>
        <section className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Library className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                Your Collection
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              My Prompts
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Browse all the prompts you&apos;ve purchased. Each prompt is
              securely encrypted and can be decrypted on-demand.
            </p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
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
        </section>
      </main>
    </div>
  );
}
