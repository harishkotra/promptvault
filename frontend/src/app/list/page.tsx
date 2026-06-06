"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useListPrompt } from "@/hooks/useListPrompt";
import { ConnectWallet } from "@/components/ConnectWallet";
import { NavBar } from "@/components/NavBar";

export default function ListPage() {
  const { isConnected } = useAccount();
  const { listPrompt, isPending, isSuccess, error, listingId } = useListPrompt();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [priceEth, setPriceEth] = useState("");
  const [promptText, setPromptText] = useState("");
  const [metadataURI, setMetadataURI] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await listPrompt({ title, category, metadataURI, promptText, priceEth });
  };

  return (
    <div>
      <NavBar />
      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">List a Prompt</h1>

        {!isConnected ? (
          <div className="text-center py-8">
            <p className="mb-4 text-gray-600">
              Connect your wallet to list a prompt.
            </p>
            <ConnectWallet />
          </div>
        ) : isSuccess ? (
          <div className="text-center py-8">
            <h2 className="text-xl font-bold text-green-600 mb-4">
              Prompt Listed!
            </h2>
            <p className="text-gray-600 mb-4">
              Your prompt has been listed on the marketplace.
            </p>
            {listingId !== null && (
              <p className="text-sm text-gray-500 mb-4">
                Listing ID: {listingId.toString()}
              </p>
            )}
            <a
              href="/marketplace"
              className="text-blue-600 hover:underline"
            >
              View on Marketplace
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Price (ETH)
              </label>
              <input
                type="text"
                value={priceEth}
                onChange={(e) => setPriceEth(e.target.value)}
                required
                placeholder="0.01"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Metadata URI (optional)
              </label>
              <input
                type="text"
                value={metadataURI}
                onChange={(e) => setMetadataURI(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Prompt Content
              </label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                required
                rows={8}
                className="w-full border rounded px-3 py-2 font-mono text-sm"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-2 px-4 rounded font-medium text-white ${
                isPending
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Encrypting & Listing...
                </span>
              ) : (
                "List Prompt"
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
