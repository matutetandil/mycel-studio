// IDE engine-backed reference provider for Monaco
// Shift+Cmd+F7 or right-click → Find All References

import type { languages, editor, Position, CancellationToken } from 'monaco-editor'
import { ideFindReferences, ideHover } from '../lib/api'

export function createIDEReferenceProvider(
  getFilePath: () => string | null,
): languages.ReferenceProvider {
  return {
    async provideReferences(
      model: editor.ITextModel,
      position: Position,
      _context: languages.ReferenceContext,
      _token: CancellationToken,
    ): Promise<languages.Location[]> {
      const filePath = getFilePath()
      if (!filePath) return []

      // Use hover to detect what entity is under the cursor
      const hover = await ideHover(filePath, position.lineNumber, position.column)
      if (!hover?.content) return []

      // Parse hover content: "Connector: magento_db\nType: database\n..."
      const firstLine = hover.content.split('\n')[0]
      const match = firstLine.match(/^(\w+):\s*(.+?)(?:\s*\(|$)/)
      if (!match) return []

      const kind = match[1].toLowerCase() // "Connector" → "connector"
      const name = match[2].trim()

      const refs = await ideFindReferences(kind, name)
      if (!refs || refs.length === 0) return []

      // Convert to Monaco Location format
      // Monaco needs URIs — we create file URIs from paths
      return refs.map(ref => ({
        uri: model.uri.with({ path: ref.file }),
        range: {
          startLineNumber: ref.line,
          startColumn: ref.col || 1,
          endLineNumber: ref.line,
          endColumn: (ref.col || 1) + name.length,
        },
      }))
    },
  }
}
