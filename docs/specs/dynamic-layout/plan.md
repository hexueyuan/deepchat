# Dynamic Layout with Responsive Font Scaling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement percentage-based chat/workspace split with CSS Container Query font scaling.

**Architecture:** Replace fixed-pixel sidepanel width with a persisted ratio (0-1). Chat and workspace containers declare `container-type: inline-size`; font sizes use `clamp()` + `cqi` units scaled by the global `--dc-font-scale` variable. Chat-only mode widens max-width to 1280px.

**Tech Stack:** Vue 3 + Pinia, Tailwind CSS v4, CSS Container Queries, `@vueuse/core` useStorage.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/renderer/src/stores/ui/sidepanel.ts` | Modify | Replace px width with ratio, clamp ratio, persist |
| `src/renderer/src/components/sidepanel/ChatSidePanel.vue` | Modify | Ratio-based drag, container-type on workspace |
| `src/renderer/src/views/ChatTabView.vue` | Modify | Percentage flex split, container-type on chat area |
| `src/renderer/src/pages/ChatPage.vue` | Modify | Conditional max-width for input area |
| `src/renderer/src/components/chat/MessageList.vue` | Modify | Conditional max-width for messages |
| `src/renderer/src/stores/uiSettingsStore.ts` | Modify | Sync `--dc-font-scale` CSS variable from font level |
| `src/renderer/src/App.vue` | Modify | Apply `--dc-font-scale` in syncAppearanceClasses |
| `src/renderer/src/assets/style.css` | Modify | Add container query font rules |
| `test/renderer/stores/sidepanel.test.ts` | Modify | Update tests for ratio-based API |

---

### Task 1: Refactor sidepanel store from pixel width to ratio

**Files:**
- Modify: `src/renderer/src/stores/ui/sidepanel.ts`
- Modify: `test/renderer/stores/sidepanel.test.ts`

- [ ] **Step 1: Write failing tests for ratio-based store**

Replace the existing test file content:

```ts
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

