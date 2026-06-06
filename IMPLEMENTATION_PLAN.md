# PromptVault — Implementation Plan

## 1. Architecture

### Hybrid Encryption Scheme

PromptVault uses a **two-layer encryption** approach:

| Layer | Algorithm | What | Where stored | Access control |
|---|---|---|---|---|
| Outer | FHE (CoFHE `euint128`) | 256-bit AES key split into two `euint128` halves | On-chain in `Listing.keyPart0` / `keyPart1` | `FHE.allow` — cryptographic enforcement |
| Inner | AES-256-GCM | Prompt plaintext | IPFS (CID in `Listing.promptCID`) | AES key is FHE-gated |

**Why**: FHE is computationally expensive — encrypting the entire prompt (which can be KBs long) is impractical. By using FHE to protect only the 256-bit AES key, we get:
- Arbitrary-length prompts (no 128-byte limit)
- Gas-efficient listing (only encrypting two `uint128` values)
- The same security guarantee: **on-chain, the prompt is permanently sealed; decryption is wallet-gated**

The creator's browser:
1. Generates a random 256-bit AES key
2. Splits it into two `uint128` halves (`key0`, `key1`)
3. Encrypts the prompt with AES-256-GCM
4. Uploads the AES ciphertext to IPFS → gets a CID
5. Encrypts `key0` and `key1` with `cofhejs` FHE → produces `InEuint128` values
6. Calls `listPrompt(encryptedKey0, encryptedKey1, ..., promptCID)`

The buyer's browser (on purchase):
1. Calls `getKeyHandles(listingId)` → gets `euint128 keyPart0, keyPart1`
2. Calls `decryptForView` on both handles → gets two `uint128` bigints
3. Concatenates: `key = key0 << 128 \| key1`
4. Downloads the AES ciphertext from IPFS via `promptCID`
5. AES-256-GCM decrypts with the reconstructed key → plaintext prompt

### System Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       BROWSER (Next.js App)                              │
│                                                                         │
│  ┌───────────┐  ┌───────────────┐  ┌────────────┐  ┌───────────────┐   │
│  │  Pages    │  │   Hooks       │  │ Components  │  │  API Routes   │   │
│  │ marketplce│  │ useCofhe      │  │ ListingCard │  │  /api/chat    │   │
│  │ /list     │  │ useListPrompt │  │ UsePromptUI │  │  (LLM proxy)  │   │
│  │ /listing/ │  │ usePurchase   │  │ PurchaseBtn │  │               │   │
│  │ /my-prmpts│  │ usePrompt     │  │ EarningsPn  │  │               │   │
│  └───────────┘  └──────┬────────┘  └────────────┘  └───────────────┘   │
│                        │                                                │
│             ┌──────────▼──────────┐                                     │
│             │    cofhejs SDK      │      ┌──────────────────┐           │
│             │   encrypt /         │      │  Web Crypto API  │           │
│             │   decryptForView    │      │  AES-256-GCM     │           │
│             │   permits           │      │  (built-in)      │           │
│             └──────────┬──────────┘      └────────┬─────────┘           │
│                        │                          │                     │
│             ┌──────────▼──────────┐    ┌──────────▼─────────┐           │
│             │  Wagmi + Viem       │    │  IPFS Client        │           │
│             │  wallet connect     │    │  (web3.storage /    │           │
│             │  contract calls     │    │   Pinata SDK)       │           │
│             └─────────────────────┘    └────────────────────┘           │
└───────────────────────────┬──────────────────────────────────────────────┘
                           │
                           │ RPC (Sepolia)            │ HTTP (IPFS gateway)
                           ▼                          ▼
