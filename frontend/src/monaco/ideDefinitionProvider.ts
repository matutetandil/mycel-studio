// IDE engine-backed go-to-definition for HCL files
// Ctrl+Click or F12 on a reference (connector name, type name, etc.)
// navigates to the definition in the correct file

import type { languages, editor, Position } from 'monaco-editor'
import { ideDefinition, type IDELocation } from '../lib/api'

// Callback to handle navigation (set by EditorGroup)
let onNavigate: ((loc: IDELocation) => void) | null = null
export function setDefinitionNavigator(fn: ((loc: IDELocation) => void) | null) {
  onNavigate = fn
}

export function createIDEDefinitionProvider(
  getFilePath: () => string | null,
): languages.DefinitionProvider {
  return {
    async provideDefinition(_model: editor.ITextModel, position: Position) {
      const filePath = getFilePath()
      if (!filePath) return null

      const loc = await ideDefinition(filePath, position.lineNumber, position.column)
      if (!loc) return null

      // Use the navigation callback to open the file in the editor
      if (onNavigate) {
        onNavigate(loc)
      }

      // Return null — we handle navigation ourselves since Monaco's model
      // system doesn't know about our project files
      return null
    },
  }
}
