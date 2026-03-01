export interface Commune {
  nom: string
  code: string // INSEE code
  codesPostaux: string[]
  population: number
  departement: { code: string; nom: string }
  region: { code: string; nom: string }
  centre: { type: string; coordinates: [number, number] } // [lng, lat]
  contour?: { type: string; coordinates: number[][][] }
}

const selectedCommune = ref<Commune | null>(null)
const searchResults = ref<Commune[]>([])
const isSearching = ref(false)

export function useCommune() {
  async function searchCommunes(query: string): Promise<Commune[]> {
    if (query.length < 2) {
      searchResults.value = []
      return []
    }
    isSearching.value = true
    try {
      const trimmed = query.trim()
      const isFullPostalCode = /^\d{5}$/.test(trimmed)

      const params: Record<string, string | number> = {
        fields: 'nom,code,codesPostaux,population,departement,region,centre,contour',
        boost: 'population',
        limit: 10,
      }

      if (isFullPostalCode) {
        // Exact 5-digit postal code — return all communes sharing this code
        params.codePostal = trimmed
        params.limit = 50
        delete params.boost // not supported with codePostal
      } else if (/^\d+$/.test(trimmed) && trimmed.length < 5) {
        // Partial number typed — wait for full 5 digits
        searchResults.value = []
        isSearching.value = false
        return []
      } else {
        // Name-based search
        params.nom = trimmed
      }

      let data = await $fetch<Commune[]>('https://geo.api.gouv.fr/communes', { params })
      // Postal code results come alphabetically — sort by population so the main town appears first
      if (isFullPostalCode) {
        data = data.sort((a, b) => (b.population || 0) - (a.population || 0))
      }
      searchResults.value = data
      return data
    } catch (e) {
      console.error('Commune search failed:', e)
      searchResults.value = []
      return []
    } finally {
      isSearching.value = false
    }
  }

  async function fetchCommuneByCode(code: string): Promise<Commune | null> {
    try {
      const data = await $fetch<Commune>(`https://geo.api.gouv.fr/communes/${code}`, {
        params: {
          fields: 'nom,code,codesPostaux,population,departement,region,centre,contour',
        },
      })
      return data
    } catch {
      return null
    }
  }

  function selectCommune(commune: Commune) {
    selectedCommune.value = commune
    searchResults.value = []
    // Update URL
    const router = useRouter()
    router.replace({ query: { commune: commune.code } })
  }

  return {
    selectedCommune,
    searchResults,
    isSearching,
    searchCommunes,
    fetchCommuneByCode,
    selectCommune,
  }
}
