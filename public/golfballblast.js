/**
 * GOLF ARENA - A 1v1 arena-style golf-ball physics multiplayer game
 * 
 * This game features a top-down arena where two players take turns hitting golf balls,
 * trying to get their ball into the opponent's hole while avoiding obstacles.
 * The game includes various powerups and physics-based interactions.
 * 
 * @author Claude
 * @version 1.0.0
 * @date March 17, 2025
 */

// ===== CONSTANTS =====
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BALL_RADIUS = 10;
const HOLE_RADIUS = 15;
const MAX_POWER = 15;
const FRICTION = 0.98;
const WALL_COLORS = {
    NORMAL: "#555555",
    BOUNCY: "#FF8800"
};
const PLAYER_COLORS = ["#FF0000", "#0000FF"];
const ROUND_RESET_TIME = 3000; // 3 seconds

// ===== GAME STATE =====
let gameState = {
    currentScreen: "title", // "title", "setup", "game", "roundEnd", "gameEnd"
    roundsToWin: 3,
    currentRound: 1,
    currentPlayer: 0,
    scores: [0, 0],
    balls: [
        { x: 0, y: 0, vx: 0, vy: 0, color: PLAYER_COLORS[0] },
        { x: 0, y: 0, vx: 0, vy: 0, color: PLAYER_COLORS[1] }
    ],
    holes: [
        { x: 0, y: 0, color: PLAYER_COLORS[1] }, // Player 2's hole (target for Player 1)
        { x: 0, y: 0, color: PLAYER_COLORS[0] }  // Player 1's hole (target for Player 2)
    ],
    walls: [], // Will be populated during initialization
    powerups: [
        { name: "Super Swing", description: "Double swing power. Can break certain walls.", cooldown: 2, currentCooldowns: [0, 0], icon: "🔨" },
        { name: "Wall Placement", description: "Place a temporary wall that lasts 2 turns.", cooldown: 1, currentCooldowns: [0, 0], icon: "🧱" },
        { name: "Bounce Wall", description: "Convert a wall to a super bouncy surface for 2 turns.", cooldown: 2, currentCooldowns: [0, 0], icon: "🔄" }
    ],
    selectedPowerups: [null, null], // Index of powerup selected by each player
    activePowerups: [],
    swingPower: 0,
    swingAngle: 0,
    isAiming: false,
    hasShot: false,
    wallPlacementMode: false, // Track if we're in wall placement mode
    previewWall: null, // Store the preview wall data
    bounceWallMode: false, // Track if we're in bounce wall mode
    hoveredWall: null // Track which wall is being hovered over
};

// ===== DOM ELEMENTS =====
let canvas, ctx;
let powerBar, angleIndicator;
let powerupButtons;
let scoreDisplay;
let messageDisplay;

/**
 * Initialize the game when the window loads
 */
window.onload = function() {
    // Get DOM elements
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    powerBar = document.getElementById("powerBar");
    angleIndicator = document.getElementById("angleIndicator");
    powerupButtons = document.querySelectorAll(".powerup-button");
    scoreDisplay = document.getElementById("scoreDisplay");
    messageDisplay = document.getElementById("messageDisplay");
    
    // Set canvas dimensions
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Add event listeners
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    document.getElementById("localPlayButton").addEventListener("click", startGame);
    document.getElementById("onlineButton").addEventListener("click", handleOnlineMultiplayer);
    document.getElementById("nftButton").addEventListener("click", handleNFTPlatform);
    document.getElementById("playAgainButton").addEventListener("click", resetGame);
    
    // Initialize powerup buttons
    initializePowerupButtons();
    
    // Show title screen
    showTitleScreen();
    
    // Start the game loop
    requestAnimationFrame(gameLoop);
};

/**
 * Handle click on Online Multiplayer button
 */
function handleOnlineMultiplayer() {
    // This is a placeholder for future implementation
    alert("Online Multiplayer is coming soon!");
}

/**
 * Handle click on NFT Platform button
 */
function handleNFTPlatform() {
    window.location.href = "GolfBallNFT.html";
}

/**
 * Set up powerup buttons with info and event listeners
 */
function initializePowerupButtons() {
    const container = document.getElementById("powerupContainer");
    
    gameState.powerups.forEach((powerup, index) => {
        const button = document.createElement("button");
        button.className = "powerup-button";
        button.dataset.index = index;
        button.innerHTML = `
            <div class="powerup-icon">${powerup.icon}</div>
            <div class="powerup-name">${powerup.name}</div>
            <div class="powerup-cooldown">CD: ${powerup.cooldown}</div>
        `;
        
        button.addEventListener("click", () => selectPowerup(index));
        container.appendChild(button);
    });
    
    powerupButtons = document.querySelectorAll(".powerup-button");
}

/**
 * Select a powerup for the current player
 * @param {number} index - The index of the powerup to select
 */
function selectPowerup(index) {
    gameState.selectedPowerups[gameState.currentPlayer] = index;
    
    // Update UI to show selected powerup
    powerupButtons.forEach(button => {
        button.classList.remove("selected");
        if (parseInt(button.dataset.index) === index) {
            button.classList.add("selected");
        }
    });
}

