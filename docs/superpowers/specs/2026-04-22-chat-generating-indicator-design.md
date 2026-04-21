# Chat Page Generating Status Indicator

## Problem

When the sidebar is collapsed, there is no visual feedback on the main chat page indicating whether the agent is actively working. The sidebar shows a shimmer animation on session titles for `working` status, but this is invisible when collapsed.

## Solution

Add a "breathing dot + phase text" indicator to two locations on the main chat page:

1. **ChatTopBar** — breathing dot + phase text next to the session title
2. **MessageList bottom** — breathing dot + phase text below the last message

Both indicators share the same visual style (consistent with each other) and the same phase data source.

## Phase Detection

Derive the current generating phase from existing `streamingBlocks` in the stream store. No backend changes needed.

| Condition | Phase Key | en-US | zh-CN |
|---|---|---|---|
| session working + no blocks | `preparing` | Preparing... | 正在准备... |
| latest block type = `reasoning_content` | `thinking` | Thinking... | 正在思考... |
| latest block type = `tool_call` | `toolCalling` | Calling tools... | 正在执行工具... |
| latest block type = `search` | `searching` | Searching... | 正在搜索... |
| latest block type = `content` | `generating` | Generating... | 正在生成... |
| other block types | `working` | Working... | 正在工作... |

### Implementation

**Decision: composable approach.** Create a composable `useGeneratingPhase()` that combines both stores (stream store for block data, session store for working status):

```ts
// src/renderer/src/composables/useGeneratingPhase.ts
export function useGeneratingPhase() {
  const sessionStore = useSessionStore()
  const streamStore = useStreamStateStore()

  const isGenerating = computed(
    () => sessionStore.activeSession?.status === 'working' || streamStore.isStreaming
  )

  const generatingPhase = computed<string | null>(() => {
    if (!isGenerating.value) return null
    const blocks = streamStore.streamingBlocks
    if (blocks.length === 0) return 'preparing'
    const last = blocks[blocks.length - 1]
    switch (last.type) {
      case 'reasoning_content': return 'thinking'
      case 'tool_call': return 'toolCalling'
      case 'search': return 'searching'
      case 'content': return 'generating'
      default: return 'working'
    }
  })

  const generatingPhaseText = computed(() => {
    if (!generatingPhase.value) return ''
    return t(`chat.generatingPhase.${generatingPhase.value}`)
  })

  return { isGenerating, generatingPhase, generatingPhaseText }
}
```

This replaces the existing inline `isGenerating` computed in ChatPage.vue.

## ChatTopBar Changes

**File:** `src/renderer/src/components/chat/ChatTopBar.vue`

Add two props:

```ts
isGenerating?: boolean
generatingPhaseText?: string
```

Template: After the title `<h2>`, insert a conditional indicator:

```html
<div v-if="isGenerating" class="generating-indicator">
  <span class="generating-dot" />
  <span class="generating-text">{{ generatingPhaseText }}</span>
</div>
```

CSS: breathing animation via `@keyframes breathe` controlling opacity between 0.4 and 1.0, period 2s ease-in-out.

## MessageList Bottom Indicator

**File:** `src/renderer/src/components/chat/MessageList.vue`

Add two props:

```ts
generatingPhaseText?: string
// isGenerating already exists as a prop
```

Template: After the `v-for` message loop (and after the ephemeral rate-limit block), add:

```html
<div v-if="isGenerating" class="generating-indicator">
  <span class="generating-dot" />
  <span class="generating-text">{{ generatingPhaseText }}</span>
</div>
```

Same CSS as ChatTopBar for visual consistency. Consider extracting a shared `GeneratingIndicator.vue` component if the markup is identical (likely).

## Shared Component

Extract `GeneratingIndicator.vue`:

```
src/renderer/src/components/chat/GeneratingIndicator.vue
```

Props: `text: string`

Template:
```html
<div class="generating-indicator">
  <span class="generating-dot" />
  <span class="generating-text">{{ text }}</span>
</div>
```

Scoped CSS:
```css
.generating-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.generating-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary, #6366f1);
  animation: breathe 2s ease-in-out infinite;
}

.generating-text {
  font-size: 12px;
  color: var(--text-secondary);
  animation: breathe 2s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .generating-dot,
  .generating-text {
    animation: none;
    opacity: 0.7;
  }
}
```

## ChatPage Wiring

In `ChatPage.vue`:

1. Replace the inline `isGenerating` computed with `useGeneratingPhase()`.
2. Pass new props to ChatTopBar: `:is-generating`, `:generating-phase-text`.
3. Pass `generatingPhaseText` to MessageList (it already receives `isGenerating`).

## i18n Keys

Add to `chat.json` in both locales:

**en-US:**
```json
"generatingPhase": {
  "preparing": "Preparing...",
  "thinking": "Thinking...",
  "toolCalling": "Calling tools...",
  "searching": "Searching...",
  "generating": "Generating...",
  "working": "Working..."
}
```

**zh-CN:**
```json
"generatingPhase": {
  "preparing": "正在准备...",
  "thinking": "正在思考...",
  "toolCalling": "正在执行工具...",
  "searching": "正在搜索...",
  "generating": "正在生成...",
  "working": "正在工作..."
}
```

## Files Changed

| File | Change |
|---|---|
| `src/renderer/src/composables/useGeneratingPhase.ts` | **New** — composable combining session + stream stores |
| `src/renderer/src/components/chat/GeneratingIndicator.vue` | **New** — shared indicator component |
| `src/renderer/src/components/chat/ChatTopBar.vue` | Add props, render indicator |
| `src/renderer/src/components/chat/MessageList.vue` | Add prop, render indicator at bottom |
| `src/renderer/src/pages/ChatPage.vue` | Use composable, wire new props |
| `src/renderer/src/i18n/en-US/chat.json` | Add `generatingPhase` keys |
| `src/renderer/src/i18n/zh-CN/chat.json` | Add `generatingPhase` keys |

## Accessibility

- `prefers-reduced-motion`: disable animation, show static indicator at 0.7 opacity.
- Indicator dot + text use sufficient contrast against the background.

## Display Behavior

- Both indicators show whenever `isGenerating` is true (session working OR streaming), regardless of whether streaming content is already visible.
- Both indicators hide immediately when generation completes (session idle AND not streaming).
- Phase text updates reactively as new blocks arrive.
