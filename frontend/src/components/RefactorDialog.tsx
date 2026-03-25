// Refactor dialog — Shift+F6 or right-click → Rename
// Shows current name, input for new name, affected references, and apply/cancel

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { RefreshCw } from 'lucide-react'
import {
  ideFindReferences, ideRenameEntity, ideRenameField, ideRenameCursor, ideUpdateFile, ideRenameFile,
  isWailsRuntime, type IDEReference, type IDETextEdit,
} from '../lib/api'
import { useProjectStore } from '../stores/useProjectStore'
import { useStudioStore } from '../stores/useStudioStore'
import { useEditorPanelStore, scopedPath, unscopePath } from '../stores/useEditorPanelStore'
import { useDiagnosticsStore } from '../stores/useDiagnosticsStore'
import { useHintsStore } from '../stores/useHintsStore'
import { toIdentifier } from '../utils/hclGenerator'

interface RefactorDialogProps {
  isOpen: boolean
  kind: string           // "connector", "flow", etc., or "" for cursor mode
  currentName: string
  flowName?: string
  cursorFile?: string    // For cursor-mode rename
  cursorLine?: number
  cursorCol?: number
  onClose: () => void
}

export default function RefactorDialog({ isOpen, kind, currentName, flowName, cursorFile, cursorLine, cursorCol, onClose }: RefactorDialogProps) {
  const [resolvedName, setResolvedName] = useState(currentName)
  const [newName, setNewName] = useState(currentName)
  const [references, setReferences] = useState<IDEReference[]>([])
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [isCursorMode, setIsCursorMode] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setIsCursorMode(false)

    if (cursorFile && cursorLine && cursorCol) {
      // Cursor mode — read word at cursor from the file
      setIsCursorMode(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const app = (window as any).go?.main?.App
      if (app?.ReadFile) {
        app.ReadFile(cursorFile).then((content: string) => {
          const lines = content.split('\n')
          const line = lines[cursorLine! - 1] || ''
          // Extract word at column position
          const col = cursorCol! - 1
          let start = col, end = col
          while (start > 0 && /[\w\-]/.test(line[start - 1])) start--
          while (end < line.length && /[\w\-]/.test(line[end])) end++
          const word = line.slice(start, end)
          setResolvedName(word)
          setNewName(word)
          setReferences([])
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    } else if (kind && currentName) {
      // Entity mode
      setResolvedName(currentName)
      setNewName(currentName)
      if (kind === 'field' && flowName) {
        setReferences([])
        setLoading(false)
      } else {
        ideFindReferences(kind, currentName).then(refs => {
          setReferences(refs || [])
          setLoading(false)
        })
      }
    }

    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 100)
  }, [isOpen, kind, currentName, flowName, cursorFile, cursorLine, cursorCol])

  if (!isOpen) return null

  const refCount = references.filter(r => r.attrName).length // exclude definition
  const isValid = newName.trim() && newName !== resolvedName

  const handleApply = async () => {
    if (!isValid || !isWailsRuntime()) return
    setApplying(true)

    const projectPath = useProjectStore.getState().projectPath
    if (!projectPath) { setApplying(false); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).go?.main?.App

    try {
      let edits: IDETextEdit[] = []

      if (isCursorMode && cursorFile && cursorLine && cursorCol) {
        // Cursor-based rename — engine determines what to rename
        edits = (await ideRenameCursor(cursorFile, cursorLine, cursorCol, newName)) || []

        // If no edits, try as a transform field rename (Rename doesn't handle field names)
        if (edits.length === 0) {
          // Find the flow name by scanning upward from the cursor
          const content = await app.ReadFile(cursorFile)
          const lines = content.split('\n')
          let detectedFlow = ''
          for (let i = cursorLine - 1; i >= 0; i--) {
            const m = lines[i].match(/^flow\s+"([^"]+)"/)
            if (m) { detectedFlow = m[1]; break }
          }
          if (detectedFlow && app.DebugLog) {
            await app.DebugLog(`RenameField fallback: flow="${detectedFlow}" field="${resolvedName}" → "${newName}"`)
          }
          if (detectedFlow) {
            const result = await ideRenameField(detectedFlow, resolvedName, newName)
            if (app.DebugLog) {
              await app.DebugLog(`RenameField result: ${result ? `${result.edits?.length || 0} edits` : 'null'}`)
            }
            if (result?.edits) edits = result.edits
          }
        }
      } else if (kind === 'field' && flowName) {
        // Rename transform field
        const result = await ideRenameField(flowName, resolvedName, newName)
        if (result) edits = result.edits
      } else {
        // Rename entity
        edits = await ideRenameEntity(kind, resolvedName, newName)
      }

      if (edits.length === 0) {
        setApplying(false)
        // Nothing to rename — close dialog
        onClose()
        return
      }

      // Group edits by file and apply them
      const editsByFile = new Map<string, IDETextEdit[]>()
      for (const edit of edits) {
        const file = edit.file
        if (!editsByFile.has(file)) editsByFile.set(file, [])
        editsByFile.get(file)!.push(edit)
      }

      for (const [absFile, fileEdits] of editsByFile) {
        const content = await app.ReadFile(absFile)
        const lines = content.split('\n')

        // Apply edits in reverse order (so line numbers stay valid)
        const sorted = [...fileEdits].sort((a, b) => b.range.start.line - a.range.start.line)
        for (const edit of sorted) {
          const startLine = edit.range.start.line - 1
          const startCol = edit.range.start.col - 1
          const endLine = edit.range.end.line - 1
          const endCol = edit.range.end.col - 1

          if (startLine === endLine) {
            const line = lines[startLine]
            lines[startLine] = line.slice(0, startCol) + edit.newText + line.slice(endCol)
          } else {
            const firstLine = lines[startLine].slice(0, startCol) + edit.newText
            const lastLine = lines[endLine].slice(endCol)
            lines.splice(startLine, endLine - startLine + 1, firstLine + lastLine)
          }
        }

        const newContent = lines.join('\n')
        await app.WriteFile(absFile, newContent)
        await ideUpdateFile(absFile, newContent)

        // Update project store
        const relPath = absFile.startsWith(projectPath + '/')
          ? absFile.slice(projectPath.length + 1)
          : absFile
        useProjectStore.getState().updateFile(relPath, newContent)
      }

      // Rename file if SOLID (single block, file name matches old name)
      if (kind !== 'field' || isCursorMode) {
        const studioStore = useStudioStore.getState()
        const nameToMatch = resolvedName
        const node = studioStore.nodes.find(n => {
          const data = n.data as { label?: string }
          return data.label && (toIdentifier(data.label) === nameToMatch || data.label === nameToMatch)
        })
        if (node) {
          const data = node.data as { hclFile?: string }
          if (data.hclFile) {
            const fileName = data.hclFile.split('/').pop() || ''
            const baseName = fileName.replace(/\.mycel$/, '')
            // If file name matches old name → rename file too
            if (baseName === currentName || baseName === toIdentifier(currentName)) {
              const dir = data.hclFile.slice(0, data.hclFile.lastIndexOf('/'))
              const newFilePath = `${dir}/${toIdentifier(newName)}.mycel`
              const absOld = projectPath + '/' + data.hclFile
              const absNew = projectPath + '/' + newFilePath

              await app.RenameFile(absOld, absNew)
              await ideRenameFile(absOld, absNew)

              // Update store
              const oldFile = useProjectStore.getState().files.find(f => f.relativePath === data.hclFile)
              if (oldFile) {
                await useProjectStore.getState().deleteFile(data.hclFile!)
                useProjectStore.getState().addFile({
                  name: `${toIdentifier(newName)}.mycel`,
                  path: newFilePath,
                  relativePath: newFilePath,
                  content: oldFile.content,
                  isDirty: false,
                })
              }

              // Update tab
              const editorStore = useEditorPanelStore.getState()
              const scoped = scopedPath(projectPath, data.hclFile)
              for (const group of editorStore.groups) {
                const tab = group.tabs.find(t => {
                  const tabRel = unscopePath(t.id).relativePath
                  return t.id === scoped || tabRel === data.hclFile
                })
                if (tab) {
                  editorStore.closeTab(group.id, tab.id)
                  editorStore.openFile(newFilePath, `${toIdentifier(newName)}.mycel`, undefined, projectPath)
                }
              }

              // Update node hclFile
              studioStore.updateNode(node.id, { hclFile: newFilePath })
            }
          }

          // Update node label
          studioStore.updateNode(node.id, { label: newName })
        }
      }

      // Refresh
      useDiagnosticsStore.getState().refreshAll()
      useHintsStore.getState().refreshHints()

      onClose()
    } catch (err) {
      console.error('Refactor failed:', err)
    } finally {
      setApplying(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); e.stopPropagation() }}
    >
      <div
        className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-[420px] p-5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-white mb-1">
          <RefreshCw className="w-4 h-4 inline-block mr-1.5 text-indigo-400" />
          Rename {kind === 'field' ? 'Field' : kind.charAt(0).toUpperCase() + kind.slice(1)}
        </h3>
        <p className="text-xs text-neutral-400 mb-4">
          {kind === 'field'
            ? `Rename transform field in flow "${flowName}"`
            : `Rename "${resolvedName}" and update all references`}
        </p>

        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isValid) handleApply()
          }}
          className="w-full bg-neutral-900 text-white text-sm px-3 py-2 rounded border border-neutral-600 outline-none focus:border-indigo-500 mb-3"
          placeholder="New name"
        />

        {loading ? (
          <p className="text-xs text-neutral-500 mb-3">Loading references...</p>
        ) : (
          <div className="mb-3">
            {refCount > 0 && (
              <p className="text-xs text-amber-400 mb-1">
                Used in {refCount} place{refCount > 1 ? 's' : ''} across {new Set(references.filter(r => r.attrName).map(r => r.file)).size} file{new Set(references.filter(r => r.attrName).map(r => r.file)).size > 1 ? 's' : ''}
              </p>
            )}
            {references.length > 0 && (
              <div className="max-h-32 overflow-y-auto text-[10px] text-neutral-500 space-y-0.5">
                {references.map((ref, i) => (
                  <div key={i}>
                    {ref.attrName ? (
                      <span>{ref.file}:{ref.line} — {ref.blockType}.{ref.attrName}</span>
                    ) : (
                      <span className="text-neutral-400">{ref.file}:{ref.line} — definition</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!isValid || applying}
            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {applying ? 'Applying...' : 'Rename'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
