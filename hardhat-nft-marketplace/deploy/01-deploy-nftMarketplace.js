const { network, ethers } = require("hardhat");
const { neworkConfig, developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    log("----------------------------------------------------------");

    const args = [];

    const nftMarketplace = await deploy("NftMarketplace", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log(`"NftMarketplace.sol" Deployed at ${nftMarketplace.address}!`);
    log("----------------------------------------------------------");

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying NftMarketplace.sol on Etherscan...");
        await verify(nftMarketplace.address, args);
    }
}

module.exports.tags = ["all", "nftMarketplace"];