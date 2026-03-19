import { X, Keyboard } from 'lucide-react'

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')
const mod = isMac ? '⌘' : 'Ctrl'

const shortcuts = [
  { category: 'General', items: [
    { keys: `${mod}+O`, action: 'Open project' },
    { keys: `${mod}+S`, action: 'Save project' },
    { keys: `${mod}+N`, action: 'New from template' },
    { keys: `${mod}+/`, action: 'Show shortcuts' },
    { keys: `${mod}+,`, action: 'Settings' },
  ]},
  { category: 'Edit', items: [
    { keys: `${mod}+Z`, action: 'Undo' },
    { keys: `${mod}+Shift+Z`, action: 'Redo' },
    { keys: `${mod}+C`, action: 'Copy node' },
    { keys: `${mod}+V`, action: 'Paste node' },
    { keys: `${mod}+D`, action: 'Duplicate node' },
    { keys: 'Delete', action: 'Delete selected' },
  ]},
  { category: 'View', items: [
    { keys: `${mod}+Shift+V`, action: 'Toggle Visual/Text First' },
    { keys: `${mod}+J`, action: 'Toggle editor panel' },
    { keys: `${mod}+\``, action: 'Toggle terminal' },
  ]},
  { category: 'Canvas', items: [
    { keys: 'Scroll', action: 'Zoom in/out' },
    { keys: 'Click + Drag', action: 'Pan canvas' },
    { keys: 'Right-click flow', action: 'Flow block menu' },
  ]},
  { category: 'Debug', items: [
    { keys: 'F5', action: 'Continue' },
    { keys: 'F10', action: 'Step Over (next stage)' },
    { keys: 'F11', action: 'Step Into (per CEL rule)' },
    { keys: 'Click gutter', action: 'Toggle breakpoint' },
  ]},
]

interface ShortcutsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function ShortcutsDialog({ isOpen, onClose }: ShortcutsDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl w-[480px] max-h-[80vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-medium">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {shortcuts.map(group => (
            <div key={group.category}>
              <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
                {group.category}
              </h3>
              <div className="space-y-1">
                {group.items.map(shortcut => (
                  <div key={shortcut.action} className="flex items-center justify-between py-1">
                    <span className="text-sm text-neutral-300">{shortcut.action}</span>
                    <kbd className="text-xs bg-neutral-800 border border-neutral-600 rounded px-2 py-0.5 text-neutral-400 font-mono">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