/**
 * Display the title screen
 */
function showTitleScreen() {
    gameState.currentScreen = "title";
    document.getElementById("titleScreen").style.display = "flex";
    document.getElementById("setupScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("gameEndScreen").style.display = "none";
}

/**
 * Start the game setup process
 */
function startGame() {
    gameState.currentScreen = "setup";
    document.getElementById("titleScreen").style.display = "none";
    document.getElementById("setupScreen").style.display = "flex";
    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("gameEndScreen").style.display = "none";
    
    // Initialize powerup selection UI
    initializePowerupSelection();
    
    // When player finishes setup, call startRound()
    document.getElementById("startRoundButton").addEventListener("click", () => {
        startRound();
    });
}

/**
 * Initialize the powerup selection UI
 */
function initializePowerupSelection() {
    const player1Container = document.getElementById("player1Powerups");
    const player2Container = document.getElementById("player2Powerups");
    
    // Clear existing content
    player1Container.innerHTML = "";
    player2Container.innerHTML = "";
    
    // Create powerup buttons for each player
    gameState.powerups.forEach((powerup, index) => {
        // Player 1 button
        const button1 = createPowerupButton(powerup, index, 0);
        player1Container.appendChild(button1);
        
        // Player 2 button
        const button2 = createPowerupButton(powerup, index, 1);
        player2Container.appendChild(button2);
    });
    
    // Update start button state
    updateStartButtonState();
}

/**
 * Create a powerup selection button
 * @param {Object} powerup - The powerup data
 * @param {number} index - The powerup index
 * @param {number} playerIndex - The player index (0 or 1)
 * @returns {HTMLElement} The button element
 */
function createPowerupButton(powerup, index, playerIndex) {
    const button = document.createElement("button");
    button.className = "setup-powerup-button";
    button.innerHTML = `
        <div class="powerup-icon">${powerup.icon}</div>
        <div class="powerup-name">${powerup.name}</div>
        <div class="powerup-description">${powerup.description}</div>
    `;
    
    button.addEventListener("click", () => {
        // Deselect all buttons for this player
        const container = playerIndex === 0 ? 
            document.getElementById("player1Powerups") : 
            document.getElementById("player2Powerups");
        container.querySelectorAll(".setup-powerup-button").forEach(btn => {
            btn.classList.remove("selected");
        });
        
        // Select this button
        button.classList.add("selected");
        
        // Update game state
        gameState.selectedPowerups[playerIndex] = index;
        
        // Update start button state
        updateStartButtonState();
    });
    
    return button;
}

/**
 * Update the start button state based on powerup selection
 */
function updateStartButtonState() {
    const startButton = document.getElementById("startRoundButton");
    const canStart = gameState.selectedPowerups[0] !== null && 
                    gameState.selectedPowerups[1] !== null;
    startButton.disabled = !canStart;
}

/**
 * Start a new round
 */
function startRound() {
    gameState.currentScreen = "game";
    document.getElementById("titleScreen").style.display = "none";
    document.getElementById("setupScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "flex";
    document.getElementById("gameEndScreen").style.display = "none";
    
    // Reset ball positions
    resetBallPositions();
    
    // Create arena with walls and obstacles
    if (gameState.walls.length === 0) {
        createArena();
    }
    
    // Reset powerup cooldowns for new round
    gameState.powerups.forEach(powerup => {
        powerup.currentCooldowns[0] = 0;
        powerup.currentCooldowns[1] = 0;
    });
    
    // Clear active powerups
    gameState.activePowerups = [];
    
    // Update UI
    updateScoreDisplay();
    updateMessageDisplay(`Round ${gameState.currentRound} - Player ${gameState.currentPlayer + 1}'s Turn`);
    
    // Initialize powerup buttons for the game screen
    initializeGamePowerupButtons();
}

/**
 * Initialize powerup buttons for the game screen
 */
function initializeGamePowerupButtons() {
    const container = document.getElementById("powerupContainer");
    container.innerHTML = "";
    
    // Only show the current player's selected powerup
    const selectedPowerupIndex = gameState.selectedPowerups[gameState.currentPlayer];
    if (selectedPowerupIndex !== null) {
        const powerup = gameState.powerups[selectedPowerupIndex];
        const button = document.createElement("button");
        button.className = "powerup-button";
        
        // Set initial state based on cooldown for current player
        if (powerup.currentCooldowns[gameState.currentPlayer] > 0) {
            button.disabled = true;
            button.classList.add("disabled");
        } else {
            button.disabled = false;
            button.classList.remove("disabled");
        }
        
        button.innerHTML = `
            <div class="powerup-icon">${powerup.icon}</div>
            <div class="powerup-name">${powerup.name}</div>
            <div class="powerup-cooldown">${powerup.currentCooldowns[gameState.currentPlayer] > 0 ? `CD: ${powerup.currentCooldowns[gameState.currentPlayer]}` : 'Ready'}</div>
        `;
        
        button.addEventListener("click", () => {
            if (powerup.currentCooldowns[gameState.currentPlayer] === 0) {
                if (button.classList.contains("active")) {
                    // If already active, deselect it
                    button.classList.remove("active");
                    // Reset any active powerup modes
                    if (gameState.wallPlacementMode) {
                        gameState.wallPlacementMode = false;
                        gameState.previewWall = null;
                        document.removeEventListener("keydown", handleWallRotation);
                        document.removeEventListener("keyup", handleWallRotation);
                        canvas.removeEventListener("mousemove", handleWallPreview);
                    }
                    if (gameState.bounceWallMode) {
                        gameState.bounceWallMode = false;
                        gameState.hoveredWall = null;
                        canvas.removeEventListener("mousemove", handleWallHover);
                    }
                    updateMessageDisplay(`Player ${gameState.currentPlayer + 1}'s Turn`);
                } else {
                    // If not active, select it and activate the powerup
                    button.classList.add("active");
                    activatePowerup(powerup.name);
                }
            }
        });
        
        container.appendChild(button);
    }
}

/**
 * Activate a powerup
 * @param {string} powerupName - The name of the powerup to activate
 */
function activatePowerup(powerupName) {
    switch (powerupName) {
        case "Super Swing":
            // Super Swing is handled in handleMouseUp
            break;
        case "Wall Placement":
            gameState.wallPlacementMode = true;
            gameState.previewWall = {
                x: 0,
                y: 0,
                width: 50,
                height: 10,
                angle: 0,
                alpha: 0.5
            };
            
            // Add rotation controls message
            updateMessageDisplay("Hold R to rotate wall, Click to place");
            
            // Add rotation event listeners
            document.addEventListener("keydown", handleWallRotation);
            document.addEventListener("keyup", handleWallRotation);
            
            // Update mouse move handler for wall preview
            canvas.addEventListener("mousemove", handleWallPreview);
            canvas.addEventListener("click", placeWall, { once: true });
            break;
        case "Bounce Wall":
            gameState.bounceWallMode = true;
            updateMessageDisplay("Hover over a wall to make it bouncy");
            
            // Add mouse move handler for wall highlighting
            canvas.addEventListener("mousemove", handleWallHover);
            canvas.addEventListener("click", makeBounceWall, { once: true });
            break;
    }
}

/**
 * Create the arena with walls and obstacles
 */
function createArena() {
    // Clear existing walls
    gameState.walls = [];
    
    // Add boundary walls
    addWall(0, 0, CANVAS_WIDTH, 10); // Top
    addWall(0, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 10); // Bottom
    addWall(0, 0, 10, CANVAS_HEIGHT); // Left
    addWall(CANVAS_WIDTH - 10, 0, 10, CANVAS_HEIGHT); // Right
    
    // Add some obstacles (various angles and sizes)
    
    // Center obstacle
    addWall(CANVAS_WIDTH/2 - 50, CANVAS_HEIGHT/2 - 50, 100, 100);
    
    // Angled walls
    addWall(CANVAS_WIDTH/4, CANVAS_HEIGHT/4, 150, 15, Math.PI/6);
    addWall(CANVAS_WIDTH*3/4, CANVAS_HEIGHT*3/4, 150, 15, -Math.PI/6);
    
    // Small obstacles
    addWall(CANVAS_WIDTH/3, CANVAS_HEIGHT*2/3, 40, 40);
    addWall(CANVAS_WIDTH*2/3, CANVAS_HEIGHT/3, 40, 40);
    
    // L-shaped obstacle
    addWall(CANVAS_WIDTH/5, CANVAS_HEIGHT/2, 80, 15);
    addWall(CANVAS_WIDTH/5, CANVAS_HEIGHT/2, 15, 80);
    
    // Breakable walls (thinner)
    addWall(CANVAS_WIDTH/2, CANVAS_HEIGHT/4, 80, 8, 0, true);
    addWall(CANVAS_WIDTH/2, CANVAS_HEIGHT*3/4, 80, 8, 0, true);
    
    // Position the holes on opposite sides
    gameState.holes[0].x = CANVAS_WIDTH * 0.85;
    gameState.holes[0].y = CANVAS_HEIGHT * 0.15;
    gameState.holes[1].x = CANVAS_WIDTH * 0.15;
    gameState.holes[1].y = CANVAS_HEIGHT * 0.85;
    
    // Place balls near their starting positions
    resetBallPositions();
}

/**
 * Add a wall to the arena
 * @param {number} x - X coordinate of the wall's top-left corner
 * @param {number} y - Y coordinate of the wall's top-left corner
 * @param {number} width - Width of the wall
 * @param {number} height - Height of the wall
 * @param {number} angle - Rotation angle in radians (default: 0)
 * @param {boolean} breakable - Whether the wall can be broken (default: false)
 */
function addWall(x, y, width, height, angle = 0, breakable = false) {
    gameState.walls.push({
        x, y, width, height, angle, breakable,
        bouncy: false,
        bouncyTurnsLeft: 0,
        vertices: calculateWallVertices(x, y, width, height, angle)
    });
}

/**
 * Calculate the vertices of a rotated rectangle (wall)
 * @param {number} x - X coordinate of the rectangle's center
 * @param {number} y - Y coordinate of the rectangle's center
 * @param {number} width - Width of the rectangle
 * @param {number} height - Height of the rectangle
 * @param {number} angle - Rotation angle in radians
 * @returns {Array} Array of vertex coordinates {x, y}
 */
function calculateWallVertices(x, y, width, height, angle) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const centerX = x + halfWidth;
    const centerY = y + halfHeight;
    
    // Calculate vertices relative to center
    const vertices = [
        { x: -halfWidth, y: -halfHeight },
        { x: halfWidth, y: -halfHeight },
        { x: halfWidth, y: halfHeight },
        { x: -halfWidth, y: halfHeight }
    ];
    
    // Apply rotation and translate back
    return vertices.map(vertex => {
        const rotatedX = vertex.x * Math.cos(angle) - vertex.y * Math.sin(angle);
        const rotatedY = vertex.x * Math.sin(angle) + vertex.y * Math.cos(angle);
        return {
            x: rotatedX + centerX,
            y: rotatedY + centerY
        };
    });
}

/**
 * Reset ball positions to their starting points
 */
function resetBallPositions() {
    gameState.balls[0].x = CANVAS_WIDTH * 0.15;
    gameState.balls[0].y = CANVAS_HEIGHT * 0.15;
    gameState.balls[0].vx = 0;
    gameState.balls[0].vy = 0;
    
    gameState.balls[1].x = CANVAS_WIDTH * 0.85;
    gameState.balls[1].y = CANVAS_HEIGHT * 0.85;
    gameState.balls[1].vx = 0;
    gameState.balls[1].vy = 0;
}

/**
 * Handle mouse down events for aiming
 * @param {MouseEvent} e - The mouse event
 */
function handleMouseDown(e) {
    if (gameState.currentScreen !== "game" || isBallMoving()) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const currentBall = gameState.balls[gameState.currentPlayer];
    
    // Check if we clicked near the current player's ball
    const dx = mouseX - currentBall.x;
    const dy = mouseY - currentBall.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < BALL_RADIUS * 3) {
        gameState.isAiming = true;
        gameState.swingPower = 0;
        gameState.swingAngle = Math.atan2(dy, dx);
    }
}

