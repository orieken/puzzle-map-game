<script setup>
import { ref } from 'vue'
import { ArrowRight, Dices, Plus, Shield, Trash2, Users } from 'lucide-vue-next'

defineProps({
  joinError: { type: String, default: '' },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['create', 'join'])

const dmName = ref('The Keeper')
const partyNames = ref(['Mara', 'Thorne', 'Ilya'])
const newPlayer = ref('')
const joinCode = ref('')
const joinName = ref('')

function addPlayer() {
  const name = newPlayer.value.trim()
  if (!name || partyNames.value.some((player) => player.toLowerCase() === name.toLowerCase())) return
  partyNames.value.push(name)
  newPlayer.value = ''
}

function create() {
  emit('create', { dmName: dmName.value.trim() || 'Dungeon Master', partyNames: partyNames.value })
}
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-5 py-6 sm:px-8 lg:px-12 lg:py-10">
    <header class="flex items-center justify-between border-b border-white/10 pb-5">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center border border-acid/30 bg-acid/10 text-acid">
          <Dices class="h-5 w-5" />
        </div>
        <span class="font-display text-lg tracking-wide text-bone">Maze of Whispers</span>
      </div>
      <span class="hidden font-mono text-[10px] uppercase tracking-[0.24em] text-fog sm:block">A tabletop companion</span>
    </header>

    <section class="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.05fr_.95fr] lg:py-16">
      <div class="max-w-2xl">
        <p class="eyebrow mb-5">There is something in the dark</p>
        <h1 class="font-display text-5xl leading-[0.95] tracking-[-0.04em] text-[#eee8da] sm:text-7xl lg:text-[88px]">
          Find the center.<br />
          <em class="font-normal text-ember">Do not be heard.</em>
        </h1>
        <p class="mt-7 max-w-xl text-base leading-7 text-fog sm:text-lg">
          Scatter your party through a lightless maze. Search its rooms, misdirect the thing hunting you, and bring everyone home alive.
        </p>

        <div class="mt-10 grid max-w-xl grid-cols-3 gap-px overflow-hidden border border-white/10 bg-white/10">
          <div class="bg-ink p-4 sm:p-5">
            <p class="font-display text-2xl text-bone">12×12</p>
            <p class="mt-1 text-xs text-fog">Living maze</p>
          </div>
          <div class="bg-ink p-4 sm:p-5">
            <p class="font-display text-2xl text-bone">1</p>
            <p class="mt-1 text-xs text-fog">Step at a time</p>
          </div>
          <div class="bg-ink p-4 sm:p-5">
            <p class="font-display text-2xl text-ember">∞</p>
            <p class="mt-1 text-xs text-fog">Reasons to run</p>
          </div>
        </div>
      </div>

      <div class="panel p-5 sm:p-7">
        <div class="mb-6 flex items-start justify-between">
          <div>
            <p class="eyebrow">New expedition</p>
            <h2 class="mt-2 font-display text-3xl text-bone">Gather the party</h2>
          </div>
          <Shield class="h-6 w-6 text-acid/70" />
        </div>

        <label class="mb-5 block">
          <span class="mb-2 block text-xs font-semibold uppercase tracking-wider text-fog">Dungeon Master</span>
          <input v-model="dmName" class="field" aria-label="Dungeon Master name" />
        </label>

        <div>
          <span class="mb-2 block text-xs font-semibold uppercase tracking-wider text-fog">Players</span>
          <div class="space-y-2">
            <div v-for="(name, index) in partyNames" :key="`${name}-${index}`" class="flex items-center gap-3 border border-white/10 bg-ink/50 px-3 py-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-bone text-xs font-black text-ink">{{ name.slice(0, 1) }}</span>
              <span class="flex-1 text-sm text-bone">{{ name }}</span>
              <button type="button" class="p-1 text-fog transition hover:text-ember" :aria-label="`Remove ${name}`" @click="partyNames.splice(index, 1)">
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
          <form class="mt-2 flex gap-2" @submit.prevent="addPlayer">
            <input v-model="newPlayer" class="field" placeholder="Add a player" aria-label="New player name" />
            <button type="submit" class="button-secondary shrink-0 px-3" aria-label="Add player"><Plus class="h-4 w-4" /></button>
          </form>
        </div>

        <button type="button" class="button-primary mt-6 w-full" :disabled="partyNames.length === 0 || busy" @click="create">
          {{ busy ? 'Opening the way…' : 'Generate the maze' }} <ArrowRight v-if="!busy" class="h-4 w-4" />
        </button>

        <div class="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-fog/50">
          <span class="h-px flex-1 bg-white/10" /> or join a session <span class="h-px flex-1 bg-white/10" />
        </div>

        <form class="grid grid-cols-[1fr_1fr_auto] gap-2" @submit.prevent="emit('join', { code: joinCode, name: joinName })">
          <input v-model="joinCode" class="field uppercase" maxlength="6" placeholder="Code" aria-label="Game code" />
          <input v-model="joinName" class="field" placeholder="Your name" aria-label="Player name" />
          <button type="submit" class="button-secondary px-3" aria-label="Join game" :disabled="busy"><Users class="h-4 w-4" /></button>
        </form>
        <p v-if="joinError" class="mt-2 px-1 text-xs text-ember">{{ joinError }}</p>
        <p class="mt-2 text-[11px] leading-4 text-fog/60">Players can join from another device with the game code and their name.</p>
      </div>
    </section>
  </main>
</template>
