// Git operations using isomorphic-git with File System Access API
import git from 'isomorphic-git'

export type GitFileStatus =
  | 'unmodified'
  | 'modified'
  | 'added'
  | 'deleted'
  | 'untracked'
  | 'ignored'

export interface GitStatus {
  branch: string | null
  files: Record<string, GitFileStatus>
  isRepo: boolean
}

// File System Access API adapter for isomorphic-git
class FSAAdapter {
  private root: FileSystemDirectoryHandle

  constructor(root: FileSystemDirectoryHandle) {
    this.root = root
  }

  private async getHandle(filepath: string): Promise<FileSystemFileHandle | FileSystemDirectoryHandle | null> {
    const parts = filepath.split('/').filter(Boolean)
    let current: FileSystemDirectoryHandle = this.root

    for (let i = 0; i < parts.length - 1; i++) {
      try {
        current = await current.getDirectoryHandle(parts[i])
      } catch {
        return null
      }
    }

    const lastPart = parts[parts.length - 1]
    if (!lastPart) return current

    try {
      return await current.getFileHandle(lastPart)
    } catch {
      try {
        return await current.getDirectoryHandle(lastPart)
      } catch {
        return null
      }
    }
  }

  async readFile(filepath: string): Promise<Uint8Array> {
    const handle = await this.getHandle(filepath)
    if (!handle || handle.kind !== 'file') {
      throw new Error(`ENOENT: ${filepath}`)
    }
    const file = await (handle as FileSystemFileHandle).getFile()
    const buffer = await file.arrayBuffer()
    return new Uint8Array(buffer)
  }

  async writeFile(filepath: string, data: Uint8Array | string): Promise<void> {
    const parts = filepath.split('/').filter(Boolean)
    let current: FileSystemDirectoryHandle = this.root

    // Create directories if needed
    for (let i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i], { create: true })
    }

    const filename = parts[parts.length - 1]
    const fileHandle = await current.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    // Handle different data types - use type assertion for FS API compatibility
    if (typeof data === 'string') {
      await writable.write(data)
    } else {
      // Create a new ArrayBuffer copy to ensure it's not SharedArrayBuffer
      const buffer = new ArrayBuffer(data.length)
      new Uint8Array(buffer).set(data)
      await writable.write(buffer)
    }
    await writable.close()
  }

  async unlink(filepath: string): Promise<void> {
    const parts = filepath.split('/').filter(Boolean)
    let current: FileSystemDirectoryHandle = this.root

    for (let i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i])
    }

    await current.removeEntry(parts[parts.length - 1])
  }

  async readdir(filepath: string): Promise<string[]> {
    let dir: FileSystemDirectoryHandle = this.root

    if (filepath && filepath !== '.' && filepath !== '/') {
      const parts = filepath.split('/').filter(Boolean)
      for (const part of parts) {
        dir = await dir.getDirectoryHandle(part)
      }
    }

    const entries: string[] = []
    // Use type assertion for iterator - TypeScript doesn't have full FSA types
    const dirIterator = (dir as unknown as AsyncIterable<FileSystemHandle>)[Symbol.asyncIterator]()
    for await (const entry of { [Symbol.asyncIterator]: () => dirIterator }) {
      entries.push(entry.name)
    }
    return entries
  }

  async mkdir(filepath: string): Promise<void> {
    const parts = filepath.split('/').filter(Boolean)
    let current: FileSystemDirectoryHandle = this.root

    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: true })
    }
  }

  async rmdir(filepath: string): Promise<void> {
    const parts = filepath.split('/').filter(Boolean)
    let current: FileSystemDirectoryHandle = this.root

    for (let i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i])
    }

    await current.removeEntry(parts[parts.length - 1], { recursive: true })
  }

  async stat(filepath: string): Promise<{ type: 'file' | 'dir'; mode: number; size: number; mtimeMs: number }> {
    const handle = await this.getHandle(filepath)
    if (!handle) {
      throw new Error(`ENOENT: ${filepath}`)
    }

    if (handle.kind === 'file') {
      const file = await (handle as FileSystemFileHandle).getFile()
      return {
        type: 'file',
        mode: 0o100644,
        size: file.size,
        mtimeMs: file.lastModified,
      }
    } else {
      return {
        type: 'dir',
        mode: 0o40755,
        size: 0,
        mtimeMs: Date.now(),
      }
    }
  }

  async lstat(filepath: string): Promise<{ type: 'file' | 'dir'; mode: number; size: number; mtimeMs: number; isSymbolicLink: () => boolean }> {
    const stat = await this.stat(filepath)
    return {
      ...stat,
      isSymbolicLink: () => false,
    }
  }

  async readlink(_filepath: string): Promise<string> {
    throw new Error('Symlinks not supported')
  }

  async symlink(_target: string, _filepath: string): Promise<void> {
    throw new Error('Symlinks not supported')
  }

  async chmod(_filepath: string, _mode: number): Promise<void> {
    // No-op: File System Access API doesn't support chmod
  }
}

