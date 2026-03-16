import { useEffect, useRef } from 'react'
import { useProjectStore } from '../stores/useProjectStore'

const POLL_INTERVAL = 3000

export function useGitPolling() {
  const projectPath = useProjectStore((s) => s.projectPath)
  const refreshGitStatus = useProjectStore((s) => s.refreshGitStatus)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!projectPath) return

    intervalRef.current = setInterval(() => {
      refreshGitStatus()
    }, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [projectPath, refreshGitStatus])
}
