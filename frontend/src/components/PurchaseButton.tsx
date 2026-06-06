"use client";

import { useEffect } from "react";
import { usePurchasePrompt } from "@/hooks/usePurchasePrompt";
import type { Listing } from "@/types/listing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, Eye, Lock, Unlock } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Props {
  listing: Listing;
  onSuccess?: () => void;
}

export function PurchaseButton({ listing, onSuccess }: Props) {
  const { purchase, isPending, isSuccess, error, plaintext } =
    usePurchasePrompt();

  useEffect(() => {
    if (isSuccess && onSuccess) {
      onSuccess();
    }
  }, [isSuccess, onSuccess]);

  const handlePurchase = () => {
    purchase(listing.listingId, listing.priceWei, listing.promptCID);
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Purchase Prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This prompt is encrypted with AES-256-GCM. When you purchase it, the
            encryption key will be securely shared with you via FHE.
          </p>
          <Button
            onClick={handlePurchase}
            disabled={isPending || isSuccess}
            className="w-full gap-2"
            size="lg"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Purchasing & Decrypting...
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Purchased!
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4" />
                Purchase for {listing.priceWei.toString()} wei
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {plaintext && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Decrypted Prompt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{plaintext}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
