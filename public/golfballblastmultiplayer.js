// Firebase configuration
const firebaseConfig = {
    // Replace with your Firebase config
    apiKey: "YOUR_API_KEY",
    authDomain: "your-app.firebaseapp.com",
    databaseURL: "https://your-app.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-app.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Game constants (same as golfballblast.js)
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
const ROUND_RESET_TIME = 3000;

// Multiplayer-specific variables
let playerData = {
    displayName: '',
    playerId: '',
    gameId: null,
    isHost: false
};

let gameState = null;
let gameRef = null;

// DOM Elements
const displayNameInput = document.getElementById('display-name');
const joinQueueButton = document.getElementById('join-queue');
const leaveQueueButton = document.getElementById('leave-queue');
const lobbySection = document.getElementById('lobby-section');
const queueSection = document.getElementById('queue-section');
const statusMessage = document.getElementById('status-message');

// Event Listeners
joinQueueButton.addEventListener('click', joinQueue);
leaveQueueButton.addEventListener('click', leaveQueue);
displayNameInput.addEventListener('input', validateName);

// Validate display name
function validateName() {
    const name = displayNameInput.value.trim();
    joinQueueButton.disabled = name.length < 3;
}

// Join the matchmaking queue
async function joinQueue() {
    const displayName = displayNameInput.value.trim();
    if (displayName.length < 3) return;

    playerData.displayName = displayName;
    playerData.playerId = generatePlayerId();

    // Show queue section
    lobbySection.style.display = 'none';
    queueSection.style.display = 'block';

    // Add player to queue
    const queueRef = database.ref('queue');
    const waitingPlayers = await queueRef.once('value');
    
    if (!waitingPlayers.exists()) {
        // Create new game as host
        createGame();
    } else {
        // Join existing game
        joinExistingGame(waitingPlayers);
    }
}

// Leave the queue
function leaveQueue() {
    if (playerData.gameId) {
        database.ref(`games/${playerData.gameId}`).remove();
    }
    database.ref(`queue/${playerData.playerId}`).remove();
    
    // Show lobby section
    queueSection.style.display = 'none';
    lobbySection.style.display = 'block';
}

// Create a new game as host
function createGame() {
    const gameId = generateGameId();
    playerData.gameId = gameId;
    playerData.isHost = true;

    // Add to queue
    database.ref(`queue/${playerData.playerId}`).set({
        displayName: playerData.displayName,
        gameId: gameId,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    // Create game instance
    const gameData = initializeGameState();
    gameRef = database.ref(`games/${gameId}`);
    gameRef.set(gameData);

    // Listen for opponent
    listenForOpponent(gameId);
}

// Join an existing game
function joinExistingGame(waitingPlayers) {
    const games = Object.entries(waitingPlayers.val());
    const oldestGame = games.sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    
    if (oldestGame) {
        const [hostId, hostData] = oldestGame;
        playerData.gameId = hostData.gameId;
        playerData.isHost = false;

        // Join the game
        gameRef = database.ref(`games/${hostData.gameId}`);
        gameRef.child('guest').set({
            id: playerData.playerId,
            displayName: playerData.displayName
        });

        // Remove host from queue
        database.ref(`queue/${hostId}`).remove();

        // Start listening to game state
        listenToGameState();
    }
}

// Listen for opponent joining
function listenForOpponent(gameId) {
    gameRef.child('guest').on('value', (snapshot) => {
        if (snapshot.exists()) {
            // Opponent joined, start the game
            database.ref(`queue/${playerData.playerId}`).remove();
            startMultiplayerGame();
        }
    });
}

// Initialize game state
function initializeGameState() {
    return {
        host: {
            id: playerData.playerId,
            displayName: playerData.displayName
        },
        currentScreen: "setup",
        roundsToWin: 3,
        currentRound: 1,
        currentPlayer: 0,
        scores: [0, 0],
        balls: [
            { x: CANVAS_WIDTH * 0.15, y: CANVAS_HEIGHT * 0.15, vx: 0, vy: 0, color: PLAYER_COLORS[0] },
            { x: CANVAS_WIDTH * 0.85, y: CANVAS_HEIGHT * 0.85, vx: 0, vy: 0, color: PLAYER_COLORS[1] }
        ],
        holes: [
            { x: CANVAS_WIDTH * 0.85, y: CANVAS_HEIGHT * 0.15, color: PLAYER_COLORS[1] },
            { x: CANVAS_WIDTH * 0.15, y: CANVAS_HEIGHT * 0.85, color: PLAYER_COLORS[0] }
        ],
        walls: createInitialWalls(),
        selectedPowerups: [null, null],
        lastAction: null
    };
}

// Create initial walls
function createInitialWalls() {
    const walls = [];
    
    // Add boundary walls
    addWall(walls, 0, 0, CANVAS_WIDTH, 10);
    addWall(walls, 0, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 10);
    addWall(walls, 0, 0, 10, CANVAS_HEIGHT);
    addWall(walls, CANVAS_WIDTH - 10, 0, 10, CANVAS_HEIGHT);
    
    // Add obstacles (same as original game)
    addWall(walls, CANVAS_WIDTH/2 - 50, CANVAS_HEIGHT/2 - 50, 100, 100);
    addWall(walls, CANVAS_WIDTH/4, CANVAS_HEIGHT/4, 150, 15, Math.PI/6);
    addWall(walls, CANVAS_WIDTH*3/4, CANVAS_HEIGHT*3/4, 150, 15, -Math.PI/6);
    
    return walls;
}

// Helper function to add walls
function addWall(walls, x, y, width, height, angle = 0, breakable = false) {
    walls.push({
        x, y, width, height, angle, breakable,
        bouncy: false,
        vertices: calculateWallVertices(x, y, width, height, angle)
    });
}

// Calculate wall vertices (same as original game)
function calculateWallVertices(x, y, width, height, angle) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const centerX = x + halfWidth;
    const centerY = y + halfHeight;
    
    const vertices = [
        { x: -halfWidth, y: -halfHeight },
        { x: halfWidth, y: -halfHeight },
        { x: halfWidth, y: halfHeight },
        { x: -halfWidth, y: halfHeight }
    ];
    
    return vertices.map(vertex => {
        const rotatedX = vertex.x * Math.cos(angle) - vertex.y * Math.sin(angle);
        const rotatedY = vertex.x * Math.sin(angle) + vertex.y * Math.cos(angle);
        return {
            x: rotatedX + centerX,
            y: rotatedY + centerY
        };
    });
}

// Start multiplayer game
function startMultiplayerGame() {
    // Redirect to game page
    window.location.href = `golfballblast.html?gameId=${playerData.gameId}&playerId=${playerData.playerId}`;
}

// Helper functions
function generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9);
}

function generateGameId() {
    return 'game_' + Math.random().toString(36).substr(2, 9);
}

// Update the original handleOnlineMultiplayer function in golfballblast.js to:
// window.handleOnlineMultiplayer = function() {
//     window.location.href = 'multiplayer-lobby.html';
// }; 