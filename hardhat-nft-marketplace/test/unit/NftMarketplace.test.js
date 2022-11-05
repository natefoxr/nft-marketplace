const { assert, expect } = require("chai");
const { deployments, ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NftMarketplace Unit Tests", function () {
        let nftMarketplace, nftMarketplaceContract, nftMarketplaceAddress, basicNft, basicNftContract, user, deployer;
        const PRICE = ethers.utils.parseEther("0.1")
        const INVALID_PRICE = ethers.utils.parseEther("0")
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
            await basicNft.approve(nftMarketplace.address, TOKEN_ID)
        });
        describe("listItem", function () {
            it("emits an event when an item is Listed", async () => {
                await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(nftMarketplace, "ItemListed")
            });
            it("reverts if item is listed", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                const error = `AlreadyListed("${basicNft.address}", ${TOKEN_ID})`
                await expect(
                    nftMarketplace.listItem(
                        basicNft.address, 
                        TOKEN_ID, 
                        PRICE)
                ).to.be.revertedWith(error)
            })
            it("reverts if the someone other than the owner trys to list", async () => {
                const deployerNftMarketplace = await nftMarketplace.connect(deployer);
                await expect(
                    deployerNftMarketplace.listItem(
                        basicNft.address,
                        TOKEN_ID,
                        PRICE)
                ).to.be.revertedWith("NftMarketplace__NotOwner");
            })
        })
    });