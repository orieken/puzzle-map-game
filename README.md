# Maze of Whispers

A Vue 3 and Tailwind tabletop companion for a Dungeon Master running a shared, turn-based maze expedition.

## Play online

[Launch Maze of Whispers](https://incandescent-puppy-119c84.netlify.app/)

## Create and run a game

1. Open the live application.
2. Enter the Dungeon Master's display name.
3. Add each party member by entering their name and selecting **+**. Players can be removed before the maze is generated.
4. Select **Generate the maze**. The app creates a solvable 12×12 maze, places the escape hole, scatters the party around the perimeter, and assigns discoveries.
5. From the DM dashboard, inspect the maze and select **Regenerate** if a different layout is preferred.
6. Select **Begin expedition** to start the first player's turn.
7. Use the **Player** tab in the header to preview the active player's limited view. Select a different party member from the player menu when needed.
8. The player moves, searches, makes a ruckus, or uses an item. Physical search and ruckus rolls are entered by the player and approved or rejected from the DM dashboard.
9. After the action and any encounter are resolved, the DM selects **Advance turn**.
10. Continue until every living player reaches the center.

> Multiplayer note: the deployed prototype currently saves a session only in the browser that created it. Players on separate devices cannot join with the code until the Firebase integration is complete. See [Firebase and Firestore Setup](./docs/FIREBASE_SETUP.md) for the backend setup plan.

## Screenshots

### Create an expedition

![Maze of Whispers expedition setup](./docs/images/maze-of-whispers-setup.png)

### Dungeon Master dashboard

![Maze of Whispers Dungeon Master dashboard](./docs/images/maze-of-whispers-dm-dashboard.png)

### Player view

![Maze of Whispers player view](./docs/images/maze-of-whispers-player-view.png)

## Current prototype

The browser prototype includes:

- A generated, solvable 12×12 maze with extra route loops
- Random perimeter player spawns and a central escape hole
- Full DM map, player roster, turn controls, roll approval, and encounter resolution
- Limited player room/sightline view with an optional explored map
- Physical search and ruckus roll submission
- Randomized discoveries, starter items, inventory, death, and restoration
- Chance-based perimeter ghost noise, fading sound, and abomination pathfinding
- Proximity and direction warnings for players
- Browser-local save and rejoin support
- Responsive DM and phone-sized player interfaces

Game rules and future phases are documented in [GAME_DESIGN.md](./GAME_DESIGN.md).

Firebase project preparation and the planned multiplayer data model are documented in [Firebase and Firestore Setup](./docs/FIREBASE_SETUP.md).

> The current build is a single-browser prototype. A server-backed realtime transport and shared database are the next step for true multi-device game-code sessions.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Create an expedition, begin it from the DM dashboard, then use the header role switch to preview each player's screen.

## Quality checks

```bash
npm test
npm run build
```
