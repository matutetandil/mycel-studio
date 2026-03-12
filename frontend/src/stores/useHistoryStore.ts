import { create } from 'zustand'
import type { Node, Edge } from '@xyflow/react'

interface Snapshot {
  nodes: Node[]
  edges: Edge[]
}

interface HistoryState {
  past: Snapshot[]
  future: Snapshot[]
  maxHistory: number
  pushState: (snapshot: Snapshot) => void
  undo: () => Snapshot | null
  redo: () => Snapshot | null
  canUndo: () => boolean
  canRedo: () => boolean
  clear: () => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxHistory: 50,

  pushState: (snapshot) => {
    set((state) => ({
      past: [...state.past.slice(-(state.maxHistory - 1)), snapshot],
      future: [],
    }))
  },

  undo: () => {
    const { past } = get()
    if (past.length === 0) return null
    const previous = past[past.length - 1]
    set((state) => ({
      past: state.past.slice(0, -1),
    }))
    return previous
  },

  redo: () => {
    const { future } = get()
    if (future.length === 0) return null
    const next = future[0]
    set((state) => ({
      future: state.future.slice(1),
    }))
    return next
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clear: () => set({ past: [], future: [] }),
}))
