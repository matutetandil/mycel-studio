import { create } from 'zustand'
import { isElectron } from '../utils/electron'

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

  // Async operations (Electron)
  openProject: () => Promise<boolean>
  openProjectFromPath: (path: string) => Promise<boolean>
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

  closeProject: () =>
    set({
      projectPath: null,
      projectName: null,
      files: [],
      activeFile: null,
      metadata: null,
      error: null,
      gitBranch: null,
    }),

  // Async operations (Electron)
  openProject: async () => {
    if (!isElectron()) {
      set({ error: 'File operations require Electron' })
      return false
    }

    try {
      set({ isLoading: true, error: null })

      const path = await window.mycelAPI!.project.openDialog()
      if (!path) {
        set({ isLoading: false })
        return false
      }

      return get().openProjectFromPath(path)
    } catch (error) {
      set({ error: String(error), isLoading: false })
      return false
    }
  },

  openProjectFromPath: async (projectPath: string) => {
    if (!isElectron()) {
      set({ error: 'File operations require Electron' })
      return false
    }

    try {
      set({ isLoading: true, error: null })

      const project = await window.mycelAPI!.project.read(projectPath)

      // Convert files to our format
      const files: ProjectFile[] = project.files.map((f) => ({
        name: f.name,
        path: `${projectPath}/${f.relativePath}`,
        relativePath: f.relativePath,
        content: f.content,
        isDirty: false,
      }))

      // Get git status
      const gitStatus = await window.mycelAPI!.git.status(projectPath)

      // Apply git status to files
      const filesWithGit = files.map((f) => ({
        ...f,
        gitStatus: (gitStatus.files[f.relativePath] || 'clean') as ProjectFile['gitStatus'],
      }))

      set({
        projectPath: project.path,
        projectName: project.name,
        files: filesWithGit,
        metadata: project.metadata ?? defaultMetadata,
        activeFile: filesWithGit.find((f) => f.name.endsWith('.hcl'))?.relativePath ?? null,
        gitBranch: gitStatus.branch || null,
        isLoading: false,
      })

      return true
    } catch (error) {
      set({ error: String(error), isLoading: false })
      return false
    }
  },

  saveProject: async () => {
    const { projectPath, files, metadata } = get()

    if (!isElectron()) {
      set({ error: 'File operations require Electron' })
      return false
    }

    if (!projectPath || !metadata) {
      set({ error: 'No project open' })
      return false
    }

    try {
      set({ isLoading: true, error: null })

      // Only save dirty files
      const dirtyFiles = files.filter((f) => f.isDirty)

      await window.mycelAPI!.project.save(
        projectPath,
        dirtyFiles.map((f) => ({
          name: f.name,
          relativePath: f.relativePath,
          content: f.content,
          isDirty: f.isDirty,
        })),
        metadata
      )

      // Mark all files as clean
      set({
        files: files.map((f) => ({ ...f, isDirty: false })),
        isLoading: false,
      })

      // Refresh git status
      get().refreshGitStatus()

      return true
    } catch (error) {
      set({ error: String(error), isLoading: false })
      return false
    }
  },

  createFile: async (relativePath: string, content = '') => {
    const { projectPath, files } = get()

    if (!isElectron()) {
      set({ error: 'File operations require Electron' })
      return false
    }

    if (!projectPath) {
      set({ error: 'No project open' })
      return false
    }

    try {
      const fullPath = `${projectPath}/${relativePath}`
      await window.mycelAPI!.file.create(fullPath, content)

      const name = relativePath.split('/').pop() || relativePath

      set({
        files: [
          ...files,
          {
            name,
            path: fullPath,
            relativePath,
            content,
            isDirty: false,
            gitStatus: 'untracked',
          },
        ],
      })

      return true
    } catch (error) {
      set({ error: String(error) })
      return false
    }
  },

  deleteFile: async (relativePath: string) => {
    const { projectPath, files, activeFile } = get()

    if (!isElectron()) {
      set({ error: 'File operations require Electron' })
      return false
    }

    if (!projectPath) {
      set({ error: 'No project open' })
      return false
    }

    try {
      const fullPath = `${projectPath}/${relativePath}`
      await window.mycelAPI!.file.delete(fullPath)

      set({
        files: files.filter((f) => f.relativePath !== relativePath),
        activeFile: activeFile === relativePath ? null : activeFile,
      })

      return true
    } catch (error) {
      set({ error: String(error) })
      return false
    }
  },

  refreshGitStatus: async () => {
    const { projectPath, files } = get()

    if (!isElectron() || !projectPath) return

    try {
      const gitStatus = await window.mycelAPI!.git.status(projectPath)

      set({
        gitBranch: gitStatus.branch || null,
        files: files.map((f) => ({
          ...f,
          gitStatus: (gitStatus.files[f.relativePath] || 'clean') as ProjectFile['gitStatus'],
        })),
      })
    } catch {
      // Git status failed, ignore
    }
  },
}))
