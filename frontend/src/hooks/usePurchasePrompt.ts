"use client";

import { useState } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { getCofheClient, connectCofhe } from "@/lib/cofhe";
import { reconstructKey, decryptPrompt } from "@/lib/aes";
import { downloadFromIpfs } from "@/lib/ipfs";
import { promptVaultAbi, PROMPT_VAULT_ADDRESS } from "@/lib/contract";
import type { IpfsPayload } from "@/lib/ipfs";

export function usePurchasePrompt() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plaintext, setPlaintext] = useState<string | null>(null);

  const purchase = async (listingId: bigint, priceWei: bigint, promptCID: string) => {
    if (!walletClient || !publicClient || !PROMPT_VAULT_ADDRESS) {
      setError("Wallet not connected");
      return;
    }

    setIsPending(true);
    setError(null);
    setPlaintext(null);
    setIsSuccess(false);

    try {
      await connectCofhe(walletClient, publicClient);

      const hash = await walletClient.writeContract({
        address: PROMPT_VAULT_ADDRESS,
        abi: promptVaultAbi,
        functionName: "purchasePrompt",
        args: [listingId],
        value: priceWei,
        chain: walletClient.chain,
        account: walletClient.account!,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const [keyHandle0, keyHandle1] = await publicClient.readContract({
        address: PROMPT_VAULT_ADDRESS,
        abi: promptVaultAbi,
        functionName: "getKeyHandles",
        args: [listingId],
      }) as readonly [`0x${string}`, `0x${string}`];

      const cofhe = await getCofheClient();
      const p0 = await cofhe.decryptForView(keyHandle0, FheTypes.Uint128).execute();
      const p1 = await cofhe.decryptForView(keyHandle1, FheTypes.Uint128).execute();

      const aesKey = await reconstructKey(p0 as bigint, p1 as bigint);
      const payload: IpfsPayload = await downloadFromIpfs(promptCID);
      const text = await decryptPrompt(aesKey, payload);

      setPlaintext(text);
      setIsSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsPending(false);
    }
  };

  return { purchase, isPending, isSuccess, error, plaintext };
}
