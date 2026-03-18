// App lifecycle: reopen last project on startup, confirm before closing

import { useEffect, useRef } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useProjectStore } from '../stores/useProjectStore'
import { isWailsRuntime } from '../lib/api'

export function useAppLifecycle() {
  const didReopen = useRef(false)

  // Reopen last project on startup
  useEffect(() => {
    if (didReopen.current) return
    didReopen.current = true

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

  // Confirm before closing (desktop only)
  useEffect(() => {
    if (isWailsRuntime()) {
      // Wails handles this via OnBeforeClose in Go
      return
    }

    // Browser: beforeunload event
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const { confirmOnClose } = useSettingsStore.getState()
      const { files } = useProjectStore.getState()
      const hasDirty = files.some(f => f.isDirty)

      if (confirmOnClose && hasDirty) {
        e.preventDefault()
        // Modern browsers show a generic message
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])
}