┌─────────────────────────────────────────┐  ┌──────────────────────┐
│   ETHEREUM SEPOLIA (CoFHE testnet)      │  │     IPFS NETWORK     │
│                                         │  │                      │
│  PromptVault.sol                        │  │  AES-encrypted       │
│   ┌─────────────────────────────────┐   │  │  prompt payload      │
│   │ listPrompt(InEuint128 x2, ...)  │   │  │  (by CID)            │
│   │   → FHE.asEuint128 ×2           │   │  │                      │
│   │   → FHE.allowThis ×2            │   │  └──────────────────────┘
│   │   → FHE.allowSender ×2          │   │
│   │                                 │   │
│   │ purchasePrompt(listingId)       │   │
│   │   → FHE.allow(key0, buyer)      │   │
│   │   → FHE.allow(key1, buyer)      │   │
│   │   → split payment + earnings    │   │
│   └──────────────┬──────────────────┘   │
│                  │                      │
│                  ▼                      │
│  ┌──────────────────────────────────┐   │
│  │  CoFHE ACL Contract (system)     │   │
│  │  persistedAllowedPairs[handle]   │   │
│  │  [address] = true                │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
                    │
                    │ decryptForView (off-chain RPC)
                    ▼
┌──────────────────────────────────────────────────┐
│           THRESHOLD NETWORK (MPC nodes)           │
│  Checks: persistedAllowedPairs[handle][buyer]?    │
│  If yes → returns uint128 plaintext (key half)    │
│  If no  → rejects decryption request              │
└──────────────────────────────────────────────────┘
```

### Core Data Flow

1. **Listing**: Creator generates AES-256 key → splits into two `uint128` → encrypts prompt with AES → uploads ciphertext to IPFS → FHE-encrypts both key halves with `cofhejs` → calls `listPrompt(encryptedKey0, encryptedKey1, ..., promptCID)` → contract stores two `euint128` handles + IPFS CID.
2. **Purchase**: Buyer sends ETH → `purchasePrompt()` → `FHE.allow(keyPart0, buyer)` + `FHE.allow(keyPart1, buyer)` atomically with payment. No off-chain coordination.
3. **Use**: Buyer calls `getKeyHandles()` → `decryptForView` on both handles → reconstructs 256-bit key → downloads AES ciphertext from IPFS via `promptCID` → AES-256-GCM decrypts → plaintext prompt → calls LLM via `/api/chat`.

### Security Invariant

The AES key halves are FHE-gated. Even if the IPFS CID is public (it is — it's in `getListing`), the AES ciphertext is useless without the 256-bit key, which FHE protects. An attacker would need to:
1. Bypass the `FHE.allow` ACL (cryptographically enforced by Threshold Network, not just a Solidity `require`), **and**
2. Break FHE encryption (computationally infeasible)

---

## 2. Folder Structure

```
promptvault/
│
├── contracts/
│   └── PromptVault.sol              # Canonical contract
│
├── scripts/
│   ├── deploy.ts                    # ethers v6 deploy script
│   └── verify.ts                    # Optional Etherscan verification
│
├── test/
│   ├── PromptVault.test.ts          # Full test suite
│   └── helpers/
│       └── fhe.ts                   # Encrypt/decrypt helpers for tests
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           # Root layout (wagmi provider, cofhe init)
│   │   │   ├── page.tsx             # Redirect to /marketplace
│   │   │   ├── marketplace/
│   │   │   │   └── page.tsx         # Browse listings
│   │   │   ├── list/
│   │   │   │   └── page.tsx         # Creator listing form
│   │   │   ├── listing/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # Detail + purchase + use
│   │   │   ├── my-prompts/
│   │   │   │   └── page.tsx         # Creator dashboard
│   │   │   └── api/
│   │   │       └── chat/
│   │   │           └── route.ts     # LLM API proxy
│   │   ├── components/
│   │   │   ├── ListingCard.tsx
│   │   │   ├── ListPromptForm.tsx
│   │   │   ├── PurchaseButton.tsx
│   │   │   ├── UsePromptUI.tsx
│   │   │   └── EarningsPanel.tsx
│   │   ├── hooks/
│   │   │   ├── useCofhe.ts
│   │   │   ├── useListPrompt.ts
│   │   │   ├── usePurchase.ts
│   │   │   ├── usePrompt.ts
│   │   │   └── useEarnings.ts
│   │   ├── lib/
│   │   │   ├── contract.ts          # ABI + typed contract factory
│   │   │   ├── cofhe.ts             # Shared CofheClient singleton
│   │   │   ├── chain.ts             # Sepolia chain config
│   │   │   ├── aes.ts               # AES-256-GCM key gen / split / encrypt / decrypt
│   │   │   └── ipfs.ts              # IPFS upload / download helpers
│   │   └── types/
│   │       └── listing.ts           # TypeScript types
│   └── public/
│       └── (static assets)
│
├── hardhat.config.ts
├── tsconfig.json
├── package.json
├── .env
├── .env.example
├── .gitignore
├── SPEC.md
└── IMPLEMENTATION_PLAN.md
```

Key differences from original spec layout:
- **`lib/aes.ts`** — new file for AES key generation, splitting, encryption, decryption using Web Crypto API
- **`lib/ipfs.ts`** — new file for IPFS upload/download (wraps Pinata or web3.storage SDK)

---

## 3. Dependencies

### Root (Hardhat + Contract tooling)

| Package | Version | Purpose |
|---|---|---|
| `hardhat` | ^2.22.3 | Solidity dev environment |
| `@nomicfoundation/hardhat-toolbox` | ^6.1.2 | Testing, ethers, typechain |
| `@cofhe/hardhat-plugin` | ^0.4.0 | CoFHE mock contracts for local testing |
| `@fhenixprotocol/cofhe-contracts` | 0.1.0 | `FHE.sol` — the FHE library |
| `@cofhe/sdk` | 0.4.0 | Client-side encrypt/decrypt/permits |
| `ts-node` | ^10.9.2 | TS execution for Hardhat |
| `typescript` | ^6.0.2 | Type checking |
| `dotenv` | ^17.3.1 | Environment variables |

### Frontend (`frontend/`)

| Package | Version | Purpose |
|---|---|---|
| `next` | ^14 | App Router framework |
| `react` / `react-dom` | ^18 | UI library |
| `wagmi` | ^2.x | Wallet connection |
| `viem` | ^2.x | Low-level Ethereum interactions |
| `@cofhe/sdk` | 0.4.0 | FHE client (encrypt/decrypt/permits) |
| `pinata-web3` | ^latest | IPFS upload (or `web3.storage`) |
| `tailwindcss` | ^3.x | Styling |

Web Crypto API (`crypto.subtle`) is built into modern browsers — no library needed for AES-256-GCM.

### Dev tools

- `eslint`, `prettier` for code quality

---

## 4. Data Models

### 4.1 On-Chain Storage Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Contract Storage                                                   │
│                                                                     │
│  listingCount: uint256                                              │
│  feeRecipient: address (immutable, constructor)                     │
│                                                                     │
│  _listings: mapping(uint256 => Listing)                             │
│    [listingId] → Listing struct (see below)                         │
│                                                                     │
│  _hasPurchased: mapping(uint256 => mapping(address => bool))        │
│    [listingId][buyer] → has this address purchased?                 │
│                                                                     │
│  _earnings: mapping(address => uint256)                             │
│    [creator] → accumulated ETH (post-fee)                           │
│    [feeRecipient] → accumulated platform fees                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Listing Struct

| Field | Solidity Type | Visibility | Mutable? | Notes |
|---|---|---|---|---|
| `creator` | `address` | Public via getter | Never | Set at `listPrompt` |
| `title` | `string` | Public via `getListing` | Never | Max 100 bytes |
| `category` | `string` | Public | Never | Max 50 bytes |
| `metadataURI` | `string` | Public | Never | Optional IPFS/URL |
| `promptCID` | `string` | Public | Never | IPFS CID of AES-encrypted prompt payload |
| `priceWei` | `uint256` | Public | Never | Non-zero |
| `saleCount` | `uint32` | Public | Increments only | Max ~4B purchases |
| `active` | `bool` | Public | Can go false | `delistPrompt` only |
| `keyPart0` | `euint128` | Private (gated getter) | Never | FHE ciphertext — first half of AES key |
| `keyPart1` | `euint128` | Private (gated getter) | Never | FHE ciphertext — second half of AES key |
| `createdAt` | `uint256` | Public via getter | Never | `block.timestamp` |

### 4.3 Off-Chain Resources

#### Metadata JSON (stored at `metadataURI`, optional)

```typescript
interface PromptMetadata {
  title: string;
  description: string;       // Extended description
  category: string;          // e.g. "coding", "legal"
  model: string;             // e.g. "claude-sonnet-4-20250514"
  tokenEstimate: number;     // Approximate token count
  exampleOutput?: string;    // Sample LLM output
}
```

#### IPFS Payload (stored at `promptCID`)

```typescript
interface IpfsPromptPayload {
  iv: string;               // AES-GCM initialisation vector (hex, 12 bytes → 24 hex chars)
  ciphertext: string;       // AES-256-GCM encrypted prompt (base64 or hex)
  tag?: string;             // AES-GCM authentication tag (hex, 16 bytes) — may be appended to ciphertext
  encoding: "aes-256-gcm";  // Algorithm identifier for forward compatibility
}
```

### 4.4 TypeScript Types (frontend)

```typescript
interface Listing {
  listingId: bigint;
  creator: `0x${string}`;
  title: string;
  category: string;
  metadataURI: string;
  promptCID: string;           // IPFS CID of AES-encrypted prompt
  priceWei: bigint;
  saleCount: number;
  active: boolean;
  createdAt: bigint;
}

