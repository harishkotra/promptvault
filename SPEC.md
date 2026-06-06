# PromptVault — Software Design Document v1.0

**Product:** Encrypted AI Prompt Marketplace  
**Stack:** Solidity `^0.8.28` · Fhenix CoFHE · React · TypeScript · Hardhat  
**Network:** Ethereum Sepolia (CoFHE testnet) — `evmVersion: cancun`  
**Core FHE mechanic:** `FHE.allow(promptHandle, buyer)` + `decryptForView` with permit  
**Last updated:** June 2026

> **For the coding agent:** Read §5 (ACL Model) and §6 (contract source) before touching any other file. Then §8 (environment setup) to scaffold. The key insight this entire product is built on: `decryptForView` with a permit lets a buyer *use* a prompt client-side without the prompt ever appearing on-chain. The contract never sees plaintext at any point.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Why FHE Is Non-Negotiable](#2-why-fhe-is-non-negotiable)
3. [Product Overview](#3-product-overview)
4. [System Architecture](#4-system-architecture)
5. [ACL Permission Model](#5-acl-permission-model)
6. [Smart Contract — PromptVault.sol](#6-smart-contract--promptvaultsol)
7. [FHE Primitive Reference](#7-fhe-primitive-reference)
8. [Environment Setup](#8-environment-setup)
9. [Frontend Specification](#9-frontend-specification)
10. [Data Models](#10-data-models)
11. [User Flows](#11-user-flows)
12. [Error Reference](#12-error-reference)
13. [Testing Requirements](#13-testing-requirements)
14. [File & Folder Structure](#14-file--folder-structure)
15. [Official Documentation Index](#15-official-documentation-index)

---

## 1. Problem Statement

Prompt engineering is a real, high-value discipline. A well-crafted system prompt for a legal document reviewer, a code review agent, or a customer support bot can represent days of iterative work. Developers want to monetise these assets.

Every existing approach fails because of a single fundamental problem: **you cannot sell a secret and keep it secret at the same time on a public system.**

| Approach | Why it fails |
|---|---|
| Sell on Gumroad / Payhook | Buyer gets plaintext. They copy it, share it, re-sell it. No enforcement. |
| License agreement | Unenforceable. No technical mechanism prevents redistribution. |
| API wrapper | Creator runs infra, becomes a centralised middleman. Loses composability. |
| On-chain NFT | The "content" of the NFT must be public. Anyone can read it from contract state. |
| IPFS with encryption | The encryption key must be communicated to the buyer somehow — that's the hard part. No trustless mechanism for key transfer on payment. |

**PromptVault solves this.** The prompt is stored as an FHE ciphertext on-chain. The plaintext never appears — not in deployment, not in purchase, not ever on the chain. When a buyer pays, the contract calls `FHE.allow(promptHandle, buyer)` — granting exactly that address cryptographic permission to decrypt. The buyer uses `decryptForView` with their wallet-scoped permit to retrieve the plaintext client-side. Nobody else — including the contract, the marketplace operator, and Fhenix — can read it.

If the buyer screenshots and leaks the prompt, that is a social/legal problem. The technical guarantee is: **on-chain, the prompt is permanently sealed; decryption is wallet-gated.**

---

## 2. Why FHE Is Non-Negotiable

The product's core value proposition requires three properties simultaneously:

1. **The prompt must be verifiably stored on-chain** — so buyers trust it exists and cannot be rug-pulled.
2. **The prompt must be unreadable by non-buyers** — so creators trust their IP is protected before sale.
3. **Access must be granted trustlessly on payment** — no human in the loop, no off-chain key server.

No other cryptographic primitive satisfies all three:

- **Symmetric encryption + key escrow** requires trusting the key holder. Centralised. Revocable.
- **Asymmetric encryption to buyer pubkey** requires knowing the buyer's public key before they purchase. Not practical for open marketplace listings.
- **ZK proofs** can prove knowledge of a secret but cannot gate *access transfer* to a new address without re-encrypting.
- **FHE via Fhenix** stores the ciphertext on-chain (property 1). The ACL contract enforces that only the creator's address can initially decrypt (property 2). `FHE.allow(handle, buyer)` in the same transaction as payment atomically grants the buyer decrypt permission (property 3). No off-chain coordination. No trusted third party.

The `decryptForView` flow is key: the Threshold Network enforces the ACL. If `FHE.allow` was not called for the buyer's address, the decryption request is rejected at the Threshold Network level — not just at the contract level. This is cryptographic enforcement, not a require() check.

---

## 3. Product Overview

**Name:** PromptVault — Encrypted AI Prompt Marketplace

### Roles

| Role | Description |
|---|---|
| **Creator** | Lists a prompt by uploading the encrypted ciphertext + metadata. Sets the price in ETH. Receives proceeds on purchase. |
| **Buyer** | Pays the listed price in ETH. Receives `FHE.allow` access to the prompt ciphertext. Decrypts client-side with their permit. Uses it to call any LLM. |
| **Observer** | Can see listing metadata (title, category, price, sale count) but never the prompt content. |

### Prompt Listing Lifecycle

```
DRAFT → LISTED → [purchases] → DELISTED (optional)
```

| State | Condition | What's public |
|---|---|---|
| `LISTED` | `listPrompt` called | title, category, price, creator, saleCount |
| `PURCHASED` (per buyer) | `purchasePrompt` called, ETH paid | buyer address added to access list (on ACL) |
| `DELISTED` | Creator calls `delistPrompt` | listing marked inactive, no new purchases |

The encrypted prompt ciphertext is **always** on-chain but **never** readable without an explicit `FHE.allow` grant. Even before any purchase, only the creator can decrypt it.

### What "use but not copy" means technically

`decryptForView` with a permit is UI-only decryption. The plaintext is returned to the buyer's browser. It is **never submitted to any transaction, never logged on-chain, never in calldata**. The buyer feeds it to an LLM API call (Anthropic, OpenAI, etc.) in their own app. If they close the browser tab, it's gone. The on-chain ciphertext remains sealed.

This is fundamentally different from `decryptForTx` which publishes plaintext to public chain state. `decryptForView` is specifically designed for "use privately, don't publish."

Reference: https://www.fhenix.io/blog/decryption-in-cofhe-evolved

---

## 4. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     FRONTEND  (React + Next.js)                  │
│                                                                  │
│  /marketplace    Browse listings (title, price, sale count)      │
│  /list           Creator uploads + encrypts prompt, sets price   │
│  /listing/[id]   Detail view · Purchase button · Use prompt UI   │
│  /my-prompts     Creator dashboard (earnings, delist)            │
└──────────────────────────┬───────────────────────────────────────┘
                           │  @cofhe/sdk
                           │  · encrypt(prompt, FheTypes.String/bytes)
                           │  · decryptForView(ctHash).withPermit(permit)
                           │  · permits.getOrCreateSelfPermit()
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      PromptVault.sol                             │
│                                                                  │
│  listPrompt(InEbytes, metadata, price)   → listingId            │
│  purchasePrompt(listingId)  payable       → emits Purchased      │
│  delistPrompt(listingId)                 → marks inactive        │
│  withdrawEarnings()                      → transfer ETH          │
│                                                                  │
│  Reads: getListing · getPromptHandle · getListings               │
│         hasPurchased · creatorEarnings                           │
│                                                                  │
│  import "@fhenixprotocol/cofhe-contracts/FHE.sol"               │
└──────────────────────────┬───────────────────────────────────────┘
                           │  FHE.allow(promptHandle, buyer)
                           │  stored in on-chain ACL contract
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     CoFHE ACL CONTRACT                           │
│  persistedAllowedPairs[handle][address] = true                  │
│  Enforced by Threshold Network on every decryption request       │
└──────────────────────────┬───────────────────────────────────────┘
                           │  buyer calls decryptForView off-chain
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                   THRESHOLD NETWORK  (MPC)                       │
│  Checks ACL: is buyer allowed on promptHandle?                   │
│  If yes  → returns plaintext (UI-only, never on-chain)           │
│  If no   → rejects decryption request                            │
└──────────────────────────────────────────────────────────────────┘
```

**Core invariant:** The prompt ciphertext is written to the contract once (at listing time) and never modified. Access control is the only thing that changes — via `FHE.allow(handle, buyer)` in `purchasePrompt`. The prompt plaintext never touches the chain.

---

## 5. ACL Permission Model

### The fundamental mechanic

`FHE.allow(handle, address)` grants a specific address **permanent, persistent** access to a ciphertext handle. This is stored in the on-chain ACL contract's mapping:

```
persistedAllowedPairs[handle][address] = true
```

Once set, it cannot be revoked. This is by design: a buyer who paid for access should not have that access revoked by the creator.

The Threshold Network enforces this ACL when `decryptForView` is called. If the requesting wallet is not in the ACL for that handle, decryption is denied at the cryptographic layer.

Reference: https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/access-control  
Reference: https://cofhe-docs.fhenix.zone/tutorials/acl-usage-examples

### Complete permission table

| Handle | Created in | `allowThis` | `allow(creator)` | `allow(buyer)` | `allowPublic` | Notes |
|---|---|:---:|:---:|:---:|:---:|---|
| `promptHandle` | `listPrompt` | ✓ | ✓ | ✓ on purchase | — | Contract retains for re-granting; creator can verify their listing; each buyer gets access on payment |

### Why `allowThis` on the prompt handle

The contract stores the `promptHandle` in the `Listing` struct. If `FHE.allowThis` is not called at listing time, the contract cannot use or re-reference the handle in future transactions — including `purchasePrompt` where it needs to call `FHE.allow(handle, buyer)`. Without `allowThis`, that call would revert with `ACLNotAllowed`.

### Why `allow(creator)` at listing time

The creator should be able to call `decryptForView` on their own listing to verify the ciphertext was stored correctly. Without this, they are blind to what they listed. `FHE.allowSender` during `listPrompt` achieves this (since `msg.sender == creator` at that point).

### Why NOT `allowPublic`

`allowPublic` would let anyone decrypt the prompt without paying. This is the exact problem we're solving. It must **never** be called on prompt handles.

### `decryptForView` vs `decryptForTx` — critical distinction

| | `decryptForView` | `decryptForTx` |
|---|---|---|
| Plaintext destination | Browser only, never on-chain | On-chain calldata / state |
| Permit required | Always | Only if not `allowPublic` |
| On-chain effect | None | Publishes plaintext permanently |
| Use case | **This product** — buyer reads prompt | Auction reveals, unshield flows |

PromptVault **only ever uses `decryptForView`**. The plaintext never goes on-chain. This is the core "use but don't publish" guarantee.

Reference: https://www.fhenix.io/blog/decryption-in-cofhe-evolved

---

## 6. Smart Contract — PromptVault.sol

> **This is the canonical source.** Do not modify ACL grants, pragma, or payment logic without re-reading §5.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// ─────────────────────────────────────────────────────────────────────────────
//  PromptVault — Encrypted AI Prompt Marketplace  v1.0
//
//  WHAT IT DOES
//  ─────────────
//  Creators list AI system prompts as FHE ciphertexts. Buyers pay ETH to get
//  FHE.allow access. Buyers then call decryptForView client-side to retrieve
//  the plaintext privately — it never touches the chain.
//
//  ACL STRATEGY
//  ─────────────
//  Handle           allowThis   allow(creator)   allow(buyer)   allowPublic
//  ───────────────  ─────────   ──────────────   ────────────   ───────────
//  promptHandle        ✓             ✓ (*)         ✓ (**)          NEVER
//
//  (*) Set via FHE.allowSender() at listPrompt — creator can verify listing.
//  (**) Set via FHE.allow(handle, msg.sender) in purchasePrompt after payment.
//
//  KEY DOCS
//  ─────────
//  Access Control:  https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/access-control
//  ACL Examples:    https://cofhe-docs.fhenix.zone/tutorials/acl-usage-examples
//  Inputs:          https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/inputs
//  Decryption:      https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/decryption-operations
//  View vs Publish: https://www.fhenix.io/blog/decryption-in-cofhe-evolved
// ─────────────────────────────────────────────────────────────────────────────

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract PromptVault {

    // ─── Errors ──────────────────────────────────────────────────────────────

    error ListingDoesNotExist(uint256 listingId);
    error NotListingCreator(uint256 listingId, address caller);
    error ListingNotActive(uint256 listingId);
    error AlreadyPurchased(uint256 listingId, address buyer);
    error IncorrectPayment(uint256 sent, uint256 required);
    error EmptyTitle();
    error EmptyCategory();
    error ZeroPrice();
    error NoEarningsToWithdraw();
    error WithdrawalFailed();
    error CreatorCannotBuyOwnPrompt(uint256 listingId);

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice A new prompt has been listed. The ciphertext is NOT emitted —
    ///         only metadata. The handle is stored privately in contract state.
    event PromptListed(
        uint256 indexed listingId,
        address indexed creator,
        string  title,
        string  category,
        uint256 priceWei
    );

    /// @notice A buyer paid and received FHE.allow access to the prompt.
    event PromptPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 pricePaid
    );

    /// @notice Creator delisted the prompt. No new purchases possible.
    event PromptDelisted(uint256 indexed listingId);

    /// @notice Creator withdrew their accumulated earnings.
    event EarningsWithdrawn(address indexed creator, uint256 amount);

    // ─── Types ───────────────────────────────────────────────────────────────

    struct Listing {
        address  creator;
        string   title;        // Display name — public
        string   category;     // e.g. "coding", "legal", "customer-support" — public
        string   metadataURI;  // Optional IPFS URI to extended description — public
        uint256  priceWei;     // Price in wei — public
        uint32   saleCount;    // Total purchases — public
        bool     active;       // False after delistPrompt

        // ── FHE handle ───────────────────────────────────────────────────────
        // The encrypted prompt. Accessible only to:
        //   - this contract (via allowThis) — to call FHE.allow(handle, buyer)
        //   - creator (via allowSender at listing time) — to verify their listing
        //   - buyers (via allow(handle, buyer) in purchasePrompt) — to use prompt
        // NEVER granted allowPublic.
        ebytes128 promptHandle;

        uint256 createdAt;
    }

    // ─── Constants ───────────────────────────────────────────────────────────

    /// Maximum title length in bytes
    uint256 public constant MAX_TITLE_LENGTH    = 100;

    /// Maximum category length in bytes
    uint256 public constant MAX_CATEGORY_LENGTH = 50;

    /// Platform fee in basis points (250 = 2.5%)
    uint256 public constant PLATFORM_FEE_BPS    = 250;

    /// Basis points denominator
    uint256 public constant BPS_DENOMINATOR     = 10_000;

    // ─── Storage ─────────────────────────────────────────────────────────────

    uint256 public listingCount;

    /// Platform fee recipient (deployer)
    address public immutable feeRecipient;

    mapping(uint256 => Listing) private _listings;

    /// listingId => buyer => purchased
    mapping(uint256 => mapping(address => bool)) private _hasPurchased;

    /// creator => accumulated ETH earnings (after platform fee, before withdrawal)
    mapping(address => uint256) private _earnings;

    // ─────────────────────────────────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor() {
        feeRecipient = msg.sender;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  listPrompt
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice List an encrypted prompt on the marketplace.
     *
     * @param encryptedPrompt  InEbytes128 produced by cofhejs on the client.
     *                         The client encrypts the prompt string as bytes
     *                         before sending. The InEbytes struct carries a ZK
     *                         proof verified by FHE.asEbytes128.
     * @param title            Public display name (max 100 bytes).
     * @param category         Public category tag (max 50 bytes).
     * @param metadataURI      Optional IPFS CID or URL for extended description.
     * @param priceWei         Price in wei. Must be > 0.
     * @return listingId       New listing identifier (1-indexed).
     *
     * @dev  ACL grants at listing time:
     *         promptHandle → FHE.allowThis   — contract can call FHE.allow in purchasePrompt
     *         promptHandle → FHE.allowSender — creator can decryptForView to verify
     *
     *       NEVER call FHE.allowPublic on a prompt handle. This would destroy
     *       the entire value proposition of the marketplace.
     *
     *       Encoding: the client must encode the prompt as UTF-8 bytes and pad/
     *       chunk to fit ebytes128 (128 encrypted bytes). For prompts longer than
     *       128 bytes, chunk into multiple ebytes128 and list as a bundle (future
     *       feature). For the MVP, truncate or enforce max 128 bytes client-side.
     *
     *       Ref: https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/inputs
     *       Ref: https://cofhe-docs.fhenix.zone/tutorials/acl-usage-examples
     */
    function listPrompt(
        InEbytes128 calldata encryptedPrompt,
        string      calldata title,
        string      calldata category,
        string      calldata metadataURI,
        uint256              priceWei
    ) external returns (uint256 listingId) {

        // ── Validation ───────────────────────────────────────────────────────
        if (bytes(title).length    == 0)                   revert EmptyTitle();
        if (bytes(title).length    >  MAX_TITLE_LENGTH)    revert EmptyTitle();
        if (bytes(category).length == 0)                   revert EmptyCategory();
        if (bytes(category).length >  MAX_CATEGORY_LENGTH) revert EmptyCategory();
        if (priceWei               == 0)                   revert ZeroPrice();

        // ── Unwrap FHE input ─────────────────────────────────────────────────
        // FHE.asEbytes128 validates the ZK proof embedded in InEbytes128.
        // Do NOT store InEbytes128 in contract state — it carries metadata
        // that inflates gas costs. Always convert and store the ebytes128 handle.
        ebytes128 handle = FHE.asEbytes128(encryptedPrompt);

        // ── ACL grants ───────────────────────────────────────────────────────
        // 1. Contract must retain access so it can call FHE.allow(handle, buyer)
        //    in purchasePrompt. Without this, that call reverts with ACLNotAllowed.
        FHE.allowThis(handle);

        // 2. Grant creator access to verify their own listing via decryptForView.
        //    FHE.allowSender() = FHE.allow(handle, msg.sender) — more efficient.
        FHE.allowSender(handle);

        // ── Store listing ────────────────────────────────────────────────────
        listingId = ++listingCount;
        Listing storage l = _listings[listingId];

        l.creator       = msg.sender;
        l.title         = title;
        l.category      = category;
        l.metadataURI   = metadataURI;
        l.priceWei      = priceWei;
        l.active        = true;
        l.promptHandle  = handle;
        l.createdAt     = block.timestamp;

        emit PromptListed(listingId, msg.sender, title, category, priceWei);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  purchasePrompt
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Purchase a listed prompt. Pays the creator and grants FHE.allow
     *         access to the buyer in the same atomic transaction.
     *
     * @param listingId  The listing to purchase.
     *
     * @dev  This is the core FHE mechanic of the entire product.
     *
     *       FHE.allow(l.promptHandle, msg.sender) grants the buyer persistent
     *       ACL access. The on-chain ACL contract records:
     *         persistedAllowedPairs[handle][buyer] = true
     *
     *       After this tx confirms, the buyer can call:
     *         client.decryptForView(ctHash, utype).withPermit(permit).execute()
     *       and receive the plaintext in their browser. This never goes on-chain.
     *
     *       Payment split:
     *         platform fee  = msg.value × PLATFORM_FEE_BPS / BPS_DENOMINATOR
     *         creator share = msg.value - platform fee
     *         Both are accumulated in _earnings for pull-withdrawal.
     *
     *       Why pull-withdrawal instead of direct transfer?
     *         Direct transfer in a purchase flow can fail if the recipient is a
     *         contract with a reverting fallback. Pull-withdrawal (creator calls
     *         withdrawEarnings separately) is the safe pattern.
     *
     *       Ref: https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/access-control
     *       Ref: https://cofhe-docs.fhenix.zone/tutorials/acl-usage-examples (Pattern: allow user)
     */
    function purchasePrompt(uint256 listingId) external payable {
        _requireListingExists(listingId);

        Listing storage l = _listings[listingId];

        if (!l.active)
            revert ListingNotActive(listingId);
        if (_hasPurchased[listingId][msg.sender])
            revert AlreadyPurchased(listingId, msg.sender);
        if (msg.sender == l.creator)
            revert CreatorCannotBuyOwnPrompt(listingId);
        if (msg.value != l.priceWei)
            revert IncorrectPayment(msg.value, l.priceWei);

        // ── Grant FHE access to buyer ─────────────────────────────────────────
        // THE CORE MECHANIC: atomically grant the buyer decrypt permission in the
        // same transaction as payment. No off-chain coordination required.
        // FHE.allow grants persistent (permanent) ACL access.
        // The contract can call this because FHE.allowThis was called in listPrompt.
        FHE.allow(l.promptHandle, msg.sender);

        // ── Accounting ────────────────────────────────────────────────────────
        _hasPurchased[listingId][msg.sender] = true;
        l.saleCount++;

        uint256 platformFee   = (msg.value * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorShare  = msg.value - platformFee;

        _earnings[l.creator]  += creatorShare;
        _earnings[feeRecipient] += platformFee;

        emit PromptPurchased(listingId, msg.sender, msg.value);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  delistPrompt
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Delist a prompt. No new purchases are possible.
     *         Existing buyers retain their FHE.allow access — it is permanent.
     *
     * @dev  ACL grants are immutable. Delistment only prevents new purchases;
     *       it cannot revoke access for buyers who already paid.
     *       This is intentional — buyers must be able to trust their purchase.
     */
    function delistPrompt(uint256 listingId) external {
        _requireListingExists(listingId);

        Listing storage l = _listings[listingId];

        if (l.creator != msg.sender)
            revert NotListingCreator(listingId, msg.sender);
        if (!l.active)
            revert ListingNotActive(listingId);

        l.active = false;

        emit PromptDelisted(listingId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  withdrawEarnings
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Pull-withdraw accumulated ETH earnings.
     * @dev    Uses the checks-effects-interactions pattern to prevent reentrancy.
     *         Zero the balance before the external call.
     */
    function withdrawEarnings() external {
        uint256 amount = _earnings[msg.sender];
        if (amount == 0) revert NoEarningsToWithdraw();

        _earnings[msg.sender] = 0;  // Zero before external call (CEI pattern)

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert WithdrawalFailed();

        emit EarningsWithdrawn(msg.sender, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  View Functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Return public metadata for a listing.
     * @dev    Does NOT return the promptHandle. The handle is only returned via
     *         getPromptHandle(), which is gated to buyers and the creator.
     */
    function getListing(uint256 listingId)
        external view
        returns (
            address  creator,
            string memory title,
            string memory category,
            string memory metadataURI,
            uint256  priceWei,
            uint32   saleCount,
            bool     active,
            uint256  createdAt
        )
    {
        _requireListingExists(listingId);
        Listing storage l = _listings[listingId];
        return (
            l.creator, l.title, l.category, l.metadataURI,
            l.priceWei, l.saleCount, l.active, l.createdAt
        );
    }

    /**
     * @notice Return the prompt ciphertext handle.
     * @dev    Gated to the creator and buyers who have purchased.
     *         The handle is a bytes32 reference — not the plaintext.
     *         The caller uses it as input to decryptForView off-chain:
     *
     *           const ctHash = await contract.getPromptHandle(listingId);
     *           const prompt = await client
     *             .decryptForView(ctHash, FheTypes.Ebytes128)
     *             .withPermit(permit)
     *             .execute();
     *           // prompt is the plaintext string — never goes on-chain
     *
     *         If the caller does not have FHE.allow access, the Threshold
     *         Network will reject the decryptForView request regardless.
     *         This gate is a UX convenience, not the security enforcement.
     *         Security is enforced cryptographically by the TN + ACL contract.
     *
     *         Ref: https://cofhe-docs.fhenix.zone/client-sdk/guides/decrypt-to-view
     *         Ref: https://www.fhenix.io/blog/decryption-in-cofhe-evolved
     */
    function getPromptHandle(uint256 listingId)
        external view
        returns (ebytes128)
    {
        _requireListingExists(listingId);
        Listing storage l = _listings[listingId];

        bool isCreator = (msg.sender == l.creator);
        bool isBuyer   = _hasPurchased[listingId][msg.sender];

        require(isCreator || isBuyer, "PromptVault: not authorised");
        return l.promptHandle;
    }

    /**
     * @notice Return all listing IDs (paginated).
     * @dev    Returns up to `limit` listing IDs starting from `offset`.
     *         Use for browsing the marketplace.
     */
    function getListings(uint256 offset, uint256 limit)
        external view
        returns (uint256[] memory ids)
    {
        uint256 total = listingCount;
        if (offset >= total) return new uint256[](0);

        uint256 end   = offset + limit > total ? total : offset + limit;
        ids = new uint256[](end - offset);
        for (uint256 i = 0; i < ids.length; i++) {
            ids[i] = offset + i + 1; // listings are 1-indexed
        }
    }

    /**
     * @notice Check if an address has purchased a listing.
     */
    function hasPurchased(uint256 listingId, address buyer)
        external view
        returns (bool)
    {
        _requireListingExists(listingId);
        return _hasPurchased[listingId][buyer];
    }

    /**
     * @notice Return the accumulated earnings for an address.
     */
    function creatorEarnings(address creator)
        external view
        returns (uint256)
    {
        return _earnings[creator];
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Internal
    // ─────────────────────────────────────────────────────────────────────────

    function _requireListingExists(uint256 listingId) internal view {
        if (listingId == 0 || listingId > listingCount)
            revert ListingDoesNotExist(listingId);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Security Properties
// ─────────────────────────────────────────────────────────────────────────────
//
//  1. PROMPT CIPHERTEXT NEVER LEAVES FHE SYSTEM
//     The prompt is submitted as InEbytes128 (FHE-encrypted), stored as ebytes128.
//     No FHE operation in this contract decrypts it. No plaintext appears in any
//     transaction, event, or state variable. Ever.
//
//  2. allowPublic IS NEVER CALLED
//     The promptHandle has allowThis (contract) and allow(creator/buyers) only.
//     allowPublic would let anyone decrypt without paying. This is explicitly
//     prohibited and has no code path that reaches it.
//
//  3. FHE.allow IS ATOMIC WITH PAYMENT
//     purchasePrompt is a single transaction. The ETH payment and the
//     FHE.allow(handle, buyer) call are in the same tx. There is no window
//     where ETH is paid but access is not granted, or vice versa.
//
//  4. EXISTING BUYER ACCESS IS IRREVOCABLE
//     FHE.allow grants are permanent. delistPrompt cannot revoke buyer access.
//     This protects buyers — they paid for something and they keep it.
//
//  5. PULL WITHDRAWAL PREVENTS REENTRANCY
//     Earnings are accumulated in a mapping. Withdrawal follows CEI:
//     zero the balance, then transfer. No reentrancy vector.
//
//  6. CONTRACT ACL GATE IS UX, NOT SECURITY
//     getPromptHandle requires caller to be creator or buyer. But even if
//     an attacker bypasses this and gets the handle, the Threshold Network
//     enforces the ACL cryptographically — decryptForView will be rejected
//     if the requesting wallet is not in persistedAllowedPairs.
//
//  7. PLATFORM FEE IS HARDCODED AND IMMUTABLE
//     PLATFORM_FEE_BPS = 250 (2.5%). No admin function to change it.
//     feeRecipient is set at deploy time and immutable.
// ─────────────────────────────────────────────────────────────────────────────
```

---

## 7. FHE Primitive Reference

Every FHE function used in this contract with its exact purpose and doc link.

| Operation | Function | Used in | Purpose | Doc |
|---|---|---|---|---|
| Unwrap encrypted bytes input | `FHE.asEbytes128(InEbytes128)` | `listPrompt` | Verify ZK proof, convert to storable handle | https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/inputs |
| Grant contract persistent access | `FHE.allowThis(handle)` | `listPrompt` | Enables `FHE.allow(handle, buyer)` in future txs | https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/access-control |
| Grant sender (creator) access | `FHE.allowSender(handle)` | `listPrompt` | Creator can `decryptForView` their own listing | https://cofhe-docs.fhenix.zone/tutorials/acl-usage-examples |
| Grant specific address access | `FHE.allow(handle, address)` | `purchasePrompt` | Buyer gains decrypt access atomically with payment | https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/access-control |

### What is intentionally NEVER used

- **`FHE.allowPublic`** — would destroy the access-gating mechanism entirely.
- **`FHE.publishDecryptResult`** — prompts are never revealed on-chain.
- **`FHE.add`, `FHE.div`, arithmetic** — no computation on encrypted values needed.
- **`FHE.select`, comparisons** — no conditional FHE logic needed.

### `ebytes128` type note

Prompts are stored as `ebytes128` — 128 encrypted bytes. The client must encode the prompt as UTF-8, ensure it fits in 128 bytes (or implement multi-chunk bundling for longer prompts), and encrypt it as bytes using `cofhejs`. On decryption, the client decodes the bytes back to a UTF-8 string.

For MVP: enforce ≤128 bytes client-side with a character counter. A 128-byte prompt is sufficient for a focused system prompt (e.g. "You are a senior Solidity auditor. Review the provided code and return a JSON array of vulnerability findings with severity, description, and line number.").

---

## 8. Environment Setup

### 8.1 Prerequisites

- Node.js **v22 LTS or higher** — check with `node --version`
- A funded Sepolia wallet for gas

### 8.2 `package.json`

```json
{
  "name": "promptvault",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "compile": "npx hardhat compile",
    "deploy":  "npx hardhat run scripts/deploy.ts --network sepolia",
    "test":    "npx hardhat test"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^6.1.2",
    "hardhat":    "^2.22.3",
    "ts-node":    "^10.9.2",
    "typescript": "^6.0.2"
  },
  "dependencies": {
    "@cofhe/hardhat-plugin":              "^0.4.0",
    "@cofhe/sdk":                         "0.4.0",
    "@fhenixprotocol/cofhe-contracts":    "0.1.0",
    "dotenv":                             "^17.3.1"
  }
}
```

### 8.3 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target":              "ES2020",
    "module":              "commonjs",
    "strict":              true,
    "esModuleInterop":     true,
    "resolveJsonModule":   true,
    "rootDir":             ".",
    "outDir":              "dist",
    "moduleResolution":    "node",
    "skipLibCheck":        true,
    "ignoreDeprecations":  "6.0"
  },
  "include": ["./scripts", "./test", "./typechain-types"],
  "files":   ["./hardhat.config.ts"]
}
```

> `"rootDir": "."` fixes TS5011. `"ignoreDeprecations": "6.0"` silences TypeScript 6 moduleResolution warnings. Both required.

### 8.4 `hardhat.config.ts`

```typescript
import "@cofhe/hardhat-plugin";           // MUST be first import
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: any = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",              // required for CoFHE contracts
    },
  },
  networks: {
    sepolia: {
      url:      process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
```

### 8.5 `scripts/deploy.ts`

```typescript
import { ethers } from "hardhat";

async function main() {
  const Factory  = await ethers.getContractFactory("PromptVault");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();              // ethers v6 — NOT .deployed()
  const address  = await contract.getAddress();    // ethers v6 — NOT .address
  console.log("PromptVault deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### 8.6 `.env`

```bash
# Deployment & testing
PRIVATE_KEY=0x...
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Frontend
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_CHAIN_ID=11155111
```

### 8.7 Install and compile

```bash
npm install
npx hardhat compile
# → Compiled N Solidity files successfully
```

### 8.8 Deploy

```bash
npm run deploy
# → PromptVault deployed to: 0x...
```

Paste the address into `NEXT_PUBLIC_CONTRACT_ADDRESS`.

---

## 9. Frontend Specification

### 9.1 Stack

- Next.js 14 (App Router) + TypeScript
- Wagmi + Viem for wallet connection
- `@cofhe/sdk` for all FHE operations
- Tailwind CSS

### 9.2 Pages

| Route | Audience | Key function |
|---|---|---|
| `/marketplace` | All | Browse listings: title, category, price, sale count |
| `/list` | Creator | Encrypt prompt, set metadata + price, call `listPrompt` |
| `/listing/[id]` | All / Buyer | See metadata; purchase button; "Use Prompt" UI for buyers |
| `/my-prompts` | Creator | View owned listings, earnings, delist button |

### 9.3 CoFHE client setup

```typescript
// lib/cofhe.ts
import { createCofheClient } from "@cofhe/sdk";

export const cofheClient = createCofheClient();

export async function connectCofhe(walletClient: any, publicClient: any) {
  await cofheClient.connect(publicClient, walletClient);
  // Create or load a self-permit scoped to this wallet + chain
  await cofheClient.permits.getOrCreateSelfPermit();
}
```

Reference: https://cofhe-docs.fhenix.zone/client-sdk/guides/client-setup

### 9.4 Creator: encrypt and list a prompt

```typescript
// hooks/useListPrompt.ts
import { FheTypes } from "@cofhe/sdk";
import { cofheClient } from "../lib/cofhe";
import { TextEncoder } from "util";

export async function listPrompt(
  contract:    any,
  promptText:  string,   // raw plaintext — never sent to the chain
  title:       string,
  category:    string,
  metadataURI: string,
  priceEth:    string    // e.g. "0.01"
) {
  // Encode prompt to UTF-8 bytes — max 128 bytes for ebytes128
  const promptBytes = new TextEncoder().encode(promptText);
  if (promptBytes.length > 128) throw new Error("Prompt exceeds 128 bytes");

  // Encrypt client-side — cofhejs attaches ZK proof to InEbytes128
  const encryptedPrompt = await cofheClient.encrypt(
    promptBytes,
    FheTypes.Ebytes128
  );

  const priceWei = parseEther(priceEth);

  const tx = await contract.listPrompt(
    encryptedPrompt,
    title,
    category,
    metadataURI,
    priceWei
  );
  await tx.wait();
}
```

Reference: https://cofhe-docs.fhenix.zone/client-sdk/guides/encrypting-inputs

### 9.5 Buyer: purchase a prompt

```typescript
// hooks/usePurchase.ts
export async function purchasePrompt(
  contract:  any,
  listingId: bigint,
  priceWei:  bigint
) {
  const tx = await contract.purchasePrompt(listingId, { value: priceWei });
  await tx.wait();
  // After this tx: FHE.allow(handle, msg.sender) is on-chain
  // The buyer can now call decryptForView
}
```

### 9.6 Buyer: decrypt and use a prompt

This is the `decryptForView` flow — the prompt appears in the browser and **never goes on-chain**.

```typescript
// hooks/usePrompt.ts
import { FheTypes } from "@cofhe/sdk";
import { cofheClient } from "../lib/cofhe";

export async function getPromptPlaintext(
  contract:  any,
  listingId: bigint
): Promise<string> {
  // Step 1: Get the ciphertext handle from the contract
  // Only works if msg.sender is creator or buyer (contract-level gate)
  const ctHash = await contract.getPromptHandle(listingId);

  // Step 2: Get or create a permit scoped to this wallet
  const permit = await cofheClient.permits.getOrCreateSelfPermit();

  // Step 3: Decrypt client-side via Threshold Network
  // withPermit() because we used FHE.allow (not allowPublic)
  // This is decryptForView — the plaintext stays in the browser, never on-chain
  const decryptedBytes = await cofheClient
    .decryptForView(ctHash, FheTypes.Ebytes128)
    .withPermit(permit)
    .execute();

  // Step 4: Decode bytes back to UTF-8 string
  return new TextDecoder().decode(decryptedBytes);
}
```

Reference: https://www.fhenix.io/blog/decryption-in-cofhe-evolved  
Reference: https://cofhe-docs.fhenix.zone/client-sdk/guides/permits

### 9.7 "Use Prompt" UI — calling the LLM

After decryption, the buyer enters their message and calls an LLM directly from the browser with the decrypted prompt as the system message:

```typescript
// components/UsePromptUI.tsx
async function runWithPrompt(systemPrompt: string, userMessage: string) {
  // System prompt: decrypted from FHE — never sent back to chain
  // User message: provided by buyer at use-time
  const response = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ systemPrompt, userMessage })
  });
  return response.json();
}
```

The `/api/chat` route calls Anthropic (or any LLM). The `systemPrompt` is in the request body of a server-side API call — never in any blockchain transaction.

---

## 10. Data Models

### On-chain (contract state)

| Field | Type | Visibility | Notes |
|---|---|---|---|
| `creator` | `address` | public (via `getListing`) | |
| `title` | `string` | public | Display name |
| `category` | `string` | public | Filter/browse tag |
| `metadataURI` | `string` | public | Extended description link |
| `priceWei` | `uint256` | public | Price in wei |
| `saleCount` | `uint32` | public | Total purchases |
| `active` | `bool` | public | False after delist |
| `promptHandle` | `ebytes128` | private (exposed via gated getter) | FHE ciphertext — never plaintext |
| `createdAt` | `uint256` | public | Unix timestamp |

### Listing metadata JSON (stored at `metadataURI`, off-chain — optional)

```json
{
  "title": "Senior Solidity Auditor",
  "description": "Reviews Solidity code for security vulnerabilities. Returns structured JSON findings.",
  "category": "coding",
  "model": "claude-sonnet-4-20250514",
  "tokenEstimate": 120,
  "exampleOutput": "{ \"findings\": [ ... ] }"
}
```

### Prompt size constraint

`ebytes128` = 128 encrypted bytes. At ~4 bytes per UTF-8 character for ASCII text, this is approximately 128 ASCII characters. For MVP, enforce this client-side with a live byte counter in the listing form. Future: `ebytes256` or multi-handle bundles for longer prompts.

---

## 11. User Flows

### Flow A — Creator lists a prompt

```
Creator connects wallet (Sepolia)
→ /list: types prompt text (≤128 bytes, shown live)
→ Fills in title, category, price (e.g. 0.01 ETH), optional metadata URI
→ Clicks "Encrypt & List"
→ cofhejs encodes prompt to UTF-8 bytes → encrypts to InEbytes128 (with ZK proof)
→ listPrompt() sent on-chain
→ Contract: FHE.asEbytes128 verifies ZK proof
→ Contract: FHE.allowThis(handle) + FHE.allowSender(handle)
→ Listing stored with encrypted handle
→ Redirect to /listing/[id]
→ Creator can optionally call getPromptHandle → decryptForView to verify
```

### Flow B — Buyer purchases and uses a prompt

```
Buyer browses /marketplace — sees titles, categories, prices, sale counts
→ Clicks listing → /listing/[id]
→ Sees metadata, price
→ Clicks "Purchase (0.01 ETH)"
→ purchasePrompt() sent on-chain with msg.value = priceWei
→ Contract: FHE.allow(l.promptHandle, msg.sender) — buyer gains decrypt access
→ Contract: earnings accumulated, saleCount incremented
→ UI updates: "Purchased ✓ — Decrypt to use"

→ Buyer clicks "Decrypt & Use"
→ Frontend: getPromptHandle(listingId) → ctHash
→ Frontend: cofhejs permits.getOrCreateSelfPermit()
→ Frontend: decryptForView(ctHash, FheTypes.Ebytes128).withPermit(permit).execute()
→ Threshold Network checks ACL: buyer is allowed ✓
→ Returns plaintext bytes → decoded to UTF-8 string in browser
→ UI shows "Use Prompt" text input
→ Buyer types their message → /api/chat called with system prompt
→ LLM response displayed

Prompt never touched the chain. Ciphertext remains sealed.
```

### Flow C — Creator delists and withdraws

```
Creator → /my-prompts
→ Sees active listings with earnings
→ Clicks "Delist" on a listing
→ delistPrompt() called — listing.active = false
→ Existing buyers keep FHE.allow access. No new purchases.

→ Clicks "Withdraw Earnings"
→ withdrawEarnings() called
→ Contract: zeroes _earnings[creator], transfers ETH
→ Creator receives ETH
```

---

## 12. Error Reference

### Contract custom errors

| Error | Trigger | Resolution |
|---|---|---|
| `ListingDoesNotExist(id)` | `listingId == 0` or `> listingCount` | Valid listing ID |
| `NotListingCreator(id, caller)` | Non-creator calls `delistPrompt` | Call from creator wallet |
| `ListingNotActive(id)` | Buying or delisting an already-delisted listing | Check `active` flag |
| `AlreadyPurchased(id, buyer)` | Same address buys twice | One purchase per address per listing |
| `IncorrectPayment(sent, required)` | `msg.value != priceWei` | Pass exact `priceWei` as value |
| `EmptyTitle()` | Empty or too-long title | 1–100 bytes |
| `EmptyCategory()` | Empty or too-long category | 1–50 bytes |
| `ZeroPrice()` | `priceWei == 0` | Non-zero price |
| `NoEarningsToWithdraw()` | `_earnings[msg.sender] == 0` | Only call after a sale |
| `WithdrawalFailed()` | ETH transfer to creator failed | Check creator wallet is EOA or has payable fallback |
| `CreatorCannotBuyOwnPrompt(id)` | Creator tries to purchase own listing | Cannot self-purchase |

### FHE / CoFHE errors

| Error | Cause | Fix |
|---|---|---|
| `ACLNotAllowed` in `purchasePrompt` | `FHE.allowThis` was not called at listing time | Ensure `listPrompt` calls `FHE.allowThis(handle)` |
| `decryptForView` rejected by TN | Buyer's wallet not in ACL (purchase not confirmed yet) | Wait for `purchasePrompt` tx to confirm before decrypting |
| `decryptForView` rejected by TN | Wrong permit (different wallet or chain) | Permit must be scoped to the calling wallet + Sepolia chainId |
| ZK proof invalid in `listPrompt` | Malformed `InEbytes128` | Use `cofhejs.encrypt(bytes, FheTypes.Ebytes128)` — do not construct manually |

Reference: https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/common-errors

---

## 13. Testing Requirements

### 13.1 Use the CoFHE Hardhat plugin

Do not mock FHE calls. The `@cofhe/hardhat-plugin` provides mock contracts for local testing where encrypted values can be inspected.

Reference: https://cofhe-docs.fhenix.zone/client-sdk/hardhat-plugin/getting-started  
Reference: https://cofhe-docs.fhenix.zone/client-sdk/hardhat-plugin/testing

### 13.2 Required test cases

**`listPrompt`**
- Emits `PromptListed` with correct args
- Stores encrypted handle (decrypt and assert bytes match input)
- Sets `active = true`, `saleCount = 0`, correct `priceWei`
- `FHE.allowThis` is set — contract can call `FHE.allow` in subsequent tx
- `FHE.allowSender` is set — creator can `decryptForView` their listing
- Reverts `EmptyTitle` if title is empty or > 100 bytes
- Reverts `EmptyCategory` if category is empty or > 50 bytes
- Reverts `ZeroPrice` if `priceWei == 0`

**`purchasePrompt`**
- `FHE.allow(handle, buyer)` grants buyer decrypt access (verify via `decryptForView` in test)
- `_hasPurchased[id][buyer]` is true after purchase
- `saleCount` increments by 1
- Creator earnings = `msg.value × (10000 - 250) / 10000`
- Platform fee earnings = `msg.value × 250 / 10000`
- Reverts `ListingNotActive` if listing is delisted
- Reverts `AlreadyPurchased` on duplicate purchase
- Reverts `CreatorCannotBuyOwnPrompt` if creator tries to buy own listing
- Reverts `IncorrectPayment` if `msg.value != priceWei`

**`delistPrompt`**
- Sets `active = false`
- Emits `PromptDelisted`
- Does NOT revoke existing buyers' FHE.allow access
- Reverts `NotListingCreator` for non-creator caller
- Reverts `ListingNotActive` if already delisted

**`withdrawEarnings`**
- Transfers correct ETH to creator
- Zeroes `_earnings[creator]` before transfer (CEI pattern)
- Reverts `NoEarningsToWithdraw` if balance is 0

**`getPromptHandle`**
- Returns handle to creator
- Returns handle to buyer who purchased
- Reverts for address that has not purchased

**End-to-end integration test**

```
deploy → listPrompt (encrypt "test prompt") → purchasePrompt (buyer pays)
→ getPromptHandle (buyer) → decryptForView (buyer) → assert plaintext == "test prompt"
→ getPromptHandle (non-buyer) → assert reverts
```

---

## 14. File & Folder Structure

```
promptvault/
├── contracts/
│   └── PromptVault.sol              # §6 — canonical source
│
├── scripts/
│   ├── deploy.ts                    # ethers v6 deploy (§8.5)
│   └── verify.ts                    # optional Etherscan verification
│
├── test/
│   ├── PromptVault.test.ts          # full test suite (§13)
│   └── helpers/
│       └── fhe.ts                   # encrypt/decrypt helpers for tests
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── marketplace/
│   │   │   │   └── page.tsx         # /marketplace — browse listings
│   │   │   ├── list/
│   │   │   │   └── page.tsx         # /list — creator listing form
│   │   │   ├── listing/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # /listing/[id]
│   │   │   ├── my-prompts/
│   │   │   │   └── page.tsx         # /my-prompts — creator dashboard
│   │   │   └── api/
│   │   │       └── chat/
│   │   │           └── route.ts     # server-side LLM proxy
│   │   ├── components/
│   │   │   ├── ListingCard.tsx      # marketplace card
│   │   │   ├── ListPromptForm.tsx   # encrypt + list flow
│   │   │   ├── PurchaseButton.tsx   # payment + FHE.allow trigger
│   │   │   ├── UsePromptUI.tsx      # decryptForView + LLM call
│   │   │   └── EarningsPanel.tsx    # creator withdrawEarnings
│   │   ├── hooks/
│   │   │   ├── useCofhe.ts          # client init + permit management
│   │   │   ├── useListPrompt.ts     # encrypt + listPrompt
│   │   │   ├── usePurchase.ts       # purchasePrompt
│   │   │   ├── usePrompt.ts         # getPromptHandle + decryptForView
│   │   │   └── useEarnings.ts       # creatorEarnings + withdrawEarnings
│   │   ├── lib/
│   │   │   ├── contract.ts          # ABI import + typed contract factory
│   │   │   ├── cofhe.ts             # shared CofheClient singleton
│   │   │   └── chain.ts             # Sepolia chain config
│   │   └── types/
│   │       └── listing.ts           # TypeScript types for Listing struct
│   └── public/
│
├── hardhat.config.ts                # §8.4
├── tsconfig.json                    # §8.3
├── package.json                     # §8.2
├── .env                             # §8.6 — NEVER commit
├── .env.example                     # committed template
└── .gitignore                       # must include .env, node_modules
```

---

## 15. Official Documentation Index

**Read in this order before writing any code:**

1. ACL access control (core mechanic): https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/access-control
2. ACL usage patterns: https://cofhe-docs.fhenix.zone/tutorials/acl-usage-examples
3. View vs Publish decryption (critical for this product): https://www.fhenix.io/blog/decryption-in-cofhe-evolved
4. Inputs & ZK proofs: https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/inputs
5. Auction example (structural reference): https://cofhe-docs.fhenix.zone/fhe-library/examples/auction-example

### Complete reference table

| Topic | URL |
|---|---|
| **FHE Library** | |
| Overview | https://cofhe-docs.fhenix.zone/fhe-library/introduction/overview |
| Quick Start | https://cofhe-docs.fhenix.zone/fhe-library/introduction/quick-start |
| Best Practices | https://cofhe-docs.fhenix.zone/fhe-library/introduction/best-practices |
| Inputs | https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/inputs |
| Access Control | https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/access-control |
| Decryption Operations | https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/decryption-operations |
| Common Errors | https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/common-errors |
| FHE.sol Reference | https://cofhe-docs.fhenix.zone/fhe-library/reference/fhe-sol |
| Error Reference (all 53) | https://cofhe-docs.fhenix.zone/fhe-library/reference/cofhe-errors-reference |
| Auction Example | https://cofhe-docs.fhenix.zone/fhe-library/examples/auction-example |
| **Tutorials** | |
| ACL Usage Examples | https://cofhe-docs.fhenix.zone/tutorials/acl-usage-examples |
| Your First FHE Contract | https://cofhe-docs.fhenix.zone/tutorials/your-first-fhe-contract |
| **Client SDK** | |
| SDK Overview | https://cofhe-docs.fhenix.zone/client-sdk/introduction/overview |
| Client Setup | https://cofhe-docs.fhenix.zone/client-sdk/guides/client-setup |
| Encrypting Inputs | https://cofhe-docs.fhenix.zone/client-sdk/guides/encrypting-inputs |
| Permits | https://cofhe-docs.fhenix.zone/client-sdk/guides/permits |
| Decrypt to View | https://cofhe-docs.fhenix.zone/client-sdk/guides/decrypt-to-view |
| React Quick Start | https://cofhe-docs.fhenix.zone/client-sdk/quick-start/react |
| SDK Reference | https://cofhe-docs.fhenix.zone/client-sdk/reference/sdk-reference |
| **Testing** | |
| Hardhat Plugin | https://cofhe-docs.fhenix.zone/client-sdk/hardhat-plugin/getting-started |
| Hardhat Testing | https://cofhe-docs.fhenix.zone/client-sdk/hardhat-plugin/testing |
| **Fhenix Blog** | |
| View vs Publish Decryption | https://www.fhenix.io/blog/decryption-in-cofhe-evolved |
| **AI Coding Assistant** | |
| NEO (FHE AI assistant) | https://cofhe-docs.fhenix.zone/get-started/build-with-ai/ai-assistant |
| NEO core.md (load into context) | https://github.com/marronjo/fhe-assistant |
| **Full doc index** | https://cofhe-docs.fhenix.zone/llms.txt |

---

*The coding agent should start with §8 (environment), place the contract from §6 into `contracts/PromptVault.sol`, compile, then build frontend. The entire product pivots on one mechanic: `FHE.allow(handle, buyer)` in `purchasePrompt` + `decryptForView` with permit in the frontend. Everything else is scaffolding around that.*
