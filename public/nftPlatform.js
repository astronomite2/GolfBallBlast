/**
 * Core JavaScript functionality for the GolfBall Skin NFT platform
 * Updated to work with the combined ERC-20/NFT contract
 */

// Web3 integration
const web3 = new Web3(window.ethereum);
let contractInstance;
let userAccount;

// Contract address (single contract for both token and NFT functionality)
const CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";

// Initialize the application
async function initApp() {
  try {
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    userAccount = accounts[0];
    document.getElementById('wallet-address').textContent = userAccount;
    
    // Load contract
    loadContract();
    
    // Update UI with user data
    await updateUserData();
    
    // Load marketplace items
    await loadMarketplaceItems();
    
    // Load leaderboard
    await loadLeaderboard();
    
  } catch (error) {
    console.error("Error initializing app:", error);
    displayError("Failed to connect to your wallet. Please make sure MetaMask is installed and unlocked.");
  }
}

// Load smart contract instance
function loadContract() {
  // Load combined contract ABI
  const contractABI = [/* ABI would go here */];
  contractInstance = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);
}

// Update user data display
async function updateUserData() {
  try {
    // Get token balance
    const tokenBalance = await contractInstance.methods.balanceOf(userAccount).call();
    document.getElementById('token-balance').textContent = web3.utils.fromWei(tokenBalance, 'ether');
    
    // Get owned skins
    const ownedSkins = await contractInstance.methods.getOwnedSkins(userAccount).call();
    displayOwnedSkins(ownedSkins);
  } catch (error) {
    console.error("Error updating user data:", error);
  }
}

// Display owned skins in the UI
function displayOwnedSkins(skins) {
  const container = document.getElementById('owned-skins');
  container.innerHTML = '';
  
  if (skins.length === 0) {
    container.innerHTML = '<p>You don\'t own any golf ball skins yet.</p>';
    return;
  }
  
  skins.forEach(skin => {
    const skinElement = document.createElement('div');
    skinElement.className = 'skin-item';
    skinElement.innerHTML = `
      <img src="${skin.imageUrl}" alt="${skin.name}">
      <h3>${skin.name}</h3>
      <p>Rarity: ${skin.rarity}</p>
      <p>Value: ${web3.utils.fromWei(skin.value, 'ether')} GBT</p>
      <button onclick="listForSale(${skin.id})">List for Sale</button>
    `;
    container.appendChild(skinElement);
  });
}

// Load marketplace items
async function loadMarketplaceItems() {
  try {
    const listedItems = await contractInstance.methods.getMarketListings().call();
    displayMarketItems(listedItems);
  } catch (error) {
    console.error("Error loading marketplace items:", error);
  }
}

// Display marketplace items in the UI
function displayMarketItems(items) {
  const container = document.getElementById('marketplace-items');
  container.innerHTML = '';
  
  if (items.length === 0) {
    container.innerHTML = '<p>No items are currently listed for sale.</p>';
    return;
  }
  
  items.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'market-item';
    itemElement.innerHTML = `
      <img src="${item.imageUrl}" alt="${item.name}">
      <h3>${item.name}</h3>
      <p>Rarity: ${item.rarity}</p>
      <p>Price: ${web3.utils.fromWei(item.price, 'ether')} GBT</p>
      <p>Seller: ${item.seller.substring(0, 6)}...${item.seller.substring(38)}</p>
      <button onclick="purchaseSkin(${item.id}, '${item.price}')">Purchase</button>
    `;
    container.appendChild(itemElement);
  });
}

// Load leaderboard data
async function loadLeaderboard() {
  try {
    const leaderboardData = await contractInstance.methods.getLeaderboard().call();
    displayLeaderboard(leaderboardData);
  } catch (error) {
    console.error("Error loading leaderboard:", error);
  }
}

// Display leaderboard in the UI
function displayLeaderboard(leaderboardData) {
  const container = document.getElementById('leaderboard');
  container.innerHTML = '';
  
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Rank</th>
        <th>Player</th>
        <th>Skins Owned</th>
        <th>Total Value</th>
      </tr>
    </thead>
    <tbody id="leaderboard-body">
    </tbody>
  `;
  container.appendChild(table);
  
  const tbody = document.getElementById('leaderboard-body');
  
  leaderboardData.forEach((player, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${player.userAddress.substring(0, 6)}...${player.userAddress.substring(38)}</td>
      <td>${player.skinCount}</td>
      <td>${web3.utils.fromWei(player.totalValue, 'ether')} GBT</td>
    `;
    tbody.appendChild(row);
  });
}

// List a skin for sale
async function listForSale(skinId) {
  const price = prompt("Enter the price in GBT tokens:");
  if (!price) return;
  
  try {
    const priceInWei = web3.utils.toWei(price, 'ether');
    await contractInstance.methods.listForSale(skinId, priceInWei).send({ from: userAccount });
    alert("Your skin has been listed for sale!");
    await updateUserData();
    await loadMarketplaceItems();
  } catch (error) {
    console.error("Error listing skin for sale:", error);
    displayError("Failed to list your skin for sale. Please try again.");
  }
}

// Purchase a skin from the marketplace
async function purchaseSkin(skinId, price) {
  try {
    // First approve token transfer
    await contractInstance.methods.approve(CONTRACT_ADDRESS, price).send({ from: userAccount });
    
    // Then purchase the skin
    await contractInstance.methods.purchaseSkin(skinId).send({ from: userAccount });
    
    alert("Purchase successful! The skin is now in your collection.");
    await updateUserData();
    await loadMarketplaceItems();
    await loadLeaderboard();
  } catch (error) {
    console.error("Error purchasing skin:", error);
    displayError("Failed to complete the purchase. Please try again.");
  }
}

// Display error message
function displayError(message) {
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  
  // Hide after 5 seconds
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

// Connect wallet button handler
document.getElementById('connect-wallet').addEventListener('click', initApp);

// Check if MetaMask is installed
window.addEventListener('load', function() {
  if (typeof window.ethereum !== 'undefined') {
    document.getElementById('connect-wallet').disabled = false;
  } else {
    displayError("MetaMask is not installed. Please install it to use this application.");
  }
});