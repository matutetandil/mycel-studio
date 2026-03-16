import { useState, useCallback } from 'react'
import { Terminal as TerminalIcon, Plus, X, Pencil, Copy } from 'lucide-react'
import { useTerminalStore } from '../../stores/useTerminalStore'
import TerminalView from './TerminalView'
import ContextMenu, { type ContextMenuItem } from '../ContextMenu'

export default function TerminalPanel() {
  const { terminals, activeTerminalId, createTerminal, closeTerminal, setActiveTerminal, renameTerminal } = useTerminalStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; termId: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleContextMenu = useCallback((e: React.MouseEvent, termId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, termId })
  }, [])

  const startRename = useCallback((termId: string) => {
    const term = terminals.find(t => t.id === termId)
    if (term) {
      setEditingId(termId)
      setEditName(term.name)
    }
  }, [terminals])

  const commitRename = useCallback(() => {
    if (editingId && editName.trim()) {
      renameTerminal(editingId, editName.trim())
    }
    setEditingId(null)
    setEditName('')
  }, [editingId, editName, renameTerminal])

  const contextMenuItems: ContextMenuItem[] = contextMenu ? [
    {
      label: 'Rename',
      icon: <Pencil className="w-3.5 h-3.5" />,
      onClick: () => startRename(contextMenu.termId),
    },
    {
      label: 'Duplicate',
      icon: <Copy className="w-3.5 h-3.5" />,
      onClick: () => {
        const term = terminals.find(t => t.id === contextMenu.termId)
        createTerminal(term?.workDir)
      },
    },
    { label: '', separator: true, onClick: () => {} },
    {
      label: 'Close',
      icon: <X className="w-3.5 h-3.5" />,
      onClick: () => closeTerminal(contextMenu.termId),
      danger: true,
    },
  ] : []

  if (terminals.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
        <div className="text-center">
          <TerminalIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-xs mb-2">No terminals open</p>
          <button
            onClick={() => createTerminal()}
            className="px-3 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700"
          >
            New Terminal
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-neutral-900">
      {/* Terminal tab bar */}
      <div className="flex items-center bg-neutral-900 border-b border-neutral-800 min-h-[33px]">
        <div className="flex-1 flex items-center overflow-x-auto">
          {terminals.map(term => (
            <div
              key={term.id}
              onClick={() => setActiveTerminal(term.id)}
              onContextMenu={(e) => handleContextMenu(e, term.id)}
              onDoubleClick={() => startRename(term.id)}
              className={`
                group flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-neutral-800 cursor-pointer shrink-0 select-none
                ${activeTerminalId === term.id
                  ? 'bg-neutral-800 text-white border-b-2 border-b-green-500'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-300'}
              `}
            >
              <TerminalIcon className="w-3 h-3 text-green-400 shrink-0" />
              {editingId === term.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') {
                      setEditingId(null)
                      setEditName('')
                    }
                    e.stopPropagation()
                  }}
                  className="bg-neutral-700 text-white text-xs px-1 py-0 rounded border border-neutral-600 outline-none w-24"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span>{term.name}</span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTerminal(term.id)
                }}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-700 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center px-2 shrink-0">
          <button
            onClick={() => createTerminal()}
            className="p-1 rounded text-neutral-500 hover:text-green-400 hover:bg-neutral-800"
            title="New Terminal"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active terminal */}
      <div className="flex-1 min-h-0">
        {terminals.map(term => (
          <div
            key={term.id}
            className="h-full w-full"
            style={{ display: term.id === activeTerminalId ? 'block' : 'none' }}
          >
            <TerminalView sessionId={term.id} />
          </div>
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
