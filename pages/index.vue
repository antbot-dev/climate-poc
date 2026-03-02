<template>
  <div class="min-h-screen bg-ink-50 font-body text-ink-800 relative flex flex-col">
    <!-- Subtle grain overlay -->
    <div class="fixed inset-0 pointer-events-none opacity-[0.03] z-50 mix-blend-multiply" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E');" />

    <!-- Header -->
    <header class="bg-ink-50/90 backdrop-blur-md border-b border-ink-200/60 sticky top-0 z-40">
      <div class="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
        <a href="/" class="flex items-center gap-3 group">
          <svg class="w-8 h-8 flex-shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Thermometer body -->
            <rect x="13" y="4" width="6" height="18" rx="3" class="stroke-ink-800 group-hover:stroke-heat-600 transition-colors" stroke-width="1.5" fill="none" />
            <!-- Mercury bulb -->
            <circle cx="16" cy="24" r="4.5" class="stroke-ink-800 group-hover:stroke-heat-600 transition-colors" stroke-width="1.5" fill="none" />
            <!-- Mercury fill -->
            <rect x="14.5" y="12" width="3" height="10" rx="1.5" class="fill-heat-500" />
            <circle cx="16" cy="24" r="3" class="fill-heat-500" />
            <!-- Heat waves -->
            <path d="M23 10c1 -1.5 1 -3.5 0 -5" class="stroke-heat-400" stroke-width="1.2" stroke-linecap="round" fill="none" />
            <path d="M26 11c1 -1.5 1 -3.5 0 -5" class="stroke-heat-300" stroke-width="1" stroke-linecap="round" fill="none" />
          </svg>
          <div>
            <h1 class="text-base font-display italic text-ink-900 tracking-tight leading-none group-hover:text-heat-600 transition-colors">
              Gérer l'inévitable
            </h1>
            <p class="text-[11px] text-ink-400 tracking-wide uppercase mt-0.5">Repères face à la dérive climatique</p>
          </div>
        </a>
        <nav class="hidden sm:flex items-center gap-4">
          <!-- Compact search in header when commune is selected -->
          <div v-if="selectedCommune" class="w-[280px]">
            <CommuneSearch compact />
          </div>
          <a
            href="https://mcp.data.gouv.fr"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-2 text-xs hover:opacity-70 transition-opacity" style="color: #333"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            Serveur MCP expérimental data.gouv.fr
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 17L17 7M17 7H7M17 7v10" /></svg>
          </a>
        </nav>
      </div>
    </header>

    <main class="flex-grow">
    <!-- Hero + Search (landing only) -->
    <section v-if="!selectedCommune" class="relative overflow-visible z-20">
      <div class="max-w-6xl mx-auto px-5 pt-12 pb-10">
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 lg:gap-16 items-start">

          <!-- Left: headline + inputs -->
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-heat-600 font-semibold mb-4 animate-fade-up">Explorer les données</p>
            <h2 class="font-display text-4xl sm:text-5xl text-ink-900 leading-[1.08] mb-4 animate-fade-up-1">
              Votre commune face<br class="hidden sm:block"> à la dérive climatique
            </h2>
            <p class="text-base text-ink-500 leading-relaxed max-w-lg mb-7 animate-fade-up-2">
              Risques, projections, catastrophes naturelles&nbsp;: explorez les données publiques de votre territoire. Un outil compagnon du livre <em class="font-display text-ink-700">Gérer l'inévitable</em>.
            </p>

            <div class="relative z-10 animate-fade-up-3">
              <CommuneSearch />
            </div>

            <!-- Compact chat input -->
            <div class="mt-4 animate-fade-up-3">
              <div class="flex items-center gap-2 mb-2">
                <svg class="w-3 h-3 text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
                <span class="text-[10px] text-ink-400 uppercase tracking-widest">ou posez une question directement</span>
              </div>
              <form class="flex gap-2" @submit.prevent="sendLandingChat">
                <input
                  v-model="landingChatInput"
                  type="text"
                  placeholder="Posez une question sur les données climatiques…"
                  class="flex-1 px-4 py-2.5 text-sm font-body bg-ink-100 border border-ink-200 text-ink-900 placeholder-ink-400 rounded-sm focus:bg-white focus:border-ink-500 outline-none transition-all"
                />
                <button
                  type="submit"
                  :disabled="!landingChatInput.trim()"
                  class="px-4 py-2.5 bg-ink-800 text-white text-sm rounded-sm hover:bg-ink-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                </button>
              </form>
            </div>
          </div>

          <!-- Right: compact feature cards -->
          <div class="animate-fade-up-2 border border-ink-200 divide-y divide-ink-200 rounded-sm self-start">
            <div class="px-5 py-4 flex gap-4 items-start">
              <span class="font-mono text-[10px] text-ink-300 border border-ink-200 rounded-sm px-1.5 py-0.5 mt-0.5 flex-shrink-0 leading-none tracking-wider">01</span>
              <div>
                <p class="font-display text-[0.9rem] text-ink-900 leading-snug">Risques &amp; projections</p>
                <p class="text-xs text-ink-400 mt-1 leading-relaxed">Températures, précipitations, scénarios GIEC à l'échelle de votre commune.</p>
              </div>
            </div>
            <div class="px-5 py-4 flex gap-4 items-start">
              <span class="font-mono text-[10px] text-ink-300 border border-ink-200 rounded-sm px-1.5 py-0.5 mt-0.5 flex-shrink-0 leading-none tracking-wider">02</span>
              <div>
                <p class="font-display text-[0.9rem] text-ink-900 leading-snug">Gouvernance locale</p>
                <p class="text-xs text-ink-400 mt-1 leading-relaxed">Catastrophes naturelles sous le mandat, élus sortants et adaptation du territoire.</p>
              </div>
            </div>
            <div class="px-5 py-4 flex gap-4 items-start">
              <span class="font-mono text-[10px] text-ink-300 border border-ink-200 rounded-sm px-1.5 py-0.5 mt-0.5 flex-shrink-0 leading-none tracking-wider">03</span>
              <div>
                <p class="font-display text-[0.9rem] text-ink-900 leading-snug">Interrogez les données</p>
                <p class="text-xs text-ink-400 mt-1 leading-relaxed">Posez vos questions sur les données publiques avec l'assistant IA.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- Selected commune content -->
    <template v-if="selectedCommune">
      <!-- Commune header strip -->
      <section class="border-b border-ink-200 bg-white/60 animate-fade-in">
        <div class="max-w-6xl mx-auto px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div class="flex-1">
            <h2 class="font-display text-2xl sm:text-3xl text-ink-900 leading-tight">{{ selectedCommune.nom }}</h2>
            <p class="text-sm text-ink-400 mt-0.5">
              {{ selectedCommune.departement?.nom }}
              <span class="text-ink-300 mx-1">/</span>
              {{ selectedCommune.population?.toLocaleString('fr-FR') }} habitants
              <span class="text-ink-300 mx-1">/</span>
              <span class="font-mono text-xs">{{ selectedCommune.code }}</span>
            </p>
          </div>
          <nav class="flex border border-ink-200 rounded-sm overflow-hidden">
            <button
              v-for="(tab, i) in tabs"
              :key="tab.id"
              :class="[
                'px-4 py-2 text-sm transition-all relative',
                activeTab === tab.id
                  ? 'bg-ink-900 text-ink-50 font-medium'
                  : 'bg-white text-ink-600 hover:bg-ink-100',
                i > 0 && 'border-l border-ink-200',
              ]"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>
      </section>

      <!-- Tab content -->
      <section class="max-w-6xl mx-auto px-5 py-8">
        <!-- Tab: Assistant IA -->
        <div v-if="activeTab === 'assistant'" key="tab-assistant" class="animate-fade-up">
          <McpChatbot inline />
        </div>

        <!-- Tab: Elections x Climate -->
        <div v-if="activeTab === 'elections'" key="tab-elections" class="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-up">
          <div class="lg:col-span-8 space-y-8">
            <RiskMap :commune="selectedCommune" :risk-data="riskData" />
            <ElectionsPanel :projections="climateData.projections" />
          </div>
          <aside class="lg:col-span-4 space-y-6">
            <BookReferences context="elections" />
          </aside>
        </div>

        <!-- Tab: Climate Trends -->
        <div v-if="activeTab === 'climate'" key="tab-climate" class="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-up">
          <div class="lg:col-span-8 space-y-8">
            <ClimateSimulation
              :commune-name="selectedCommune.nom"
              :region-name="selectedCommune.region?.nom || ''"
              :risks="riskData.riskTypes"
              :coordinates="selectedCommune.centre?.coordinates"
            />
            <ClimateChart />
          </div>
          <aside class="lg:col-span-4 space-y-6">
            <BookReferences context="climate" />
          </aside>
        </div>
      </section>
    </template>

    </main>

    <!-- Footer -->
    <footer class="border-t border-ink-200 bg-white mt-8">
      <div class="max-w-6xl mx-auto px-5 py-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <a href="https://editionsdelaube.fr/catalogue_de_livres/gerer-linevitable-reperes-face-a-la-derive-climatique/" target="_blank" rel="noopener" class="flex items-center gap-3 group">
            <img
              src="https://editionsdelaube.fr/wp-content/uploads/Document-special-produit-unique-visuel.-hd-5-20-652x1024.jpg"
              alt="Couverture — Gérer l'inévitable"
              class="w-10 rounded-sm shadow-sm"
            />
            <span class="text-sm text-ink-500 group-hover:text-ink-700 transition-colors">
              <span class="font-display italic text-ink-700">Gérer l'inévitable</span> &middot; A. Poincaré &amp; C. Jeanneau &middot; Éd. de l'Aube, 2026
            </span>
          </a>
          <p class="text-xs text-ink-400">
            Données publiques françaises &middot; Projections indicatives (DRIAS)
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const { selectedCommune, fetchCommuneByCode } = useCommune()
const { fetchMayor, fetchCandidates } = useElections()
const { riskData, fetchRisks } = useRisks()
const { climateData, fetchClimateData } = useClimate()

