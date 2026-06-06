# PromptVault

**An encrypted AI prompt marketplace powered by Fully Homomorphic Encryption.**

Creators monetise their best prompts. Buyers purchase with cryptographic
verification — every prompt is encrypted end-to-end and the key is gated
by the Sepolia blockchain. No one, not even the platform, can read a
prompt's content before a verified wallet buys it.

---

## Why FHE?

Most crypto marketplaces use "commit-reveal" or "encrypt-then-reveal":
the buyer trusts the seller to send the decryption key after payment.
PromptVault replaces that trust with mathematics.

**Fully Homomorphic Encryption (FHE)** lets the smart contract compute
directly on encrypted data — specifically, it can grant or deny access
to ciphertext *without ever decrypting it*. When you buy a prompt, the
contract atomically:

1. Accepts your payment (ETH on Sepolia testnet)
2. Calls `FHE.allow(keyHandle, yourAddress)` — permanently granting
   your wallet the ability to decrypt the AES key

This is the key innovation: **the AES encryption key never appears in
plaintext anywhere — not on-chain, not in an API response, not in any
database**. It exists only transiently in the browser of the authorised
buyer or creator, reconstructed from two FHE ciphertexts.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER                             │
│                                                             │
│  ┌────────────┐    ┌──────────────┐    ┌────────────────┐   │
│  │ Web Crypto  │    │  CoFHE SDK   │    │   Pinata IPFS  │   │
│  │  (AES-256)  │    │ (FHE decrypt)│    │   (upload/get) │   │
│  └──────┬──────┘    └──────┬───────┘    └───────┬────────┘   │
│         │                  │                    │            │
│         ▼                  ▼                    ▼            │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              React / Next.js App                     │    │
│  │  hooks: useMarketplace, useListPrompt, usePurchase.. │    │
│  └──────────────────────┬───────────────────────────────┘    │
│                         │ wallet + RPC                       │
└─────────────────────────┼───────────────────────────────────┘
                          │
                    ┌─────┴──────┐
                    │   Wagmi    │
                    │  (viem)    │
                    └─────┬──────┘
                          │
══════════════════════════╪═══════════════════════════════════
                    ┌─────┴──────────────┐
                    │   Sepolia Testnet   │
                    │   (CoFHE-enabled)   │
                    │                     │
          ┌─────────▼─────────┐  ┌───────▼────────┐
          │                   │  │                │
          │   PromptVault     │  │  Ethereum      │
          │   Contract         │  │  JSON-RPC      │
          │   (FHE ACLs)      │  │  (Infura)       │
          │                   │  │                │
          └─────────┬─────────┘  └────────────────┘
                    │
          ┌─────────▼─────────┐
          │   On-Chain FHE     │
          │   Key Handles      │
          │  (euint128 × 2)    │
          │                    │
          │   keyPart0 ────────┤── 128 bits (MSB)
          │   keyPart1 ────────┤── 128 bits (LSB)
          │                    │
          │   concat →         │
          │   AES-256 key      │
          └────────────────────┘
```

### The AES + FHE Hybrid Design

PromptVault uses a **two-layer encryption model** to solve the size
limitation of pure on-chain FHE:

| Layer | Algorithm | What it encrypts | Where stored |
|-------|-----------|-----------------|--------------|
| 1 | AES-256-GCM | Prompt body (any length) | IPFS (Pinata) |
| 2 | FHE (CoFHE) | AES-256 key (split into 2×128b) | Sepolia blockchain |

**Why not just FHE-encrypt the prompt directly?** FHE operates on
`euint128` — maximum ~128 bits of plaintext per handle. A typical
prompt is 200–2,000 bytes. The hybrid approach removes this limit:
encrypt the prompt with a conventional symmetric cipher, then use FHE
to gate access to the symmetric key.

```
Generation (creator):

  prompt_text ──► AES-256-GCM ──► ciphertext ──► IPFS
                     │
                     └── AES key (256 bits)
                              │
                    split into halves
                              │
                     ┌────────┴────────┐
                    key0 (128b)     key1 (128b)
                     │               │
                     ▼               ▼
                  FHE.encrypt()   FHE.encrypt()
                     │               │
                     ▼               ▼
                  euint128        euint128
                     │               │
                     └──────┬────────┘
                            │
                      listPrompt() tx
                            │
                      stored on-chain
                      ACL: allowThis + allowSender

