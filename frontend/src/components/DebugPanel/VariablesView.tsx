import { useCallback, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useDebugStore } from '../../stores/useDebugStore'

// Persistent expand/collapse state that survives re-renders when variables change.
// Keys are dot-paths like "input", "input.body", "input.body.payload", etc.
const expandedPaths = new Set<string>()

function togglePath(path: string) {
  if (expandedPaths.has(path)) {
    expandedPaths.delete(path)
  } else {
    expandedPaths.add(path)
  }
}

function ValueNode({ name, value, path, depth = 0, onToggle }: {
  name: string
  value: unknown
  path: string
  depth?: number
  onToggle: () => void // triggers re-render from parent
}) {
  const expanded = expandedPaths.has(path)

  const handleToggle = useCallback(() => {
    togglePath(path)
    onToggle()
  }, [path, onToggle])

  if (value === null || value === undefined) {
    return (
      <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: depth * 16 }}>
        <span className="w-3" />
        <span className="text-neutral-400">{name}</span>
        <span className="text-neutral-600">:</span>
        <span className="text-neutral-500 italic">{value === null ? 'null' : 'undefined'}</span>
      </div>
    )
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>)
    return (
      <div>
        <button
          onClick={handleToggle}
          className="flex items-center gap-1 py-0.5 hover:bg-neutral-800 w-full text-left"
          style={{ paddingLeft: depth * 16 }}
        >
          {expanded ? <ChevronDown className="w-3 h-3 text-neutral-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-neutral-500 shrink-0" />}
          <span className="text-blue-400">{name}</span>
          <span className="text-neutral-600 text-xs ml-1">{`{${entries.length}}`}</span>
        </button>
        {expanded && entries.map(([k, v]) => (
          <ValueNode key={k} name={k} value={v} path={`${path}.${k}`} depth={depth + 1} onToggle={onToggle} />
        ))}
      </div>
    )
  }

  if (Array.isArray(value)) {
    return (
      <div>
        <button
          onClick={handleToggle}
          className="flex items-center gap-1 py-0.5 hover:bg-neutral-800 w-full text-left"
          style={{ paddingLeft: depth * 16 }}
        >
          {expanded ? <ChevronDown className="w-3 h-3 text-neutral-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-neutral-500 shrink-0" />}
          <span className="text-blue-400">{name}</span>
          <span className="text-neutral-600 text-xs ml-1">[{value.length}]</span>
        </button>
        {expanded && value.map((v, i) => (
          <ValueNode key={i} name={String(i)} value={v} path={`${path}.${i}`} depth={depth + 1} onToggle={onToggle} />
        ))}
      </div>
    )
  }

  const colorClass = typeof value === 'string' ? 'text-green-400'
    : typeof value === 'number' ? 'text-amber-400'
    : typeof value === 'boolean' ? 'text-purple-400'
    : 'text-neutral-300'

  const displayValue = typeof value === 'string' ? `"${value}"` : String(value)

  return (
    <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: depth * 16 }}>
      <span className="w-3" />
      <span className="text-neutral-400">{name}</span>
      <span className="text-neutral-600">:</span>
      <span className={`${colorClass} truncate font-mono text-xs`} title={displayValue}>{displayValue}</span>
    </div>
  )
}

export default function VariablesView() {
  const { variables, stoppedAt } = useDebugStore()
  // Counter to force re-render when expand/collapse changes (since expandedPaths is external)
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(t => t + 1), [])

  if (!stoppedAt) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 text-xs p-4 text-center">
        Not paused. Set breakpoints and trigger a request to inspect variables.
      </div>
    )
  }

  if (!variables) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 text-xs">
        Loading variables...
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto text-xs font-mono p-1">
      {variables.input && <ValueNode name="input" value={variables.input} path="input" onToggle={forceUpdate} />}
      {variables.output && Object.keys(variables.output).length > 0 && <ValueNode name="output" value={variables.output} path="output" onToggle={forceUpdate} />}
      {variables.enriched && Object.keys(variables.enriched).length > 0 && <ValueNode name="enriched" value={variables.enriched} path="enriched" onToggle={forceUpdate} />}
      {variables.steps && Object.keys(variables.steps).length > 0 && <ValueNode name="steps" value={variables.steps} path="steps" onToggle={forceUpdate} />}
      {variables.rule && (
        <div className="mt-2 border-t border-neutral-800 pt-1">
          <div className="text-neutral-500 text-[10px] uppercase tracking-wider mb-1 px-1">Current Rule</div>
          <div className="px-1 space-y-0.5">
            <div><span className="text-neutral-500">index:</span> <span className="text-amber-400">{variables.rule.index}</span></div>
            <div><span className="text-neutral-500">target:</span> <span className="text-blue-400">{variables.rule.target}</span></div>
            <div><span className="text-neutral-500">expr:</span> <span className="text-green-400">{variables.rule.expression}</span></div>
            {variables.rule.result !== undefined && (
              <div><span className="text-neutral-500">result:</span> <span className="text-purple-400">{JSON.stringify(variables.rule.result)}</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
