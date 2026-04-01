// Dialog shown when opening a project while another is already open.
// Options: This Window, Attach to Workspace, New Tab, Cancel.

import { createPortal } from 'react-dom'
import { FolderOpen, Layers, AppWindow } from 'lucide-react'

interface AttachDialogProps {
  isOpen: boolean
  projectName: string
  onThisWindow: () => void
  onAttach: () => void
  onNewWindow: () => void
  onCancel: () => void
}

export default function AttachDialog({ isOpen, projectName, onThisWindow, onAttach: _onAttach, onNewWindow, onCancel }: AttachDialogProps) {
  void _onAttach // reserved for future use
  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={onCancel}
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); e.stopPropagation() }}
    >
      <div
        className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-[420px] p-5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-white mb-1">Open Project</h3>
        <p className="text-xs text-neutral-400 mb-4">
          How would you like to open <span className="text-white font-medium">{projectName || 'this project'}</span>?
        </p>

        <div className="flex flex-col gap-2">
          {/* This Window */}
          <button
            onClick={onThisWindow}
            className="flex items-start gap-3 p-3 rounded-lg border border-neutral-700 hover:border-amber-500 hover:bg-neutral-750 transition-colors text-left group"
          >
            <FolderOpen className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-white group-hover:text-amber-300">This Window</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                Close the current project and open the new one in its place.
              </div>
            </div>
          </button>

          {/* Attach (disabled — coming soon) */}
          <div
            className="flex items-start gap-3 p-3 rounded-lg border border-neutral-700 opacity-50 cursor-not-allowed text-left"
          >
            <Layers className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-neutral-400">
                Attach to Workspace
                <span className="ml-2 text-[10px] font-normal text-indigo-400/70 uppercase tracking-wide">coming soon</span>
              </div>
              <div className="text-xs text-neutral-600 mt-0.5">
                Multi-project workspaces are being redesigned. Stay tuned!
              </div>
            </div>
          </div>

          {/* New Window */}
          <button
            onClick={onNewWindow}
            className="flex items-start gap-3 p-3 rounded-lg border border-neutral-700 hover:border-green-500 hover:bg-neutral-750 transition-colors text-left group"
          >
            <AppWindow className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-white group-hover:text-green-300">New Window</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                Open in a completely independent window.
              </div>
            </div>
          </button>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded hover:bg-neutral-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
