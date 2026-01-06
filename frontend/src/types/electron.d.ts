// Type declarations for Electron IPC API

export interface ElectronProjectFile {
  name: string
  relativePath: string
  content: string
  isDirty: boolean
}

export interface ElectronProjectMetadata {
  version: string
  canvas: { zoom: number; position: { x: number; y: number } }
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

export interface ElectronProject {
  path: string
  name: string
  files: ElectronProjectFile[]
  metadata: ElectronProjectMetadata | null
}

export interface GitStatus {
  branch: string
  files: Record<string, string>
}

export interface MycelAPI {
  project: {
    openDialog: () => Promise<string | null>
    read: (projectPath: string) => Promise<ElectronProject>
    save: (projectPath: string, files: ElectronProjectFile[], metadata: ElectronProjectMetadata) => Promise<{ success: boolean }>
  }
  file: {
    read: (filePath: string) => Promise<string>
    write: (filePath: string, content: string) => Promise<{ success: boolean }>
    create: (filePath: string, content?: string) => Promise<{ success: boolean }>
    delete: (filePath: string) => Promise<{ success: boolean }>
  }
  git: {
    status: (projectPath: string) => Promise<GitStatus>
  }
  on: {
    fileChanged: (callback: (filePath: string) => void) => void
    projectSaved: (callback: () => void) => void
  }
  off: {
    fileChanged: () => void
    projectSaved: () => void
  }
}

declare global {
  interface Window {
    mycelAPI?: MycelAPI
  }
}
