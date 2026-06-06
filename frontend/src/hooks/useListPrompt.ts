"use client";

import { useState } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import { parseEther } from "viem";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { getCofheClient, connectCofhe } from "@/lib/cofhe";
import { generateAndSplitKey, encryptPrompt } from "@/lib/aes";
import { uploadToIpfs } from "@/lib/ipfs";
import { promptVaultAbi, PROMPT_VAULT_ADDRESS } from "@/lib/contract";

interface ListPromptInput {
  title: string;
  category: string;
  metadataURI: string;
  promptText: string;
  priceEth: string;
}

export function useListPrompt() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listingId, setListingId] = useState<bigint | null>(null);

  const listPrompt = async (input: ListPromptInput) => {
    if (!walletClient || !publicClient || !PROMPT_VAULT_ADDRESS) {
      setError("Wallet not connected");
      return;
    }

    setIsPending(true);
    setError(null);
    setIsSuccess(false);

    try {
      await connectCofhe(walletClient, publicClient);

      const { key0, key1 } = await generateAndSplitKey();
      const aesKey = await crypto.subtle.importKey(
        "raw",
        (() => {
          const raw = new Uint8Array(32);
          const k0 = key0.toString(16).padStart(32, "0");
          const k1 = key1.toString(16).padStart(32, "0");
          for (let i = 0; i < 16; i++) raw[i] = parseInt(k0.slice(i * 2, i * 2 + 2), 16);
          for (let i = 0; i < 16; i++) raw[i + 16] = parseInt(k1.slice(i * 2, i * 2 + 2), 16);
          return raw;
        })(),
        { name: "AES-GCM" },
        false,
        ["encrypt"]
      );

      const { iv, ciphertext } = await encryptPrompt(aesKey, input.promptText);
      const cid = await uploadToIpfs({ iv, ciphertext, encoding: "aes-256-gcm" });

      const cofhe = await getCofheClient();
      const encrypted = await cofhe
        .encryptInputs([Encryptable.uint128(key0), Encryptable.uint128(key1)])
        .execute();

      const [encKey0, encKey1] = encrypted as unknown as [
        { ctHash: bigint; securityZone: number; utype: number; signature: `0x${string}` },
        { ctHash: bigint; securityZone: number; utype: number; signature: `0x${string}` },
      ];

      const hash = await walletClient.writeContract({
        address: PROMPT_VAULT_ADDRESS,
        abi: promptVaultAbi,
        functionName: "listPrompt",
        args: [encKey0, encKey1, input.title, input.category, input.metadataURI, cid, parseEther(input.priceEth)],
        chain: walletClient.chain,
        account: walletClient.account!,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const log = receipt.logs.find(
        (l) =>
          l.address.toLowerCase() === PROMPT_VAULT_ADDRESS.toLowerCase()
      );

      setListingId(log ? BigInt(log.topics[1]!) : null);
      setIsSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsPending(false);
    }
  };

  return { listPrompt, isPending, isSuccess, error, listingId };
}