const activeTab = ref<'assistant' | 'elections' | 'climate'>('assistant')

// Compact landing chat
const { sendMessage } = useChat()
const landingChatInput = ref('')
function sendLandingChat() {
  const text = landingChatInput.value.trim()
  if (!text) return
  sendMessage(text)
  landingChatInput.value = ''
  activeTab.value = 'assistant'
}

const tabs = [
  { id: 'assistant' as const, label: 'Posez vos questions à l\'IA' },
  { id: 'climate' as const, label: 'Températures & scénarios 2050' },
  { id: 'elections' as const, label: 'Municipales 2026' },
]

// Load commune from URL query
const route = useRoute()
onMounted(async () => {
  const code = route.query.commune as string
  if (code) {
    const commune = await fetchCommuneByCode(code)
    if (commune) {
      selectedCommune.value = commune
    }
  }
})

// Fetch all data when commune changes
watch(selectedCommune, async (commune) => {
  if (commune) {
    await Promise.all([
      fetchMayor(commune.code),
      fetchCandidates(commune.code),
      fetchRisks(commune.code),
      fetchClimateData(commune.code, commune.region?.code || '11'),
    ])
  }
})

useHead({
  title: computed(() =>
    selectedCommune.value
      ? `${selectedCommune.value.nom} — Gérer l'inévitable`
      : 'Gérer l\'inévitable — Votre commune face à la dérive climatique',
  ),
})
</script>
