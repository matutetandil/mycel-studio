import { useEffect, useRef, useCallback, useState } from 'react'
import { Trash2, Copy, Check } from 'lucide-react'
import { useOutputStore, type OutputChannel, type OutputLevel } from '../../stores/useOutputStore'

const levelColors: Record<OutputLevel, string> = {
  info: 'text-neutral-300',
  warn: 'text-amber-400',
  error: 'text-red-400',
  debug: 'text-neutral-500',
  send: 'text-sky-400',
  recv: 'text-emerald-400',
}

const levelLabels: Record<OutputLevel, string> = {
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
  debug: 'DEBUG',
  send: 'SEND',
  recv: 'RECV',
}

const channels: OutputChannel[] = ['Debug', 'App']

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

export default function OutputPanel() {
  const entries = useOutputStore(s => s.entries)
  const activeChannel = useOutputStore(s => s.activeChannel)
  const setActiveChannel = useOutputStore(s => s.setActiveChannel)
  const clear = useOutputStore(s => s.clear)
  const scrollRef = useRef<HTMLDivElement>(null)

  const filtered = entries.filter(e => e.channel === activeChannel)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filtered.length])

  const [copied, setCopied] = useState(false)
  const [cleared, setCleared] = useState(false)

  const copyAll = useCallback(() => {
    const text = filtered.map(e =>
      `${formatTime(e.timestamp)} [${levelLabels[e.level]}] ${e.message}`
    ).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [filtered])

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-neutral-800 shrink-0">
        {/* Channel selector */}
        <select
          value={activeChannel}
          onChange={e => setActiveChannel(e.target.value as OutputChannel)}
          className="bg-neutral-800 text-neutral-300 text-xs border border-neutral-700 rounded px-1.5 py-0.5 outline-none focus:border-indigo-500"
        >
          {channels.map(ch => (
            <option key={ch} value={ch}>{ch}</option>
          ))}
        </select>

        <div className="flex-1" />

        {/* Copy all button */}
        <button
          onClick={copyAll}
          title="Copy all output"
          className={`p-1 rounded ${copied ? 'text-green-400' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {/* Clear button */}
        <button
          onClick={() => {
            clear(activeChannel)
            setCleared(true)
            setTimeout(() => setCleared(false), 1500)
          }}
          title="Clear output"
          className={`p-1 rounded ${cleared ? 'text-green-400' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}
        >
          {cleared ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Log entries */}
      <div ref={scrollRef} className="flex-1 overflow-auto font-mono text-xs leading-5 p-1 select-text cursor-text">
        {filtered.length === 0 ? (
          <div className="text-neutral-600 text-center py-4 select-none cursor-default">No output</div>
        ) : (
          filtered.map(entry => (
            <div key={entry.id} className="flex gap-2 px-1 hover:bg-neutral-800/50">
              <span className="text-neutral-600 shrink-0">{formatTime(entry.timestamp)}</span>
              <span className={`shrink-0 w-10 text-right ${levelColors[entry.level]}`}>
                [{levelLabels[entry.level]}]
              </span>
              <span className={`${levelColors[entry.level]} whitespace-pre-wrap break-all`}>
                {entry.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
