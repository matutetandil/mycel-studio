// IDE engine-backed go-to-definition for HCL files
// Navigation is handled by keyboard shortcuts (Cmd+B) and Cmd+Click.
// This provider only tells Monaco WHERE the definition is (for the underline),
// it does NOT navigate — that's done by the click handler.

import type { languages, editor, Position } from 'monaco-editor'
import { ideDefinition, type IDELocation } from '../lib/api'
import { useProjectStore } from '../stores/useProjectStore'
import { useEditorPanelStore } from '../stores/useEditorPanelStore'

// Store the last resolved location so Cmd+Click can use it
let lastDefinitionLoc: IDELocation | null = null
export function getLastDefinitionLocation() { return lastDefinitionLoc }

export function createIDEDefinitionProvider(
  getFilePath: () => string | null,
): languages.DefinitionProvider {
  return {
    async provideDefinition(model: editor.ITextModel, position: Position) {
      const filePath = getFilePath()
      if (!filePath) return null

      const loc = await ideDefinition(filePath, position.lineNumber, position.column)
      if (!loc) {
        lastDefinitionLoc = null
        return null
      }

      // Store for Cmd+Click navigation
      lastDefinitionLoc = loc

      // Return a location so Monaco shows the underline on Cmd+hover
      // Use the current model URI (Monaco will handle the click via onDefinitionClick)
      return {
        uri: model.uri,
        range: {
          startLineNumber: loc.range.start.line,
          startColumn: loc.range.start.col,
          endLineNumber: loc.range.end.line,
          endColumn: loc.range.end.col,
        },
      }
    },
  }
}

// Navigate to definition — called from Cmd+B shortcut and Monaco's Cmd+Click
export function navigateToDefinition(loc: IDELocation) {
  const projectPath = useProjectStore.getState().projectPath
  if (!projectPath) return
  const relPath = loc.file.startsWith(projectPath + '/') ? loc.file.slice(projectPath.length + 1) : loc.file
  const fileName = relPath.split('/').pop() || relPath
  useEditorPanelStore.getState().openFile(relPath, fileName, undefined, projectPath)
  setTimeout(() => useEditorPanelStore.getState().setRevealLine(loc.range.start.line), 50)
}
