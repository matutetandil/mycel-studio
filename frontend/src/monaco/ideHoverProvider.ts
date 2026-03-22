// IDE engine-backed hover provider for HCL files
// Replaces the static hclHoverProvider with real-time hover docs from pkg/ide

import type { languages, editor, Position } from 'monaco-editor'
import { ideHover } from '../lib/api'

export function createIDEHoverProvider(
  getFilePath: () => string | null,
): languages.HoverProvider {
  return {
    async provideHover(_model: editor.ITextModel, position: Position) {
      const filePath = getFilePath()
      if (!filePath) return null

      const result = await ideHover(filePath, position.lineNumber, position.column)
      if (!result) return null

      return {
        contents: [{ value: result.content }],
        range: result.range ? {
          startLineNumber: result.range.start.line,
          startColumn: result.range.start.col,
          endLineNumber: result.range.end.line,
          endColumn: result.range.end.col,
        } : undefined,
      }
    },
  }
}