describe('sidepanel store', () => {
  const setupSidepanelStore = async (innerWidth: number) => {
    vi.resetModules()
    vi.doUnmock('pinia')

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: innerWidth
    })

    const storageRef = ref(0.65)

    vi.doMock('@vueuse/core', () => ({
      useStorage: () => storageRef
    }))

    const { createPinia, setActivePinia } = await vi.importActual<typeof import('pinia')>('pinia')
    setActivePinia(createPinia())

    const { useSidepanelStore } = await import('@/stores/ui/sidepanel')
    return {
      store: useSidepanelStore(),
      storageRef
    }
  }

  it('exposes ratio instead of pixel width', async () => {
    const { store } = await setupSidepanelStore(1200)
    expect(store.ratio).toBeCloseTo(0.65)
  })

  it('clamps ratio to min 0.4 (chat min 60% → workspace max)', async () => {
    const { store, storageRef } = await setupSidepanelStore(1200)
    store.setRatio(0.95)
    expect(storageRef.value).toBe(0.8)
    expect(store.ratio).toBe(0.8)
  })

  it('clamps ratio to max (workspace min 30%)', async () => {
    const { store, storageRef } = await setupSidepanelStore(1200)
    store.setRatio(0.1)
    expect(storageRef.value).toBe(0.3)
    expect(store.ratio).toBe(0.3)
  })

  it('returns default ratio 0.65', async () => {
    const { store } = await setupSidepanelStore(1200)
    expect(store.ratio).toBeCloseTo(0.65)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:main -- --run test/renderer/stores/sidepanel.test.ts`
Expected: FAIL — `store.ratio` and `store.setRatio` do not exist yet.

- [ ] **Step 3: Implement ratio-based store**

In `src/renderer/src/stores/ui/sidepanel.ts`, replace the width-related logic:

1. Replace `width` storage:
```ts
// Old
const width = useStorage('chat-sidepanel-width', 520)
```
```ts
// New
const ratio = useStorage('chat-sidepanel-ratio', 0.65)
```

2. Replace `clampWidth` with `clampRatio`:
```ts
// Old
const resolveMaxWidth = () => { ... }
const clampWidth = (nextWidth: number) => { ... }
```
```ts
// New
const RATIO_MIN = 0.3  // workspace min 30%
const RATIO_MAX = 0.8  // workspace max 80%

const clampRatio = (nextRatio: number) => {
  const value = Number(nextRatio)
  if (!Number.isFinite(value)) return 0.65
  return Math.min(RATIO_MAX, Math.max(RATIO_MIN, Math.round(value * 100) / 100))
}
```

3. Replace `normalizedWidth` with `normalizedRatio`:
```ts
// Old
const normalizedWidth = computed(() => clampWidth(Number(width.value)))
```
```ts
// New
const normalizedRatio = computed(() => clampRatio(Number(ratio.value)))
```

4. Replace `setWidth` with `setRatio`:
```ts
// Old
const setWidth = (nextWidth: number) => { width.value = clampWidth(nextWidth) }
```
```ts
// New
const setRatio = (nextRatio: number) => { ratio.value = clampRatio(nextRatio) }
```

5. Remove the `viewportWidth` ref and its `window.resize` listener (no longer needed for ratio clamping).

6. Update exports:
```ts
// Old
return { ..., width: normalizedWidth, setWidth, ... }
```
```ts
// New
return { ..., ratio: normalizedRatio, setRatio, ... }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:main -- --run test/renderer/stores/sidepanel.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/stores/ui/sidepanel.ts test/renderer/stores/sidepanel.test.ts
git commit -m "refactor: sidepanel store from pixel width to ratio"
```

---

### Task 2: Update ChatSidePanel drag logic to ratio-based

**Files:**
- Modify: `src/renderer/src/components/sidepanel/ChatSidePanel.vue`

- [ ] **Step 1: Update panelWidth computed and template binding**

In the `<template>`, change the outer div from pixel-based to flex-based. The actual flex value will be controlled by the parent (`ChatTabView`), so this component just needs to remove the inline `width` style:

Replace the outer div (line 2-5):
```html
<!-- Old -->
<div
  class="relative h-full min-h-0 shrink-0 overflow-hidden transition-[width] duration-200 ease-out"
  :style="{ width: `${panelWidth}px` }"
>
```
```html
<!-- New -->
<div
  class="relative h-full min-h-0 shrink-0 overflow-hidden transition-[flex] duration-200 ease-out"
  :style="{ flex: panelFlex }"
>
```

- [ ] **Step 2: Update script — panelFlex computed and drag logic**

In `<script setup>`:

Replace `panelWidth` computed:
```ts
// Old
const panelWidth = computed(() => (shouldShow.value ? sidepanelStore.width : 0))
```
```ts
// New
const panelFlex = computed(() => {
  if (!shouldShow.value) return '0 0 0px'
  const pct = sidepanelStore.ratio * 100
  return `${pct} ${pct} 0%`
})
```

Replace `startResize` function (lines 105-119):
```ts
// Old
const startResize = (event: MouseEvent) => {
  const startX = event.clientX
  const startWidth = sidepanelStore.width
  const onMouseMove = (moveEvent: MouseEvent) => {
    sidepanelStore.setWidth(startWidth - (moveEvent.clientX - startX))
  }
  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}
```
```ts
// New
const startResize = (event: MouseEvent) => {
  const startX = event.clientX
  const startRatio = sidepanelStore.ratio
  const containerWidth = (event.currentTarget as HTMLElement).closest('.flex.flex-row')?.clientWidth ?? window.innerWidth

  const onMouseMove = (moveEvent: MouseEvent) => {
    const deltaPx = startX - moveEvent.clientX
    const deltaRatio = deltaPx / containerWidth
    sidepanelStore.setRatio(startRatio + deltaRatio)
  }

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}
```

- [ ] **Step 3: Add container-type to workspace content area**

Add `style="container-type: inline-size"` to the `<aside>` element (line 8):
```html
<!-- Old -->
<aside
  v-if="props.sessionId"
  class="absolute inset-y-0 right-0 flex h-full min-h-0 w-full flex-col border-l bg-background shadow-lg transition-all duration-200 ease-out"
```
```html
<!-- New -->
<aside
  v-if="props.sessionId"
  style="container-type: inline-size"
  class="absolute inset-y-0 right-0 flex h-full min-h-0 w-full flex-col border-l bg-background shadow-lg transition-all duration-200 ease-out"
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `pnpm run typecheck:web`
Expected: PASS (no type errors)

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/sidepanel/ChatSidePanel.vue
git commit -m "refactor: ChatSidePanel drag logic to ratio-based"
```

---

### Task 3: Update ChatTabView to percentage-based flex split

**Files:**
- Modify: `src/renderer/src/views/ChatTabView.vue`

- [ ] **Step 1: Add sidepanelStore import**

In `<script setup>`, add:
```ts
import { useSidepanelStore } from '@/stores/ui/sidepanel'

const sidepanelStore = useSidepanelStore()
```

- [ ] **Step 2: Add computed for chat flex value**

```ts
const chatFlex = computed(() => {
  if (!sidepanelStore.open) return '1 1 0%'
  const chatPct = (1 - sidepanelStore.ratio) * 100
  return `${chatPct} ${chatPct} 0%`
})
```

- [ ] **Step 3: Update template — chat area flex and container-type**

Replace the chat area div (line 3-5):
```html
<!-- Old -->
<div
  class="relative flex h-full min-h-0 min-w-0 w-0 flex-1 transition-[width] duration-200 ease-out"
>
```
```html
<!-- New -->
<div
  class="relative flex h-full min-h-0 min-w-0 transition-[flex] duration-200 ease-out"
  style="container-type: inline-size"
  :style="{ flex: chatFlex }"
>
```

Note: removed `w-0 flex-1` since we now control flex via inline style.

- [ ] **Step 4: Verify no TypeScript errors**

Run: `pnpm run typecheck:web`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/views/ChatTabView.vue
git commit -m "feat: ChatTabView percentage-based flex split with container-type"
```

---

### Task 4: Conditional max-width for MessageList

**Files:**
- Modify: `src/renderer/src/components/chat/MessageList.vue`

- [ ] **Step 1: Add sidepanelStore and computed max-width class**

In `<script setup>` section, add:
```ts
import { useSidepanelStore } from '@/stores/ui/sidepanel'

const sidepanelStore = useSidepanelStore()
const messageMaxWidthClass = computed(() => sidepanelStore.open ? '' : 'max-w-7xl')
```

(Note: `computed` should already be imported from vue in the existing imports.)

- [ ] **Step 2: Update template to use dynamic max-width**

Replace line 3:
```html
<!-- Old -->
<div class="mx-auto w-full max-w-5xl space-y-1 px-6 py-6">
```
```html
<!-- New -->
<div :class="['mx-auto w-full space-y-1 px-6 py-6', messageMaxWidthClass]">
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `pnpm run typecheck:web`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/chat/MessageList.vue
git commit -m "feat: conditional max-width in MessageList based on sidepanel state"
```

---

### Task 5: Conditional max-width for ChatPage input area

**Files:**
- Modify: `src/renderer/src/pages/ChatPage.vue`

- [ ] **Step 1: Add sidepanelStore and computed max-width classes**

In `<script setup>`, add:
```ts
import { useSidepanelStore } from '@/stores/ui/sidepanel'

const sidepanelStore = useSidepanelStore()
const contentMaxWidthClass = computed(() => sidepanelStore.open ? '' : 'max-w-5xl')
const inputMaxWidthClass = computed(() => sidepanelStore.open ? '' : 'max-w-4xl')
```

- [ ] **Step 2: Update ChatSearchBar wrapper max-width**

Replace line 18:
```html
<!-- Old -->
<div class="mx-auto flex w-full max-w-5xl justify-end">
```
```html
<!-- New -->
<div :class="['mx-auto flex w-full justify-end', contentMaxWidthClass]">
```

- [ ] **Step 3: Update input area wrapper max-width**

Replace line 55:
```html
<!-- Old -->
<div class="mx-auto flex w-full max-w-5xl min-w-0 flex-col items-center">
```
```html
<!-- New -->
<div :class="['mx-auto flex w-full min-w-0 flex-col items-center', contentMaxWidthClass]">
```

- [ ] **Step 4: Update ChatInputBox and ChatStatusBar max-width props**

Replace the ChatInputBox prop (line 79):
```html
<!-- Old -->
max-width-class="max-w-4xl"
```
```html
<!-- New -->
:max-width-class="inputMaxWidthClass"
```

Replace the ChatStatusBar prop (line 99):
```html
<!-- Old -->
<ChatStatusBar max-width-class="max-w-4xl" />
```
```html
<!-- New -->
<ChatStatusBar :max-width-class="inputMaxWidthClass" />
```

- [ ] **Step 5: Verify no TypeScript errors**

Run: `pnpm run typecheck:web`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/pages/ChatPage.vue
git commit -m "feat: conditional max-width in ChatPage input area"
```

---

### Task 6: Sync --dc-font-scale CSS variable from font level

**Files:**
- Modify: `src/renderer/src/App.vue`
- Modify: `src/renderer/src/stores/uiSettingsStore.ts`

- [ ] **Step 1: Add fontScale computed to uiSettingsStore**

In `src/renderer/src/stores/uiSettingsStore.ts`, add after `fontSizeClass` computed (around line 37):

```ts
const FONT_SCALE_VALUES = [0.875, 1, 1.125, 1.25, 1.5] // maps to text-sm..text-2xl

const fontScale = computed(
  () => FONT_SCALE_VALUES[fontSizeLevel.value] ?? FONT_SCALE_VALUES[DEFAULT_FONT_SIZE_LEVEL]
)
```

Add `fontScale` to the return statement:
```ts
return {
  ...,
  fontScale,
  ...
}
```

- [ ] **Step 2: Apply --dc-font-scale in App.vue syncAppearanceClasses**

In `src/renderer/src/App.vue`, modify the `syncAppearanceClasses` function (around line 73):

```ts
// Old
const syncAppearanceClasses = (themeName: string, fontSizeClass: string) => {
  if (typeof document === 'undefined') {
    return
  }

  for (const target of [document.documentElement, document.body]) {
    target.classList.remove('light', 'dark', 'system')
    target.classList.add(themeName)
    target.classList.remove('text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl')
    target.classList.add(fontSizeClass)
  }
}
```

```ts
// New
const syncAppearanceClasses = (themeName: string, fontSizeClass: string, fontScale: number) => {
  if (typeof document === 'undefined') {
    return
  }

  for (const target of [document.documentElement, document.body]) {
    target.classList.remove('light', 'dark', 'system')
    target.classList.add(themeName)
    target.classList.remove('text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl')
    target.classList.add(fontSizeClass)
  }

  document.documentElement.style.setProperty('--dc-font-scale', String(fontScale))
}
```

Update the watcher that calls it (around line 86):
```ts
// Old
watch(
  [() => themeStore.themeMode, () => themeStore.isDark, () => uiSettingsStore.fontSizeClass],
  ([themeMode, isDark, fontSizeClass]) => {
    const nextThemeName = resolveThemeName(themeMode, isDark)
    syncAppearanceClasses(nextThemeName, fontSizeClass)
    console.log('newTheme', nextThemeName)
  },
  { immediate: true }
)
```

```ts
// New
watch(
  [() => themeStore.themeMode, () => themeStore.isDark, () => uiSettingsStore.fontSizeClass, () => uiSettingsStore.fontScale],
  ([themeMode, isDark, fontSizeClass, fontScale]) => {
    const nextThemeName = resolveThemeName(themeMode, isDark)
    syncAppearanceClasses(nextThemeName, fontSizeClass, fontScale)
    console.log('newTheme', nextThemeName)
  },
  { immediate: true }
)
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `pnpm run typecheck:web`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/stores/uiSettingsStore.ts src/renderer/src/App.vue
git commit -m "feat: sync --dc-font-scale CSS variable from font level"
```

---

### Task 7: Add container query font rules in CSS

**Files:**
- Modify: `src/renderer/src/assets/style.css`

- [ ] **Step 1: Add container query font rules**

At the end of the `@layer base { ... }` block in `style.css`, add container query font rules. The existing file has `@layer base { @import 'markstream-vue/index.tailwind.css'; ... }` starting at line 15.

Add a new `@layer components` block after the existing `@layer base` block ends (find the closing `}` of `@layer base`):

```css
@layer components {
  .dc-container-font {
    font-size: calc(clamp(12px, 2.2cqi, 18px) * var(--dc-font-scale, 1));
    line-height: calc(clamp(18px, 3.2cqi, 28px) * var(--dc-font-scale, 1));
  }
}
```

- [ ] **Step 2: Verify CSS compiles**

Run: `pnpm run typecheck:web`
Expected: PASS (Tailwind processes the CSS without errors)

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/assets/style.css
git commit -m "feat: add container query font CSS class"
```

---

### Task 8: Apply container font class to chat and workspace areas

**Files:**
- Modify: `src/renderer/src/views/ChatTabView.vue`
- Modify: `src/renderer/src/components/sidepanel/ChatSidePanel.vue`

- [ ] **Step 1: Add dc-container-font to chat area in ChatTabView**

In `src/renderer/src/views/ChatTabView.vue`, add the `dc-container-font` class to the chat area div that already has `container-type: inline-size` (modified in Task 3):

```html
<!-- Current (from Task 3) -->
<div
  class="relative flex h-full min-h-0 min-w-0 transition-[flex] duration-200 ease-out"
  style="container-type: inline-size"
  :style="{ flex: chatFlex }"
>
```
```html
<!-- New -->
<div
  class="dc-container-font relative flex h-full min-h-0 min-w-0 transition-[flex] duration-200 ease-out"
  style="container-type: inline-size"
  :style="{ flex: chatFlex }"
>
```

- [ ] **Step 2: Add dc-container-font to workspace aside in ChatSidePanel**

In `src/renderer/src/components/sidepanel/ChatSidePanel.vue`, add `dc-container-font` to the `<aside>` element that already has `container-type: inline-size` (modified in Task 2):

```html
<!-- Current (from Task 2) -->
<aside
  v-if="props.sessionId"
  style="container-type: inline-size"
  class="absolute inset-y-0 right-0 flex h-full min-h-0 w-full flex-col border-l bg-background shadow-lg transition-all duration-200 ease-out"
```
```html
<!-- New -->
<aside
  v-if="props.sessionId"
  style="container-type: inline-size"
  class="dc-container-font absolute inset-y-0 right-0 flex h-full min-h-0 w-full flex-col border-l bg-background shadow-lg transition-all duration-200 ease-out"
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `pnpm run typecheck:web`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/views/ChatTabView.vue src/renderer/src/components/sidepanel/ChatSidePanel.vue
git commit -m "feat: apply container font scaling to chat and workspace areas"
```

---

### Task 9: Update existing sidepanelAndArtifact test

**Files:**
- Modify: `test/renderer/stores/sidepanelAndArtifact.test.ts`

- [ ] **Step 1: Check if sidepanelAndArtifact test references `width` or `setWidth`**

Read `test/renderer/stores/sidepanelAndArtifact.test.ts` and check if it references the removed `width`/`setWidth` API. If it does, update those references to use `ratio`/`setRatio`. If it only tests artifact/session state (not width), no changes needed.

- [ ] **Step 2: Run full test suite**

Run: `pnpm test -- --run`
Expected: ALL PASS

- [ ] **Step 3: Commit if changes were needed**

```bash
git add test/renderer/stores/sidepanelAndArtifact.test.ts
git commit -m "test: update sidepanelAndArtifact test for ratio API"
```

---

### Task 10: Run format, i18n, lint, and final verification

**Files:** All modified files

- [ ] **Step 1: Run formatter**

Run: `pnpm run format`

- [ ] **Step 2: Run i18n check**

Run: `pnpm run i18n`

- [ ] **Step 3: Run linter**

Run: `pnpm run lint`

- [ ] **Step 4: Run type check**

Run: `pnpm run typecheck`

- [ ] **Step 5: Run full test suite**

Run: `pnpm test -- --run`

- [ ] **Step 6: Fix any issues found and commit**

```bash
git add -A
git commit -m "style: format and lint fixes for dynamic layout"
```

- [ ] **Step 7: Manual verification**

Run: `pnpm run dev`

Verify:
1. Chat-only mode: messages display with wider max-width (~1280px)
2. Open workspace (Cmd+E or click): smooth transition to 35:65 split
3. Drag the divider: ratio adjusts, both panels font size updates in real-time
4. Close workspace: smooth transition back to full-width chat
5. Refresh: persisted ratio is restored
6. Zoom in/out (Cmd+/Cmd-): font scale multiplier works on top of container query
