<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ChevronDown, Clipboard, Dices, LogOut, MonitorCog, UserRound } from 'lucide-vue-next'
import DmDashboard from './components/DmDashboard.vue'
import PlayerView from './components/PlayerView.vue'
import SetupView from './components/SetupView.vue'
import { canMove, generateMaze, isPerimeter, movePosition, perimeterCells, shortestPath } from './game/maze'

const STORAGE_KEY = 'maze-of-whispers-session-v1'
const view = ref('setup')
const role = ref('dm')
const viewedPlayerId = ref(null)
const copied = ref(false)
const joinError = ref('')
const session = reactive({})

const defaultDiscoveries = [
  { id: 'writing', title: 'The Warning', text: 'Three lines are carved into the mortar: IT HEARS THE LIVING.', type: 'message', dc: 3 },
  { id: 'loose-brick', title: 'Loose Brick', text: 'A hollow behind the stone contains a stoppered vial.', type: 'item', dc: 10, effect: 'heal', effectLabel: 'Restore a fallen player in your room' },
  { id: 'torch', title: 'Gravewax Torch', text: 'Its green flame pushes the darkness one room farther back.', type: 'item', dc: 7, effect: 'vision', effectLabel: 'Increase sight range by one room' },
  { id: 'decoy', title: 'Bone Chimes', text: 'A knotted bundle of finger bones. Throw it and let the maze sing.', type: 'item', dc: 8, effect: 'decoy', effectLabel: 'Create a loud noise in your room' },
  { id: 'map-scrap', title: 'Surveyor’s Scrap', text: 'A waterlogged sketch marks the center with a ring of black ink.', type: 'message', dc: 5 },
  { id: 'footprints', title: 'Backward Footprints', text: 'Broad wet tracks end at the wall. They point the wrong way.', type: 'message', dc: 4 },
  { id: 'potion', title: 'Ashen Draught', text: 'A silver tonic that warms as living hands close around it.', type: 'item', dc: 9, effect: 'heal', effectLabel: 'Restore a fallen player in your room' },
  { id: 'bell', title: 'Cracked Handbell', text: 'The clapper has been removed, but the bronze still trembles.', type: 'message', dc: 6 },
]

const activePlayer = computed(() => session.players?.[session.activePlayerIndex] || session.players?.[0])
const viewedPlayer = computed(() => session.players?.find((player) => player.id === viewedPlayerId.value) || activePlayer.value)

function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function addLog(message) {
  session.log.unshift({ id: uid('log'), message, round: session.round })
  session.log = session.log.slice(0, 60)
}

function shuffle(values) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[randomIndex]] = [result[randomIndex], result[index]]
  }
  return result
}

function centerFor(size) {
  const coordinate = Math.floor((size - 1) / 2)
  return { row: coordinate, col: coordinate }
}

function placeDiscoveries(maze, discoveries) {
  const candidates = shuffle(maze.flat().filter((cell) => !(cell.row === 5 && cell.col === 5)))
  discoveries.forEach((discovery, index) => {
    const cell = candidates[index]
    discovery.position = { row: cell.row, col: cell.col }
    discovery.found = false
    cell.discoveryIds.push(discovery.id)
  })
}

function createSession({ dmName, partyNames }) {
  const size = 12
  const maze = generateMaze(size)
  const spawns = shuffle(perimeterCells(size))
  const discoveries = defaultDiscoveries.map((discovery) => ({ ...discovery }))
  placeDiscoveries(maze, discoveries)

  const players = partyNames.map((name, index) => {
    const position = spawns[index % spawns.length]
    return {
      id: uid('player'),
      name,
      position: { ...position },
      facing: null,
      status: 'alive',
      connected: true,
      pendingRoll: null,
      actionUsed: false,
      explored: [`${position.row}:${position.col}`],
      inventory: index === 0 ? [{ ...defaultDiscoveries.find((item) => item.id === 'torch'), id: uid('starter-torch') }] : [],
      found: [],
      vision: 1,
      movement: 1,
      atExit: false,
    }
  })

  Object.assign(session, {
    id: uid('session'),
    code: Math.random().toString(36).slice(2, 7).toUpperCase(),
    dmName,
    createdAt: new Date().toISOString(),
    size,
    maze,
    exit: centerFor(size),
    players,
    discoveries,
    abomination: { position: { row: 8, col: 8 } },
    noises: [],
    activePlayerIndex: 0,
    round: 1,
    started: false,
    allowPlayerMap: true,
    encounter: null,
    status: 'lobby',
    log: [{ id: uid('log'), message: 'The maze has taken shape. The party waits at its edges.', round: 1 }],
  })

  viewedPlayerId.value = players[0]?.id
  role.value = 'dm'
  view.value = 'game'
}

