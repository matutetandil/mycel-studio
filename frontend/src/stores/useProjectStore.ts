import { create } from 'zustand'
import { getFileSystemProvider, getCapabilities, type FSCapabilities } from '../lib/fileSystem'

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

      set({
        projectPath: provider.getProjectPath(),
        projectName: project.name,
        files,
        metadata: defaultMetadata,
        activeFile: files.find((f) => f.name.endsWith('.hcl'))?.relativePath ?? null,
        isLoading: false,
        capabilities: provider.getCapabilities(),
      })

      // Refresh git status if available
      get().refreshGitStatus()

      return true
    } catch (error) {
      set({ error: String(error), isLoading: false })
      return false
    }
  },

  saveProject: async () => {
    const { projectName, files } = get()

    if (!projectName) {
      set({ error: 'No project open' })
      return false
    }

    try {
      set({ isLoading: true, error: null })

      const provider = getFileSystemProvider()

      // Save all files
      const success = await provider.saveProject({
        name: projectName,
        files: files.map((f) => ({
          name: f.name,
          relativePath: f.relativePath,
          content: f.content,
        })),
      })

      if (success) {
        // Mark all files as clean
        set({
          files: files.map((f) => ({ ...f, isDirty: false })),
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
