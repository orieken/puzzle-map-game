# Firebase and Firestore Setup

This guide prepares Firebase as the realtime backend for Maze of Whispers. The Vue application does not use Firebase yet; completing these steps creates the services and configuration needed for the multiplayer integration.

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

The multiplayer implementation will initialize `firebase/app`, `firebase/auth`, and `firebase/firestore` from a small service module.

## 6. Configure local environment variables

Create `.env.local` in the repository root. This file is already excluded by the project's `*.local` Git ignore rule.

```dotenv
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Copy each value from **Project settings → General → Your apps → SDK setup and configuration**. Restart the Vite development server after changing environment variables.

## 7. Configure the same variables in Netlify

1. Open the Maze of Whispers site in Netlify.
2. Go to **Project configuration → Environment variables**.
3. Add all six `VITE_FIREBASE_*` variables from `.env.local`.
4. Apply them to production builds.
5. Trigger a new deployment after the Firebase integration is merged.

Vite embeds variables beginning with `VITE_` into the browser bundle. Do not use this prefix for private server credentials.

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
  maze
  exit
  abomination
  noises
  discoveries

games/{gameId}/players/{uid}
  uid
  name
  position
  facing
  status
  inventory
  explored
  pendingAction
  pendingRoll
  connected
  lastSeen

games/{gameId}/views/{uid}
  currentRoom
  visibleExits
  sightline
  visiblePlayers
  threatWarning
  revealedDiscoveries

games/{gameId}/publicEvents/{eventId}
```

The short game code maps to an unguessable Firestore game ID. A player first reads the exact `gameCodes/{CODE}` document, then creates their own restricted player document under the matching game.

Keep secret state in `games/{gameId}/private/state`, which only the DM can read. Each player's `views/{uid}` document contains only the information that player is allowed to see. Do not rely on the Vue interface to hide data: if a browser can read a Firestore document, the player can inspect its complete contents with developer tools.

## 9. Start with restrictive Security Rules

The intended permission model is:

- Every client must be authenticated, including anonymous players.
- Only the DM can change authoritative game state.
- A player can create only their own restricted `joining` record after receiving a valid game ID.
- Players can submit only their own pending action, pending roll, connection state, and display name.
- Players can read a game only after joining it.
- Players can read only their own player and sanitized view documents; hidden maze and threat state remain DM-only.
- Game-code collection queries are forbidden; clients may only retrieve an exact code.

The following is a starting ruleset for the planned schema. Review and test it with the Firebase Emulator before production use.

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isDm(gameId) {
      return signedIn()
        && get(/databases/$(database)/documents/games/$(gameId)).data.dmUid == request.auth.uid;
    }

    function isMember(gameId) {
      return signedIn()
        && exists(/databases/$(database)/documents/games/$(gameId)/players/$(request.auth.uid));
    }

    match /gameCodes/{code} {
      allow get: if signedIn();
      allow list: if false;
      allow create: if signedIn()
        && request.resource.data.dmUid == request.auth.uid;
      allow update, delete: if signedIn()
        && resource.data.dmUid == request.auth.uid;
    }

    match /games/{gameId} {
      allow create: if signedIn()
        && request.resource.data.dmUid == request.auth.uid;
      allow read: if isDm(gameId) || isMember(gameId);
      allow update, delete: if isDm(gameId);

      match /players/{playerId} {
        allow read: if isDm(gameId)
          || (signedIn() && playerId == request.auth.uid);
        allow create: if signedIn()
          && playerId == request.auth.uid
          && request.resource.data.uid == request.auth.uid
          && request.resource.data.keys().hasOnly([
            'uid', 'name', 'status', 'position', 'pendingAction',
            'pendingRoll', 'connected', 'createdAt'
          ])
          && request.resource.data.status == 'joining'
          && request.resource.data.position == null
          && request.resource.data.pendingAction == null
          && request.resource.data.pendingRoll == null
          && request.resource.data.connected == true;
        allow update: if isDm(gameId)
          || (signedIn()
            && playerId == request.auth.uid
            && request.resource.data.diff(resource.data).affectedKeys()
              .hasOnly(['name', 'pendingAction', 'pendingRoll', 'connected', 'lastSeen']));
        allow delete: if isDm(gameId)
          || (signedIn() && playerId == request.auth.uid);
      }

      match /private/{documentId} {
        allow read, write: if isDm(gameId);
      }

      match /views/{playerId} {
        allow read: if isDm(gameId)
          || (signedIn() && playerId == request.auth.uid);
        allow write: if isDm(gameId);
      }

      match /publicEvents/{eventId} {
        allow read: if isDm(gameId) || isMember(gameId);
        allow write: if isDm(gameId);
      }
    }
  }
}
```

Keep rules in source control once the Firebase CLI is initialized. Firebase recommends using Authentication and Firestore Security Rules together for web clients. See [secure Firestore data](https://firebase.google.com/docs/firestore/security/overview) and [test Security Rules](https://firebase.google.com/docs/rules/unit-tests).

## 10. Initialize and test with the Firebase CLI

From the repository root:

```bash
npx firebase-tools login
npx firebase-tools init firestore
```

During initialization:

1. Select the Firebase project created above.
2. Accept `firestore.rules` as the rules filename.
3. Accept `firestore.indexes.json` as the indexes filename.
4. Copy the reviewed ruleset into `firestore.rules`.

Run the local Firestore emulator while developing:

```bash
npx firebase-tools emulators:start --only firestore,auth
```

Deploy rules only after emulator tests pass:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

## Multiplayer integration checklist

- Initialize Firebase from the six Vite environment variables.
- Sign every visitor in anonymously before reading or writing session data.
- Create the game and its short-code mapping in one transaction or batch.
- Subscribe the DM and players with Firestore realtime listeners.
- Store hidden maze, discovery, noise, and abomination state in DM-only documents.
- Store a sanitized, individualized view for each player.
- Store player requests separately from DM-authoritative state changes.
- Use transactions for joining, turn advancement, and conflict-prone updates.
- Unsubscribe listeners when leaving a session.
- Test reconnecting, duplicate names, invalid codes, deleted games, and simultaneous actions.
- Test all Security Rules in the emulator before deploying them.

Firestore transactions retry when another client changes a document that was read during the transaction, making them appropriate for turn and join coordination. See [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions).