/**
 * Handle mouse move events for aiming
 * @param {MouseEvent} e - The mouse event
 */
function handleMouseMove(e) {
    if (!gameState.isAiming) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const currentBall = gameState.balls[gameState.currentPlayer];
    
    // Calculate angle and power
    const dx = mouseX - currentBall.x;
    const dy = mouseY - currentBall.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    gameState.swingAngle = Math.atan2(dy, dx);
    gameState.swingPower = Math.min(distance / 10, MAX_POWER);
    
    // Update UI elements
    updatePowerBar();
    updateAngleIndicator();
}

/**
 * Handle mouse up events for shooting
 */
function handleMouseUp() {
    if (!gameState.isAiming) return;
    
    // Apply force to the ball
    const currentBall = gameState.balls[gameState.currentPlayer];
    let power = gameState.swingPower;
    
    // Check if Super Swing powerup is active
    const powerupButton = document.querySelector(".powerup-button");
    if (powerupButton && powerupButton.classList.contains("active")) {
        const selectedPowerupIndex = gameState.selectedPowerups[gameState.currentPlayer];
        const selectedPowerup = gameState.powerups[selectedPowerupIndex];
        
        if (selectedPowerup.name === "Super Swing") {
            power *= 2;
            // Consume the powerup after using it
            consumePowerup("Super Swing");
        }
    }
    
    // Apply velocity
    currentBall.vx = Math.cos(gameState.swingAngle) * power;
    currentBall.vy = Math.sin(gameState.swingAngle) * power;
    
    // Reset aiming state
    gameState.isAiming = false;
    
    // Mark that the player has taken their shot
    gameState.hasShot = true;
}

