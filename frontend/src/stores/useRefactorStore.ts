// State for the Refactor dialog (Shift+F6)
import { create } from 'zustand'

interface RefactorState {
  isOpen: boolean
  // Entity mode (from canvas)
  kind: string
  currentName: string
  flowName?: string
  // Cursor mode (from Monaco) — the engine determines what to rename
  cursorFile?: string
  cursorLine?: number
  cursorCol?: number

  open: (kind: string, currentName: string, flowName?: string) => void
  openAtCursor: (file: string, line: number, col: number) => void
  close: () => void
}

export const useRefactorStore = create<RefactorState>((set) => ({
  isOpen: false,
  kind: '',
  currentName: '',
  flowName: undefined,
  cursorFile: undefined,
  cursorLine: undefined,
  cursorCol: undefined,

  open: (kind, currentName, flowName) => set({
    isOpen: true, kind, currentName, flowName,
    cursorFile: undefined, cursorLine: undefined, cursorCol: undefined,
  }),

  openAtCursor: (file, line, col) => set({
    isOpen: true, kind: '', currentName: '',
    cursorFile: file, cursorLine: line, cursorCol: col,
  }),

  close: () => set({
    isOpen: false, kind: '', currentName: '', flowName: undefined,
    cursorFile: undefined, cursorLine: undefined, cursorCol: undefined,
  }),
}))
