# Chat Generating Status Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add breathing-dot + phase-text indicators to ChatTopBar and MessageList bottom so users can see agent working status even when sidebar is collapsed.

**Architecture:** A new composable `useGeneratingPhase()` combines session store + stream store to derive the current generating phase. A shared `GeneratingIndicator.vue` component renders the animated dot + text. ChatPage wires both together via props.

**Tech Stack:** Vue 3, Pinia, TypeScript, vue-i18n, CSS animations

---

### Task 1: Add i18n Keys

**Files:**
- Modify: `src/renderer/src/i18n/en-US/chat.json:357` (before closing `}`)
- Modify: `src/renderer/src/i18n/zh-CN/chat.json:357` (before closing `}`)

- [ ] **Step 1: Add generatingPhase keys to en-US/chat.json**

Insert before the final `}` (after the `inlineSearch` block closing `}`):

```json
  },
  "generatingPhase": {
    "preparing": "Preparing...",
    "thinking": "Thinking...",
    "toolCalling": "Calling tools...",
    "searching": "Searching...",
    "generating": "Generating...",
    "working": "Working..."
  }
}
```

The existing line 357 (`"inlineSearch"` block's closing `}`) gets a comma appended, and the new block follows.

- [ ] **Step 2: Add generatingPhase keys to zh-CN/chat.json**

Same position, Chinese translations:

```json
  },
  "generatingPhase": {
    "preparing": "正在准备...",
    "thinking": "正在思考...",
    "toolCalling": "正在执行工具...",
    "searching": "正在搜索...",
    "generating": "正在生成...",
    "working": "正在工作..."
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/i18n/en-US/chat.json src/renderer/src/i18n/zh-CN/chat.json
git commit -m "feat: add i18n keys for generating phase indicator"
```

---

### Task 2: Create useGeneratingPhase Composable

**Files:**
- Create: `src/renderer/src/composables/useGeneratingPhase.ts`
- Create: `test/renderer/composables/useGeneratingPhase.test.ts`

- [ ] **Step 1: Write the test**

Create `test/renderer/composables/useGeneratingPhase.test.ts`:

```ts
import { ref, computed, nextTick } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSessionStatus = ref<string>('none')
const mockIsStreaming = ref(false)
const mockStreamingBlocks = ref<{ type: string }[]>([])

vi.mock('@/stores/ui/session', () => ({
  useSessionStore: () => ({
    activeSession: computed(() => ({ status: mockSessionStatus.value }))
  })
}))

vi.mock('@/stores/ui/stream', () => ({
  useStreamStateStore: () => ({
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
    mockStreamingBlocks.value = [
      { type: 'reasoning_content' },
      { type: 'content' }
    ]
    await nextTick()
    const { generatingPhase } = useGeneratingPhase()
    expect(generatingPhase.value).toBe('generating')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:renderer -- --run test/renderer/composables/useGeneratingPhase.test.ts`
Expected: FAIL — module `@/composables/useGeneratingPhase` not found.

- [ ] **Step 3: Create the composable**

Create `src/renderer/src/composables/useGeneratingPhase.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:renderer -- --run test/renderer/composables/useGeneratingPhase.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/composables/useGeneratingPhase.ts test/renderer/composables/useGeneratingPhase.test.ts
git commit -m "feat: add useGeneratingPhase composable"
```

---

### Task 3: Create GeneratingIndicator Component

**Files:**
- Create: `src/renderer/src/components/chat/GeneratingIndicator.vue`

- [ ] **Step 1: Create the component**

Create `src/renderer/src/components/chat/GeneratingIndicator.vue`:

```vue
<template>
  <div class="generating-indicator">
    <span class="generating-dot" />
    <span class="generating-text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  text: string
}>()
</script>

<style scoped>
.generating-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.generating-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: hsl(var(--primary));
  animation: generating-breathe 2s ease-in-out infinite;
}

.generating-text {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  animation: generating-breathe 2s ease-in-out infinite;
}

@keyframes generating-breathe {
  0%,
  100% {
    opacity: 0.4;
  }

  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .generating-dot,
  .generating-text {
    animation: none;
    opacity: 0.7;
  }
}
</style>
```

Note on CSS: uses `hsl(var(--primary))` and `hsl(var(--muted-foreground))` which are the project's existing shadcn/tailwind CSS variable conventions (see ChatTopBar's use of `text-muted-foreground`, `bg-background/60`, etc.). The `@keyframes` name is prefixed `generating-` to avoid collision with the existing `compaction-breathe` in MessageList.

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/chat/GeneratingIndicator.vue
git commit -m "feat: add GeneratingIndicator component"
```

---

### Task 4: Wire Indicator into ChatTopBar

**Files:**
- Modify: `src/renderer/src/components/chat/ChatTopBar.vue:24` (after `<h2>` title)
- Modify: `src/renderer/src/components/chat/ChatTopBar.vue:197-198` (script imports)
- Modify: `src/renderer/src/components/chat/ChatTopBar.vue:227-233` (props)

- [ ] **Step 1: Add props to ChatTopBar**

In `ChatTopBar.vue`, change the props definition (line 227-233) from:

```ts
const props = defineProps<{
  sessionId: string
  title: string
  project: string
  isReadOnly?: boolean
  isTemporary?: boolean
}>()
```

to:

```ts
const props = defineProps<{
  sessionId: string
  title: string
  project: string
  isReadOnly?: boolean
  isTemporary?: boolean
  isGenerating?: boolean
  generatingPhaseText?: string
}>()
```

- [ ] **Step 2: Add import for GeneratingIndicator**

In the `<script setup>` section (around line 200, after the Icon import), add:

```ts
import GeneratingIndicator from '@/components/chat/GeneratingIndicator.vue'
```

- [ ] **Step 3: Add indicator to template**

After the `<h2>` title tag (line 24), and after the temporary badge `<span>` (line 30), insert:

```vue
      <GeneratingIndicator
        v-if="isGenerating && generatingPhaseText"
        :text="generatingPhaseText"
        class="shrink-0"
      />
