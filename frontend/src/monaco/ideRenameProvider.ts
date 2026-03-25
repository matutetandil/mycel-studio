// IDE engine-backed rename provider for Monaco
// F2 on a block name or reference triggers the refactor dialog

import type { languages, editor, Position, CancellationToken } from 'monaco-editor'
import { ideHover } from '../lib/api'
import { useRefactorStore } from '../stores/useRefactorStore'

export function createIDERenameProvider(
  getFilePath: () => string | null,
): languages.RenameProvider {
  return {
    async provideRenameEdits(
      _model: editor.ITextModel,
      _position: Position,
      _newName: string,
      _token: CancellationToken,
    ): Promise<languages.WorkspaceEdit> {
      // The actual rename is handled by RefactorDialog — we just need to trigger it
      // This is called AFTER the user types the new name in Monaco's built-in rename box
      // But we prefer our own dialog, so we return empty edits here
      return { edits: [] }
    },

    async resolveRenameLocation(
      _model: editor.ITextModel,
      position: Position,
      _token: CancellationToken,
    ): Promise<languages.RenameLocation & languages.Rejection> {
      const filePath = getFilePath()
      if (!filePath) return { text: '', range: { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 }, rejectReason: 'No file open' }

      const hover = await ideHover(filePath, position.lineNumber, position.column)
      if (!hover?.content) {
        return { text: '', range: { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 }, rejectReason: 'Nothing to rename here' }
      }

      // Parse hover to get entity info
      const match = hover.content.match(/^(\w+):\s*(\S+)/)
      if (match) {
        const kind = match[1]
        const name = match[2]
        // Open our refactor dialog instead of Monaco's inline rename
        useRefactorStore.getState().open(kind, name)
        // Return rejection so Monaco doesn't show its own rename box
        return { text: name, range: hover.range ? {
          startLineNumber: hover.range.start.line,
          startColumn: hover.range.start.col,
          endLineNumber: hover.range.end.line,
          endColumn: hover.range.end.col,
        } : { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 }, rejectReason: 'Using Mycel refactor dialog' }
      }

      return { text: '', range: { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 }, rejectReason: 'Not a renameable entity' }
    },
  }
}
