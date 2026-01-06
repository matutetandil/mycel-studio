import { create } from 'zustand'

export interface ProjectFile {
  name: string
  path: string
  content: string
  isDirty: boolean
  gitStatus?: 'clean' | 'modified' | 'new' | 'deleted' | 'ignored'
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
}

interface ProjectState {
  projectPath: string | null
  projectName: string | null
  files: ProjectFile[]
  activeFile: string | null
  metadata: ProjectMetadata | null
  isLoading: boolean

  setProjectPath: (path: string | null) => void
  setProjectName: (name: string | null) => void
  setFiles: (files: ProjectFile[]) => void
  addFile: (file: ProjectFile) => void
  updateFile: (path: string, content: string) => void
  setActiveFile: (path: string | null) => void
  markFileDirty: (path: string, isDirty: boolean) => void
  setMetadata: (metadata: ProjectMetadata | null) => void
  setLoading: (loading: boolean) => void
  closeProject: () => void
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
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectPath: null,
  projectName: null,
  files: [],
  activeFile: null,
  metadata: null,
  isLoading: false,

  setProjectPath: (path) => set({ projectPath: path }),
  setProjectName: (name) => set({ projectName: name }),
  setFiles: (files) => set({ files }),

  addFile: (file) =>
    set((state) => ({
      files: [...state.files, file],
    })),

  updateFile: (path, content) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.path === path ? { ...f, content, isDirty: true } : f
      ),
    })),

  setActiveFile: (path) => set({ activeFile: path }),

  markFileDirty: (path, isDirty) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.path === path ? { ...f, isDirty } : f
      ),
    })),

  setMetadata: (metadata) => set({ metadata: metadata ?? defaultMetadata }),
  setLoading: (isLoading) => set({ isLoading }),

  closeProject: () =>
    set({
      projectPath: null,
      projectName: null,
      files: [],
      activeFile: null,
      metadata: null,
    }),
}))
