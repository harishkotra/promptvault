# TASKS.md

## Completed

### Milestone 1 — Environment & Contract

- [x] 1.1 Scaffold Hardhat project with `@cofhe/hardhat-plugin`
  - `hardhat.config.ts` with CoFHE plugin + Cancun EVM
  - `package.json` with pinned deps per SPEC §8.2
  - `tsconfig.json` per SPEC §8.3
- [x] 1.2 Place `PromptVault.sol` in `contracts/`
- [x] 1.3 Write deploy script (`scripts/deploy.ts`) per SPEC §8.5
- [x] 1.4 Configure environment (`.env`, `.env.example`, `.gitignore`)
- [x] 1.5 `npm install` + `npx hardhat compile` — **9 Solidity files compiled successfully**

### Milestone 2 — Contract Tests

- [x] 2.1 Write FHE test helpers (`test/helpers/fhe.ts`)
- [x] 2.2 `listPrompt` tests (10 tests: event emission, handle storage, metadata, listingCount, 6 revert cases)
- [x] 2.3 `purchasePrompt` tests (10 tests: ACL grant, hasPurchased, saleCount, earnings split, event, 4 revert cases, multi-buyer)
- [x] 2.4 `delistPrompt` tests (5 tests: active=false, event, buyer access preserved, 2 revert cases)
- [x] 2.5 `withdrawEarnings` tests (5 tests: ETH transfer, CEI pattern, event, 2 revert cases)
- [x] 2.6 `getKeyHandles` tests (4 tests: creator, buyer, revert non-authorised, revert invalid ID)
- [x] 2.7 `getListings` / `hasPurchased` / `pendingEarnings` / edge cases (6 tests)
- [x] **`npx hardhat test` — 41 tests passing**

## In Progress
- ...

## Remaining
- Milestone 3 — Frontend Scaffold + Core Libraries
- Milestone 4 — Hooks + Pages + User Flows
- Milestone 5 — Polish & Deploy
