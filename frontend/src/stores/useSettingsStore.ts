import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isWailsRuntime } from '../lib/api'

export type KeymapType = 'vscode' | 'idea'

interface WindowSize {
  width: number
  height: number
}

interface SettingsState {
  keymap: KeymapType
  confirmOnClose: boolean
  lastProjectPath: string | null
  windowSize: WindowSize | null
  setKeymap: (keymap: KeymapType) => void
  setConfirmOnClose: (confirm: boolean) => void
  setLastProjectPath: (path: string | null) => void
  setWindowSize: (size: WindowSize) => void
}

// Sync confirmOnClose to Go backend (desktop only)
function syncConfirmOnCloseToGo(enabled: boolean) {
  if (!isWailsRuntime()) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).go?.main?.App
    app?.SetConfirmOnClose(enabled)
  } catch { /* ignore */ }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      keymap: 'idea',
      confirmOnClose: true,
      lastProjectPath: null,
      windowSize: null,
      setKeymap: (keymap) => set({ keymap }),
      setConfirmOnClose: (confirmOnClose) => {
        syncConfirmOnCloseToGo(confirmOnClose)
        set({ confirmOnClose })
      },
      setLastProjectPath: (lastProjectPath) => set({ lastProjectPath }),
      setWindowSize: (windowSize) => set({ windowSize }),
    }),
    {
      name: 'mycel-studio-settings',
      onRehydrateStorage: () => (state) => {
        // Sync persisted setting to Go on app startup
        if (state) {
          syncConfirmOnCloseToGo(state.confirmOnClose)
        }
      },
    }
  )
)
