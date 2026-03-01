<template>
  <div class="space-y-6">
    <!-- Temperature chart -->
    <article class="bg-white rounded-sm border border-ink-200 overflow-hidden">
      <div class="border-b border-ink-100 px-6 py-3 bg-ink-50/50 flex items-baseline justify-between">
        <h3 class="text-xs uppercase tracking-[0.15em] text-ink-500 font-semibold">Évolution des températures</h3>
        <span class="text-[10px] text-ink-400">Station {{ climateData.stationName || '—' }}</span>
      </div>
      <div class="p-6">
        <div v-if="climateData.loading" class="h-[300px] flex items-center justify-center">
          <div class="w-6 h-6 border-2 border-heat-500 border-t-transparent rounded-full animate-spin" />
        </div>

        <div v-else-if="climateData.temperatures.length > 0">
          <canvas ref="tempChartRef" class="w-full h-[300px]" />
        </div>

        <p v-else class="text-ink-400 text-sm text-center py-8">
          Sélectionnez une commune pour afficher les données climatiques.
        </p>
      </div>
    </article>

    <!-- Scenario projections -->
    <article v-if="climateData.temperatures.length > 0" class="bg-ink-900 rounded-sm overflow-hidden">
      <div class="border-b border-ink-700/50 px-6 py-3">
        <h3 class="text-xs uppercase tracking-[0.15em] text-ink-400 font-semibold">Votre commune en 2050 &middot; Scénarios GIEC</h3>
      </div>
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- RCP 2.6 -->
          <div class="rounded-sm p-5 border border-green-500/20 bg-green-500/5">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span class="text-[10px] uppercase tracking-wider font-semibold text-green-400">RCP 2.6</span>
            </div>
            <p class="font-display text-3xl text-green-400 leading-none">
              {{ climateData.projections.rcp26.temp2050 }}°C
            </p>
            <p class="text-xs text-ink-500 mt-2">moy. annuelle en 2050</p>
            <p class="text-[10px] text-green-500/60 mt-1">{{ getWarmingDescription(1.2) }}</p>
          </div>

          <!-- RCP 4.5 -->
          <div class="rounded-sm p-5 border border-heat-400/20 bg-heat-400/5">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-2.5 h-2.5 rounded-full bg-heat-400" />
              <span class="text-[10px] uppercase tracking-wider font-semibold text-heat-400">RCP 4.5</span>
            </div>
            <p class="font-display text-3xl text-heat-400 leading-none">
              {{ climateData.projections.rcp45.temp2050 }}°C
            </p>
            <p class="text-xs text-ink-500 mt-2">moy. annuelle en 2050</p>
            <p class="text-[10px] text-heat-400/60 mt-1">{{ getWarmingDescription(1.8) }}</p>
          </div>

          <!-- RCP 8.5 -->
          <div class="rounded-sm p-5 border border-crisis-500/20 bg-crisis-500/5">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-2.5 h-2.5 rounded-full bg-crisis-400" />
              <span class="text-[10px] uppercase tracking-wider font-semibold text-crisis-400">RCP 8.5</span>
            </div>
            <p class="font-display text-3xl text-crisis-400 leading-none">
              {{ climateData.projections.rcp85.temp2050 }}°C
            </p>
            <p class="text-xs text-ink-500 mt-2">moy. annuelle en 2050</p>
            <p class="text-[10px] text-crisis-400/60 mt-1">{{ getWarmingDescription(2.5) }}</p>
          </div>
        </div>

        <!-- 2100 horizon -->
        <div class="mt-5 pt-4 border-t border-ink-700/50 flex items-center gap-6">
          <span class="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">2100</span>
          <div class="flex gap-6 text-sm font-mono">
            <span class="text-green-400">{{ climateData.projections.rcp26.temp2100 }}°C</span>
            <span class="text-heat-400">{{ climateData.projections.rcp45.temp2100 }}°C</span>
            <span class="text-crisis-400">{{ climateData.projections.rcp85.temp2100 }}°C</span>
          </div>
        </div>
      </div>
    </article>

    <!-- Precipitation chart -->
    <article class="bg-white rounded-sm border border-ink-200 overflow-hidden">
      <div class="border-b border-ink-100 px-6 py-3 bg-ink-50/50">
        <h3 class="text-xs uppercase tracking-[0.15em] text-ink-500 font-semibold">Précipitations annuelles</h3>
      </div>
      <div class="p-6">
        <div v-if="climateData.loading" class="h-[250px] flex items-center justify-center">
          <div class="w-6 h-6 border-2 border-heat-500 border-t-transparent rounded-full animate-spin" />
        </div>

        <div v-else-if="climateData.precipitation.length > 0">
          <canvas ref="precipChartRef" class="w-full h-[250px]" />
        </div>
      </div>
    </article>

    <p class="text-[11px] text-ink-300 text-center tracking-wide">
      Sources : Météo-France &middot; DRIAS (projections GIEC)
    </p>
  </div>
