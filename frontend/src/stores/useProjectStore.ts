import { create } from 'zustand'
import { getFileSystemProvider, getCapabilities, type FSCapabilities } from '../lib/fileSystem'
import { loadWorkspace, applyWorkspace, type WorkspaceState } from './useWorkspaceStore'
import { useEditorPanelStore } from './useEditorPanelStore'
import { generateProject } from '../utils/hclGenerator'
import { apiParse, apiConfirm, ideParseProject, isWailsRuntime } from '../lib/api'
import { useSettingsStore } from './useSettingsStore'

export interface ProjectFile {
  name: string
  path: string
  relativePath: string
  content: string
  isDirty: boolean
  gitStatus?: 'clean' | 'modified' | 'new' | 'deleted' | 'ignored' | 'untracked' | 'added' | 'staged' | 'staged_added' | 'staged_deleted' | 'staged_renamed' | 'staged_modified'
}

export interface ProjectMetadata {
  version: string
  canvas: {
    zoom: number
    position: { x: number; y: number }
  }
  nodes: Record<string, { x: number; y: number }>
  ui: {
    theme: 'light' | 'dark'
    activeFile: string | null
    expandedPanels: string[]
  }
  autoSave: {
    enabled: boolean
    debounceMs: number
  }
}

export interface StudioSettings {
  autoSave: {
    enabled: boolean
    debounceMs: number
  }
}

interface ProjectState {
  projectPath: string | null
  projectName: string | null
  mycelRoot: string  // Directory containing config.hcl (e.g. 'src/' or ''), all generated paths are relative to this
  files: ProjectFile[]
  activeFile: string | null
  metadata: ProjectMetadata | null
  isLoading: boolean
  error: string | null
  gitBranch: string | null
  capabilities: FSCapabilities

  // Basic setters
  setProjectPath: (path: string | null) => void
  setProjectName: (name: string | null) => void
  setFiles: (files: ProjectFile[]) => void
  addFile: (file: ProjectFile) => void
  updateFile: (path: string, content: string) => void
  setActiveFile: (path: string | null) => void
  markFileDirty: (path: string, isDirty: boolean) => void
  setMetadata: (metadata: ProjectMetadata | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  closeProject: () => void

  // Async operations (works with all providers)
  newProject: () => Promise<boolean>
  openProject: () => Promise<boolean>
  openProjectAtPath: (path: string) => Promise<boolean>
  saveProject: () => Promise<boolean>
  createFile: (relativePath: string, content?: string) => Promise<boolean>
  createDirectory: (relativePath: string) => Promise<boolean>
  deleteFile: (relativePath: string) => Promise<boolean>
  renameFile: (oldPath: string, newPath: string) => Promise<boolean>
  refreshGitStatus: () => Promise<void>
}

const defaultMetadata: ProjectMetadata = {
  version: '1.0',
  canvas: {
    zoom: 1,
    position: { x: 0, y: 0 },
  },
  nodes: {},
  ui: {
    theme: 'dark',
    activeFile: null,
    expandedPanels: ['fileTree', 'components'],
  },
  autoSave: {
    enabled: false,
    debounceMs: 2000,
  },
}

// Debug logger — writes to /tmp/mycel-studio-debug.log via Go binding
function debugLog(msg: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).go?.main?.App
    if (app?.DebugLog) app.DebugLog(msg)
  } catch { /* ignore */ }
}