Purchase (buyer):

  purchasePrompt(id) ──► payable tx
                            │
                   msg.value == priceWei ✓
                            │
                  FHE.allow(key0, buyer)
                  FHE.allow(key1, buyer)
                            │
                   _hasPurchased[id][buyer] = true
                            │
              ┌─────────────┴─────────────┐
              │         BROWSER           │
              │  getKeyHandles(id) (view) │
              │                           │
              │  CoFHE: decryptToBigInt() │
              │         ├── key0 (128b)   │
              │         └── key1 (128b)   │
              │                           │
              │  concat → AES-256 key     │
              │  download IPFS CID        │
              │  AES-GCM decrypt          │
              │                           │
              │  ▼ prompt plaintext       │
              └───────────────────────────┘
```

For detailed architecture diagrams:

- [`promptvault_big_picture.svg`](./promptvault_big_picture.svg) —
  End-to-end system overview
- [`promptvault_fhe_key_gate.svg`](./promptvault_fhe_key_gate.svg) —
  FHE key-gating flow
- [`promptvault_user_flow.svg`](./promptvault_user_flow.svg) —
  User interaction flow

---

## Smart Contract

### `PromptVault.sol`

Deployed at **`0xc369bd84AE4a4468DA5635619e62F942BeaF5DA3`** on Sepolia.

**Key functions:**

| Function | Description |
|----------|-------------|
| `listPrompt(encryptedKey0, encryptedKey1, title, category, metadataURI, promptCID, priceWei)` | Create a new listing. Encrypts two `euint128` handles on-chain from caller-supplied `InEuint128` inputs. Sets ACL: `allowThis` + `allowSender`. |
| `purchasePrompt(listingId)` | Pay `msg.value == priceWei` to purchase. Grants `FHE.allow(keyPart0, buyer)` and `FHE.allow(keyPart1, buyer)`. Splits payment: 97.5% creator, 2.5% platform. |
| `delistPrompt(listingId)` | Creator-only. Marks listing inactive. Existing buyers retain key access (FHE allows cannot be revoked — this is by design). |
| `withdrawEarnings()` | Pull accumulated ETH earnings. |
| `getListing(listingId)` | View metadata: title, category, promptCID, price, saleCount, active status, createdAt. |
| `getKeyHandles(listingId)` | Authorised-view (creator or purchaser). Returns both `euint128` handles. |
| `getListings(offset, limit)` | Paginated listing IDs. |
| `hasPurchased(listingId, buyer)` | Check purchase status. |
| `pendingEarnings(account)` | Check unpaid earnings. |

**Platform fee:** 250 bps (2.5%). Set via `PLATFORM_FEE_BPS`. Recipient is
the contract deployer (`feeRecipient = msg.sender` in constructor).

**Design invariants:**
- `FHE.allow()` grants **permanent** access — cannot be revoked.
  This means a buyer keeps access even if the creator delists.
- The `promptCID` (IPFS CID) is public data. The ciphertext is useless
  without the AES key, which is FHE-gated.
- Key halves are concatenated as `bytes32(key0 << 128 | key1)` in
  big-endian byte order to reconstruct the AES-256 key.

### Test Coverage

41 tests across 9 describe blocks, covering:
- Deployment and initial state
- Listing creation (all validation paths)
- Purchase flow (success, errors, double-purchase protection)
- Delisting (creator-only, no re-delist)
- Earnings and withdrawal
- Authorised key handle access
- Edge cases (empty strings, zero price, buyer-is-creator)
- Paginated listing enumeration

---

## Frontend

A **Next.js 14** application with **Wagmi** (viem), **CoFHE SDK**,
**React Query**, and **shadcn/ui**.

### Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| Blockchain | Wagmi v2 / viem 2.x |
| FHE | @cofhe/sdk 0.4.0 |
| State | @tanstack/react-query (server reads) |
| Styling | Tailwind CSS v3 + shadcn/ui v4 (@base-ui/react) |
| IPFS | Pinata (JWT-based upload, gateway download) |
| Crypto | Web Crypto API (SubtleCrypto) |

### Project Structure

```
frontend/src/
├── app/
│   ├── layout.tsx          # Root: WagmiProvider, QueryClient, Toaster
│   ├── page.tsx            # Landing page (hero, featured, how-it-works)
│   ├── marketplace/        # Browse all listings
│   ├── list/               # Create a new listing
│   ├── listing/[id]/       # Single listing detail + purchase
│   ├── my-prompts/         # Purchased prompts
│   └── profile/            # User stats, earnings, activity
├── components/
│   ├── ui/                 # shadcn components (Button, Card, Badge, etc.)
│   ├── ConnectWallet.tsx   # Wallet dropdown + Sepolia ETH balance
│   ├── ListingCard.tsx     # Listing card with category badge
│   ├── ListingGrid.tsx     # Responsive grid with loading/empty states
│   ├── PurchaseButton.tsx  # Purchase + decrypt flow
│   ├── PromptViewer.tsx    # Decrypted prompt renderer
│   └── NavBar.tsx          # Navigation + connect wallet
├── hooks/
│   ├── useMarketplace.ts   # Paginated listings query
│   ├── useListPrompt.ts    # Encrypt → IPFS → FHE → listPrompt tx
│   ├── usePurchasePrompt.ts # purchasePrompt → decrypt → IPFS → AES decrypt
│   ├── useMyPrompts.ts     # Purchased listings filter
│   └── useListingDetails.ts # Single listing fetch
└── lib/
    ├── chain.ts            # Sepolia chain config
    ├── contract.ts         # Full ABI + contract address
    ├── cofhe.ts            # CoFHE client singleton (dynamic import, SSR-safe)
    ├── aes.ts              # AES-256 key gen/split/reconstruct/encrypt/decrypt
    ├── ipfs.ts             # Pinata upload/download
    └── types/listing.ts    # TypeScript types
