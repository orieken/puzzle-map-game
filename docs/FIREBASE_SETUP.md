# Firebase and Firestore Setup

This guide configures the Firebase realtime backend used by Maze of Whispers. The Vue application automatically enables multiplayer when all six Firebase environment variables are present.

## What Firebase will provide

- **Cloud Firestore:** shared game, player, turn, maze, noise, and discovery state
- **Firebase Authentication:** anonymous identities for DMs and players without requiring accounts
- **Realtime listeners:** immediate updates across the DM's browser and player devices
- **Security Rules:** DM-owned game state and limited player permissions

Netlify will continue to host the Vue application. Firebase will only provide authentication and data storage.

## 1. Create the Firebase project

1. Open the [Firebase console](https://console.firebase.google.com/).
2. Select **Add project**.
3. Name the project, for example `maze-of-whispers`.
4. Google Analytics is optional for this game and can be disabled initially.
5. Wait for Firebase to finish creating the project.

## 2. Register the web application

1. From **Project overview**, select the **Web** icon (`</>`).
2. Give the app a nickname such as `maze-of-whispers-web`.
3. Do not enable Firebase Hosting; the app is already hosted by Netlify.
4. Select **Register app**.
5. Keep the displayed Firebase configuration available for the environment-variable step below.

The browser Firebase configuration is not a server secret. Security comes from Authentication, Firestore Security Rules, and optionally App Check. Never place a service-account key or Firebase Admin SDK credentials in the Vue application.

## 3. Enable anonymous authentication

1. In the Firebase console, open **Build → Authentication**.
2. Select **Get started**.
3. Open the **Sign-in method** tab.
4. Select **Anonymous** from the provider list.
5. Enable it and select **Save**.

Each browser will now be able to receive a unique Firebase user ID without asking the player to create an account. See [Firebase's anonymous-authentication guide](https://firebase.google.com/docs/auth/web/anonymous-auth).

## 4. Create the Firestore database

1. Open **Build → Firestore Database**.
2. Select **Create database**.
3. Choose **Production mode**. Do not leave a public test-mode database connected to the deployed game.
4. Select the region nearest the expected players. The database location cannot be changed later, so choose carefully.
5. Finish creating the database.

## 5. Add the Firebase SDK

From the repository root, install the browser SDK:

```bash
npm install firebase
```

The application initializes `firebase/app`, `firebase/auth`, and `firebase/firestore` from `src/services/firebase.js`.

## 6. Configure local environment variables

Create `.env.local` in the repository root. This file is already excluded by the project's `*.local` Git ignore rule.

```dotenv
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_USE_EMULATOR=false
```

Copy each value from **Project settings → General → Your apps → SDK setup and configuration**. Restart the Vite development server after changing environment variables.

## 7. Configure the same variables in Netlify

1. Open the Maze of Whispers site in Netlify.
2. Go to **Project configuration → Environment variables**.
3. Add all six `VITE_FIREBASE_*` variables from `.env.local`.
4. Apply them to production builds.
5. Trigger a new deployment after the Firebase integration is merged.

Vite embeds variables beginning with `VITE_` into the browser bundle. Do not use this prefix for private server credentials.

Firebase web configuration identifies the Firebase project but does not authorize access to its data. Because these values must appear in the browser bundle, `netlify.toml` excludes the six public `VITE_FIREBASE_*` keys from Netlify's environment-variable secrets scan. All other secret scanning remains enabled. Keep Firestore Security Rules deployed, and verify that the Firebase browser API key is restricted to Firebase-related APIs.

## 8. Recommended Firestore structure

```text
gameCodes/{CODE}
  gameId
  dmUid

games/{gameId}
  code
  dmUid
  status
  round
  activePlayerId
  settings
  createdAt
  updatedAt

games/{gameId}/private/state
  sessionJson        # complete authoritative game state, DM-only
  updatedAt

games/{gameId}/players/{uid}
  uid
  name
  status
  playerId
  position
  pendingAction
  pendingRoll
  connected
  createdAt
  lastSeen
  updatedAt

games/{gameId}/views/{uid}
  sessionJson        # individualized, sanitized player state
  updatedAt
```

The short game code maps to an unguessable Firestore game ID. A player first reads the exact `gameCodes/{CODE}` document, then creates their own restricted player document under the matching game.

Keep secret state in `games/{gameId}/private/state`, which only the DM can read. It is serialized as `sessionJson` because Firestore does not accept the maze's nested arrays as native values. Each player's `views/{uid}` document contains a serialized, sanitized game snapshot with only the information that player is allowed to see. Do not rely on the Vue interface to hide data: if a browser can read a Firestore document, the player can inspect its complete contents with developer tools.

## 9. Start with restrictive Security Rules

The intended permission model is:

- Every client must be authenticated, including anonymous players.
- Only the DM can change authoritative game state.
- A player can create only their own restricted `joining` record after receiving a valid game ID.
- Players can submit only their own pending action, pending roll, connection state, and display name.
- Players can read a game only after joining it.
- Players can read only their own player and sanitized view documents; hidden maze and threat state remain DM-only.
- Game-code collection queries are forbidden; clients may only retrieve an exact code.

The implemented rules are stored in [`firestore.rules`](../firestore.rules). Treat that committed file as the authoritative ruleset; keeping a second copy in this guide would make it easy for the two versions to drift. The rules validate join records and player names, prevent game-code collection queries, keep the full state DM-only, and allow each player to read only their own player and view documents.

Review and test the rules with the Firebase Emulator before production use. Firebase recommends using Authentication and Firestore Security Rules together for web clients. See [secure Firestore data](https://firebase.google.com/docs/firestore/security/overview) and [test Security Rules](https://firebase.google.com/docs/rules/unit-tests).

## 10. Initialize and test with the Firebase CLI

From the repository root:

```bash
npx firebase-tools login
npx firebase-tools use --add
```

During project selection:

1. Select the Firebase project created above.
2. Choose an alias such as `default`.
3. Keep the committed `firebase.json`, `firestore.rules`, and `firestore.indexes.json` files; do not overwrite them with generated starter files.

Run the local Firestore emulator while developing:

Start the emulators in one terminal:

```bash
npx firebase-tools emulators:start --only firestore,auth
```

Then start the application in another terminal:

```bash
VITE_FIREBASE_USE_EMULATOR=true npm run dev
```

The development server connects to Auth on port `9099` and Firestore on port `8080` when the emulator variable is enabled.

Deploy rules only after emulator tests pass:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

## Implemented multiplayer flow

- Initialize Firebase from the six Vite environment variables.
- Sign every visitor in anonymously before reading or writing session data.
- Create the game, private state, and short-code mapping in one atomic batch.
- Subscribe the DM and players with Firestore realtime listeners.
- Store hidden maze, discovery, noise, and abomination state in DM-only documents.
- Store a sanitized, individualized view for each player.
- Store player requests separately from DM-authoritative state changes.
- Let the DM remain authoritative: player documents carry requests and the DM applies accepted changes to game state.
- Unsubscribe listeners when leaving a session.
- Player connections are saved in local browser storage and reconnect to their own sanitized view after a refresh.
- The core create, join, admission, begin-turn, and move flow has been exercised against the Auth and Firestore emulators with the committed rules.

Before a wider release, add automated emulator coverage for duplicate names, invalid codes, deleted games, simultaneous actions, reconnect edge cases, and all Security Rules.
