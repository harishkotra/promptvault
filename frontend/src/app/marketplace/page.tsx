"use client";

import { useMarketplace } from "@/hooks/useMarketplace";
import { ListingGrid } from "@/components/ListingGrid";
import { NavBar } from "@/components/NavBar";

export default function MarketplacePage() {
  const { data: listings, isLoading, error } = useMarketplace();

  return (
    <div>
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Prompt Marketplace</h1>
        <ListingGrid
          listings={listings ?? []}
          isLoading={isLoading}
          error={error}
        />
      </main>
    </div>
  );
}
