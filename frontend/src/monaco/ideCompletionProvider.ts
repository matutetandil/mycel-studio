// IDE engine-backed completion provider for HCL files
// Replaces the static hclCompletionProvider with real-time completions from pkg/ide

import type { languages, editor, Position, IRange } from 'monaco-editor'
import { ideComplete } from '../lib/api'

export function createIDECompletionProvider(
  monaco: typeof import('monaco-editor'),
  getFilePath: () => string | null,
): languages.CompletionItemProvider {
  const kindMap: Record<number, languages.CompletionItemKind> = {
    1: monaco.languages.CompletionItemKind.Module,    // Block
    2: monaco.languages.CompletionItemKind.Property,  // Attribute
    3: monaco.languages.CompletionItemKind.Value,     // Value
  }

  return {
    triggerCharacters: ['"', '.', '=', ' ', '{', '\n'],

    async provideCompletionItems(model: editor.ITextModel, position: Position) {
      const filePath = getFilePath()
      if (!filePath) return { suggestions: [] }

      const items = await ideComplete(filePath, position.lineNumber, position.column)
      if (!items || items.length === 0) return { suggestions: [] }

      const word = model.getWordUntilPosition(position)
      const range: IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      return {
        suggestions: items.map((item, i) => ({
          label: item.label,
          kind: kindMap[item.kind] || monaco.languages.CompletionItemKind.Text,
          detail: item.detail || undefined,
          documentation: item.doc ? { value: item.doc } : undefined,
          insertText: item.insertText || item.label,
          insertTextRules: (item.insertText && item.insertText.includes('$'))
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
          range,
          sortText: String(i).padStart(4, '0'), // Preserve engine ordering
        })),
      }
    },
  }
}
