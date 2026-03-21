import { useState, useCallback } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import type { FilePreviewerDefinition, FilePreviewerProps } from '../types'

function JsonValue({ value, name, depth, defaultOpen }: { value: unknown; name?: string; depth: number; defaultOpen: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (value === null) return <JsonLeaf name={name} value="null" color="text-neutral-500" />
  if (value === undefined) return <JsonLeaf name={name} value="undefined" color="text-neutral-500" />
  if (typeof value === 'boolean') return <JsonLeaf name={name} value={String(value)} color="text-amber-400" />
  if (typeof value === 'number') return <JsonLeaf name={name} value={String(value)} color="text-emerald-400" />
  if (typeof value === 'string') return <JsonLeaf name={name} value={`"${value}"`} color="text-sky-400" />

  if (Array.isArray(value)) {
    if (value.length === 0) return <JsonLeaf name={name} value="[]" color="text-neutral-500" />
    return (
      <JsonCollapsible
        name={name}
        label={`Array(${value.length})`}
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}

      >
        {value.map((item, i) => (
          <JsonValue key={i} value={item} name={String(i)} depth={depth + 1} defaultOpen={depth < 1} />
        ))}
      </JsonCollapsible>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return <JsonLeaf name={name} value="{}" color="text-neutral-500" />
    return (
      <JsonCollapsible
        name={name}
        label={`{${entries.length}}`}
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}

      >
        {entries.map(([k, v]) => (
          <JsonValue key={k} value={v} name={k} depth={depth + 1} defaultOpen={depth < 1} />
        ))}
      </JsonCollapsible>
    )
  }

  return <JsonLeaf name={name} value={String(value)} color="text-neutral-400" />
}

function JsonLeaf({ name, value, color }: { name?: string; value: string; color: string }) {
  return (
    <div className="flex items-baseline gap-1 py-0.5 pl-4">
      {name !== undefined && <span className="text-violet-400">{name}<span className="text-neutral-600">:</span></span>}
      <span className={color}>{value}</span>
    </div>
  )
}

function JsonCollapsible({ name, label, isOpen, onToggle, children }: {
  name?: string; label: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div>
      <div
        className="flex items-center gap-0.5 py-0.5 cursor-pointer hover:bg-neutral-800/50 rounded"
        onClick={onToggle}
      >
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />}
        {name !== undefined && <span className="text-violet-400">{name}<span className="text-neutral-600">:</span></span>}
        <span className="text-neutral-500 text-xs">{label}</span>
      </div>
      {isOpen && <div className="pl-3 border-l border-neutral-800 ml-1.5">{children}</div>}
    </div>
  )
}

function JsonPreview({ content }: FilePreviewerProps) {
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<unknown>(null)
  const [ready, setReady] = useState(false)

  const parse = useCallback(() => {
    try {
      const data = JSON.parse(content)
      setParsed(data)
      setError(null)
    } catch (e) {
      setError(String(e))
      setParsed(null)
    }
    setReady(true)
  }, [content])

  if (!ready) {
    parse()
  }

  if (error) {
    return <div className="text-red-400 text-sm font-mono p-2">{error}</div>
  }

  return (
    <div className="font-mono text-xs leading-relaxed">
      <JsonValue value={parsed} depth={0} defaultOpen />
    </div>
  )
}

export const jsonPreviewer: FilePreviewerDefinition = {
  extensions: ['.json'],
  label: 'Tree',
  component: JsonPreview,
}
