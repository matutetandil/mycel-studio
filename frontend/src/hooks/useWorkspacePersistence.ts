// Auto-save workspace state (.mycel-studio.json) when key state changes
import { useEffect, useRef, useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useProjectStore } from '../stores/useProjectStore'
import { useStudioStore } from '../stores/useStudioStore'
import { useEditorPanelStore } from '../stores/useEditorPanelStore'
import { useLayoutStore } from '../stores/useLayoutStore'
import { useTerminalStore } from '../stores/useTerminalStore'
import { useDebugStore } from '../stores/useDebugStore'
import { saveWorkspace } from '../stores/useWorkspaceStore'

export function useWorkspacePersistence() {
  const projectName = useProjectStore(s => s.projectName)
  const nodes = useStudioStore(s => s.nodes)
  const editorGroups = useEditorPanelStore(s => s.groups)
  const panelHeight = useEditorPanelStore(s => s.panelHeight)
  const isCollapsed = useEditorPanelStore(s => s.isCollapsed)
  const leftWidth = useLayoutStore(s => s.leftWidth)
  const leftCollapsed = useLayoutStore(s => s.leftCollapsed)
  const rightWidth = useLayoutStore(s => s.rightWidth)
  const rightCollapsed = useLayoutStore(s => s.rightCollapsed)
  const viewMode = useLayoutStore(s => s.viewMode)
  const terminalCount = useTerminalStore(s => s.terminals.length)
  const breakpoints = useDebugStore(s => s.breakpoints)

  const { getViewport } = useReactFlow()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  const debouncedSave = useCallback(() => {
    if (!projectName) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const viewport = getViewport()
      saveWorkspace(viewport)
    }, 2000) // 2 second debounce
  }, [projectName, getViewport])

  // Watch for changes that should trigger workspace save
  useEffect(() => {
    // Skip the initial render
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    debouncedSave()
  }, [
    // These trigger workspace save:
    nodes.length,
    JSON.stringify(nodes.map(n => ({ id: n.id, x: n.position.x, y: n.position.y }))),
    JSON.stringify(editorGroups.map(g => ({ tabs: g.tabs.map(t => t.filePath), active: g.activeTabId }))),
    panelHeight,
    isCollapsed,
    leftWidth,
    leftCollapsed,
    rightWidth,
    rightCollapsed,
    viewMode,
    terminalCount,
    breakpoints,
    debouncedSave,
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])
}
