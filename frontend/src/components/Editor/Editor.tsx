import { useMemo, useRef, useCallback, useEffect } from 'react'
import MonacoEditor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { X, Circle, FileCode, RefreshCw } from 'lucide-react'
import { useProjectStore } from '../../stores/useProjectStore'
import { useStudioStore } from '../../stores/useStudioStore'
import { useThemeStore } from '../../stores/useThemeStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { useSync } from '../../hooks/useSync'
import { setupMonaco, createValidationRunner } from '../../monaco'

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
  const wordWrap = useSettingsStore(s => s.wordWrap)
  const { syncFromHCL, isSyncing } = useSync()
  const validationRunnerRef = useRef<ReturnType<typeof createValidationRunner> | null>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const localContentRef = useRef<string>('')
  const editSource = useStudioStore(s => s.editSource)

  const handleEditorMount = useCallback((editorInstance: editor.IStandaloneCodeEditor, monacoInstance: typeof import('monaco-editor')) => {
    editorRef.current = editorInstance
    localContentRef.current = currentFile?.content || ''
    const runner = createValidationRunner(monacoInstance)
    validationRunnerRef.current = runner

    // Run initial validation
    const model = editorInstance.getModel()
    if (model) runner(model)

    // Validate on content change
    editorInstance.onDidChangeModelContent(() => {
      const m = editorInstance.getModel()
      if (m) runner(m)
    })

    // Focus tracking
    editorInstance.onDidFocusEditorText(() => {
      useStudioStore.getState().setEditSource('monaco')
    })
    editorInstance.onDidBlurEditorText(() => {
      const { editSource: es } = useStudioStore.getState()
      if (es === 'monaco') useStudioStore.getState().setEditSource(null)
    })
  }, [])

  const openFiles = useMemo(
    () => files.filter((f) => f.name.endsWith('.mycel')),
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

  // Apply external content changes imperatively (preserve cursor)
  useEffect(() => {
    const ed = editorRef.current
    if (!ed || !currentFile) return
    if (editSource === 'monaco') return
    if (currentFile.content === localContentRef.current) return

    const model = ed.getModel()
    if (!model) return

    const position = ed.getPosition()
    const scrollTop = ed.getScrollTop()
    const scrollLeft = ed.getScrollLeft()

    model.pushEditOperations(
      [],
      [{ range: model.getFullModelRange(), text: currentFile.content }],
      () => null
    )
    localContentRef.current = currentFile.content

    if (position) ed.setPosition(position)
    ed.setScrollTop(scrollTop)
    ed.setScrollLeft(scrollLeft)
  }, [currentFile?.content, editSource])

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
            key={currentFile.path}
            height="100%"
            language="hcl"
            theme={theme === 'dark' ? 'mycel-dark' : 'mycel-light'}
            beforeMount={setupMonaco}
            onMount={handleEditorMount}
            defaultValue={currentFile.content}
            onChange={(value) => {
              if (value !== undefined) {
                localContentRef.current = value
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
              wordWrap: wordWrap ? 'on' : 'off',
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
