<script setup>
import { computed } from 'vue'
import { Skull, Volume2 } from 'lucide-vue-next'

const props = defineProps({
  maze: { type: Array, required: true },
  players: { type: Array, default: () => [] },
  abomination: { type: Object, default: null },
  noises: { type: Array, default: () => [] },
  exit: { type: Object, required: true },
  explored: { type: Array, default: null },
  activePlayerId: { type: String, default: null },
  interactive: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])
const exploredSet = computed(() => new Set(props.explored || []))
const size = computed(() => props.maze.length)

function occupants(row, col) {
  return props.players.filter((player) => player.position.row === row && player.position.col === col)
}

function noiseAt(row, col) {
  return props.noises.find((noise) => noise.position.row === row && noise.position.col === col)
}

function isExit(row, col) {
  return props.exit.row === row && props.exit.col === col
}

function isHidden(row, col) {
  return props.explored && !exploredSet.value.has(`${row}:${col}`)
}

function wallStyle(cell) {
  return {
    borderTopColor: cell.walls.north ? 'rgba(216,210,196,.78)' : 'rgba(255,255,255,.04)',
    borderRightColor: cell.walls.east ? 'rgba(216,210,196,.78)' : 'rgba(255,255,255,.04)',
    borderBottomColor: cell.walls.south ? 'rgba(216,210,196,.78)' : 'rgba(255,255,255,.04)',
    borderLeftColor: cell.walls.west ? 'rgba(216,210,196,.78)' : 'rgba(255,255,255,.04)',
  }
}
</script>

<template>
  <div
    class="maze-grid aspect-square w-full overflow-hidden border border-bone/40 bg-ink"
    :style="{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }"
    role="grid"
    aria-label="Maze map"
  >
    <button
      v-for="cell in maze.flat()"
      :key="`${cell.row}:${cell.col}`"
      type="button"
      class="maze-cell relative flex items-center justify-center border bg-ash/40 transition"
      :class="[
        interactive ? 'hover:bg-acid/10' : 'cursor-default',
        isHidden(cell.row, cell.col) ? 'maze-hidden' : '',
      ]"
      :style="wallStyle(cell)"
      :disabled="!interactive"
      :aria-label="`Room ${cell.row + 1}, ${cell.col + 1}`"
      @click="emit('select', cell)"
    >
      <template v-if="!isHidden(cell.row, cell.col)">
        <span
          v-if="isExit(cell.row, cell.col)"
          class="absolute h-2.5 w-2.5 rounded-full border border-acid bg-acid/20 shadow-acid sm:h-3.5 sm:w-3.5"
          title="Escape hole"
        />

        <span
          v-if="abomination && abomination.position.row === cell.row && abomination.position.col === cell.col"
          class="absolute z-20 flex h-[70%] w-[70%] items-center justify-center rounded-full bg-ember text-ink shadow-ember"
          title="The abomination"
        >
          <Skull class="h-3/4 w-3/4" :stroke-width="2.2" />
        </span>

        <span
          v-if="noiseAt(cell.row, cell.col)"
          class="absolute right-[8%] top-[8%] z-10 text-acid"
          :title="`Noise: ${noiseAt(cell.row, cell.col).loudness}`"
        >
          <Volume2 class="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </span>

        <div class="absolute inset-0 z-30 flex flex-wrap items-center justify-center gap-px p-px">
          <span
            v-for="player in occupants(cell.row, cell.col)"
            :key="player.id"
            class="flex h-[42%] min-h-2 w-[42%] min-w-2 items-center justify-center rounded-full border text-[6px] font-black uppercase sm:text-[8px]"
            :class="[
              player.status === 'dead'
                ? 'border-fog/60 bg-ink text-fog line-through'
                : player.id === activePlayerId
                  ? 'border-acid bg-acid text-ink shadow-acid'
                  : 'border-bone/50 bg-bone text-ink',
            ]"
            :title="`${player.name} · ${player.status}`"
          >
            {{ player.name.slice(0, 1) }}
          </span>
        </div>
      </template>
    </button>
  </div>
</template>

<style scoped>
.maze-grid {
  display: grid;
}

.maze-cell {
  border-width: 1px;
  aspect-ratio: 1;
}

.maze-hidden {
  background:
    radial-gradient(circle at center, rgba(255, 255, 255, 0.025), transparent 55%),
    #090a0b;
  border-color: rgba(255, 255, 255, 0.025) !important;
}
</style>
