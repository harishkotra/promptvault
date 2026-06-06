"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useListPrompt } from "@/hooks/useListPrompt";
import { NavBar } from "@/components/NavBar";
import { ConnectWallet } from "@/components/ConnectWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Sparkles } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";

const CATEGORIES = [
  "Creative Writing",
  "Code & Development",
  "Business & Marketing",
  "Education & Learning",
  "AI Agents & Automation",
  "Image Generation",
  "Video & Animation",
  "Music & Audio",
  "Research & Analysis",
  "Productivity",
  "Other",
];

export default function ListPage() {
  const { isConnected } = useAccount();
  const { listPrompt, isPending, isSuccess, error, listingId } =
    useListPrompt();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [priceEth, setPriceEth] = useState("");
  const [promptText, setPromptText] = useState("");
  const [metadataURI, setMetadataURI] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await listPrompt({
      title,
      category,
      metadataURI,
      promptText,
      priceEth,
    });
  };

  const handlePriceChange = (value: string) => {
    if (/^\d*\.?\d*$/.test(value)) setPriceEth(value);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">List a Prompt</h1>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to list a prompt on the marketplace.
          </p>
          <ConnectWallet />
        </main>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Prompt Listed!</h1>
          <p className="text-muted-foreground mb-2">
            Your prompt has been listed on the marketplace.
          </p>
          {listingId !== null && (
            <Badge variant="secondary" className="mb-6">
              Listing ID: {listingId.toString()}
            </Badge>
          )}
          <div className="flex gap-3 justify-center">
            <a href="/marketplace">
              <Button variant="outline">View Marketplace</Button>
            </a>
            <a href={`/listing/${listingId}`}>
              <Button>View Listing</Button>
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">List a Prompt</h1>
          <p className="text-muted-foreground mt-2">
            Your prompt will be encrypted with AES-256-GCM and stored on IPFS.
            The encryption key is split and stored on-chain via FHE.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
              <CardDescription>
                Basic information about your prompt listing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Expert React Developer Assistant"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={category}
                  onValueChange={(val) => val && setCategory(val)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Price (ETH)
                </label>
                <Input
                  value={priceEth}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  required
                  placeholder="0.01"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Metadata URI{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <Input
                  value={metadataURI}
                  onChange={(e) => setMetadataURI(e.target.value)}
                  placeholder="https://..."
                  className="h-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prompt Content</CardTitle>
              <CardDescription>
                Write your prompt using Markdown. Buyers will see it rendered
                after purchase.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div data-color-mode="light">
                <MDEditor
                  value={promptText}
                  onChange={(val) => setPromptText(val || "")}
                  preview="live"
                  height={420}
                  visibleDragbar={false}
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full gap-2 h-12 text-base"
          >
            {isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Encrypting & Listing...
              </>
            ) : (
              "List Prompt"
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}
