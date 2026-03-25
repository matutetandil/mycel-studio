// Stores SOLID organization hints from the IDE engine
// Tracks which hints have been applied or dismissed

import { create } from 'zustand'
import { ideHints, isWailsRuntime, type IDEHint } from '../lib/api'
import { useProjectStore } from './useProjectStore'

export type HintStatus = 'active' | 'applied' | 'dismissed'

export interface TrackedHint {
  hint: IDEHint
  status: HintStatus
}

interface HintsState {
  hints: TrackedHint[]
  bannerDismissed: boolean

  refreshHints: () => Promise<void>
  applyHint: (index: number) => void
  dismissHint: (index: number) => void
  dismissBanner: () => void
  getActiveHints: () => TrackedHint[]
  getProjectLevelHints: () => TrackedHint[]
}

export const useHintsStore = create<HintsState>((set, get) => ({
  hints: [],
  bannerDismissed: false,

  refreshHints: async () => {
    if (!isWailsRuntime()) return
    const projectPath = useProjectStore.getState().projectPath
    if (!projectPath) return

    try {
      const rawHints = await ideHints()
      const prefix = projectPath + '/'

      // Preserve status of existing hints that match
      const existingMap = new Map<string, HintStatus>()
      for (const h of get().hints) {
        const key = `${h.hint.blockType}:${h.hint.blockName}:${h.hint.kind}`
        existingMap.set(key, h.status)
      }

      const tracked: TrackedHint[] = (rawHints || []).map(hint => {
        // Normalize file paths to relative
        const normalizedHint = {
          ...hint,
          file: hint.file.startsWith(prefix) ? hint.file.slice(prefix.length) : hint.file,
          suggestedFile: hint.suggestedFile?.startsWith(prefix) ? hint.suggestedFile.slice(prefix.length) : hint.suggestedFile,
        }
        const key = `${hint.blockType}:${hint.blockName}:${hint.kind}`
        const existingStatus = existingMap.get(key)
        return {
          hint: normalizedHint,
          status: existingStatus || 'active' as HintStatus,
        }
      })

      set({ hints: tracked })
    } catch {
      // Best effort
    }
  },

  applyHint: (index) => {
    set(state => ({
      hints: state.hints.map((h, i) => i === index ? { ...h, status: 'applied' as HintStatus } : h),
    }))
  },

  dismissHint: (index) => {
    set(state => ({
      hints: state.hints.map((h, i) => i === index ? { ...h, status: 'dismissed' as HintStatus } : h),
    }))
  },

  dismissBanner: () => {
    set({ bannerDismissed: true })
  },

  getActiveHints: () => {
    return get().hints.filter(h => h.status === 'active')
  },

  getProjectLevelHints: () => {
    // Kind 6 = HintNoDirectoryStructure (project-level)
    return get().hints.filter(h => h.hint.kind === 6)
  },
}))
