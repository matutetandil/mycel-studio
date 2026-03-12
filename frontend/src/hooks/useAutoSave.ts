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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
        // Reset to idle after 2s
        setTimeout(() => setStatus('idle'), 2000)
      }
    } catch {
      setStatus('error')
    } finally {
      savingRef.current = false
    }
  }, [])

  useEffect(() => {
    const unsub = useProjectStore.subscribe((state, prev) => {
      // Only react to file content changes (isDirty)
      if (state.files === prev.files) return
      if (!state.projectName) return

      const hasDirty = state.files.some(f => f.isDirty)
      if (!hasDirty) return

      const debounce = state.metadata?.autoSave?.debounceMs ?? 2000
      if (!state.metadata?.autoSave?.enabled) return

      // Debounce the save
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(trySave, debounce)
    })

    return () => {
      unsub()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [trySave])
}
