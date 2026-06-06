import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { promptVaultAbi, PROMPT_VAULT_ADDRESS } from "@/lib/contract";
import type { Listing } from "@/types/listing";

export function useListingDetails(listingId: bigint | undefined) {
  const publicClient = usePublicClient();

  return useQuery<Listing | null>({
    queryKey: ["listing", listingId?.toString()],
    queryFn: async () => {
      if (!publicClient || !PROMPT_VAULT_ADDRESS || listingId === undefined)
        return null;

      const [creator, title, category, metadataURI, promptCID, priceWei, saleCount, active, createdAt] =
        await publicClient.readContract({
          address: PROMPT_VAULT_ADDRESS,
          abi: promptVaultAbi,
          functionName: "getListing",
          args: [listingId],
        });

      return {
        listingId,
        creator,
        title,
        category,
        metadataURI,
        promptCID,
        priceWei,
        saleCount,
        active,
        createdAt,
      } as Listing;
    },
    enabled: !!publicClient && !!PROMPT_VAULT_ADDRESS && listingId !== undefined,
  });
}
