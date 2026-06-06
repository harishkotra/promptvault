// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// ─────────────────────────────────────────────────────────────────────────────
//  PromptVault — Encrypted AI Prompt Marketplace  v1.0
//
//  DESIGN DECISION: HOW THE PROMPT IS STORED
//  ──────────────────────────────────────────

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract PromptVault {

    error ListingDoesNotExist(uint256 listingId);
    error NotListingCreator(uint256 listingId);
    error ListingNotActive(uint256 listingId);
    error AlreadyPurchased(uint256 listingId, address buyer);
    error IncorrectPayment(uint256 sent, uint256 required);
    error EmptyTitle();
    error TitleTooLong();
    error EmptyCategory();
    error CategoryTooLong();
    error EmptyPromptCID();
    error ZeroPrice();
    error NoEarningsToWithdraw();
    error WithdrawalFailed();
    error CreatorCannotBuyOwnPrompt(uint256 listingId);
    error NotAuthorised(uint256 listingId, address caller);

    /// @notice A new prompt has been listed.
    /// @dev    keyPart0/keyPart1 handles are NOT emitted — only metadata.
    event PromptListed(
        uint256 indexed listingId,
        address indexed creator,
        string  title,
        string  category,
        uint256 priceWei
    );

    /// @notice Buyer paid and received FHE.allow access to both key parts.
    event PromptPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 pricePaid
    );

    /// @notice Creator removed the listing. Existing buyers keep access.
    event PromptDelisted(uint256 indexed listingId);

    /// @notice ETH earnings withdrawn.
    event EarningsWithdrawn(address indexed recipient, uint256 amount);

    struct Listing {
        address creator;
        string  title;          // Public display name
        string  category;       // Public category tag (e.g. "coding", "legal")
        string  metadataURI;    // Optional IPFS URI for extended description
        string  promptCID;      // IPFS CID of the AES-encrypted prompt ciphertext
                                // This is PUBLIC — useless without the FHE-gated key
        uint256 priceWei;       // Price in wei — public
        uint32  saleCount;      // Total purchases — public
        bool    active;

        // ── FHE key handles ──────────────────────────────────────────────────
        // The 256-bit AES key is split into two euint128 halves and stored as
        // FHE ciphertexts. Neither half appears anywhere in plaintext on-chain.
        //
        // Concat to recover key: bytes32(uint256(key0) << 128 | uint256(key1))
        //
        // ACL: allowThis (contract re-grants on purchase) +
        //      allowSender (creator can verify) +
        //      allow(buyer) on purchase
        //
        // NEVER allowPublic — this would expose the AES key.
        euint128 keyPart0;
        euint128 keyPart1;

        uint256 createdAt;
    }

    uint256 public constant MAX_TITLE_LENGTH    = 100;
    uint256 public constant MAX_CATEGORY_LENGTH = 50;

    /// Platform fee: 250 basis points = 2.5%
    uint256 public constant PLATFORM_FEE_BPS = 250;
    uint256 public constant BPS_DENOMINATOR  = 10_000;

    uint256 public listingCount;

    /// Set at deploy, immutable, receives platform fees
    address public immutable feeRecipient;

    mapping(uint256 => Listing)                       private _listings;
    mapping(uint256 => mapping(address => bool))      private _hasPurchased;
    mapping(address => uint256)                       private _earnings;

    constructor() {
        feeRecipient = msg.sender;
    }

    function listPrompt(
        InEuint128 calldata encryptedKey0,
        InEuint128 calldata encryptedKey1,
        string     calldata title,
        string     calldata category,
        string     calldata metadataURI,
        string     calldata promptCID,
        uint256             priceWei
    ) external returns (uint256 listingId) {

        if (bytes(title).length    == 0)                    revert EmptyTitle();
        if (bytes(title).length    >  MAX_TITLE_LENGTH)     revert TitleTooLong();
        if (bytes(category).length == 0)                    revert EmptyCategory();
        if (bytes(category).length >  MAX_CATEGORY_LENGTH)  revert CategoryTooLong();
        if (bytes(promptCID).length == 0)                   revert EmptyPromptCID();
        if (priceWei               == 0)                    revert ZeroPrice();

        // FHE.asEuint128 validates the ZK proof in each InEuint128.
        // The ZK proof proves the ciphertext is well-formed and was created
        // by the caller — it does NOT prove the key is valid AES.
        euint128 kp0 = FHE.asEuint128(encryptedKey0);
        euint128 kp1 = FHE.asEuint128(encryptedKey1);

        // Contract must retain persistent access so purchasePrompt can call
        // FHE.allow(kp0, buyer) in a future transaction.
        // Without allowThis, that future call reverts with ACLNotAllowed.
        FHE.allowThis(kp0);
        FHE.allowThis(kp1);

        // Creator can verify their own listing via decryptForView.
        // FHE.allowSender() is equivalent to FHE.allow(handle, msg.sender).
        FHE.allowSender(kp0);
        FHE.allowSender(kp1);

        listingId = ++listingCount;
        Listing storage l = _listings[listingId];

        l.creator      = msg.sender;
        l.title        = title;
        l.category     = category;
        l.metadataURI  = metadataURI;
        l.promptCID    = promptCID;
        l.priceWei     = priceWei;
        l.active       = true;
        l.keyPart0     = kp0;
        l.keyPart1     = kp1;
        l.createdAt    = block.timestamp;

        emit PromptListed(listingId, msg.sender, title, category, priceWei);
    }

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

        // ── Grant FHE key access to buyer ────────────────────────────────────
        // FHE.allow grants PERMANENT access. Cannot be revoked.
        // Buyer owns these key parts forever once this tx confirms.
        // The contract can call this because FHE.allowThis was set in listPrompt.
        FHE.allow(l.keyPart0, msg.sender);
        FHE.allow(l.keyPart1, msg.sender);

        // ── Accounting ────────────────────────────────────────────────────────
        _hasPurchased[listingId][msg.sender] = true;
        l.saleCount++;

        uint256 platformFee  = (msg.value * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorShare = msg.value - platformFee;

        _earnings[l.creator]   += creatorShare;
        _earnings[feeRecipient] += platformFee;

        emit PromptPurchased(listingId, msg.sender, msg.value);
    }

    function delistPrompt(uint256 listingId) external {
        _requireListingExists(listingId);

        Listing storage l = _listings[listingId];

        if (l.creator != msg.sender) revert NotListingCreator(listingId);
        if (!l.active)               revert ListingNotActive(listingId);

        l.active = false;

        emit PromptDelisted(listingId);
    }

    function withdrawEarnings() external {
        uint256 amount = _earnings[msg.sender];
        if (amount == 0) revert NoEarningsToWithdraw();

        _earnings[msg.sender] = 0;  // zero BEFORE the external call

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert WithdrawalFailed();

        emit EarningsWithdrawn(msg.sender, amount);
    }

    function getListing(uint256 listingId)
        external view
        returns (
            address creator,
            string memory title,
            string memory category,
            string memory metadataURI,
            string memory promptCID,
            uint256 priceWei,
            uint32  saleCount,
            bool    active,
            uint256 createdAt
        )
    {
        _requireListingExists(listingId);
        Listing storage l = _listings[listingId];
        return (
            l.creator, l.title, l.category, l.metadataURI, l.promptCID,
            l.priceWei, l.saleCount, l.active, l.createdAt
        );
    }

    function getKeyHandles(uint256 listingId)
        external view
        returns (euint128 keyPart0, euint128 keyPart1)
    {
        _requireListingExists(listingId);
        Listing storage l = _listings[listingId];

        bool authorised = (msg.sender == l.creator) ||
                          _hasPurchased[listingId][msg.sender];
        if (!authorised) revert NotAuthorised(listingId, msg.sender);

        return (l.keyPart0, l.keyPart1);
    }

    function getListings(uint256 offset, uint256 limit)
        external view
        returns (uint256[] memory ids)
    {
        uint256 total = listingCount;
        if (offset >= total) return new uint256[](0);

        uint256 end = offset + limit > total ? total : offset + limit;
        ids = new uint256[](end - offset);
        for (uint256 i = 0; i < ids.length; i++) {
            ids[i] = offset + i + 1; // 1-indexed listings
        }
    }

    function hasPurchased(uint256 listingId, address buyer)
        external view
        returns (bool)
    {
        _requireListingExists(listingId);
        return _hasPurchased[listingId][buyer];
    }

    function pendingEarnings(address account)
        external view
        returns (uint256)
    {
        return _earnings[account];
    }

    function _requireListingExists(uint256 listingId) internal view {
        if (listingId == 0 || listingId > listingCount)
            revert ListingDoesNotExist(listingId);
    }
}