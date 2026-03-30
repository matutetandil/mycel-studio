// Dialog shown when attaching a project that has child projects.
// Options: Include Children (recursive), Ignore Children, Cancel.

import { createPortal } from 'react-dom'
import { GitBranch, FolderMinus } from 'lucide-react'

interface ChildrenDialogProps {
  isOpen: boolean
  projectName: string
  childrenCount: number
  onIncludeChildren: () => void
  onIgnoreChildren: () => void
  onCancel: () => void
}

export default function ChildrenDialog({ isOpen, projectName, childrenCount, onIncludeChildren, onIgnoreChildren, onCancel }: ChildrenDialogProps) {
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
        <h3 className="text-sm font-medium text-white mb-1">Attached Projects Detected</h3>
        <p className="text-xs text-neutral-400 mb-4">
          <span className="text-white font-medium">{projectName || 'This project'}</span> has{' '}
          <span className="text-white font-medium">{childrenCount}</span> attached project{childrenCount > 1 ? 's' : ''}.
          How would you like to load it?
        </p>

        <div className="flex flex-col gap-2">
          {/* Include Children */}
          <button
            onClick={onIncludeChildren}
            className="flex items-start gap-3 p-3 rounded-lg border border-neutral-700 hover:border-indigo-500 hover:bg-neutral-750 transition-colors text-left group"
          >
            <GitBranch className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-white group-hover:text-indigo-300">Include Children</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                Load the project and all its attached child projects.
              </div>
            </div>
          </button>

          {/* Ignore Children */}
          <button
            onClick={onIgnoreChildren}
            className="flex items-start gap-3 p-3 rounded-lg border border-neutral-700 hover:border-amber-500 hover:bg-neutral-750 transition-colors text-left group"
          >
            <FolderMinus className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-white group-hover:text-amber-300">Ignore Children</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                Load only this project. Children remain associated but won't be loaded.
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
