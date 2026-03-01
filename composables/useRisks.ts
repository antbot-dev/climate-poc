export interface CatNatDeclaration {
  date_debut: string
  date_fin: string
  date_publication_jo: string
  code_type_risque: string
  libelle_risque: string
}

export interface RiskSummary {
  catnat: CatNatDeclaration[]
  catnatDuringMandate: CatNatDeclaration[] // 2020-2026
  riskTypes: string[]
  totalCatNat: number
  loading: boolean
  error: string | null
}

const riskData = ref<RiskSummary>({
  catnat: [],
  catnatDuringMandate: [],
  riskTypes: [],
  totalCatNat: 0,
  loading: false,
  error: null,
})

export function useRisks() {
  async function fetchRisks(codeInsee: string) {
    riskData.value.loading = true
    riskData.value.error = null

    try {
      // Géorisques API for cat-nat declarations
      const response = await $fetch<{
        data: CatNatDeclaration[]
        total: number
      }>('https://georisques.gouv.fr/api/v1/gaspar/catnat', {
        params: {
          code_insee: codeInsee,
          page: 1,
          page_size: 200,
        },
      })

      const all = response.data || []
      riskData.value.catnat = all
      riskData.value.totalCatNat = all.length

      // Filter for current mandate period (2020-2026)
      riskData.value.catnatDuringMandate = all.filter((d) => {
        const year = new Date(d.date_debut).getFullYear()
        return year >= 2020 && year <= 2026
      })

      // Extract unique risk types
      riskData.value.riskTypes = [...new Set(all.map((d) => d.libelle_risque))]
    } catch (e) {
      console.error('Risk data fetch failed:', e)
      riskData.value.error = 'Impossible de charger les données de risques.'
      riskData.value.catnat = []
      riskData.value.catnatDuringMandate = []
      riskData.value.riskTypes = []
    } finally {
      riskData.value.loading = false
    }
  }

  function getRiskColor(risk: string): string {
    const lower = risk.toLowerCase()
    if (lower.includes('inondation')) return '#3b82f6'
    if (lower.includes('sécheresse') || lower.includes('secheresse')) return '#f59e0b'
    if (lower.includes('tempête') || lower.includes('tempete')) return '#8b5cf6'
    if (lower.includes('mouvement de terrain')) return '#a16207'
    if (lower.includes('séisme') || lower.includes('seisme')) return '#ef4444'
    return '#6b7280'
  }

  function getRiskIcon(risk: string): string {
    const lower = risk.toLowerCase()
    if (lower.includes('inondation')) return '🌊'
    if (lower.includes('sécheresse') || lower.includes('secheresse')) return '☀️'
    if (lower.includes('tempête') || lower.includes('tempete')) return '🌪️'
    if (lower.includes('mouvement de terrain')) return '⛰️'
    if (lower.includes('séisme') || lower.includes('seisme')) return '🔴'
    return '⚠️'
  }

  return {
    riskData,
    fetchRisks,
    getRiskColor,
    getRiskIcon,
  }
}