// Shared logic for loading a project into the store (used by openProject and openProjectAtPath)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadProjectIntoStore(set: any, get: any, provider: any, project: any): Promise<boolean> {
  const files: ProjectFile[] = project.files.map((f: { name: string; relativePath: string; content: string }) => ({
    name: f.name,
    path: f.relativePath,
    relativePath: f.relativePath,
    content: f.content,
    isDirty: false,
  }))

  // Detect Mycel root: directory containing config.hcl
  const configFile = files.find(f => f.name === 'config.hcl')
  const mycelRoot = configFile
    ? configFile.relativePath.replace(/\/?config\.hcl$/, '')
    : ''
  const normalizedRoot = mycelRoot ? (mycelRoot.endsWith('/') ? mycelRoot : mycelRoot + '/') : ''

  const projectPath = provider.getProjectPath()
  set({
    projectPath,
    projectName: project.name,
    mycelRoot: normalizedRoot,
    files,
    metadata: defaultMetadata,
    activeFile: files.find((f: ProjectFile) => f.name.endsWith('.hcl'))?.relativePath ?? null,
    isLoading: false,
    capabilities: provider.getCapabilities(),
  })

  // Save last project path for reopen on startup
  if (projectPath) {
    useSettingsStore.getState().setLastProjectPath(projectPath)
  }

  // Refresh git status if available
  get().refreshGitStatus()

  // Parse HCL files into canvas nodes
  const hclFiles = files.filter((f: ProjectFile) => f.name.endsWith('.hcl'))
  debugLog(`loadProjectIntoStore: ${files.length} files, ${hclFiles.length} HCL files`)
  if (hclFiles.length > 0) {
    try {
      let result
      if (isWailsRuntime() && projectPath) {
        // Use Mycel IDE engine (pkg/ide) — handles all block types including accept
        debugLog(`Parsing via IDE engine: ${projectPath}`)
        result = await ideParseProject(projectPath)
        debugLog(`IDE parse result: success=${result.success}, hasProject=${!!result.project}`)
      } else {
        // Docker/browser fallback: use old parser
        const fileEntries = hclFiles.map((f: ProjectFile) => ({ path: f.relativePath, content: f.content }))
        result = await apiParse({ files: fileEntries })
      }
      if (result.success && result.project) {
        const { parseProjectToCanvas } = await import('../hooks/useSync')
        parseProjectToCanvas(result.project as never)
        const studioState = (await import('./useStudioStore')).useStudioStore.getState()
        debugLog(`After parseProjectToCanvas: ${studioState.nodes.length} nodes, ${studioState.edges.length} edges`)
      }
    } catch (err) {
      debugLog(`Parse ERROR: ${err}`)
      console.error('Failed to parse HCL files:', err)
    }
  }

  // Load .env files into envConfig
  const envFile = files.find((f: ProjectFile) => f.relativePath === normalizedRoot + '.env')
    || files.find((f: ProjectFile) => f.name === '.env')
  if (envFile) {
    const { useStudioStore } = await import('./useStudioStore')
    const envVars = envFile.content
      .split('\n')
      .filter((line: string) => line.trim() && !line.trim().startsWith('#'))
      .map((line: string) => {
        const eqIdx = line.indexOf('=')
        if (eqIdx < 0) return null
        const key = line.slice(0, eqIdx).trim()
        const value = line.slice(eqIdx + 1).trim()
        return { key, value, secret: false }
      })
      .filter((v: unknown): v is { key: string; value: string; secret: boolean } => v !== null && (v as { key: string }).key.length > 0)

    const exampleFile = files.find((f: ProjectFile) => f.relativePath === normalizedRoot + '.env.example')
      || files.find((f: ProjectFile) => f.name === '.env.example')
    if (exampleFile) {
      for (const v of envVars) {
        const exampleLine = exampleFile.content.split('\n').find((l: string) => l.startsWith(v.key + '='))
        if (exampleLine && exampleLine.slice(v.key.length + 1).trim() === '') {
          v.secret = true
        }
      }
    }

    useStudioStore.getState().updateEnvConfig({ variables: envVars })
  }

  // Load workspace state (.mycel-studio.json) after nodes are on canvas
  const workspaceFile = files.find((f: ProjectFile) => f.name === '.mycel-studio.json')
  let loadedWorkspace: WorkspaceState | null = null
  if (workspaceFile) {
    loadedWorkspace = loadWorkspace(workspaceFile.content)
    debugLog(`Workspace loaded: version=${loadedWorkspace?.version}, role=${loadedWorkspace?.workspace?.role ?? 'standalone'}, nodeCount=${Object.keys(loadedWorkspace?.nodes ?? {}).length}`)
  } else {
    debugLog('No .mycel-studio.json found')
  }

  // If this project is a CHILD, redirect to load the PARENT as the primary project.
  // The parent's workspace has the full IDE state (sidebar, view mode, terminals, etc.)
  if (loadedWorkspace?.workspace?.role === 'child' && loadedWorkspace.workspace.parent) {
    const parentPath = loadedWorkspace.workspace.parent
    const currentPath = provider.getProjectPath()
    // Don't apply child's workspace — the parent's workspace will be applied instead.
    // Schedule parent-first loading after a short delay to let the current load finish.
    setTimeout(() => loadParentFirst(parentPath, currentPath), 150)
    return true
  }

  // For parent or standalone: apply workspace normally
  if (loadedWorkspace) {
    setTimeout(() => applyWorkspace(loadedWorkspace!), 100)
  }

  // Auto-load attached projects if this is a parent
  if (loadedWorkspace?.workspace?.role === 'parent' && loadedWorkspace.workspace.attachments) {
    setTimeout(() => loadChildProjects(loadedWorkspace!.workspace!.attachments!, provider.getProjectPath()), 200)
  }

  return true
}

