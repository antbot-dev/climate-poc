<template>
  <div :class="['relative w-full', compact ? '' : 'max-w-2xl']">
    <div class="relative z-[45] group">
      <input
        v-model="query"
        type="text"
        :placeholder="compact ? 'Chercher une commune...' : 'Nom ou code postal de votre commune...'"
        :class="[
          'w-full font-body bg-white text-ink-900 placeholder-ink-400 rounded-sm outline-none transition-all',
          compact
            ? 'px-3 py-2 pr-9 text-sm border border-ink-300 focus:border-ink-600'
            : 'px-5 py-4 pr-12 text-lg border-2 border-ink-300 shadow-sm focus:border-ink-800 focus:shadow-md',
        ]"
        @input="onInput"
        @focus="showResults = true"
      />
      <div v-if="isSearching" :class="['absolute top-1/2 -translate-y-1/2', compact ? 'right-2.5' : 'right-4']">
        <div :class="['border-2 border-heat-500 border-t-transparent rounded-full animate-spin', compact ? 'w-4 h-4' : 'w-5 h-5']" />
      </div>
      <div v-else :class="['absolute top-1/2 -translate-y-1/2 text-ink-400 group-focus-within:text-ink-600 transition-colors', compact ? 'right-2.5' : 'right-4']">
        <svg :class="compact ? 'w-4 h-4' : 'w-5 h-5'" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>

    <!-- Results dropdown -->
    <div
      v-if="showResults && searchResults.length > 0"
      class="absolute z-50 w-full mt-1 bg-white rounded-sm shadow-lg border border-ink-200 overflow-y-auto max-h-[360px] animate-scale-in"
    >
      <button
        v-for="(commune, i) in searchResults"
        :key="commune.code"
        class="w-full px-5 py-3 text-left hover:bg-ink-50 transition-colors border-b border-ink-100 last:border-0 flex items-baseline gap-3"
        :style="{ animationDelay: `${i * 30}ms` }"
        @click="select(commune)"
      >
        <span class="font-display text-ink-900 text-base">{{ commune.nom }}</span>
        <span class="text-xs text-ink-400 font-mono">{{ commune.codesPostaux?.[0] }}</span>
        <span class="text-xs text-ink-400 flex-1">{{ commune.departement?.nom }}</span>
        <span v-if="commune.population" class="text-xs text-ink-400 tabular-nums">
          {{ formatPopulation(commune.population) }}
        </span>
      </button>
    </div>

    <!-- Click outside to close -->
    <div
      v-if="showResults && searchResults.length > 0"
      class="fixed inset-0 z-40"
      @click="showResults = false"
    />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const { searchResults, isSearching, searchCommunes, selectCommune } = useCommune()

const query = ref('')
const showResults = ref(false)

let debounceTimer: ReturnType<typeof setTimeout>

function onInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (query.value.length >= 2) {
      searchCommunes(query.value)
      showResults.value = true
    } else {
      showResults.value = false
    }
  }, 250)
}

function select(commune: any) {
  query.value = commune.nom
  showResults.value = false
  selectCommune(commune)
}

function formatPopulation(pop: number): string {
  return pop.toLocaleString('fr-FR') + ' hab.'
}
</script>
