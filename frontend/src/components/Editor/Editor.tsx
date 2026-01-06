import { useMemo } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { X, Circle, FileCode, RefreshCw } from 'lucide-react'
import { useProjectStore } from '../../stores/useProjectStore'
import { useThemeStore } from '../../stores/useThemeStore'
import { useSync } from '../../hooks/useSync'

interface TabProps {
  file: {
    name: string
    path: string
    isDirty: boolean
  }
  isActive: boolean
  onClick: () => void
  onClose: () => void
}

function Tab({ file, isActive, onClick, onClose }: TabProps) {
  return (
    <div
      className={`
        group flex items-center gap-2 px-3 py-1.5 text-sm border-r border-neutral-800 cursor-pointer
        ${isActive ? 'bg-neutral-800 text-white' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-850'}
      `}
      onClick={onClick}
    >
      <FileCode className="w-3.5 h-3.5 text-amber-500" />
      <span className="max-w-32 truncate">{file.name}</span>
      {file.isDirty && (
        <Circle className="w-2 h-2 fill-current text-amber-500" />
      )}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-700"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

export default function Editor() {
  const { files, activeFile, setActiveFile, updateFile } = useProjectStore()
  const { theme } = useThemeStore()
  const { syncFromHCL, isSyncing } = useSync()

  const openFiles = useMemo(
    () => files.filter((f) => f.name.endsWith('.hcl')),
    [files]
  )

  const currentFile = useMemo(
    () => files.find((f) => f.path === activeFile),
    [files, activeFile]
  )

  const handleClose = (path: string) => {
    const remaining = openFiles.filter((f) => f.path !== path)
    if (activeFile === path && remaining.length > 0) {
      setActiveFile(remaining[0].path)
    } else if (remaining.length === 0) {
      setActiveFile(null)
    }
  }

  if (openFiles.length === 0) {
    return (
      <div className="h-full bg-neutral-900 flex items-center justify-center text-neutral-500 text-sm">
        <div className="text-center">
          <FileCode className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No files open</p>
          <p className="text-xs mt-1">Select a file from the explorer</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      {/* Tabs */}
      <div className="flex items-center bg-neutral-900 border-b border-neutral-800 overflow-x-auto">
        {openFiles.map((file) => (
          <Tab
            key={file.path}
            file={file}
            isActive={activeFile === file.path}
            onClick={() => setActiveFile(file.path)}
            onClose={() => handleClose(file.path)}
          />
        ))}
        {/* Sync indicator */}
        {isSyncing && (
          <div className="ml-auto px-3 flex items-center gap-1.5 text-xs text-amber-500">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Syncing...</span>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1">
        {currentFile ? (
          <MonacoEditor
            height="100%"
            language="hcl"
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            value={currentFile.content}
            onChange={(value) => {
              if (value !== undefined) {
                updateFile(currentFile.path, value)
                // Sync HCL changes to canvas (debounced)
                syncFromHCL(value)
              }
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              renderLineHighlight: 'line',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              padding: { top: 8 },
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
            Select a file to edit
          </div>
        )}
      </div>
    </div>
  )
}
