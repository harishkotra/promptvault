"use client";

import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { useListingDetails } from "@/hooks/useListingDetails";
import { NavBar } from "@/components/NavBar";
import { ConnectWallet } from "@/components/ConnectWallet";
import { PurchaseButton } from "@/components/PurchaseButton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tag,
  ShoppingCart,
  Calendar,
  User,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function ListingPage({
  params,
}: {
  params: { id: string };
}) {
  const listingId = BigInt(params.id);
  const { data: listing, isLoading, error } = useListingDetails(listingId);
  const { address } = useAccount();

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/marketplace">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2 gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Button>
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error || !listing ? (
          <div className="text-center py-16">
            <h1 className="text-xl font-bold text-destructive mb-2">
              Listing not found
            </h1>
            <p className="text-muted-foreground text-sm">
              The listing you&apos;re looking for doesn&apos;t exist.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {listing.title}
                  </h1>
                  <Badge className="shrink-0 text-sm px-3 py-1">
                    {listing.category}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>Creator: </span>
                    <span className="font-mono">
                      {listing.creator.slice(0, 8)}...
                      {listing.creator.slice(-6)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                    Listed{" "}
                      {new Date(
                        Number(listing.createdAt) * 1000
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>
                      {listing.saleCount} purchase
                      {listing.saleCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h2 className="font-semibold mb-3">Details</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground mb-1">Price</p>
                    <p className="font-semibold text-lg text-primary">
                      {formatEther(listing.priceWei)} ETH
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground mb-1">Status</p>
                    <Badge
                      variant={listing.active ? "default" : "secondary"}
                      className="mt-0.5"
                    >
                      {listing.active ? "Active" : "Delisted"}
                    </Badge>
                  </div>
                </div>
              </div>

              {listing.metadataURI && (
                <>
                  <Separator />
                  <div>
                    <h2 className="font-semibold mb-2">Metadata</h2>
                    <a
                      href={listing.metadataURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {listing.metadataURI}
                    </a>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    Purchase
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center pb-2">
                    <p className="text-3xl font-bold text-primary">
                      {formatEther(listing.priceWei)} ETH
                    </p>
                  </div>

                  <Separator />

                  {!listing.active ? (
                    <p className="text-sm text-muted-foreground text-center">
                      This listing is no longer active.
                    </p>
                  ) : address?.toLowerCase() ===
                    listing.creator.toLowerCase() ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                      <User className="h-4 w-4 shrink-0" />
                      <span>This is your own listing.</span>
                    </div>
                  ) : address ? (
                    <PurchaseButton listing={listing} />
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground text-center">
                        Connect your wallet to purchase.
                      </p>
                      <div className="flex justify-center">
                        <ConnectWallet />
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Price</span>
                      <span>{formatEther(listing.priceWei)} ETH</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Platform fee</span>
                      <span>2.5%</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between font-medium">
                      <span>Total</span>
                      <span>{formatEther(listing.priceWei)} ETH</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Creator
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {listing.creator.slice(2, 4).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium truncate">
                      {listing.creator.slice(0, 10)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {listing.saleCount} sale
                      {listing.saleCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
