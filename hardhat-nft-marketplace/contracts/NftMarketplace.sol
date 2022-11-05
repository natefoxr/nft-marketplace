// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

//////////////////////////////
// Imports                  //
//////////////////////////////

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

//////////////////////////////
// Errors                   //
//////////////////////////////

error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotListed(address nftaddress, uint256 tokenId);
error NftMarketplace__NotOwner();
error NftMarketplace__PriceNotMet(address nftAddress, uint256 tokenId, uint256 price);
error NftMarketplace__NoProceeds();


//////////////////////////////
// Contract                 //
//////////////////////////////

contract NftMarketplace is ReentrancyGuard {

    //////////////////////////////
    // Structs                  //
    //////////////////////////////

    struct Listing {
        uint256 price;
        address seller;
    }

    //////////////////////////////
    // Events                   //
    //////////////////////////////

    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemUpdated(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemCanceled(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    // NFT Contract address _> NFT TokenId -> Listing
    mapping(address => mapping(uint256 => Listing)) private s_listings;
    // Seller Address -> Amount earned
    mapping(address => uint256) private s_proceeds;

    //////////////////////////////
    // Modifiers                //
    //////////////////////////////

    modifier notListed(
        address nftAddress, 
        uint256 tokenId
    ) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0) {
            revert NftMarketplace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isListed(
        address nftAddress,
        uint256 tokenId
    ) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0) {
            revert NftMarketplace__NotListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isOwner(
        address nftAddress, 
        uint256 tokenId, 
        address spender
    ) {
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId);
        if (spender != owner) {
            revert NftMarketplace__NotOwner();
        }
        _;
    }

    //////////////////////////////
    // Main Functions           //
    //////////////////////////////

    /**
     * @notice Method for listing your NFT on the Marketplace
     * @param nftAddress: Contract Address of the NFT
     * @param tokenId: The Token ID of the NFT
     * @param price: The sale price for the listed NFT
     * @dev This function provides a non custodial way of Listing to the Marketplace allowing users maintain
     * custody of their assets while listed but not yet sold https://fravoll.github.io/solidity-patterns/pull_over_push.html
     */
    function listItem(
        address nftAddress, 
        uint256 tokenId, 
        uint256 price
    ) external notListed(
        nftAddress, 
        tokenId
    ) isOwner(
        nftAddress,
        tokenId,
        msg.sender
    ) {
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero();
        }
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace__NotApprovedForMarketplace();
        }
        s_listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }

    /**
     * @notice Method for canceling canceling a NFT listed on the marketplace
     * @param nftAddress: Contract Address of the NFT
     * @param tokenId: The Token ID of the NFT
     */
    function cancelItem(
        address nftAddress,
        uint256 tokenId
    ) external isListed(
        nftAddress,
        tokenId
    ) isOwner(
        nftAddress,
        tokenId,
        msg.sender
    ) {
        delete (s_listings[nftAddress][tokenId]);
        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }

    /**
     * @notice Method for buying a listed NFT from the marketplace
     * @param nftAddress: Contract Address of the NFT
     * @param tokenId: The Token ID of the NFT
     * @dev This function results in the amount the seller is owed being assigned to a mapping. This is to follow Solidity's best practice of
     * Pull over Push and having the seller withdraw the ETH/Tokens themselves. The Intent is to Shift the Risk associated wth transfering ether
     * to the user.
     * @dev Using the OpenZeppelin ReentrancyGuard here to protect users from reentrancy attacks against transfers
     */
    function buyItem(
        address nftAddress,
        uint256 tokenId
    ) external payable nonReentrant isListed(
        nftAddress,
        tokenId
    ) {
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        if (msg.value < listedItem.price) {
            revert NftMarketplace__PriceNotMet(nftAddress, tokenId, listedItem.price);
        }
        s_proceeds[listedItem.seller] = s_proceeds[listedItem.seller] + msg.value;
        delete (s_listings[nftAddress][tokenId]);
        IERC721(nftAddress).safeTransferFrom(listedItem.seller, msg.sender, tokenId);
        emit ItemBought(msg.sender, nftAddress, tokenId, listedItem.price);
    }

    /**
     * @notice Method for updating a NFT listing
     * @param nftAddress: Contract Address of the NFT
     * @param tokenId: The Token ID of the NFT
     * @param newPrice: The updated sale price for the listed NFT
     * @dev This function will charge a gas fee since it updates the mapping of the listing price on chain
     */
    function updateItem(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    ) external isListed(
        nftAddress,
        tokenId
    ) isOwner (
        nftAddress,
        tokenId,
        msg.sender
    ) {
        if (newPrice <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero();
        }
        s_listings[nftAddress][tokenId].price = newPrice;
        emit ItemUpdated(msg.sender, nftAddress, tokenId, newPrice);
    }

    /**
     * @notice Method for seller withdrawing ETH proceeds from selling NFTs
     * @dev Using the OpenZeppelin ReentrancyGuard here to protect users from reentrancy attacks against transfers
     */
    function withdrawProceeds() external nonReentrant {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) {
            revert NftMarketplace__NoProceeds();
        }
        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        require(success, "Transfer Failed");
    }

    //////////////////////////////
    // Getter Functions         //
    //////////////////////////////

    function getListing(
        address nftAddress, 
        uint256 tokenId
    ) external view returns(Listing memory) {
        return s_listings[nftAddress][tokenId];
    }

    function getProceeds(address user) external view returns (uint256) {
        return s_proceeds[user];
    }
}