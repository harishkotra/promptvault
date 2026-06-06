import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { getContract } from "viem";
import { promptVaultAbi, PROMPT_VAULT_ADDRESS } from "@/lib/contract";
import type { Listing } from "@/types/listing";

export function useMyPrompts() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  return useQuery<Listing[]>({
    queryKey: ["myPrompts", address],
    queryFn: async () => {
      if (!publicClient || !PROMPT_VAULT_ADDRESS || !address) return [];

      const contract = getContract({
        address: PROMPT_VAULT_ADDRESS,
        abi: promptVaultAbi,
        client: publicClient,
      });

      const count = await contract.read.listingCount();
      if (count === BigInt(0)) return [];

      const ids = await contract.read.getListings([BigInt(0), count]);
      const purchased: Listing[] = [];

      for (const id of ids) {
        const bought = await contract.read.hasPurchased([id, address]);
        if (bought) {
          const [creator, title, category, metadataURI, promptCID, priceWei, saleCount, active, createdAt] =
            await contract.read.getListing([id]);
          purchased.push({
            listingId: id,
            creator,
            title,
            category,
            metadataURI,
            promptCID,
            priceWei,
            saleCount,
            active,
            createdAt,
          } as Listing);
        }
      }

      return purchased;
    },
    enabled: !!publicClient && !!PROMPT_VAULT_ADDRESS && !!address,
    refetchInterval: 30_000,
  });
}
