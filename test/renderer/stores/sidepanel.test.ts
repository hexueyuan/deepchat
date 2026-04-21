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

  it('clamps ratio to max 0.8 (workspace max 80%)', async () => {
    const { store, storageRef } = await setupSidepanelStore(1200)
    store.setRatio(0.95)
    expect(storageRef.value).toBe(0.8)
    expect(store.ratio).toBe(0.8)
  })

  it('clamps ratio to min 0.3 (workspace min 30%)', async () => {
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
