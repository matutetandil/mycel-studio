// Electron File System Provider - Uses IPC for native file operations

import type { FileSystemProvider, FSProject, FSCapabilities } from './types'

export class ElectronFileSystem implements FileSystemProvider {
  private projectPath: string | null = null

  getCapabilities(): FSCapabilities {
    return {
      canOpenFolder: true,
      canWatchChanges: true,
      canGetGitStatus: true,
      persistsAcrossSessions: true,
      providerName: 'electron',
    }
  }

  async openProject(): Promise<FSProject | null> {
    if (!window.mycelAPI) return null

    try {
      const path = await window.mycelAPI.project.openDialog()
      if (!path) return null

      const project = await window.mycelAPI.project.read(path)
      this.projectPath = project.path

      return {
        name: project.name,
        files: project.files.map((f) => ({
          name: f.name,
          relativePath: f.relativePath,
          content: f.content,
        })),
      }
    } catch (error) {
      console.error('Failed to open project:', error)
      return null
    }
  }

  async saveProject(project: FSProject): Promise<boolean> {
    if (!window.mycelAPI || !this.projectPath) return false

    try {
      await window.mycelAPI.project.save(
        this.projectPath,
        project.files.map((f) => ({
          name: f.name,
          relativePath: f.relativePath,
          content: f.content,
          isDirty: true,
        })),
        {
          version: '1.0',
          canvas: { zoom: 1, position: { x: 0, y: 0 } },
          nodes: {},
          ui: { theme: 'dark', activeFile: null, expandedPanels: [] },
          autoSave: { enabled: false, debounceMs: 2000 },
        }
      )
      return true
    } catch (error) {
      console.error('Failed to save project:', error)
      return false
    }
  }

  async createFile(relativePath: string, content: string): Promise<boolean> {
    if (!window.mycelAPI || !this.projectPath) return false

    try {
      const fullPath = `${this.projectPath}/${relativePath}`
      await window.mycelAPI.file.create(fullPath, content)
      return true
    } catch (error) {
      console.error('Failed to create file:', error)
      return false
    }
  }

  async deleteFile(relativePath: string): Promise<boolean> {
    if (!window.mycelAPI || !this.projectPath) return false

    try {
      const fullPath = `${this.projectPath}/${relativePath}`
      await window.mycelAPI.file.delete(fullPath)
      return true
    } catch (error) {
      console.error('Failed to delete file:', error)
      return false
    }
  }

  async readFile(relativePath: string): Promise<string | null> {
    if (!window.mycelAPI || !this.projectPath) return null

    try {
      const fullPath = `${this.projectPath}/${relativePath}`
      return await window.mycelAPI.file.read(fullPath)
    } catch (error) {
      console.error('Failed to read file:', error)
      return null
    }
  }

  async writeFile(relativePath: string, content: string): Promise<boolean> {
    if (!window.mycelAPI || !this.projectPath) return false

    try {
      const fullPath = `${this.projectPath}/${relativePath}`
      await window.mycelAPI.file.write(fullPath, content)
      return true
    } catch (error) {
      console.error('Failed to write file:', error)
      return false
    }
  }

  hasOpenProject(): boolean {
    return this.projectPath !== null
  }

  getProjectPath(): string | null {
    return this.projectPath
  }

  closeProject(): void {
    this.projectPath = null
  }

  // Electron-specific: Get git status
  async getGitStatus(): Promise<{ branch: string; files: Record<string, string> } | null> {
    if (!window.mycelAPI || !this.projectPath) return null

    try {
      return await window.mycelAPI.git.status(this.projectPath)
    } catch (error) {
      console.error('Failed to get git status:', error)
      return null
    }
  }
}
