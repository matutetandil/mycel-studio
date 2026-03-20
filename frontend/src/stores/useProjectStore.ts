import { create } from 'zustand'
import { getFileSystemProvider, getCapabilities, type FSCapabilities } from '../lib/fileSystem'
import { loadWorkspace, applyWorkspace } from './useWorkspaceStore'
import { useEditorPanelStore } from './useEditorPanelStore'
import { generateProject } from '../utils/hclGenerator'
import { apiParse, apiConfirm } from '../lib/api'
import { useSettingsStore } from './useSettingsStore'

export interface ProjectFile {
  name: string
  path: string
  relativePath: string
  content: string
  isDirty: boolean
  gitStatus?: 'clean' | 'modified' | 'new' | 'deleted' | 'ignored' | 'untracked' | 'added'
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
  if (hclFiles.length > 0) {
    const fileEntries = hclFiles.map((f: ProjectFile) => ({
      path: f.relativePath,
      content: f.content,
    }))
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
  if (workspaceFile) {
    const ws = loadWorkspace(workspaceFile.content)
    if (ws) {
      setTimeout(() => applyWorkspace(ws), 100)
    }
  }

  return true
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
