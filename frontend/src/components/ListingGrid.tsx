"use client";

import type { Listing } from "@/types/listing";
import { ListingCard } from "./ListingCard";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Inbox } from "lucide-react";

interface Props {
  listings: Listing[];
  isLoading: boolean;
  error: Error | null;
}

function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
        <div className="flex items-center gap-2 pt-2">
          <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
          <div className="h-3 bg-muted rounded w-24 animate-pulse" />
        </div>
        <div className="flex justify-between pt-2 border-t">
          <div className="h-4 bg-muted rounded w-20 animate-pulse" />
          <div className="h-4 bg-muted rounded w-16 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ListingGrid({ listings, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="font-semibold text-lg mb-1">Failed to load listings</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error.message}
        </p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-1">No listings yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Be the first to list a prompt on the marketplace.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {listings.map((listing) => (
        <ListingCard key={listing.listingId.toString()} listing={listing} />
      ))}
    </div>
  );
}
