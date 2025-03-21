# Golf Ball Blast

This implementation provides a complete structure for your low-poly multiplayer ball game. Here's a breakdown of the key features:

### Game Features Implemented:

1. **Turn-based gameplay**: Players alternate turns, with clear indication of the current player
2. **Ball physics**: Includes momentum, friction, and wall collisions
3. **Scoring system**: Three holes on each side of the field for players to aim at
4. **Round-based play**: First to 3 rounds wins the game
5. **Aiming mechanism**: Use mouse to aim and control power (similar to golf games)
6. **UI elements**: Score display, current player indicator, round counter
7. **Reset functionality**: Can reset rounds or the entire game

### How to Play:

1. **Aiming**: Click and hold on the canvas to start aiming. The further you drag from your ball, the more power will be applied.
2. **Shooting**: Release the mouse button to shoot the ball in the direction opposite to where you dragged.
3. **Scoring**: Get your ball into one of the three holes on the opponent's side to win the round.
4. **Winning**: The first player to win 3 rounds wins the game.

### Powerup Implementation:

I've left a framework for powerups by including:
- A `gameState.isPowerup` flag that can be toggled when it's time to use a powerup
- Comments in the `switchTurn()` function where powerup logic would be implemented
- A modular structure that makes it easy to add powerup effects that modify the field or balls

To implement powerups, you would:
1. Create a collection of powerup functions that modify game elements
2. Add UI elements for selecting powerups
3. Implement the powerup selection before each turn
4. Apply the powerup effects to the relevant game objects

### Technical Notes:

- The game uses HTML Canvas for rendering
- All game logic is contained in a single HTML file for simplicity
- The collision detection handles both wall bounces and hole detection
- The game automatically handles turn switching when a ball stops moving

Would you like me to explain any specific part of the implementation in more detail, or would you like suggestions for how to implement the powerup system?