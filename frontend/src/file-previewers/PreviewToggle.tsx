import { Code, Eye } from 'lucide-react'

export type PreviewMode = 'source' | 'preview'

interface PreviewToggleProps {
  mode: PreviewMode
  onToggle: (mode: PreviewMode) => void
  label?: string
}

export default function PreviewToggle({ mode, onToggle, label }: PreviewToggleProps) {
  return (
    <div className="absolute top-2 right-6 z-10 flex items-center bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden shadow-lg">
      <button
        onClick={() => onToggle('source')}
        className={`flex items-center gap-1 px-2.5 py-1 text-xs transition-colors ${
          mode === 'source'
            ? 'bg-neutral-700 text-white'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-750'
        }`}
        title="Source code"
      >
        <Code className="w-3 h-3" />
        <span>Source</span>
      </button>
      <button
        onClick={() => onToggle('preview')}
        className={`flex items-center gap-1 px-2.5 py-1 text-xs transition-colors ${
          mode === 'preview'
            ? 'bg-neutral-700 text-white'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-750'
        }`}
        title={label ? `Preview (${label})` : 'Preview'}
      >
        <Eye className="w-3 h-3" />
        <span>Preview</span>
      </button>
    </div>
  )
}