function joinSession({ code, name }) {
  joinError.value = ''
  const normalizedCode = code.trim().toUpperCase()
  const normalizedName = name.trim()
  if (!normalizedCode || !normalizedName) {
    joinError.value = 'Enter both the game code and your name.'
    return
  }
  if (!session.id || session.code !== normalizedCode) {
    joinError.value = 'That session is not saved in this browser.'
    return
  }

  let player = session.players.find((candidate) => candidate.name.toLowerCase() === normalizedName.toLowerCase())
  if (!player) {
    const used = new Set(session.players.map((candidate) => `${candidate.position.row}:${candidate.position.col}`))
    const spawn = shuffle(perimeterCells(session.size)).find((position) => !used.has(`${position.row}:${position.col}`)) || { row: 0, col: 0 }
    player = {
      id: uid('player'),
      name: normalizedName,
      position: { ...spawn },
      facing: null,
      status: 'alive',
      connected: true,
      pendingRoll: null,
      actionUsed: false,
      explored: [`${spawn.row}:${spawn.col}`],
      inventory: [],
      found: [],
      vision: 1,
      movement: 1,
      atExit: false,
    }
    session.players.push(player)
    addLog(`${player.name} joined the expedition.`)
  } else {
    player.connected = true
  }

  viewedPlayerId.value = player.id
  role.value = 'player'
  view.value = 'game'
}

function startGame() {
  session.started = true
  session.status = 'active'
  session.activePlayerIndex = findNextLivingIndex(-1)
  session.players.forEach((player) => { player.actionUsed = false })
  addLog(`${activePlayer.value.name} takes the first turn.`)
}

function findNextLivingIndex(fromIndex) {
  if (!session.players.length) return 0
  for (let offset = 1; offset <= session.players.length; offset += 1) {
    const index = (fromIndex + offset) % session.players.length
    if (session.players[index].status === 'alive') return index
  }
  return 0
}

function selectPlayer(playerId) {
  const index = session.players.findIndex((player) => player.id === playerId)
  if (index < 0 || session.players[index].status !== 'alive') return
  session.activePlayerIndex = index
  session.players[index].actionUsed = false
  viewedPlayerId.value = playerId
  addLog(`The DM passed the turn to ${session.players[index].name}.`)
}

function advanceTurn() {
  if (!session.started || session.encounter) return
  const previousIndex = session.activePlayerIndex
  const nextIndex = findNextLivingIndex(previousIndex)
  if (nextIndex <= previousIndex) session.round += 1
  session.activePlayerIndex = nextIndex
  session.players[nextIndex].actionUsed = false
  viewedPlayerId.value = session.players[nextIndex].id
  addLog(`${session.players[nextIndex].name}'s turn begins.`)
  checkVictory()
}

function addNoise({ position, loudness, type = 'ghost' }) {
  session.noises.push({ id: uid('noise'), position: { ...position }, loudness, type, age: 0 })
  addLog(`${type === 'ruckus' ? 'A deliberate ruckus' : type === 'ghost' ? 'The outer ghosts' : 'The DM'} raised a noise of ${loudness}.`)
}

function resolveAbomination() {
  if (!session.noises.length) return
  const target = [...session.noises].sort((a, b) => b.loudness - a.loudness || b.age - a.age)[0]
  const path = shortestPath(session.maze, session.abomination.position, target.position)
  if (path.length > 1) session.abomination.position = { ...path[1] }
  addLog('The abomination moves through the dark toward the loudest sound.')

  const victim = session.players.find(
    (player) => player.status === 'alive'
      && player.position.row === session.abomination.position.row
      && player.position.col === session.abomination.position.col,
  )
  if (victim) {
    session.encounter = { playerId: victim.id, startedAt: Date.now() }
    addLog(`The abomination has found ${victim.name}. The game waits for the DM.`)
  }

  session.noises = session.noises
    .map((noise) => ({ ...noise, loudness: noise.loudness - 1, age: noise.age + 1 }))
    .filter((noise) => noise.loudness > 0)
}

function finishAction(player, message) {
  player.actionUsed = true
  addLog(message)
  resolveAbomination()
  checkVictory()
}

