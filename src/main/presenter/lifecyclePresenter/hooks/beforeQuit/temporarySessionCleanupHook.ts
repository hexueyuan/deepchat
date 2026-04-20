import { LifecycleHook, LifecycleContext } from '@shared/presenter'
import { presenter } from '@/presenter'
import { LifecyclePhase } from '@shared/lifecycle'

export const temporarySessionCleanupHook: LifecycleHook = {
  name: 'temporary-session-cleanup',
  phase: LifecyclePhase.BEFORE_QUIT,
  priority: 5,
  critical: false,
  execute: async (_context: LifecycleContext) => {
    if (!presenter) return
    await presenter.agentSessionPresenter.deleteAllTemporarySessions()
  }
}
