<template>
  <div class="min-h-screen bg-ink-50 font-body text-ink-800 relative">
    <!-- Subtle grain overlay -->
    <div class="fixed inset-0 pointer-events-none opacity-[0.03] z-50 mix-blend-multiply" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E');" />

    <!-- Header -->
    <header class="bg-ink-50/90 backdrop-blur-md border-b border-ink-200/60 sticky top-0 z-40">
      <div class="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
        <a href="/" class="flex items-center gap-3 group">
          <div class="w-9 h-9 bg-ink-900 rounded-sm flex items-center justify-center flex-shrink-0">
            <span class="text-ink-50 font-display text-sm leading-none">&deg;C</span>
          </div>
          <div>
            <h1 class="text-base font-display italic text-ink-900 tracking-tight leading-none group-hover:text-heat-700 transition-colors">
              Gérer l'inévitable
            </h1>
            <p class="text-[11px] text-ink-400 tracking-wide uppercase mt-0.5">Repères face à la dérive climatique</p>
          </div>
        </a>
        <nav class="hidden sm:flex items-center gap-4">
          <a
            href="https://editionsdelaube.fr/catalogue_de_livres/gerer-linevitable-reperes-face-a-la-derive-climatique/"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-700 transition-colors"
          >
            Le livre
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 17L17 7M17 7H7M17 7v10" /></svg>
          </a>
          <span class="text-ink-200">|</span>
          <span class="text-[11px] text-ink-400 tracking-wide uppercase">Données ouvertes</span>
        </nav>
      </div>
    </header>

    <!-- Hero + Search -->
    <section class="relative overflow-visible z-20">
      <!-- Heat gradient bar at top -->
      <div class="h-1 w-full bg-gradient-to-r from-green-500 via-heat-400 to-crisis-600" />

      <div class="max-w-6xl mx-auto px-5 pt-16 pb-12">
        <div class="max-w-3xl">
          <p class="text-xs uppercase tracking-[0.2em] text-heat-600 font-semibold mb-4 animate-fade-up">Explorer les données</p>
          <h2 class="font-display text-4xl sm:text-5xl lg:text-[3.5rem] text-ink-900 leading-[1.1] mb-5 animate-fade-up-1">
            Votre commune face à la dérive climatique
          </h2>
          <p class="text-lg text-ink-500 leading-relaxed max-w-xl mb-10 animate-fade-up-2">
            Risques, projections, catastrophes naturelles&nbsp;: explorez les données publiques de votre territoire. Un outil compagnon du livre <em class="font-display text-ink-700">Gérer l'inévitable</em>.
          </p>

          <div class="animate-fade-up-3">
            <CommuneSearch />
          </div>
        </div>

        <!-- Inline chat below search (landing page only) -->
        <div v-if="!selectedCommune" class="max-w-3xl mt-8 animate-fade-up-3 relative z-10">
          <div class="flex items-center gap-3 mb-4">
            <div class="h-px flex-1 bg-ink-200" />
            <span class="text-xs text-ink-400 uppercase tracking-widest whitespace-nowrap">ou posez une question</span>
            <div class="h-px flex-1 bg-ink-200" />
          </div>
          <McpChatbot inline />
        </div>
      </div>
    </section>

    <!-- Selected commune content -->
    <template v-if="selectedCommune">
      <!-- Commune header strip -->
      <section class="border-y border-ink-200 bg-white/60 animate-fade-in">
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
        <div v-if="activeTab === 'assistant'" class="animate-fade-up">
          <McpChatbot inline />
        </div>

        <!-- Tab: Elections x Climate -->
        <div v-if="activeTab === 'elections'" class="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-up">
          <div class="lg:col-span-8 space-y-8">
            <RiskMap :commune="selectedCommune" :risk-data="riskData" />
            <ElectionsPanel :projections="climateData.projections" />
          </div>
          <aside class="lg:col-span-4 space-y-6">
            <BookReferences context="elections" />
          </aside>
        </div>

        <!-- Tab: Climate Trends -->
        <div v-if="activeTab === 'climate'" class="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-up">
          <div class="lg:col-span-8 space-y-8">
            <ClimateSimulation
              :commune-name="selectedCommune.nom"
              :region-name="selectedCommune.region?.nom || ''"
              :risks="riskData.riskTypes"
            />
            <ClimateChart />
          </div>
          <aside class="lg:col-span-4 space-y-6">
            <BookReferences context="climate" />
          </aside>
        </div>
      </section>
    </template>

    <!-- Empty state cards -->
    <template v-if="!selectedCommune">
      <section class="max-w-4xl mx-auto px-5 py-16">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-px bg-ink-200 border border-ink-200 rounded-sm overflow-hidden animate-fade-up-2">
          <div class="bg-white p-8">
            <div class="w-10 h-10 border border-ink-200 rounded-sm flex items-center justify-center mb-4">
              <span class="font-display text-lg text-ink-700">01</span>
            </div>
            <h3 class="font-display text-lg text-ink-800 mb-2">Risques &amp; projections</h3>
            <p class="text-sm text-ink-500 leading-relaxed">Températures, précipitations, scénarios GIEC à l'échelle de votre commune.</p>
          </div>
          <div class="bg-white p-8">
            <div class="w-10 h-10 border border-ink-200 rounded-sm flex items-center justify-center mb-4">
              <span class="font-display text-lg text-ink-700">02</span>
            </div>
            <h3 class="font-display text-lg text-ink-800 mb-2">Gouvernance locale</h3>
            <p class="text-sm text-ink-500 leading-relaxed">Catastrophes naturelles sous le mandat, élus sortants et adaptation du territoire.</p>
          </div>
          <div class="bg-white p-8">
            <div class="w-10 h-10 border border-ink-200 rounded-sm flex items-center justify-center mb-4">
              <span class="font-display text-lg text-ink-700">03</span>
            </div>
            <h3 class="font-display text-lg text-ink-800 mb-2">Interrogez les données</h3>
            <p class="text-sm text-ink-500 leading-relaxed">Posez vos questions sur les données publiques avec l'assistant IA.</p>
          </div>
        </div>
      </section>
    </template>

    <!-- Footer -->
    <footer class="border-t border-ink-200 bg-white mt-8">
      <div class="max-w-6xl mx-auto px-5 py-10">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p class="font-display italic text-ink-800 mb-2">Gérer l'inévitable</p>
            <p class="text-sm text-ink-500 leading-relaxed">
              Repères face à la dérive climatique.
              Antoine Poincaré &amp; Clément Jeanneau.
              <a href="https://editionsdelaube.fr/catalogue_de_livres/gerer-linevitable-reperes-face-a-la-derive-climatique/" target="_blank" rel="noopener" class="text-ink-700 underline decoration-ink-300 hover:decoration-heat-400 transition-colors">
                Éditions de l'Aube, janvier 2026.
              </a>
            </p>
          </div>
          <div>
            <p class="font-display text-ink-800 mb-2">Sources de données</p>
            <p class="text-sm text-ink-500 leading-relaxed">
              geo.api.gouv.fr &middot; data.gouv.fr &middot; Géorisques &middot; Météo-France (DRIAS)
            </p>
          </div>
          <div>
            <p class="font-display text-ink-800 mb-2">Technologies</p>
            <p class="text-sm text-ink-500 leading-relaxed">
              IA&nbsp;: Claude&nbsp;Opus (Anthropic) &middot; Images&nbsp;: Nano&nbsp;Banana&nbsp;Pro (Google) &middot; Données&nbsp;: MCP data.gouv.fr
            </p>
          </div>
        </div>
        <div class="mt-8 pt-6 border-t border-ink-100">
          <p class="text-xs text-ink-400 text-center">
            Projet open-source &middot; Les projections climatiques sont indicatives et basées sur les modèles DRIAS
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

const tabs = [
  { id: 'assistant' as const, label: 'Assistant IA' },
  { id: 'climate' as const, label: "L'évolution climatique" },
  { id: 'elections' as const, label: 'Gouvernance locale' },
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
