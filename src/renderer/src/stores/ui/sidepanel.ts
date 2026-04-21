import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { SidePanelTab, WorkspaceNavSection, WorkspaceViewMode } from '@shared/presenter'

export interface WorkspaceArtifactContext {
  threadId: string
  messageId: string
  artifactId: string
}

export interface WorkspaceSessionState {
  selectedArtifactContext: WorkspaceArtifactContext | null
  selectedFilePath: string | null
  selectedDiffPath: string | null
  viewMode: WorkspaceViewMode
  sections: Record<WorkspaceNavSection, boolean>
}

const createSessionState = (): WorkspaceSessionState => ({
  selectedArtifactContext: null,
  selectedFilePath: null,
  selectedDiffPath: null,
  viewMode: 'preview',
  sections: {
    artifacts: true,
    files: true,
    git: false,
    subagents: true
  }
})

const RATIO_MIN = 0.3
const RATIO_MAX = 0.8

const clampRatio = (nextRatio: number) => {
  const value = Number(nextRatio)
  if (!Number.isFinite(value)) return 0.65
  return Math.min(RATIO_MAX, Math.max(RATIO_MIN, Math.round(value * 100) / 100))
}

export const useSidepanelStore = defineStore('sidepanel', () => {
  const open = ref(false)
  const activeTab = ref<SidePanelTab>('workspace')
  const ratio = useStorage('chat-sidepanel-ratio', 0.65)
  const sessionStates = reactive<Record<string, WorkspaceSessionState>>({})

  const normalizedRatio = computed(() => clampRatio(Number(ratio.value)))

  const ensureSessionState = (sessionId: string): WorkspaceSessionState => {
    if (!sessionStates[sessionId]) {
      sessionStates[sessionId] = createSessionState()
    }
    return sessionStates[sessionId]
  }

  const getSessionState = (sessionId: string | null | undefined): WorkspaceSessionState => {
    if (!sessionId) {
      return createSessionState()
    }
    return ensureSessionState(sessionId)
  }

  const setRatio = (nextRatio: number) => {
    ratio.value = clampRatio(nextRatio)
  }

  const openWorkspace = (sessionId?: string | null) => {
    if (sessionId) {
      ensureSessionState(sessionId)
    }
    open.value = true
    activeTab.value = 'workspace'
  }

  const openBrowser = () => {
    open.value = true
    activeTab.value = 'browser'
  }

  const closePanel = () => {
    open.value = false
  }

  const toggleWorkspace = (sessionId?: string | null) => {
    if (open.value && activeTab.value === 'workspace') {
      open.value = false
      return
    }
    openWorkspace(sessionId)
  }

  const setViewMode = (sessionId: string, mode: WorkspaceViewMode) => {
    ensureSessionState(sessionId).viewMode = mode
  }

  const toggleSection = (sessionId: string, section: WorkspaceNavSection) => {
    const state = ensureSessionState(sessionId)
    state.sections[section] = !state.sections[section]
  }

  const selectArtifact = (
    sessionId: string,
    context: WorkspaceArtifactContext | null,
    options?: {
      open?: boolean
      viewMode?: WorkspaceViewMode
    }
  ) => {
    const state = ensureSessionState(sessionId)
    state.selectedArtifactContext = context
    state.selectedFilePath = null
    state.selectedDiffPath = null
    state.viewMode = options?.viewMode ?? state.viewMode
    state.sections.artifacts = true

    if (options?.open !== false) {
      openWorkspace(sessionId)
    }
  }

  const selectFile = (
    sessionId: string,
    filePath: string,
    options?: {
      open?: boolean
      viewMode?: WorkspaceViewMode
    }
  ) => {
    const state = ensureSessionState(sessionId)
    state.selectedArtifactContext = null
    state.selectedFilePath = filePath
    state.selectedDiffPath = null
    state.viewMode = options?.viewMode ?? state.viewMode
    state.sections.files = true

    if (options?.open !== false) {
      openWorkspace(sessionId)
    }
  }

  const selectDiff = (
    sessionId: string,
    filePath: string,
    options?: {
      open?: boolean
    }
  ) => {
    const state = ensureSessionState(sessionId)
    state.selectedArtifactContext = null
    state.selectedFilePath = null
    state.selectedDiffPath = filePath
    state.sections.git = true

    if (options?.open !== false) {
      openWorkspace(sessionId)
    }
  }

  const clearArtifact = (sessionId: string) => {
    const state = ensureSessionState(sessionId)
    state.selectedArtifactContext = null
  }

  const clearFile = (sessionId: string) => {
    const state = ensureSessionState(sessionId)
    state.selectedFilePath = null
  }

  const clearDiff = (sessionId: string) => {
    const state = ensureSessionState(sessionId)
    state.selectedDiffPath = null
  }

  return {
    open,
    activeTab,
    width: normalizedRatio,
    ratio: normalizedRatio,
    sessionStates,
    ensureSessionState,
    getSessionState,
    setWidth: setRatio,
    setRatio,
    openWorkspace,
    openBrowser,
    closePanel,
    toggleWorkspace,
    setViewMode,
    toggleSection,
    selectArtifact,
    selectFile,
    selectDiff,
    clearArtifact,
    clearFile,
    clearDiff
  }
})
