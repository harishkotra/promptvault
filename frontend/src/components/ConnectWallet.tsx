"use client";

import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { injected } from "wagmi/connectors";
import { sepolia } from "@/lib/chain";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, LogOut, ChevronDown, Coins } from "lucide-react";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address,
    chainId: sepolia.id,
  });

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted transition-colors outline-none">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
            {address.slice(2, 4).toUpperCase()}
          </span>
          <span>
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground truncate font-normal">
            {address}
          </DropdownMenuLabel>
          <div className="px-2 pb-2">
            <div className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-sm">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : "—"}
              </span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => disconnect()}
            className="text-destructive gap-2"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={() => connect({ connector: injected() })} className="gap-2">
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </Button>
  );
}
