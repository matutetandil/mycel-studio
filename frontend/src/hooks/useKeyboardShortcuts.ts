import { useEffect, useCallback, useState } from 'react'
import { useStudioStore } from '../stores/useStudioStore'
import { useProjectStore } from '../stores/useProjectStore'
import { useEditorPanelStore } from '../stores/useEditorPanelStore'
import { useLayoutStore } from '../stores/useLayoutStore'
import { useDebugStore } from '../stores/useDebugStore'
import EditorPanel from '../components/EditorPanel/EditorPanel'

export function useKeyboardShortcuts() {
  const { undo, redo, copyNode, pasteNode, duplicateNode, selectedNodeId, removeNode } = useStudioStore()
  const { openProject, saveProject } = useProjectStore()
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      // Toggle terminal: Ctrl/Cmd+` — works from anywhere (including Monaco/xterm)
      if (mod && e.key === '`') {
        e.preventDefault()
        EditorPanel.switchToTerminal()
        return
      }

      // Toggle view mode: Ctrl/Cmd+Shift+V — works from anywhere
      if (mod && e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault()
        useLayoutStore.getState().toggleViewMode()
        return
      }

      // Debug shortcuts — work from anywhere
      const debugState = useDebugStore.getState()
      if (e.key === 'F5' && debugState.status === 'connected' && debugState.stoppedAt) {
        e.preventDefault()
        debugState.debugContinue()
        return
      }
      if (e.key === 'F10' && debugState.status === 'connected' && debugState.stoppedAt) {
        e.preventDefault()
        debugState.debugNext()
        return
      }
      if (e.key === 'F11' && debugState.status === 'connected' && debugState.stoppedAt) {
        e.preventDefault()
        debugState.debugStepInto()
        return
      }

      const target = e.target as HTMLElement
      // Skip if typing in an input/textarea/contentEditable
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.monaco-editor') ||
        target.closest('.xterm')
      ) {
        return
      }

      // Undo: Ctrl/Cmd+Z
      if (mod && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        undo()
        return
      }

      // Redo: Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y
      if ((mod && e.shiftKey && e.key === 'z') || (mod && e.key === 'y')) {
        e.preventDefault()
        redo()
        return
      }

      // Copy: Ctrl/Cmd+C
      if (mod && e.key === 'c') {
        e.preventDefault()
        copyNode()
        return
      }

      // Paste: Ctrl/Cmd+V
      if (mod && e.key === 'v') {
        e.preventDefault()
        pasteNode()
        return
      }

      // Duplicate: Ctrl/Cmd+D
      if (mod && e.key === 'd') {
        e.preventDefault()
        duplicateNode()
        return
      }

      // Open: Ctrl/Cmd+O
      if (mod && e.key === 'o') {
        e.preventDefault()
        openProject()
        return
      }

      // Save: Ctrl/Cmd+S
      if (mod && e.key === 's') {
        e.preventDefault()
        saveProject()
        return
      }

      // Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        // React Flow handles its own delete, don't double-fire
        return
      }

      // Show shortcuts: Ctrl/Cmd+/
      if (mod && e.key === '/') {
        e.preventDefault()
        setShowShortcuts(prev => !prev)
        return
      }

      // New from template: Ctrl/Cmd+N
      if (mod && e.key === 'n') {
        e.preventDefault()
        setShowTemplates(prev => !prev)
        return
      }

      // Toggle editor panel: Ctrl/Cmd+J
      if (mod && e.key === 'j') {
        e.preventDefault()
        useEditorPanelStore.getState().toggleCollapse()
        return
      }

      // Settings: Ctrl/Cmd+,
      if (mod && e.key === ',') {
        e.preventDefault()
        setShowSettings(prev => !prev)
        return
      }

      // Escape closes dialogs
      if (e.key === 'Escape') {
        setShowShortcuts(false)
        setShowTemplates(false)
        setShowSettings(false)
      }
    },
    [undo, redo, copyNode, pasteNode, duplicateNode, selectedNodeId, removeNode, openProject, saveProject]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return { showShortcuts, setShowShortcuts, showTemplates, setShowTemplates, showSettings, setShowSettings }
}
