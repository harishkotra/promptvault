import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Encryptable } from "@cofhe/sdk";
import type { CofheClient } from "@cofhe/sdk";
import type {
  PromptVault,
  MockTaskManager,
  MockACL,
} from "../typechain-types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

// ── Fixtures ──────────────────────────────────────────────────────────────────

async function deployFixture() {
  const [deployer, creator, buyer, other] = await hre.ethers.getSigners();

  const Factory = await hre.ethers.getContractFactory("PromptVault");
  const contract = (await Factory.connect(deployer).deploy()) as unknown as PromptVault;
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  const creatorClient = await hre.cofhe.createClientWithBatteries(creator);
  const buyerClient = await hre.cofhe.createClientWithBatteries(buyer);

  const feeRecipient = await contract.feeRecipient();

  return {
    contract,
    contractAddress,
    deployer,
    creator,
    buyer,
    other,
    creatorClient,
    buyerClient,
    feeRecipient,
  };
}

async function listedFixture() {
  const ctx = await deployFixture();
  const { contract, creator, creatorClient } = ctx;

  const encrypted = await creatorClient
    .encryptInputs([Encryptable.uint128(100001n), Encryptable.uint128(200002n)])
    .execute();

  const priceWei = hre.ethers.parseEther("0.01");
  const tx = await contract
    .connect(creator)
    .listPrompt(
      encrypted[0],
      encrypted[1],
      "Test Prompt",
      "coding",
      "https://example.com",
      "QmTest123",
      priceWei
    );
  await tx.wait();

  return { ...ctx, encrypted, priceWei };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function encryptPair(
  client: CofheClient,
  v0: bigint,
  v1: bigint
): Promise<[any, any]> {
  const result = await client
    .encryptInputs([Encryptable.uint128(v0), Encryptable.uint128(v1)])
    .execute();
  return [result[0], result[1]];
}

// ── listPrompt ─────────────────────────────────────────────────────────────────

describe("listPrompt", () => {
  it("emits PromptListed with correct arguments", async () => {
    const { contract, creator, creatorClient } = await loadFixture(
      deployFixture
    );

    const [e0, e1] = await encryptPair(creatorClient, 10n, 20n);
    const priceWei = hre.ethers.parseEther("0.01");

    const tx = await contract
      .connect(creator)
      .listPrompt(e0, e1, "Test Prompt", "coding", "", "QmTest", priceWei);

    await expect(tx)
      .to.emit(contract, "PromptListed")
      .withArgs(1n, creator.address, "Test Prompt", "coding", priceWei);
  });

  it("stores handles and returns them via getKeyHandles to creator", async () => {
    const { contract, creator, creatorClient } = await loadFixture(
      deployFixture
    );

    const [e0, e1] = await encryptPair(creatorClient, 10n, 20n);
    const priceWei = hre.ethers.parseEther("0.01");

    await contract
      .connect(creator)
      .listPrompt(e0, e1, "Test Prompt", "coding", "", "QmTest", priceWei);

    const handles = await contract.connect(creator).getKeyHandles(1);
    expect(handles.keyPart0).to.not.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(handles.keyPart1).to.not.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("sets listing metadata correctly", async () => {
    const { contract, creator, creatorClient } = await loadFixture(
      deployFixture
    );

    const [e0, e1] = await encryptPair(creatorClient, 10n, 20n);
    const priceWei = hre.ethers.parseEther("0.05");

    await contract
      .connect(creator)
      .listPrompt(
        e0,
        e1,
        "My Prompt",
        "legal",
        "ipfs://QmDesc",
        "QmCid1234",
        priceWei
      );

    const listing = await contract.getListing(1);

    expect(listing.creator).to.equal(creator.address);
    expect(listing.title).to.equal("My Prompt");
    expect(listing.category).to.equal("legal");
    expect(listing.metadataURI).to.equal("ipfs://QmDesc");
    expect(listing.promptCID).to.equal("QmCid1234");
    expect(listing.priceWei).to.equal(priceWei);
    expect(listing.saleCount).to.equal(0);
    expect(listing.active).to.equal(true);
    expect(listing.createdAt).to.be.gt(0);
  });

  it("increments listingCount", async () => {
    const { contract, creator, creatorClient } = await loadFixture(
      deployFixture
    );

    const [e0, e1] = await encryptPair(creatorClient, 10n, 20n);

    await contract
      .connect(creator)
      .listPrompt(e0, e1, "A", "b", "", "Qm1", hre.ethers.parseEther("0.01"));

    expect(await contract.listingCount()).to.equal(1n);

    const [f0, f1] = await encryptPair(creatorClient, 30n, 40n);
    await contract
      .connect(creator)
      .listPrompt(f0, f1, "B", "c", "", "Qm2", hre.ethers.parseEther("0.02"));

    expect(await contract.listingCount()).to.equal(2n);
  });

  it("reverts EmptyTitle when title is empty", async () => {
    const { contract, creator, creatorClient } = await loadFixture(
      deployFixture
    );

    const [e0, e1] = await encryptPair(creatorClient, 10n, 20n);

    await expect(
      contract
        .connect(creator)
        .listPrompt(e0, e1, "", "coding", "", "QmTest", hre.ethers.parseEther("0.01"))
    ).to.be.revertedWithCustomError(contract, "EmptyTitle");
  });

  it("reverts TitleTooLong when title exceeds 100 bytes", async () => {
    const { contract, creator, creatorClient } = await loadFixture(
      deployFixture
    );

    const [e0, e1] = await encryptPair(creatorClient, 10n, 20n);
    const longTitle = "x".repeat(101);

    await expect(
      contract
        .connect(creator)
        .listPrompt(e0, e1, longTitle, "coding", "", "QmTest", hre.ethers.parseEther("0.01"))
    ).to.be.revertedWithCustomError(contract, "TitleTooLong");
  });

  it("reverts EmptyCategory when category is empty", async () => {
    const { contract, creator, creatorClient } = await loadFixture(
      deployFixture
    );

    const [e0, e1] = await encryptPair(creatorClient, 10n, 20n);

    await expect(
      contract
        .connect(creator)
        .listPrompt(e0, e1, "Test", "", "", "QmTest", hre.ethers.parseEther("0.01"))
    ).to.be.revertedWithCustomError(contract, "EmptyCategory");
  });

  it("reverts CategoryTooLong when category exceeds 50 bytes", async () => {
    const { contract, creator, creatorClient } = await loadFixture(
      deployFixture
    );

    const [e0, e1] = await encryptPair(creatorClient, 10n, 20n);
    const longCat = "x".repeat(51);

    await expect(
      contract
        .connect(creator)
        .listPrompt(e0, e1, "Test", longCat, "", "QmTest", hre.ethers.parseEther("0.01"))
    ).to.be.revertedWithCustomError(contract, "CategoryTooLong");
  });

  it("reverts EmptyPromptCID when promptCID is empty", async () => {
    const { contract, creator, creatorClient } = await loadFixture(
      deployFixture
    );

    const [e0, e1] = await encryptPair(creatorClient, 10n, 20n);

    await expect(
      contract
        .connect(creator)
        .listPrompt(e0, e1, "Test", "coding", "", "", hre.ethers.parseEther("0.01"))
    ).to.be.revertedWithCustomError(contract, "EmptyPromptCID");
  });

  it("reverts ZeroPrice when priceWei is zero", async () => {
    const { contract, creator, creatorClient } = await loadFixture(
      deployFixture
    );

    const [e0, e1] = await encryptPair(creatorClient, 10n, 20n);

    await expect(
      contract
        .connect(creator)
        .listPrompt(e0, e1, "Test", "coding", "", "QmTest", 0)
    ).to.be.revertedWithCustomError(contract, "ZeroPrice");
  });
});

// ── purchasePrompt ─────────────────────────────────────────────────────────────

describe("purchasePrompt", () => {
  it("grants FHE.allow to buyer (verified by successful getKeyHandles)", async () => {
    const { contract, creator, buyer, creatorClient } = await loadFixture(
      listedFixture
    );

    await contract
      .connect(buyer)
      .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") });

    const handles = await contract.connect(buyer).getKeyHandles(1);
    expect(handles.keyPart0).to.not.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(handles.keyPart1).to.not.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("marks _hasPurchased as true", async () => {
    const { contract, buyer } = await loadFixture(listedFixture);

    expect(await contract.hasPurchased(1, buyer.address)).to.equal(false);

    await contract
      .connect(buyer)
      .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") });

    expect(await contract.hasPurchased(1, buyer.address)).to.equal(true);
  });

  it("increments saleCount", async () => {
    const { contract, buyer } = await loadFixture(listedFixture);

    const before = await contract.getListing(1);
    expect(before.saleCount).to.equal(0);

    await contract
      .connect(buyer)
      .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") });

    const after = await contract.getListing(1);
    expect(after.saleCount).to.equal(1);
  });

  it("accumulates creator earnings (97.5% after 2.5% fee)", async () => {
    const { contract, creator, buyer, feeRecipient } =
      await loadFixture(listedFixture);

    const priceWei = hre.ethers.parseEther("0.01");
    const platformFee = (priceWei * 250n) / 10000n;
    const creatorShare = priceWei - platformFee;

    await contract
      .connect(buyer)
      .purchasePrompt(1, { value: priceWei });

    expect(await contract.pendingEarnings(creator.address)).to.equal(
      creatorShare
    );
    expect(await contract.pendingEarnings(feeRecipient)).to.equal(platformFee);
  });

  it("emits PromptPurchased with correct args", async () => {
    const { contract, buyer } = await loadFixture(listedFixture);

    const priceWei = hre.ethers.parseEther("0.01");

    const tx = await contract
      .connect(buyer)
      .purchasePrompt(1, { value: priceWei });

    await expect(tx)
      .to.emit(contract, "PromptPurchased")
      .withArgs(1n, buyer.address, priceWei);
  });

  it("reverts ListingNotActive when listing is delisted", async () => {
    const { contract, creator, buyer } = await loadFixture(listedFixture);

    await contract.connect(creator).delistPrompt(1);

    await expect(
      contract
        .connect(buyer)
        .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") })
    ).to.be.revertedWithCustomError(contract, "ListingNotActive");
  });

  it("reverts AlreadyPurchased on duplicate purchase", async () => {
    const { contract, buyer } = await loadFixture(listedFixture);

    await contract
      .connect(buyer)
      .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") });

    await expect(
      contract
        .connect(buyer)
        .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") })
    ).to.be.revertedWithCustomError(contract, "AlreadyPurchased");
  });

  it("reverts CreatorCannotBuyOwnPrompt when creator buys own listing", async () => {
    const { contract, creator } = await loadFixture(listedFixture);

    await expect(
      contract
        .connect(creator)
        .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") })
    ).to.be.revertedWithCustomError(contract, "CreatorCannotBuyOwnPrompt");
  });

  it("reverts IncorrectPayment when msg.value != priceWei", async () => {
    const { contract, buyer } = await loadFixture(listedFixture);

    await expect(
      contract
        .connect(buyer)
        .purchasePrompt(1, { value: hre.ethers.parseEther("0.02") })
    ).to.be.revertedWithCustomError(contract, "IncorrectPayment");
  });

  it("allows multiple different buyers to purchase the same listing", async () => {
    const { contract, buyer, other } = await loadFixture(listedFixture);

    await contract
      .connect(buyer)
      .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") });

    const tx = await contract
      .connect(other)
      .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") });

    await expect(tx)
      .to.emit(contract, "PromptPurchased")
      .withArgs(1n, other.address, hre.ethers.parseEther("0.01"));

    const listing = await contract.getListing(1);
    expect(listing.saleCount).to.equal(2);
  });
});

// ── delistPrompt ───────────────────────────────────────────────────────────────

describe("delistPrompt", () => {
  it("sets active to false", async () => {
    const { contract, creator } = await loadFixture(listedFixture);

    await contract.connect(creator).delistPrompt(1);

    const listing = await contract.getListing(1);
    expect(listing.active).to.equal(false);
  });

  it("emits PromptDelisted", async () => {
    const { contract, creator } = await loadFixture(listedFixture);

    const tx = await contract.connect(creator).delistPrompt(1);

    await expect(tx).to.emit(contract, "PromptDelisted").withArgs(1n);
  });

  it("does not affect existing buyer access", async () => {
    const { contract, creator, buyer } = await loadFixture(listedFixture);

    await contract
      .connect(buyer)
      .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") });

    await contract.connect(creator).delistPrompt(1);

    const handles = await contract.connect(buyer).getKeyHandles(1);
    expect(handles.keyPart0).to.not.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("reverts NotListingCreator for non-creator caller", async () => {
    const { contract, buyer } = await loadFixture(listedFixture);

    await expect(
      contract.connect(buyer).delistPrompt(1)
    ).to.be.revertedWithCustomError(contract, "NotListingCreator");
  });

  it("reverts ListingNotActive if already delisted", async () => {
    const { contract, creator } = await loadFixture(listedFixture);

    await contract.connect(creator).delistPrompt(1);

    await expect(
      contract.connect(creator).delistPrompt(1)
    ).to.be.revertedWithCustomError(contract, "ListingNotActive");
  });
});

// ── withdrawEarnings ───────────────────────────────────────────────────────────

describe("withdrawEarnings", () => {
  it("transfers correct ETH to creator", async () => {
    const { contract, creator, buyer } = await loadFixture(listedFixture);

    const priceWei = hre.ethers.parseEther("0.01");
    const platformFee = (priceWei * 250n) / 10000n;
    const creatorShare = priceWei - platformFee;

    await contract
      .connect(buyer)
      .purchasePrompt(1, { value: priceWei });

    const before = await hre.ethers.provider.getBalance(creator.address);

    const tx = await contract.connect(creator).withdrawEarnings();
    const receipt = await tx.wait();
    const gasCost =
      receipt!.gasUsed * receipt!.gasPrice;

    const after = await hre.ethers.provider.getBalance(creator.address);
    expect(after - before + gasCost).to.equal(creatorShare);
  });

  it("zeroes _earnings before transfer (CEI pattern)", async () => {
    const { contract, creator, buyer } = await loadFixture(listedFixture);

    await contract
      .connect(buyer)
      .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") });

    expect(await contract.pendingEarnings(creator.address)).to.be.gt(0);

    await contract.connect(creator).withdrawEarnings();

    expect(await contract.pendingEarnings(creator.address)).to.equal(0);
  });

  it("emits EarningsWithdrawn", async () => {
    const { contract, creator, buyer } = await loadFixture(listedFixture);

    await contract
      .connect(buyer)
      .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") });

    const tx = await contract.connect(creator).withdrawEarnings();

    await expect(tx)
      .to.emit(contract, "EarningsWithdrawn")
      .withArgs(creator.address, hre.ethers.parseEther("0.00975"));
  });

  it("reverts NoEarningsToWithdraw when balance is zero", async () => {
    const { contract, other } = await loadFixture(listedFixture);

    await expect(
      contract.connect(other).withdrawEarnings()
    ).to.be.revertedWithCustomError(contract, "NoEarningsToWithdraw");
  });

  it("allows feeRecipient to withdraw platform fees", async () => {
    const { contract, deployer, buyer } = await loadFixture(
      listedFixture
    );
    const feeRecipientAddr = await contract.feeRecipient();

    await contract
      .connect(buyer)
      .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") });

    const before = await hre.ethers.provider.getBalance(feeRecipientAddr);

    const tx = await contract.connect(deployer).withdrawEarnings();
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;

    const platformFee = (hre.ethers.parseEther("0.01") * 250n) / 10000n;
    const after = await hre.ethers.provider.getBalance(feeRecipientAddr);
    expect(after - before + gasCost).to.equal(platformFee);
  });
});

// ── getKeyHandles ──────────────────────────────────────────────────────────────

describe("getKeyHandles", () => {
  it("returns handles to creator", async () => {
    const { contract, creator } = await loadFixture(listedFixture);

    const handles = await contract.connect(creator).getKeyHandles(1);
    expect(handles.keyPart0).to.not.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(handles.keyPart1).to.not.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("returns handles to buyer after purchase", async () => {
    const { contract, buyer } = await loadFixture(listedFixture);

    await contract
      .connect(buyer)
      .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") });

    const handles = await contract.connect(buyer).getKeyHandles(1);
    expect(handles.keyPart0).to.not.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(handles.keyPart1).to.not.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("reverts NotAuthorised for non-creator non-buyer", async () => {
    const { contract, other } = await loadFixture(listedFixture);

    await expect(
      contract.connect(other).getKeyHandles(1)
    ).to.be.revertedWithCustomError(contract, "NotAuthorised");
  });

  it("reverts ListingDoesNotExist for invalid listingId", async () => {
    const { contract, creator } = await loadFixture(listedFixture);

    await expect(
      contract.connect(creator).getKeyHandles(99)
    ).to.be.revertedWithCustomError(contract, "ListingDoesNotExist");
  });
});

// ── getListings ────────────────────────────────────────────────────────────────

describe("getListings", () => {
  it("returns empty array when no listings", async () => {
    const { contract } = await loadFixture(deployFixture);

    const ids = await contract.getListings(0, 10);
    expect(ids.length).to.equal(0);
  });

  it("returns listing IDs with pagination", async () => {
    const { contract, creator, creatorClient } = await loadFixture(
      deployFixture
    );

    for (let i = 0; i < 5; i++) {
      const [e0, e1] = await encryptPair(creatorClient, BigInt(i * 10 + 1), BigInt(i * 10 + 2));
      await contract
        .connect(creator)
        .listPrompt(e0, e1, `Title ${i}`, "cat", "", "QmCid", hre.ethers.parseEther("0.01"));
    }

    const all = await contract.getListings(0, 10);
    expect(all).to.deep.equal([1n, 2n, 3n, 4n, 5n]);

    const page = await contract.getListings(2, 2);
    expect(page).to.deep.equal([3n, 4n]);
  });
});

// ── hasPurchased ───────────────────────────────────────────────────────────────

describe("hasPurchased", () => {
  it("returns false before purchase, true after", async () => {
    const { contract, buyer } = await loadFixture(listedFixture);

    expect(await contract.hasPurchased(1, buyer.address)).to.equal(false);

    await contract
      .connect(buyer)
      .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") });

    expect(await contract.hasPurchased(1, buyer.address)).to.equal(true);
  });
});

// ── pendingEarnings ────────────────────────────────────────────────────────────

describe("pendingEarnings", () => {
  it("returns zero for address with no earnings", async () => {
    const { contract, other } = await loadFixture(deployFixture);

    expect(await contract.pendingEarnings(other.address)).to.equal(0);
  });

  it("returns accumulated earnings after purchase", async () => {
    const { contract, creator, buyer } = await loadFixture(listedFixture);

    await contract
      .connect(buyer)
      .purchasePrompt(1, { value: hre.ethers.parseEther("0.01") });

    const priceWei = hre.ethers.parseEther("0.01");
    const creatorShare = priceWei - (priceWei * 250n) / 10000n;

    expect(await contract.pendingEarnings(creator.address)).to.equal(
      creatorShare
    );
  });
});

// ── Edge Cases ─────────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("allows creator to list and verify via getKeyHandles", async () => {
    const { contract, creator, creatorClient } = await loadFixture(
      deployFixture
    );

    const [e0, e1] = await encryptPair(creatorClient, 12345n, 67890n);
    await contract
      .connect(creator)
      .listPrompt(e0, e1, "Verify Test", "test", "", "QmVerify", hre.ethers.parseEther("0.01"));

    const handles = await contract.connect(creator).getKeyHandles(1);
    expect(handles.keyPart0).to.not.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );

    // Verify handles are stored in listing via getListing (indirectly)
    const listing = await contract.getListing(1);
    expect(listing.creator).to.equal(creator.address);
    expect(listing.promptCID).to.equal("QmVerify");
  });

  it("reverts ListingDoesNotExist for zero and out-of-range IDs", async () => {
    const { contract } = await loadFixture(deployFixture);

    await expect(
      contract.getListing(0)
    ).to.be.revertedWithCustomError(contract, "ListingDoesNotExist");

    await expect(
      contract.getListing(1)
    ).to.be.revertedWithCustomError(contract, "ListingDoesNotExist");
  });
});
