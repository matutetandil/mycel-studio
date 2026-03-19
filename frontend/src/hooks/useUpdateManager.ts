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
  const [updateNotifId, setUpdateNotifId] = useState<string | null>(null)

  const handleUpdate = useCallback(async (info: UpdateInfo) => {
    try {
      setIsDownloading(true)
      setDownloadProgress({ percent: 0, message: 'Starting download...' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updater = (window as any).go?.main?.Updater
      await updater?.DownloadAndInstall(info.assetURL, info.checksumURL, info.assetName)
    } catch (err) {
      setIsDownloading(false)
      setDownloadProgress(null)
      addNotification({
        type: 'error',
        title: 'Update failed',
        message: String(err),
        actions: [
          { label: 'Retry', onClick: () => handleUpdate(info), primary: true },
        ],
      })
    }
  }, [addNotification])

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

    // Update available
    rt.EventsOn('updater:update-available', (data: UpdateInfo) => {
      setUpdateInfo(data)

      // Remove previous update notification if any
      if (updateNotifId) {
        removeNotification(updateNotifId)
      }

      const id = addNotification({
        type: 'info',
        title: `Mycel Studio v${data.latestVersion} available`,
        message: `You are running v${data.currentVersion}. A new version is ready to download.`,
        actions: [
          { label: 'Update Now', onClick: () => handleUpdate(data), primary: true },
          { label: "What's New", onClick: () => setWhatsNewOpen(true) },
          { label: 'Later', onClick: () => removeNotification(id) },
        ],
        dismissable: true,
      })
      setUpdateNotifId(id)
    })
    cleanups.push(() => rt.EventsOff('updater:update-available'))

    // Download progress — update status bar state, not new notifications
    rt.EventsOn('updater:progress', (data: UpdateProgress) => {
      if (data.stage === 'downloading' || data.stage === 'verifying' || data.stage === 'installing') {
        setIsDownloading(true)
        setDownloadProgress({ percent: data.percent, message: data.message })
      } else if (data.stage === 'done') {
        setIsDownloading(false)
        setDownloadProgress(null)
        setUpdateReady(true)

        addNotification({
          type: 'success',
          title: 'Update installed successfully',
          message: 'Restart Mycel Studio to apply the update.',
          actions: [
            { label: 'Restart Now', onClick: () => handleRestart(), primary: true },
            { label: 'Later', onClick: () => {} },
          ],
        })
      } else if (data.stage === 'error') {
        setIsDownloading(false)
        setDownloadProgress(null)

        addNotification({
          type: 'error',
          title: 'Update failed',
          message: data.message,
          actions: [
            ...(updateInfo ? [{ label: 'Retry', onClick: () => handleUpdate(updateInfo), primary: true }] : []),
          ],
        })
      }
    })
    cleanups.push(() => rt.EventsOff('updater:progress'))

    // Manual check from menu
    rt.EventsOn('menu:check-updates', async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updater = (window as any).go?.main?.Updater
        const result = await updater?.CheckForUpdates()
        if (result?.available) {
          setUpdateInfo(result)

          const id = addNotification({
            type: 'info',
            title: `Mycel Studio v${result.latestVersion} available`,
            message: `You are running v${result.currentVersion}.`,
            actions: [
              { label: 'Update Now', onClick: () => handleUpdate(result), primary: true },
              { label: "What's New", onClick: () => setWhatsNewOpen(true) },
            ],
          })
          setUpdateNotifId(id)
        } else {
          addNotification({
            type: 'success',
            title: 'You are up to date',
            message: 'You are running the latest version of Mycel Studio.',
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