interface PurchasedListing extends Listing {
  keyPart0?: `0x${string}`;   // euint128 handle (hex)
  keyPart1?: `0x${string}`;   // euint128 handle (hex)
  plaintext?: string;          // Decrypted prompt (ephemeral, never stored)
}
```

### 4.5 State Management Philosophy

- **No global state store** — component-local state + React Query for contract reads.
- Wallet connection state: managed by Wagmi (react context).
- CoFHE client: singleton in `lib/cofhe.ts`, initialized once in root layout.
- AES keys: generated per-listing in creator's browser; reconstructed per-use in buyer's browser. **Never** persisted to localStorage or sent to the chain in plaintext.
- Decrypted prompt: held in component-local `useState` in `UsePromptUI`. Ephemeral.

---

## 5. APIs

### 5.1 Smart Contract Interface

#### Write Functions

| Function | Params | Mutates | Access |
|---|---|---|---|
| `listPrompt(InEuint128, InEuint128, string, string, string, string, uint256)` → `uint256` | encryptedKey0, encryptedKey1, title, category, metadataURI, promptCID, priceWei | Creates listing, stores two euint128 handles, ACL grants | Any wallet |
| `purchasePrompt(uint256)` `payable` | listingId | Grants FHE.allow on both key halves, updates earnings/saleCount | Any wallet (except creator) |
| `delistPrompt(uint256)` | listingId | Sets `active = false` | Creator only |
| `withdrawEarnings()` | (none) | Zeroes `_earnings[caller]`, sends ETH | Any wallet with balance |

#### Read Functions

| Function | Params | Returns | Gated? |
|---|---|---|---|
| `getListing(uint256)` | listingId | `(creator, title, category, metadataURI, promptCID, priceWei, saleCount, active, createdAt)` | No |
| `getKeyHandles(uint256)` | listingId | `(euint128 keyPart0, euint128 keyPart1)` | Creator or buyer only |
| `getListings(uint256, uint256)` | offset, limit | `uint256[]` (IDs) | No |
| `hasPurchased(uint256, address)` | listingId, buyer | `bool` | No |
| `pendingEarnings(address)` | account | `uint256` | No |

### 5.2 Frontend Hooks Interface

| Hook | Exports | Consumes |
|---|---|---|
| `useCofhe` | `cofheClient`, `isConnected`, `connectCofhe()` | Wagmi walletClient + publicClient |
| `useListPrompt` | `listPrompt(promptText, title, category, metadataURI, priceEth)` → `receipt` | Contract, cofheClient, IPFS client, Web Crypto |
| `usePurchase` | `purchasePrompt(listingId, priceWei)` → `receipt` | Contract instance |
| `usePrompt` | `getPromptPlaintext(listingId)` → `string` | Contract, cofheClient, IPFS client, Web Crypto |
| `useEarnings` | `earnings`, `withdrawEarnings()` | Contract instance |

### 5.3 API Route

| Route | Method | Body | Returns | Purpose |
|---|---|---|---|---|
| `/api/chat` | POST | `{ systemPrompt, userMessage, model? }` | `{ content: string }` | Proxies to LLM (Anthropic/OpenAI). Server-side only — API key never exposed to client. |

### 5.4 Internal Library Modules

| Module | Exports | Purpose |
|---|---|---|
| `lib/aes.ts` | `generateKey()`, `splitKey(key)`, `reconstructKey(k0, k1)`, `encryptPrompt(key, plaintext)`, `decryptPrompt(key, payload)` | AES-256-GCM operations using Web Crypto API |
| `lib/ipfs.ts` | `uploadToIpfs(data, filename?)`, `downloadFromIpfs(cid)` | IPFS storage via Pinata / web3.storage |

#### AES key lifecycle

```typescript
// Creator: split
const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
const rawKey = await crypto.subtle.exportKey("raw", key); // Uint8Array(32)
const k0 = bytesToBigInt(rawKey.slice(0, 16));  // uint128
const k1 = bytesToBigInt(rawKey.slice(16, 32)); // uint128
// → FHE-encrypt k0 and k1, send as InEuint128 to listPrompt