function movePlayer({ playerId, direction }) {
  const player = session.players.find((candidate) => candidate.id === playerId)
  if (!player || player.id !== activePlayer.value?.id || player.actionUsed || !canMove(session.maze, player.position, direction)) return
  player.position = movePosition(player.position, direction)
  player.facing = direction
  player.explored = [...new Set([...player.explored, `${player.position.row}:${player.position.col}`])]
  player.atExit = player.position.row === session.exit.row && player.position.col === session.exit.col

  let noiseMessage = ''
  if (isPerimeter(player.position, session.size) && Math.random() < 0.35) {
    const loudness = 4 + Math.floor(Math.random() * 5)
    addNoise({ position: player.position, loudness, type: 'ghost' })
    noiseMessage = ' The ghosts outside the lattice begin to howl.'
  }
  finishAction(player, `${player.name} moved ${direction}.${noiseMessage}`)
}

function submitRoll({ playerId, type, value }) {
  const player = session.players.find((candidate) => candidate.id === playerId)
  if (!player || player.actionUsed || player.pendingRoll) return
  player.pendingRoll = { type, value, submittedAt: Date.now() }
  addLog(`${player.name} submitted a ${value} for a ${type} check.`)
}

function approveRoll(playerId) {
  const player = session.players.find((candidate) => candidate.id === playerId)
  if (!player?.pendingRoll) return
  const roll = { ...player.pendingRoll }
  player.pendingRoll = null

  if (roll.type === 'search') {
    const finds = session.discoveries.filter(
      (discovery) => !discovery.found
        && discovery.position.row === player.position.row
        && discovery.position.col === player.position.col
        && roll.value >= discovery.dc,
    )
    finds.forEach((discovery) => {
      discovery.found = true
      const foundCopy = { ...discovery, id: uid('found') }
      player.found.unshift(foundCopy)
      if (discovery.type === 'item') player.inventory.push({ ...foundCopy, id: uid('item') })
    })
    finishAction(player, finds.length
      ? `${player.name} searched and found ${finds.map((find) => find.title).join(', ')}.`
      : `${player.name} searched the room but found nothing.`)
    return
  }

  if (roll.type === 'ruckus') {
    const loudness = Math.max(4, Math.min(12, Math.ceil(roll.value / 2) + 2))
    addNoise({ position: player.position, loudness, type: 'ruckus' })
    finishAction(player, `${player.name} made a deliberate ruckus.`)
  }
}

function rejectRoll(playerId) {
  const player = session.players.find((candidate) => candidate.id === playerId)
  if (!player?.pendingRoll) return
  addLog(`The DM rejected ${player.name}'s submitted roll.`)
  player.pendingRoll = null
}

function setStatus({ playerId, status }) {
  const player = session.players.find((candidate) => candidate.id === playerId)
  if (!player) return
  player.status = status
  if (session.encounter?.playerId === playerId) session.encounter = null
  addLog(`${player.name} was marked ${status} by the DM.`)
  if (status === 'dead' && activePlayer.value?.id === playerId) session.activePlayerIndex = findNextLivingIndex(session.activePlayerIndex)
  checkVictory()
}

function useItem({ playerId, itemId }) {
  const player = session.players.find((candidate) => candidate.id === playerId)
  const index = player?.inventory.findIndex((item) => item.id === itemId) ?? -1
  if (!player || index < 0 || player.actionUsed) return
  const [item] = player.inventory.splice(index, 1)

  if (item.effect === 'vision') {
    player.vision += 1
    finishAction(player, `${player.name} lit the ${item.title}; their light reaches farther.`)
  } else if (item.effect === 'decoy') {
    addNoise({ position: player.position, loudness: 11, type: 'ruckus' })
    finishAction(player, `${player.name} used ${item.title} to draw the abomination.`)
  } else if (item.effect === 'heal') {
    const fallen = session.players.find((other) => other.status === 'dead' && other.position.row === player.position.row && other.position.col === player.position.col)
    if (fallen) {
      fallen.status = 'alive'
      finishAction(player, `${player.name} restored ${fallen.name} with ${item.title}.`)
    } else {
      player.inventory.splice(index, 0, item)
      addLog(`${player.name} cannot use ${item.title}; no fallen companion is here.`)
    }
  }
}

function checkVictory() {
  const won = session.players.length > 0 && session.players.every((player) => player.status === 'alive' && player.atExit)
  if (won && session.status !== 'complete') {
    session.status = 'complete'
    addLog('Every living soul has reached the center. The party escapes the maze.')
  }
}

function toggleMap() {
  session.allowPlayerMap = !session.allowPlayerMap
  addLog(`The player memory map was turned ${session.allowPlayerMap ? 'on' : 'off'}.`)
}

