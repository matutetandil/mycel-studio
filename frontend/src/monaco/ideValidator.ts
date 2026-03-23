// IDE engine-backed diagnostics for HCL files
// Replaces the static hclValidator with real-time diagnostics from pkg/ide

import type { editor } from 'monaco-editor'
import { ideUpdateFile } from '../lib/api'
import { useDiagnosticsStore } from '../stores/useDiagnosticsStore'

export function createIDEValidator(
  monaco: typeof import('monaco-editor'),
  getFilePath: () => string | null,
  debounceMs = 300,
) {
  let timer: ReturnType<typeof setTimeout> | null = null

  return function validate(model: editor.ITextModel) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(async () => {
      const filePath = getFilePath()
      if (!filePath || !filePath.endsWith('.hcl')) return

      const content = model.getValue()
      const diags = await ideUpdateFile(filePath, content)

      const markers = (diags || []).map(d => ({
        severity: d.severity === 1 ? monaco.MarkerSeverity.Error
          : d.severity === 2 ? monaco.MarkerSeverity.Warning
          : monaco.MarkerSeverity.Info,
        message: d.message,
        startLineNumber: d.range?.start?.line || 1,
        startColumn: d.range?.start?.col || 1,
        endLineNumber: d.range?.end?.line || 1,
        endColumn: d.range?.end?.col || 1,
      }))

      monaco.editor.setModelMarkers(model, 'mycel-ide', markers)

      // Refresh diagnostics store so tabs/file tree update their squiggly indicators
      useDiagnosticsStore.getState().refreshAll()
    }, debounceMs)
  }
}
