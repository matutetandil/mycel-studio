import { useState } from 'react'
import {
  Play,
  Pause,
  SkipForward,
  ArrowDownToLine,
  Square,
  Plug,
  Trash2,
  ChevronDown,
  Download,
  Loader2,
} from 'lucide-react'
import { useDebugStore } from '../../stores/useDebugStore'
import { useMultiProjectStore } from '../../stores/useMultiProjectStore'

export default function DebugToolbar() {
  const { status, stoppedAt, threads, activeThreadId, runtimeUrl, ready, sources, consuming } = useDebugStore()
  const { connect, disconnect, debugContinue, debugNext, debugStepInto, consume, setActiveThread, setRuntimeUrl, clearEvents } = useDebugStore()
  const multiProject = useMultiProjectStore()
  const hasMultipleProjects = multiProject.projectOrder.length > 1
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlDraft, setUrlDraft] = useState(runtimeUrl)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPaused = stoppedAt !== null
  const isConnected = status === 'connected'
  const manualSources = sources.filter(s => s.manualConsume)

  const handleConnect = async () => {
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
    <div className="flex items-center gap-1 px-2 py-1 bg-neutral-900 border-b border-neutral-800 min-h-[33px] flex-wrap">
      {/* Connect button (only when disconnected) */}
      {!isConnected && (
        <div className="flex items-center gap-1">
          {showUrlInput ? (
            <>
              <input
                value={urlDraft}
                onChange={e => { setUrlDraft(e.target.value); setRuntimeUrl(e.target.value) }}
                onKeyDown={e => { if (e.key === 'Enter') handleConnect(); if (e.key === 'Escape') setShowUrlInput(false) }}
                placeholder="ws://localhost:9090/debug"
                className="text-xs bg-neutral-800 text-white px-2 py-1 rounded border border-neutral-700 outline-none w-56 font-mono"
                autoFocus
              />
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="px-2 py-1 rounded text-xs bg-green-700 hover:bg-green-600 text-white disabled:opacity-50"
              >
                {connecting ? '...' : 'Go'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowUrlInput(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 border border-neutral-700"
            >
              <Plug className="w-3 h-3" />
              <span>Connect</span>
            </button>
          )}
        </div>
      )}

      {error && (
        <span className="text-xs text-red-400 truncate max-w-48" title={error}>
          {error}
        </span>
      )}

      {/* Stop button (only when connected) */}
      {isConnected && (
        <button
          onClick={disconnect}
          title="Disconnect from runtime"
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-800/50"
        >
          <Square className="w-3 h-3" />
          <span>Stop</span>
        </button>
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

      {/* Manual consume buttons */}
      {isConnected && ready && manualSources.length > 0 && (
        <>
          <div className="w-px h-5 bg-neutral-700 mx-1" />
          {manualSources.map(source => {
            const isConsuming = consuming.has(source.connector)
            return (
              <button
                key={source.connector}
                onClick={() => consume(source.connector)}
                disabled={isConsuming}
                title={`Consume next message from ${source.connector} (${source.type}: ${source.source})`}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${
                  isConsuming
                    ? 'bg-amber-900/30 text-amber-400 border-amber-800/50 cursor-wait'
                    : 'bg-indigo-900/30 text-indigo-400 hover:bg-indigo-900/50 border-indigo-800/50'
                }`}
              >
                {isConsuming
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Download className="w-3 h-3" />
                }
                <span>{source.connector}</span>
              </button>
            )
          })}
        </>
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

      {/* Project selector (when multiple projects attached) */}
      {hasMultipleProjects && (
        <div className="flex items-center gap-1">
          <select
            value={multiProject.activeProjectId || ''}
            onChange={e => {
              const id = e.target.value
              if (id) {
                multiProject.setActiveProject(id)
                // Load the debug URL for that project
                const project = multiProject.getProject(id)
                if (project) {
                  setRuntimeUrl(project.runtimeUrl)
                  setUrlDraft(project.runtimeUrl)
                }
              }
            }}
            className="text-xs bg-neutral-800 text-neutral-300 px-1.5 py-1 rounded border border-neutral-700 outline-none max-w-32"
            title="Debug target project"
          >
            {multiProject.projectOrder.map(id => {
              const project = multiProject.projects.get(id)
              return (
                <option key={id} value={id}>
                  {project?.projectName || 'Unnamed'}
                </option>
              )
            })}
          </select>
        </div>
      )}

      {/* Connection status indicator */}
      <div className="flex items-center gap-1.5 ml-1" title={isConnected ? `${runtimeUrl}${ready ? ' (ready)' : ' (handshake...)'}` : 'Not connected'}>
        <div className={`w-2 h-2 rounded-full ${
          isConnected && ready ? 'bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]' :
          isConnected ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]' :
          'bg-neutral-600'
        }`} />
        <span className={`text-xs ${
          isConnected && ready ? 'text-green-400' :
          isConnected ? 'text-amber-400' :
          'text-neutral-500'
        }`}>
          {status === 'connecting' ? 'Connecting...' :
           isConnected && !ready ? 'Handshake...' :
           isConnected ? 'Ready' :
           'Disconnected'}
        </span>
      </div>
    </div>
  )
}
