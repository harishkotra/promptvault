"use client";

import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { useListingDetails } from "@/hooks/useListingDetails";
import { NavBar } from "@/components/NavBar";
import { ConnectWallet } from "@/components/ConnectWallet";
import { PurchaseButton } from "@/components/PurchaseButton";

export default function ListingPage({
  params,
}: {
  params: { id: string };
}) {
  const listingId = BigInt(params.id);
  const { data: listing, isLoading, error } = useListingDetails(listingId);
  const { address } = useAccount();

  return (
    <div>
      <NavBar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        ) : error || !listing ? (
          <div className="text-center py-8">
            <h1 className="text-xl font-bold text-red-600">
              Listing not found
            </h1>
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">{listing.title}</h1>
            <p className="text-gray-500">{listing.category}</p>
            <p className="text-sm text-gray-500">
              Created by {listing.creator.slice(0, 6)}...
              {listing.creator.slice(-4)}
            </p>
            <p className="text-2xl text-blue-600 font-semibold">
              {formatEther(listing.priceWei)} ETH
            </p>
            <p className="text-sm text-gray-500">
              {listing.saleCount} purchase
              {listing.saleCount !== 1 ? "s" : ""}
            </p>

            {!listing.active && (
              <p className="text-red-500 text-sm font-medium">
                This listing is no longer active.
              </p>
            )}

            {listing.active &&
              address &&
              address.toLowerCase() !== listing.creator.toLowerCase() && (
                <PurchaseButton listing={listing} />
              )}

            {address?.toLowerCase() === listing.creator.toLowerCase() && (
              <p className="text-gray-500 text-sm italic">
                This is your own listing.
              </p>
            )}

            {!address && (
              <div className="py-4">
                <p className="mb-4 text-gray-600">
                  Connect your wallet to purchase this prompt.
                </p>
                <ConnectWallet />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
