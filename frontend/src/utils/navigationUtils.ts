// Navigation utilities — Go to Definition and Find All References

import { useProjectStore } from '../stores/useProjectStore'
import { useEditorPanelStore, unscopePath } from '../stores/useEditorPanelStore'
import { ideDefinition, ideHover, ideFindReferences, isWailsRuntime, type IDEReference } from '../lib/api'
import { navigateToDefinition } from '../monaco/ideDefinitionProvider'

function getActiveFileInfo() {
  const projectPath = useProjectStore.getState().projectPath
  if (!projectPath) return null

  const editorStore = useEditorPanelStore.getState()
  const activeGroup = editorStore.groups.find(g => g.id === editorStore.activeGroupId)
  const activeTab = activeGroup?.tabs.find(t => t.id === activeGroup?.activeTabId)
  if (!activeTab || activeTab.type !== 'file') return null

  const { relativePath } = unscopePath(activeTab.filePath)
  if (!relativePath.endsWith('.mycel')) return null

  const cursorPos = editorStore.cursorPositions[relativePath]
  if (!cursorPos) return null

  return { projectPath, relativePath, absPath: projectPath + '/' + relativePath, cursorPos }
}

// Cmd+B: Go to Definition
export async function goToDefinition() {
  if (!isWailsRuntime()) return

  const info = getActiveFileInfo()
  if (!info) return

  const loc = await ideDefinition(info.absPath, info.cursorPos.line, info.cursorPos.column)
  if (!loc) return
  navigateToDefinition(loc)
}

// Callback to show references in a UI (set by App)
let onShowReferences: ((refs: IDEReference[], entityName: string, entityKind: string) => void) | null = null
export function setReferencesHandler(fn: typeof onShowReferences) { onShowReferences = fn }

// Alt+F7: Find All Usages
export async function findAllReferences() {
  if (!isWailsRuntime()) return

  const info = getActiveFileInfo()
  if (!info) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbg = (window as any).go?.main?.App?.DebugLog

  // Try to detect entity from hover first (works when cursor is on a reference value)
  let kind = ''
  let name = ''

  const hover = await ideHover(info.absPath, info.cursorPos.line, info.cursorPos.column)
  if (hover?.content) {
    const firstLine = hover.content.split('\n')[0]
    const match = firstLine.match(/^(\w+):\s*(.+?)(?:\s*\(|$)/)
    if (match) {
      kind = match[1].toLowerCase()
      name = match[2].trim()
    }
  }

  // If hover didn't give us entity info (e.g., cursor is on a block definition),
  // detect it from the file content by looking at the current line
  if (!kind || !name) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).go?.main?.App
    if (app?.ReadFile) {
      const content = await app.ReadFile(info.absPath)
      const lines = content.split('\n')
      const currentLine = lines[info.cursorPos.line - 1] || ''
      // Match block definition: connector "name" { or flow "name" {
      const blockMatch = currentLine.match(/^(\w+)\s+"([^"]+)"/)
      if (blockMatch) {
        kind = blockMatch[1]
        name = blockMatch[2]
      }
      // Also check if we're INSIDE a block — scan upward for the block header
      if (!kind || !name) {
        for (let i = info.cursorPos.line - 1; i >= 0; i--) {
          const m = lines[i].match(/^(\w+)\s+"([^"]+)"\s*\{/)
          if (m) {
            kind = m[1]
            name = m[2]
            break
          }
        }
      }
    }
  }

  dbg?.(`findAllReferences: kind=${kind} name=${name}`)

  if (!kind || !name) return

  const refs = await ideFindReferences(kind, name)
  dbg?.(`findAllReferences: ${refs?.length || 0} results`)

  if (!refs || refs.length === 0) return

  // Filter to only show usages (not the definition itself)
  const usages = refs.filter(r => r.attrName) // attrName is empty for the definition

  if (usages.length === 0) {
    // No usages found — show message
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).go?.main?.App
    app?.ShowConfirmDialog?.('Find Usages', `"${name}" is not referenced anywhere.`)
    return
  }

  // Show references in UI
  if (onShowReferences) {
    onShowReferences(usages, name, kind)
  } else {
    // Fallback: navigate to first usage
    const first = usages[0]
    const relPath = first.file.startsWith(info.projectPath + '/')
      ? first.file.slice(info.projectPath.length + 1)
      : first.file
    const fileName = relPath.split('/').pop() || relPath
    useEditorPanelStore.getState().openFile(relPath, fileName, undefined, info.projectPath)
    setTimeout(() => useEditorPanelStore.getState().setRevealLine(first.line), 50)
  }
}
