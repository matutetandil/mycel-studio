// App lifecycle: reopen last project on startup, save workspace + window size before closing

import { useEffect, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useProjectStore } from '../stores/useProjectStore'
import { isWailsRuntime } from '../lib/api'
import { saveWorkspace } from '../stores/useWorkspaceStore'

// Save window size to settings (desktop only)
async function saveWindowSize() {
  if (!isWailsRuntime()) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).go?.main?.App
    if (app?.GetWindowSize) {
      const size = await app.GetWindowSize()
      useSettingsStore.getState().setWindowSize(size)
    }
  } catch { /* ignore */ }
}

// Restore window size from settings (desktop only)
function restoreWindowSize() {
  if (!isWailsRuntime()) return
  const { windowSize } = useSettingsStore.getState()
  if (!windowSize) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).go?.main?.App
    app?.SetWindowSize(windowSize.width, windowSize.height)
  } catch { /* ignore */ }
}

export function useAppLifecycle() {
  const didReopen = useRef(false)
  const { getViewport } = useReactFlow()

  // Reopen last project + restore window size on startup
  useEffect(() => {
    if (didReopen.current) return
    didReopen.current = true

    restoreWindowSize()

    const { lastProjectPath } = useSettingsStore.getState()
    if (!lastProjectPath) return

    // Small delay to let the app fully mount
    setTimeout(() => {
      const { projectName, openProjectAtPath } = useProjectStore.getState()
      if (!projectName) {
        openProjectAtPath(lastProjectPath).catch(() => {
          // Project path no longer exists — clear it
          useSettingsStore.getState().setLastProjectPath(null)
        })
      }
    }, 300)
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
          await Promise.all([
            saveWorkspace(viewport),
            saveWindowSize(),
          ])
        })
        return () => runtime.EventsOff('app:before-close')
      }
      return
    }

    // Browser: beforeunload event — save workspace and optionally confirm
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const viewport = getViewport()
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
