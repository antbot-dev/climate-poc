<template>
  <div class="rounded-sm overflow-hidden border border-ink-200 bg-white relative">
    <div ref="mapContainer" class="h-[420px] w-full" />
    <div v-if="!mapReady" class="h-[420px] w-full flex items-center justify-center bg-ink-100">
      <p class="text-ink-400 text-sm">Sélectionnez une commune pour afficher la carte</p>
    </div>
    <!-- Risk overlay -->
    <div
      v-if="mapReady && riskData && riskData.totalCatNat > 0"
      class="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm border border-ink-200 rounded-sm px-3 py-2.5 max-w-[220px] shadow-sm"
    >
      <p class="text-[11px] uppercase tracking-wider text-ink-400 mb-1.5">Catastrophes naturelles</p>
      <p class="font-display text-2xl text-ink-900 leading-none mb-1">{{ riskData.totalCatNat }}</p>
      <p class="text-[11px] text-ink-400 mb-2">
        arrêtés depuis 1982
        <template v-if="riskData.catnatDuringMandate.length > 0">
          · <span class="text-heat-600 font-medium">{{ riskData.catnatDuringMandate.length }}</span> sous ce mandat
        </template>
      </p>
      <div class="flex flex-wrap gap-1">
        <span
          v-for="risk in riskData.riskTypes.slice(0, 4)"
          :key="risk"
          class="inline-flex items-center gap-1 text-[10px] text-ink-600 bg-ink-100 rounded-sm px-1.5 py-0.5"
        >
          <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ backgroundColor: getRiskColor(risk) }" />
          {{ shortenRisk(risk) }}
        </span>
        <span v-if="riskData.riskTypes.length > 4" class="text-[10px] text-ink-400 px-1 py-0.5">
          +{{ riskData.riskTypes.length - 4 }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commune } from '~/composables/useCommune'
import type { RiskSummary } from '~/composables/useRisks'

const props = defineProps<{
  commune: Commune | null
  riskData: RiskSummary | null
}>()

const { getRiskColor } = useRisks()

const mapContainer = ref<HTMLElement | null>(null)
const mapReady = ref(false)
let map: any = null
let marker: any = null
let contourLayer: any = null

function shortenRisk(risk: string): string {
  return risk
    .replace(/^Inondations et coulées de boue$/i, 'Inondations')
    .replace(/^Mouvements de terrain.*$/i, 'Mouv. terrain')
    .replace(/^Sécheresse.*$/i, 'Sécheresse')
    .replace(/^Tempête.*$/i, 'Tempête')
    .replace(/^Séisme.*$/i, 'Séisme')
}

const initMap = async (center?: [number, number], zoom?: number) => {
  if (!mapContainer.value || !import.meta.client) return

  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })

  if (map) map.remove()

  map = L.map(mapContainer.value, { zoomControl: false })
    .setView(center || [46.603354, 1.888334], zoom ?? 6)

  L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.fr">OSM France</a>',
    maxZoom: 19,
    subdomains: 'abc',
  }).addTo(map)

  L.control.zoom({ position: 'topright' }).addTo(map)

  mapReady.value = true
}

const updateMap = async (commune: Commune) => {
  if (!map || !import.meta.client) return

  const L = await import('leaflet')
  const [lng, lat] = commune.centre.coordinates

  if (marker) map.removeLayer(marker)
  if (contourLayer) map.removeLayer(contourLayer)

  marker = L.marker([lat, lng]).addTo(map)
  marker.bindPopup(`
    <div style="font-family: 'DM Serif Display', Georgia, serif; padding: 2px 0;">
      <strong style="font-size: 15px;">${commune.nom}</strong><br/>
      <span style="font-size: 12px; color: #7a6e60;">${commune.departement?.nom} &middot; ${commune.population?.toLocaleString('fr-FR')} hab.</span>
    </div>
  `).openPopup()

  if (commune.contour) {
    contourLayer = L.geoJSON(commune.contour as any, {
      style: {
        color: '#bc4116',
        weight: 2.5,
        fillColor: '#f59048',
        fillOpacity: 0.12,
      },
    }).addTo(map)
    map.fitBounds(contourLayer.getBounds(), { padding: [40, 40] })
  } else {
    map.setView([lat, lng], 13)
  }
}

onMounted(async () => {
  if (props.commune) {
    const [lng, lat] = props.commune.centre.coordinates
    await initMap([lat, lng], 13)
    await updateMap(props.commune)
  }
})

watch(() => props.commune, async (newCommune) => {
  if (!newCommune) return
  const [lng, lat] = newCommune.centre.coordinates
  if (!mapReady.value) {
    await initMap([lat, lng], 13)
  }
  await updateMap(newCommune)
})
</script>
