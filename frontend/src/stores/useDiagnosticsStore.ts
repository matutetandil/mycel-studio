// Stores per-file diagnostic severity for UI indicators (tabs, file tree, directories)
// and full diagnostic entries for the Problems panel
import { create } from 'zustand'
import { ideDiagnoseAll, isWailsRuntime, type IDEDiagnostic } from '../lib/api'
import { useProjectStore } from './useProjectStore'
import { registerSnapshotProvider } from './snapshotRegistry'

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'none'

interface FileDiagnostic {
  errors: number
  warnings: number
  severity: DiagnosticSeverity
}

export interface DiagnosticEntry {
  severity: DiagnosticSeverity
  message: string
  file: string        // relative path
  line: number
  column: number
}

interface DiagnosticsState {
  // Per-file diagnostics keyed by relative path
  files: Record<string, FileDiagnostic>
  // Full diagnostic entries for the Problems panel
  entries: DiagnosticEntry[]
  // Refresh all diagnostics from IDE engine
  refreshAll: () => Promise<void>
  // Update diagnostics for a single file from IDE response
  updateFromDiagnostics: (diags: IDEDiagnostic[], projectPath: string) => void
  // Update diagnostics for a single file (used by validator after each edit)
  updateFile: (filePath: string, errors: number, warnings: number) => void
  // Get severity for a file
  getFileSeverity: (relativePath: string) => DiagnosticSeverity
  // Get worst severity in a directory (propagated)
  getDirSeverity: (dirPath: string) => DiagnosticSeverity
}

function computeSeverity(errors: number, warnings: number): DiagnosticSeverity {
  if (errors > 0) return 'error'
  if (warnings > 0) return 'warning'
  return 'none'
}

function severityFromCode(code: number): DiagnosticSeverity {
  if (code === 1) return 'error'
  if (code === 2) return 'warning'
  return 'info'
}

function buildEntriesAndFiles(diags: IDEDiagnostic[], prefix: string) {
  const files: Record<string, FileDiagnostic> = {}
  const entries: DiagnosticEntry[] = []
  for (const d of diags) {
    // Skip non-HCL files that may have been indexed accidentally
    if (!d.file.endsWith('.mycel') && !d.file.endsWith('.hcl')) continue
    const key = prefix && d.file.startsWith(prefix) ? d.file.slice(prefix.length) : d.file
    if (!files[key]) files[key] = { errors: 0, warnings: 0, severity: 'none' }
    if (d.severity === 1) files[key].errors++
    else if (d.severity === 2) files[key].warnings++
    entries.push({
      severity: severityFromCode(d.severity),
      message: d.message,
      file: key,
      line: d.range?.start?.line ?? 0,
      column: d.range?.start?.col ?? 0,
    })
  }
  for (const key of Object.keys(files)) {
    files[key].severity = computeSeverity(files[key].errors, files[key].warnings)
  }
  // Sort: errors first, then warnings, then by file
  entries.sort((a, b) => {
    const sev = (s: DiagnosticSeverity) => s === 'error' ? 0 : s === 'warning' ? 1 : 2
    const diff = sev(a.severity) - sev(b.severity)
    if (diff !== 0) return diff
    return a.file.localeCompare(b.file) || a.line - b.line
  })
  return { files, entries }
}

export const useDiagnosticsStore = create<DiagnosticsState>((set, get) => ({
  files: {},
  entries: [],

  refreshAll: async () => {
    if (!isWailsRuntime()) return
    try {
      const diags = await ideDiagnoseAll()
      const projectPath = useProjectStore.getState().projectPath
      const prefix = projectPath ? projectPath + '/' : ''
      const { files, entries } = buildEntriesAndFiles(diags, prefix)
      set({ files, entries })
    } catch {
      // Best effort
    }
  },

  updateFromDiagnostics: (diags, projectPath) => {
    const prefix = projectPath + '/'
    const { files, entries } = buildEntriesAndFiles(diags, prefix)
    set({ files, entries })
  },

  updateFile: (filePath, errors, warnings) => {
    const projectPath = useProjectStore.getState().projectPath
    const prefix = projectPath ? projectPath + '/' : ''
    const key = prefix && filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath

    set(state => {
      const files = { ...state.files }
      if (errors === 0 && warnings === 0) {
        delete files[key]
      } else {
        files[key] = { errors, warnings, severity: computeSeverity(errors, warnings) }
      }
      return { files }
    })
  },

  getFileSeverity: (relativePath) => {
    const { files } = get()
    for (const [key, diag] of Object.entries(files)) {
      if (key === relativePath || key.endsWith('/' + relativePath) || relativePath.endsWith('/' + key) || relativePath === key) {
        return diag.severity
      }
    }
    return 'none'
  },

  getDirSeverity: (dirPath) => {
    const { files } = get()
    let hasError = false
    let hasWarning = false
    for (const [key, diag] of Object.entries(files)) {
      if (key.includes('/' + dirPath + '/') || key.startsWith(dirPath + '/')) {
        if (diag.severity === 'error') hasError = true
        if (diag.severity === 'warning') hasWarning = true
      }
    }
    if (hasError) return 'error'
    if (hasWarning) return 'warning'
    return 'none'
  },
}))

registerSnapshotProvider('diagnostics', {
  capture: () => {
    const s = useDiagnosticsStore.getState()
    return JSON.parse(JSON.stringify({ files: s.files, entries: s.entries }))
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  restore: (data) => useDiagnosticsStore.setState(data as any),
  clear: () => useDiagnosticsStore.setState({ files: {}, entries: [] }),
})
