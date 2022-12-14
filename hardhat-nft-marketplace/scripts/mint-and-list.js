const { ethers } = require("hardhat")

const PRICE = ethers.utils.parseEther("0.1")

async function mintAndList() {
    const nftMarketplace = await ethers.getContract("NftMarketplace");
    const basicNft = await ethers.getContract("BasicNft");

    console.log("Minting...")
    const mintTx = await basicNft.mintNft();
    const mintTxReciept = await mintTx.wait(1);
    const tokenId = mintTxReciept.events[0].args.tokenId;
    
    console.log("Approving NFT...");
    const approvalTx = await basicNft.approve(nftMarketplace.address, tokenId);
    await approvalTx.wait(1);

    console.log("Lising NFT...");
    const listTx = await nftMarketplace.listItem(basicNft.address, tokenId, PRICE);
    await listTx.wait(1);
    console.log("Listed!");
}

mintAndList()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error);
        process.exit(1);
    })