// Buyer: reconstruct
const decryptedK0 = await decryptForView(keyPart0); // bigint
const decryptedK1 = await decryptForView(keyPart1); // bigint
const rawKey = new Uint8Array(32);
rawKey.set(bigIntToBytesBE(decryptedK0, 16), 0);
rawKey.set(bigIntToBytesBE(decryptedK1, 16), 16);
const key = await crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["decrypt"]);
// → AES-GCM decrypt the IPFS payload
```

**BigInt ↔ bytes endianness**: Big-endian byte serialisation must be used consistently to match Solidity's `uint256` encoding. The comment in the contract (`bytes32(uint256(key0) << 128 | uint256(key1))`) implies big-endian concatenation.

### 5.5 Error Handling Strategy

- Contract errors: caught as revert reasons, mapped to user-friendly messages in hooks.
- FHE errors: `ACLNotAllowed`, permit expiry, ZK proof failures — surfaced via toast notifications.
- IPFS errors: timeout, CID not found — retry with different gateway, then show "IPFS unavailable" message.
- AES errors: corrupt key reconstruction, authentication tag mismatch — rare; log details and show "Decryption failed" toast.
- LLM API errors: caught in `/api/chat` route, returned as structured JSON error responses.

---

## 6. Milestones

### Phase 1 — Environment & Contract (Days 1–2)

| Step | Task | Deliverable |
|---|---|---|
| 1.1 | Scaffold Hardhat project with `@cofhe/hardhat-plugin` | `hardhat.config.ts`, `package.json`, `tsconfig.json` |
| 1.2 | Place `PromptVault.sol` in `contracts/` | Existing `PromptVault.sol` at `contracts/PromptVault.sol` |
| 1.3 | Write deploy script | `scripts/deploy.ts` |
| 1.4 | Configure `.env` with Sepolia RPC + private key | `.env`, `.env.example` |
| 1.5 | Run `npx hardhat compile` | Clean compile |

**Verification**: `npx hardhat compile` passes without errors.

### Phase 2 — Contract Tests (Days 3–4)

| Step | Task | Deliverable |
|---|---|---|
| 2.1 | Write FHE test helpers | `test/helpers/fhe.ts` — encrypt/decrypt wrappers using `@cofhe/hardhat-plugin` mocks |
| 2.2 | `listPrompt` tests | Validate: emits `PromptListed`, stores handles, ACL grants (allowThis, allowSender), reverts on empty/title/category/price |
| 2.3 | `purchasePrompt` tests | Validate: FHE.allow on both handles, `_hasPurchased`, `saleCount`, earnings split (2.5% fee), reverts on inactive/already-purchased/self-buy/wrong-payment |
| 2.4 | `delistPrompt` tests | Validate: `active = false`, emits event, non-creator revert, already-inactive revert |
| 2.5 | `withdrawEarnings` tests | Validate: correct ETH transfer, CEI pattern (zero before call), zero-balance revert |
| 2.6 | `getKeyHandles` tests | Validate: returns to creator, returns to buyer, reverts for non-authorised |
| 2.7 | End-to-end integration test | Full flow: deploy → listPrompt → purchasePrompt → getKeyHandles → decryptForView on both halves → verify key values match what was encrypted |

**Verification**: `npx hardhat test` passes all test cases.

### Phase 3 — Frontend Scaffold + Core Libraries (Days 5–6)

| Step | Task | Deliverable |
|---|---|---|
| 3.1 | Scaffold Next.js app in `frontend/` | `npx create-next-app@latest frontend --typescript --app --tailwind` |
| 3.2 | Install frontend deps | wagmi, viem, @cofhe/sdk, pinata-web3 |
| 3.3 | Write `lib/cofhe.ts` | CofheClient singleton + connect helper |
| 3.4 | Write `lib/aes.ts` | `generateAndSplitKey()`, `reconstructKey(k0, k1)`, `aesEncrypt(plaintext)`, `aesDecrypt(payload, key)` using `crypto.subtle` |
| 3.5 | Write `lib/ipfs.ts` | `uploadPrompt(ciphertextPayload)` → CID, `downloadPrompt(cid)` → payload |
| 3.6 | Write `lib/contract.ts` | Typed contract factory (ABI + address) |
| 3.7 | Write `lib/chain.ts` | Sepolia chain config for wagmi |
| 3.8 | Write root layout | WagmiProvider + CofheClient init |

**Verification**: All lib modules can be imported without TypeScript errors. `aes.ts` can generate a key, split it, and reconstruct it correctly.

### Phase 4 — Hooks + Pages + User Flows (Days 7–10)

| Step | Task | Deliverable |
|---|---|---|
| 4.1 | Write `hooks/useCofhe.ts` | Client init + permit management |
| 4.2 | Write `hooks/useListPrompt.ts` | AES key gen → split → encrypt prompt → upload to IPFS → FHE-encrypt both key halves → `listPrompt()` |
| 4.3 | Write `hooks/usePurchase.ts` | `purchasePrompt` payable |
| 4.4 | Write `hooks/usePrompt.ts` | `getKeyHandles` → `decryptForView` ×2 → reconstruct key → download from IPFS → AES decrypt |
| 4.5 | Write `hooks/useEarnings.ts` | Read earnings + `withdrawEarnings` |
| 4.6 | `/marketplace` page + `ListingCard` | Browse listings with `getListings` + `getListing` |
| 4.7 | `/list` page + `ListPromptForm` | Form with prompt textarea (no byte limit), IPFS upload step, FHE encrypt step |
| 4.8 | `/listing/[id]` page + `PurchaseButton` | Detail view, purchase flow |
| 4.9 | `UsePromptUI` component | Decrypt + chat input + LLM response display |
| 4.10 | `/my-prompts` page + `EarningsPanel` | Creator dashboard, delist, withdraw |
| 4.11 | `/api/chat` route | LLM proxy (Anthropic SDK) |
| 4.12 | Navigation + root layout | Header with wallet connect, nav links |

**Verification**: All 4 routes render. Full functional flow works end-to-end on Sepolia testnet.

### Phase 5 — Polish & Deploy (Day 11)

| Step | Task | Deliverable |
|---|---|---|
| 5.1 | Error handling UI | Toast notifications for contract/FHE/IPFS/AES errors |
| 5.2 | Loading states | Skeleton loaders for tx confirmations + IPFS upload/download |
| 5.3 | Empty states | "No listings yet" / "No earnings yet" |
| 5.4 | Deploy contract to Sepolia | `npm run deploy` → verified contract |
| 5.5 | Deploy frontend | Vercel or Railway |
| 5.6 | End-to-end smoke test | Full flow on testnet |

**Verification**: Complete user flow works on Sepolia testnet from a funded wallet.

---

## 7. Risks and Assumptions

### High Risk

| Risk | Impact | Mitigation |
|---|---|---|
| **CoFHE/Fhenix SDK maturity**: `@cofhe/hardhat-plugin`, `@cofhe/sdk`, and `@fhenixprotocol/cofhe-contracts` are pre-release versions. Changes between minor versions may break compilation or runtime behaviour. | Project stalls or requires major rework | Pin exact versions in `package.json`. Test compilation immediately on version bumps. Monitor Fhenix changelog. |
| **Threshold Network availability on Sepolia**: The privacy-preserving `decryptForView` flow depends on the Threshold Network MPC nodes being operational for Sepolia. | Buyers cannot decrypt purchased prompts | Verify TN status before launch. Fallback: `decryptForTx` (publishes key on-chain — the prompt stays IPFS-encrypted but the AES key would be revealed; degrades privacy). |
| **AES key endianness mismatch**: The contract comment `bytes32(uint256(key0) << 128 | uint256(key1))` and the frontend key reconstruction must use identical endianness. Silent decrypt failure if mismatched. | All prompts unreadable post-purchase | Write a single golden test: generate key → split → reconstruct on both JS and Solidity (in test helper) → assert equality. Document endianness explicitly in both `lib/aes.ts` and the contract NatSpec. |

### Medium Risk

| Risk | Impact | Mitigation |
|---|---|---|
| **IPFS availability at decrypt time**: The prompt payload is stored on IPFS. If the pinning service goes down or the CID is unpinned, buyers cannot retrieve the ciphertext even with the AES key. | Buyers paid but cannot access prompt | Use a reputable pinning service (Pinata paid tier, web3.storage). Pin on multiple providers. Filecoin backup for long-term persistence. |
| **IPFS upload latency/cost**: Large prompts take time to upload to IPFS, creating a poor UX during listing. | Creator frustration, abandonment | Show upload progress. Use direct upload to Pinata (fast). Consider chunked upload for very large prompts. |
| **Permit UX complexity**: `decryptForView` requires a permit scoped to wallet + chain. Users who switch wallets or chains may lose ability to decrypt until they re-create permits. | Support burden, lost access | Document clearly. Provide "Re-create permit" button in UI. Auto-detect and prompt on wallet/chain change. |
| **Gas costs for `FHE.asEuint128`**: The ZK proof verification in `listPrompt` runs twice (one per key half). May be expensive. | High listing cost | Deploying on Sepolia (testnet) only for MVP. Monitor gas. Consider bundling into a single `InEuint256` in future (if CoFHE supports it). |

### Low Risk

| Risk | Impact | Mitigation |
|---|---|---|
| **No off-chain metadata validation**: `metadataURI` is free-form. A malicious creator could link to phishing content. | Reputation damage | Frontend can validate URI against IPFS-only or an allowlist. |
| **LLM API key management**: `/api/chat` needs a server-side API key for Anthropic/OpenAI. | Key exposure if route is server-rendered | Use Next.js server-only env vars. Route only runs server-side. |
| **Wallet compatibility**: CoFHE SDK may have limited wallet adapter support. | Some wallets cannot use the product | Test with MetaMask, Rabby, Coinbase Wallet. Document supported wallets. |

### Assumptions

1. **Fhenix CoFHE Sepolia testnet** remains operational for the development and testing duration.
2. **`@cofhe/hardhat-plugin` mock contracts** accurately simulate Threshold Network ACL enforcement for local testing.
3. **Node.js v22 LTS** is the target runtime — ensure all developers use compatible versions.
4. **Buyers have a funded Sepolia wallet** for gas to call `purchasePrompt`.
5. **LLM API (Anthropic/OpenAI)** is accessible from the deployment environment (Vercel, Railway, etc.).
6. **The contract will NOT be upgraded** post-deployment. Any bugfixes require a new deployment and migration.
7. **Users understand that the decrypted prompt is ephemeral in the browser**: closing the tab loses the prompt unless they copy it. This is intentional.
8. **Web Crypto API (`crypto.subtle`)** is available in all modern browsers targeting Sepolia testnet usage.
9. **IPFS pinning service API key** will be provisioned and stored in `.env` for the frontend deployment.

---

## Post-MVP Features (Not in Scope for v1)

- Single `InEuint256` key storage (if CoFHE adds support — would halve gas and simplify)
- Prompt bundles (multiple prompts in one listing)
- ERC-20 payment (USDC, etc.)
- Buyers re-selling prompt access (secondary marketplace)
- Creator analytics dashboard
- Comments/ratings on listings
- UUPS upgradeable proxy
- Filecoin/IPFS redundancy for prompt payloads
- On-chain MetadataURI validation via registry
