import { useEffect, useRef, useCallback } from 'react'
import { useProjectStore } from '../stores/useProjectStore'

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

let autoSaveStatus: AutoSaveStatus = 'idle'
const statusListeners = new Set<(s: AutoSaveStatus) => void>()

function setStatus(s: AutoSaveStatus) {
  autoSaveStatus = s
  statusListeners.forEach(l => l(s))
}

export function getAutoSaveStatus() {
  return autoSaveStatus
}

export function onAutoSaveStatus(listener: (s: AutoSaveStatus) => void) {
  statusListeners.add(listener)
  return () => { statusListeners.delete(listener) }
}

export function useAutoSave() {
  const savingRef = useRef(false)

  const trySave = useCallback(async () => {
    if (savingRef.current) return
    const { projectName, files, saveProject } = useProjectStore.getState()
    if (!projectName) return

    const hasDirty = files.some(f => f.isDirty)
    if (!hasDirty) return

    savingRef.current = true
    setStatus('saving')

    try {
      const ok = await saveProject()
      setStatus(ok ? 'saved' : 'error')
      if (ok) {
        setTimeout(() => setStatus('idle'), 2000)
      }
    } catch {
      setStatus('error')
    } finally {
      savingRef.current = false
    }
  }, [])

  useEffect(() => {
    // Save on window blur (IntelliJ-style: save when switching away)
    const handleBlur = () => trySave()

    // Save on visibility change (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') trySave()
    }

    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [trySave])

  // Also save on editor tab switch
  useEffect(() => {
    const { subscribe } = useProjectStore
    let prevActiveFile: string | null = null

    const unsub = subscribe((state) => {
      if (state.activeFile !== prevActiveFile) {
        // Active file changed — save any pending dirty files
        if (prevActiveFile !== null) trySave()
        prevActiveFile = state.activeFile
      }
    })

    return unsub
  }, [trySave])
}
