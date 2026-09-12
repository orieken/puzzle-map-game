# Maze of Whispers

A Vue 3 and Tailwind tabletop companion for a Dungeon Master running a shared, turn-based maze expedition.

## Play online

[Launch Maze of Whispers](https://incandescent-puppy-119c84.netlify.app/)

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
