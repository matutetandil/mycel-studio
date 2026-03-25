// Shows usages of an entity as a floating panel near the cursor (IntelliJ-style)
// Appears inline, not as a centered modal

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useEditorPanelStore } from '../stores/useEditorPanelStore'
import { useProjectStore } from '../stores/useProjectStore'
import type { IDEReference } from '../lib/api'

interface ReferencesPopupProps {
  isOpen: boolean
  references: IDEReference[]
  entityName: string
  entityKind: string
  onClose: () => void
}

export default function ReferencesPopup({ isOpen, references, entityName, entityKind: _entityKind, onClose }: ReferencesPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); e.stopPropagation() }
    }
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', handleKey, true)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey, true)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen, onClose])

  if (!isOpen || references.length === 0) return null

  const projectPath = useProjectStore.getState().projectPath

  const handleClick = (ref: IDEReference) => {
    if (!projectPath) return
    const relPath = ref.file.startsWith(projectPath + '/')
      ? ref.file.slice(projectPath.length + 1)
      : ref.file
    const fileName = relPath.split('/').pop() || relPath
    useEditorPanelStore.getState().openFile(relPath, fileName, undefined, projectPath)
    setTimeout(() => useEditorPanelStore.getState().setRevealLine(ref.line), 50)
    onClose()
  }

  // Position near the cursor — get from the Monaco editor's DOM
  const getPosition = () => {
    const monacoEl = document.querySelector('.monaco-editor .view-lines')
    if (!monacoEl) return { top: 200, left: 300 }
    const cursor = document.querySelector('.monaco-editor .cursor')
    if (cursor) {
      const rect = cursor.getBoundingClientRect()
      return { top: rect.bottom + 4, left: rect.left }
    }
    const rect = monacoEl.getBoundingClientRect()
    return { top: rect.top + 100, left: rect.left + 50 }
  }

  const pos = getPosition()

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-[9999] bg-neutral-800 border border-neutral-600 rounded-md shadow-2xl overflow-hidden"
      style={{
        top: Math.min(pos.top, window.innerHeight - 300),
        left: Math.min(pos.left, window.innerWidth - 400),
        minWidth: 320,
        maxWidth: 480,
        maxHeight: 240,
      }}
    >
      {/* Header */}
      <div className="px-3 py-1.5 bg-neutral-750 border-b border-neutral-700 flex items-center gap-1.5">
        <span className="text-[11px] text-neutral-400">
          Usages of <span className="text-indigo-300 font-medium">{entityName}</span>
          <span className="text-neutral-500 ml-1">— {references.length} found</span>
        </span>
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
        {references.map((ref, i) => {
          const relFile = projectPath && ref.file.startsWith(projectPath + '/')
            ? ref.file.slice(projectPath.length + 1)
            : ref.file
          return (
            <button
              key={i}
              onClick={() => handleClick(ref)}
              className="w-full flex items-baseline gap-2 px-3 py-1.5 text-left hover:bg-indigo-600/20 text-xs"
              autoFocus={i === 0}
            >
              <span className="text-neutral-400 shrink-0">{relFile}</span>
              <span className="text-neutral-600">:</span>
              <span className="text-neutral-500">{ref.line}</span>
              {ref.blockName && (
                <>
                  <span className="text-neutral-600">—</span>
                  <span className="text-neutral-300">{ref.blockType} "{ref.blockName}"</span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>,
    document.body
  )
}
