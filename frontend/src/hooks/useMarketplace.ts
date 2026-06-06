import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { getContract } from "viem";
import { promptVaultAbi, PROMPT_VAULT_ADDRESS } from "@/lib/contract";
import type { Listing } from "@/types/listing";

export function useMarketplace() {
  const publicClient = usePublicClient();

  return useQuery<Listing[]>({
    queryKey: ["marketplace"],
    queryFn: async () => {
      if (!publicClient || !PROMPT_VAULT_ADDRESS) return [];

      const contract = getContract({
        address: PROMPT_VAULT_ADDRESS,
        abi: promptVaultAbi,
        client: publicClient,
      });

      const count = await contract.read.listingCount();
      if (count === BigInt(0)) return [];

      const ids = await contract.read.getListings([BigInt(0), count]);
      const results = await Promise.all(
        ids.map((id) =>
          publicClient
            .readContract({
              address: PROMPT_VAULT_ADDRESS,
              abi: promptVaultAbi,
              functionName: "getListing",
              args: [id],
            })
            .then(
              ([creator, title, category, metadataURI, promptCID, priceWei, saleCount, active, createdAt]) =>
                ({
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
                } as Listing)
            )
        )
      );

      return results;
    },
    enabled: !!publicClient && !!PROMPT_VAULT_ADDRESS,
    refetchInterval: 30_000,
  });
}
