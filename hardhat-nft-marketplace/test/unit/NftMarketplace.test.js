const { assert, expect } = require("chai");
const { deployments, ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NftMarketplace Unit Tests", function () {
        let nftMarketplace, nftMarketplaceContract, nftMarketplaceAddress, basicNft, basicNftContract, user, deployer;
        const PRICE = ethers.utils.parseEther("0.1");
        const TOKEN_ID = 0;

        beforeEach(async () => {
            accounts = await ethers.getSigners();
            deployer = accounts[0];
            user = accounts[1];
            await deployments.fixture("all");
            nftMarketplaceContract = await ethers.getContract("NftMarketplace");
            nftMarketplace = nftMarketplaceContract.connect(user);
            basicNftContract = await ethers.getContract("BasicNft");
            basicNft = basicNftContract.connect(user);
            await basicNft.mintNft();
            await basicNft.approve(nftMarketplace.address, TOKEN_ID);
        });
        describe("listItem", function () {
            it("emits an event when an item is Listed", async () => {
                await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(nftMarketplace, "ItemListed");
            });
            it("reverts if item is already listed", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                const error = `AlreadyListed("${basicNft.address}", ${TOKEN_ID})`;
                await expect(
                    nftMarketplace.listItem(
                        basicNft.address, 
                        TOKEN_ID, 
                        PRICE
                    )
                ).to.be.revertedWith(error);
            });
            it("reverts if the price is set to 0", async () => {
                await expect(nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    ethers.utils.parseEther("0")
                    )
                ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZero");
            });
            it("reverts if the nftContract is not approved", async () => {
                await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
                await expect(
                        nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                    ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
            });
            it("reverts if the someone other than the owner trys to list", async () => {
                const deployerNftMarketplace = await nftMarketplace.connect(deployer);
                await expect(
                    deployerNftMarketplace.listItem(
                        basicNft.address,
                        TOKEN_ID,
                        PRICE
                    )
                ).to.be.revertedWith("NftMarketplace__NotOwner");
            });
            it("updates the listing with the seller correctly", async () => {
                await nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    PRICE
                );
                const listing = await nftMarketplace.getListing(
                    basicNft.address,
                    TOKEN_ID
                );
                assert.equal(listing.seller.toString(), user.address.toString());
            });
            it("updates the listing with the price correctly", async () => {
                await nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    PRICE
                );
                const listing = await nftMarketplace.getListing(
                    basicNft.address,
                    TOKEN_ID
                );
                assert.equal(listing.price.toString(), PRICE.toString());
            });
        });
        describe("cancelItem", function () {
            it("reverts if item is not listed", async () => {
                error = `NotListed("${basicNft.address}", ${TOKEN_ID})`;
                await expect(nftMarketplace.cancelItem(
                    basicNft.address,
                    TOKEN_ID
                    )
                ).to.be.revertedWith(error);
            });
            it("reverts if not called by the item owner", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                const deployerNftMarketplace = nftMarketplaceContract.connect(deployer);
                await expect(deployerNftMarketplace.cancelItem(
                    basicNft.address,
                    TOKEN_ID
                )).to.be.revertedWith("NftMarketplace__NotOwner");
            })
            it("emits an event if the item is canceled", async () => {
                await nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    PRICE
                );
                await expect(nftMarketplace.cancelItem(
                    basicNft.address,
                    TOKEN_ID
                )).to.emit(nftMarketplace, "ItemCanceled");
            });
            it("updates the listing address to the null eth address when canceled", async () => {
                await nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    PRICE
                );
                await nftMarketplace.cancelItem(
                    basicNft.address,
                    TOKEN_ID
                );
                const nullAddress = '0x0000000000000000000000000000000000000000'
                const listing = await nftMarketplace.getListing(
                    basicNft.address,
                    TOKEN_ID
                );
                assert.equal(listing.seller.toString(), nullAddress)
            });
            it("updates the listing price to the 0 when canceled", async () => {
                await nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    PRICE
                );
                await nftMarketplace.cancelItem(
                    basicNft.address,
                    TOKEN_ID
                );
                const listing = await nftMarketplace.getListing(
                    basicNft.address,
                    TOKEN_ID
                );
                assert.equal(listing.price.toString(), "0")
            });
        });
        describe("buyItem", function () {
            it("reverts if item is not listed", async () => {
                error = `NotListed("${basicNft.address}", ${TOKEN_ID})`;
                await expect(nftMarketplace.buyItem(
                    basicNft.address,
                    TOKEN_ID,
                    { value: PRICE }
                )).to.be.revertedWith(error);
            });
            it("updates the listing address to the null eth address when bought", async () => {
                await nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    PRICE
                );
                await nftMarketplace.buyItem(
                    basicNft.address,
                    TOKEN_ID,
                    { value: PRICE }
                );
                const nullAddress = '0x0000000000000000000000000000000000000000'
                const listing = await nftMarketplace.getListing(
                    basicNft.address,
                    TOKEN_ID
                );
                assert.equal(listing.seller.toString(), nullAddress)
            });
            it("updates the listing price to the 0 when bought", async () => {
                await nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    PRICE
                );
                await nftMarketplace.buyItem(
                    basicNft.address,
                    TOKEN_ID,
                    { value: PRICE }
                );
                const listing = await nftMarketplace.getListing(
                    basicNft.address,
                    TOKEN_ID
                );
                assert.equal(listing.price.toString(), "0");
            });
            it("emits an event when an item is bought", async () => {
                const buyerNftMarketplace = nftMarketplaceContract.connect(deployer);
                await nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    PRICE
                );
                await expect(buyerNftMarketplace.buyItem(
                    basicNft.address,
                    TOKEN_ID,
                    { value: PRICE }
                )).to.emit(nftMarketplace, "ItemBought")
            });
            it("reverts if the price is not met", async () => {
                const HIGHER_PRICE = ethers.utils.parseEther("0.2");
                const buyerNftMarketplace = nftMarketplaceContract.connect(deployer);
                await nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    HIGHER_PRICE
                );
                await expect(
                    buyerNftMarketplace.buyItem(
                        basicNft.address,
                        TOKEN_ID,
                        { value: PRICE }
                    )
                ).to.be.revertedWith("NftMarketplace__PriceNotMet")
            });
            it("transfers the nft to the buyer", async () => {
                const buyerNftMarketplace = nftMarketplaceContract.connect(deployer);
                await nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    PRICE
                );
                await buyerNftMarketplace.buyItem(
                    basicNft.address,
                    TOKEN_ID,
                    { value: PRICE }
                );
                const newOwner = await basicNft.ownerOf(TOKEN_ID);
                assert.equal(newOwner.toString(), deployer.address);
            });
            it("allocates the proceeds of the sale to the seller", async () => {
                const buyerNftMarketplace = nftMarketplaceContract.connect(deployer);
                await nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    PRICE
                );
                await buyerNftMarketplace.buyItem(
                    basicNft.address,
                    TOKEN_ID,
                    { value: PRICE }
                );
                const sellerProceeds = await nftMarketplace.getProceeds(user.address);
                assert.equal(sellerProceeds.toString(), PRICE.toString());
            })
        });
        describe("updateItem", function () {
            const NEW_PRICE = ethers.utils.parseEther("0.2");
            it("emits an event when an item is updated", async () => {
                await nftMarketplace.listItem(
                    basicNft.address, 
                    TOKEN_ID, 
                    PRICE
                )
                await expect(nftMarketplace.updateItem(basicNft.address, TOKEN_ID, NEW_PRICE)).to.emit(nftMarketplace, "ItemUpdated");
            });
            it("reverts if the price is set to 0", async () => {
                await nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    PRICE
                )
                await expect(nftMarketplace.updateItem(
                    basicNft.address,
                    TOKEN_ID,
                    ethers.utils.parseEther("0")
                    )
                ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZero");
            });
            it("reverts if item is not already listed", async () => {
                const error = `NotListed("${basicNft.address}", ${TOKEN_ID})`;
                await expect(
                    nftMarketplace.updateItem(
                        basicNft.address, 
                        TOKEN_ID, 
                        NEW_PRICE
                    )
                ).to.be.revertedWith(error);
            });
            it("reverts if the someone other than the owner trys to update the listing", async () => {
                await nftMarketplace.listItem(
                    basicNft.address, 
                    TOKEN_ID, 
                    PRICE
                )
                const attackerNftMarketplace = await nftMarketplace.connect(deployer);
                await expect(
                    attackerNftMarketplace.updateItem(
                        basicNft.address,
                        TOKEN_ID,
                        NEW_PRICE
                    )
                ).to.be.revertedWith("NftMarketplace__NotOwner");
            });
            it("updates the listing with the seller correctly", async () => {
                await nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    PRICE
                );
                await nftMarketplace.updateItem(
                    basicNft.address, 
                    TOKEN_ID, 
                    NEW_PRICE
                );
                const listing = await nftMarketplace.getListing(
                    basicNft.address,
                    TOKEN_ID
                );
                assert.equal(listing.seller.toString(), user.address.toString());
            });
            it("updates the listing with the price correctly", async () => {
                await nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    PRICE
                );
                await nftMarketplace.updateItem(
                    basicNft.address, 
                    TOKEN_ID, 
                    NEW_PRICE
                );
                const listing = await nftMarketplace.getListing(
                    basicNft.address,
                    TOKEN_ID
                );
                assert.equal(listing.price.toString(), NEW_PRICE.toString());
            });
        });
        describe("withdrawProceeds", function () {
            let noProceedsNftMarketplace;
            beforeEach(async () => {
                noProceedsNftMarketplace = nftMarketplaceContract.connect(deployer)
                await nftMarketplace.listItem(
                    basicNft.address,
                    TOKEN_ID,
                    PRICE
                );
                await noProceedsNftMarketplace.buyItem(
                    basicNft.address,
                    TOKEN_ID,
                    { value: PRICE }
                );
            });
            it("reverts if user has no proceeds", async () => {
                await expect(noProceedsNftMarketplace.withdrawProceeds()).to.be.revertedWith("NftMarketplace__NoProceeds")
            });
            it("resets the proceeds balances correctly", async () => {
                await nftMarketplace.withdrawProceeds();
                const userProceeds = await nftMarketplace.getProceeds(user.address);
                assert.equal(userProceeds.toString(), "0")
            });
        });
    });