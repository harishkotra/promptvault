"use client";

import Link from "next/link";
import { ConnectWallet } from "./ConnectWallet";

export function NavBar() {
  return (
    <nav className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/marketplace" className="font-bold text-lg">
          PromptVault
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/marketplace" className="text-sm text-gray-600 hover:text-gray-900">
            Marketplace
          </Link>
          <Link href="/my-prompts" className="text-sm text-gray-600 hover:text-gray-900">
            My Prompts
          </Link>
          <Link href="/list" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            + List Prompt
          </Link>
          <ConnectWallet />
        </div>
      </div>
    </nav>
  );
}
