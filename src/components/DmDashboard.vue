<script setup>
import { computed, ref } from 'vue'
import {
  Activity,
  ChevronDown,
  CircleDot,
  Eye,
  EyeOff,
  Footprints,
  HeartPulse,
  Map,
  MoreHorizontal,
  Play,
  RotateCcw,
  Search,
  Skull,
  Sparkles,
  UserRound,
  Volume2,
} from 'lucide-vue-next'
import MazeGrid from './MazeGrid.vue'

const props = defineProps({ session: { type: Object, required: true } })
const emit = defineEmits([
  'start',
  'advance-turn',
  'select-player',
  'approve-roll',
  'reject-roll',
  'toggle-map',
  'set-status',
  'add-noise',
  'regenerate',
])

const selectedCell = ref(null)
const activePlayer = computed(() => props.session.players[props.session.activePlayerIndex] || props.session.players[0])
const pendingPlayers = computed(() => props.session.players.filter((player) => player.pendingRoll))
const aliveCount = computed(() => props.session.players.filter((player) => player.status === 'alive').length)
const escapedCount = computed(() => props.session.players.filter((player) => player.atExit && player.status === 'alive').length)

function playerAtSelected() {
  if (!selectedCell.value) return []
  return props.session.players.filter((player) => player.position.row === selectedCell.value.row && player.position.col === selectedCell.value.col)
}
</script>