```

### Key Data Flow: Listing a Prompt

1. User writes prompt text in the list form (Markdown)
2. `useListPrompt` hook:
   a. `generateAndSplitKey()` — Web Crypto creates AES-256 key,
      exports raw bytes, splits into two `bigint` halves
   b. `encryptPrompt(key, text)` — AES-256-GCM encrypts the plaintext
   c. `uploadToIpfs({ iv, ciphertext, encoding })` — stores on Pinata,
      returns CID
   d. CoFHE client encrypts both key halves to `InEuint128` format
   e. `wallet.writeContract({ functionName: "listPrompt", args: [...] })`
   f. Contract stores `euint128` handles with ACLs
3. User sees success screen with listing ID

### Key Data Flow: Purchasing a Prompt

1. User clicks "Purchase" on a listing
2. `usePurchasePrompt` hook:
   a. `wallet.writeContract({ functionName: "purchasePrompt", value })`
   b. Contract verifies payment, grants `FHE.allow` for both key halves
   c. `contract.read.getKeyHandles(listingId)` — returns `euint128` handles
   d. CoFHE client decrypts both handles → two `bigint` halves
   e. `reconstructKey(k0, k1)` — reassembles AES-256 key
   f. `downloadFromIpfs(promptCID)` — gets `{ iv, ciphertext }`
   g. `decryptPrompt(key, payload)` — AES-256-GCM decrypt to plaintext
3. Prompt text displayed in `PromptViewer` (component-local state, never persisted)

### SSR Safety

CoFHE SDK uses IndexedDB internally, which is browser-only. The client
is initialised via a dynamic `import("@cofhe/sdk/web")` guarded by
`typeof window === "undefined"`. The `cofhe.ts` singleton ensures a
single instance with lazy initialisation.

---

## Security Model

```
┌─────────────────────────────────────────────────────────────────┐
│                     THREAT MODEL                                 │
│                                                                  │
│  Trust assumptions:                                              │
│  ├── Creator is honest about prompt content                      │
│  ├── Buyer has a legitimate wallet (no Sybil defense)            │
│  └── Sepolia RPC provider (Infura) does not inspect traffic      │
│                                                                  │
│  What the contract protects against:                             │
│  ├── Platform operator reading prompt content                    │
│  ├── Third-party blockchain observer reading prompt content      │
│  ├── Non-purchasers decrypting the AES key                       │
│  └── Front-running purchase transactions                         │
│                                                                  │
│  What is NOT protected:                                          │
│  ├── Buyer sharing decrypted content (no DRM)                    │
│  ├── Malicious JavaScript in prompt (no sandbox)                 │
│  └── Creator listing stolen/plagiarised prompts                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key security properties:**

