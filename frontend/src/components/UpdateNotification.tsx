import { useState, useEffect } from 'react'
import { Download, RefreshCw, X, ExternalLink } from 'lucide-react'
import { isWailsRuntime } from '../lib/api'

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

export default function UpdateNotification() {
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<UpdateProgress | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isWailsRuntime()) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rt = (window as any).runtime
    if (!rt?.EventsOn) return

    const cleanups: Array<() => void> = []

    rt.EventsOn('updater:update-available', (data: UpdateInfo) => {
      setInfo(data)
      setDismissed(false)
    })
    cleanups.push(() => rt.EventsOff('updater:update-available'))

    rt.EventsOn('updater:progress', (data: UpdateProgress) => {
      setProgress(data)
    })
    cleanups.push(() => rt.EventsOff('updater:progress'))

    rt.EventsOn('menu:check-updates', async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updater = (window as any).go?.main?.Updater
        const result = await updater?.CheckForUpdates()
        if (result?.available) {
          setInfo(result)
          setDismissed(false)
        } else {
          // No update available — brief message
          setInfo(null)
          setProgress({ stage: 'done', percent: 100, message: 'You are running the latest version.' })
          setTimeout(() => setProgress(null), 3000)
        }
      } catch (err) {
        console.error('Update check failed:', err)
      }
    })
    cleanups.push(() => rt.EventsOff('menu:check-updates'))

    return () => cleanups.forEach(fn => fn())
  }, [])

  if (dismissed || (!info && !progress)) return null

  const handleUpdate = async () => {
    if (!info) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updater = (window as any).go?.main?.Updater
      await updater?.DownloadAndInstall(info.assetURL, info.checksumURL, info.assetName)
    } catch (err) {
      setProgress({ stage: 'error', percent: 0, message: String(err) })
    }
  }

  const handleRestart = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updater = (window as any).go?.main?.Updater
      await updater?.RestartApp()
    } catch (err) {
      console.error('Restart failed:', err)
    }
  }

  const isDownloading = progress?.stage === 'downloading'
  const isInstalling = progress?.stage === 'installing' || progress?.stage === 'verifying'
  const isDone = progress?.stage === 'done' && info
  const isError = progress?.stage === 'error'
  const isBusy = isDownloading || isInstalling

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-950/80 border-b border-indigo-800/50 text-xs text-indigo-200 select-none shrink-0">
      {/* Info state: update available */}
      {info && !isBusy && !isDone && !isError && (
        <>
          <Download className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            Mycel Studio <strong>v{info.latestVersion}</strong> is available
            <span className="text-indigo-400/60 ml-1">(current: v{info.currentVersion})</span>
          </span>
          <a
            href={info.releaseURL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-indigo-300 hover:text-indigo-100 underline ml-1"
          >
            Release Notes <ExternalLink className="w-3 h-3" />
          </a>
          <div className="flex-1" />
          <button
            onClick={handleUpdate}
            className="px-2.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
          >
            Update Now
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-0.5 hover:bg-indigo-800/50 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      )}

      {/* Downloading / installing */}
      {isBusy && (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-spin" />
          <span>{progress?.message}</span>
          {isDownloading && progress && (
            <div className="flex-1 max-w-xs h-1.5 bg-indigo-900 rounded-full overflow-hidden ml-2">
              <div
                className="h-full bg-indigo-400 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          )}
        </>
      )}

      {/* Done */}
      {isDone && (
        <>
          <Download className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span className="text-green-300">Update installed successfully.</span>
          <div className="flex-1" />
          <button
            onClick={handleRestart}
            className="px-2.5 py-0.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-medium"
          >
            Restart Now
          </button>
          <button
            onClick={() => { setDismissed(true); setProgress(null) }}
            className="px-2 py-0.5 text-indigo-300 hover:text-white text-xs"
          >
            Later
          </button>
        </>
      )}

      {/* Error */}
      {isError && (
        <>
          <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="text-red-300">{progress?.message}</span>
          <div className="flex-1" />
          <button
            onClick={handleUpdate}
            className="px-2.5 py-0.5 bg-red-600/50 hover:bg-red-600 text-white rounded text-xs"
          >
            Retry
          </button>
          <button
            onClick={() => { setDismissed(true); setProgress(null) }}
            className="p-0.5 hover:bg-indigo-800/50 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      )}

      {/* No update message (from menu check) */}
      {!info && progress?.stage === 'done' && (
        <>
          <Download className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span className="text-green-300">{progress.message}</span>
        </>
      )}
    </div>
  )
}
