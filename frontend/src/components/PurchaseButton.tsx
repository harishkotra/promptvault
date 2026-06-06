"use client";

import { useEffect } from "react";
import { usePurchasePrompt } from "@/hooks/usePurchasePrompt";
import type { Listing } from "@/types/listing";

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
    <div className="space-y-3">
      <button
        onClick={handlePurchase}
        disabled={isPending || isSuccess}
        className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
          isSuccess
            ? "bg-green-600"
            : isPending
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            Purchasing & Decrypting...
          </span>
        ) : isSuccess ? (
          "Purchased!"
        ) : (
          "Purchase"
        )}
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      {plaintext && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
          <h4 className="font-semibold mb-2">Decrypted Prompt</h4>
          <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
            {plaintext}
          </pre>
        </div>
      )}
    </div>
  );
}
