import { useEffect, useCallback, useState } from 'react'
import { useStudioStore } from '../stores/useStudioStore'
import { useProjectStore } from '../stores/useProjectStore'
import { useEditorPanelStore } from '../stores/useEditorPanelStore'
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

      // Copy file path: Ctrl/Cmd+Shift+V — works from anywhere
      if (mod && e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault()
        const editorStore = useEditorPanelStore.getState()
        const activeGroup = editorStore.groups.find(g => g.id === editorStore.activeGroupId)
        const activeTab = activeGroup?.tabs.find(t => t.id === activeGroup.activeTabId)
        if (activeTab) {
          navigator.clipboard.writeText(activeTab.filePath)
        }
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

      // Rename / Refactor: Shift+F6 — works from anywhere (canvas, Monaco, explorer)
      if (e.key === 'F6' && e.shiftKey) {
        e.preventDefault()
        import('../utils/refactorTrigger').then(({ triggerRefactor }) => triggerRefactor())
        return
      }

      // Go to Definition: Cmd+B (IntelliJ) — also Cmd+Click via Monaco built-in
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault()
        import('../utils/navigationUtils').then(({ goToDefinition }) => goToDefinition())
        return
      }

      // Find Usages: Alt+F7 (IntelliJ) — handled by Monaco addAction for better F-key support on macOS

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

      // Delete selected node (with confirmation dialog)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault()
        const node = useStudioStore.getState().nodes.find(n => n.id === selectedNodeId)
        if (node) {
          import('../utils/deleteUtils').then(({ deleteCanvasNode }) => {
            deleteCanvasNode(node as never)
          })
        }
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
