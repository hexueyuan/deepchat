import { ref, reactive, computed, nextTick } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSessionStatus = ref<string>('none')
const mockIsStreaming = ref(false)
const mockStreamingBlocks = ref<{ type: string }[]>([])

vi.mock('@/stores/ui/session', () => ({
  useSessionStore: () =>
    reactive({
      activeSession: computed(() => ({ status: mockSessionStatus.value }))
    })
}))

vi.mock('@/stores/ui/stream', () => ({
  useStreamStateStore: () =>
    reactive({
      isStreaming: mockIsStreaming,
      streamingBlocks: mockStreamingBlocks
    })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

import { useGeneratingPhase } from '@/composables/useGeneratingPhase'

describe('useGeneratingPhase', () => {
  beforeEach(() => {
    mockSessionStatus.value = 'none'
    mockIsStreaming.value = false
    mockStreamingBlocks.value = []
  })

  it('returns null phase when not generating', () => {
    const { isGenerating, generatingPhase } = useGeneratingPhase()
    expect(isGenerating.value).toBe(false)
    expect(generatingPhase.value).toBeNull()
  })

  it('returns preparing when session working but no blocks', async () => {
    mockSessionStatus.value = 'working'
    await nextTick()
    const { isGenerating, generatingPhase, generatingPhaseText } = useGeneratingPhase()
    expect(isGenerating.value).toBe(true)
    expect(generatingPhase.value).toBe('preparing')
    expect(generatingPhaseText.value).toBe('chat.generatingPhase.preparing')
  })

  it('returns thinking for reasoning_content blocks', async () => {
    mockIsStreaming.value = true
    mockStreamingBlocks.value = [{ type: 'reasoning_content' }]
    await nextTick()
    const { generatingPhase } = useGeneratingPhase()
    expect(generatingPhase.value).toBe('thinking')
  })

  it('returns toolCalling for tool_call blocks', async () => {
    mockIsStreaming.value = true
    mockStreamingBlocks.value = [{ type: 'content' }, { type: 'tool_call' }]
    await nextTick()
    const { generatingPhase } = useGeneratingPhase()
    expect(generatingPhase.value).toBe('toolCalling')
  })

  it('returns searching for search blocks', async () => {
    mockIsStreaming.value = true
    mockStreamingBlocks.value = [{ type: 'search' }]
    await nextTick()
    const { generatingPhase } = useGeneratingPhase()
    expect(generatingPhase.value).toBe('searching')
  })

  it('returns generating for content blocks', async () => {
    mockIsStreaming.value = true
    mockStreamingBlocks.value = [{ type: 'content' }]
    await nextTick()
    const { generatingPhase } = useGeneratingPhase()
    expect(generatingPhase.value).toBe('generating')
  })

  it('returns working for unknown block types', async () => {
    mockIsStreaming.value = true
    mockStreamingBlocks.value = [{ type: 'image' }]
    await nextTick()
    const { generatingPhase } = useGeneratingPhase()
    expect(generatingPhase.value).toBe('working')
  })

  it('uses last block type when multiple blocks exist', async () => {
    mockIsStreaming.value = true
    mockStreamingBlocks.value = [{ type: 'reasoning_content' }, { type: 'content' }]
    await nextTick()
    const { generatingPhase } = useGeneratingPhase()
    expect(generatingPhase.value).toBe('generating')
  })
})
