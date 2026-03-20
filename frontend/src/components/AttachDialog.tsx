// Dialog shown when opening/creating a project while another is already open.
// Options: Attach to workspace (shared IDE) or Open in new tab (independent instance).

import { createPortal } from 'react-dom'
import { Layers, Plus } from 'lucide-react'

interface AttachDialogProps {
  isOpen: boolean
  projectName: string
  onAttach: () => void
  onNewTab: () => void
  onCancel: () => void
}

export default function AttachDialog({ isOpen, projectName, onAttach, onNewTab, onCancel }: AttachDialogProps) {
  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={onCancel}
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); e.stopPropagation() }}
    >
      <div
        className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-96 p-5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-white mb-1">Open Project</h3>
        <p className="text-xs text-neutral-400 mb-4">
          How would you like to open <span className="text-white font-medium">{projectName || 'this project'}</span>?
        </p>

        <div className="flex flex-col gap-2">
          {/* Attach option */}
          <button
            onClick={onAttach}
            className="flex items-start gap-3 p-3 rounded-lg border border-neutral-700 hover:border-indigo-500 hover:bg-neutral-750 transition-colors text-left group"
          >
            <Layers className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-white group-hover:text-indigo-300">Attach to Workspace</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                Add to the current workspace. Share the IDE, separate canvas.
              </div>
            </div>
          </button>

          {/* New Tab option */}
          <button
            onClick={onNewTab}
            className="flex items-start gap-3 p-3 rounded-lg border border-neutral-700 hover:border-green-500 hover:bg-neutral-750 transition-colors text-left group"
          >
            <Plus className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-white group-hover:text-green-300">Open in New Tab</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                Open in a completely independent workspace tab.
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
