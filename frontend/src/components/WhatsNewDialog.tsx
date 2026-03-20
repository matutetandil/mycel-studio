import { X } from 'lucide-react'

interface WhatsNewDialogProps {
  isOpen: boolean
  onClose: () => void
  version: string
  releaseNotes: string
  onRestartNow?: () => void
}

export default function WhatsNewDialog({ isOpen, onClose, version, releaseNotes, onRestartNow }: WhatsNewDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl w-[520px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700 shrink-0">
          <h2 className="text-sm font-medium text-neutral-200">
            What's New in Mycel Studio v{version}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-neutral-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
            {releaseNotes || 'No release notes available.'}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-neutral-700 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 rounded"
          >
            Close
          </button>
          {onRestartNow && (
            <button
              onClick={() => {
                onRestartNow()
                onClose()
              }}
              className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded font-medium"
            >
              Restart Now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