// When the opened project is a CHILD: load the parent as the primary project,
// apply the parent's workspace (which has full IDE state), then load all children.
async function loadParentFirst(parentPath: string, childPath: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).go?.main?.App
  if (!app?.ReadFileAtPath || !app?.ReadDirectoryTree) return

  const multiProjectModule = await import('./useMultiProjectStore')
  const { registerCurrentAsProject, useMultiProjectStore } = multiProjectModule

  try {
    // Read parent's workspace to get the full attachment list and IDE state
    const parentWsContent = await app.ReadFileAtPath(`${parentPath}/.mycel-studio.json`)
    const parentWs = loadWorkspace(parentWsContent)

    // Load the parent project into the live store (replaces the child that was loaded)
    const provider = getFileSystemProvider()
    if ('openProjectAtPath' in provider) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const project = await (provider as any).openProjectAtPath(parentPath)
      if (project) {
        // Manually load parent into stores (reuse loadProjectIntoStore logic inline)
        const parentFiles: ProjectFile[] = project.files.map((f: { name: string; relativePath: string; content: string }) => ({
          name: f.name, path: f.relativePath, relativePath: f.relativePath, content: f.content, isDirty: false,
        }))

        const configFile = parentFiles.find(f => f.name === 'config.hcl')
        const mycelRoot = configFile ? configFile.relativePath.replace(/\/?config\.hcl$/, '') : ''
        const normalizedRoot = mycelRoot ? (mycelRoot.endsWith('/') ? mycelRoot : mycelRoot + '/') : ''

        useProjectStore.setState({
          projectPath: parentPath,
          projectName: project.name,
          mycelRoot: normalizedRoot,
          files: parentFiles,
          activeFile: parentFiles.find((f: ProjectFile) => f.name.endsWith('.hcl'))?.relativePath ?? null,
          isLoading: false,
          capabilities: provider.getCapabilities(),
        })

        // Parse parent's HCL files
        const hclFiles = parentFiles.filter(f => f.name.endsWith('.hcl'))
        if (hclFiles.length > 0) {
          const { apiParse } = await import('../lib/api')
          const fileEntries = hclFiles.map(f => ({ path: f.relativePath, content: f.content }))
          try {
            const result = await apiParse({ files: fileEntries })
            if (result.success && result.project) {
              const { parseProjectToCanvas } = await import('../hooks/useSync')
              parseProjectToCanvas(result.project as never)
            }
          } catch (err) {
            console.error('Failed to parse parent HCL:', err)
          }
        }

        // Apply parent's workspace (this has the full IDE state: sidebar, view mode, terminals, etc.)
        if (parentWs) {
          setTimeout(() => applyWorkspace(parentWs), 50)
        }

        // Refresh git status for parent
        useProjectStore.getState().refreshGitStatus()
      }
    }

    // Register parent in multi-project store and mark it as root
    const rootId = registerCurrentAsProject()
    useMultiProjectStore.setState({ rootProjectId: rootId })

    // Now load all children (including the one we originally opened)
    const allChildren = parentWs?.workspace?.attachments || [childPath]
    for (const cp of allChildren) {
      await openAttachedProject(cp, useMultiProjectStore)
    }
    // Also load childPath if it wasn't in the attachments list
    if (!allChildren.includes(childPath)) {
      await openAttachedProject(childPath, useMultiProjectStore)
    }
  } catch (err) {
    console.error('Failed to load parent project:', err)
  }
}