/**
 * Check if a powerup is currently active for the current player
 * @param {string} powerupName - The name of the powerup to check
 * @returns {boolean} True if the powerup is active
 */
function isActivePowerup(powerupName) {
    const selectedPowerupIndex = gameState.selectedPowerups[gameState.currentPlayer];
    const selectedPowerup = gameState.powerups[selectedPowerupIndex];
    
    return selectedPowerup && 
           selectedPowerup.name === powerupName && 
           selectedPowerup.currentCooldowns[gameState.currentPlayer] === 0;
}

/**
 * Consume a powerup and start its cooldown
 * @param {string} powerupName - The name of the powerup to consume
 */
function consumePowerup(powerupName) {
    const powerupIndex = gameState.powerups.findIndex(p => p.name === powerupName);
    if (powerupIndex !== -1) {
        const powerup = gameState.powerups[powerupIndex];
        powerup.currentCooldowns[gameState.currentPlayer] = powerup.cooldown;
        
        updatePowerupButtons();
    }
}

/**
 * Activate Wall Placement powerup
 */
function activateWallPlacement() {
    gameState.wallPlacementMode = true;
    gameState.previewWall = {
        x: 0,
        y: 0,
        width: 50,
        height: 10,
        angle: 0,
        alpha: 0.5
    };
    
    // Add rotation controls message
    updateMessageDisplay("Hold R to rotate wall, Click to place");
    
    // Add rotation event listeners
    document.addEventListener("keydown", handleWallRotation);
    document.addEventListener("keyup", handleWallRotation);
    
    // Update mouse move handler for wall preview
    canvas.addEventListener("mousemove", handleWallPreview);
    canvas.addEventListener("click", placeWall, { once: true });
    
    consumePowerup("Wall Placement");
}

