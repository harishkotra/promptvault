"use client";

import Link from "next/link";
import { formatEther } from "viem";
import type { Listing } from "@/types/listing";

interface Props {
  listing: Listing;
}

export function ListingCard({ listing }: Props) {
  return (
    <Link
      href={`/listing/${listing.listingId}`}
      className="block p-4 border rounded-lg hover:shadow-md transition-shadow"
    >
      <h3 className="font-semibold text-lg truncate">{listing.title}</h3>
      <p className="text-sm text-gray-500 mt-1">{listing.category}</p>
      <p className="text-sm text-gray-500">
        by {listing.creator.slice(0, 6)}...{listing.creator.slice(-4)}
      </p>
      <p className="text-blue-600 font-medium mt-2">
        {formatEther(listing.priceWei)} ETH
      </p>
      <p className="text-xs text-gray-400 mt-1">{listing.saleCount} sold</p>
    </Link>
  );
}
