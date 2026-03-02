import Anthropic from '@anthropic-ai/sdk'

const DATAGOUV_MCP_URL = 'https://mcp.data.gouv.fr/mcp'

// --- Georisques tools (direct API calls) ---

const georisquesTools: Anthropic.Tool[] = [
  {
    name: 'query_catnat',
    description: 'Recherche les arrêtés de catastrophes naturelles (CatNat) pour une commune française via l\'API Géorisques. Retourne la liste des déclarations avec dates, type de risque et date de publication au JO.',
    input_schema: {
      type: 'object' as const,
      properties: {
        code_insee: { type: 'string', description: 'Code INSEE de la commune (ex: 72168)' },
      },
      required: ['code_insee'],
    },
  },
  {
    name: 'query_risques',
    description: 'Recherche les risques naturels et technologiques identifiés pour une commune française via l\'API Géorisques. Retourne les types de risques (PPR, zone sismique, etc.).',
    input_schema: {
      type: 'object' as const,
      properties: {
        code_insee: { type: 'string', description: 'Code INSEE de la commune (ex: 72168)' },
      },
      required: ['code_insee'],
    },
  },
]

async function executeGeorisquesTool(name: string, input: Record<string, any>): Promise<string> {
  try {
    if (name === 'query_catnat') {
      const response = await $fetch<any>('https://georisques.gouv.fr/api/v1/gaspar/catnat', {
        params: { code_insee: input.code_insee, page_size: 50 },
      })
      const declarations = (response.data || []).map((d: any) => ({
        date_debut_evt: d.date_debut_evt,
        date_fin_evt: d.date_fin_evt,
        libelle_risque_jo: d.libelle_risque_jo,
        date_publication_arrete: d.date_publication_arrete,
        code_national_catnat: d.code_national_catnat,
      }))
      return JSON.stringify({ total: response.total || declarations.length, declarations }, null, 2)
    }

    if (name === 'query_risques') {
      const response = await $fetch<any>('https://georisques.gouv.fr/api/v1/gaspar/risques', {
        params: { code_insee: input.code_insee, page_size: 50 },
      })
      const risques = (response.data || []).map((r: any) => ({
        libelle_risque_long: r.libelle_risque_long,
        num_risque: r.num_risque,
      }))
      return JSON.stringify({ total: response.total || risques.length, risques }, null, 2)
    }

    return JSON.stringify({ error: `Unknown Georisques tool: ${name}` })
  } catch (e: any) {
    return JSON.stringify({ error: e.message || 'Georisques API call failed' })
  }
}

// --- data.gouv.fr MCP proxy tools ---

const datagouvMcpTools: Anthropic.Tool[] = [
  {
    name: 'search_datasets',
    description: 'Recherche des jeux de données sur data.gouv.fr par mots-clés. Première étape pour explorer les données ouvertes françaises.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Requête de recherche (en français, mots-clés courts et spécifiques)' },
        page_size: { type: 'number', description: 'Nombre de résultats (défaut 5, max 20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_dataset_info',
    description: 'Obtenir les métadonnées détaillées d\'un jeu de données data.gouv.fr par son ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dataset_id: { type: 'string', description: 'L\'identifiant du dataset' },
      },
      required: ['dataset_id'],
    },
  },
  {
    name: 'list_dataset_resources',
    description: 'Lister toutes les ressources (fichiers) d\'un dataset avec leurs métadonnées (format, taille, URL). Étape intermédiaire avant query_resource_data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dataset_id: { type: 'string', description: 'L\'identifiant du dataset' },
      },
      required: ['dataset_id'],
    },
  },
  {
    name: 'query_resource_data',
    description: 'Interroger les données tabulaires d\'une ressource CSV/XLSX via l\'API tabulaire de data.gouv.fr. Supporte filtrage et tri.',
    input_schema: {
      type: 'object' as const,
      properties: {
        resource_id: { type: 'string', description: 'L\'identifiant de la ressource' },
        question: { type: 'string', description: 'Ce que vous cherchez dans cette ressource (aide à contextualiser)' },
        page_size: { type: 'number', description: 'Nombre de lignes à retourner (défaut 20)' },
        filter_column: { type: 'string', description: 'Colonne sur laquelle filtrer' },
        filter_value: { type: 'string', description: 'Valeur du filtre' },
        filter_operator: { type: 'string', description: 'Opérateur: exact, contains, less, greater (défaut exact)' },
        sort_column: { type: 'string', description: 'Colonne de tri' },
        sort_direction: { type: 'string', description: 'Direction du tri: asc ou desc' },
      },
      required: ['resource_id', 'question'],
    },
  },
  {
    name: 'search_dataservices',
    description: 'Rechercher des APIs (dataservices) tierces enregistrées sur data.gouv.fr. Utile pour trouver des APIs programmatiques.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Requête de recherche' },
        page_size: { type: 'number', description: 'Nombre de résultats (défaut 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_dataservice_info',
    description: 'Obtenir les métadonnées d\'un dataservice (API tierce) : URL de base, documentation OpenAPI, licence.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dataservice_id: { type: 'string', description: 'L\'identifiant du dataservice' },
      },
      required: ['dataservice_id'],
    },
  },
]

