<template>
  <div class="bg-ink-900 rounded-sm overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-ink-700/50 flex items-center justify-between">
      <div>
        <h3 class="text-xs uppercase tracking-[0.15em] text-ink-400 font-semibold">
          Simulation visuelle
        </h3>
        <p class="font-display text-lg text-ink-100 mt-0.5">
          {{ communeName }} en 2050
        </p>
      </div>

      <!-- Scenario selector -->
      <div class="flex border border-ink-700 rounded-sm overflow-hidden">
        <button
          v-for="(s, i) in scenarios"
          :key="s.id"
          :class="[
            'px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all',
            selectedScenario === s.id
              ? `${s.activeBg} ${s.activeText}`
              : 'bg-transparent text-ink-500 hover:text-ink-300',
            i > 0 && 'border-l border-ink-700',
          ]"
          @click="selectScenario(s.id)"
        >
          {{ s.warming }}
        </button>
      </div>
    </div>

    <!-- Generated image -->
    <div class="relative">
      <div v-if="loading" class="aspect-[16/9] bg-ink-800 flex items-center justify-center">
        <div class="text-center">
          <div class="w-8 h-8 border-2 border-heat-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p class="text-sm text-ink-400">Génération en cours...</p>
          <p class="text-[10px] text-ink-500 mt-1">Nano Banana Pro</p>
        </div>
      </div>

      <div v-else-if="generatedImage" class="relative">
        <img
          :src="generatedImage"
          :alt="`${communeName} en 2050 — ${currentScenario.warming}`"
          class="w-full aspect-[16/9] object-cover"
        />
        <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-ink-950/90 via-ink-950/40 to-transparent p-5">
          <p class="text-white text-sm font-medium">{{ description }}</p>
          <p class="text-white/50 text-xs mt-1">
            Scénario {{ currentScenario.label }} &middot; {{ currentScenario.warming }} en 2050
          </p>
        </div>
      </div>

      <div v-else-if="error" class="aspect-[16/9] bg-ink-800 flex items-center justify-center p-6">
        <div class="text-center">
          <p class="text-heat-400 text-sm mb-3">{{ error }}</p>
          <button
            class="px-3 py-1.5 border border-ink-600 text-ink-300 rounded-sm text-xs hover:border-ink-500 transition-colors"
            @click="generate()"
          >
            Réessayer
          </button>
        </div>
      </div>

      <div v-else class="aspect-[16/9] bg-ink-800 flex items-center justify-center relative overflow-hidden">
        <!-- Subtle heat shimmer background -->
        <div class="absolute inset-0 bg-gradient-to-t from-heat-900/10 to-transparent" />
        <button
          class="relative px-6 py-3 bg-heat-600 text-white rounded-sm text-sm font-medium hover:bg-heat-500 transition-colors flex items-center gap-2.5"
          @click="generate()"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          Visualiser ma commune en 2050
        </button>
      </div>
    </div>

    <!-- Caption -->
    <div class="px-6 py-3 border-t border-ink-700/50">
      <p class="text-[10px] text-ink-500 leading-relaxed">
        Image : Nano Banana Pro (Google) &middot; Illustration conceptuelle, non prédictive &middot; Projections DRIAS / Météo-France
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  communeName: string
  regionName: string
  risks: string[]
}>()

const scenarios = [
  { id: 'rcp26', label: 'Optimiste', warming: '+1.2°C', activeBg: 'bg-green-600', activeText: 'text-white' },
  { id: 'rcp45', label: 'Tendanciel', warming: '+2.7°C', activeBg: 'bg-heat-600', activeText: 'text-white' },
  { id: 'rcp85', label: 'Pessimiste', warming: '+4.8°C', activeBg: 'bg-crisis-600', activeText: 'text-white' },
]

const selectedScenario = ref('rcp45')
const generatedImage = ref<string | null>(null)
const description = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

const currentScenario = computed(() =>
  scenarios.find((s) => s.id === selectedScenario.value) || scenarios[1],
)

function selectScenario(id: string) {
  selectedScenario.value = id
  generatedImage.value = null
  error.value = null
}

async function generate() {
  loading.value = true
  error.value = null
  generatedImage.value = null

  try {
    const response = await $fetch<{ image: string; description: string }>('/api/generate-image', {
      method: 'POST',
      body: {
        communeName: props.communeName,
        regionName: props.regionName,
        risks: props.risks,
        scenario: selectedScenario.value,
      },
    })

    generatedImage.value = response.image
    description.value = response.description
  } catch (e: any) {
    error.value = e.data?.message || 'Impossible de générer l\'image.'
  } finally {
    loading.value = false
  }
}
</script>
