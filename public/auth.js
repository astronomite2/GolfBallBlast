class Auth {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.database();
        this.setupAuthListeners();
    }

    setupAuthListeners() {
        this.auth.onAuthStateChanged(user => {
            if (user) {
                this.onSignIn(user);
            } else {
                this.showLoginScreen();
            }
        });

        document.getElementById('loginButton').addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            this.auth.signInWithPopup(provider);
        });
    }

    onSignIn(user) {
        // Update user profile in database
        this.db.ref(`users/${user.uid}`).update({
            name: user.displayName,
            email: user.email,
            lastLogin: Date.now()
        });

        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('lobbyScreen').style.display = 'block';
        
        // Initialize lobby
        new Lobby(user);
    }

    showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('lobbyScreen').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'none';
    }
} 