// MCP session management — the datagouv MCP server uses Streamable HTTP
// with session IDs and SSE responses.
let mcpRequestId = 0
let mcpSessionId: string | null = null
let mcpSessionPromise: Promise<string | null> | null = null

async function initMcpSession(): Promise<string | null> {
  try {
    const response = await fetch(DATAGOUV_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++mcpRequestId,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'climate-poc', version: '1.0' },
        },
      }),
    })
    const sessionId = response.headers.get('mcp-session-id')
    if (sessionId) {
      mcpSessionId = sessionId
    }
    return mcpSessionId
  } catch (e: any) {
    console.error('MCP session init failed:', e.message)
    return null
  }
}

function getMcpSession(): Promise<string | null> {
  if (mcpSessionId) return Promise.resolve(mcpSessionId)
  if (!mcpSessionPromise) {
    mcpSessionPromise = initMcpSession().finally(() => { mcpSessionPromise = null })
  }
  return mcpSessionPromise
}

async function executeDatagouvMcpTool(name: string, input: Record<string, any>): Promise<string> {
  try {
    const sessionId = await getMcpSession()
    if (!sessionId) {
      return JSON.stringify({ error: 'Could not establish MCP session with data.gouv.fr' })
    }

    const response = await fetch(DATAGOUV_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Mcp-Session-Id': sessionId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++mcpRequestId,
        method: 'tools/call',
        params: { name, arguments: input },
      }),
    })

    // Parse SSE response — extract data from "event: message" lines
    const text = await response.text()
    const dataLines = text.split('\n')
      .filter(line => line.startsWith('data: '))
      .map(line => line.slice(6))

    if (!dataLines.length) {
      // Session may have expired — retry with fresh session
      mcpSessionId = null
      return JSON.stringify({ error: 'Empty MCP response, session may have expired' })
    }

    const parsed = JSON.parse(dataLines[0])

    if (parsed.error) {
      // Session expired — reset and signal error
      if (parsed.error.code === -32600) {
        mcpSessionId = null
      }
      return JSON.stringify({ error: parsed.error.message || 'MCP error' })
    }

    // MCP returns { result: { content: [{ type: "text", text: "..." }] } }
    const content = parsed.result?.content
    if (Array.isArray(content)) {
      return content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n')
    }

    return JSON.stringify(parsed.result || {}, null, 2)
  } catch (e: any) {
    return JSON.stringify({ error: e.message || 'data.gouv.fr MCP call failed' })
  }
}

// --- Combined tool execution ---

const allTools: Anthropic.Tool[] = [...georisquesTools, ...datagouvMcpTools]

const georisquesToolNames = new Set(georisquesTools.map(t => t.name))
const datagouvToolNames = new Set(datagouvMcpTools.map(t => t.name))

async function executeTool(name: string, input: Record<string, any>): Promise<string> {
  if (georisquesToolNames.has(name)) {
    return executeGeorisquesTool(name, input)
  }
  if (datagouvToolNames.has(name)) {
    return executeDatagouvMcpTool(name, input)
  }
  return JSON.stringify({ error: `Unknown tool: ${name}` })
}

