# E2E Smoke Test Plan

## Prerequisites
- MetaMask wallet connected to Sepolia with test ETH
- Contract deployed at `NEXT_PUBLIC_CONTRACT_ADDRESS`
- Pinata JWT set in `NEXT_PUBLIC_PINATA_JWT`

## Test Flow

### 1. Marketplace Load (unauthenticated)
1. Open `/marketplace` without wallet connected
2. Expect: NavBar shows "Connect Wallet", empty state "No listings found"

### 2. Wallet Connection
1. Click "Connect Wallet"
2. MetaMask prompts — approve
3. Expect: truncated address shown in NavBar

### 3. List a Prompt
1. Click "+ List Prompt" in NavBar
2. Fill: title, category, price (e.g. `0.001`), paste prompt text
3. Submit — observe spinner "Encrypting & Listing..."
4. Expect: success screen with "Prompt Listed!" and listing ID
5. Note: ensure MetaMask confirms the `listPrompt` tx

### 4. Verify Listing in Marketplace
1. Navigate to `/marketplace`
2. Expect: new listing card visible with title, category, price

### 5. View Listing Detail
1. Click the listing card
2. Expect: full detail page with title, creator, price (ETH), Purchase button

### 6. Purchase a Prompt (second wallet)
1. Switch to a different MetaMask account
2. Navigate to the listing
3. Click "Purchase" — observe spinner "Purchasing & Decrypting..."
4. MetaMask confirms `purchasePrompt` tx with value
5. Expect: decrypted prompt text displayed below the button

### 7. My Prompts
1. Navigate to `/my-prompts`
2. Expect: purchased listing card visible

### 8. Edge Cases
- **Own listing**: creator visits their own listing — should show "This is your own listing" with no purchase button
- **Delisted**: if creator delists, listing shows "no longer active"
- **Double purchase**: same wallet tries to buy again — should show error
