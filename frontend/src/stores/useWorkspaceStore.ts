// Workspace persistence — saves/loads .mycel-studio.json
import { useStudioStore } from './useStudioStore'
import { useEditorPanelStore, scopedPath, unscopePath, type EditorTab } from './useEditorPanelStore'
import { useLayoutStore, type ViewMode } from './useLayoutStore'
import { useTerminalStore } from './useTerminalStore'
import { useDebugStore, type BreakpointSpec } from './useDebugStore'
import { useProjectStore } from './useProjectStore'
import { getFileSystemProvider } from '../lib/fileSystem'
import { getTerminalBackend } from '../lib/terminal'

const WORKSPACE_FILE = '.mycel-studio.json'

export interface WorkspaceAttachment {
  role: 'parent' | 'child'
  attachments?: string[]  // Absolute paths of child projects (only for parent)
  parent?: string         // Absolute path of parent project (only for child)
}

export interface WorkspaceState {
  version: '1.0' | '1.1'
  workspace?: WorkspaceAttachment
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
    if (data.version !== '1.0' && data.version !== '1.1') return null
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

  // Apply editor tabs (pass projectPath so tabs get scoped IDs)
  const editorStore = useEditorPanelStore.getState()
  const currentProjectPath = useProjectStore.getState().projectPath
  if (ws.editor.openTabs.length > 0) {
    for (const tab of ws.editor.openTabs) {
      editorStore.openFile(tab.filePath, tab.fileName, undefined, currentProjectPath)
    }
    if (ws.editor.activeTab) {
      // Re-read state after all tabs have been opened
      // The stored activeTab is an unscoped relative path — find the matching scoped tab
      const currentGroups = useEditorPanelStore.getState().groups
      const scoped = scopedPath(currentProjectPath, ws.editor.activeTab)
      for (const group of currentGroups) {
        const matchingTab = group.tabs.find(t => t.id === scoped || t.id === ws.editor.activeTab)
        if (matchingTab) {
          editorStore.setActiveTab(group.id, matchingTab.id)
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
// If projectPath is provided, build workspace for that specific project
// If attachment is provided, include it in the workspace
export async function buildWorkspace(
  canvasViewport: { zoom: number; x: number; y: number } | null,
  attachment?: WorkspaceAttachment,
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
  // Store unscoped relative paths in workspace file for portability
  const allTabs: EditorTab[] = []
  for (const group of editorStore.groups) {
    allTabs.push(...group.tabs.filter(t => t.type !== 'canvas'))
  }
  const activeGroup = editorStore.groups.find(g => g.id === editorStore.activeGroupId)
  const activeTab = activeGroup?.activeTabId || null
  // Unscope the active tab ID for storage
  const unscopedActiveTab = activeTab ? unscopePath(activeTab).relativePath : null

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
    version: attachment ? '1.1' : '1.0',
    workspace: attachment,
    canvas: canvasViewport
      ? { zoom: canvasViewport.zoom, position: { x: canvasViewport.x, y: canvasViewport.y } }
      : DEFAULT_WORKSPACE.canvas,
    nodes: nodePositions,
    editor: {
      openTabs: allTabs.map(t => {
        const { relativePath } = unscopePath(t.filePath)
        return { filePath: relativePath, fileName: t.fileName }
      }),
      activeTab: unscopedActiveTab,
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

// Save workspace to disk — auto-detects multi-project mode
export async function saveWorkspace(
  canvasViewport: { zoom: number; x: number; y: number } | null,
): Promise<boolean> {
  // Check if multi-project mode is active
  const { useMultiProjectStore } = await import('./useMultiProjectStore')
  const multiStore = useMultiProjectStore.getState()
  if (multiStore.projects.size > 1) {
    return saveAllProjectWorkspaces(canvasViewport)
  }

  // Single project save
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

// Build a workspace state for a specific project snapshot (used for multi-project save)
function buildWorkspaceForSnapshot(
  snapshot: import('./useMultiProjectStore').ProjectInstance,
  attachment?: WorkspaceAttachment,
  sharedSidebar?: WorkspaceState['sidebar'],
  sharedViewMode?: ViewMode,
  sharedTerminals?: WorkspaceState['terminals'],
  sharedBreakpoints?: WorkspaceState['breakpoints'],
): WorkspaceState {
  // Collect node positions from snapshot
  const nodePositions: Record<string, { x: number; y: number }> = {}
  for (const node of snapshot.nodes as Array<{ id: string; position: { x: number; y: number } }>) {
    nodePositions[node.id] = { x: node.position.x, y: node.position.y }
  }

  // Collect editor tabs that belong to this project
  const projectTabs: Array<{ filePath: string; fileName: string }> = []
  let projectActiveTab: string | null = null
  for (const group of snapshot.editorGroups) {
    for (const tab of group.tabs) {
      if (tab.type === 'canvas') continue
      const { projectPath: pp, relativePath } = unscopePath(tab.filePath)
      // Include tab if it belongs to this project or is unscoped
      if (!pp || pp === snapshot.projectPath) {
        projectTabs.push({ filePath: relativePath, fileName: tab.fileName })
        if (tab.id === group.activeTabId) {
          projectActiveTab = relativePath
        }
      }
    }
  }

  return {
    version: attachment ? '1.1' : '1.0',
    workspace: attachment,
    canvas: {
      zoom: snapshot.canvasViewport.zoom,
      position: { x: snapshot.canvasViewport.x, y: snapshot.canvasViewport.y },
    },
    nodes: nodePositions,
    editor: {
      openTabs: projectTabs,
      activeTab: projectActiveTab,
      panelHeight: snapshot.editorPanelHeight,
      collapsed: snapshot.editorIsCollapsed,
    },
    // Only parent gets shared UI state
    sidebar: sharedSidebar ?? DEFAULT_WORKSPACE.sidebar,
    viewMode: sharedViewMode,
    terminals: sharedTerminals,
    breakpoints: sharedBreakpoints,
  }
}

// Save workspace for ALL attached projects (multi-project mode)
// Each project gets its own .mycel-studio.json with correct attachment references
export async function saveAllProjectWorkspaces(
  canvasViewport: { zoom: number; x: number; y: number } | null,
): Promise<boolean> {
  const { useMultiProjectStore } = await import('./useMultiProjectStore')
  const multiStore = useMultiProjectStore.getState()

  // If no multi-project, fall back to single save
  if (multiStore.projects.size <= 1) {
    return saveWorkspace(canvasViewport)
  }

  // Snapshot the active project first
  multiStore.snapshotActiveProject()

  // Determine parent project (the root — the one opened first)
  const parentId = multiStore.rootProjectId || multiStore.projectOrder[0]
  const parentProject = multiStore.projects.get(parentId)
  if (!parentProject?.projectPath) return false

  // Collect child paths (everything that's not the parent)
  const childPaths: string[] = []
  for (const id of multiStore.projectOrder) {
    if (id === parentId) continue
    const proj = multiStore.projects.get(id)
    if (proj?.projectPath) childPaths.push(proj.projectPath)
  }

  // Build shared UI state (only saved to parent)
  const layout = useLayoutStore.getState()
  const terminalStore = useTerminalStore.getState()
  const backend = getTerminalBackend()
  const terminals = await Promise.all(
    terminalStore.terminals.map(async (t) => {
      const cwd = await backend.getCwd(t.id).catch(() => '')
      return { name: t.name, workDir: cwd || t.workDir }
    })
  )
  const breakpoints = serializeBreakpoints()
  const sidebar = {
    leftWidth: layout.leftWidth,
    leftCollapsed: layout.leftCollapsed,
    rightWidth: layout.rightWidth,
    rightCollapsed: layout.rightCollapsed,
  }
  const viewMode = layout.viewMode !== 'visual-first' ? layout.viewMode : undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).go?.main?.App
  if (!app?.WriteFileAtPath) {
    console.error('WriteFileAtPath not available — cannot save multi-project workspace')
    return false
  }

  try {
    // Save each project
    for (const id of multiStore.projectOrder) {
      const proj = multiStore.projects.get(id)
      if (!proj?.projectPath) continue

      // Update viewport for active project
      if (id === multiStore.activeProjectId && canvasViewport) {
        proj.canvasViewport = canvasViewport
      }

      const isParent = id === parentId
      const attachment: WorkspaceAttachment = isParent
        ? { role: 'parent', attachments: childPaths }
        : { role: 'child', parent: parentProject.projectPath! }

      const ws = buildWorkspaceForSnapshot(
        proj,
        attachment,
        isParent ? sidebar : undefined,
        isParent ? viewMode : undefined,
        isParent ? (terminals.length > 0 ? terminals : undefined) : undefined,
        isParent ? breakpoints : undefined,
      )

      const filePath = `${proj.projectPath}/${WORKSPACE_FILE}`
      await app.WriteFileAtPath(filePath, JSON.stringify(ws, null, 2))
    }

    return true
  } catch (error) {
    console.error('Failed to save multi-project workspace:', error)
    return false
  }
}
