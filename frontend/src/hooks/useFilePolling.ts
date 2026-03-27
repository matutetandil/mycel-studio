// Polls the filesystem for changes made outside Studio (new files, deleted files, modified content).
// Runs every 5 seconds when a project is open.

import { useEffect, useRef } from 'react'
import { useProjectStore, type ProjectFile } from '../stores/useProjectStore'
import { useMultiProjectStore } from '../stores/useMultiProjectStore'
import { isWailsRuntime } from '../lib/api'

const POLL_INTERVAL = 5000

async function refreshFiles() {
  const { projectPath, files, projectName } = useProjectStore.getState()
  if (!projectPath || !projectName) return

  // Only works in Wails (native FS access)
  if (!isWailsRuntime()) return

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).go?.main?.App
    if (!app?.ReadDirectoryTree) return

    const entries = await app.ReadDirectoryTree(projectPath)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const diskFiles: Array<{ name: string; relativePath: string; content: string; isDirectory: boolean }> = entries

    const diskFileMap = new Map<string, string>()
    for (const e of diskFiles) {
      if (!e.isDirectory) diskFileMap.set(e.relativePath, e.content)
    }
    const currentPaths = new Set(files.map(f => f.relativePath))

    // Find new files (on disk but not in store)
    const newFiles: ProjectFile[] = diskFiles
      .filter(e => !e.isDirectory && !currentPaths.has(e.relativePath))
      .map(e => ({
        name: e.name,
        path: e.relativePath,
        relativePath: e.relativePath,
        content: e.content,
        isDirty: false,
      }))

    // Find deleted files (in store but not on disk)
    const deletedPaths = new Set<string>()
    for (const f of files) {
      if (!diskFileMap.has(f.relativePath)) {
        deletedPaths.add(f.relativePath)
      }
    }

    // Find modified files (content on disk differs from store, and file is NOT dirty)
    const modifiedFiles = new Set<string>()
    for (const f of files) {
      if (f.isDirty || deletedPaths.has(f.relativePath)) continue
      const diskContent = diskFileMap.get(f.relativePath)
      if (diskContent !== undefined && diskContent !== f.content) {
        modifiedFiles.add(f.relativePath)
      }
    }

    // Only update if something changed
    if (newFiles.length === 0 && deletedPaths.size === 0 && modifiedFiles.size === 0) return

    const updatedFiles = [
      ...files
        .filter(f => !deletedPaths.has(f.relativePath))
        .map(f => {
          if (modifiedFiles.has(f.relativePath)) {
            return { ...f, content: diskFileMap.get(f.relativePath)!, isDirty: false }
          }
          return f
        }),
      ...newFiles,
    ]

    useProjectStore.setState({ files: updatedFiles })

    // Also refresh git status
    useProjectStore.getState().refreshGitStatus()

    // Notify IDE engine about deleted files
    if (deletedPaths.size > 0) {
      const { ideRemoveFile } = await import('../lib/api')
      for (const relPath of deletedPaths) {
        ideRemoveFile(projectPath + '/' + relPath)
      }
    }

    // Refresh hints (external changes may affect project structure)
    if (newFiles.length > 0 || deletedPaths.size > 0) {
      import('../stores/useHintsStore').then(({ useHintsStore }) => {
        useHintsStore.getState().refreshHints()
      })
    }

    // Refresh IDE engine for modified files so diagnostics/completions update
    if (modifiedFiles.size > 0) {
      const { ideUpdateFile } = await import('../lib/api')
      for (const relPath of modifiedFiles) {
        const absPath = projectPath + '/' + relPath
        const content = diskFileMap.get(relPath)
        if (content !== undefined) {
          ideUpdateFile(absPath, content)
        }
      }
    }

    // Canvas sync is handled by useFileToCanvasSync (reacts to store file changes)

    // Refresh git status for all attached projects (inactive ones)
    useMultiProjectStore.getState().refreshAllProjectsGitStatus()
  } catch {
    // Ignore errors — polling is best-effort
  }
}

export function useFilePolling() {
  const projectPath = useProjectStore(s => s.projectPath)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!projectPath) return

    intervalRef.current = setInterval(refreshFiles, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [projectPath])
}
