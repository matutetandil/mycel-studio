// Native file system provider using Wails Go bindings
// Only available when running as a desktop app
// Accesses bindings via window.go (injected by Wails runtime)

import type { FileSystemProvider, FSCapabilities, FSProject, FSProjectFile } from './types'
import type { GitStatus } from '../git'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getApp(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  const app = w.go?.main?.App
  if (!app) throw new Error('Wails bindings not available')
  return app
}

export function isWailsRuntime(): boolean {
  return typeof window !== 'undefined' && 'go' in window
}

export class WailsFileSystem implements FileSystemProvider {
  private projectPath: string | null = null
  private projectName: string | null = null

  getCapabilities(): FSCapabilities {
    return {
      canOpenFolder: true,
      canWatchChanges: false,
      canGetGitStatus: true,
      persistsAcrossSessions: true,
      providerName: 'wails',
    }
  }

  async openProject(): Promise<FSProject | null> {
    const app = getApp()

    const path: string = await app.OpenDirectoryDialog()
    if (!path) return null

    return this.openProjectAtPath(path)
  }

  async openProjectAtPath(path: string): Promise<FSProject | null> {
    const app = getApp()

    this.projectPath = path
    this.projectName = path.split('/').pop() ?? path

    const entries = await app.ReadDirectoryTree(path)

    const files: FSProjectFile[] = entries
      .filter((e: { isDirectory: boolean }) => !e.isDirectory)
      .map((e: { name: string; relativePath: string; content: string }) => ({
        name: e.name,
        relativePath: e.relativePath,
        content: e.content,
      }))

    return { name: this.projectName, files }
  }

  async saveProject(project: FSProject): Promise<boolean> {
    if (!this.projectPath) return false

    const app = getApp()

    for (const file of project.files) {
      const fullPath = `${this.projectPath}/${file.relativePath}`
      await app.WriteFile(fullPath, file.content)
    }

    return true
  }

  async createFile(relativePath: string, content: string): Promise<boolean> {
    if (!this.projectPath) return false

    const app = getApp()
    const fullPath = `${this.projectPath}/${relativePath}`
    await app.WriteFile(fullPath, content)
    return true
  }

  async deleteFile(relativePath: string): Promise<boolean> {
    if (!this.projectPath) return false

    const app = getApp()
    const fullPath = `${this.projectPath}/${relativePath}`
    await app.DeleteFile(fullPath)
    return true
  }

  async renameFile(oldPath: string, newPath: string): Promise<boolean> {
    if (!this.projectPath) return false

    const app = getApp()
    const fullOldPath = `${this.projectPath}/${oldPath}`
    const fullNewPath = `${this.projectPath}/${newPath}`
    await app.RenameFile(fullOldPath, fullNewPath)
    return true
  }

  async readFile(relativePath: string): Promise<string | null> {
    if (!this.projectPath) return null

    const app = getApp()
    const fullPath = `${this.projectPath}/${relativePath}`
    try {
      return await app.ReadFile(fullPath)
    } catch {
      return null
    }
  }

  async writeFile(relativePath: string, content: string): Promise<boolean> {
    return this.createFile(relativePath, content)
  }

  hasOpenProject(): boolean {
    return this.projectPath !== null
  }

  getProjectPath(): string | null {
    return this.projectPath
  }

  closeProject(): void {
    this.projectPath = null
    this.projectName = null
  }

  async getGitStatus(): Promise<GitStatus | null> {
    if (!this.projectPath) return null

    const app = getApp()
    try {
      const status = await app.GetGitStatus(this.projectPath)
      return {
        isRepo: status.isRepo,
        branch: status.branch,
        files: status.files || {},
      }
    } catch {
      return null
    }
  }
}
