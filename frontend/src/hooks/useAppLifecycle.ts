// App lifecycle: reopen last project on startup, save workspace + window size before closing

import { useEffect, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useProjectStore } from '../stores/useProjectStore'
import { isWailsRuntime } from '../lib/api'
import { saveWorkspace } from '../stores/useWorkspaceStore'
import { persistMultiProjectState } from './useMultiProjectPersistence'

// Save window size and position to settings (desktop only)
async function saveWindowGeometry() {
  if (!isWailsRuntime()) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).go?.main?.App
    if (app?.GetWindowSize) {
      const size = await app.GetWindowSize()
      useSettingsStore.getState().setWindowSize(size)
    }
    if (app?.GetWindowPosition) {
      const pos = await app.GetWindowPosition()
      useSettingsStore.getState().setWindowPosition(pos)
    }
  } catch { /* ignore */ }
}

// Restore window size and position from settings (desktop only)
function restoreWindowGeometry() {
  if (!isWailsRuntime()) return
  const { windowSize, windowPosition } = useSettingsStore.getState()
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).go?.main?.App
    if (windowPosition) {
      app?.SetWindowPosition(windowPosition.x, windowPosition.y)
    }
    if (windowSize) {
      app?.SetWindowSize(windowSize.width, windowSize.height)
    }
  } catch { /* ignore */ }
}

export function useAppLifecycle() {
  const didReopen = useRef(false)
  const { getViewport } = useReactFlow()

  // Reopen last project + restore window size on startup
  useEffect(() => {
    if (didReopen.current) return
    didReopen.current = true

    restoreWindowGeometry()

    // Check if a --project flag was passed (New Window flow)
    // Falls back to lastProjectPath from settings (normal startup)
    const resolveStartupProject = async (): Promise<string | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const app = (window as any).go?.main?.App
      if (app?.GetStartupProject) {
        const flagPath = await app.GetStartupProject()
        if (flagPath) return flagPath
      }
      return useSettingsStore.getState().lastProjectPath
    }

    // Small delay to let the app fully mount
    setTimeout(async () => {
      const projectPath = await resolveStartupProject()
      if (!projectPath) return

      const { projectName, openProjectAtPath } = useProjectStore.getState()
      if (!projectName) {
        openProjectAtPath(projectPath).catch(() => {
          // Project path no longer exists — clear it
          useSettingsStore.getState().setLastProjectPath(null)
        })
      }
    }, 300)
  }, [])

  // Listen for IPC open-project events from other instances
  useEffect(() => {
    if (!isWailsRuntime()) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runtime = (window as any).runtime
    if (!runtime?.EventsOn) return

    runtime.EventsOn('ipc:open-project', (projectPath: string) => {
      const { openProjectAtPath } = useProjectStore.getState()
      openProjectAtPath(projectPath)
    })

    return () => runtime.EventsOff('ipc:open-project')
  }, [])

  // Save workspace + window size before closing
  useEffect(() => {
    if (isWailsRuntime()) {
      // Listen for Wails before-close event to save workspace
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const runtime = (window as any).runtime
      if (runtime?.EventsOn) {
        runtime.EventsOn('app:before-close', async () => {
          const viewport = getViewport()
          persistMultiProjectState()
          await Promise.all([
            saveWorkspace(viewport),
            saveWindowGeometry(),
          ])
        })
        return () => runtime.EventsOff('app:before-close')
      }
      return
    }

    // Browser: beforeunload event — save workspace and optionally confirm
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const viewport = getViewport()
      persistMultiProjectState()
      saveWorkspace(viewport)

      const { confirmOnClose } = useSettingsStore.getState()
      const { files } = useProjectStore.getState()
      const hasDirty = files.some(f => f.isDirty)

      if (confirmOnClose && hasDirty) {
        e.preventDefault()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [getViewport])
}
