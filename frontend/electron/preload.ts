import { contextBridge, ipcRenderer } from 'electron'

// Types for the exposed API
export interface ProjectFile {
  name: string
  relativePath: string
  content: string
  isDirty: boolean
}

export interface ProjectMetadata {
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

export interface Project {
  path: string
  name: string
  files: ProjectFile[]
  metadata: ProjectMetadata | null
}

export interface GitStatus {
  branch: string
  files: Record<string, string>
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('mycelAPI', {
  // Project operations
  project: {
    openDialog: (): Promise<string | null> =>
      ipcRenderer.invoke('project:open-dialog'),

    read: (projectPath: string): Promise<Project> =>
      ipcRenderer.invoke('project:read', projectPath),

    save: (projectPath: string, files: ProjectFile[], metadata: ProjectMetadata): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('project:save', projectPath, files, metadata),
  },

  // File operations
  file: {
    read: (filePath: string): Promise<string> =>
      ipcRenderer.invoke('file:read', filePath),

    write: (filePath: string, content: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('file:write', filePath, content),

    create: (filePath: string, content?: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('file:create', filePath, content),

    delete: (filePath: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('file:delete', filePath),
  },

  // Git operations
  git: {
    status: (projectPath: string): Promise<GitStatus> =>
      ipcRenderer.invoke('git:status', projectPath),
  },

  // Event listeners for main -> renderer communication
  on: {
    fileChanged: (callback: (filePath: string) => void) => {
      ipcRenderer.on('file:changed', (_event, filePath) => callback(filePath))
    },

    projectSaved: (callback: () => void) => {
      ipcRenderer.on('project:saved', () => callback())
    },
  },

  // Remove event listeners
  off: {
    fileChanged: () => {
      ipcRenderer.removeAllListeners('file:changed')
    },

    projectSaved: () => {
      ipcRenderer.removeAllListeners('project:saved')
    },
  },
})

// Type declaration for the exposed API
declare global {
  interface Window {
    mycelAPI: {
      project: {
        openDialog: () => Promise<string | null>
        read: (projectPath: string) => Promise<Project>
        save: (projectPath: string, files: ProjectFile[], metadata: ProjectMetadata) => Promise<{ success: boolean }>
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
  }
}
