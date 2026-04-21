# Sidebar Auto-Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically collapse the left sidebar when navigating to a chat page.

**Architecture:** Call `sidebarStore.setCollapsed(true)` in `pageRouter.goToChat()` — the single entry point for all chat navigation. Update sidebar transition duration from 200ms to 300ms.

**Tech Stack:** Vue 3, Pinia, Tailwind CSS

---

### Task 1: Add auto-collapse to `goToChat()` and update tests

**Files:**
- Modify: `src/renderer/src/stores/ui/pageRouter.ts:1-64`
- Modify: `test/renderer/stores/pageRouter.test.ts:1-127`

- [ ] **Step 1: Write the failing test**

Add to `test/renderer/stores/pageRouter.test.ts` — a new test that verifies `goToChat` collapses the sidebar. The test setup needs to mock the sidebar store:

```typescript
it('collapses the sidebar when going to chat', async () => {
  const { store, sidebarStore } = await setupStore({
    activeAgentSession: null
  })

  store.goToChat('session-1')

  expect(sidebarStore.setCollapsed).toHaveBeenCalledWith(true)
  expect(store.route.value).toEqual({ name: 'chat', sessionId: 'session-1' })
})
```

To support this, update `setupStore` to mock the sidebar store. Add the mock inside `setupStore`:

```typescript
const setupStore = async (options?: { activeAgentSession?: { id: string } | null }) => {
  vi.resetModules()
  const agentSessionPresenter = {
    getActiveSession: vi.fn().mockResolvedValue(options?.activeAgentSession ?? null)
  }

  const sidebarStore = {
    collapsed: { value: false },
    toggleSidebar: vi.fn(),
    setCollapsed: vi.fn()
  }

  vi.doMock('pinia', async () => {
    const actual = await vi.importActual<typeof import('pinia')>('pinia')
    return {
      ...actual,
      defineStore: (_id: string, setup: () => unknown) => setup
    }
  })

  vi.doMock('@/composables/usePresenter', () => ({
    usePresenter: (name: string) => {
      if (name === 'agentSessionPresenter') return agentSessionPresenter
      return {}
    }
  }))

  vi.doMock('@/stores/ui/sidebar', () => ({
    useSidebarStore: () => sidebarStore
  }))

  ;(window as any).electron = {
    ipcRenderer: {
      on: vi.fn(),
      removeListener: vi.fn()
    }
  }
  ;(window as any).api = {
    getWebContentsId: vi.fn(() => 1)
  }

  const { usePageRouterStore } = await import('@/stores/ui/pageRouter')
  const store = usePageRouterStore()

  return {
    store,
    agentSessionPresenter,
    sidebarStore
  }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:renderer -- --run test/renderer/stores/pageRouter.test.ts`
Expected: FAIL — `sidebarStore.setCollapsed` not called (pageRouter doesn't import sidebar store yet)

- [ ] **Step 3: Implement auto-collapse in `pageRouter.ts`**

In `src/renderer/src/stores/ui/pageRouter.ts`, import the sidebar store and call `setCollapsed(true)` in `goToChat()`:

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePresenter } from '@/composables/usePresenter'
import { useSidebarStore } from '@/stores/ui/sidebar'

export type PageRoute = { name: 'newThread' } | { name: 'chat'; sessionId: string }
type GoToNewThreadOptions = {
  refresh?: boolean
}

export const usePageRouterStore = defineStore('pageRouter', () => {
  const agentSessionPresenter = usePresenter('agentSessionPresenter')
  const sidebarStore = useSidebarStore()

  // --- State ---
  const route = ref<PageRoute>({ name: 'newThread' })
  const newThreadRefreshKey = ref(0)
  const error = ref<string | null>(null)

  // --- Actions ---

  async function initialize(): Promise<void> {
    try {
      const webContentsId = window.api.getWebContentsId()
      const activeAgentSession = await agentSessionPresenter.getActiveSession(webContentsId)
      if (activeAgentSession) {
        route.value = { name: 'chat', sessionId: activeAgentSession.id }
        sidebarStore.setCollapsed(true)
        return
      }

      route.value = { name: 'newThread' }
    } catch (e) {
      error.value = String(e)
      route.value = { name: 'newThread' }
    }
  }

  function goToNewThread(options: GoToNewThreadOptions = {}): void {
    route.value = { name: 'newThread' }
    if (options.refresh) {
      newThreadRefreshKey.value += 1
    }
  }

  function goToChat(sessionId: string): void {
    route.value = { name: 'chat', sessionId }
    sidebarStore.setCollapsed(true)
  }

  // --- Getters ---

  const currentRoute = computed(() => route.value.name)
  const chatSessionId = computed(() => (route.value.name === 'chat' ? route.value.sessionId : null))

  return {
    route,
    newThreadRefreshKey,
    error,
    initialize,
    goToNewThread,
    goToChat,
    currentRoute,
    chatSessionId
  }
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:renderer -- --run test/renderer/stores/pageRouter.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/stores/ui/pageRouter.ts test/renderer/stores/pageRouter.test.ts
git commit -m "feat: auto-collapse sidebar when navigating to chat"
```

### Task 2: Update sidebar transition duration to 300ms

**Files:**
- Modify: `src/renderer/src/components/WindowSideBar.vue:5`

- [ ] **Step 1: Update transition class**

In `src/renderer/src/components/WindowSideBar.vue` line 5, change `duration-200` to `duration-300`:

```html
class="flex flex-row h-full shrink-0 window-drag-region transition-all duration-300"
```

- [ ] **Step 2: Run format and lint**

```bash
pnpm run format && pnpm run lint
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/WindowSideBar.vue
git commit -m "style: increase sidebar transition duration to 300ms"
```