```

This goes inside the left-side `<div class="flex items-center gap-2 min-w-0">` container, after the temporary badge `</span>` (line 30) and before the closing `</div>` (line 31).

- [ ] **Step 4: Run typecheck**

Run: `pnpm run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/chat/ChatTopBar.vue
git commit -m "feat: show generating indicator in ChatTopBar"
```

---

### Task 5: Wire Indicator into MessageList

**Files:**
- Modify: `src/renderer/src/components/chat/MessageList.vue:46-54` (template, after rate-limit block)
- Modify: `src/renderer/src/components/chat/MessageList.vue:58` (script imports)
- Modify: `src/renderer/src/components/chat/MessageList.vue:75-93` (props)

- [ ] **Step 1: Add generatingPhaseText prop**

In `MessageList.vue`, update the props (line 75-93). Add `generatingPhaseText` to the interface:

```ts
const props = withDefaults(
  defineProps<{
    messages: MessageListItem[]
    conversationId?: string
    ephemeralRateLimitBlock?: DisplayAssistantMessageBlock | null
    ephemeralRateLimitMessageId?: string | null
    isGenerating?: boolean
    generatingPhaseText?: string
    traceMessageIds?: string[]
    isReadOnly?: boolean
  }>(),
  {
    conversationId: '',
    ephemeralRateLimitBlock: null,
    ephemeralRateLimitMessageId: null,
    isGenerating: false,
    generatingPhaseText: '',
    traceMessageIds: () => [],
    isReadOnly: false
  }
)
```

- [ ] **Step 2: Add import for GeneratingIndicator**

After the existing import of `useMessageCapture` (line 65), add:

```ts
import GeneratingIndicator from '@/components/chat/GeneratingIndicator.vue'
```

- [ ] **Step 3: Add indicator to template**

After the ephemeral rate-limit block `</div>` (line 53), and before the closing `</div>` of the message container (line 54), insert:

```vue
      <GeneratingIndicator
        v-if="isGenerating && generatingPhaseText"
        :text="generatingPhaseText"
        class="pl-11 pt-2"
      />
```

The `pl-11` matches the left padding of the rate-limit block for consistent alignment. `pt-2` adds a small gap below the last message.

- [ ] **Step 4: Run typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/chat/MessageList.vue
git commit -m "feat: show generating indicator at MessageList bottom"
```

---

### Task 6: Wire ChatPage to Use Composable and Pass Props

**Files:**
- Modify: `src/renderer/src/pages/ChatPage.vue:109` (imports)
- Modify: `src/renderer/src/pages/ChatPage.vue:167-169` (replace isGenerating)
- Modify: `src/renderer/src/pages/ChatPage.vue:9-16` (ChatTopBar template)
- Modify: `src/renderer/src/pages/ChatPage.vue:32-46` (MessageList template)

- [ ] **Step 1: Add import for useGeneratingPhase**

