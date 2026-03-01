import Anthropic from '@anthropic-ai/sdk'

// MCP tool definitions matching data.gouv.fr MCP server capabilities
const mcpTools: Anthropic.Tool[] = [
  {
    name: 'search_datasets',
    description: 'Search for datasets on data.gouv.fr. Use this to find relevant datasets about climate, elections, risks, communes, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query in French' },
        page_size: { type: 'number', description: 'Number of results (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_dataset_info',
    description: 'Get detailed information about a specific dataset on data.gouv.fr by its ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dataset_id: { type: 'string', description: 'The dataset ID' },
      },
      required: ['dataset_id'],
    },
  },
  {
    name: 'query_resource_data',
    description: 'Query tabular data from a data.gouv.fr resource. Allows filtering and pagination.',
    input_schema: {
      type: 'object' as const,
      properties: {
        resource_id: { type: 'string', description: 'The resource ID' },
        filters: { type: 'object', description: 'Key-value filters to apply' },
        page_size: { type: 'number', description: 'Number of rows to return' },
      },
      required: ['resource_id'],
    },
  },
]

// Execute MCP tool calls against data.gouv.fr APIs
async function executeTool(name: string, input: Record<string, any>): Promise<string> {
  try {
    switch (name) {
      case 'search_datasets': {
        const response = await $fetch<any>('https://www.data.gouv.fr/api/1/datasets/', {
          params: {
            q: input.query,
            page_size: input.page_size || 5,
          },
        })
        const datasets = response.data?.map((d: any) => ({
          id: d.id,
          title: d.title,
          description: d.description?.substring(0, 200),
          organization: d.organization?.name,
          resources_count: d.resources?.length,
        }))
        return JSON.stringify(datasets || [], null, 2)
      }

      case 'get_dataset_info': {
        const response = await $fetch<any>(`https://www.data.gouv.fr/api/1/datasets/${input.dataset_id}/`)
        return JSON.stringify({
          title: response.title,
          description: response.description?.substring(0, 500),
          resources: response.resources?.slice(0, 5).map((r: any) => ({
            id: r.id,
            title: r.title,
            format: r.format,
            url: r.url,
          })),
        }, null, 2)
      }

      case 'query_resource_data': {
        const params: Record<string, any> = {
          page_size: input.page_size || 10,
        }
        if (input.filters) {
          Object.entries(input.filters).forEach(([key, value]) => {
            params[key] = value
          })
        }
        const response = await $fetch<any>(
          `https://tabular-api.data.gouv.fr/api/resources/${input.resource_id}/data/`,
          { params },
        )
        return JSON.stringify({
          total: response.meta?.total,
          data: response.data?.slice(0, 10),
        }, null, 2)
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` })
    }
  } catch (e: any) {
    return JSON.stringify({ error: e.message || 'Tool execution failed' })
  }
}

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
  const { message, commune, codeInsee, history } = body

  if (!message) {
    throw createError({ statusCode: 400, message: 'Message requis' })
  }

  const anthropic = new Anthropic({ apiKey })

  const systemPrompt = `Tu es un assistant spécialisé dans les données climatiques et électorales des communes françaises.
Tu aides les citoyens à comprendre les risques climatiques de leur commune et les enjeux des élections municipales 2026.

Tu as accès à des outils pour chercher et interroger des données sur data.gouv.fr (portail français de données ouvertes).
Utilise ces outils pour répondre avec des données réelles quand c'est possible.

${commune ? `L'utilisateur s'intéresse actuellement à la commune de ${commune}${codeInsee ? ` (code INSEE: ${codeInsee})` : ''}.` : ''}

Pour les catastrophes naturelles (cat-nat), tu peux aussi mentionner l'API Géorisques : georisques.gouv.fr
Pour les données électorales, cherche le "Répertoire National des Élus" sur data.gouv.fr.

Réponds toujours en français, de manière concise et factuelle. Cite tes sources.
Contexte : les élections municipales françaises ont lieu les 15 et 22 mars 2026.
Le livre "Gérer l'inévitable" d'Antoine Poincaré et Clément Jeanneau (Éditions de l'Aube, 2026) traite de l'adaptation climatique des territoires.`

  // Build messages array from history
  const messages: Anthropic.MessageParam[] = []
  if (history?.length) {
    for (const msg of history.slice(0, -1)) { // exclude current message (already in history)
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
      model: 'claude-opus-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      tools: mcpTools,
      messages,
    })

    // Handle tool use loop (max 3 iterations)
    let iterations = 0
    while (response.stop_reason === 'tool_use' && iterations < 3) {
      iterations++

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      )

      // Execute all tool calls
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(toolUse.name, toolUse.input as Record<string, any>)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        })
      }

      // Continue conversation with tool results
      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })

      response = await anthropic.messages.create({
        model: 'claude-opus-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        tools: mcpTools,
        messages,
      })
    }

    // Extract text from final response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    )
    const reply = textBlocks.map((b) => b.text).join('\n')

    return { reply }
  } catch (e: any) {
    console.error('Claude API error:', e)

    // Map Anthropic SDK errors to clean French messages
    let userMessage = 'Une erreur est survenue avec le service IA.'
    let statusCode = 500

    if (e.status) {
      // Anthropic APIError — has .status and .error
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
