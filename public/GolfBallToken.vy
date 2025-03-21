# @title GolfBall Token (GBT) and Skins NFT
# @author YourName
# @license MIT
# @version 0.3.7

# This contract combines ERC-20 token functionality with NFT (ERC-721-like) features
# for golf ball skins, including marketplace and leaderboard capabilities

# Events for ERC-20
event Transfer:
    sender: indexed(address)
    receiver: indexed(address)
    value: uint256

event Approval:
    owner: indexed(address)
    spender: indexed(address)
    value: uint256

# Events for NFT functionality
event NFTTransfer:
    sender: indexed(address)
    receiver: indexed(address)
    tokenId: indexed(uint256)

event NFTApproval:
    owner: indexed(address)
    approved: indexed(address)
    tokenId: indexed(uint256)

event ApprovalForAll:
    owner: indexed(address)
    operator: indexed(address)
    approved: bool

event SkinListed:
    tokenId: indexed(uint256)
    seller: indexed(address)
    price: uint256

event SkinSold:
    tokenId: indexed(uint256)
    seller: indexed(address)
    buyer: indexed(address)
    price: uint256

# Structs for NFT functionality
struct Skin:
    id: uint256
    name: String[50]
    rarity: String[20]
    value: uint256
    imageUrl: String[200]

struct MarketItem:
    tokenId: uint256
    seller: address
    price: uint256
    isActive: bool

struct LeaderboardEntry:
    userAddress: address
    skinCount: uint256
    totalValue: uint256

# ERC-20 Storage variables
name: public(String[32])
symbol: public(String[5])
decimals: public(uint8)
totalSupply: public(uint256)

balanceOf: public(HashMap[address, uint256])
allowance: public(HashMap[address, HashMap[address, uint256]])

# NFT Storage variables
nftName: public(String[32])
nftSymbol: public(String[10])

# Token ID to owner address
ownerOf: public(HashMap[uint256, address])

# Owner address to token count
nftBalanceOf: public(HashMap[address, uint256])

# Token ID to approved address
getApproved: public(HashMap[uint256, address])

# Owner address to operator addresses to approval status
isApprovedForAll: public(HashMap[address, HashMap[address, bool]])

# Token details
skins: public(HashMap[uint256, Skin])

# Marketplace listings
marketItems: public(HashMap[uint256, MarketItem])

# Leaderboard data
leaderboard: public(DynArray[LeaderboardEntry, 100])
userToLeaderboardIndex: public(HashMap[address, uint256])

# Contract owner
owner: public(address)

# Total supply of NFTs
nftTotalSupply: public(uint256)

# Initialize the contract
@external
def __init__():
    # ERC-20 initialization
    self.name = "GolfBall Token"
    self.symbol = "GBT"
    self.decimals = 18
    self.totalSupply = 100000000 * 10**18  # 100 million tokens
    self.balanceOf[msg.sender] = self.totalSupply
    
    # NFT initialization
    self.nftName = "GolfBall Skins"
    self.nftSymbol = "GBS"
    self.nftTotalSupply = 0
    
    # Set contract owner
    self.owner = msg.sender
    
    log Transfer(ZERO_ADDRESS, msg.sender, self.totalSupply)

# ------------------------
# ERC-20 Token Functions
# ------------------------

# ERC-20 standard transfer function
@external
def transfer(to: address, amount: uint256) -> bool:
    assert to != ZERO_ADDRESS, "Cannot transfer to zero address"
    assert self.balanceOf[msg.sender] >= amount, "Insufficient balance"
    
    self.balanceOf[msg.sender] -= amount
    self.balanceOf[to] += amount
    
    log Transfer(msg.sender, to, amount)
    return True

# ERC-20 standard transferFrom function
@external
def transferFrom(sender: address, recipient: address, amount: uint256) -> bool:
    assert sender != ZERO_ADDRESS, "Cannot transfer from zero address"
    assert recipient != ZERO_ADDRESS, "Cannot transfer to zero address"
    assert self.balanceOf[sender] >= amount, "Insufficient balance"
    assert self.allowance[sender][msg.sender] >= amount, "Insufficient allowance"
    
    self.balanceOf[sender] -= amount
    self.balanceOf[recipient] += amount
    self.allowance[sender][msg.sender] -= amount
    
    log Transfer(sender, recipient, amount)
    return True

# ERC-20 standard approve function
@external
def approve(spender: address, amount: uint256) -> bool:
    self.allowance[msg.sender][spender] = amount
    
    log Approval(msg.sender, spender, amount)
    return True

