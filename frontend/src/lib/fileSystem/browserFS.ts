// Browser File System Provider - Uses File System Access API (Chrome/Edge)

import type { FileSystemProvider, FSProject, FSProjectFile, FSCapabilities } from './types'
import { initGitService, clearGitService, getGitService, type GitStatus } from '../git'

// File System Access API types (not in default TypeScript lib)
interface FileSystemHandleBase {
  kind: 'file' | 'directory'
  name: string
}

interface FSAFileHandle extends FileSystemHandleBase {
  kind: 'file'
  getFile(): Promise<File>
}

interface FSADirectoryHandle extends FileSystemHandleBase {
  kind: 'directory'
  values(): AsyncIterable<FSAFileHandle | FSADirectoryHandle>
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FSADirectoryHandle>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FSAFileHandle & {
    createWritable(): Promise<FileSystemWritableFileStream>
  }>
  removeEntry(name: string): Promise<void>
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | Blob | ArrayBuffer): Promise<void>
  close(): Promise<void>
}

declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FSADirectoryHandle>
  }
}

export class BrowserFileSystem implements FileSystemProvider {
  private directoryHandle: FSADirectoryHandle | null = null
  private projectName: string | null = null

  getCapabilities(): FSCapabilities {
    return {
      canOpenFolder: true,
      canWatchChanges: false, // Could implement with polling, but not native
      canGetGitStatus: true, // Uses isomorphic-git
      persistsAcrossSessions: false, // Handle is lost on page refresh
      providerName: 'browser',
    }
  }

  getDirectoryHandle(): FileSystemDirectoryHandle | null {
    return this.directoryHandle as unknown as FileSystemDirectoryHandle
  }

  async openProject(): Promise<FSProject | null> {
    if (!window.showDirectoryPicker) return null

    try {
      this.directoryHandle = await window.showDirectoryPicker()
      this.projectName = this.directoryHandle.name

      // Initialize git service
      initGitService(this.directoryHandle as unknown as FileSystemDirectoryHandle)

      const files = await this.readAllFiles(this.directoryHandle, '')

      return {
        name: this.projectName,
        files,
      }
    } catch (error) {
      // User cancelled or error
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to open project:', error)
      }
      return null
    }
  }

  async getGitStatus(): Promise<GitStatus | null> {
    const gitService = getGitService()
    if (!gitService) return null

    try {
      return await gitService.getStatus()
    } catch (error) {
      console.error('Failed to get git status:', error)
      return null
    }
  }

  private async readAllFiles(
    dirHandle: FSADirectoryHandle,
    basePath: string
  ): Promise<FSProjectFile[]> {
    const files: FSProjectFile[] = []

    for await (const entry of dirHandle.values()) {
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name

      // Skip hidden files (except .mycel-studio.json) and node_modules
      if (entry.name.startsWith('.') && entry.name !== '.mycel-studio.json') continue
      if (entry.name === 'node_modules') continue

      if (entry.kind === 'file') {
        // Only read HCL files and studio metadata
        if (entry.name.endsWith('.hcl') || entry.name === '.mycel-studio.json') {
          try {
            const file = await entry.getFile()
            const content = await file.text()
            files.push({
              name: entry.name,
              relativePath,
              content,
            })
          } catch (error) {
            console.error(`Failed to read file ${relativePath}:`, error)
          }
        }
      } else if (entry.kind === 'directory') {
        // Recursively read subdirectories
        const subFiles = await this.readAllFiles(entry, relativePath)
        files.push(...subFiles)
      }
    }

    return files
  }

  async saveProject(project: FSProject): Promise<boolean> {
    if (!this.directoryHandle) return false

    try {
      for (const file of project.files) {
        await this.writeFile(file.relativePath, file.content)
      }
      return true
    } catch (error) {
      console.error('Failed to save project:', error)
      return false
    }
  }

  async createFile(relativePath: string, content: string): Promise<boolean> {
    return this.writeFile(relativePath, content)
  }

  async deleteFile(relativePath: string): Promise<boolean> {
    if (!this.directoryHandle) return false

    try {
      const parts = relativePath.split('/')
      const fileName = parts.pop()!

      let currentDir = this.directoryHandle
      for (const part of parts) {
        currentDir = await currentDir.getDirectoryHandle(part)
      }

      await currentDir.removeEntry(fileName)
      return true
    } catch (error) {
      console.error('Failed to delete file:', error)
      return false
    }
  }

  async readFile(relativePath: string): Promise<string | null> {
    if (!this.directoryHandle) return null

    try {
      const parts = relativePath.split('/')
      const fileName = parts.pop()!

      let currentDir = this.directoryHandle
      for (const part of parts) {
        currentDir = await currentDir.getDirectoryHandle(part)
      }

      const fileHandle = await currentDir.getFileHandle(fileName)
      const file = await fileHandle.getFile()
      return await file.text()
    } catch (error) {
      console.error('Failed to read file:', error)
      return null
    }
  }

  async writeFile(relativePath: string, content: string): Promise<boolean> {
    if (!this.directoryHandle) return false

    try {
      const parts = relativePath.split('/')
      const fileName = parts.pop()!

      // Navigate/create directories
      let currentDir = this.directoryHandle
      for (const part of parts) {
        currentDir = await currentDir.getDirectoryHandle(part, { create: true })
      }

      // Create/overwrite file
      const fileHandle = await currentDir.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(content)
      await writable.close()

      return true
    } catch (error) {
      console.error('Failed to write file:', error)
      return false
    }
  }

  hasOpenProject(): boolean {
    return this.directoryHandle !== null
  }

  getProjectPath(): string | null {
    return this.projectName
  }

  closeProject(): void {
    this.directoryHandle = null
    this.projectName = null
    clearGitService()
  }
}

// Check if File System Access API is available
export function isBrowserFSAvailable(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}
