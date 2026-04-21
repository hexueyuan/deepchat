import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/ui/session'
import { useStreamStateStore } from '@/stores/ui/stream'

export function useGeneratingPhase() {
  const sessionStore = useSessionStore()
  const streamStore = useStreamStateStore()
  const { t } = useI18n()

  const isGenerating = computed(
    () => sessionStore.activeSession?.status === 'working' || streamStore.isStreaming
  )

  const generatingPhase = computed<string | null>(() => {
    if (!isGenerating.value) return null
    const blocks = streamStore.streamingBlocks
    if (blocks.length === 0) return 'preparing'
    const last = blocks[blocks.length - 1]
    switch (last.type) {
      case 'reasoning_content':
        return 'thinking'
      case 'tool_call':
        return 'toolCalling'
      case 'search':
        return 'searching'
      case 'content':
        return 'generating'
      default:
        return 'working'
    }
  })

  const generatingPhaseText = computed(() => {
    if (!generatingPhase.value) return ''
    return t(`chat.generatingPhase.${generatingPhase.value}`)
  })

  return { isGenerating, generatingPhase, generatingPhaseText }
}
