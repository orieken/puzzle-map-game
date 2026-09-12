<script setup>
import { computed, ref } from 'vue'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Backpack,
  Compass,
  Eye,
  Footprints,
  HeartPulse,
  Map,
  Search,
  Skull,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-vue-next'
import MazeGrid from './MazeGrid.vue'
import { DIRECTIONS, canMove, movePosition, openDirections, shortestPath } from '../game/maze'

const props = defineProps({
  session: { type: Object, required: true },
  player: { type: Object, required: true },
})

const emit = defineEmits(['move', 'submit-roll', 'use-item'])
const actionMode = ref(null)
const rollValue = ref('')

const currentRoom = computed(() => props.session.maze[props.player.position.row][props.player.position.col])
const activePlayer = computed(() => props.session.players[props.session.activePlayerIndex])
const isActive = computed(() => props.session.started && activePlayer.value?.id === props.player.id)
const canAct = computed(() => isActive.value && props.player.status === 'alive' && !props.player.pendingRoll && !props.player.actionUsed && !props.session.encounter)
const exits = computed(() => openDirections(props.session.maze, props.player.position))
const visibleAhead = computed(() => {
  if (!props.player.facing || !canMove(props.session.maze, props.player.position, props.player.facing)) return null
  const position = movePosition(props.player.position, props.player.facing)
  return { ...props.session.maze[position.row][position.col], position }
})

const threat = computed(() => {
  if (props.session.playerThreat) return props.session.playerThreat
  const path = shortestPath(props.session.maze, props.player.position, props.session.abomination.position)
  const distance = Math.max(0, path.length - 1)
  if (!path.length || distance > 8) return { distance, label: 'Silence', level: 'safe', direction: null }

  let direction = null
  if (path[1]) {
    const dr = path[1].row - props.player.position.row
    const dc = path[1].col - props.player.position.col
    direction = Object.entries(DIRECTIONS).find(([, value]) => value.dr === dr && value.dc === dc)?.[0]
  }
  if (distance <= 2) return { distance, label: 'It is almost here', level: 'danger', direction }
  if (distance <= 4) return { distance, label: 'Heavy steps nearby', level: 'near', direction }
  return { distance, label: 'A distant scraping', level: 'far', direction }
})

const roomPlayers = computed(() => props.session.players.filter(
  (other) => other.id !== props.player.id && other.position.row === props.player.position.row && other.position.col === props.player.position.col,
))

function arrowFor(direction) {
  return { north: ArrowUp, east: ArrowRight, south: ArrowDown, west: ArrowLeft }[direction]
}

function beginRoll(type) {
  if (!canAct.value) return
  actionMode.value = type
  rollValue.value = ''
}

