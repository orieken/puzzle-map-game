import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { DIRECTIONS, canMove, movePosition, shortestPath } from '../game/maze'
import { db, ensureAnonymousUser } from './firebase'

function clean(value) {
  return JSON.parse(JSON.stringify(value))
}

function publicGameState(session, dmUid) {
  const active = session.players[session.activePlayerIndex]
  return {
    code: session.code,
    dmUid,
    dmName: session.dmName,
    status: session.status,
    round: session.round,
    started: session.started,
    activePlayerId: active?.id || null,
    activePlayerName: active?.name || null,
    allowPlayerMap: session.allowPlayerMap,
    playerCount: session.players.length,
    updatedAt: serverTimestamp(),
  }
}

function threatFor(session, player) {
  const path = shortestPath(session.maze, player.position, session.abomination.position)
  const distance = Math.max(0, path.length - 1)
  let direction = null
  if (path[1]) {
    const dr = path[1].row - player.position.row
    const dc = path[1].col - player.position.col
    direction = Object.entries(DIRECTIONS).find(([, value]) => value.dr === dr && value.dc === dc)?.[0] || null
  }

  if (!path.length || distance > 8) return { distance, label: 'Silence', level: 'safe', direction: null }
  if (distance <= 2) return { distance, label: 'It is almost here', level: 'danger', direction }
  if (distance <= 4) return { distance, label: 'Heavy steps nearby', level: 'near', direction }
  return { distance, label: 'A distant scraping', level: 'far', direction }
}

function visibleCellKeys(session, player) {
  const visible = new Set(player.explored || [])
  visible.add(`${player.position.row}:${player.position.col}`)
  let position = { ...player.position }
  for (let step = 0; step < (player.vision || 1); step += 1) {
    if (!player.facing || !canMove(session.maze, position, player.facing)) break
    position = movePosition(position, player.facing)
    visible.add(`${position.row}:${position.col}`)
  }
  return visible
}

function maskedMaze(session, player) {
  const visible = visibleCellKeys(session, player)
  return session.maze.map((row) => row.map((cell) => {
    if (!visible.has(`${cell.row}:${cell.col}`)) {
      return {
        row: cell.row,
        col: cell.col,
        walls: { north: true, east: true, south: true, west: true },
        description: 'The darkness hides this room.',
        discoveryIds: [],
      }
    }
    return { ...clean(cell), discoveryIds: [] }
  }))
}

export function buildPlayerSession(session, player) {
  const active = session.players[session.activePlayerIndex]
  const players = [clean({ ...player, remoteUid: undefined })]
  let activePlayerIndex = 0

  if (active && active.id !== player.id) {
    activePlayerIndex = players.length
    players.push({
      id: active.id,
      name: active.name,
      position: { row: -100, col: -100 },
      facing: null,
      status: active.status,
      pendingRoll: null,
      actionUsed: active.actionUsed,
      explored: [],
      inventory: [],
      found: [],
      vision: 1,
      movement: 1,
      atExit: active.atExit,
    })
  }

  session.players
    .filter((other) => other.id !== player.id
      && other.id !== active?.id
      && other.position.row === player.position.row
      && other.position.col === player.position.col)
    .forEach((other) => players.push(clean({ ...other, inventory: [], found: [], explored: [], remoteUid: undefined })))

  const knowsExit = (player.explored || []).includes(`${session.exit.row}:${session.exit.col}`)
  return clean({
    id: session.id,
    gameId: session.gameId,
    code: session.code,
    dmName: session.dmName,
    size: session.size,
    maze: maskedMaze(session, player),
    exit: knowsExit ? session.exit : { row: -100, col: -100 },
    players,
    discoveries: [],
    abomination: { position: { row: -100, col: -100 } },
    noises: [],
    activePlayerIndex,
    round: session.round,
    started: session.started,
    allowPlayerMap: session.allowPlayerMap,
    encounter: session.encounter?.playerId === player.id ? session.encounter : null,
    status: session.status,
    log: [],
    playerThreat: threatFor(session, player),
  })
}

