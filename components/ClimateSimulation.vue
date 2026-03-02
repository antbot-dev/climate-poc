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

    <!-- Image area -->
    <div class="relative">
      <div v-if="loading" class="aspect-square bg-ink-800 flex items-center justify-center">
        <div class="text-center">
          <div class="w-8 h-8 border-2 border-heat-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p class="text-sm text-ink-400">Génération en cours...</p>
          <p class="text-[10px] text-ink-500 mt-1">Street View + Gemini Flash</p>
        </div>
      </div>

      <!-- Before/After slider -->
      <div
        v-else-if="generatedImage && originalImage"
        ref="sliderRef"
        class="relative aspect-square select-none cursor-col-resize overflow-hidden"
        @mousedown="startDrag"
        @touchstart.passive="startDrag"
      >
        <!-- Before (original Street View) — full background -->
        <img
          :src="originalImage"
          :alt="`${communeName} — Aujourd'hui`"
          class="absolute inset-0 w-full h-full object-cover"
          draggable="false"
        />

        <!-- After (transformed 2050) — clipped by slider position -->
        <div
          class="absolute inset-0 overflow-hidden"
          :style="{ clipPath: `inset(0 0 0 ${sliderPercent}%)` }"
        >
          <img
            :src="generatedImage"
            :alt="`${communeName} en 2050 — ${currentScenario.warming}`"
            class="absolute inset-0 w-full h-full object-cover"
            draggable="false"
          />
        </div>

        <!-- Slider handle -->
        <div
          class="absolute top-0 bottom-0 z-10 pointer-events-none"
          :style="{ left: `${sliderPercent}%` }"
        >
          <div class="absolute inset-y-0 -translate-x-1/2 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
          <div class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-ink-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l-3 3 3 3m8-6l3 3-3 3" />
            </svg>
          </div>
        </div>

        <!-- Labels -->
        <div class="absolute top-3 left-3 z-10 px-2 py-1 bg-ink-900/70 backdrop-blur-sm rounded-sm">
          <span class="text-[10px] uppercase tracking-wider font-semibold text-white">Aujourd'hui</span>
        </div>
        <div class="absolute top-3 right-3 z-10 px-2 py-1 bg-heat-600/80 backdrop-blur-sm rounded-sm">
          <span class="text-[10px] uppercase tracking-wider font-semibold text-white">2050 · {{ currentScenario.warming }}</span>
        </div>

        <!-- Bottom info overlay -->
        <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-ink-950/90 via-ink-950/40 to-transparent p-5 pointer-events-none">
          <p class="text-white text-sm font-medium">
            {{ communeName }} &mdash; Scénario {{ currentScenario.label }}
          </p>
          <p v-if="imageAddress" class="text-white/50 text-xs mt-1">
            {{ imageAddress }}
          </p>
        </div>
      </div>

      <!-- Generated image only (no Street View original = no slider) -->
      <div v-else-if="generatedImage" class="relative">
        <img
          :src="generatedImage"
          :alt="`${communeName} en 2050 — ${currentScenario.warming}`"
          class="w-full aspect-square object-cover"
        />
        <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-ink-950/90 via-ink-950/40 to-transparent p-5">
          <p class="text-white text-sm font-medium">
            {{ communeName }} &mdash; Scénario {{ currentScenario.label }}
          </p>
          <p class="text-white/50 text-xs mt-1">
            {{ currentScenario.warming }} en 2050
          </p>
        </div>
      </div>

      <!-- Place search spinner -->
      <div v-else-if="loadingPlaces" class="aspect-square bg-ink-800 flex items-center justify-center">
        <div class="text-center">
          <div class="w-8 h-8 border-2 border-heat-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p class="text-sm text-ink-400">Recherche de lieux emblématiques...</p>
        </div>
      </div>

      <!-- Place picker -->
      <div v-else-if="showPlacePicker && places.length" class="aspect-square bg-ink-800 flex flex-col">
        <div class="px-5 pt-5 pb-3">
          <p class="text-sm text-ink-200 font-medium">
            Choisissez un lieu de {{ communeName }} à visualiser en 2050
          </p>
        </div>
        <div class="flex-1 overflow-y-auto px-5 pb-4">
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="place in places"
              :key="place.placeId"
              class="group rounded-sm overflow-hidden bg-ink-700/50 text-left transition-all hover:ring-2 hover:ring-heat-500 hover:scale-[1.02]"
              @click="selectPlace(place)"
            >
              <img
                :src="place.thumbnailUrl"
                :alt="place.name"
                class="w-full aspect-[4/3] object-cover"
              />
              <div class="px-2.5 py-2">
                <p class="text-xs text-ink-200 font-medium line-clamp-2 leading-snug">
                  {{ place.name }}
                </p>
              </div>
            </button>
          </div>
        </div>
        <div class="px-5 pb-4 pt-1 border-t border-ink-700/50">
          <button
            class="text-[11px] text-ink-500 hover:text-ink-300 transition-colors"
            @click="generate()"
          >
            Générer sans photo de référence →
          </button>
        </div>
      </div>

      <div v-else-if="error" class="aspect-square bg-ink-800 flex items-center justify-center p-6">
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

      <div v-else class="aspect-square bg-ink-800 flex items-center justify-center relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-t from-heat-900/10 to-transparent" />
        <button
          class="relative px-6 py-3 bg-heat-600 text-white rounded-sm text-sm font-medium hover:bg-heat-500 transition-colors flex items-center gap-2.5"
          @click="fetchPlaces()"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          Visualiser ma commune en 2050
        </button>
      </div>
    </div>

    <!-- Scenario explanation -->
    <div v-if="generatedImage && description" class="px-6 py-4 border-t border-ink-700/50">
      <p class="text-sm text-ink-300 leading-relaxed">
        {{ description }}
      </p>
    </div>

    <!-- Caption -->
    <div class="px-6 py-3 border-t border-ink-700/50">
      <p class="text-[10px] text-ink-500 leading-relaxed">
        Image : {{ imageSource === 'streetview' ? 'Google Places + Gemini Flash (transformation IA)' : 'Gemini Flash (Google)' }}
        <template v-if="imageAddress"> &middot; {{ imageAddress }}</template>
        &middot; Illustration conceptuelle, non prédictive &middot; Projections DRIAS / Météo-France
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  communeName: string
  regionName: string
  risks: string[]
  coordinates?: [number, number]
}>()

