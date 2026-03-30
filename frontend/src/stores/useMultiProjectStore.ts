import { create } from 'zustand'
import type { Edge } from '@xyflow/react'
import type { ServiceConfig, AuthConfig, EnvironmentConfig, SecurityConfig, PluginConfig } from '../types'
import { useStudioStore } from './useStudioStore'
import { useProjectStore, type ProjectFile } from './useProjectStore'
import { registerSnapshotProvider } from './snapshotRegistry'
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
  rootProjectId: string | null // The project opened first (parent in workspace hierarchy)
  projectOrder: string[] // for rendering order in FileTree/tabs

  // Actions
  addProject: (instance: Partial<ProjectInstance> & { projectPath: string | null; projectName: string | null }) => string
  removeProject: (id: string) => void
  setActiveProject: (id: string) => void
  getProject: (id: string) => ProjectInstance | undefined
  getActiveProject: () => ProjectInstance | undefined
  updateProject: (id: string, updates: Partial<ProjectInstance>) => void

  // Ordering
  reorderProjects: (fromIndex: number, toIndex: number) => void
  setProjectOrder: (order: string[]) => void

  // Snapshot helpers
  snapshotActiveProject: () => void
  restoreProject: (id: string) => void

  // Find project by path prefix
  findProjectByFilePath: (filePath: string) => ProjectInstance | undefined

  // Refresh git status for ALL projects (not just active)
  refreshAllProjectsGitStatus: () => Promise<void>
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
// When preserveEditor is true, don't touch editor tabs (used in multi-project attach mode
// where files from multiple projects coexist in the same editor)
function restoreToStores(instance: ProjectInstance, preserveEditor = false) {
  // Restore studio store (canvas nodes, edges, configs)
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

  // Restore project store (files, path, git)
  useProjectStore.setState({
    projectPath: instance.projectPath,
    projectName: instance.projectName,
    mycelRoot: instance.mycelRoot,
    files: instance.files,
    activeFile: instance.activeFile,
    gitBranch: instance.gitBranch,
    capabilities: instance.capabilities,
  })

  // Only restore editor state when doing a full switch (instance tabs, NOT multi-project attach)
  if (!preserveEditor) {
    useEditorPanelStore.setState({
      groups: instance.editorGroups,
      activeGroupId: instance.editorActiveGroupId,
      splitDirection: instance.editorSplitDirection,
      splitRatio: instance.editorSplitRatio,
      panelHeight: instance.editorPanelHeight,
      isCollapsed: instance.editorIsCollapsed,
    })
  }

  // Restore debug URL
  useDebugStore.getState().setRuntimeUrl(instance.runtimeUrl)
}

export const useMultiProjectStore = create<MultiProjectState>((set, get) => ({
  projects: new Map(),
  activeProjectId: null,
  rootProjectId: null,
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

    // Insert in alphabetical order by project name
    const newOrder = [...state.projectOrder, id].sort((a, b) => {
      const nameA = (newProjects.get(a)?.projectName || '').toLowerCase()
      const nameB = (newProjects.get(b)?.projectName || '').toLowerCase()
      return nameA.localeCompare(nameB)
    })

    set({
      projects: newProjects,
      projectOrder: newOrder,
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
      if (project) restoreToStores(project, true)
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

  reorderProjects: (fromIndex, toIndex) => {
    const state = get()
    const order = [...state.projectOrder]
    const [moved] = order.splice(fromIndex, 1)
    order.splice(toIndex, 0, moved)
    set({ projectOrder: order })
  },

  setProjectOrder: (order) => {
    set({ projectOrder: order })
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
    // Preserve editor tabs — in multi-project mode, files from all projects
    // coexist in the same editor. Only canvas/files/configs switch.
    restoreToStores(target, true)
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

  refreshAllProjectsGitStatus: async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).go?.main?.App
    if (!app?.IsGitRepo || !app?.GetGitFileStatuses || !app?.GetGitBranch) return

    const state = get()
    const newProjects = new Map(state.projects)
    let changed = false

    for (const [id, project] of state.projects) {
      if (!project.projectPath) continue

      // Skip the active project — its git status is handled by useProjectStore.refreshGitStatus()
      if (id === state.activeProjectId) continue

      try {
        const isRepo = await app.IsGitRepo(project.projectPath)
        if (!isRepo) continue

        const [branch, statuses] = await Promise.all([
          app.GetGitBranch(project.projectPath),
          app.GetGitFileStatuses(project.projectPath),
        ])

        const updatedFiles = project.files.map(f => {
          const status = statuses[f.relativePath]
          let gitStatus: ProjectFile['gitStatus'] = 'clean'
          if (status) {
            switch (status) {
              case 'modified': gitStatus = 'modified'; break
              case 'added': gitStatus = 'added'; break
              case 'deleted': gitStatus = 'deleted'; break
              case 'untracked': gitStatus = 'untracked'; break
              case 'ignored': gitStatus = 'ignored'; break
              case 'staged': case 'staged_added': case 'staged_deleted':
              case 'staged_renamed': case 'staged_modified':
                gitStatus = status as ProjectFile['gitStatus']; break
              default: gitStatus = 'clean'
            }
          }
          return { ...f, gitStatus }
        })

        const updated = { ...project, gitBranch: branch, files: updatedFiles }
        newProjects.set(id, updated)
        changed = true
      } catch {
        // Git status is best-effort per project
      }
    }

    if (changed) {
      set({ projects: newProjects })
    }
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

registerSnapshotProvider('multiProject', {
  capture: () => {
    const m = useMultiProjectStore.getState()
    m.snapshotActiveProject()
    return {
      projects: Array.from(m.projects.entries()).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]),
      activeProjectId: m.activeProjectId,
      projectOrder: [...m.projectOrder],
      rootProjectId: m.rootProjectId,
    }
  },
  restore: (data) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any
    const projects = new Map<string, ProjectInstance>()
    for (const [k, v] of d.projects) projects.set(k, v)
    useMultiProjectStore.setState({
      projects, activeProjectId: d.activeProjectId,
      projectOrder: d.projectOrder, rootProjectId: d.rootProjectId,
    })
  },
  clear: () => useMultiProjectStore.setState({
    projects: new Map(), activeProjectId: null, projectOrder: [], rootProjectId: null,
  }),
})