# Mint new tokens (only owner)
@external
def mint(to: address, amount: uint256) -> bool:
    assert msg.sender == self.owner, "Only owner can mint"
    assert to != ZERO_ADDRESS, "Cannot mint to zero address"
    
    self.totalSupply += amount
    self.balanceOf[to] += amount
    
    log Transfer(ZERO_ADDRESS, to, amount)
    return True

# Burn tokens
@external
def burn(amount: uint256) -> bool:
    assert self.balanceOf[msg.sender] >= amount, "Insufficient balance"
    
    self.balanceOf[msg.sender] -= amount
    self.totalSupply -= amount
    
    log Transfer(msg.sender, ZERO_ADDRESS, amount)
    return True

# ------------------------
# NFT Functions
# ------------------------

# NFT transfer function
@external
def nftTransferFrom(sender: address, to: address, tokenId: uint256):
    assert self._isApprovedOrOwner(msg.sender, tokenId), "Not approved or owner"
    assert to != ZERO_ADDRESS, "Cannot transfer to zero address"
    
    self._nftTransfer(sender, to, tokenId)

# NFT safe transfer function
@external
def nftSafeTransferFrom(sender: address, to: address, tokenId: uint256, _data: Bytes[1024]=b""):
    assert self._isApprovedOrOwner(msg.sender, tokenId), "Not approved or owner"
    assert to != ZERO_ADDRESS, "Cannot transfer to zero address"
    
    self._nftTransfer(sender, to, tokenId)
    
    # Check if receiver is a contract
    if self._isContract(to):
        # This would call onERC721Received in a real implementation
        pass

# NFT approve function
@external
def nftApprove(approved: address, tokenId: uint256):
    owner: address = self.ownerOf[tokenId]
    assert approved != owner, "Cannot approve current owner"
    assert msg.sender == owner or self.isApprovedForAll[owner][msg.sender], "Not owner or approved operator"
    
    self.getApproved[tokenId] = approved
    log NFTApproval(owner, approved, tokenId)

# NFT set approval for all function
@external
def setApprovalForAll(operator: address, approved: bool):
    assert operator != msg.sender, "Cannot approve self"
    
    self.isApprovedForAll[msg.sender][operator] = approved
    log ApprovalForAll(msg.sender, operator, approved)

# Create a new skin (owner or approved minter)
@external
def createSkin(name: String[50], rarity: String[20], value: uint256, imageUrl: String[200]) -> uint256:
    assert msg.sender == self.owner, "Only owner can create skins"
    
    tokenId: uint256 = self.nftTotalSupply + 1
    self.nftTotalSupply = tokenId
    
    # Mint the token
    self._nftMint(msg.sender, tokenId)
    
    # Set skin data
    self.skins[tokenId] = Skin({
        id: tokenId,
        name: name,
        rarity: rarity,
        value: value,
        imageUrl: imageUrl
    })
    
    # Update leaderboard
    self._updateLeaderboard(msg.sender)
    
    return tokenId

# List a skin for sale
@external
def listForSale(tokenId: uint256, price: uint256):
    assert self.ownerOf[tokenId] == msg.sender, "Not the owner"
    assert price > 0, "Price must be greater than zero"
    
    # Create market item
    self.marketItems[tokenId] = MarketItem({
        tokenId: tokenId,
        seller: msg.sender,
        price: price,
        isActive: True
    })
    
    # Approve contract to transfer the token when sold
    self.nftApprove(self, tokenId)
    
    log SkinListed(tokenId, msg.sender, price)

# Purchase a skin from the marketplace
@external
def purchaseSkin(tokenId: uint256):
    item: MarketItem = self.marketItems[tokenId]
    assert item.isActive, "Listing is not active"
    assert msg.sender != item.seller, "Seller cannot buy their own listing"
    
    price: uint256 = item.price
    seller: address = item.seller
    
    # Transfer tokens from buyer to seller (using this contract's ERC-20 functionality)
    assert self.balanceOf[msg.sender] >= price, "Insufficient token balance"
    assert self.allowance[msg.sender][self] >= price, "Insufficient allowance"
    
    # Update token balances
    self.balanceOf[msg.sender] -= price
    self.balanceOf[seller] += price
    self.allowance[msg.sender][self] -= price
    
    log Transfer(msg.sender, seller, price)
    
    # Transfer NFT from seller to buyer
    self._nftTransfer(seller, msg.sender, tokenId)
    
    # Update market item status
    self.marketItems[tokenId].isActive = False
    
    # Update leaderboard for both seller and buyer
    self._updateLeaderboard(seller)
    self._updateLeaderboard(msg.sender)
    
    log SkinSold(tokenId, seller, msg.sender, price)

