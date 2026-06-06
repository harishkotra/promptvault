"use client";

import type { Listing } from "@/types/listing";
import { ListingCard } from "./ListingCard";

interface Props {
  listings: Listing[];
  isLoading: boolean;
  error: Error | null;
}

export function ListingGrid({ listings, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-8">
        Failed to load listings: {error.message}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No listings found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {listings.map((listing) => (
        <ListingCard key={listing.listingId.toString()} listing={listing} />
      ))}
    </div>
  );
}
