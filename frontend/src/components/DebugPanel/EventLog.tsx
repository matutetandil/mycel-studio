import { useRef, useEffect } from 'react'
import { useDebugStore, type DebugEvent } from '../../stores/useDebugStore'

const eventColors: Record<string, string> = {
  'event.flowStart': 'text-green-400',
  'event.flowEnd': 'text-green-300',
  'event.stageEnter': 'text-blue-400',
  'event.stageExit': 'text-blue-300',
  'event.ruleEval': 'text-purple-400',
  'event.stopped': 'text-amber-400',
  'event.continued': 'text-neutral-400',
}

const eventLabels: Record<string, string> = {
  'event.flowStart': 'FLOW START',
  'event.flowEnd': 'FLOW END',
  'event.stageEnter': 'ENTER',
  'event.stageExit': 'EXIT',
  'event.ruleEval': 'RULE',
  'event.stopped': 'STOPPED',
  'event.continued': 'CONTINUED',
}

function formatEvent(event: DebugEvent): { label: string; detail: string } {
  const p = event.params
  const label = eventLabels[event.method] || event.method

  switch (event.method) {
    case 'event.flowStart':
      return { label, detail: `${p.flowName}` }
    case 'event.flowEnd':
      return { label, detail: `${p.flowName} ${p.error ? `ERROR: ${p.error}` : `(${p.durationUs}us)`}` }
    case 'event.stageEnter':
      return { label, detail: `${p.flowName} > ${p.stage}${p.name ? ` [${p.name}]` : ''}` }
    case 'event.stageExit': {
      const dur = p.durationUs ? ` (${p.durationUs}us)` : ''
      return { label, detail: `${p.flowName} > ${p.stage}${dur}${p.error ? ` ERROR: ${p.error}` : ''}` }
    }
    case 'event.ruleEval':
      return { label, detail: `${p.target} = ${p.expression} => ${JSON.stringify(p.result)}` }
    case 'event.stopped':
      return { label, detail: `${p.flowName} @ ${p.stage}${p.rule ? ` [${p.rule.target}]` : ''} (${p.reason})` }
    case 'event.continued':
      return { label, detail: '' }
    default:
      return { label: event.method, detail: JSON.stringify(p) }
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`
}

export default function EventLog() {
  const events = useDebugStore(s => s.events)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events.length])

  if (events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 text-xs p-4 text-center">
        No events yet. Connect to a running Mycel service and trigger requests.
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="h-full overflow-auto text-xs font-mono">
      {events.map(event => {
        const { label, detail } = formatEvent(event)
        const color = eventColors[event.method] || 'text-neutral-400'
        return (
          <div
            key={event.id}
            className={`flex items-start gap-2 px-2 py-0.5 hover:bg-neutral-800/50 ${
              event.method === 'event.stopped' ? 'bg-amber-900/10' : ''
            }`}
          >
            <span className="text-neutral-600 shrink-0">{formatTime(event.timestamp)}</span>
            <span className={`${color} shrink-0 w-20 text-right`}>{label}</span>
            <span className="text-neutral-300 truncate">{detail}</span>
          </div>
        )
      })}
    </div>
  )
}
