import { useState, useCallback, useMemo } from 'react'
import { Copy, Check, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useDiagnosticsStore, type DiagnosticEntry, type DiagnosticSeverity } from '../../stores/useDiagnosticsStore'
import { useEditorPanelStore, scopedPath } from '../../stores/useEditorPanelStore'
import { useProjectStore } from '../../stores/useProjectStore'

const severityIcon: Record<DiagnosticSeverity, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  none: Info,
}

const severityColor: Record<DiagnosticSeverity, string> = {
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-sky-400',
  none: 'text-neutral-500',
}

type SeverityFilter = 'all' | 'errors' | 'warnings'

export default function ProblemsPanel() {
  const entries = useDiagnosticsStore(s => s.entries)
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState<SeverityFilter>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return entries
    if (filter === 'errors') return entries.filter(e => e.severity === 'error')
    return entries.filter(e => e.severity === 'warning')
  }, [entries, filter])

  // Group by file
  const grouped = useMemo(() => {
    const map = new Map<string, DiagnosticEntry[]>()
    for (const entry of filtered) {
      const list = map.get(entry.file) || []
      list.push(entry)
      map.set(entry.file, list)
    }
    return map
  }, [filtered])

  const errorCount = entries.filter(e => e.severity === 'error').length
  const warningCount = entries.filter(e => e.severity === 'warning').length

  const copyAll = useCallback(() => {
    const text = filtered.map(e =>
      `${e.severity.toUpperCase()} ${e.file}:${e.line}:${e.column} — ${e.message}`
    ).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [filtered])

  const copyEntry = useCallback((entry: DiagnosticEntry) => {
    navigator.clipboard.writeText(`${entry.file}:${entry.line}:${entry.column} — ${entry.message}`)
  }, [])

  const navigateToEntry = useCallback((entry: DiagnosticEntry) => {
    const projectPath = useProjectStore.getState().projectPath
    const scoped = scopedPath(projectPath, entry.file)
    const store = useEditorPanelStore.getState()
    const group = store.groups.find(g => g.id === store.activeGroupId) || store.groups[0]
    if (!group) return

    // Open the file in the editor
    store.openFile(scoped, entry.file.split('/').pop() || entry.file)

    // Set reveal line to navigate to the diagnostic location
    store.setRevealLine(entry.line)
  }, [])

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-neutral-800 shrink-0">
        {/* Filter buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-1.5 py-0.5 text-xs rounded ${filter === 'all' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('errors')}
            className={`flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${filter === 'errors' ? 'bg-red-900/50 text-red-400' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <AlertCircle className="w-3 h-3" />
            {errorCount}
          </button>
          <button
            onClick={() => setFilter('warnings')}
            className={`flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${filter === 'warnings' ? 'bg-amber-900/50 text-amber-400' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <AlertTriangle className="w-3 h-3" />
            {warningCount}
          </button>
        </div>

        <div className="flex-1" />

        {/* Copy all */}
        <button
          onClick={copyAll}
          title="Copy all problems"
          className={`p-1 rounded ${copied ? 'text-green-400' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-auto text-xs select-text">
        {filtered.length === 0 ? (
          <div className="text-neutral-600 text-center py-8 select-none cursor-default">
            {entries.length === 0 ? 'No problems detected' : 'No matching problems'}
          </div>
        ) : (
          Array.from(grouped.entries()).map(([file, diags]) => (
            <div key={file}>
              {/* File header */}
              <div className="sticky top-0 bg-neutral-850 px-3 py-1 text-neutral-400 font-medium border-b border-neutral-800/50 flex items-center gap-1.5"
                style={{ backgroundColor: '#1a1a1a' }}
              >
                <span className="truncate">{file}</span>
                <span className="text-neutral-600 shrink-0">({diags.length})</span>
              </div>
              {/* Diagnostic entries */}
              {diags.map((entry, i) => {
                const Icon = severityIcon[entry.severity]
                return (
                  <div
                    key={`${entry.file}-${entry.line}-${entry.column}-${i}`}
                    className="flex items-start gap-2 px-3 py-1.5 hover:bg-neutral-800/50 cursor-pointer group"
                    onClick={() => navigateToEntry(entry)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      copyEntry(entry)
                    }}
                    title="Click to navigate, right-click to copy"
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${severityColor[entry.severity]}`} />
                    <span className="text-neutral-300 flex-1 break-words">{entry.message}</span>
                    <span className="text-neutral-600 shrink-0 tabular-nums">
                      [{entry.line}:{entry.column}]
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyEntry(entry) }}
                      className="p-0.5 rounded opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700 shrink-0"
                      title="Copy"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
