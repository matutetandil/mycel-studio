import { useState } from 'react'
import {
  FolderOpen,
  Moon,
  Sun,
  Settings,
  ChevronDown,
  GitBranch,
  Loader2,
  Package,
} from 'lucide-react'
import { useThemeStore } from '../../stores/useThemeStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useStudioStore } from '../../stores/useStudioStore'
import { useHistoryStore } from '../../stores/useHistoryStore'
import { useLayoutStore } from '../../stores/useLayoutStore'

interface MenuItem {
  label?: string
  shortcut?: string
  onClick?: () => void
  disabled?: boolean
  separator?: boolean
  checked?: boolean
}

interface MenuItemProps {
  label: string
  items: MenuItem[]
}

function MenuDropdown({ label, items }: MenuItemProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        className="px-3 py-1 text-sm hover:bg-neutral-700 rounded flex items-center gap-1"
      >
        {label}
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-md shadow-lg min-w-[200px] py-1 z-50">
          {items.map((item, index) =>
            item.separator ? (
              <div
                key={index}
                className="border-t border-neutral-700 my-1"
              />
            ) : (
              <button
                key={index}
                onClick={() => {
                  item.onClick?.()
                  setIsOpen(false)
                }}
                disabled={item.disabled}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="w-4 text-center shrink-0 text-xs">
                  {item.checked !== undefined ? (item.checked ? '✓' : '') : ''}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-neutral-500 text-xs">
                    {item.shortcut}
                  </span>
                )}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

interface MenuBarProps {
  onShowShortcuts?: () => void
  onShowTemplates?: () => void
  onShowAbout?: () => void
  onShowSettings?: () => void
}

export default function MenuBar({ onShowShortcuts, onShowTemplates, onShowAbout, onShowSettings }: MenuBarProps) {
  const { theme, toggleTheme } = useThemeStore()
  const { projectName, files, isLoading, gitBranch, capabilities, newProject, openProject, saveProject, closeProject } = useProjectStore()
  const { undo, redo, copyNode, pasteNode, duplicateNode, selectedNodeId, clipboard } = useStudioStore()
  const historyStore = useHistoryStore()
  const viewMode = useLayoutStore((s) => s.viewMode)

  const hasUnsavedChanges = files.some((f) => f.isDirty)

  // Get open label based on provider
  const getOpenLabel = () => {
    if (capabilities.canOpenFolder) {
      return 'Open Project...'
    }
    return 'Import ZIP...'
  }

  // Get save label based on provider
  const getSaveLabel = () => {
    if (capabilities.providerName === 'fallback') {
      return 'Export ZIP'
    }
    return 'Save All'
  }

  const fileMenu = {
    label: 'File',
    items: [
      {
        label: 'New Project...',
        shortcut: 'Ctrl+Shift+N',
        onClick: () => newProject(),
      },
      {
        label: 'New from Template...',
        shortcut: 'Ctrl+N',
        onClick: onShowTemplates,
      },
      { separator: true },
      {
        label: getOpenLabel(),
        shortcut: 'Ctrl+O',
        onClick: () => openProject(),
      },
      {
        label: getSaveLabel(),
        shortcut: 'Ctrl+S',
        onClick: () => saveProject(),
        disabled: !hasUnsavedChanges && !projectName,
      },
      { separator: true },
      {
        label: 'Close Project',
        onClick: () => closeProject(),
        disabled: !projectName,
      },
    ],
  }

  const editMenu = {
    label: 'Edit',
    items: [
      { label: 'Undo', shortcut: 'Ctrl+Z', onClick: undo, disabled: !historyStore.canUndo() },
      { label: 'Redo', shortcut: 'Ctrl+Shift+Z', onClick: redo, disabled: !historyStore.canRedo() },
      { separator: true },
      { label: 'Copy', shortcut: 'Ctrl+C', onClick: copyNode, disabled: !selectedNodeId },
      { label: 'Paste', shortcut: 'Ctrl+V', onClick: pasteNode, disabled: !clipboard },
      { label: 'Duplicate', shortcut: 'Ctrl+D', onClick: duplicateNode, disabled: !selectedNodeId },
    ],
  }

  const setViewMode = useLayoutStore((s) => s.setViewMode)

  const viewMenu = {
    label: 'View',
    items: [
      { label: 'Visual First Mode', checked: viewMode === 'visual-first', onClick: () => setViewMode('visual-first') },
      { label: 'Text First Mode', checked: viewMode === 'text-first', onClick: () => setViewMode('text-first') },
      { separator: true },
      { label: 'Toggle Dark Mode', onClick: toggleTheme },
      { separator: true },
      { label: 'Zoom In', shortcut: 'Ctrl++', onClick: () => {} },
      { label: 'Zoom Out', shortcut: 'Ctrl+-', onClick: () => {} },
      { label: 'Fit to Screen', shortcut: 'Ctrl+0', onClick: () => {} },
      { separator: true },
      { label: 'Settings...', shortcut: 'Ctrl+,', onClick: onShowSettings },
    ],
  }

  const helpMenu = {
    label: 'Help',
    items: [
      { label: 'Documentation', onClick: () => window.open('https://github.com/matutetandil/mycel', '_blank') },
      { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/', onClick: onShowShortcuts },
      { separator: true },
      { label: 'About Mycel Studio', onClick: onShowAbout },
    ],
  }

  return (
    <header className="h-10 bg-neutral-900 border-b border-neutral-800 flex items-center px-2 gap-1 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 mr-2">
        <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded" />
        <span className="font-semibold text-sm">Mycel Studio</span>
      </div>

      {/* Menus */}
      <MenuDropdown {...fileMenu} />
      <MenuDropdown {...editMenu} />
      <MenuDropdown {...viewMenu} />
      <MenuDropdown {...helpMenu} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 px-3 text-sm text-neutral-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading...</span>
        </div>
      )}

      {/* Project name and git branch */}
      {projectName && !isLoading && (
        <div className="flex items-center gap-3 px-3 text-sm text-neutral-400">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            <span>{projectName}</span>
            {hasUnsavedChanges && <span className="text-amber-500">*</span>}
          </div>
          {gitBranch && (
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <GitBranch className="w-3 h-3" />
              <span>{gitBranch}</span>
            </div>
          )}
        </div>
      )}

      {/* Show provider info when no project */}
      {!projectName && !isLoading && (
        <div className="flex items-center gap-2 px-3 text-xs text-neutral-500" title={
          capabilities.providerName === 'browser'
            ? 'Full folder access available (Chrome/Edge)'
            : 'Limited access - use ZIP import/export (Safari/Firefox)'
        }>
          <Package className="w-3 h-3" />
          <span>
            {capabilities.providerName === 'browser' && 'Full Access'}
            {capabilities.providerName === 'fallback' && 'ZIP Mode'}
          </span>
          {capabilities.providerName === 'fallback' && (
            <span className="text-amber-500">*</span>
          )}
        </div>
      )}

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 hover:bg-neutral-800 rounded"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </button>

      {/* Settings */}
      <button onClick={onShowSettings} className="p-2 hover:bg-neutral-800 rounded" title="Settings">
        <Settings className="w-4 h-4" />
      </button>
    </header>
  )
}
