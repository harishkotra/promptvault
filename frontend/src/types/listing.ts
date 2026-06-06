export interface Listing {
  listingId: bigint;
  creator: `0x${string}`;
  title: string;
  category: string;
  metadataURI: string;
  promptCID: string;
  priceWei: bigint;
  saleCount: number;
  active: boolean;
  createdAt: bigint;
}

export interface PurchasedListing extends Listing {
  keyPart0: `0x${string}`;
  keyPart1: `0x${string}`;
  plaintext?: string;
}
