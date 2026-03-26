// Gutter decorations system — IntelliJ-style icons between line numbers and code
// Shows: reference arrows (↑↓), hints (lightbulb), bookmarks (flag)

import type { editor } from 'monaco-editor'
import {
  ideHintsForFile, ideFindReferences, ideSymbolsForFile,
  isWailsRuntime, type IDEHint, type IDEReference,
} from '../lib/api'
import { useProjectStore } from '../stores/useProjectStore'

export interface GutterItem {
  line: number
  type: 'ref-down' | 'ref-up' | 'hint' | 'bookmark'
  letter?: string
  tooltip: string
  hint?: IDEHint
  references?: IDEReference[]
  entityKind?: string
  entityName?: string
}

// Bookmarks stored per file
const bookmarks = new Map<string, Set<number>>()

export function toggleBookmark(filePath: string, line: number) {
  if (!bookmarks.has(filePath)) bookmarks.set(filePath, new Set())
  const set = bookmarks.get(filePath)!
  if (set.has(line)) set.delete(line)
  else set.add(line)
  saveBookmarks()
}

export function getBookmarks(filePath: string): Set<number> {
  return bookmarks.get(filePath) || new Set()
}

function saveBookmarks() {
  const data: Record<string, number[]> = {}
  for (const [file, lines] of bookmarks) {
    if (lines.size > 0) data[file] = [...lines]
  }
  try { localStorage.setItem('mycel-bookmarks', JSON.stringify(data)) } catch { /* ignore */ }
}

function loadBookmarks() {
  try {
    const data = JSON.parse(localStorage.getItem('mycel-bookmarks') || '{}')
    for (const [file, lines] of Object.entries(data)) {
      bookmarks.set(file, new Set(lines as number[]))
    }
  } catch { /* ignore */ }
}
loadBookmarks()

const KIND_LETTERS: Record<string, string> = {
  connector: 'C', flow: 'F', type: 'T', transform: 'Tr',
  aspect: 'A', validator: 'V', saga: 'S', state_machine: 'SM',
}

// Check if two file paths refer to the same file (handles abs vs rel)
function pathsMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (a.endsWith('/' + b) || b.endsWith('/' + a)) return true
  return false
}

