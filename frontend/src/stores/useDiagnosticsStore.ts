// Stores per-file diagnostic severity for UI indicators (tabs, file tree, directories)
import { create } from 'zustand'
import { ideDiagnoseAll, isWailsRuntime, type IDEDiagnostic } from '../lib/api'
import { useProjectStore } from './useProjectStore'

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'none'

interface FileDiagnostic {
  errors: number
  warnings: number
  severity: DiagnosticSeverity
}

interface DiagnosticsState {
  // Per-file diagnostics keyed by relative path
  files: Record<string, FileDiagnostic>
  // Refresh all diagnostics from IDE engine
  refreshAll: () => Promise<void>
  // Update diagnostics for a single file from IDE response
  updateFromDiagnostics: (diags: IDEDiagnostic[], projectPath: string) => void
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

export const useDiagnosticsStore = create<DiagnosticsState>((set, get) => ({
  files: {},

  refreshAll: async () => {
    if (!isWailsRuntime()) return
    try {
      const diags = await ideDiagnoseAll()
      const files: Record<string, FileDiagnostic> = {}
      const projectPath = useProjectStore.getState().projectPath
      const prefix = projectPath ? projectPath + '/' : ''
      for (const d of diags) {
        // Normalize to relative path (strip project path prefix)
        const key = prefix && d.file.startsWith(prefix) ? d.file.slice(prefix.length) : d.file
        if (!files[key]) files[key] = { errors: 0, warnings: 0, severity: 'none' }
        if (d.severity === 1) files[key].errors++
        else if (d.severity === 2) files[key].warnings++
      }
      for (const key of Object.keys(files)) {
        files[key].severity = computeSeverity(files[key].errors, files[key].warnings)
      }
      // Debug: log to temp file
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const app = (window as any).go?.main?.App
        if (app?.DebugLog) {
          app.DebugLog(`DiagnosticsStore.refreshAll: ${diags.length} diags, ${Object.keys(files).length} files with issues`)
          for (const [key, val] of Object.entries(files)) {
            app.DebugLog(`  ${key}: ${val.severity} (${val.errors}E/${val.warnings}W)`)
          }
        }
      } catch { /* ignore */ }
      set({ files })
    } catch {
      // Best effort
    }
  },

  updateFromDiagnostics: (diags, projectPath) => {
    const files = { ...get().files }
    const prefix = projectPath + '/'
    // Clear all relative paths (rebuild from scratch)
    for (const key of Object.keys(files)) {
      delete files[key]
    }
    for (const d of diags) {
      // Normalize to relative path
      const key = d.file.startsWith(prefix) ? d.file.slice(prefix.length) : d.file
      if (!files[key]) files[key] = { errors: 0, warnings: 0, severity: 'none' }
      if (d.severity === 1) files[key].errors++
      else if (d.severity === 2) files[key].warnings++
    }
    for (const key of Object.keys(files)) {
      files[key].severity = computeSeverity(files[key].errors, files[key].warnings)
    }
    set({ files })
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