- **AES key never appears on-chain**: only FHE ciphertexts are stored.
- **IPFS CID is public**: the ciphertext is useless without the key.
  This is fine — same as a public S3 bucket with encrypted files.
- **FHE.allow is permanent**: once granted, a wallet can always
  decrypt. This is a deliberate trade-off for atomicity (no revoke
  means no race conditions on access control).
- **Browser-only secret material**: the AES key lives only in the
  `CryptoKey` object in the buyer's browsing session. It is never
  sent over the network, never logged, never stored in localStorage.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- MetaMask (or any WalletConnect-compatible wallet)
- Sepolia test ETH (faucets: [Alchemy](https://sepoliafaucet.com),
  [Infura](https://www.infura.io/faucet/sepolia))

### Smart Contract

```bash
# Install dependencies
npm install

# Compile (9 Solidity files via FHE + CoFHE)
npm run compile

# Run tests (41 passing tests)
npm test

# Deploy to Sepolia (requires PRIVATE_KEY + SEPOLIA_RPC_URL in .env)
npm run deploy
```

### Frontend

```bash
cd frontend
npm install --cache /tmp/npm-cache

# Copy and fill in environment variables
cp .env.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed address>
#   NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<KEY>
#   NEXT_PUBLIC_PINATA_JWT=<Pinata JWT>
#   NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/

npm run dev
# Open http://localhost:3000
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Yes | Deployed PromptVault address |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Yes | CORS-safe Sepolia RPC (Infura, Alchemy) |
| `NEXT_PUBLIC_PINATA_JWT` | Yes | Pinata JWT for IPFS uploads |
| `NEXT_PUBLIC_IPFS_GATEWAY` | No | IPFS gateway (default: Pinata) |
| `PRIVATE_KEY` | For deploy | Deployer wallet private key |
| `SEPOLIA_RPC_URL` | For deploy | Sepolia RPC for Hardhat |

---

## Deployment

### Contract

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Deployed at: [`0xc369bd84AE4a4468DA5635619e62F942BeaF5DA3`](https://sepolia.etherscan.io/address/0xc369bd84AE4a4468DA5635619e62F942BeaF5DA3)

### Frontend (Vercel)

The monorepo uses a root-level `vercel.json` that delegates to the
`frontend/` subdirectory. Environment variables must be set in the
Vercel project dashboard:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xc369bd84AE4a4468DA5635619e62F942BeaF5DA3
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/...
NEXT_PUBLIC_PINATA_JWT=...
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

Current deployment: `frontend-rouge-one-36.vercel.app`

---

## E2E Smoke Test

See [`SMOKE_TEST.md`](./SMOKE_TEST.md) for a manual 8-step test plan
covering marketplace load, wallet connection, listing, purchasing,
and edge cases.

---

## Built With

- [Fhenix CoFHE](https://docs.fhenix.io/) — Confidential computing layer
  for Ethereum (v0.4.0)
- [Hardhat](https://hardhat.org/) — Smart contract development
- [Next.js 14](https://nextjs.org/) — React framework
- [Wagmi](https://wagmi.sh/) — Ethereum hooks for React
- [shadcn/ui](https://ui.shadcn.com/) — Component library
- [Pinata](https://pinata.cloud/) — IPFS pinning service

---

Built by [Harish Kotra](https://dailybuilds.xyz).