/**
 * Handle wall rotation
 * @param {KeyboardEvent} e - The keyboard event
 */
function handleWallRotation(e) {
    if (!gameState.wallPlacementMode) return;
    
    if (e.key.toLowerCase() === 'r' && e.type === 'keydown') {
        gameState.previewWall.angle += Math.PI / 8; // Rotate 22.5 degrees
    }
}

/**
 * Handle wall preview movement
 * @param {MouseEvent} e - The mouse event
 */
function handleWallPreview(e) {
    if (!gameState.wallPlacementMode) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Update preview wall position
    gameState.previewWall.x = mouseX - gameState.previewWall.width / 2;
    gameState.previewWall.y = mouseY - gameState.previewWall.height / 2;
}

/**
 * Place a temporary wall at the clicked location
 * @param {MouseEvent} e - The mouse event
 */
function placeWall(e) {
    if (!gameState.wallPlacementMode) return;
    
    // Create the actual wall
    const wall = {
        x: gameState.previewWall.x,
        y: gameState.previewWall.y,
        width: gameState.previewWall.width,
        height: gameState.previewWall.height,
        angle: gameState.previewWall.angle,
        breakable: false,
        bouncy: false,
        temporary: true,
        turnsLeft: 2
    };
    
    // Add wall to game state
    gameState.walls.push(wall);
    
    // Add to active powerups
    gameState.activePowerups.push({
        type: "Wall Placement",
        wall: wall,
        turnsLeft: 2
    });
    
    // Clean up wall placement mode
    gameState.wallPlacementMode = false;
    gameState.previewWall = null;
    document.removeEventListener("keydown", handleWallRotation);
    document.removeEventListener("keyup", handleWallRotation);
    canvas.removeEventListener("mousemove", handleWallPreview);
    
    // Consume the powerup after using it
    consumePowerup("Wall Placement");
    
    // Update message to show current player's turn
    updateMessageDisplay(`Player ${gameState.currentPlayer + 1}'s Turn`);
}

/**
 * Activate Bounce Wall powerup
 */
function activateBounceWall() {
    gameState.bounceWallMode = true;
    updateMessageDisplay("Hover over a wall to make it bouncy");
    
    // Add mouse move handler for wall highlighting
    canvas.addEventListener("mousemove", handleWallHover);
    canvas.addEventListener("click", makeBounceWall, { once: true });
    
    consumePowerup("Bounce Wall");
}

/**
 * Handle wall hover highlighting
 * @param {MouseEvent} e - The mouse event
 */
function handleWallHover(e) {
    if (!gameState.bounceWallMode) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Reset previous hovered wall
    if (gameState.hoveredWall) {
        gameState.hoveredWall.isHovered = false;
    }
    
    // Find wall under cursor
    gameState.hoveredWall = null;
    for (let i = 0; i < gameState.walls.length; i++) {
        const wall = gameState.walls[i];
        
        // Skip if wall is already bouncy
        if (wall.bouncy) continue;
        
        // Calculate wall center and dimensions
        const centerX = wall.x + wall.width / 2;
        const centerY = wall.y + wall.height / 2;
        
        // Calculate distance from mouse to wall center
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        
        // Rotate point to wall's local space
        const rotatedX = dx * Math.cos(-wall.angle) - dy * Math.sin(-wall.angle);
        const rotatedY = dx * Math.sin(-wall.angle) + dy * Math.cos(-wall.angle);
        
        // Check if point is within wall bounds
        const halfWidth = wall.width / 2;
        const halfHeight = wall.height / 2;
        
        if (Math.abs(rotatedX) <= halfWidth && Math.abs(rotatedY) <= halfHeight) {
            wall.isHovered = true;
            gameState.hoveredWall = wall;
            break;
        }
    }
}

/**
 * Make a wall bouncy when clicked
 * @param {MouseEvent} e - The mouse event
 */
function makeBounceWall(e) {
    if (!gameState.bounceWallMode || !gameState.hoveredWall) return;
    
    const wall = gameState.hoveredWall;
    
    // Don't consume powerup if wall is already bouncy
    if (wall.bouncy) return;
    
    wall.bouncy = true;
    wall.bouncyTurnsLeft = 3; // Increased from 2 to 3 turns
    
    gameState.activePowerups.push({
        type: "Bounce Wall",
        wall: wall,
        turnsLeft: 3 // Increased from 2 to 3 turns
    });
    
    // Clean up bounce wall mode
    gameState.bounceWallMode = false;
    gameState.hoveredWall = null;
    canvas.removeEventListener("mousemove", handleWallHover);
    
    // Consume the powerup after using it
    consumePowerup("Bounce Wall");
    
    // Update message to show current player's turn
    updateMessageDisplay(`Player ${gameState.currentPlayer + 1}'s Turn`);
}

