import { useEffect, useCallback, useState } from 'react'
import { isWailsRuntime } from '../lib/api'
import { useNotificationStore } from '../stores/useNotificationStore'

interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  releaseURL: string
  releaseNotes: string
  assetName: string
  assetURL: string
  checksumURL: string
  available: boolean
}

interface UpdateProgress {
  stage: string
  percent: number
  message: string
}

export interface UpdateManagerState {
  updateInfo: UpdateInfo | null
  downloadProgress: { percent: number; message: string } | null
  isDownloading: boolean
  updateReady: boolean
  whatsNewOpen: boolean
  setWhatsNewOpen: (open: boolean) => void
}

export function useUpdateManager(): UpdateManagerState {
  const addNotification = useNotificationStore((s) => s.addNotification)
  const removeNotification = useNotificationStore((s) => s.removeNotification)

  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<{ percent: number; message: string } | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const [restartNotifId, setRestartNotifId] = useState<string | null>(null)

  const handleRestart = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updater = (window as any).go?.main?.Updater
      await updater?.RestartApp()
    } catch (err) {
      console.error('Restart failed:', err)
    }
  }, [])

  useEffect(() => {
    if (!isWailsRuntime()) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rt = (window as any).runtime
    if (!rt?.EventsOn) return

    const cleanups: Array<() => void> = []

    // Update ready — auto-downloaded and installed, just needs restart
    rt.EventsOn('updater:update-ready', (data: UpdateInfo) => {
      setUpdateInfo(data)
      setIsDownloading(false)
      setDownloadProgress(null)
      setUpdateReady(true)

      // Remove previous restart notification if still showing
      if (restartNotifId) {
        removeNotification(restartNotifId)
      }

      const id = addNotification({
        type: 'success',
        title: `Mycel Studio v${data.latestVersion} ready`,
        message: 'A new version has been downloaded and installed. Restart to apply.',
        actions: [
          { label: 'Restart Now', onClick: () => handleRestart(), primary: true },
          { label: "What's New", onClick: () => setWhatsNewOpen(true) },
          { label: 'Later', onClick: () => removeNotification(id) },
        ],
      })
      setRestartNotifId(id)
    })
    cleanups.push(() => rt.EventsOff('updater:update-ready'))

    // Download progress — shown in status bar during background download
    rt.EventsOn('updater:progress', (data: UpdateProgress) => {
      if (data.stage === 'downloading' || data.stage === 'verifying' || data.stage === 'installing') {
        setIsDownloading(true)
        setDownloadProgress({ percent: data.percent, message: data.message })
      } else if (data.stage === 'done') {
        setIsDownloading(false)
        setDownloadProgress(null)
        // update-ready event will follow with the notification
      } else if (data.stage === 'error') {
        setIsDownloading(false)
        setDownloadProgress(null)
        // Only show error for manual checks (background failures are silent)
      }
    })
    cleanups.push(() => rt.EventsOff('updater:progress'))

    // Manual "Check for Updates" from menu — triggers auto-install flow
    rt.EventsOn('menu:check-updates', async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updater = (window as any).go?.main?.Updater
        const result = await updater?.CheckForUpdates()
        if (result?.available) {
          setUpdateInfo(result)
          addNotification({
            type: 'info',
            title: `Downloading v${result.latestVersion}...`,
            message: 'The update will be installed automatically.',
            autoHide: 3000,
          })
          // Trigger auto-install in the background
          updater?.CheckAndAutoInstall()
        } else {
          addNotification({
            type: 'success',
            title: 'You are up to date',
            message: `Running Mycel Studio v${result?.currentVersion || 'dev'}.`,
            autoHide: 4000,
          })
        }
      } catch (err) {
        console.error('Update check failed:', err)
        addNotification({
          type: 'error',
          title: 'Update check failed',
          message: String(err),
          autoHide: 5000,
        })
      }
    })
    cleanups.push(() => rt.EventsOff('menu:check-updates'))

    return () => cleanups.forEach((fn) => fn())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    updateInfo,
    downloadProgress,
    isDownloading,
    updateReady,
    whatsNewOpen,
    setWhatsNewOpen,
  }
}
