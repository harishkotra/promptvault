"use client";

import { useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useMarketplace } from "@/hooks/useMarketplace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConnectWallet } from "@/components/ConnectWallet";
import {
  Sparkles,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Shield,
  Zap,
  Layers,
  Wallet,
  ShoppingCart,
  Eye,
  Key,
  Lock,
  Users,
  BarChart3,
  Star,
  ChevronRight,
} from "lucide-react";

const stats = [
  { value: "1,200+", label: "Prompts Listed" },
  { value: "850+", label: "Creators" },
  { value: "6,400+", label: "Purchases" },
  { value: "124 ETH", label: "Total Volume" },
];

const steps = [
  {
    icon: Zap,
    title: "Create & Encrypt",
    description: "Write your prompt in Markdown. It's encrypted with AES-256 directly in your browser before anything is uploaded.",
    color: "from-indigo-500 to-blue-500",
  },
  {
    icon: Key,
    title: "Lock the Key On-Chain",
    description: "The AES key is split into two ciphertext halves and stored on Sepolia via Fully Homomorphic Encryption.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Wallet,
    title: "Instant Purchase",
    description: "A buyer pays in Sepolia ETH. The smart contract verifies the transaction atomically — no escrow, no delays.",
    color: "from-cyan-500 to-teal-500",
  },
  {
    icon: Eye,
    title: "Decrypt & Use",
    description: "The buyer's browser decrypts the AES key via CoFHE, downloads the prompt from IPFS, and reveals it locally.",
    color: "from-teal-500 to-green-500",
  },
];

const creatorBenefits = [
  "Set your own price — keep 97.5% of every sale",
  "Instant withdrawals, no payout delays",
  "Full ownership; encrypted data lives on IPFS",
  "Transparent on-chain sales history",
  "No platform lock-in or exclusivity",
  "Built-in audience from day one",
];

const buyerBenefits = [
  "Prompt content is encrypted until purchase",
  "Verify creator reputation on-chain",
  "Re-download purchases anytime",
  "All prompts rendered in Markdown",
  "AES-256-GCM + FHE dual protection",
  "No account needed — just a wallet",
];

const featured = [
  {
    title: "Senior React Architect",
    creator: "0x7F4e...B3c2",
    price: "0.08",
    sales: 342,
    category: "Code & Development",
    avatar: "7F",
  },
  {
    title: "Cinematic Storyboard Generator",
    creator: "0x3aB1...D9f7",
    price: "0.12",
    sales: 289,
    category: "Creative Writing",
    avatar: "3a",
  },
  {
    title: "Data Analyst GPT",
    creator: "0xC9d2...E5f1",
    price: "0.05",
    sales: 521,
    category: "Research & Analysis",
    avatar: "C9",
  },
];

