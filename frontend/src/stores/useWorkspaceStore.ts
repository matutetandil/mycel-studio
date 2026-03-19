// Workspace persistence — saves/loads .mycel-studio.json
import { useStudioStore } from './useStudioStore'
import { useEditorPanelStore, type EditorTab } from './useEditorPanelStore'
import { useLayoutStore, type ViewMode } from './useLayoutStore'
import { useTerminalStore } from './useTerminalStore'
import { getFileSystemProvider } from '../lib/fileSystem'

const WORKSPACE_FILE = '.mycel-studio.json'

export interface WorkspaceState {
  version: '1.0'
  canvas: {
    zoom: number
    position: { x: number; y: number }
  }
  nodes: Record<string, { x: number; y: number }>
  editor: {
    openTabs: Array<{ filePath: string; fileName: string }>
    activeTab: string | null
    panelHeight: number
    collapsed: boolean
  }
  sidebar: {
    leftWidth: number
    leftCollapsed: boolean
    rightWidth: number
    rightCollapsed: boolean
  }
  viewMode?: ViewMode
  terminals?: Array<{ name: string; workDir: string }>
}

const DEFAULT_WORKSPACE: WorkspaceState = {
  version: '1.0',
  canvas: { zoom: 1, position: { x: 0, y: 0 } },
  nodes: {},
  editor: { openTabs: [], activeTab: null, panelHeight: 256, collapsed: false },
  sidebar: { leftWidth: 280, leftCollapsed: false, rightWidth: 400, rightCollapsed: false },
}

// Load workspace from .mycel-studio.json file content
export function loadWorkspace(content: string): WorkspaceState | null {
  try {
    const data = JSON.parse(content)
    if (data.version !== '1.0') return null
    return { ...DEFAULT_WORKSPACE, ...data }
  } catch {
    return null
  }
}

// Pending viewport to restore (consumed by Canvas component)
export let pendingViewport: { zoom: number; x: number; y: number } | null = null
export function consumePendingViewport() {
  const v = pendingViewport
  pendingViewport = null
  return v
}

// Apply loaded workspace state to stores
export function applyWorkspace(ws: WorkspaceState) {
  // Store viewport for Canvas to pick up
  pendingViewport = { zoom: ws.canvas.zoom, x: ws.canvas.position.x, y: ws.canvas.position.y }
  // Apply node positions
  const studioStore = useStudioStore.getState()
  const nodes = studioStore.nodes
  if (Object.keys(ws.nodes).length > 0 && nodes.length > 0) {
    const updatedNodes = nodes.map(n => {
      const savedPos = ws.nodes[n.id]
      return savedPos ? { ...n, position: savedPos } : n
    })
    studioStore.setNodes(updatedNodes)
  }

  // Apply editor tabs
  const editorStore = useEditorPanelStore.getState()
  if (ws.editor.openTabs.length > 0) {
    for (const tab of ws.editor.openTabs) {
      editorStore.openFile(tab.filePath, tab.fileName)
    }
    if (ws.editor.activeTab) {
      // Find which group has the active tab
      for (const group of editorStore.groups) {
        if (group.tabs.some(t => t.filePath === ws.editor.activeTab)) {
          editorStore.setActiveTab(group.id, ws.editor.activeTab)
          break
        }
      }
    }
  }
  editorStore.setPanelHeight(ws.editor.panelHeight)
  if (ws.editor.collapsed !== editorStore.isCollapsed) {
    editorStore.toggleCollapse()
  }

  // Apply sidebar layout
  const layoutStore = useLayoutStore.getState()
  layoutStore.setLeftWidth(ws.sidebar.leftWidth)
  layoutStore.setLeftCollapsed(ws.sidebar.leftCollapsed)
  layoutStore.setRightWidth(ws.sidebar.rightWidth)
  layoutStore.setRightCollapsed(ws.sidebar.rightCollapsed)

  // Restore view mode
  if (ws.viewMode) {
    useLayoutStore.getState().setViewMode(ws.viewMode)
  }

  // Restore terminals with saved names
  if (ws.terminals && ws.terminals.length > 0) {
    const termStore = useTerminalStore.getState()
    for (const saved of ws.terminals) {
      termStore.createTerminal(saved.workDir, saved.name)
    }
  }
}

// Build workspace JSON from current state
export function buildWorkspace(
  canvasViewport: { zoom: number; x: number; y: number } | null,
): WorkspaceState {
  const studioStore = useStudioStore.getState()
  const editorStore = useEditorPanelStore.getState()
  const layout = useLayoutStore.getState()

  // Collect node positions
  const nodePositions: Record<string, { x: number; y: number }> = {}
  for (const node of studioStore.nodes) {
    nodePositions[node.id] = { x: node.position.x, y: node.position.y }
  }

  // Collect open tabs from all groups
  const allTabs: EditorTab[] = []
  for (const group of editorStore.groups) {
    allTabs.push(...group.tabs)
  }
  const activeGroup = editorStore.groups.find(g => g.id === editorStore.activeGroupId)
  const activeTab = activeGroup?.activeTabId || null

  // Collect terminal state
  const terminalStore = useTerminalStore.getState()
  const terminals = terminalStore.terminals.map(t => ({
    name: t.name,
    workDir: t.workDir,
  }))

  return {
    version: '1.0',
    canvas: canvasViewport
      ? { zoom: canvasViewport.zoom, position: { x: canvasViewport.x, y: canvasViewport.y } }
      : DEFAULT_WORKSPACE.canvas,
    nodes: nodePositions,
    editor: {
      openTabs: allTabs.map(t => ({ filePath: t.filePath, fileName: t.fileName })),
      activeTab,
      panelHeight: editorStore.panelHeight,
      collapsed: editorStore.isCollapsed,
    },
    sidebar: {
      leftWidth: layout.leftWidth,
      leftCollapsed: layout.leftCollapsed,
      rightWidth: layout.rightWidth,
      rightCollapsed: layout.rightCollapsed,
    },
    viewMode: layout.viewMode !== 'visual-first' ? layout.viewMode : undefined,
    terminals: terminals.length > 0 ? terminals : undefined,
  }
}

// Save workspace to disk
export async function saveWorkspace(
  canvasViewport: { zoom: number; x: number; y: number } | null,
): Promise<boolean> {
  const provider = getFileSystemProvider()
  if (!provider.hasOpenProject()) return false

  const workspace = buildWorkspace(canvasViewport)
  try {
    return await provider.writeFile(WORKSPACE_FILE, JSON.stringify(workspace, null, 2))
  } catch (error) {
    console.error('Failed to save workspace:', error)
    return false
  }
}
