import { X, Heart, ExternalLink } from 'lucide-react'

const VERSION = '1.1.0'

interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl w-[400px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <h2 className="text-sm font-medium">About Mycel Studio</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center">
          {/* Logo */}
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mb-4 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">M</span>
          </div>

          <h1 className="text-lg font-semibold mb-1">Mycel Studio</h1>
          <p className="text-sm text-neutral-400 mb-4">v{VERSION}</p>

          <p className="text-sm text-neutral-300 leading-relaxed mb-6">
            A visual editor for creating Mycel microservice configurations.
            Design your data pipelines visually, generate production-ready HCL,
            and debug them in real time.
          </p>

          <div className="w-full border-t border-neutral-700 pt-4 mb-4">
            <p className="text-xs text-neutral-400 mb-3">
              Mycel Studio is free and open source. If you find it useful,
              consider supporting the project:
            </p>
            <a
              href="https://buymeacoffee.com/matutetandil"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-900 font-medium text-sm rounded-lg transition-colors"
            >
              <Heart className="w-4 h-4" />
              Buy me a coffee
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="text-xs text-neutral-500 space-y-1">
            <p>
              <a
                href="https://github.com/matutetandil/mycel"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-300 underline"
              >
                GitHub
              </a>
              {' '}&middot;{' '}
              <a
                href="https://github.com/matutetandil/mycel-studio"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-300 underline"
              >
                Source Code
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