function DemoCard({
  title,
  creator,
  price,
  sales,
  category,
  avatar,
  index,
}: typeof featured[0] & { index: number }) {
  return (
    <div
      className="group relative rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
      style={{
        animation: `slideUp 0.5s ease-out ${index * 0.12}s both`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="font-semibold text-sm leading-snug">{title}</h4>
        <Badge
          variant="secondary"
          className="shrink-0 text-[11px] px-2 py-0 font-normal bg-indigo-50 text-indigo-600 border-0"
        >
          {category}
        </Badge>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-600 font-medium">
            {avatar}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground">{creator}</span>
      </div>
      <div className="flex items-center justify-between border-t pt-3">
        <span className="font-bold text-indigo-600">{price} ETH</span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <ShoppingCart className="h-3 w-3" />
          {sales} sold
        </span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isConnected } = useAccount();
  const { data: listings, isLoading } = useMarketplace();
  const displayListings = isLoading
    ? featured
    : listings && listings.length > 0
      ? listings.slice(0, 4).map((l) => ({
          title: l.title,
          creator: `${l.creator.slice(0, 6)}...${l.creator.slice(-4)}`,
          price: formatEther(l.priceWei),
          sales: l.saleCount,
          category: l.category,
          avatar: l.creator.slice(2, 4).toUpperCase(),
        }))
      : featured;

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.1); }
          50% { box-shadow: 0 0 0 12px rgba(99,102,241,0); }
        }
        .animate-slide-up { animation: slideUp 0.6s ease-out both; }
        .animate-fade-in { animation: fadeIn 0.8s ease-out both; }
        .animate-pulse-glow { animation: pulse-glow 2s infinite; }
      `}</style>

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100/80 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            PromptVault
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/marketplace">
              <Button variant="ghost" size="sm" className="text-sm">Browse</Button>
            </Link>
            <Link href="/my-prompts">
              <Button variant="ghost" size="sm" className="text-sm">My Prompts</Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="text-sm">Profile</Button>
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/list" className="hidden sm:block">
              <Button size="sm" variant="outline" className="text-sm gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                List a Prompt
              </Button>
            </Link>
            <ConnectWallet />
          </div>
        </div>
      </header>

      <main className="pt-16">
        <section className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 lg:pt-28 lg:pb-32">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="animate-fade-in">
                <Badge className="mb-5 text-xs font-medium px-3 py-1 bg-indigo-50 text-indigo-600 border-0 hover:bg-indigo-50">
                  <Sparkles className="h-3 w-3 mr-1.5" />
                  Fully Homomorphic Encryption
                </Badge>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-5 text-gray-900">
                  The marketplace where{" "}
                  <span className="text-indigo-600">prompts earn</span> and
                  buyers trust.
                </h1>
                <p className="text-lg text-gray-500 leading-relaxed max-w-lg mb-8">
                  PromptVault is a decentralised AI prompt marketplace. Creators
                  monetise their best work. Buyers purchase with confidence —
                  every prompt is encrypted end-to-end and verified on-chain.
                </p>
                <div className="flex flex-wrap gap-3 mb-10">
                  <Link href="/marketplace">
                    <Button size="lg" className="rounded-xl h-11 px-6 text-sm font-medium gap-2">
                      Browse Marketplace
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/list">
                    <Button size="lg" variant="outline" className="rounded-xl h-11 px-6 text-sm font-medium">
                      Start Selling
                    </Button>
                  </Link>
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    No KYC required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    On-chain verification
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Instant withdrawals
                  </span>
                </div>
              </div>

              <div className="hidden lg:block">
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-br from-indigo-100/60 via-transparent to-purple-100/60 rounded-3xl blur-2xl" />
                  <div className="relative space-y-3 bg-white/50 backdrop-blur-sm rounded-2xl border p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Latest Listings
                      </span>
                      <Link href="/marketplace" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5">
                        View all <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                    {featured.map((item, i) => (
                      <DemoCard key={item.title} {...item} index={i} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-gray-100 py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{s.value}</p>
                  <p className="text-sm text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {displayListings.length > 0 && (
          <section className="border-b border-gray-100 py-20 lg:py-24">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <Badge className="mb-4 text-xs font-medium px-3 py-1 bg-indigo-50 text-indigo-600 border-0 hover:bg-indigo-50">
                    <TrendingUp className="h-3 w-3 mr-1.5" />
                    Trending Now
                  </Badge>
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                    Featured Prompts
                  </h2>
                </div>
                <Link href="/marketplace" className="hidden sm:flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  Explore all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {displayListings.slice(0, 4).map((item, i) => (
                  <div
                    key={item.title + i}
                    className="group relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                    style={{ animation: `slideUp 0.5s ease-out ${i * 0.1}s both` }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h4 className="font-semibold text-sm leading-snug text-gray-900">{item.title}</h4>
                      <Badge variant="secondary" className="shrink-0 text-[11px] px-2 py-0 font-normal bg-indigo-50 text-indigo-600 border-0">
                        {item.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-600 font-medium">
                          {item.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-400">{item.creator}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                      <span className="font-bold text-indigo-600">{item.price} ETH</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        {item.sales} sold
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="border-b border-gray-100 py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <Badge className="mb-4 text-xs font-medium px-3 py-1 bg-indigo-50 text-indigo-600 border-0 hover:bg-indigo-50">
                <Zap className="h-3 w-3 mr-1.5" />
                How It Works
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">
                From creation to purchase in four steps.
              </h2>
              <p className="text-gray-400 max-w-lg mx-auto">
                Every prompt flows through the same secure pipeline. No
                intermediaries. No trust required.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((s, i) => (
                <div key={s.title} className="relative">
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm h-full transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center mb-4">
                      <s.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                        Step {i + 1}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">{s.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{s.description}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 -right-3 z-10">
                      <ChevronRight className="h-5 w-5 text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-gray-100 py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <Badge className="mb-4 text-xs font-medium px-3 py-1 bg-indigo-50 text-indigo-600 border-0 hover:bg-indigo-50">
                <Star className="h-3 w-3 mr-1.5" />
                Why PromptVault
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">
                Built for creators. Built for buyers.
              </h2>
              <p className="text-gray-400 max-w-lg mx-auto">
                Every feature is designed around one principle: put control back
                in your hands.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900">For Creators</h3>
                </div>
                <ul className="space-y-3">
                  {creatorBenefits.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-gray-500">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900">For Buyers</h3>
                </div>
                <ul className="space-y-3">
                  {buyerBenefits.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-gray-500">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-gray-100 py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4 text-xs font-medium px-3 py-1 bg-indigo-50 text-indigo-600 border-0 hover:bg-indigo-50">
                  <Shield className="h-3 w-3 mr-1.5" />
                  Security
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
                  Your prompt stays encrypted until a verified wallet buys it.
                </h2>
                <p className="text-gray-400 leading-relaxed mb-6">
                  We combine AES-256-GCM with Fully Homomorphic Encryption so
                  that neither us, nor anyone else, can read your prompt content
                  before purchase. The encryption key is split into two
                  ciphertexts and stored on the Sepolia blockchain — only the
                  buyer&apos;s wallet can decrypt them.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3 text-sm text-gray-500">
                    <Lock className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span><strong className="text-gray-900">AES-256-GCM</strong> — prompt body encrypted in-browser before upload</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-500">
                    <Key className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span><strong className="text-gray-900">FHE Key Splitting</strong> — AES key halves encrypted and stored on-chain</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-500">
                    <BarChart3 className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span><strong className="text-gray-900">On-Chain Verification</strong> — every purchase is recorded and verifiable</span>
                  </li>
                </ul>
                <Link href="/marketplace">
                  <Button className="rounded-xl h-11 px-6 text-sm font-medium gap-2">
                    Browse Marketplace
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-br from-indigo-50/40 via-transparent to-purple-50/40 rounded-3xl blur-2xl" />
                  <div className="relative rounded-2xl border border-gray-100 bg-white/50 backdrop-blur-sm p-8 shadow-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl bg-indigo-50 p-4 text-center">
                        <Lock className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
                        <p className="text-xs font-medium text-gray-900">AES-256 Encryption</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Prompt body</p>
                      </div>
                      <div className="rounded-xl bg-purple-50 p-4 text-center">
                        <Key className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                        <p className="text-xs font-medium text-gray-900">FHE Key Gates</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">On-chain</p>
                      </div>
                      <div className="rounded-xl bg-cyan-50 p-4 text-center">
                        <Layers className="h-6 w-6 text-cyan-600 mx-auto mb-2" />
                        <p className="text-xs font-medium text-gray-900">IPFS Storage</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Permanent</p>
                      </div>
                      <div className="rounded-xl bg-green-50 p-4 text-center">
                        <Shield className="h-6 w-6 text-green-600 mx-auto mb-2" />
                        <p className="text-xs font-medium text-gray-900">On-Chain Audit</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Verifiable</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-24">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <Badge className="mb-4 text-xs font-medium px-3 py-1 bg-indigo-50 text-indigo-600 border-0 hover:bg-indigo-50">
              <Wallet className="h-3 w-3 mr-1.5" />
              Get Started
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">
              Ready to earn from your prompts?
            </h2>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
              Connect your wallet, list your first prompt, and start earning
              Sepolia ETH — all without leaving your browser.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/marketplace">
                <Button size="lg" className="rounded-xl h-11 px-6 text-sm font-medium gap-2">
                  Browse Marketplace
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/list">
                <Button size="lg" variant="outline" className="rounded-xl h-11 px-6 text-sm font-medium">
                  List Your Prompt
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <span>
            PromptVault —{" "}
            <a
              href={`https://sepolia.etherscan.io/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xc369bd84AE4a4468DA5635619e62F942BeaF5DA3"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Sepolia Testnet
            </a>
          </span>
          <span className="text-xs">
            Built by{" "}
            <a
              href="https://dailybuilds.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Harish Kotra
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
