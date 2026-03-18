import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type KeymapType = 'vscode' | 'idea'

interface SettingsState {
  keymap: KeymapType
  setKeymap: (keymap: KeymapType) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      keymap: 'idea',
      setKeymap: (keymap) => set({ keymap }),
    }),
    {
      name: 'mycel-studio-settings',
    }
  )
)
