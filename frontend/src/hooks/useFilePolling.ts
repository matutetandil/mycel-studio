// Polls the filesystem for changes made outside Studio (new files, deleted files).
// Runs every 5 seconds when a project is open.

import { useEffect, useRef } from 'react'
import { useProjectStore, type ProjectFile } from '../stores/useProjectStore'
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

    const diskFilePaths = new Set(
      diskFiles.filter(e => !e.isDirectory).map(e => e.relativePath)
    )
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
      if (!diskFilePaths.has(f.relativePath)) {
        deletedPaths.add(f.relativePath)
      }
    }

    // Only update if something changed
    if (newFiles.length === 0 && deletedPaths.size === 0) return

    const updatedFiles = [
      ...files.filter(f => !deletedPaths.has(f.relativePath)),
      ...newFiles,
    ]

    useProjectStore.setState({ files: updatedFiles })

    // Also refresh git status for the new files
    useProjectStore.getState().refreshGitStatus()
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
