// Workspace persistence — saves/loads .mycel-studio.json
import { useStudioStore } from './useStudioStore'
import { useEditorPanelStore, type EditorTab } from './useEditorPanelStore'
import { useLayoutStore, type ViewMode } from './useLayoutStore'
import { useTerminalStore } from './useTerminalStore'
import { useDebugStore, type BreakpointSpec } from './useDebugStore'
import { getFileSystemProvider } from '../lib/fileSystem'
import { getTerminalBackend } from '../lib/terminal'

const WORKSPACE_FILE = '.mycel-studio.json'

export interface WorkspaceState {
  version: '1.0'
  canvas: {
    zoom: number
    position: { x: number; y: number }
  }
  nodes: Record<string, { x: number; y: number }>
  editor: {
    openTabs: Array<{ filePath: string; fileName: string; type?: 'file' | 'canvas'; projectId?: string }>
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
  breakpoints?: Record<string, BreakpointSpec[]>
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
      // Re-read state after all tabs have been opened
      const currentGroups = useEditorPanelStore.getState().groups
      for (const group of currentGroups) {
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

  // Restore breakpoints
  if (ws.breakpoints && Object.keys(ws.breakpoints).length > 0) {
    const bpMap = new Map<string, BreakpointSpec[]>()
    for (const [flow, specs] of Object.entries(ws.breakpoints)) {
      bpMap.set(flow, specs)
    }
    useDebugStore.setState({ breakpoints: bpMap })
  }

  // Restore terminals sequentially (order matters)
  // Only restore if no terminals exist yet (prevents duplication on re-apply)
  if (ws.terminals && ws.terminals.length > 0) {
    const termStore = useTerminalStore.getState()
    if (termStore.terminals.length === 0) {
      const restoreTerminals = async () => {
        for (const saved of ws.terminals!) {
          await termStore.createTerminal(saved.workDir, saved.name)
        }
      }
      restoreTerminals()
    }
  }
}

// Serialize breakpoints Map to plain object for JSON
function serializeBreakpoints(): Record<string, BreakpointSpec[]> | undefined {
  const bps = useDebugStore.getState().breakpoints
  if (bps.size === 0) return undefined
  const obj: Record<string, BreakpointSpec[]> = {}
  for (const [flow, specs] of bps) {
    if (specs.length > 0) obj[flow] = specs
  }
  return Object.keys(obj).length > 0 ? obj : undefined
}

// Build workspace JSON from current state
export async function buildWorkspace(
  canvasViewport: { zoom: number; x: number; y: number } | null,
): Promise<WorkspaceState> {
  const studioStore = useStudioStore.getState()
  const editorStore = useEditorPanelStore.getState()
  const layout = useLayoutStore.getState()

  // Collect node positions
  const nodePositions: Record<string, { x: number; y: number }> = {}
  for (const node of studioStore.nodes) {
    nodePositions[node.id] = { x: node.position.x, y: node.position.y }
  }

  // Collect open tabs from all groups (skip canvas tabs — they're ephemeral)
  const allTabs: EditorTab[] = []
  for (const group of editorStore.groups) {
    allTabs.push(...group.tabs.filter(t => t.type !== 'canvas'))
  }
  const activeGroup = editorStore.groups.find(g => g.id === editorStore.activeGroupId)
  const activeTab = activeGroup?.activeTabId || null

  // Collect terminal state with live CWDs
  const terminalStore = useTerminalStore.getState()
  const backend = getTerminalBackend()
  const terminals = await Promise.all(
    terminalStore.terminals.map(async (t) => {
      const cwd = await backend.getCwd(t.id).catch(() => '')
      return {
        name: t.name,
        workDir: cwd || t.workDir,
      }
    })
  )

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
    breakpoints: serializeBreakpoints(),
  }
}

// Save workspace to disk
export async function saveWorkspace(
  canvasViewport: { zoom: number; x: number; y: number } | null,
): Promise<boolean> {
  const provider = getFileSystemProvider()
  if (!provider.hasOpenProject()) return false

  const workspace = await buildWorkspace(canvasViewport)
  try {
    return await provider.writeFile(WORKSPACE_FILE, JSON.stringify(workspace, null, 2))
  } catch (error) {
    console.error('Failed to save workspace:', error)
    return false
  }
}