const scenarios = [
  { id: 'rcp45', label: 'Tendanciel', warming: '+2.7°C', activeBg: 'bg-heat-600', activeText: 'text-white' },
  { id: 'rcp85', label: 'Pessimiste', warming: '+4.8°C', activeBg: 'bg-crisis-600', activeText: 'text-white' },
]

interface PlaceCandidate {
  placeId: string
  name: string
  vicinity: string
  photoReference: string
  thumbnailUrl: string
  rating: number
  types: string[]
}

const selectedScenario = ref('rcp45')
const generatedImage = ref<string | null>(null)
const originalImage = ref<string | null>(null)
const description = ref('')
const imageSource = ref<'streetview' | 'generated' | ''>('')
const imageAddress = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

// Place picker state
const places = ref<PlaceCandidate[]>([])
const loadingPlaces = ref(false)
const showPlacePicker = ref(false)
const selectedPlaceName = ref('')
const placesCache = new Map<string, PlaceCandidate[]>()

// Before/After slider
const sliderRef = ref<HTMLElement | null>(null)
const sliderPercent = ref(50)
let isDragging = false

function startDrag(e: MouseEvent | TouchEvent) {
  isDragging = true
  updateSlider(e)
  const onMove = (ev: MouseEvent | TouchEvent) => { if (isDragging) updateSlider(ev) }
  const onEnd = () => {
    isDragging = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('mouseup', onEnd)
    document.removeEventListener('touchend', onEnd)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('touchmove', onMove, { passive: true })
  document.addEventListener('mouseup', onEnd)
  document.addEventListener('touchend', onEnd)
}

function updateSlider(e: MouseEvent | TouchEvent) {
  if (!sliderRef.value) return
  const rect = sliderRef.value.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const pct = ((clientX - rect.left) / rect.width) * 100
  sliderPercent.value = Math.max(2, Math.min(98, pct))
}

// Cache
const imageCache = new Map<string, { image: string; originalImage: string; description: string; source: string; address: string }>()

function cacheKey() {
  return `${props.communeName}::${selectedScenario.value}::${selectedPlaceName.value || 'auto'}`
}

const currentScenario = computed(() =>
  scenarios.find((s) => s.id === selectedScenario.value) || scenarios[1],
)

function selectScenario(id: string) {
  selectedScenario.value = id
  error.value = null
  const cached = imageCache.get(`${props.communeName}::${id}::${selectedPlaceName.value || 'auto'}`)
  if (cached) {
    generatedImage.value = cached.image
    originalImage.value = cached.originalImage || null
    description.value = cached.description
    imageSource.value = cached.source as any
    imageAddress.value = cached.address
  } else {
    generatedImage.value = null
    originalImage.value = null
    imageSource.value = ''
    imageAddress.value = ''
  }
}

// Reset state when commune changes
watch(() => props.communeName, () => {
  generatedImage.value = null
  originalImage.value = null
  description.value = ''
  imageSource.value = ''
  imageAddress.value = ''
  error.value = null
  sliderPercent.value = 50
  places.value = []
  showPlacePicker.value = false
  selectedPlaceName.value = ''
})

async function fetchPlaces() {
  const cached = placesCache.get(props.communeName)
  if (cached) {
    places.value = cached
    if (cached.length > 0) {
      showPlacePicker.value = true
      return
    }
    // No places cached — fall through to generate
    generate()
    return
  }

  loadingPlaces.value = true
  try {
    const res = await $fetch<{ places: PlaceCandidate[] }>('/api/places', {
      params: { communeName: props.communeName },
    })
    placesCache.set(props.communeName, res.places)
    places.value = res.places

    if (res.places.length > 0) {
      showPlacePicker.value = true
    } else {
      // No places found — skip picker, generate directly
      generate()
    }
  } catch {
    // API error — skip picker, generate directly
    generate()
  } finally {
    loadingPlaces.value = false
  }
}

function selectPlace(place: PlaceCandidate) {
  selectedPlaceName.value = place.name
  showPlacePicker.value = false
  generate({ photoReference: place.photoReference, placeName: place.name })
}

async function generate(placeOverride?: { photoReference: string; placeName: string }) {
  const key = cacheKey()
  const cached = imageCache.get(key)
  if (cached) {
    generatedImage.value = cached.image
    originalImage.value = cached.originalImage || null
    description.value = cached.description
    imageSource.value = cached.source as any
    imageAddress.value = cached.address
    return
  }

  loading.value = true
  error.value = null
  generatedImage.value = null
  originalImage.value = null

  try {
    const response = await $fetch<{ image: string; description: string; source?: string; address?: string; originalImage?: string }>('/api/generate-image', {
      method: 'POST',
      body: {
        communeName: props.communeName,
        regionName: props.regionName,
        risks: props.risks,
        scenario: selectedScenario.value,
        ...(placeOverride && {
          photoReference: placeOverride.photoReference,
          placeName: placeOverride.placeName,
        }),
      },
    })

    generatedImage.value = response.image
    originalImage.value = response.originalImage || null
    description.value = response.description
    imageSource.value = (response.source === 'places' || response.source === 'streetview' ? 'streetview' : 'generated') as any
    imageAddress.value = response.address || ''
    sliderPercent.value = 50
    imageCache.set(key, {
      image: response.image,
      originalImage: response.originalImage || '',
      description: response.description,
      source: response.source || 'generated',
      address: response.address || '',
    })
  } catch (e: any) {
    error.value = e.data?.message || 'Impossible de générer l\'image.'
  } finally {
    loading.value = false
  }
}
</script>
