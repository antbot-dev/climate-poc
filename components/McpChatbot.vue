<template>
  <div
    :class="[
      'flex flex-col overflow-hidden',
      inline
        ? 'w-full bg-white border border-ink-200 rounded-sm'
        : '',
    ]"
    :style="inline && messages.length > 0 ? 'min-height: 400px' : ''"
  >
    <!-- Messages area -->
    <div ref="messagesEl" class="flex-1 overflow-y-auto p-4 space-y-3 bg-ink-50">
      <!-- Welcome state -->
      <div v-if="messages.length === 0" class="space-y-3">
        <div class="bg-white rounded-sm p-3 text-sm text-ink-700 border border-ink-100">
          <p class="font-medium mb-1">Interrogez les données publiques</p>
          <p class="text-xs text-ink-500">
            Questions sur les risques climatiques, catastrophes naturelles, données communales via data.gouv.fr.
          </p>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="suggestion in suggestions"
            :key="suggestion"
            class="px-3 py-2 bg-white hover:bg-ink-100 border border-ink-200 rounded-sm text-xs text-ink-600 transition-colors text-left"
            @click="handleSend(suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>
      </div>

      <!-- Chat messages -->
      <div
        v-for="(msg, i) in messages"
        :key="i"
        :class="[
          'rounded-sm px-3 py-2.5 text-sm max-w-[85%]',
          msg.role === 'user'
            ? 'bg-ink-900 text-ink-100 ml-auto'
            : 'bg-white text-ink-700 border border-ink-100',
        ]"
      >
        <div v-if="msg.role === 'assistant'" class="prose prose-sm prose-stone leading-relaxed" v-html="formatMessage(msg.content)" />
        <p v-else class="leading-relaxed">{{ msg.content }}</p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="bg-white border border-ink-100 rounded-sm px-3 py-2.5 text-sm max-w-[85%]">
        <div class="flex items-center gap-2">
          <div class="flex gap-1">
            <span class="w-1.5 h-1.5 bg-ink-300 rounded-full animate-bounce" style="animation-delay: 0ms" />
            <span class="w-1.5 h-1.5 bg-ink-300 rounded-full animate-bounce" style="animation-delay: 150ms" />
            <span class="w-1.5 h-1.5 bg-ink-300 rounded-full animate-bounce" style="animation-delay: 300ms" />
          </div>
          <span class="text-[10px] text-ink-400">Recherche en cours...</span>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="border-t border-ink-200 p-3 flex-shrink-0 bg-white">
      <form class="flex gap-2" @submit.prevent="handleSend(input)">
        <input
          v-model="input"
          type="text"
          placeholder="Posez votre question..."
          class="flex-1 px-3 py-2 rounded-sm border border-ink-200 text-sm text-ink-800 placeholder-ink-400 focus:border-ink-400 outline-none transition-colors"
          :disabled="isLoading"
        />
        <button
          type="submit"
          :disabled="isLoading || !input.trim()"
          class="px-3 py-2 bg-ink-900 text-ink-100 rounded-sm text-sm hover:bg-ink-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </form>
      <p class="text-[9px] text-ink-300 mt-1.5 text-center tracking-wide uppercase">
        Claude Opus (Anthropic) &middot; data.gouv.fr MCP
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  inline?: boolean
}>()

const { messages, isLoading, input, suggestions, sendMessage } = useChat()

const messagesEl = ref<HTMLElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
}

function handleSend(text: string) {
  sendMessage(text)
  scrollToBottom()
  // Also scroll after response arrives
  watch(isLoading, (loading) => {
    if (!loading) scrollToBottom()
  }, { once: true })
}

function formatMessage(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
}
</script>
