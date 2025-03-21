class Lobby {
    constructor(user) {
        this.user = user;
        this.db = firebase.database();
        this.setupLobbyListeners();
    }

    setupLobbyListeners() {
        document.getElementById('createGameButton').addEventListener('click', () => {
            this.createGame();
        });

        // Listen for active games
        this.db.ref('games').on('value', snapshot => {
            this.updateGamesList(snapshot.val());
        });
    }

    createGame() {
        const gameRef = this.db.ref('games').push();
        const gameData = {
            id: gameRef.key,
            host: {
                id: this.user.uid,
                name: this.user.displayName
            },
            status: 'waiting',
            created: Date.now()
        };

        gameRef.set(gameData);
    }

    updateGamesList(games) {
        const gamesContainer = document.getElementById('activeGames');
        gamesContainer.innerHTML = '';

        if (games) {
            Object.values(games).forEach(game => {
                if (game.status === 'waiting' && game.host.id !== this.user.uid) {
                    const gameElement = this.createGameElement(game);
                    gamesContainer.appendChild(gameElement);
                }
            });
        }
    }

    createGameElement(game) {
        const div = document.createElement('div');
        div.className = 'game-listing';
        div.innerHTML = `
            <span>Game by ${game.host.name}</span>
            <button onclick="joinGame('${game.id}')">Join Game</button>
        `;
        return div;
    }

    joinGame(gameId) {
        this.db.ref(`games/${gameId}`).update({
            guest: {
                id: this.user.uid,
                name: this.user.displayName
            },
            status: 'starting'
        });

        // Initialize multiplayer game
        new MultiplayerGame(gameId, false);
    }
} 