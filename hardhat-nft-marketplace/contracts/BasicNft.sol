// SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

pragma solidity ^0.8.7;

contract BasicNft is ERC721 {
    string public constant TOKEN_URI = "ipfs://bafybeifg4by4risjz3wydngs56d3f3hv7sryek7x4dnmce6crnlpikoz4i/?filename=CoolFoxyURI.JSON";
    uint256 private s_tokenCounter;
    constructor() ERC721("CoolFoxy", "FOXR") {
        s_tokenCounter = 0;
    }
    
    function mintNft() public returns(uint256)  {
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenCounter = s_tokenCounter + 1;
        return s_tokenCounter;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");        
        return TOKEN_URI;
    }

    function getTokenCounter() public view returns(uint256) {
        return s_tokenCounter;
    }
}