/**
 * Check if any ball is currently in motion
 * @returns {boolean} True if any ball is moving
 */
function isBallMoving() {
    return gameState.balls.some(ball => 
        Math.abs(ball.vx) > 0.01 || Math.abs(ball.vy) > 0.01
    );
}

/**
 * Update the power bar UI element
 */
function updatePowerBar() {
    const percentage = (gameState.swingPower / MAX_POWER) * 100;
    powerBar.style.width = `${percentage}%`;
    
    // Change color based on power
    if (percentage < 30) {
        powerBar.style.backgroundColor = "#00FF00";
    } else if (percentage < 70) {
        powerBar.style.backgroundColor = "#FFFF00";
    } else {
        powerBar.style.backgroundColor = "#FF0000";
    }
}

/**
 * Update the angle indicator UI element
 */
function updateAngleIndicator() {
    const angle = gameState.swingAngle * (180 / Math.PI);
    angleIndicator.textContent = `Angle: ${angle.toFixed(1)}°`;
}

/**
 * Update the score display
 */
function updateScoreDisplay() {
    scoreDisplay.textContent = `Player 1: ${gameState.scores[0]} - Player 2: ${gameState.scores[1]}`;
}

/**
 * Update the message display with player turn indicator
 * @param {string} message - The message to display
 */
function updateMessageDisplay(message) {
    const playerColor = PLAYER_COLORS[gameState.currentPlayer];
    messageDisplay.innerHTML = `
        <span>${message}</span>
        <span class="player-indicator" style="background-color: ${playerColor}"></span>
    `;
}

/**
 * Update the powerup buttons based on cooldowns
 */
function updatePowerupButtons() {
    const button = document.querySelector(".powerup-button");
    if (button) {
        const selectedPowerupIndex = gameState.selectedPowerups[gameState.currentPlayer];
        const powerup = gameState.powerups[selectedPowerupIndex];
        const cooldownElement = button.querySelector(".powerup-cooldown");
        
        if (powerup.currentCooldowns[gameState.currentPlayer] > 0) {
            button.disabled = true;
            button.classList.add("disabled");
            button.classList.remove("active");
            cooldownElement.textContent = `CD: ${powerup.currentCooldowns[gameState.currentPlayer]}`;
        } else {
            button.disabled = false;
            button.classList.remove("disabled");
            cooldownElement.textContent = "Ready";
        }
    }
}

/**
 * Switch to the next player's turn
 */
function nextTurn() {
    // Reset shot flag
    gameState.hasShot = false;
    
    // Only reduce cooldowns when both players have taken their shots
    if (gameState.currentPlayer === 1) { // This means it's the end of a full turn
        gameState.powerups.forEach(powerup => {
            // Reduce cooldown for each player
            powerup.currentCooldowns[0] = Math.max(0, powerup.currentCooldowns[0] - 1);
            powerup.currentCooldowns[1] = Math.max(0, powerup.currentCooldowns[1] - 1);
        });
    }
    
    // Reduce turns left for active powerups
    gameState.activePowerups.forEach(powerup => {
        powerup.turnsLeft--;
        
        // Remove expired powerups
        if (powerup.turnsLeft <= 0) {
            if (powerup.type === "Wall Placement") {
                // Remove temporary wall
                const index = gameState.walls.findIndex(w => w === powerup.wall);
                if (index !== -1) {
                    gameState.walls.splice(index, 1);
                }
            } else if (powerup.type === "Bounce Wall") {
                // Reset wall to normal
                powerup.wall.bouncy = false;
            }
        }
    });
    
    // Remove expired powerups from list
    gameState.activePowerups = gameState.activePowerups.filter(p => p.turnsLeft > 0);
    
    // Switch to other player
    gameState.currentPlayer = 1 - gameState.currentPlayer;
    
    // Update UI
    initializeGamePowerupButtons(); // Reinitialize powerup buttons for the new player
    updateMessageDisplay(`Player ${gameState.currentPlayer + 1}'s Turn`);
}

/**
 * Check if the current round has ended (ball in hole)
 */
function checkRoundEnd() {
    for (let i = 0; i < gameState.balls.length; i++) {
        const ball = gameState.balls[i];
        const targetHole = gameState.holes[i];
        
        const dx = ball.x - targetHole.x;
        const dy = ball.y - targetHole.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < HOLE_RADIUS) {
            // Ball in hole, round over
            gameState.scores[i]++;
            
            if (gameState.scores[i] >= gameState.roundsToWin) {
                // Game over
                showGameEnd(i);
            } else {
                // Next round
                gameState.currentRound++;
                showRoundEnd(i);
            }
            
            break;
        }
    }
}

/**
 * Show the round end screen
 * @param {number} winner - The index of the winning player
 */
function showRoundEnd(winner) {
    gameState.currentScreen = "roundEnd";
    updateMessageDisplay(`Player ${winner + 1} wins the round! Next round starting in 3...`);
    
    let countdown = 3;
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            updateMessageDisplay(`Player ${winner + 1} wins the round! Next round starting in ${countdown}...`);
        } else {
            clearInterval(countdownInterval);
            startRound();
        }
    }, 1000);
}