// Compute all gutter items for a file
export async function computeGutterItems(absFilePath: string): Promise<GutterItem[]> {
  if (!isWailsRuntime()) return []

  const items: GutterItem[] = []
  const projectPath = useProjectStore.getState().projectPath
  if (!projectPath) return []

  const relPath = absFilePath.startsWith(projectPath + '/')
    ? absFilePath.slice(projectPath.length + 1)
    : absFilePath

  // 1. Hints
  const hints = await ideHintsForFile(absFilePath)
  if (hints) {
    for (const hint of hints) {
      if (hint.range) {
        items.push({ line: hint.range.start.line, type: 'hint', tooltip: hint.message, hint })
      }
    }
  }

  // 2. Reference arrows — check symbols defined in this file
  const symbols = await ideSymbolsForFile(absFilePath)
  if (symbols) {
    for (const symbol of symbols) {
      const kind = (symbol.kindName || '').toLowerCase()
      const letter = KIND_LETTERS[kind] || '?'

      const refs = await ideFindReferences(kind, symbol.name)
      if (!refs || refs.length <= 1) continue

      const usages = refs.filter(r => r.attrName)
      const defInThisFile = refs.some(r => !r.attrName && pathsMatch(r.file, absFilePath))

      if (defInThisFile && usages.length > 0) {
        const defRef = refs.find(r => !r.attrName && pathsMatch(r.file, absFilePath))
        if (defRef) {
          items.push({
            line: defRef.line,
            type: 'ref-down',
            letter,
            tooltip: `${symbol.name} — used in ${usages.length} place${usages.length > 1 ? 's' : ''}`,
            references: usages,
            entityKind: kind,
            entityName: symbol.name,
          })
        }
      }
    }
  }

  // 3. Reference-up arrows — scan file content for references TO other entities
  // Read the file and find all `connector = "name"`, `use = "name"`, etc.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).go?.main?.App
  if (app?.ReadFile) {
    try {
      const content = await app.ReadFile(absFilePath)
      const lines = content.split('\n')
      const refPattern = /(\w+)\s*=\s*"([^"]+)"/g
      const refAttrs = new Set(['connector', 'storage', 'use'])

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        let match
        refPattern.lastIndex = 0
        while ((match = refPattern.exec(line)) !== null) {
          const attrName = match[1]
          const value = match[2]
          if (!refAttrs.has(attrName)) continue

          // Determine what kind of entity this references
          let refKind = ''
          if (attrName === 'connector') refKind = 'connector'
          else if (attrName === 'storage') refKind = 'connector'
          else if (attrName === 'use') refKind = 'transform'

          if (!refKind) continue

          // Check if the referenced entity exists and is defined elsewhere
          const refs = await ideFindReferences(refKind, value)
          if (!refs || refs.length === 0) continue

          const def = refs.find(r => !r.attrName)
          if (def && !pathsMatch(def.file, absFilePath)) {
            const letter = KIND_LETTERS[refKind] || '?'
            // Don't add duplicate for same line
            if (!items.some(it => it.line === (i + 1) && it.type === 'ref-up')) {
              items.push({
                line: i + 1,
                type: 'ref-up',
                letter,
                tooltip: `${value} — go to definition`,
                references: [def],
                entityKind: refKind,
                entityName: value,
              })
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  // 4. Bookmarks
  const fileBookmarks = getBookmarks(relPath)
  for (const line of fileBookmarks) {
    items.push({ line, type: 'bookmark', tooltip: 'Bookmark' })
  }

  return items
}

// Apply gutter decorations — uses wider glyph margin (36px) with composite CSS classes
// so multiple icons show side by side on the same line.
export function applyGutterDecorations(
  monacoEditor: editor.IStandaloneCodeEditor,
  items: GutterItem[],
  existingIds: string[],
): string[] {
  const byLine = new Map<number, GutterItem[]>()
  for (const item of items) {
    if (!byLine.has(item.line)) byLine.set(item.line, [])
    byLine.get(item.line)!.push(item)
  }

  const decorations: editor.IModelDeltaDecoration[] = []
  for (const [line, lineItems] of byLine) {
    const refItem = lineItems.find(i => i.type === 'ref-down' || i.type === 'ref-up')
    const secondaryItem = lineItems.find(i => i.type === 'hint' || i.type === 'bookmark')

    // Primary icon in glyph margin (ref arrow OR hint/bookmark if alone)
    if (refItem) {
      const cls = refItem.type === 'ref-down' ? 'gutter-row has-ref-down' : 'gutter-row has-ref-up'
      const letterCls = refItem.letter ? ` ref-letter-${refItem.letter.toLowerCase()}` : ''
      const tooltip = refItem.type === 'ref-down'
        ? `▼ **${refItem.entityName}** — used in ${refItem.references?.length || 0} place(s)`
        : `▲ Go to **${refItem.entityName}** definition`
      decorations.push({
        range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
        options: {
          glyphMarginClassName: cls + letterCls,
          glyphMarginHoverMessage: { value: tooltip },
        },
      })
    }

    // Secondary icon — in linesDecorations if ref exists, in glyph if alone
    if (secondaryItem) {
      const tooltip = secondaryItem.type === 'hint'
        ? `💡 ${secondaryItem.tooltip}`
        : '🔖 Bookmark'

      if (refItem) {
        // Separate column with its own hover
        const cls = secondaryItem.type === 'hint' ? 'gutter-hint-dot' : 'gutter-bookmark-dot'
        decorations.push({
          range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
          options: {
            linesDecorationsClassName: cls,
            hoverMessage: { value: tooltip },
          },
        })
      } else {
        // Alone in glyph margin
        const cls = secondaryItem.type === 'hint' ? 'gutter-row has-hint' : 'gutter-row has-bookmark'
        decorations.push({
          range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
          options: {
            glyphMarginClassName: cls,
            glyphMarginHoverMessage: { value: tooltip },
          },
        })
      }
    }
  }

  return monacoEditor.deltaDecorations(existingIds, decorations)
}
