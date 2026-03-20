import { create } from 'zustand'
import type { Edge } from '@xyflow/react'
import type { ServiceConfig, AuthConfig, EnvironmentConfig, SecurityConfig, PluginConfig } from '../types'
import { useStudioStore } from './useStudioStore'
import { useProjectStore, type ProjectFile } from './useProjectStore'
import { useEditorPanelStore, type EditorGroup, type SplitDirection } from './useEditorPanelStore'
import { useDebugStore } from './useDebugStore'
import type { FSCapabilities } from '../lib/fileSystem'

// A snapshot of all per-project state
export interface ProjectInstance {
  id: string
  projectPath: string | null
  projectName: string | null
  mycelRoot: string
  files: ProjectFile[]
  activeFile: string | null
  gitBranch: string | null
  capabilities: FSCapabilities

  // Canvas state (from useStudioStore)
  nodes: unknown[] // StudioNode[] — using unknown to avoid circular type deps
  edges: Edge[]
  selectedNodeId: string | null
  serviceConfig: ServiceConfig
  authConfig: AuthConfig
  envConfig: EnvironmentConfig
  securityConfig: SecurityConfig
  pluginConfig: PluginConfig

  // Editor state (from useEditorPanelStore)
  editorGroups: EditorGroup[]
  editorActiveGroupId: string
  editorSplitDirection: SplitDirection
  editorSplitRatio: number
  editorPanelHeight: number
  editorIsCollapsed: boolean

  // Debug
  runtimeUrl: string

  // Canvas viewport
  canvasViewport: { zoom: number; x: number; y: number }
}

interface MultiProjectState {
  projects: Map<string, ProjectInstance>
  activeProjectId: string | null
  projectOrder: string[] // for rendering order in FileTree/tabs

  // Actions
  addProject: (instance: Partial<ProjectInstance> & { projectPath: string | null; projectName: string | null }) => string
  removeProject: (id: string) => void
  setActiveProject: (id: string) => void
  getProject: (id: string) => ProjectInstance | undefined
  getActiveProject: () => ProjectInstance | undefined
  updateProject: (id: string, updates: Partial<ProjectInstance>) => void

  // Snapshot helpers
  snapshotActiveProject: () => void
  restoreProject: (id: string) => void

  // Find project by path prefix
  findProjectByFilePath: (filePath: string) => ProjectInstance | undefined
}