export async function createRemoteGame(session) {
  const user = await ensureAnonymousUser()
  const gameRef = doc(collection(db, 'games'))
  const codeRef = doc(db, 'gameCodes', session.code)
  const stateRef = doc(db, 'games', gameRef.id, 'private', 'state')
  const storedSession = clean({ ...session, gameId: gameRef.id, dmUid: user.uid })
  const batch = writeBatch(db)

  batch.set(gameRef, {
    ...publicGameState(storedSession, user.uid),
    createdAt: serverTimestamp(),
  })
  batch.set(codeRef, {
    gameId: gameRef.id,
    dmUid: user.uid,
    createdAt: serverTimestamp(),
  })
  batch.set(stateRef, { sessionJson: JSON.stringify(storedSession), updatedAt: serverTimestamp() })
  await batch.commit()
  return { gameId: gameRef.id, dmUid: user.uid }
}

export async function loadRemoteDmGame(gameId) {
  await ensureAnonymousUser()
  const snapshot = await getDoc(doc(db, 'games', gameId, 'private', 'state'))
  return snapshot.exists() ? JSON.parse(snapshot.data().sessionJson) : null
}

export async function saveRemoteGame(session) {
  const user = await ensureAnonymousUser()
  const gameId = session.gameId
  if (!gameId) return
  const batch = writeBatch(db)
  const storedSession = clean(session)

  batch.set(doc(db, 'games', gameId), publicGameState(storedSession, user.uid), { merge: true })
  batch.set(doc(db, 'games', gameId, 'private', 'state'), {
    sessionJson: JSON.stringify(storedSession),
    updatedAt: serverTimestamp(),
  })

  storedSession.players.filter((player) => player.remoteUid).forEach((player) => {
    batch.set(doc(db, 'games', gameId, 'players', player.remoteUid), {
      playerId: player.id,
      status: player.status,
      position: player.position,
      connected: player.connected !== false,
      updatedAt: serverTimestamp(),
    }, { merge: true })
    batch.set(doc(db, 'games', gameId, 'views', player.remoteUid), {
      sessionJson: JSON.stringify(buildPlayerSession(storedSession, player)),
      updatedAt: serverTimestamp(),
    })
  })

  await batch.commit()
}

export async function joinRemoteGame(code, name) {
  const user = await ensureAnonymousUser()
  const normalizedCode = code.trim().toUpperCase()
  const codeSnapshot = await getDoc(doc(db, 'gameCodes', normalizedCode))
  if (!codeSnapshot.exists()) throw new Error('No game was found for that code.')
  const { gameId } = codeSnapshot.data()
  const playerRef = doc(db, 'games', gameId, 'players', user.uid)
  const existingPlayer = await getDoc(playerRef)

  if (existingPlayer.exists()) {
    await updateDoc(playerRef, {
      name: name.trim(),
      connected: true,
      lastSeen: serverTimestamp(),
    })
  } else {
    await setDoc(playerRef, {
      uid: user.uid,
      name: name.trim(),
      status: 'joining',
      position: null,
      pendingAction: null,
      pendingRoll: null,
      connected: true,
      createdAt: serverTimestamp(),
    })
  }

  return { gameId, uid: user.uid, code: normalizedCode }
}

export function subscribeToPlayerRequests(gameId, onPlayers, onError) {
  return onSnapshot(collection(db, 'games', gameId, 'players'), (snapshot) => {
    onPlayers(snapshot.docs.map((playerDoc) => ({ uid: playerDoc.id, ...playerDoc.data() })))
  }, onError)
}

export function subscribeToPlayerView(gameId, uid, onSession, onError) {
  return onSnapshot(doc(db, 'games', gameId, 'views', uid), (snapshot) => {
    if (snapshot.exists()) onSession(JSON.parse(snapshot.data().sessionJson))
  }, onError)
}

export async function requestRemoteAction(gameId, action) {
  const user = await ensureAnonymousUser()
  await updateDoc(doc(db, 'games', gameId, 'players', user.uid), {
    pendingAction: clean(action),
    lastSeen: serverTimestamp(),
    connected: true,
  })
}

export async function submitRemoteRoll(gameId, roll) {
  const user = await ensureAnonymousUser()
  await updateDoc(doc(db, 'games', gameId, 'players', user.uid), {
    pendingRoll: clean(roll),
    lastSeen: serverTimestamp(),
    connected: true,
  })
}

export async function clearRemoteRequests(gameId, uid, fields = ['pendingAction', 'pendingRoll']) {
  const updates = Object.fromEntries(fields.map((field) => [field, null]))
  await updateDoc(doc(db, 'games', gameId, 'players', uid), updates)
}

export async function setRemoteConnection(gameId, connected) {
  const user = await ensureAnonymousUser()
  await updateDoc(doc(db, 'games', gameId, 'players', user.uid), {
    connected,
    lastSeen: serverTimestamp(),
  })
}