// Create isomorphic-git compatible fs object
function createFS(root: FileSystemDirectoryHandle) {
  const adapter = new FSAAdapter(root)

  return {
    promises: {
      readFile: async (filepath: string, options?: { encoding?: string }) => {
        const data = await adapter.readFile(filepath)
        if (options?.encoding === 'utf8') {
          return new TextDecoder().decode(data)
        }
        return data
      },
      writeFile: async (filepath: string, data: Uint8Array | string) => {
        await adapter.writeFile(filepath, data)
      },
      unlink: async (filepath: string) => {
        await adapter.unlink(filepath)
      },
      readdir: async (filepath: string) => {
        return adapter.readdir(filepath)
      },
      mkdir: async (filepath: string) => {
        await adapter.mkdir(filepath)
      },
      rmdir: async (filepath: string) => {
        await adapter.rmdir(filepath)
      },
      stat: async (filepath: string) => {
        return adapter.stat(filepath)
      },
      lstat: async (filepath: string) => {
        return adapter.lstat(filepath)
      },
      readlink: async (filepath: string) => {
        return adapter.readlink(filepath)
      },
      symlink: async (target: string, filepath: string) => {
        await adapter.symlink(target, filepath)
      },
      chmod: async (filepath: string, mode: number) => {
        await adapter.chmod(filepath, mode)
      },
    },
  }
}

// Git service class
export class GitService {
  private fs: ReturnType<typeof createFS>
  private dir: string = '/'

  constructor(rootHandle: FileSystemDirectoryHandle) {
    this.fs = createFS(rootHandle)
  }

  async isGitRepo(): Promise<boolean> {
    try {
      await this.fs.promises.stat('.git')
      return true
    } catch {
      return false
    }
  }

  async getCurrentBranch(): Promise<string | null> {
    try {
      const branch = await git.currentBranch({
        fs: this.fs,
        dir: this.dir,
        fullname: false,
      })
      return branch || null
    } catch {
      return null
    }
  }

  async getFileStatus(filepath: string): Promise<GitFileStatus> {
    try {
      const status = await git.status({
        fs: this.fs,
        dir: this.dir,
        filepath,
      })

      // isomorphic-git status returns a string like 'modified', 'added', etc.
      // or '*modified' for staged changes
      switch (status) {
        case 'unmodified':
          return 'unmodified'
        case 'modified':
        case '*modified':
          return 'modified'
        case 'added':
        case '*added':
          return 'added'
        case 'deleted':
        case '*deleted':
          return 'deleted'
        case 'absent':
        case '*absent':
          return 'deleted'
        case 'ignored':
          return 'ignored'
        default:
          // Untracked files or unknown status
          if (status.includes('untracked') || status === '*unmodified') {
            return 'untracked'
          }
          return 'unmodified'
      }
    } catch {
      return 'untracked'
    }
  }

  async getStatus(): Promise<GitStatus> {
    const isRepo = await this.isGitRepo()

    if (!isRepo) {
      return {
        branch: null,
        files: {},
        isRepo: false,
      }
    }

    const branch = await this.getCurrentBranch()
    const files: Record<string, GitFileStatus> = {}

    try {
      // Get status of all files using statusMatrix
      const matrix = await git.statusMatrix({
        fs: this.fs,
        dir: this.dir,
      })

      for (const [filepath, headStatus, workdirStatus, stageStatus] of matrix) {
        // Decode status from matrix
        // [filepath, HEAD, WORKDIR, STAGE]
        // HEAD: 0 = absent, 1 = present
        // WORKDIR: 0 = absent, 1 = identical to HEAD, 2 = different from HEAD
        // STAGE: 0 = absent, 1 = identical to HEAD, 2 = identical to WORKDIR, 3 = different from WORKDIR

        if (headStatus === 0 && workdirStatus === 2) {
          files[filepath] = 'untracked'
        } else if (headStatus === 1 && workdirStatus === 0) {
          files[filepath] = 'deleted'
        } else if (headStatus === 1 && workdirStatus === 2) {
          files[filepath] = 'modified'
        } else if (headStatus === 0 && stageStatus === 2) {
          files[filepath] = 'added'
        } else if (headStatus === 1 && workdirStatus === 1) {
          files[filepath] = 'unmodified'
        }
      }
    } catch (error) {
      console.error('Failed to get git status matrix:', error)
    }

    return {
      branch,
      files,
      isRepo,
    }
  }

  async getFileDiff(filepath: string): Promise<string | null> {
    try {
      // Get the current content
      const currentContent = await this.fs.promises.readFile(filepath, { encoding: 'utf8' })

      // Get the HEAD content
      const commitOid = await git.resolveRef({
        fs: this.fs,
        dir: this.dir,
        ref: 'HEAD',
      })

      const { blob } = await git.readBlob({
        fs: this.fs,
        dir: this.dir,
        oid: commitOid,
        filepath,
      })

      const headContent = new TextDecoder().decode(blob)

      // Simple diff - just return both versions for now
      // A proper diff library could be added later
      if (headContent === currentContent) {
        return null
      }

      return `--- a/${filepath}\n+++ b/${filepath}\n\n${currentContent}`
    } catch {
      return null
    }
  }
}

// Singleton instance holder
let gitServiceInstance: GitService | null = null
let currentRootHandle: FileSystemDirectoryHandle | null = null

export function initGitService(rootHandle: FileSystemDirectoryHandle): GitService {
  if (gitServiceInstance && currentRootHandle === rootHandle) {
    return gitServiceInstance
  }

  currentRootHandle = rootHandle
  gitServiceInstance = new GitService(rootHandle)
  return gitServiceInstance
}

export function getGitService(): GitService | null {
  return gitServiceInstance
}

export function clearGitService(): void {
  gitServiceInstance = null
  currentRootHandle = null
}