// When the opened project is a PARENT: load all child projects.
async function loadChildProjects(attachments: string[], _parentPath: string) {
  const multiProjectModule = await import('./useMultiProjectStore')
  const { registerCurrentAsProject, useMultiProjectStore } = multiProjectModule

  // Register the parent (current project) first and mark as root
  const rootId = registerCurrentAsProject()
  useMultiProjectStore.setState({ rootProjectId: rootId })

  // Open each child
  for (const childPath of attachments) {
    await openAttachedProject(childPath, useMultiProjectStore)
  }
}

// Open a project at the given path and register it in multi-project store
async function openAttachedProject(
  path: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useMultiProjectStore: any,
) {
  const multiStore = useMultiProjectStore.getState()

  // Skip if already registered
  for (const proj of multiStore.projects.values()) {
    if (proj.projectPath === path) return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).go?.main?.App
  if (!app?.ReadDirectoryTree) return

  try {
    const entries = await app.ReadDirectoryTree(path)
    const files: ProjectFile[] = entries
      .filter((e: { isDirectory: boolean }) => !e.isDirectory)
      .map((e: { name: string; relativePath: string; content: string }) => ({
        name: e.name,
        path: e.relativePath,
        relativePath: e.relativePath,
        content: e.content,
        isDirty: false,
      }))

    const projectName = path.split('/').pop() || path

    // Detect Mycel root
    const configFile = files.find(f => f.name === 'config.hcl')
    const mycelRoot = configFile
      ? configFile.relativePath.replace(/\/?config\.hcl$/, '')
      : ''
    const normalizedRoot = mycelRoot ? (mycelRoot.endsWith('/') ? mycelRoot : mycelRoot + '/') : ''

    // Parse HCL files
    let parsedNodes: unknown[] = []
    let parsedEdges: import('@xyflow/react').Edge[] = []
    const hclFiles = files.filter(f => f.name.endsWith('.hcl'))
    if (hclFiles.length > 0) {
      const fileEntries = hclFiles.map(f => ({ path: f.relativePath, content: f.content }))
      try {
        const { apiParse } = await import('../lib/api')
        const result = await apiParse({ files: fileEntries })
        if (result.success && result.project) {
          const { convertProjectToNodes } = await import('../hooks/useSync')
          const converted = convertProjectToNodes(result.project as never)
          parsedNodes = converted.newNodes
          parsedEdges = converted.newEdges
        }
      } catch (err) {
        console.error(`Failed to parse HCL for ${path}:`, err)
      }
    }

    // Load workspace for node positions
    const workspaceFile = files.find(f => f.name === '.mycel-studio.json')
    let nodePositions: Record<string, { x: number; y: number }> = {}
    if (workspaceFile) {
      const ws = loadWorkspace(workspaceFile.content)
      if (ws?.nodes) nodePositions = ws.nodes
    }

    // Apply positions to nodes
    const positionedNodes = (parsedNodes as Array<{ id: string; position: { x: number; y: number } }>).map(n => {
      const saved = nodePositions[n.id]
      return saved ? { ...n, position: saved } : n
    })

    // Register in multi-project store
    const id = multiStore.addProject({
      projectPath: path,
      projectName,
      mycelRoot: normalizedRoot,
      files,
      nodes: positionedNodes,
      edges: parsedEdges,
      gitBranch: null,
    })

    // Refresh git status for this project
    try {
      const isRepo = await app.IsGitRepo(path)
      if (isRepo) {
        const branch = await app.GetGitBranch(path)
        const statuses = await app.GetGitFileStatuses(path)
        const updatedFiles = files.map(f => ({
          ...f,
          gitStatus: (statuses[f.relativePath] || 'clean') as ProjectFile['gitStatus'],
        }))
        multiStore.updateProject(id, {
          gitBranch: branch,
          files: updatedFiles,
        })
      }
    } catch {
      // Git status is best-effort
    }
  } catch (err) {
    console.error(`Failed to open attached project at ${path}:`, err)
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectPath: null,
  projectName: null,
  mycelRoot: '',
  files: [],
  activeFile: null,
  metadata: null,
  isLoading: false,
  error: null,
  gitBranch: null,
  capabilities: getCapabilities(),

  // Basic setters
  setProjectPath: (path) => set({ projectPath: path }),
  setProjectName: (name) => set({ projectName: name }),
  setFiles: (files) => set({ files }),

  addFile: (file) =>
    set((state) => ({
      files: [...state.files, file],
    })),

  updateFile: (relativePath, content) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.relativePath === relativePath ? { ...f, content, isDirty: true } : f
      ),
    })),

  setActiveFile: (path) => set({ activeFile: path }),

  markFileDirty: (relativePath, isDirty) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.relativePath === relativePath ? { ...f, isDirty } : f
      ),
    })),

  setMetadata: (metadata) => set({ metadata: metadata ?? defaultMetadata }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  closeProject: () => {
    const provider = getFileSystemProvider()
    provider.closeProject()
    set({
      projectPath: null,
      projectName: null,
      mycelRoot: '',
      files: [],
      activeFile: null,
      metadata: null,
      error: null,
      gitBranch: null,
    })
    // Clear editor tabs so no stale tabs remain
    useEditorPanelStore.setState({
      groups: [{ id: 'main', tabs: [], activeTabId: null }],
      activeGroupId: 'main',
      splitDirection: null,
    })
  },

  // Async operations (works with all providers)
  newProject: async () => {
    try {
      set({ isLoading: true, error: null })

      const provider = getFileSystemProvider()
      const project = await provider.openProject()

      if (!project) {
        set({ isLoading: false })
        return false
      }

      const files: ProjectFile[] = project.files.map((f) => ({
        name: f.name,
        path: f.relativePath,
        relativePath: f.relativePath,
        content: f.content,
        isDirty: false,
      }))

      const hasStudioFile = files.some(f => f.name === '.mycel-studio.json')
      const hclFiles = files.filter(f => f.name.endsWith('.hcl'))
      const hasFiles = files.length > 0

      if (hasStudioFile) {
        // Already a Mycel Studio project — ask if they want to open it instead
        const open = await apiConfirm(
          'Project Already Exists',
          'This directory already contains a Mycel Studio project. Would you like to open it?'
        )
        if (open) {
          set({ isLoading: false })
          return get().openProject()
        }
        set({ isLoading: false })
        return false
      }

      if (hasFiles && hclFiles.length > 0) {
        // Has HCL files but no studio project — ask to import
        const importExisting = await apiConfirm(
          'Existing Files Found',
          'This directory contains HCL configuration files. Would you like to create a Mycel Studio project from these existing files?'
        )
        if (!importExisting) {
          set({ isLoading: false })
          return false
        }
      } else if (hasFiles) {
        // Has files but no HCL — ask to create project here
        const proceed = await apiConfirm(
          'Non-Empty Directory',
          'This directory contains files but no HCL configurations. Would you like to create a new Mycel Studio project here?'
        )
        if (!proceed) {
          set({ isLoading: false })
          return false
        }
      }

      // Create the studio project file
      const studioMeta = JSON.stringify({
        version: '1.0',
        canvas: { zoom: 1, position: { x: 0, y: 0 } },
        nodes: {},
        ui: { theme: 'dark', activeFile: null, expandedPanels: ['fileTree', 'components'] },
      }, null, 2)
      await provider.writeFile('.mycel-studio.json', studioMeta)

      // Create config.hcl if it doesn't exist
      if (!hclFiles.some(f => f.name === 'config.hcl')) {
        const configHcl = `service {\n  name    = "${project.name}"\n  version = "1.0.0"\n}\n`
        await provider.writeFile('config.hcl', configHcl)
        files.push({
          name: 'config.hcl',
          path: 'config.hcl',
          relativePath: 'config.hcl',
          content: configHcl,
          isDirty: false,
        })
      }

      files.push({
        name: '.mycel-studio.json',
        path: '.mycel-studio.json',
        relativePath: '.mycel-studio.json',
        content: studioMeta,
        isDirty: false,
      })

      // Detect Mycel root
      const configFile = files.find(f => f.name === 'config.hcl')
      const mycelRoot = configFile
        ? configFile.relativePath.replace(/\/?config\.hcl$/, '')
        : ''
      const normalizedRoot = mycelRoot ? (mycelRoot.endsWith('/') ? mycelRoot : mycelRoot + '/') : ''

      set({
        projectPath: provider.getProjectPath(),
        projectName: project.name,
        mycelRoot: normalizedRoot,
        files,
        metadata: defaultMetadata,
        activeFile: files.find((f) => f.name.endsWith('.hcl'))?.relativePath ?? null,
        isLoading: false,
        capabilities: provider.getCapabilities(),
      })

      get().refreshGitStatus()

      // Parse existing HCL files into canvas
      const existingHcl = files.filter(f => f.name.endsWith('.hcl'))
      if (existingHcl.length > 0) {
        const fileEntries = existingHcl.map(f => ({ path: f.relativePath, content: f.content }))
        try {
          const result = await apiParse({ files: fileEntries })
          if (result.success && result.project) {
            const { parseProjectToCanvas } = await import('../hooks/useSync')
            parseProjectToCanvas(result.project as never)
          }
        } catch (err) {
          console.error('Failed to parse HCL files:', err)
        }
      }

      return true
    } catch (error) {
      set({ error: String(error), isLoading: false })
      return false
    }
  },

  openProject: async () => {
    try {
      set({ isLoading: true, error: null })

      const provider = getFileSystemProvider()
      const project = await provider.openProject()

      if (!project) {
        set({ isLoading: false })
        return false
      }

      return await loadProjectIntoStore(set, get, provider, project)
    } catch (error) {
      set({ error: String(error), isLoading: false })
      return false
    }
  },

  openProjectAtPath: async (path: string) => {
    try {
      set({ isLoading: true, error: null })

      const provider = getFileSystemProvider()
      // Only wailsFS supports openProjectAtPath
      if (!('openProjectAtPath' in provider)) {
        set({ isLoading: false })
        return false
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const project = await (provider as any).openProjectAtPath(path)

      if (!project) {
        set({ isLoading: false })
        return false
      }

      return await loadProjectIntoStore(set, get, provider, project)
    } catch (error) {
      set({ error: String(error), isLoading: false })
      return false
    }
  },

  saveProject: async () => {
    const { projectName, files, mycelRoot } = get()

    if (!projectName) {
      set({ error: 'No project open' })
      return false
    }

    try {
      set({ isLoading: true, error: null })

      const provider = getFileSystemProvider()

      // Generate files for NEW canvas nodes (those not from disk)
      // This uses the same logic as the file tree / editor panel
      const { useStudioStore } = await import('./useStudioStore')
      const studioState = useStudioStore.getState()
      const existingPaths = new Set(files.map(f => f.relativePath))
      const generated = generateProject(
        studioState.nodes, studioState.edges,
        studioState.serviceConfig, studioState.authConfig,
        studioState.envConfig, studioState.securityConfig,
        studioState.pluginConfig, mycelRoot, existingPaths
      )

      // Merge: real project files + newly generated files
      const generatedEntries = generated.files.map(gf => ({
        name: gf.name,
        relativePath: gf.path,
        content: gf.content,
      }))

      const allFiles = [
        ...files.map(f => ({ name: f.name, relativePath: f.relativePath, content: f.content })),
        ...generatedEntries,
      ]

      const success = await provider.saveProject({
        name: projectName,
        files: allFiles,
      })

      if (success) {
        // Add generated files to the store and mark everything clean
        const newFiles: ProjectFile[] = generated.files.map(gf => ({
          name: gf.name,
          path: gf.path,
          relativePath: gf.path,
          content: gf.content,
          isDirty: false,
        }))
        set({
          files: [
            ...files.map(f => ({ ...f, isDirty: false })),
            ...newFiles,
          ],
          isLoading: false,
        })

        // Refresh git status if available
        get().refreshGitStatus()
      } else {
        set({ isLoading: false })
      }

      return success
    } catch (error) {
      set({ error: String(error), isLoading: false })
      return false
    }
  },

  createFile: async (relativePath: string, content = '') => {
    const { files, projectName } = get()

    if (!projectName) {
      set({ error: 'No project open' })
      return false
    }

    try {
      const provider = getFileSystemProvider()
      const success = await provider.createFile(relativePath, content)

      if (success) {
        const name = relativePath.split('/').pop() || relativePath

        set({
          files: [
            ...files,
            {
              name,
              path: relativePath,
              relativePath,
              content,
              isDirty: false,
              gitStatus: 'untracked',
            },
          ],
        })
      }

      return success
    } catch (error) {
      set({ error: String(error) })
      return false
    }
  },

  createDirectory: async (relativePath: string) => {
    const { projectName } = get()
    if (!projectName) {
      set({ error: 'No project open' })
      return false
    }
    try {
      const provider = getFileSystemProvider()
      // Create directory by writing a placeholder file then deleting it,
      // or use writeFile to create an intermediary path.
      // The FSA API creates dirs via getDirectoryHandle({ create: true })
      // We'll create a .gitkeep inside the directory
      const success = await provider.createFile(`${relativePath}/.gitkeep`, '')
      return success
    } catch (error) {
      set({ error: String(error) })
      return false
    }
  },

  deleteFile: async (relativePath: string) => {
    const { files, activeFile, projectName } = get()

    if (!projectName) {
      set({ error: 'No project open' })
      return false
    }

    try {
      const provider = getFileSystemProvider()
      const success = await provider.deleteFile(relativePath)

      if (success) {
        set({
          files: files.filter((f) => f.relativePath !== relativePath),
          activeFile: activeFile === relativePath ? null : activeFile,
        })
      }

      return success
    } catch (error) {
      set({ error: String(error) })
      return false
    }
  },

  renameFile: async (oldPath: string, newPath: string) => {
    const { files, activeFile, projectName } = get()

    if (!projectName) {
      set({ error: 'No project open' })
      return false
    }

    try {
      const provider = getFileSystemProvider()
      const success = await provider.renameFile(oldPath, newPath)

      if (success) {
        const newName = newPath.split('/').pop() || newPath
        set({
          files: files.map((f) =>
            f.relativePath === oldPath
              ? { ...f, name: newName, path: newPath, relativePath: newPath }
              : f
          ),
          activeFile: activeFile === oldPath ? newPath : activeFile,
        })
      }

      return success
    } catch (error) {
      set({ error: String(error) })
      return false
    }
  },

  refreshGitStatus: async () => {
    const { capabilities, files } = get()

    if (!capabilities.canGetGitStatus) return

    try {
      const provider = getFileSystemProvider()
      if (!provider.getGitStatus) return

      const gitStatus = await provider.getGitStatus()
      if (!gitStatus || !gitStatus.isRepo) return

      // Update git branch
      set({ gitBranch: gitStatus.branch })

      // Update file git statuses
      const updatedFiles = files.map((file) => {
        const status = gitStatus.files[file.relativePath]
        let gitFileStatus: ProjectFile['gitStatus'] = 'clean'

        if (status) {
          switch (status) {
            case 'modified':
              gitFileStatus = 'modified'
              break
            case 'added':
              gitFileStatus = 'added'
              break
            case 'deleted':
              gitFileStatus = 'deleted'
              break
            case 'untracked':
              gitFileStatus = 'untracked'
              break
            case 'ignored':
              gitFileStatus = 'ignored'
              break
            case 'staged':
            case 'staged_added':
            case 'staged_deleted':
            case 'staged_renamed':
            case 'staged_modified':
              gitFileStatus = status as ProjectFile['gitStatus']
              break
            case 'unmodified':
            default:
              gitFileStatus = 'clean'
          }
        }

        return { ...file, gitStatus: gitFileStatus }
      })

      set({ files: updatedFiles })
    } catch (error) {
      console.error('Failed to refresh git status:', error)
    }
  },
}))
