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

  // Known binary extensions — skip content reading for these
  private static readonly BINARY_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp', '.avif',
    '.mp3', '.mp4', '.wav', '.ogg', '.webm', '.avi', '.mov', '.flac',
    '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar',
    '.woff', '.woff2', '.ttf', '.otf', '.eot',
    '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.wasm', '.class', '.pyc', '.o', '.a',
    '.db', '.sqlite', '.sqlite3',
  ])

  // Directories to skip entirely
  private static readonly SKIP_DIRS = new Set([
    'node_modules', 'vendor', '.git', 'dist', 'build', '__pycache__',
    '.next', '.nuxt', '.cache', '.idea', '.vscode', 'target',
  ])

  // Max file size to read (512 KB)
  private static readonly MAX_FILE_SIZE = 512 * 1024

  // Check if file content looks like binary (contains null bytes or too many non-printable chars)
  private static isBinaryContent(content: string): boolean {
    const sample = content.slice(0, 8192)
    let nonPrintable = 0
    for (let i = 0; i < sample.length; i++) {
      const code = sample.charCodeAt(i)
      if (code === 0) return true // null byte = definitely binary
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) nonPrintable++
    }
    return sample.length > 0 && (nonPrintable / sample.length) > 0.1
  }

  private async readAllFiles(
    dirHandle: FSADirectoryHandle,
    basePath: string
  ): Promise<FSProjectFile[]> {
    const files: FSProjectFile[] = []

    for await (const entry of dirHandle.values()) {
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name

      // Skip .git directory (internals, not useful to display)
      if (entry.kind === 'directory' && entry.name === '.git') continue
      // Skip heavy dependency/build directories
      if (entry.kind === 'directory' && BrowserFileSystem.SKIP_DIRS.has(entry.name)) continue

      if (entry.kind === 'file') {
        // Skip known binary extensions
        const dotIdx = entry.name.lastIndexOf('.')
        const ext = dotIdx >= 0 ? entry.name.slice(dotIdx).toLowerCase() : ''
        if (ext && BrowserFileSystem.BINARY_EXTENSIONS.has(ext)) {
          files.push({ name: entry.name, relativePath, content: `// Binary file (${ext})` })
          continue
        }

        try {
          const file = await entry.getFile()
          // Skip large files
          if (file.size > BrowserFileSystem.MAX_FILE_SIZE) {
            files.push({ name: entry.name, relativePath, content: `// File too large to display (${(file.size / 1024).toFixed(0)} KB)` })
            continue
          }
          const content = await file.text()
          // Detect binary content
          if (BrowserFileSystem.isBinaryContent(content)) {
            files.push({ name: entry.name, relativePath, content: `// Binary file` })
            continue
          }
          files.push({ name: entry.name, relativePath, content })
        } catch (error) {
          console.error(`Failed to read file ${relativePath}:`, error)
        }
      } else if (entry.kind === 'directory') {
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
  const available = typeof window !== 'undefined' &&
    'showDirectoryPicker' in window &&
    typeof window.showDirectoryPicker === 'function'

  // Log for debugging
  if (typeof window !== 'undefined') {
    console.log('[FileSystem] Browser detection:', {
      hasWindow: true,
      hasShowDirectoryPicker: 'showDirectoryPicker' in window,
      isFunction: typeof window.showDirectoryPicker === 'function',
      isSecureContext: window.isSecureContext,
      result: available ? 'Browser FS (Full Access)' : 'Fallback (ZIP Mode)'
    })
  }

  return available
}
