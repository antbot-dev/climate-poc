export interface Mayor {
  nom: string
  prenom: string
  sexe: string
  date_naissance: string
  date_debut_mandat: string
  libelle_fonction: string
}

export interface CandidateList {
  nom_liste: string
  tete_liste: string
  nuance: string
  candidats: string[]
}

export interface ElectionsData {
  mayor: Mayor | null
  candidates: CandidateList[]
  loading: boolean
  error: string | null
}

const electionsData = ref<ElectionsData>({
  mayor: null,
  candidates: [],
  loading: false,
  error: null,
})

// data.gouv.fr resource IDs for RNE (Répertoire National des Élus)
const MAYORS_RESOURCE_ID = '2d9a9c4a-c4c7-4555-acff-5c1e0a7e5e2a'

export function useElections() {
  async function fetchMayor(codeInsee: string) {
    electionsData.value.loading = true
    electionsData.value.error = null

    try {
      // Fetch current mayor from RNE via data.gouv.fr tabular API
      const response = await $fetch<{ data: Record<string, string>[] }>(
        `https://tabular-api.data.gouv.fr/api/resources/${MAYORS_RESOURCE_ID}/data/`,
        {
          params: {
            'Code de la commune': codeInsee.slice(-3), // 3-digit commune code
            'Code du département': codeInsee.slice(0, 2),
            page_size: 1,
          },
        },
      )

      if (response.data?.length > 0) {
        const row = response.data[0]
        electionsData.value.mayor = {
          nom: row['Nom de l\'élu'] || row['Nom'] || '',
          prenom: row['Prénom de l\'élu'] || row['Prénom'] || '',
          sexe: row['Code sexe'] || '',
          date_naissance: row['Date de naissance'] || '',
          date_debut_mandat: row['Date de début du mandat'] || row['Date de début de fonction'] || '',
          libelle_fonction: row['Libellé de la fonction'] || 'Maire',
        }
      } else {
        electionsData.value.mayor = null
      }
    } catch (e) {
      console.error('Mayor fetch failed:', e)
      // Fallback: try alternative approach
      try {
        const altResponse = await $fetch<{ data: Record<string, string>[] }>(
          `https://tabular-api.data.gouv.fr/api/resources/${MAYORS_RESOURCE_ID}/data/`,
          {
            params: {
              'Code de la commune du mandat': codeInsee,
              page_size: 1,
            },
          },
        )
        if (altResponse.data?.length > 0) {
          const row = altResponse.data[0]
          electionsData.value.mayor = {
            nom: row['Nom de l\'élu'] || '',
            prenom: row['Prénom de l\'élu'] || '',
            sexe: row['Code sexe'] || '',
            date_naissance: row['Date de naissance'] || '',
            date_debut_mandat: row['Date de début du mandat'] || '',
            libelle_fonction: 'Maire',
          }
        }
      } catch {
        electionsData.value.error = 'Données du maire non disponibles.'
      }
    } finally {
      electionsData.value.loading = false
    }
  }

  async function fetchCandidates(_codeInsee: string) {
    // 2026 candidate lists — data not yet published as of POC date
    // Will be available on data.gouv.fr closer to election date
    // For now, return placeholder indicating data is pending
    electionsData.value.candidates = []
  }

  function getNuanceColor(nuance: string): string {
    const map: Record<string, string> = {
      'DIV': '#6b7280',
      'REM': '#ffcc00',
      'LR': '#0066cc',
      'PS': '#ff69b4',
      'RN': '#0d2240',
      'EELV': '#00c853',
      'LFI': '#c9462c',
      'DVD': '#5b9bd5',
      'DVG': '#e57373',
    }
    return map[nuance] || '#9ca3af'
  }

  return {
    electionsData,
    fetchMayor,
    fetchCandidates,
    getNuanceColor,
  }
}
