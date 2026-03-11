import { useState, useCallback, useEffect } from 'react'
import { X, Link, Plus, Trash2, Info, ChevronDown, ChevronRight } from 'lucide-react'
import type { FlowEnrich } from '../../types'

interface EnrichEditorProps {
  isOpen: boolean
  enrichments?: FlowEnrich[]
  availableConnectors: Array<{ name: string; type: string }>
  onSave: (enrichments: FlowEnrich[] | undefined) => void
  onClose: () => void
}

interface EnrichEntry {
  id: string
  name: string
  connector: string
  operation: string
  params: Array<{ key: string; value: string }>
  expanded: boolean
}

// Convert FlowEnrich[] to internal format
function toEntries(enrichments?: FlowEnrich[]): EnrichEntry[] {
  if (!enrichments || enrichments.length === 0) {
    return []
  }
  return enrichments.map((e, idx) => ({
    id: `enrich-${idx}-${Date.now()}`,
    name: e.name,
    connector: e.connector,
    operation: e.operation,
    params: Object.entries(e.params || {}).map(([key, value]) => ({ key, value })),
    expanded: true,
  }))
}

// Convert internal format to FlowEnrich[]
function toFlowEnrich(entries: EnrichEntry[]): FlowEnrich[] | undefined {
  const valid = entries.filter(e => e.name.trim() && e.connector && e.operation.trim())
  if (valid.length === 0) return undefined

  return valid.map(e => ({
    name: e.name.trim(),
    connector: e.connector,
    operation: e.operation.trim(),
    params: e.params.reduce((acc, p) => {
      if (p.key.trim() && p.value.trim()) {
        acc[p.key.trim()] = p.value.trim()
      }
      return acc
    }, {} as Record<string, string>),
  }))
}

export default function EnrichEditor({
  isOpen,
  enrichments,
  availableConnectors,
  onSave,
  onClose,
}: EnrichEditorProps) {
  const [entries, setEntries] = useState<EnrichEntry[]>([])

  // Initialize state from enrichments prop
  useEffect(() => {
    if (isOpen) {
      const initial = toEntries(enrichments)
      setEntries(initial.length > 0 ? initial : [])
    }
  }, [enrichments, isOpen])

  const addEnrichment = useCallback(() => {
    setEntries(prev => [
      ...prev,
      {
        id: `enrich-${Date.now()}`,
        name: '',
        connector: availableConnectors[0]?.name || '',
        operation: '',
        params: [],
        expanded: true,
      },
    ])
  }, [availableConnectors])

  const removeEnrichment = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const updateEnrichment = useCallback((id: string, updates: Partial<EnrichEntry>) => {
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, ...updates } : e)))
  }, [])

  const toggleExpanded = useCallback((id: string) => {
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, expanded: !e.expanded } : e)))
  }, [])

  const addParam = useCallback((id: string) => {
    setEntries(prev =>
      prev.map(e =>
        e.id === id ? { ...e, params: [...e.params, { key: '', value: '' }] } : e
      )
    )
  }, [])

  const updateParam = useCallback(
    (entryId: string, paramIdx: number, updates: { key?: string; value?: string }) => {
      setEntries(prev =>
        prev.map(e => {
          if (e.id !== entryId) return e
          const newParams = [...e.params]
          newParams[paramIdx] = { ...newParams[paramIdx], ...updates }
          return { ...e, params: newParams }
        })
      )
    },
    []
  )

  const removeParam = useCallback((entryId: string, paramIdx: number) => {
    setEntries(prev =>
      prev.map(e => {
        if (e.id !== entryId) return e
        return { ...e, params: e.params.filter((_, idx) => idx !== paramIdx) }
      })
    )
  }, [])

  const handleSave = useCallback(() => {
    onSave(toFlowEnrich(entries))
    onClose()
  }, [entries, onSave, onClose])

  const handleClear = useCallback(() => {
    onSave(undefined)
    onClose()
  }, [onSave, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <Link className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-neutral-200">Enrich Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Info box */}
          <div className="flex items-start gap-2 p-3 bg-neutral-700/50 rounded-lg text-sm text-neutral-400">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p>
                Enrich fetches additional data from external connectors during flow execution.
                The enriched data is available in transforms via{' '}
                <code className="bg-neutral-600 px-1 rounded">enriched.name.field</code>.
              </p>
            </div>
          </div>

          {availableConnectors.length === 0 && (
            <div className="px-3 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded text-sm text-yellow-300">
              No connectors available. Add connectors to the canvas first.
            </div>
          )}

          {/* Enrichment entries */}
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="border border-neutral-600 rounded-lg bg-neutral-700/30 overflow-hidden"
              >
                {/* Entry header */}
                <div
                  className="flex items-center gap-2 px-3 py-2 bg-neutral-700/50 cursor-pointer"
                  onClick={() => toggleExpanded(entry.id)}
                >
                  {entry.expanded ? (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  )}
                  <span className="text-sm font-medium text-neutral-200">
                    {entry.name || 'New Enrichment'}
                  </span>
                  {entry.connector && (
                    <span className="text-xs text-neutral-500">→ {entry.connector}</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeEnrichment(entry.id)
                    }}
                    className="ml-auto p-1 text-neutral-400 hover:text-red-400 transition-colors"
                    title="Remove enrichment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Entry content */}
                {entry.expanded && (
                  <div className="p-3 space-y-3">
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-400">Name</label>
                      <input
                        type="text"
                        value={entry.name}
                        onChange={(e) => updateEnrichment(entry.id, { name: e.target.value })}
                        placeholder="pricing, user_info, etc."
                        className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                    </div>

                    {/* Connector */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-400">Connector</label>
                      <select
                        value={entry.connector}
                        onChange={(e) => updateEnrichment(entry.id, { connector: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        <option value="">Select connector...</option>
                        {availableConnectors.map((conn) => (
                          <option key={conn.name} value={conn.name}>
                            {conn.name} ({conn.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Operation */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-400">Operation</label>
                      <input
                        type="text"
                        value={entry.operation}
                        onChange={(e) => updateEnrichment(entry.id, { operation: e.target.value })}
                        placeholder="GET /users/:id, getPrice, SELECT * FROM..."
                        className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono"
                      />
                    </div>

                    {/* Params */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-neutral-400">
                          Parameters (CEL expressions)
                        </label>
                        <button
                          onClick={() => addParam(entry.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </button>
                      </div>
                      {entry.params.map((param, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={param.key}
                            onChange={(e) => updateParam(entry.id, idx, { key: e.target.value })}
                            placeholder="param_name"
                            className="w-1/3 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          />
                          <span className="text-neutral-500">=</span>
                          <input
                            type="text"
                            value={param.value}
                            onChange={(e) => updateParam(entry.id, idx, { value: e.target.value })}
                            placeholder="input.field"
                            className="flex-1 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono"
                          />
                          <button
                            onClick={() => removeParam(entry.id, idx)}
                            className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add button */}
          <button
            onClick={addEnrichment}
            disabled={availableConnectors.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-neutral-600 hover:border-purple-500/50 rounded-lg text-sm text-neutral-400 hover:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Enrichment
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-700">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Clear All
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded text-sm text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm text-white font-medium transition-colors"
            >
              Save Enrichments
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