In `ChatPage.vue`, add after the `usePresenter` import (line 132):

```ts
import { useGeneratingPhase } from '@/composables/useGeneratingPhase'
```

- [ ] **Step 2: Replace inline isGenerating with composable**

Replace the existing `isGenerating` computed (lines 167-169):

```ts
const isGenerating = computed(
  () => sessionStore.activeSession?.status === 'working' || messageStore.isStreaming
)
```

with:

```ts
const { isGenerating, generatingPhaseText } = useGeneratingPhase()
```

- [ ] **Step 3: Pass new props to ChatTopBar**

Update the ChatTopBar usage in template (lines 9-16). Add `:is-generating` and `:generating-phase-text`:

```vue
        <ChatTopBar
          class="chat-capture-hide"
          :session-id="props.sessionId"
          :title="sessionTitle"
          :project="sessionProject"
          :is-read-only="isReadOnlySession"
          :is-temporary="isTemporarySession"
          :is-generating="isGenerating"
          :generating-phase-text="generatingPhaseText"
        />
```

- [ ] **Step 4: Pass generatingPhaseText to MessageList**

Update the MessageList usage in template (lines 32-46). Add `:generating-phase-text`:

```vue
          <MessageList
            :messages="displayMessages"
            :conversation-id="props.sessionId"
            :ephemeral-rate-limit-block="ephemeralRateLimitBlock"
            :ephemeral-rate-limit-message-id="ephemeralRateLimitMessageId"
            :is-generating="isGenerating"
            :generating-phase-text="generatingPhaseText"
            :trace-message-ids="traceMessageIds"
            :is-read-only="isReadOnlySession"
            @retry="onMessageRetry"
            @delete="onMessageDelete"
            @fork="onMessageFork"
            @continue="onMessageContinue"
            @trace="onMessageTrace"
            @edit-save="onMessageEditSave"
          />
```

- [ ] **Step 5: Run typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/pages/ChatPage.vue
git commit -m "feat: wire generating phase to ChatTopBar and MessageList"
```

---

### Task 7: Update MessageList Test

**Files:**
- Modify: `test/renderer/components/MessageList.test.ts`

- [ ] **Step 1: Add mock for GeneratingIndicator**

After the existing `vi.mock` for `MessageBlockAction.vue` (around line 54), add:

```ts
vi.mock('@/components/chat/GeneratingIndicator.vue', () => ({
  default: defineComponent({
    name: 'GeneratingIndicator',
    props: {
      text: {
        type: String,
        required: true
      }
    },
    template: '<div class="generating-indicator-stub">{{ text }}</div>'
  })
}))
```

- [ ] **Step 2: Add test for generating indicator visibility**

Add at the end of the `describe('MessageList', ...)` block (before the final `}`):

```ts
  it('shows generating indicator when isGenerating and generatingPhaseText are set', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [createMessage('u1', 'user', 1)],
        isGenerating: true,
        generatingPhaseText: '正在思考...'
      }
    })

    expect(wrapper.find('.generating-indicator-stub').exists()).toBe(true)
    expect(wrapper.find('.generating-indicator-stub').text()).toBe('正在思考...')
  })

  it('hides generating indicator when not generating', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [createMessage('u1', 'user', 1)],
        isGenerating: false,
        generatingPhaseText: ''
      }
    })

    expect(wrapper.find('.generating-indicator-stub').exists()).toBe(false)
  })
```

- [ ] **Step 3: Run MessageList tests**

Run: `pnpm test:renderer -- --run test/renderer/components/MessageList.test.ts`
Expected: All tests PASS (existing + 2 new).

- [ ] **Step 4: Commit**

```bash
git add test/renderer/components/MessageList.test.ts
git commit -m "test: add generating indicator tests to MessageList"
```

---

### Task 8: Format, Lint, i18n, and Final Verification

**Files:** All modified files

- [ ] **Step 1: Run formatter**

Run: `pnpm run format`
Expected: Files formatted (or no changes needed).

- [ ] **Step 2: Run i18n check**

Run: `pnpm run i18n`
Expected: No missing keys.

- [ ] **Step 3: Run linter**

Run: `pnpm run lint`
Expected: No errors.

- [ ] **Step 4: Run typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 5: Run all renderer tests**

Run: `pnpm test:renderer`
Expected: All tests PASS.

- [ ] **Step 6: Commit any format/lint fixes**

```bash
git add -u
git commit -m "style: format and lint fixes for generating indicator"
```

(Skip if no changes from formatting.)
