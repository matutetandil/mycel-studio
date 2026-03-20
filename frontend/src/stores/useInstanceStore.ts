import { create } from 'zustand'
import { useMultiProjectStore, type ProjectInstance } from './useMultiProjectStore'
import { useStudioStore } from './useStudioStore'
import { useProjectStore } from './useProjectStore'
import { useEditorPanelStore, type EditorGroup, type SplitDirection } from './useEditorPanelStore'
import { useLayoutStore, type ViewMode } from './useLayoutStore'

// Serialized snapshot of an entire workspace instance
export interface WorkspaceInstanceSnapshot {
  // Multi-project state
  projects: Array<[string, ProjectInstance]>
  activeProjectId: string | null
  projectOrder: string[]

  // Layout
  viewMode: ViewMode

  // Current store states (for the active project at time of snapshot)
  studioSnapshot: {
    nodes: unknown[]
    edges: unknown[]
    selectedNodeId: string | null
    serviceConfig: unknown
    authConfig: unknown
    envConfig: unknown
    securityConfig: unknown
    pluginConfig: unknown
  }
  projectSnapshot: {
    projectPath: string | null
    projectName: string | null
    mycelRoot: string
    files: unknown[]
    activeFile: string | null
    gitBranch: string | null
  }
  editorSnapshot: {
    groups: EditorGroup[]
    activeGroupId: string
    splitDirection: SplitDirection
    splitRatio: number
    panelHeight: number
    isCollapsed: boolean
  }
}

export interface WorkspaceInstance {
  id: string
  label: string
  snapshot: WorkspaceInstanceSnapshot | null // null = currently active (live state)
}

interface InstanceState {
  instances: WorkspaceInstance[]
  activeInstanceId: string

  addInstance: () => string
  removeInstance: (id: string) => void
  switchInstance: (id: string) => void
  updateLabel: (id: string, label: string) => void
  getInstanceLabel: (id: string) => string
}

