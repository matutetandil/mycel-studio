import { create } from 'zustand'
import { getFileSystemProvider, getCapabilities, type FSCapabilities } from '../lib/fileSystem'
import { loadWorkspace, applyWorkspace } from './useWorkspaceStore'
import { generateProject } from '../utils/hclGenerator'

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
  openProject: () => Promise<boolean>
  saveProject: () => Promise<boolean>
  createFile: (relativePath: string, content?: string) => Promise<boolean>
  createDirectory: (relativePath: string) => Promise<boolean>
  deleteFile: (relativePath: string) => Promise<boolean>
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
  },

  // Async operations (works with all providers)
  openProject: async () => {
    try {
      set({ isLoading: true, error: null })

      const provider = getFileSystemProvider()
      const project = await provider.openProject()

      if (!project) {
        set({ isLoading: false })
        return false
      }

      // Convert files to our format
      const files: ProjectFile[] = project.files.map((f) => ({
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
      // Normalize: ensure trailing slash if non-empty, empty string if root
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

      // Refresh git status if available
      get().refreshGitStatus()

      // Parse HCL files into canvas nodes
      const hclFiles = files.filter(f => f.name.endsWith('.hcl'))
      if (hclFiles.length > 0) {
        const fileEntries = hclFiles.map(f => ({
          path: f.relativePath,
          content: f.content,
        }))
        try {
          const response = await fetch('/api/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: fileEntries }),
          })
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.project) {
              // Import dynamically to avoid circular deps
              const { parseProjectToCanvas } = await import('../hooks/useSync')
              parseProjectToCanvas(result.project)
            }
          }
        } catch (err) {
          console.error('Failed to parse HCL files:', err)
        }
      }

      // Load .env files into envConfig
      // Look for .env inside mycelRoot first, then project root
      const envFile = files.find(f => f.relativePath === normalizedRoot + '.env')
        || files.find(f => f.name === '.env')
      if (envFile) {
        const { useStudioStore } = await import('./useStudioStore')
        const envVars = envFile.content
          .split('\n')
          .filter(line => line.trim() && !line.trim().startsWith('#'))
          .map(line => {
            const eqIdx = line.indexOf('=')
            if (eqIdx < 0) return null
            const key = line.slice(0, eqIdx).trim()
            const value = line.slice(eqIdx + 1).trim()
            return { key, value, secret: false }
          })
          .filter((v): v is { key: string; value: string; secret: boolean } => v !== null && v.key.length > 0)

        // Also check .env.example to detect secrets (keys present in .env.example with empty values)
        const exampleFile = files.find(f => f.relativePath === normalizedRoot + '.env.example')
          || files.find(f => f.name === '.env.example')
        if (exampleFile) {
          // Keys in .env but with empty value in .env.example are likely secrets
          for (const v of envVars) {
            const exampleLine = exampleFile.content.split('\n').find(l => l.startsWith(v.key + '='))
            if (exampleLine && exampleLine.slice(v.key.length + 1).trim() === '') {
              v.secret = true
            }
          }
        }

        useStudioStore.getState().updateEnvConfig({ variables: envVars })
      }

      // Load workspace state (.mycel-studio.json) after nodes are on canvas
      const workspaceFile = files.find(f => f.name === '.mycel-studio.json')
      if (workspaceFile) {
        const ws = loadWorkspace(workspaceFile.content)
        if (ws) {
          // Small delay to let canvas mount first
          setTimeout(() => applyWorkspace(ws), 100)
        }
      }

      return true
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