# ------------------------
# View Functions
# ------------------------

# Get owned skins
@view
@external
def getOwnedSkins(user: address) -> DynArray[Skin, 100]:
    result: DynArray[Skin, 100] = []
    
    for i in range(1, self.nftTotalSupply + 1):
        if self.ownerOf[i] == user:
            result.append(self.skins[i])
    
    return result

# Get market listings
@view
@external
def getMarketListings() -> DynArray[Skin, 100]:
    result: DynArray[Skin, 100] = []
    
    for i in range(1, self.nftTotalSupply + 1):
        if self.marketItems[i].isActive:
            result.append(self.skins[i])
    
    return result

# Get leaderboard
@view
@external
def getLeaderboard() -> DynArray[LeaderboardEntry, 100]:
    return self.leaderboard

# ------------------------
# Internal Functions
# ------------------------

# Internal function to mint a new NFT token
@internal
def _nftMint(to: address, tokenId: uint256):
    assert to != ZERO_ADDRESS, "Cannot mint to zero address"
    assert self.ownerOf[tokenId] == ZERO_ADDRESS, "Token already minted"
    
    self.nftBalanceOf[to] += 1
    self.ownerOf[tokenId] = to
    
    log NFTTransfer(ZERO_ADDRESS, to, tokenId)

# Internal function to transfer an NFT token
@internal
def _nftTransfer(sender: address, to: address, tokenId: uint256):
    assert self.ownerOf[tokenId] == sender, "Not the owner"
    
    # Clear approvals
    self.getApproved[tokenId] = ZERO_ADDRESS
    
    # Update balances
    self.nftBalanceOf[sender] -= 1
    self.nftBalanceOf[to] += 1
    
    # Update owner
    self.ownerOf[tokenId] = to
    
    log NFTTransfer(sender, to, tokenId)

# Internal function to check if an address is approved to manage a token
@view
@internal
def _isApprovedOrOwner(spender: address, tokenId: uint256) -> bool:
    owner: address = self.ownerOf[tokenId]
    return (spender == owner or 
            spender == self.getApproved[tokenId] or 
            self.isApprovedForAll[owner][spender])

# Internal function to check if an address is a contract
@view
@internal
def _isContract(addr: address) -> bool:
    # Simplified check - would need more logic in real implementation
    return addr != ZERO_ADDRESS and addr != self.owner

# Internal function to update the leaderboard for a user
@internal
def _updateLeaderboard(user: address):
    # Calculate user stats
    skinCount: uint256 = self.nftBalanceOf[user]
    totalValue: uint256 = 0
    
    for i in range(1, self.nftTotalSupply + 1):
        if self.ownerOf[i] == user:
            totalValue += self.skins[i].value
    
    # Check if user is already in leaderboard
    userIndex: uint256 = self.userToLeaderboardIndex[user]
    
    if userIndex > 0:
        # Update existing entry
        self.leaderboard[userIndex - 1] = LeaderboardEntry({
            userAddress: user,
            skinCount: skinCount,
            totalValue: totalValue
        })
    else:
        # Add new entry
        self.leaderboard.append(LeaderboardEntry({
            userAddress: user,
            skinCount: skinCount,
            totalValue: totalValue
        }))
        self.userToLeaderboardIndex[user] = len(self.leaderboard)
    
    # Sort leaderboard by total value (simplified version)
    self._sortLeaderboard()

# Internal function to sort the leaderboard
@internal
def _sortLeaderboard():
    # Simple bubble sort implementation
    n: uint256 = len(self.leaderboard)
    
    for i in range(n):
        for j in range(0, n - i - 1):
            if self.leaderboard[j].totalValue < self.leaderboard[j + 1].totalValue:
                # Swap entries
                temp: LeaderboardEntry = self.leaderboard[j]
                self.leaderboard[j] = self.leaderboard[j + 1]
                self.leaderboard[j + 1] = temp
                
                # Update indices
                self.userToLeaderboardIndex[self.leaderboard[j].userAddress] = j + 1
                self.userToLeaderboardIndex[self.leaderboard[j + 1].userAddress] = j + 2