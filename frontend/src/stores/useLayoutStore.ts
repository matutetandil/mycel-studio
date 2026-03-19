// Layout store — sidebar widths and collapse states (accessible globally for workspace persistence)
import { create } from 'zustand'

export type ViewMode = 'visual-first' | 'text-first'

interface LayoutState {
  leftWidth: number
  leftCollapsed: boolean
  rightWidth: number
  rightCollapsed: boolean
  viewMode: ViewMode

  setLeftWidth: (w: number) => void
  setLeftCollapsed: (c: boolean) => void
  setRightWidth: (w: number) => void
  setRightCollapsed: (c: boolean) => void
  setViewMode: (mode: ViewMode) => void
  toggleViewMode: () => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  leftWidth: 280,
  leftCollapsed: false,
  rightWidth: 400,
  rightCollapsed: false,
  viewMode: 'visual-first',

  setLeftWidth: (leftWidth) => set({ leftWidth }),
  setLeftCollapsed: (leftCollapsed) => set({ leftCollapsed }),
  setRightWidth: (rightWidth) => set({ rightWidth }),
  setRightCollapsed: (rightCollapsed) => set({ rightCollapsed }),
  setViewMode: (viewMode) => set({ viewMode }),
  toggleViewMode: () => set((s) => ({ viewMode: s.viewMode === 'visual-first' ? 'text-first' : 'visual-first' })),
}))