<template>
  <div class="mx-auto w-full max-w-[1700px] px-4 pb-8 sm:px-6 lg:px-8">
    <section class="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <span class="eyebrow">Round</span><CircleDot class="h-4 w-4 text-acid/60" />
        </div>
        <p class="mt-2 font-display text-3xl text-bone">{{ session.round }}</p>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <span class="eyebrow">Party</span><UserRound class="h-4 w-4 text-acid/60" />
        </div>
        <p class="mt-2 font-display text-3xl text-bone">{{ aliveCount }}<span class="text-base text-fog"> / {{ session.players.length }} alive</span></p>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <span class="eyebrow">At the center</span><Sparkles class="h-4 w-4 text-acid/60" />
        </div>
        <p class="mt-2 font-display text-3xl text-bone">{{ escapedCount }}<span class="text-base text-fog"> / {{ session.players.length }}</span></p>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <span class="eyebrow">Active noise</span><Volume2 class="h-4 w-4 text-ember" />
        </div>
        <p class="mt-2 font-display text-3xl text-bone">{{ session.noises.length }}<span class="text-base text-fog"> echoes</span></p>
      </div>
    </section>

    <section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
      <div class="panel overflow-hidden">
        <div class="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <div class="flex items-center gap-2">
              <Map class="h-4 w-4 text-acid" />
              <p class="eyebrow">Dungeon Master map</p>
            </div>
            <h2 class="mt-1 font-display text-2xl text-bone">The Hollow Lattice</h2>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="button-secondary !min-h-9 !px-3 !py-1.5 text-xs" @click="emit('toggle-map')">
              <Eye v-if="session.allowPlayerMap" class="h-3.5 w-3.5" />
              <EyeOff v-else class="h-3.5 w-3.5" />
              Player map {{ session.allowPlayerMap ? 'on' : 'off' }}
            </button>
            <button type="button" class="button-secondary !min-h-9 !px-3 !py-1.5 text-xs" @click="emit('regenerate')">
              <RotateCcw class="h-3.5 w-3.5" /> Regenerate
            </button>
          </div>
        </div>

        <div class="grid gap-5 p-4 lg:grid-cols-[minmax(0,760px)_minmax(210px,1fr)] sm:p-5">
          <div class="mx-auto w-full max-w-[760px]">
            <MazeGrid
              :maze="session.maze"
              :players="session.players"
              :abomination="session.abomination"
              :noises="session.noises"
              :exit="session.exit"
              :active-player-id="activePlayer?.id"
              interactive
              @select="selectedCell = $event"
            />
            <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[9px] uppercase tracking-wider text-fog">
              <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-acid" /> active player</span>
              <span class="flex items-center gap-1.5"><Skull class="h-3 w-3 text-ember" /> abomination</span>
              <span class="flex items-center gap-1.5"><Volume2 class="h-3 w-3 text-acid" /> noise</span>
              <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full border border-acid" /> escape</span>
            </div>
          </div>

          <aside class="min-h-52 border border-white/10 bg-ink/45 p-4">
            <template v-if="selectedCell">
              <p class="eyebrow">Room {{ selectedCell.row + 1 }}—{{ selectedCell.col + 1 }}</p>
              <h3 class="mt-2 font-display text-xl text-bone">Room inspection</h3>
              <p class="mt-3 text-sm leading-6 text-fog">{{ selectedCell.description }}</p>
              <div class="mt-5 border-t border-white/10 pt-4">
                <p class="text-[10px] font-semibold uppercase tracking-widest text-fog">Occupants</p>
                <p v-if="!playerAtSelected().length" class="mt-2 text-sm text-fog/60">The room is empty.</p>
                <div v-for="player in playerAtSelected()" :key="player.id" class="mt-2 flex items-center gap-2 text-sm">
                  <span class="h-2 w-2 rounded-full" :class="player.status === 'alive' ? 'bg-acid' : 'bg-fog'" />
                  {{ player.name }} · {{ player.status }}
                </div>
              </div>
              <button type="button" class="button-danger mt-5 w-full" @click="emit('add-noise', { position: { row: selectedCell.row, col: selectedCell.col }, loudness: 8, type: 'dm' })">
                <Volume2 class="h-4 w-4" /> Create noise here
              </button>
            </template>
            <template v-else>
              <div class="flex h-full min-h-48 flex-col items-center justify-center text-center">
                <Search class="h-7 w-7 text-fog/40" />
                <p class="mt-3 text-sm text-fog">Select a room to inspect it or create a noise.</p>
              </div>
            </template>
          </aside>
        </div>
      </div>

      <aside class="space-y-5">
        <section class="panel p-4 sm:p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="eyebrow">Turn control</p>
              <h2 class="mt-1 font-display text-2xl text-bone">{{ session.started ? activePlayer?.name : 'Party waiting' }}</h2>
            </div>
            <Activity class="h-5 w-5 text-acid" />
          </div>

          <div v-if="session.started && activePlayer" class="mt-4 border border-acid/20 bg-acid/[0.06] p-3">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-full bg-acid font-black text-ink">{{ activePlayer.name.slice(0, 1) }}</span>
                <div>
                  <p class="text-sm font-semibold text-bone">Awaiting action</p>
                  <p class="text-xs text-fog">Room {{ activePlayer.position.row + 1 }}—{{ activePlayer.position.col + 1 }}</p>
                </div>
              </div>
              <Footprints class="h-4 w-4 text-acid" />
            </div>
          </div>

          <button v-if="!session.started" type="button" class="button-primary mt-5 w-full" @click="emit('start')">
            <Play class="h-4 w-4 fill-current" /> Begin expedition
          </button>
          <button v-else type="button" class="button-primary mt-4 w-full" @click="emit('advance-turn')">
            Advance turn <ChevronDown class="h-4 w-4 -rotate-90" />
          </button>
          <p v-if="session.started" class="mt-2 text-center text-[11px] text-fog/60">Use after the player has completed or forfeited an action.</p>
        </section>

        <section v-if="pendingPlayers.length" class="panel border-acid/25 p-4 sm:p-5">
          <p class="eyebrow">Rolls awaiting judgment</p>
          <article v-for="player in pendingPlayers" :key="player.id" class="mt-4 border-t border-white/10 pt-4 first:mt-3 first:border-0 first:pt-0">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-bone">{{ player.name }}</p>
                <p class="text-xs capitalize text-fog">{{ player.pendingRoll.type }} check</p>
              </div>
              <span class="font-display text-3xl text-acid">{{ player.pendingRoll.value }}</span>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <button type="button" class="button-primary !min-h-9 !py-1.5 text-xs" @click="emit('approve-roll', player.id)">Approve</button>
              <button type="button" class="button-secondary !min-h-9 !py-1.5 text-xs" @click="emit('reject-roll', player.id)">Reject</button>
            </div>
          </article>
        </section>

        <section v-if="session.encounter" class="panel border-ember/30 bg-ember/[0.06] p-4 sm:p-5">
          <Skull class="h-5 w-5 text-ember" />
          <p class="eyebrow mt-3 !text-ember">Encounter</p>
          <h2 class="mt-1 font-display text-2xl text-bone">The abomination found {{ session.players.find((player) => player.id === session.encounter.playerId)?.name }}</h2>
          <p class="mt-2 text-xs leading-5 text-fog">Resolve the tabletop encounter, then record the outcome.</p>
          <div class="mt-4 grid grid-cols-2 gap-2">
            <button type="button" class="button-primary !min-h-9 !py-1.5 text-xs" @click="emit('set-status', { playerId: session.encounter.playerId, status: 'alive' })">Survived</button>
            <button type="button" class="button-danger !min-h-9 !py-1.5 text-xs" @click="emit('set-status', { playerId: session.encounter.playerId, status: 'dead' })">Mark dead</button>
          </div>
        </section>

        <section class="panel p-4 sm:p-5">
          <div class="flex items-center justify-between">
            <p class="eyebrow">Party roster</p>
            <MoreHorizontal class="h-4 w-4 text-fog" />
          </div>
          <div class="mt-3 divide-y divide-white/10">
            <article
              v-for="(player, index) in session.players"
              :key="player.id"
              class="py-3 first:pt-1"
              :class="index === session.activePlayerIndex ? 'text-bone' : 'text-fog'"
            >
              <button type="button" class="flex w-full items-center gap-3 text-left" @click="emit('select-player', player.id)">
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black"
                  :class="player.status === 'dead' ? 'border-fog/30 bg-ink text-fog line-through' : index === session.activePlayerIndex ? 'border-acid bg-acid text-ink' : 'border-white/20 bg-white/5 text-bone'"
                >{{ player.name.slice(0, 1) }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold">{{ player.name }}</span>
                  <span class="block text-[11px]">{{ player.status }} · {{ player.inventory.length }} items</span>
                </span>
                <span class="h-2 w-2 rounded-full" :class="player.status === 'alive' ? 'bg-acid' : 'bg-fog'" />
              </button>
              <div class="mt-2 flex gap-2 pl-11">
                <button
                  v-if="player.status === 'alive'"
                  type="button"
                  class="text-[10px] font-semibold uppercase tracking-wider text-ember hover:text-[#f09a76]"
                  @click="emit('set-status', { playerId: player.id, status: 'dead' })"
                ><Skull class="mr-1 inline h-3 w-3" /> Mark dead</button>
                <button
                  v-else
                  type="button"
                  class="text-[10px] font-semibold uppercase tracking-wider text-acid hover:text-[#cadc70]"
                  @click="emit('set-status', { playerId: player.id, status: 'alive' })"
                ><HeartPulse class="mr-1 inline h-3 w-3" /> Restore</button>
              </div>
            </article>
          </div>
        </section>

        <section class="panel max-h-72 overflow-hidden p-4 sm:p-5">
          <p class="eyebrow">Chronicle</p>
          <div class="scrollbar-thin mt-3 max-h-52 space-y-3 overflow-y-auto pr-2">
            <div v-for="entry in session.log" :key="entry.id" class="border-l border-white/10 pl-3">
              <p class="text-xs leading-5 text-bone/80">{{ entry.message }}</p>
              <p class="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-fog/50">Round {{ entry.round }}</p>
            </div>
          </div>
        </section>
      </aside>
    </section>
  </div>
</template>
