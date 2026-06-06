export const promptVaultAbi = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "error",
    name: "AlreadyPurchased",
    inputs: [
      { name: "listingId", internalType: "uint256", type: "uint256" },
      { name: "buyer", internalType: "address", type: "address" },
    ],
  },
  {
    type: "error",
    name: "CategoryTooLong",
    inputs: [],
  },
  {
    type: "error",
    name: "CreatorCannotBuyOwnPrompt",
    inputs: [{ name: "listingId", internalType: "uint256", type: "uint256" }],
  },
  {
    type: "error",
    name: "EmptyCategory",
    inputs: [],
  },
  {
    type: "error",
    name: "EmptyPromptCID",
    inputs: [],
  },
  {
    type: "error",
    name: "EmptyTitle",
    inputs: [],
  },
  {
    type: "error",
    name: "IncorrectPayment",
    inputs: [
      { name: "sent", internalType: "uint256", type: "uint256" },
      { name: "required", internalType: "uint256", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "ListingDoesNotExist",
    inputs: [{ name: "listingId", internalType: "uint256", type: "uint256" }],
  },
  {
    type: "error",
    name: "ListingNotActive",
    inputs: [{ name: "listingId", internalType: "uint256", type: "uint256" }],
  },
  {
    type: "error",
    name: "NoEarningsToWithdraw",
    inputs: [],
  },
  {
    type: "error",
    name: "NotAuthorised",
    inputs: [
      { name: "listingId", internalType: "uint256", type: "uint256" },
      { name: "caller", internalType: "address", type: "address" },
    ],
  },
  {
    type: "error",
    name: "NotListingCreator",
    inputs: [{ name: "listingId", internalType: "uint256", type: "uint256" }],
  },
  {
    type: "error",
    name: "TitleTooLong",
    inputs: [],
  },
  {
    type: "error",
    name: "WithdrawalFailed",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroPrice",
    inputs: [],
  },
  {
    type: "event",
    name: "EarningsWithdrawn",
    inputs: [
      { name: "recipient", internalType: "address", type: "address", indexed: true },
      { name: "amount", internalType: "uint256", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PromptDelisted",
    inputs: [
      { name: "listingId", internalType: "uint256", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "PromptListed",
    inputs: [
      { name: "listingId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "creator", internalType: "address", type: "address", indexed: true },
      { name: "title", internalType: "string", type: "string", indexed: false },
      { name: "category", internalType: "string", type: "string", indexed: false },
      { name: "priceWei", internalType: "uint256", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PromptPurchased",
    inputs: [
      { name: "listingId", internalType: "uint256", type: "uint256", indexed: true },
      { name: "buyer", internalType: "address", type: "address", indexed: true },
      { name: "pricePaid", internalType: "uint256", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "delistPrompt",
    inputs: [{ name: "listingId", internalType: "uint256", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "feeRecipient",
    inputs: [],
    outputs: [{ name: "", internalType: "address", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getKeyHandles",
    inputs: [{ name: "listingId", internalType: "uint256", type: "uint256" }],
    outputs: [
      { name: "keyPart0", internalType: "euint128", type: "bytes32" },
      { name: "keyPart1", internalType: "euint128", type: "bytes32" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getListing",
    inputs: [{ name: "listingId", internalType: "uint256", type: "uint256" }],
    outputs: [
      { name: "creator", internalType: "address", type: "address" },
      { name: "title", internalType: "string", type: "string" },
      { name: "category", internalType: "string", type: "string" },
      { name: "metadataURI", internalType: "string", type: "string" },
      { name: "promptCID", internalType: "string", type: "string" },
      { name: "priceWei", internalType: "uint256", type: "uint256" },
      { name: "saleCount", internalType: "uint32", type: "uint32" },
      { name: "active", internalType: "bool", type: "bool" },
      { name: "createdAt", internalType: "uint256", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getListings",
    inputs: [
      { name: "offset", internalType: "uint256", type: "uint256" },
      { name: "limit", internalType: "uint256", type: "uint256" },
    ],
    outputs: [{ name: "ids", internalType: "uint256[]", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasPurchased",
    inputs: [
      { name: "listingId", internalType: "uint256", type: "uint256" },
      { name: "buyer", internalType: "address", type: "address" },
    ],
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "listPrompt",
    inputs: [
      {
        name: "encryptedKey0",
        internalType: "struct InEuint128",
        type: "tuple",
        components: [
          { name: "ctHash", internalType: "uint256", type: "uint256" },
          { name: "securityZone", internalType: "uint8", type: "uint8" },
          { name: "utype", internalType: "uint8", type: "uint8" },
          { name: "signature", internalType: "bytes", type: "bytes" },
        ],
      },
      {
        name: "encryptedKey1",
        internalType: "struct InEuint128",
        type: "tuple",
        components: [
          { name: "ctHash", internalType: "uint256", type: "uint256" },
          { name: "securityZone", internalType: "uint8", type: "uint8" },
          { name: "utype", internalType: "uint8", type: "uint8" },
          { name: "signature", internalType: "bytes", type: "bytes" },
        ],
      },
      { name: "title", internalType: "string", type: "string" },
      { name: "category", internalType: "string", type: "string" },
      { name: "metadataURI", internalType: "string", type: "string" },
      { name: "promptCID", internalType: "string", type: "string" },
      { name: "priceWei", internalType: "uint256", type: "uint256" },
    ],
    outputs: [{ name: "listingId", internalType: "uint256", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "listingCount",
    inputs: [],
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingEarnings",
    inputs: [{ name: "account", internalType: "address", type: "address" }],
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "purchasePrompt",
    inputs: [{ name: "listingId", internalType: "uint256", type: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "withdrawEarnings",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const PROMPT_VAULT_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ""
) as `0x${string}`;