/**
 * Show the game end screen
 * @param {number} winner - The index of the winning player
 */
function showGameEnd(winner) {
    gameState.currentScreen = "gameEnd";
    document.getElementById("titleScreen").style.display = "none";
    document.getElementById("setupScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("gameEndScreen").style.display = "flex";
    
    document.getElementById("winnerMessage").textContent = `Player ${winner + 1} wins the game!`;
}

/**
 * Reset the game to start again
 */
function resetGame() {
    gameState.currentRound = 1;
    gameState.scores = [0, 0];
    gameState.currentPlayer = 0;
    gameState.walls = [];
    gameState.activePowerups = [];
    
    gameState.powerups.forEach(powerup => {
        powerup.currentCooldowns[0] = 0;
        powerup.currentCooldowns[1] = 0;
    });
    
    startGame();
}

/**
 * Main game loop
 */
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

/**
 * Update game state
 */
function update() {
    if (gameState.currentScreen !== "game") return;
    
    // Update ball physics
    updateBalls();
    
    // Check for ball-hole collisions
    checkRoundEnd();
    
    // Check if current player's ball has stopped moving and they have shot
    const currentBall = gameState.balls[gameState.currentPlayer];
    const isCurrentBallStopped = Math.abs(currentBall.vx) < 0.01 && Math.abs(currentBall.vy) < 0.01;
    
    if (isCurrentBallStopped && gameState.hasShot) {
        // If the player has used a powerup that requires aiming (e.g., Wall Placement),
        // wait for them to complete that action
        if (gameState.wallPlacementMode || gameState.bounceWallMode) {
            return;
        }
        
        // Move to next turn
        nextTurn();
    }
}

/**
 * Update ball physics
 */
function updateBalls() {
    for (let i = 0; i < gameState.balls.length; i++) {
        const ball = gameState.balls[i];
        
        // Apply friction
        ball.vx *= FRICTION;
        ball.vy *= FRICTION;
        
        // Stop very small movements
        if (Math.abs(ball.vx) < 0.01) ball.vx = 0;
        if (Math.abs(ball.vy) < 0.01) ball.vy = 0;
        
        // Update position
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Wall collisions
        checkWallCollisions(ball);
        
        // Ball-ball collisions
        checkBallCollisions();
    }
}

/**
 * Check for and handle wall collisions
 * @param {Object} ball - The ball to check
 */
function checkWallCollisions(ball) {
    // First, handle canvas boundaries
    if (ball.x < BALL_RADIUS) {
        ball.x = BALL_RADIUS;
        ball.vx = -ball.vx * 0.8;
    } else if (ball.x > CANVAS_WIDTH - BALL_RADIUS) {
        ball.x = CANVAS_WIDTH - BALL_RADIUS;
        ball.vx = -ball.vx * 0.8;
    }
    
    if (ball.y < BALL_RADIUS) {
        ball.y = BALL_RADIUS;
        ball.vy = -ball.vy * 0.8;
    } else if (ball.y > CANVAS_HEIGHT - BALL_RADIUS) {
        ball.y = CANVAS_HEIGHT - BALL_RADIUS;
        ball.vy = -ball.vy * 0.8;
    }
    
    // Then, check collisions with walls
    for (let i = 0; i < gameState.walls.length; i++) {
        const wall = gameState.walls[i];
        
        // Simple rectangular collision detection for now
        // This could be improved for angled walls
        const closestX = Math.max(wall.x, Math.min(ball.x, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(ball.y, wall.y + wall.height));
        
        const distanceX = ball.x - closestX;
        const distanceY = ball.y - closestY;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        if (distance < BALL_RADIUS) {
            // Collision response
            const normalX = distanceX / distance;
            const normalY = distanceY / distance;
            
            // Reposition the ball
            ball.x = closestX + normalX * BALL_RADIUS;
            ball.y = closestY + normalY * BALL_RADIUS;
            
            // Calculate reflection
            const dotProduct = ball.vx * normalX + ball.vy * normalY;
            const bounceFactor = wall.bouncy ? 1.5 : 0.8;
            
            ball.vx = (ball.vx - 2 * dotProduct * normalX) * bounceFactor;
            ball.vy = (ball.vy - 2 * dotProduct * normalY) * bounceFactor;
            
            // Check if ball has Super Swing and wall is breakable
            const hasSuperSwing = gameState.activePowerups.some(p => 
                p.type === "Super Swing" && p.player === gameState.currentPlayer
            );
            
            if (hasSuperSwing && wall.breakable && 
                (Math.abs(ball.vx) > MAX_POWER || Math.abs(ball.vy) > MAX_POWER)) {
                // Break the wall
                gameState.walls.splice(i, 1);
                i--;
            }
        }
    }
}

/**
 * Check for and handle ball-ball collisions
 */
function checkBallCollisions() {
    if (gameState.balls.length < 2) return;
    
    const ball1 = gameState.balls[0];
    const ball2 = gameState.balls[1];
    
    const dx = ball2.x - ball1.x;
    const dy = ball2.y - ball1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < BALL_RADIUS * 2) {
        // Calculate collision normal
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Calculate relative velocity
        const vx = ball1.vx - ball2.vx;
        const vy = ball1.vy - ball2.vy;
        
        // Calculate impulse
        const impulse = 2 * (vx * nx + vy * ny) / 2;
        
        // Apply impulse to both balls
        ball1.vx -= impulse * nx;
        ball1.vy -= impulse * ny;
        ball2.vx += impulse * nx;
        ball2.vy += impulse * ny;
        
        // Separate balls to prevent sticking
        const overlap = (BALL_RADIUS * 2) - distance;
        ball1.x -= overlap * nx / 2;
        ball1.y -= overlap * ny / 2;
        ball2.x += overlap * nx / 2;
        ball2.y += overlap * ny / 2;
    }
}

/**
 * Render the game
 */
function render() {
    // Clear canvas
    ctx.fillStyle = "#8CC067"; // Golf green color
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    if (gameState.currentScreen === "game") {
        // Draw holes
        renderHoles();
        
        // Draw walls
        renderWalls();
        
        // Draw preview wall if in placement mode
        if (gameState.wallPlacementMode && gameState.previewWall) {
            renderPreviewWall();
        }
        
        // Draw balls
        renderBalls();
        
        // Draw aiming line if aiming
        renderAimingLine();
    }
}

/**
 * Render the holes
 */
function renderHoles() {
    gameState.holes.forEach(hole => {
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, HOLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#000000";
        ctx.fill();
        
        // Add a rim
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, HOLE_RADIUS + 2, 0, Math.PI * 2);
        ctx.strokeStyle = hole.color;
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

/**
 * Render the walls
 */
function renderWalls() {
    gameState.walls.forEach(wall => {
        ctx.save();
        
        // Translate to the center of the wall
        const centerX = wall.x + wall.width / 2;
        const centerY = wall.y + wall.height / 2;
        
        ctx.translate(centerX, centerY);
        ctx.rotate(wall.angle);
        
        // Draw the wall with appropriate color
        if (wall.bouncy) {
            ctx.fillStyle = "#0000FF"; // Deep blue for bouncy walls
        } else if (wall.isHovered && gameState.bounceWallMode) {
            ctx.fillStyle = "rgba(0, 150, 255, 0.5)"; // Light blue for hover
        } else {
            ctx.fillStyle = WALL_COLORS.NORMAL;
        }
        
        ctx.fillRect(-wall.width / 2, -wall.height / 2, wall.width, wall.height);
        
        // Add a pattern or indicator for breakable walls
        if (wall.breakable) {
            ctx.strokeStyle = "#FFFFFF";
            ctx.setLineDash([5, 3]);
            ctx.strokeRect(-wall.width / 2, -wall.height / 2, wall.width, wall.height);
            ctx.setLineDash([]);
        }
        
        // Add an indicator for temporary walls
        if (wall.temporary) {
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "10px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(wall.turnsLeft, 0, 0);
        }
        
        ctx.restore();
    });
}

/**
 * Render the balls
 */
function renderBalls() {
    gameState.balls.forEach(ball => {
        // Draw shadow
        ctx.beginPath();
        ctx.arc(ball.x + 2, ball.y + 2, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fill();
        
        // Draw ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        
        // Draw lines on the ball
        ctx.beginPath();
        ctx.moveTo(ball.x - BALL_RADIUS, ball.y);
        ctx.lineTo(ball.x + BALL_RADIUS, ball.y);
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y - BALL_RADIUS);
        ctx.lineTo(ball.x, ball.y + BALL_RADIUS);
        ctx.stroke();
    });
}

/**
 * Render the aiming line when player is aiming
 */
function renderAimingLine() {
    if (!gameState.isAiming) return;
    
    const currentBall = gameState.balls[gameState.currentPlayer];
    const angle = gameState.swingAngle;
    const power = gameState.swingPower;
    
    // Draw aiming line
    ctx.beginPath();
    ctx.moveTo(currentBall.x, currentBall.y);
    
    // Inverse the angle to show where the ball will go
    const aimX = currentBall.x - Math.cos(angle) * power * 5;
    const aimY = currentBall.y - Math.sin(angle) * power * 5;
    
    ctx.lineTo(aimX, aimY);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw power indicator
    ctx.beginPath();
    ctx.arc(aimX, aimY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
}

/**
 * Render the preview wall
 */
function renderPreviewWall() {
    ctx.save();
    
    // Translate to the center of the wall
    const centerX = gameState.previewWall.x + gameState.previewWall.width / 2;
    const centerY = gameState.previewWall.y + gameState.previewWall.height / 2;
    
    ctx.translate(centerX, centerY);
    ctx.rotate(gameState.previewWall.angle);
    
    // Draw the wall with transparency
    ctx.fillStyle = `rgba(85, 85, 85, ${gameState.previewWall.alpha})`;
    ctx.fillRect(-gameState.previewWall.width / 2, -gameState.previewWall.height / 2, 
                 gameState.previewWall.width, gameState.previewWall.height);
    
    ctx.restore();
}

// Export functions for use in HTML file
window.startGame = startGame;
window.resetGame = resetGame;