function generateInstanceId(): string {
  return `inst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function deriveLabel(): string {
  const projectName = useProjectStore.getState().projectName
  return projectName || 'New Workspace'
}

function captureSnapshot(): WorkspaceInstanceSnapshot {
  const multi = useMultiProjectStore.getState()
  const studio = useStudioStore.getState()
  const project = useProjectStore.getState()
  const editor = useEditorPanelStore.getState()
  const layout = useLayoutStore.getState()

  // Snapshot active project first
  multi.snapshotActiveProject()

  return {
    projects: Array.from(multi.projects.entries()).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]),
    activeProjectId: multi.activeProjectId,
    projectOrder: [...multi.projectOrder],
    viewMode: layout.viewMode,
    studioSnapshot: {
      nodes: JSON.parse(JSON.stringify(studio.nodes)),
      edges: JSON.parse(JSON.stringify(studio.edges)),
      selectedNodeId: studio.selectedNodeId,
      serviceConfig: JSON.parse(JSON.stringify(studio.serviceConfig)),
      authConfig: JSON.parse(JSON.stringify(studio.authConfig)),
      envConfig: JSON.parse(JSON.stringify(studio.envConfig)),
      securityConfig: JSON.parse(JSON.stringify(studio.securityConfig)),
      pluginConfig: JSON.parse(JSON.stringify(studio.pluginConfig)),
    },
    projectSnapshot: {
      projectPath: project.projectPath,
      projectName: project.projectName,
      mycelRoot: project.mycelRoot,
      files: JSON.parse(JSON.stringify(project.files)),
      activeFile: project.activeFile,
      gitBranch: project.gitBranch,
    },
    editorSnapshot: {
      groups: JSON.parse(JSON.stringify(editor.groups)),
      activeGroupId: editor.activeGroupId,
      splitDirection: editor.splitDirection,
      splitRatio: editor.splitRatio,
      panelHeight: editor.panelHeight,
      isCollapsed: editor.isCollapsed,
    },
  }
}

function restoreSnapshot(snapshot: WorkspaceInstanceSnapshot) {
  // Restore multi-project state
  const projects = new Map<string, ProjectInstance>()
  for (const [k, v] of snapshot.projects) {
    projects.set(k, v)
  }
  useMultiProjectStore.setState({
    projects,
    activeProjectId: snapshot.activeProjectId,
    projectOrder: snapshot.projectOrder,
  })

  // Restore layout
  useLayoutStore.getState().setViewMode(snapshot.viewMode)

  // Restore live stores — use eslint-disable for the any casts (Zustand setState overloads)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studioState: any = {
    nodes: snapshot.studioSnapshot.nodes,
    edges: snapshot.studioSnapshot.edges,
    selectedNodeId: snapshot.studioSnapshot.selectedNodeId,
    serviceConfig: snapshot.studioSnapshot.serviceConfig,
    authConfig: snapshot.studioSnapshot.authConfig,
    envConfig: snapshot.studioSnapshot.envConfig,
    securityConfig: snapshot.studioSnapshot.securityConfig,
    pluginConfig: snapshot.studioSnapshot.pluginConfig,
  }
  useStudioStore.setState(studioState)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useProjectStore.setState(snapshot.projectSnapshot as any)

  useEditorPanelStore.setState(snapshot.editorSnapshot)
}

// Initialize with a default instance
const defaultInstanceId = generateInstanceId()

export const useInstanceStore = create<InstanceState>((set, get) => ({
  instances: [{ id: defaultInstanceId, label: 'Workspace', snapshot: null }],
  activeInstanceId: defaultInstanceId,

  addInstance: () => {
    const state = get()
    const id = generateInstanceId()

    // Snapshot current active instance
    const updatedInstances = state.instances.map(inst =>
      inst.id === state.activeInstanceId
        ? { ...inst, label: deriveLabel(), snapshot: captureSnapshot() }
        : inst
    )

    // Clear stores for new empty workspace
    useStudioStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      serviceConfig: { name: 'my-service', version: '1.0.0' },
    })
    useProjectStore.setState({
      projectPath: null,
      projectName: null,
      mycelRoot: '',
      files: [],
      activeFile: null,
      gitBranch: null,
    })
    useEditorPanelStore.setState({
      groups: [{ id: 'main', tabs: [], activeTabId: null }],
      activeGroupId: 'main',
      splitDirection: null,
    })
    useMultiProjectStore.setState({
      projects: new Map(),
      activeProjectId: null,
      projectOrder: [],
    })

    const newInstance: WorkspaceInstance = { id, label: 'New Workspace', snapshot: null }

    set({
      instances: [...updatedInstances, newInstance],
      activeInstanceId: id,
    })

    return id
  },

  removeInstance: (id) => {
    const state = get()
    if (state.instances.length <= 1) return // Can't remove last instance

    const remaining = state.instances.filter(inst => inst.id !== id)
    const wasActive = state.activeInstanceId === id

    if (wasActive) {
      // Switch to next available instance
      const newActive = remaining[0]
      if (newActive.snapshot) {
        restoreSnapshot(newActive.snapshot)
        newActive.snapshot = null
      }
      set({ instances: remaining, activeInstanceId: newActive.id })
    } else {
      set({ instances: remaining })
    }
  },

  switchInstance: (id) => {
    const state = get()
    if (state.activeInstanceId === id) return

    const target = state.instances.find(inst => inst.id === id)
    if (!target) return

    // Snapshot current instance
    const updatedInstances = state.instances.map(inst =>
      inst.id === state.activeInstanceId
        ? { ...inst, label: deriveLabel(), snapshot: captureSnapshot() }
        : inst
    )

    // Restore target instance
    if (target.snapshot) {
      restoreSnapshot(target.snapshot)
    }

    // Mark target as active (no snapshot needed since it's live)
    set({
      instances: updatedInstances.map(inst =>
        inst.id === id ? { ...inst, snapshot: null } : inst
      ),
      activeInstanceId: id,
    })
  },

  updateLabel: (id, label) => {
    set(state => ({
      instances: state.instances.map(inst =>
        inst.id === id ? { ...inst, label } : inst
      ),
    }))
  },

  getInstanceLabel: (id) => {
    const inst = get().instances.find(i => i.id === id)
    if (!inst) return 'Workspace'
    if (inst.snapshot === null) return deriveLabel()
    return inst.label
  },
}))