function regenerateMaze() {
  if (session.started && session.round > 1) return
  const maze = generateMaze(session.size)
  session.maze = maze
  placeDiscoveries(maze, session.discoveries)
  const spawns = shuffle(perimeterCells(session.size))
  session.players.forEach((player, index) => {
    player.position = { ...spawns[index] }
    player.explored = [`${player.position.row}:${player.position.col}`]
    player.facing = null
    player.atExit = false
  })
  session.abomination.position = { row: 8, col: 8 }
  session.noises = []
  addLog('The DM reshaped the maze before the expedition began.')
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(session.code)
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 1400)
  } catch {
    copied.value = false
  }
}

function leaveSession() {
  view.value = 'setup'
  role.value = 'dm'
}

watch(session, (value) => {
  if (value.id) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}, { deep: true })

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return
  try {
    Object.assign(session, JSON.parse(saved))
    viewedPlayerId.value = session.players?.[0]?.id
    view.value = 'game'
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
})
</script>

<template>
  <div class="grain min-h-screen">
    <SetupView v-if="view === 'setup'" :join-error="joinError" @create="createSession" @join="joinSession" />

    <template v-else>
      <header class="sticky top-0 z-40 mb-5 border-b border-white/10 bg-ink/90 backdrop-blur-xl">
        <div class="mx-auto flex h-16 w-full max-w-[1700px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button type="button" class="flex min-w-0 items-center gap-3" @click="leaveSession">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center border border-acid/30 bg-acid/10 text-acid"><Dices class="h-4 w-4" /></span>
            <span class="hidden truncate font-display text-lg text-bone sm:block">Maze of Whispers</span>
          </button>

          <div class="ml-auto flex items-center gap-2">
            <button type="button" class="hidden items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-fog transition hover:border-white/20 sm:flex" @click="copyCode">
              <span>{{ copied ? 'Copied' : 'Game' }}</span>
              <strong class="tracking-[0.22em] text-bone">{{ session.code }}</strong>
              <Clipboard class="h-3 w-3" />
            </button>

            <div class="flex rounded-sm border border-white/10 bg-coal p-1">
              <button type="button" class="flex min-h-8 items-center gap-1.5 px-2.5 text-xs font-semibold transition" :class="role === 'dm' ? 'bg-acid text-ink' : 'text-fog hover:text-bone'" @click="role = 'dm'">
                <MonitorCog class="h-3.5 w-3.5" /> <span class="hidden sm:inline">DM</span>
              </button>
              <button type="button" class="flex min-h-8 items-center gap-1.5 px-2.5 text-xs font-semibold transition" :class="role === 'player' ? 'bg-acid text-ink' : 'text-fog hover:text-bone'" @click="role = 'player'">
                <UserRound class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Player</span>
              </button>
            </div>

            <label v-if="role === 'player'" class="relative hidden sm:block">
              <select v-model="viewedPlayerId" class="field min-h-10 appearance-none !py-2 !pl-3 !pr-8 text-xs">
                <option v-for="player in session.players" :key="player.id" :value="player.id">{{ player.name }}</option>
              </select>
              <ChevronDown class="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fog" />
            </label>

            <button type="button" class="flex h-9 w-9 items-center justify-center text-fog transition hover:text-bone" title="Leave session" @click="leaveSession"><LogOut class="h-4 w-4" /></button>
          </div>
        </div>

        <div v-if="role === 'player'" class="border-t border-white/5 px-4 py-2 sm:hidden">
          <select v-model="viewedPlayerId" class="field !py-2 text-xs">
            <option v-for="player in session.players" :key="player.id" :value="player.id">Viewing as {{ player.name }}</option>
          </select>
        </div>
      </header>

      <div v-if="session.status === 'complete'" class="mx-auto mb-5 w-[calc(100%-2rem)] max-w-[1640px] border border-acid/30 bg-acid/10 p-4 text-center shadow-acid">
        <p class="eyebrow">The center opens</p>
        <p class="mt-1 font-display text-2xl text-bone">Everyone made it out alive.</p>
      </div>

      <DmDashboard
        v-if="role === 'dm'"
        :session="session"
        @start="startGame"
        @advance-turn="advanceTurn"
        @select-player="selectPlayer"
        @approve-roll="approveRoll"
        @reject-roll="rejectRoll"
        @toggle-map="toggleMap"
        @set-status="setStatus"
        @add-noise="addNoise"
        @regenerate="regenerateMaze"
      />
      <PlayerView
        v-else-if="viewedPlayer"
        :session="session"
        :player="viewedPlayer"
        @move="movePlayer"
        @submit-roll="submitRoll"
        @use-item="useItem"
      />
    </template>
  </div>
</template>