</template>

<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

const { climateData, getWarmingDescription } = useClimate()

const tempChartRef = ref<HTMLCanvasElement | null>(null)
const precipChartRef = ref<HTMLCanvasElement | null>(null)

let tempChart: ChartJS | null = null
let precipChart: ChartJS | null = null

// Chart typography
const chartFont = { family: '"Instrument Sans", system-ui, sans-serif', size: 11 }

function renderTempChart() {
  if (!tempChartRef.value || climateData.value.temperatures.length === 0) return

  if (tempChart) tempChart.destroy()

  const data = climateData.value.temperatures
  const labels = data.map((d) => d.year.toString())
  const values = data.map((d) => d.avg)

  const n = values.length
  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n
  const slope = values.reduce((acc, y, i) => acc + (i - xMean) * (y - yMean), 0) /
    values.reduce((acc, _, i) => acc + (i - xMean) ** 2, 0)
  const intercept = yMean - slope * xMean
  const trendline = values.map((_, i) => Math.round((slope * i + intercept) * 10) / 10)

  tempChart = new ChartJS(tempChartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Température moyenne (°C)',
          data: values,
          borderColor: '#bc4116',
          backgroundColor: 'rgba(188, 65, 22, 0.06)',
          fill: true,
          tension: 0.35,
          pointRadius: 2.5,
          pointBackgroundColor: '#bc4116',
          pointHoverRadius: 5,
          borderWidth: 2,
        },
        {
          label: 'Tendance',
          data: trendline,
          borderColor: '#f59048',
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: chartFont, color: '#96897a', padding: 16, usePointStyle: true, pointStyleWidth: 8 },
        },
        tooltip: {
          backgroundColor: '#1f1b17',
          titleFont: { ...chartFont, weight: 'bold' },
          bodyFont: chartFont,
          cornerRadius: 2,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}°C`,
          },
        },
      },
      scales: {
        x: { ticks: { font: chartFont, color: '#b5ad9e' }, grid: { display: false } },
        y: {
          title: { display: true, text: '°C', font: chartFont, color: '#96897a' },
          ticks: { font: chartFont, color: '#b5ad9e' },
          grid: { color: '#f3f1ed' },
        },
      },
    },
  })
}

function renderPrecipChart() {
  if (!precipChartRef.value || climateData.value.precipitation.length === 0) return

  if (precipChart) precipChart.destroy()

  const data = climateData.value.precipitation

  precipChart = new ChartJS(precipChartRef.value, {
    type: 'bar',
    data: {
      labels: data.map((d) => d.year.toString()),
      datasets: [
        {
          label: 'Précipitations (mm)',
          data: data.map((d) => d.total),
          backgroundColor: data.map((d) =>
            d.anomaly < -30 ? 'rgba(188, 65, 22, 0.5)' :
            d.anomaly > 30 ? 'rgba(59, 130, 246, 0.4)' :
            'rgba(181, 173, 158, 0.25)',
          ),
          borderRadius: 1,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: chartFont, color: '#96897a', padding: 16, usePointStyle: true, pointStyleWidth: 8 },
        },
        tooltip: {
          backgroundColor: '#1f1b17',
          titleFont: { ...chartFont, weight: 'bold' },
          bodyFont: chartFont,
          cornerRadius: 2,
        },
      },
      scales: {
        x: { ticks: { font: chartFont, color: '#b5ad9e' }, grid: { display: false } },
        y: {
          title: { display: true, text: 'mm', font: chartFont, color: '#96897a' },
          ticks: { font: chartFont, color: '#b5ad9e' },
          grid: { color: '#f3f1ed' },
        },
      },
    },
  })
}

watch(() => climateData.value.temperatures, () => {
  nextTick(() => {
    renderTempChart()
    renderPrecipChart()
  })
}, { deep: true })
</script>
