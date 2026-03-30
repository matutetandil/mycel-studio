import { create } from 'zustand'
import { getTerminalBackend } from '../lib/terminal'
import { useProjectStore } from './useProjectStore'
import { registerSnapshotProvider } from './snapshotRegistry'

export interface TerminalInstance {
  id: string       // session ID from backend (e.g., "term-1")
  name: string     // display name (e.g., "Terminal 1")
  workDir: string  // working directory used to create this terminal
}

interface TerminalState {
  terminals: TerminalInstance[]
  activeTerminalId: string | null
  counter: number
  createTerminal: (workDir?: string, name?: string) => Promise<void>
  closeTerminal: (id: string) => void
  setActiveTerminal: (id: string) => void
  renameTerminal: (id: string, name: string) => void
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: [],
  activeTerminalId: null,
  counter: 0,

  createTerminal: async (workDir?: string, savedName?: string) => {
    try {
      const backend = getTerminalBackend()
      const dir = workDir || useProjectStore.getState().projectPath || ''
      const id = await backend.create(80, 24, dir || undefined)
      const num = get().counter + 1
      const name = savedName || `Terminal ${num}`

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

registerSnapshotProvider('terminal', {
  capture: async () => {
    const t = useTerminalStore.getState()
    const backend = getTerminalBackend()
    const terminals = await Promise.all(
      t.terminals.map(async (term) => {
        const cwd = await backend.getCwd(term.id).catch(() => '')
        return { name: term.name, workDir: cwd || term.workDir }
      })
    )
    return { terminals }
  },
  restore: (data) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any
    const termStore = useTerminalStore.getState()
    // Close existing terminals, recreate from snapshot
    for (const t of [...termStore.terminals]) termStore.closeTerminal(t.id)
    for (const t of d.terminals) termStore.createTerminal(t.workDir, t.name)
  },
  clear: () => {
    const termStore = useTerminalStore.getState()
    for (const t of [...termStore.terminals]) termStore.closeTerminal(t.id)
  },
})
