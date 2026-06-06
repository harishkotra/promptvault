"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Sparkles, Compass, Library, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectWallet } from "./ConnectWallet";

const links = [
  { href: "/marketplace", label: "Browse", icon: Compass },
  { href: "/my-prompts", label: "My Prompts", icon: Library },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/marketplace"
            className="flex items-center gap-2 font-bold text-xl tracking-tight"
          >
            <Sparkles className="h-5 w-5 text-primary" />
            PromptVault
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link key={href} href={href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2",
                      isActive && "bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/list">
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">List Prompt</span>
            </Button>
          </Link>
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
