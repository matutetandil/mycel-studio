import { X, Keyboard } from 'lucide-react'
import { useSettingsStore, type KeymapType } from '../stores/useSettingsStore'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

const KEYMAPS: { value: KeymapType; label: string; description: string }[] = [
  { value: 'idea', label: 'IntelliJ IDEA', description: 'Ctrl+D duplicate, Ctrl+Y delete line, Ctrl+W expand selection' },
  { value: 'vscode', label: 'Visual Studio Code', description: 'Default Monaco keybindings' },
]

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { keymap, setKeymap } = useSettingsStore()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); e.stopPropagation() }}
    >
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl w-[480px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-700">
          <h2 className="text-base font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Keymap Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Keyboard className="w-4 h-4 text-neutral-400" />
              <h3 className="text-sm font-medium text-white">Keymap</h3>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Choose which keyboard shortcuts the editor uses. Changes apply to newly opened editors.
            </p>
            <div className="space-y-2">
              {KEYMAPS.map((km) => (
                <label
                  key={km.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    keymap === km.value
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="keymap"
                    value={km.value}
                    checked={keymap === km.value}
                    onChange={() => setKeymap(km.value)}
                    className="mt-0.5 accent-indigo-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">{km.label}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{km.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-neutral-700">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