function submitRoll() {
  const value = Number(rollValue.value)
  if (!Number.isInteger(value) || value < 1 || value > 30) return
  emit('submit-roll', { playerId: props.player.id, type: actionMode.value, value })
  actionMode.value = null
  rollValue.value = ''
}
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
    <div v-if="player.status === 'dead'" class="mb-5 border border-ember/30 bg-ember/10 p-5 text-center">
      <Skull class="mx-auto h-7 w-7 text-ember" />
      <h2 class="mt-2 font-display text-2xl text-bone">You have fallen in the maze</h2>
      <p class="mt-1 text-sm text-fog">Your body remains in this room. Another player may still find and restore you.</p>
    </div>

    <div v-if="session.encounter && session.encounter.playerId === player.id" class="mb-5 border border-ember/40 bg-ember/10 p-5 text-center shadow-ember">
      <Volume2 class="mx-auto h-7 w-7 animate-pulse text-ember" />
      <h2 class="mt-2 font-display text-3xl text-[#f0d8ce]">It found you.</h2>
      <p class="mt-1 text-sm text-fog">Step away from the screen. The Dungeon Master will resolve this encounter.</p>
    </div>

    <section class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div class="space-y-5">
        <article class="panel overflow-hidden">
          <div class="relative border-b border-white/10 bg-gradient-to-br from-ash to-coal p-6 sm:p-8">
            <div class="absolute right-0 top-0 h-40 w-40 rounded-full bg-acid/[0.035] blur-3xl" />
            <div class="relative flex items-start justify-between gap-5">
              <div>
                <p class="eyebrow">Room {{ player.position.row + 1 }}—{{ player.position.col + 1 }}</p>
                <h1 class="mt-2 font-display text-4xl text-bone sm:text-5xl">The dark closes in.</h1>
              </div>
              <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-acid/30 bg-acid/10 text-acid">
                <Eye class="h-5 w-5" />
              </span>
            </div>
            <p class="relative mt-5 max-w-2xl text-base leading-7 text-fog">{{ currentRoom.description }}</p>

            <div v-if="roomPlayers.length" class="relative mt-5 flex flex-wrap gap-2">
              <span v-for="other in roomPlayers" :key="other.id" class="rounded-full border border-white/10 bg-ink/60 px-3 py-1 text-xs text-bone">
                {{ other.status === 'dead' ? '†' : '●' }} {{ other.name }} is here
              </span>
            </div>
          </div>

          <div class="grid gap-px bg-white/10 sm:grid-cols-2">
            <div class="bg-coal p-5 sm:p-6">
              <div class="flex items-center gap-2">
                <Compass class="h-4 w-4 text-acid" />
                <p class="eyebrow">Open passages</p>
              </div>
              <div class="mt-4 grid grid-cols-3 grid-rows-3 gap-2">
                <button
                  v-for="direction in ['north', 'west', 'east', 'south']"
                  :key="direction"
                  type="button"
                  class="button-secondary !min-h-12 !px-2 capitalize"
                  :class="{
                    'col-start-2 row-start-1': direction === 'north',
                    'col-start-1 row-start-2': direction === 'west',
                    'col-start-3 row-start-2': direction === 'east',
                    'col-start-2 row-start-3': direction === 'south',
                  }"
                  :disabled="!canAct || !exits.includes(direction)"
                  @click="emit('move', { playerId: player.id, direction })"
                >
                  <component :is="arrowFor(direction)" class="h-4 w-4" />
                  <span class="sr-only sm:not-sr-only">{{ direction.slice(0, 1) }}</span>
                </button>
                <div class="col-start-2 row-start-2 flex items-center justify-center">
                  <span class="h-3 w-3 rounded-full bg-acid shadow-acid" />
                </div>
              </div>
            </div>

            <div class="bg-coal p-5 sm:p-6">
              <div class="flex items-center gap-2">
                <Eye class="h-4 w-4 text-acid" />
                <p class="eyebrow">Sightline · {{ player.facing || 'unknown' }}</p>
              </div>
              <div v-if="visibleAhead" class="mt-4 border border-white/10 bg-ink/50 p-4">
                <p class="font-display text-lg text-bone">One room ahead</p>
                <p class="mt-2 line-clamp-3 text-xs leading-5 text-fog">{{ visibleAhead.description }}</p>
              </div>
              <div v-else class="mt-4 border border-dashed border-white/10 p-4 text-xs leading-5 text-fog/60">
                Face an open passage to peer one room into the dark.
              </div>
            </div>
          </div>
        </article>

        <section class="panel p-5 sm:p-6">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p class="eyebrow">Choose carefully</p>
              <h2 class="mt-1 font-display text-2xl text-bone">Your action</h2>
            </div>
            <p v-if="!session.started" class="text-xs text-fog">Waiting for the DM to begin</p>
            <p v-else-if="!isActive" class="text-xs text-fog">Waiting for {{ activePlayer?.name }}</p>
            <p v-else-if="player.pendingRoll" class="text-xs text-acid">Roll submitted · awaiting DM</p>
            <p v-else-if="player.actionUsed" class="text-xs text-fog">Action complete · awaiting DM</p>
            <p v-else class="text-xs text-acid">It is your turn</p>
          </div>

          <div v-if="actionMode" class="mt-5 border border-acid/20 bg-acid/[0.05] p-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-sm font-semibold capitalize text-bone">{{ actionMode }} check</p>
                <p class="mt-1 text-xs text-fog">Roll at the table, then enter your result.</p>
              </div>
              <button type="button" class="text-xs text-fog hover:text-bone" @click="actionMode = null">Cancel</button>
            </div>
            <form class="mt-4 flex gap-2" @submit.prevent="submitRoll">
              <input v-model="rollValue" inputmode="numeric" min="1" max="30" class="field text-center font-display text-xl" placeholder="Roll" aria-label="Physical die result" />
              <button type="submit" class="button-primary shrink-0">Submit</button>
            </form>
          </div>

          <div v-else class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button type="button" class="button-secondary flex-col !py-4" :disabled="!canAct" @click="beginRoll('search')">
              <Search class="h-5 w-5 text-acid" /><span>Search room</span>
            </button>
            <button type="button" class="button-secondary flex-col !py-4" :disabled="!canAct" @click="beginRoll('ruckus')">
              <Volume2 class="h-5 w-5 text-ember" /><span>Make a ruckus</span>
            </button>
            <button type="button" class="button-secondary col-span-2 flex-col !py-4 sm:col-span-1" disabled>
              <Footprints class="h-5 w-5 text-fog" /><span>Move with compass</span>
            </button>
          </div>
        </section>

        <section v-if="player.found.length" class="panel p-5 sm:p-6">
          <p class="eyebrow">What you have learned</p>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <article v-for="find in player.found" :key="find.id" class="border border-white/10 bg-ink/50 p-4">
              <p class="text-xs font-semibold uppercase tracking-widest" :class="find.type === 'item' ? 'text-acid' : 'text-ember'">{{ find.type }}</p>
              <h3 class="mt-2 font-display text-xl text-bone">{{ find.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-fog">{{ find.text }}</p>
            </article>
          </div>
        </section>
      </div>

      <aside class="space-y-5">
        <section class="panel overflow-hidden">
          <div class="p-5">
            <div class="flex items-start justify-between">
              <div>
                <p class="eyebrow">Something follows</p>
                <h2 class="mt-1 font-display text-2xl" :class="threat.level === 'danger' ? 'text-ember' : 'text-bone'">{{ threat.label }}</h2>
              </div>
              <VolumeX v-if="threat.level === 'safe'" class="h-5 w-5 text-fog" />
              <Volume1 v-else-if="threat.level === 'far'" class="h-5 w-5 text-acid" />
              <Volume2 v-else class="h-5 w-5 text-ember" :class="threat.level === 'danger' ? 'animate-pulse' : ''" />
            </div>
            <div class="mt-5 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                class="h-full rounded-full transition-all duration-700"
                :class="threat.level === 'danger' ? 'bg-ember' : threat.level === 'near' ? 'bg-[#d39b45]' : 'bg-acid'"
                :style="{ width: `${Math.max(5, 100 - Math.min(threat.distance, 9) * 11)}%` }"
              />
            </div>
            <div class="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-fog">
              <span>{{ threat.distance > 8 ? 'Beyond hearing' : `${threat.distance} rooms away` }}</span>
              <span v-if="threat.direction">{{ threat.direction }}</span>
            </div>
          </div>
        </section>

        <section v-if="session.allowPlayerMap" class="panel p-4">
          <div class="mb-3 flex items-center justify-between">
            <p class="eyebrow">Your memory</p>
            <Map class="h-4 w-4 text-acid" />
          </div>
          <MazeGrid
            :maze="session.maze"
            :players="[player]"
            :exit="session.exit"
            :explored="player.explored"
            :active-player-id="player.id"
          />
        </section>

        <section class="panel p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="eyebrow">Inventory</p>
              <h2 class="mt-1 font-display text-2xl text-bone">What you carry</h2>
            </div>
            <Backpack class="h-5 w-5 text-acid" />
          </div>
          <div v-if="player.inventory.length" class="mt-4 space-y-2">
            <article v-for="item in player.inventory" :key="item.id" class="border border-white/10 bg-ink/50 p-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-bone">{{ item.title }}</p>
                  <p class="mt-1 text-xs text-fog">{{ item.effectLabel }}</p>
                </div>
                <button type="button" class="button-secondary !min-h-8 !px-2 !py-1 text-[10px]" :disabled="!canAct" @click="emit('use-item', { playerId: player.id, itemId: item.id })">Use</button>
              </div>
            </article>
          </div>
          <p v-else class="mt-4 border border-dashed border-white/10 p-4 text-center text-xs text-fog/60">Your hands are empty.</p>
        </section>

        <section class="panel p-5">
          <p class="eyebrow">Status</p>
          <div class="mt-4 space-y-3">
            <div class="flex items-center justify-between text-sm">
              <span class="flex items-center gap-2 text-fog"><HeartPulse class="h-4 w-4" /> Condition</span>
              <span class="capitalize text-bone">{{ player.status }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="flex items-center gap-2 text-fog"><Eye class="h-4 w-4" /> Light</span>
              <span class="text-bone">{{ player.vision }} room</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="flex items-center gap-2 text-fog"><Footprints class="h-4 w-4" /> Movement</span>
              <span class="text-bone">{{ player.movement }} room</span>
            </div>
          </div>
        </section>
      </aside>
    </section>
  </main>
</template>
