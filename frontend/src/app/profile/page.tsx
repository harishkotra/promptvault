"use client";

import { useAccount, useBalance } from "wagmi";
import { sepolia } from "@/lib/chain";
import { NavBar } from "@/components/NavBar";
import { ConnectWallet } from "@/components/ConnectWallet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Coins,
  ShoppingCart,
  Tag,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address,
    chainId: sepolia.id,
  });

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Your Profile</h1>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to view your profile, earnings, and listings.
          </p>
          <ConnectWallet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6 text-center">
                <Avatar className="h-16 w-16 mx-auto mb-3">
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {address?.slice(2, 4).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium text-sm truncate">
                  {address?.slice(0, 10)}...{address?.slice(-6)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 break-all">
                  {address}
                </p>
                <Separator className="my-4" />
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-medium flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                      {balance
                        ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Network</span>
                    <Badge variant="secondary" className="text-xs">
                      Sepolia
                    </Badge>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <Link href="/my-prompts">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      My Purchases
                    </Button>
                  </Link>
                  <Link href="/list">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Tag className="h-4 w-4" />
                      List a Prompt
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">0.0000 ETH</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pending: 0.0000 ETH
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Listings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active: 0
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Purchases
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lifetime total
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Listings</CardTitle>
                <CardDescription>
                  Prompts you have listed on the marketplace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <p>No listings yet.</p>
                  <p className="mt-1">
                    <Link
                      href="/list"
                      className="text-primary hover:underline font-medium"
                    >
                      List your first prompt
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>
                  Your latest on-chain transactions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <p>No activity yet.</p>
                  <p className="mt-1">
                    <Link
                      href="/marketplace"
                      className="text-primary hover:underline font-medium"
                    >
                      Browse the marketplace
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                View on Etherscan:{" "}
                <a
                  href={`https://sepolia.etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {address?.slice(0, 10)}...{address?.slice(-6)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
