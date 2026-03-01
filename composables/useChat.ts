interface Message {
  role: 'user' | 'assistant'
  content: string
}

const messages = ref<Message[]>([])
const isLoading = ref(false)
const input = ref('')

export function useChat() {
  const { selectedCommune } = useCommune()

  const suggestions = computed(() => {
    const commune = selectedCommune.value?.nom
    if (commune) {
      return [
        `Quels risques naturels menacent ${commune} ?`,
        `Combien de cat-nat depuis 2010 à ${commune} ?`,
        `Quelle évolution climatique pour ${commune} ?`,
      ]
    }
    return [
      'Quels risques naturels menacent Marseille ?',
      'Combien de cat-nat à Lyon depuis 2010 ?',
      'Quelles communes les plus à risque en France ?',
    ]
  })

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading.value) return

    const userMessage = text.trim()
    input.value = ''
    messages.value.push({ role: 'user', content: userMessage })
    isLoading.value = true

    try {
      const response = await $fetch<{ reply: string }>('/api/chat', {
        method: 'POST',
        body: {
          message: userMessage,
          commune: selectedCommune.value?.nom || null,
          codeInsee: selectedCommune.value?.code || null,
          history: messages.value.slice(-6),
        },
      })

      messages.value.push({ role: 'assistant', content: response.reply })
    } catch (e: any) {
      let errorMsg = e.data?.message || e.message || 'Erreur de connexion.'
      // Never show raw JSON or API internals to the user
      if (errorMsg.includes('{') || errorMsg.includes('request_id')) {
        errorMsg = 'Service momentanément indisponible. Veuillez réessayer.'
      }
      messages.value.push({
        role: 'assistant',
        content: `Erreur : ${errorMsg}`,
      })
    } finally {
      isLoading.value = false
    }
  }

  return {
    messages,
    isLoading,
    input,
    suggestions,
    sendMessage,
  }
}
