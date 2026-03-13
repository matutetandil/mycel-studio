// Layout store — sidebar widths and collapse states (accessible globally for workspace persistence)
import { create } from 'zustand'

interface LayoutState {
  leftWidth: number
  leftCollapsed: boolean
  rightWidth: number
  rightCollapsed: boolean

  setLeftWidth: (w: number) => void
  setLeftCollapsed: (c: boolean) => void
  setRightWidth: (w: number) => void
  setRightCollapsed: (c: boolean) => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  leftWidth: 280,
  leftCollapsed: false,
  rightWidth: 400,
  rightCollapsed: false,

  setLeftWidth: (leftWidth) => set({ leftWidth }),
  setLeftCollapsed: (leftCollapsed) => set({ leftCollapsed }),
  setRightWidth: (rightWidth) => set({ rightWidth }),
  setRightCollapsed: (rightCollapsed) => set({ rightCollapsed }),
}))