// --- Main handler ---

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.anthropicApiKey

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      message: 'ANTHROPIC_API_KEY non configurée. Ajoutez-la dans le fichier .env',
    })
  }

  const body = await readBody(event)
  const { message, commune, codeInsee, population, departement, region, history } = body

  if (!message) {
    throw createError({ statusCode: 400, message: 'Message requis' })
  }

  const anthropic = new Anthropic({ apiKey })

  // Build commune context block
  let communeContext = ''
  if (commune && codeInsee) {
    const parts = [`L'utilisateur s'intéresse à la commune de **${commune}** (code INSEE : ${codeInsee}).`]
    if (population) parts.push(`Population : ${population.toLocaleString('fr-FR')} habitants.`)
    if (departement) parts.push(`Département : ${departement}.`)
    if (region) parts.push(`Région : ${region}.`)
    parts.push(`\nUtilise les outils query_catnat et query_risques avec le code INSEE ${codeInsee} pour répondre aux questions sur les catastrophes naturelles et risques de cette commune.`)
    communeContext = parts.join(' ')
  } else if (commune) {
    communeContext = `L'utilisateur s'intéresse à la commune de ${commune}.`
  }

  const systemPrompt = `Tu es un assistant spécialisé dans les données climatiques et électorales des communes françaises.
Tu aides les citoyens à comprendre les risques climatiques de leur commune et les enjeux des élections municipales 2026.

RÈGLE ABSOLUE : ne jamais inventer de données factuelles (noms de maires, dates, chiffres). Utilise TOUJOURS tes outils pour vérifier avant de répondre. Si tu ne trouves pas l'information via les outils, dis-le clairement.

Tu as accès à plusieurs outils :
- **query_catnat** et **query_risques** : données Géorisques (catastrophes naturelles, risques identifiés par commune)
- **search_datasets**, **get_dataset_info**, **list_dataset_resources**, **query_resource_data** : explorer et interroger les données ouvertes de data.gouv.fr
- **search_dataservices**, **get_dataservice_info** : découvrir des APIs de données publiques

Utilise systématiquement ces outils pour répondre avec des données réelles. Ne fabrique pas de données.

${communeContext}

Pour les données électorales (maire, conseil municipal), utilise le Répertoire National des Élus (RNE) sur data.gouv.fr :
- Dataset ID : 5c34c4d1634f4173183a64f1
- Ressource "maires" (CSV) : resource_id = 2d5cd260-fff3-47eb-8e3c-760e0a758e1a — colonnes : Code de la commune, Nom de l'élu, Prénom de l'élu, Date de naissance, Libellé de la fonction, Date de début de la fonction
- Pour trouver le maire d'une commune, utilise query_resource_data avec filter_column="Code de la commune" et filter_value=le code INSEE.

Réponds toujours en français, de manière concise et factuelle. Cite tes sources (Géorisques, data.gouv.fr, etc.).
Contexte : les élections municipales françaises ont lieu les 15 et 22 mars 2026.
Le livre "Gérer l'inévitable" d'Antoine Poincaré et Clément Jeanneau (Éditions de l'Aube, 2026) traite de l'adaptation climatique des territoires.`

  // Build messages array from history
  const messages: Anthropic.MessageParam[] = []
  if (history?.length) {
    for (const msg of history.slice(0, -1)) {
      messages.push({
        role: msg.role,
        content: msg.content,
      })
    }
  }
  messages.push({ role: 'user', content: message })

  try {
    // Initial request with tools
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      tools: allTools,
      messages,
    })

    // Handle tool use loop (max 8 iterations for multi-step tool chains like RNE lookup)
    let iterations = 0
    while (response.stop_reason === 'tool_use' && iterations < 8) {
      iterations++

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      )

      // Execute all tool calls in parallel
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (toolUse) => {
          const result = await executeTool(toolUse.name, toolUse.input as Record<string, any>)
          return {
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: result,
          }
        }),
      )

      // Continue conversation with tool results
      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        tools: allTools,
        messages,
      })
    }

    // Extract text from final response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    )
    let reply = textBlocks.map((b) => b.text).join('\n')

    // If loop exhausted without producing text (stop_reason still 'tool_use'),
    // force a final text-only response
    if (!reply) {
      messages.push({ role: 'assistant', content: response.content })
      const forced = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        tool_choice: { type: 'none' },
        tools: allTools,
        messages,
      })
      reply = forced.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((b) => b.text)
        .join('\n')
    }

    return { reply }
  } catch (e: any) {
    console.error('Claude API error:', e)

    let userMessage = 'Une erreur est survenue avec le service IA.'
    let statusCode = 500

    if (e.status) {
      const msg = e.error?.error?.message || e.message || ''
      if (e.status === 400 && msg.includes('credit')) {
        userMessage = 'Le service IA est temporairement indisponible (quota épuisé). Réessayez plus tard.'
        statusCode = 503
      } else if (e.status === 401) {
        userMessage = 'Erreur de configuration du service IA.'
      } else if (e.status === 429) {
        userMessage = 'Trop de requêtes. Veuillez patienter quelques secondes.'
        statusCode = 429
      } else if (e.status === 529 || e.status >= 500) {
        userMessage = 'Le service IA est temporairement surchargé. Réessayez dans un instant.'
        statusCode = 503
      }
    }

    throw createError({ statusCode, message: userMessage })
  }
})
