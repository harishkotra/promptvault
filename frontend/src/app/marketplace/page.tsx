"use client";

import { useState } from "react";
import { useMarketplace } from "@/hooks/useMarketplace";
import { ListingGrid } from "@/components/ListingGrid";
import { NavBar } from "@/components/NavBar";
import { Input } from "@/components/ui/input";
import { Search, Sparkles } from "lucide-react";

export default function MarketplacePage() {
  const { data: listings, isLoading, error } = useMarketplace();
  const [search, setSearch] = useState("");

  const filtered = (listings ?? []).filter(
    (l) =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main>
        <section className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                Prompt Marketplace
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Discover Premium Prompts
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Browse, buy, and sell high-quality AI prompts secured by
              fully homomorphic encryption.
            </p>
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts by title or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">
              {search
                ? `Results (${filtered.length})`
                : `All Listings (${filtered.length})`}
            </h2>
          </div>
          <ListingGrid
            listings={filtered}
            isLoading={isLoading}
            error={error}
          />
        </section>
      </main>
    </div>
  );
}
