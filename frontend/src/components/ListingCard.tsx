"use client";

import Link from "next/link";
import { formatEther } from "viem";
import type { Listing } from "@/types/listing";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tag, ShoppingCart } from "lucide-react";

interface Props {
  listing: Listing;
}

const categoryColors: Record<string, string> = {
  "Creative Writing": "bg-pink-100 text-pink-700 hover:bg-pink-100",
  "Code & Development": "bg-blue-100 text-blue-700 hover:bg-blue-100",
  "Business & Marketing": "bg-amber-100 text-amber-700 hover:bg-amber-100",
  "Education & Learning": "bg-green-100 text-green-700 hover:bg-green-100",
  "AI Agents & Automation": "bg-purple-100 text-purple-700 hover:bg-purple-100",
  "Image Generation": "bg-rose-100 text-rose-700 hover:bg-rose-100",
  Video: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
  "Music & Audio": "bg-teal-100 text-teal-700 hover:bg-teal-100",
  "Research & Analysis": "bg-cyan-100 text-cyan-700 hover:bg-cyan-100",
  Productivity: "bg-orange-100 text-orange-700 hover:bg-orange-100",
};

export function ListingCard({ listing }: Props) {
  return (
    <Link href={`/listing/${listing.listingId}`}>
      <Card className="group h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                {listing.title}
              </h3>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "shrink-0 text-xs font-normal",
                categoryColors[listing.category] || "bg-gray-100 text-gray-700"
              )}
            >
              {listing.category}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px] bg-muted">
                {listing.creator.slice(2, 4).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">
              {listing.creator.slice(0, 6)}...{listing.creator.slice(-4)}
            </span>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-primary">
              {formatEther(listing.priceWei)} ETH
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShoppingCart className="h-3.5 w-3.5" />
            {listing.saleCount} sold
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
