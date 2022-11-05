const { assert } = require("chai");
const { deployments, ethers, network } = require("hardhat");
const { developmentChains, } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("BasicNft Unit Tests", function () {
        let basicNft, basicNftContract, user;

        beforeEach(async () => {
            accounts = await ethers.getSigners();
            deployer = accounts[0];
            user = accounts[1];
            await deployments.fixture("basicNft");
            basicNftContract = await ethers.getContract("BasicNft");
            basicNft = basicNftContract.connect(user);
        })

        describe("Constructor", () => {
            it("initializes the NFT name correctly", async () => {
                const name = await basicNft.name();
                assert.equal(name, "CoolFoxy");
            });
            it("initializes the NFT symbol correctly", async () => {
                const symbol = await basicNft.symbol();
                assert.equal(symbol, "FOXR");
            });
            it("initializes the NFT counter correctly", async () => {
                const tokenCounter = await basicNft.getTokenCounter();
                assert.equal(tokenCounter.toString(), "0");
            });
        });

        describe("Mint NFT", function () {
            beforeEach(async () => {
                const transactionResponse = await basicNft.mintNft();
                await transactionResponse.wait(1);
            });
            it("allows users to mint an nft", async () => {
                const tokenCounter = await basicNft.getTokenCounter();
                assert.equal(tokenCounter.toString(), "1");
            });
            it("updates user token URI", async () => {
                const tokenURI = await basicNft.tokenURI("0");
                assert(tokenURI, await basicNft.TOKEN_URI());
            });
            it("updates owner of NFT", async () => {
                const userAddress = user.address;
                const owner = await basicNft.ownerOf("0");
                assert.equal(owner, userAddress);
            });
            it("updates owner NFT balance", async () => {
                const userBalance = await basicNft.balanceOf(user.address);
                assert.equal(userBalance.toString(), "1");
            });
        })
    })