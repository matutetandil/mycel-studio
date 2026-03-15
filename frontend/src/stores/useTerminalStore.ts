import { create } from 'zustand'
import { getTerminalBackend } from '../lib/terminal'
import { useProjectStore } from './useProjectStore'

export interface TerminalInstance {
  id: string       // session ID from backend (e.g., "term-1")
  name: string     // display name (e.g., "Terminal 1")
  workDir: string  // working directory used to create this terminal
}

interface TerminalState {
  terminals: TerminalInstance[]
  activeTerminalId: string | null
  counter: number
  createTerminal: (workDir?: string) => Promise<void>
  closeTerminal: (id: string) => void
  setActiveTerminal: (id: string) => void
  renameTerminal: (id: string, name: string) => void
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: [],
  activeTerminalId: null,
  counter: 0,

  createTerminal: async (workDir?: string) => {
    try {
      const backend = getTerminalBackend()
      const dir = workDir || useProjectStore.getState().projectPath || ''
      const id = await backend.create(80, 24, dir || undefined)
      const num = get().counter + 1
      const name = `Terminal ${num}`

      set(state => ({
        counter: num,
        terminals: [...state.terminals, { id, name, workDir: dir }],
        activeTerminalId: id,
      }))
    } catch (err) {
      console.error('Failed to create terminal:', err)
    }
  },

  closeTerminal: (id: string) => {
    const backend = getTerminalBackend()
    backend.close(id)

    set(state => {
      const remaining = state.terminals.filter(t => t.id !== id)
      return {
        terminals: remaining,
        activeTerminalId: state.activeTerminalId === id
          ? (remaining[remaining.length - 1]?.id ?? null)
          : state.activeTerminalId,
      }
    })
  },

  setActiveTerminal: (id: string) => {
    set({ activeTerminalId: id })
  },

  renameTerminal: (id: string, name: string) => {
    set(state => ({
      terminals: state.terminals.map(t => t.id === id ? { ...t, name } : t),
    }))
  },
}))