function generateId(): string {
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Snapshot current stores into a ProjectInstance
function snapshotStores(): Omit<ProjectInstance, 'id'> {
  const studio = useStudioStore.getState()
  const project = useProjectStore.getState()
  const editor = useEditorPanelStore.getState()
  const debug = useDebugStore.getState()

  return {
    projectPath: project.projectPath,
    projectName: project.projectName,
    mycelRoot: project.mycelRoot,
    files: project.files,
    activeFile: project.activeFile,
    gitBranch: project.gitBranch,
    capabilities: project.capabilities,

    nodes: JSON.parse(JSON.stringify(studio.nodes)),
    edges: JSON.parse(JSON.stringify(studio.edges)),
    selectedNodeId: studio.selectedNodeId,
    serviceConfig: { ...studio.serviceConfig },
    authConfig: JSON.parse(JSON.stringify(studio.authConfig)),
    envConfig: JSON.parse(JSON.stringify(studio.envConfig)),
    securityConfig: JSON.parse(JSON.stringify(studio.securityConfig)),
    pluginConfig: JSON.parse(JSON.stringify(studio.pluginConfig)),

    editorGroups: JSON.parse(JSON.stringify(editor.groups)),
    editorActiveGroupId: editor.activeGroupId,
    editorSplitDirection: editor.splitDirection,
    editorSplitRatio: editor.splitRatio,
    editorPanelHeight: editor.panelHeight,
    editorIsCollapsed: editor.isCollapsed,

    runtimeUrl: debug.runtimeUrl,
    canvasViewport: { zoom: 1, x: 0, y: 0 },
  }
}

// Restore a ProjectInstance into the live stores
function restoreToStores(instance: ProjectInstance) {
  // Restore studio store
  const studio = useStudioStore.getState()
  studio.setNodes(instance.nodes as Parameters<typeof studio.setNodes>[0])
  studio.setEdges(instance.edges)
  useStudioStore.setState({
    selectedNodeId: instance.selectedNodeId,
    serviceConfig: instance.serviceConfig,
    authConfig: instance.authConfig,
    envConfig: instance.envConfig,
    securityConfig: instance.securityConfig,
    pluginConfig: instance.pluginConfig,
  })

  // Restore project store
  useProjectStore.setState({
    projectPath: instance.projectPath,
    projectName: instance.projectName,
    mycelRoot: instance.mycelRoot,
    files: instance.files,
    activeFile: instance.activeFile,
    gitBranch: instance.gitBranch,
    capabilities: instance.capabilities,
  })

  // Restore editor panel store
  useEditorPanelStore.setState({
    groups: instance.editorGroups,
    activeGroupId: instance.editorActiveGroupId,
    splitDirection: instance.editorSplitDirection,
    splitRatio: instance.editorSplitRatio,
    panelHeight: instance.editorPanelHeight,
    isCollapsed: instance.editorIsCollapsed,
  })

  // Restore debug URL
  useDebugStore.getState().setRuntimeUrl(instance.runtimeUrl)
}

export const useMultiProjectStore = create<MultiProjectState>((set, get) => ({
  projects: new Map(),
  activeProjectId: null,
  projectOrder: [],

  addProject: (partial) => {
    const id = generateId()
    const state = get()

    // Create instance with defaults
    const instance: ProjectInstance = {
      id,
      projectPath: partial.projectPath,
      projectName: partial.projectName,
      mycelRoot: partial.mycelRoot ?? '',
      files: partial.files ?? [],
      activeFile: partial.activeFile ?? null,
      gitBranch: partial.gitBranch ?? null,
      capabilities: partial.capabilities ?? { canOpenFolder: false, canWatchChanges: false, canGetGitStatus: false, persistsAcrossSessions: false, providerName: 'fallback' as const },

      nodes: partial.nodes ? JSON.parse(JSON.stringify(partial.nodes)) : [],
      edges: partial.edges ? JSON.parse(JSON.stringify(partial.edges)) : [],
      selectedNodeId: partial.selectedNodeId ?? null,
      serviceConfig: partial.serviceConfig ?? { name: 'my-service', version: '1.0.0' },
      authConfig: partial.authConfig ?? useStudioStore.getState().authConfig,
      envConfig: partial.envConfig ?? { variables: [], environments: [] },
      securityConfig: partial.securityConfig ?? { enabled: false, sanitizers: [] },
      pluginConfig: partial.pluginConfig ?? { plugins: [] },

      editorGroups: partial.editorGroups ?? [{ id: 'main', tabs: [], activeTabId: null }],
      editorActiveGroupId: partial.editorActiveGroupId ?? 'main',
      editorSplitDirection: partial.editorSplitDirection ?? null,
      editorSplitRatio: partial.editorSplitRatio ?? 0.5,
      editorPanelHeight: partial.editorPanelHeight ?? 256,
      editorIsCollapsed: partial.editorIsCollapsed ?? false,

      runtimeUrl: partial.runtimeUrl ?? 'ws://localhost:9090/debug',
      canvasViewport: partial.canvasViewport ?? { zoom: 1, x: 0, y: 0 },
    }

    const newProjects = new Map(state.projects)
    newProjects.set(id, instance)

    set({
      projects: newProjects,
      projectOrder: [...state.projectOrder, id],
    })

    return id
  },

  removeProject: (id) => {
    const state = get()
    const newProjects = new Map(state.projects)
    newProjects.delete(id)

    const newOrder = state.projectOrder.filter(pid => pid !== id)
    const newActiveId = state.activeProjectId === id
      ? (newOrder[0] ?? null)
      : state.activeProjectId

    set({
      projects: newProjects,
      projectOrder: newOrder,
      activeProjectId: newActiveId,
    })

    // If we switched active project, restore it
    if (newActiveId && newActiveId !== id) {
      const project = newProjects.get(newActiveId)
      if (project) restoreToStores(project)
    } else if (!newActiveId) {
      // No projects left — clear stores
      useStudioStore.setState({ nodes: [], edges: [], selectedNodeId: null })
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
    }
  },

  setActiveProject: (id) => {
    const state = get()
    if (state.activeProjectId === id) return

    const target = state.projects.get(id)
    if (!target) return

    // Snapshot current active project before switching
    if (state.activeProjectId) {
      get().snapshotActiveProject()
    }

    set({ activeProjectId: id })
    restoreToStores(target)
  },

  getProject: (id) => {
    return get().projects.get(id)
  },

  getActiveProject: () => {
    const state = get()
    if (!state.activeProjectId) return undefined
    return state.projects.get(state.activeProjectId)
  },

  updateProject: (id, updates) => {
    const state = get()
    const project = state.projects.get(id)
    if (!project) return

    const newProjects = new Map(state.projects)
    newProjects.set(id, { ...project, ...updates })
    set({ projects: newProjects })
  },

  snapshotActiveProject: () => {
    const state = get()
    if (!state.activeProjectId) return

    const snapshot = snapshotStores()
    const newProjects = new Map(state.projects)
    const existing = newProjects.get(state.activeProjectId)
    if (existing) {
      newProjects.set(state.activeProjectId, { ...existing, ...snapshot })
      set({ projects: newProjects })
    }
  },

  restoreProject: (id) => {
    const project = get().projects.get(id)
    if (project) restoreToStores(project)
  },

  findProjectByFilePath: (filePath) => {
    const state = get()
    for (const project of state.projects.values()) {
      if (!project.projectPath) continue
      // Check if file belongs to this project by checking its files
      if (project.files.some(f => f.relativePath === filePath)) {
        return project
      }
    }
    return undefined
  },
}))

// Helper: register current stores as the first project in multi-project
export function registerCurrentAsProject(): string {
  const store = useMultiProjectStore.getState()
  const project = useProjectStore.getState()

  // Check if already registered
  for (const [id, p] of store.projects) {
    if (p.projectPath === project.projectPath && p.projectName === project.projectName) {
      return id
    }
  }

  const snapshot = snapshotStores()
  const id = store.addProject({
    ...snapshot,
    projectPath: project.projectPath,
    projectName: project.projectName,
  })
  useMultiProjectStore.setState({ activeProjectId: id })
  return id
}
