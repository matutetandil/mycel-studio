import { useState } from 'react'
import {
  Play,
  Pause,
  SkipForward,
  ArrowDownToLine,
  Square,
  Plug,
  Unplug,
  Trash2,
  ChevronDown,
} from 'lucide-react'
import { useDebugStore } from '../../stores/useDebugStore'

export default function DebugToolbar() {
  const { status, stoppedAt, threads, activeThreadId, runtimeUrl } = useDebugStore()
  const { connect, disconnect, debugContinue, debugNext, debugStepInto, setActiveThread, setRuntimeUrl, clearEvents } = useDebugStore()
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlDraft, setUrlDraft] = useState(runtimeUrl)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPaused = stoppedAt !== null
  const isConnected = status === 'connected'

  const handleConnect = async () => {
    if (isConnected) {
      disconnect()
      return
    }
    setConnecting(true)
    setError(null)
    try {
      await connect(urlDraft)
      setShowUrlInput(false)
    } catch (err) {
      setError(String(err))
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-neutral-900 border-b border-neutral-800 min-h-[33px]">
      {/* Connection */}
      <div className="flex items-center gap-1">
        {showUrlInput && !isConnected ? (
          <input
            value={urlDraft}
            onChange={e => { setUrlDraft(e.target.value); setRuntimeUrl(e.target.value) }}
            onKeyDown={e => { if (e.key === 'Enter') handleConnect(); if (e.key === 'Escape') setShowUrlInput(false) }}
            placeholder="ws://localhost:9090/debug"
            className="text-xs bg-neutral-800 text-white px-2 py-1 rounded border border-neutral-700 outline-none w-56 font-mono"
            autoFocus
          />
        ) : (
          <button
            onClick={() => isConnected ? disconnect() : setShowUrlInput(true)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
              isConnected
                ? 'bg-green-900/40 text-green-400 hover:bg-green-900/60 border border-green-800/50'
                : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 border border-neutral-700'
            }`}
            title={isConnected ? `Connected to ${runtimeUrl}` : 'Connect to Mycel runtime'}
          >
            {isConnected
              ? <><Unplug className="w-3 h-3" /><span>Connected</span></>
              : <><Plug className="w-3 h-3" /><span>Connect</span></>
            }
          </button>
        )}

        {showUrlInput && !isConnected && (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-2 py-1 rounded text-xs bg-green-700 hover:bg-green-600 text-white disabled:opacity-50"
          >
            {connecting ? '...' : 'Go'}
          </button>
        )}
      </div>

      {error && (
        <span className="text-xs text-red-400 truncate max-w-48" title={error}>
          {error}
        </span>
      )}

      {/* Separator */}
      {isConnected && <div className="w-px h-5 bg-neutral-700 mx-1" />}

      {/* Execution controls */}
      {isConnected && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => debugContinue()}
            disabled={!isPaused}
            title="Continue (F5)"
            className="p-1.5 rounded hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent text-green-400"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => debugNext()}
            disabled={!isPaused}
            title="Step Over (F10)"
            className="p-1.5 rounded hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent text-blue-400"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => debugStepInto()}
            disabled={!isPaused}
            title="Step Into (F11)"
            className="p-1.5 rounded hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent text-purple-400"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
          </button>
          {isPaused && (
            <span className="ml-1 text-xs text-amber-400 flex items-center gap-1">
              <Pause className="w-3 h-3" />
              Paused at {stoppedAt.stage}
              {stoppedAt.rule && ` [${stoppedAt.rule.target}]`}
            </span>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Thread selector */}
      {isConnected && threads.length > 1 && (
        <div className="flex items-center gap-1">
          <select
            value={activeThreadId || ''}
            onChange={e => setActiveThread(e.target.value)}
            className="text-xs bg-neutral-800 text-neutral-300 px-1.5 py-1 rounded border border-neutral-700 outline-none"
          >
            {threads.map(t => (
              <option key={t.id} value={t.id}>
                {t.flowName} {t.paused ? '(paused)' : `[${t.stage}]`}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-neutral-500 pointer-events-none -ml-5" />
        </div>
      )}

      {/* Clear log */}
      {isConnected && (
        <button
          onClick={clearEvents}
          title="Clear event log"
          className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Stop */}
      {isConnected && (
        <button
          onClick={disconnect}
          title="Disconnect"
          className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-800"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
