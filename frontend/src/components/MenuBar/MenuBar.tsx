import { useState } from 'react'
import {
  FolderOpen,
  Moon,
  Sun,
  Settings,
  ChevronDown,
} from 'lucide-react'
import { useThemeStore } from '../../stores/useThemeStore'
import { useProjectStore } from '../../stores/useProjectStore'

interface MenuItem {
  label?: string
  shortcut?: string
  onClick?: () => void
  disabled?: boolean
  separator?: boolean
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
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-between items-center"
              >
                <span>{item.label}</span>
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

export default function MenuBar() {
  const { theme, toggleTheme } = useThemeStore()
  const { projectName, files } = useProjectStore()

  const hasUnsavedChanges = files.some((f) => f.isDirty)

  const fileMenu = {
    label: 'File',
    items: [
      { label: 'Open Project...', shortcut: 'Ctrl+O', onClick: () => {} },
      { label: 'Save All', shortcut: 'Ctrl+Shift+S', onClick: () => {}, disabled: !hasUnsavedChanges },
      { separator: true },
      { label: 'Close Project', onClick: () => {} },
    ],
  }

  const editMenu = {
    label: 'Edit',
    items: [
      { label: 'Undo', shortcut: 'Ctrl+Z', onClick: () => {}, disabled: true },
      { label: 'Redo', shortcut: 'Ctrl+Y', onClick: () => {}, disabled: true },
      { separator: true },
      { label: 'Cut', shortcut: 'Ctrl+X', onClick: () => {} },
      { label: 'Copy', shortcut: 'Ctrl+C', onClick: () => {} },
      { label: 'Paste', shortcut: 'Ctrl+V', onClick: () => {} },
    ],
  }

  const viewMenu = {
    label: 'View',
    items: [
      { label: 'Toggle Dark Mode', onClick: toggleTheme },
      { separator: true },
      { label: 'Zoom In', shortcut: 'Ctrl++', onClick: () => {} },
      { label: 'Zoom Out', shortcut: 'Ctrl+-', onClick: () => {} },
      { label: 'Fit to Screen', shortcut: 'Ctrl+0', onClick: () => {} },
    ],
  }

  const helpMenu = {
    label: 'Help',
    items: [
      { label: 'Documentation', onClick: () => window.open('https://github.com/matutetandil/mycel', '_blank') },
      { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/', onClick: () => {} },
      { separator: true },
      { label: 'About Mycel Studio', onClick: () => {} },
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

      {/* Project name */}
      {projectName && (
        <div className="flex items-center gap-2 px-3 text-sm text-neutral-400">
          <FolderOpen className="w-4 h-4" />
          <span>{projectName}</span>
          {hasUnsavedChanges && <span className="text-amber-500">*</span>}
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
      <button className="p-2 hover:bg-neutral-800 rounded" title="Settings">
        <Settings className="w-4 h-4" />
      </button>
    </header>
  )
}
