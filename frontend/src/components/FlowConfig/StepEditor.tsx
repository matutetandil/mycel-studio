import { useState, useCallback, useEffect } from 'react'
import { X, Layers, Info, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import type { FlowStep } from '../../types'

interface StepEditorProps {
  isOpen: boolean
  steps?: FlowStep[]
  availableConnectors: Array<{ name: string; type: string }>
  onSave: (steps: FlowStep[] | undefined) => void
  onClose: () => void
}

interface StepEntry {
  id: string
  name: string
  connector: string
  operation: string
  query: string
  target: string
  params: Array<{ key: string; value: string }>
  when: string
  timeout: string
  onError: 'fail' | 'skip' | 'default'
  defaultFields: Array<{ key: string; value: string }>
  expanded: boolean
}

function toEntries(steps?: FlowStep[]): StepEntry[] {
  if (!steps || steps.length === 0) return []
  return steps.map((s, idx) => ({
    id: `step-${idx}-${Date.now()}`,
    name: s.name,
    connector: s.connector,
    operation: s.operation || '',
    query: s.query || '',
    target: s.target || '',
    params: Object.entries(s.params || {}).map(([key, value]) => ({ key, value })),
    when: s.when || '',
    timeout: s.timeout || '',
    onError: s.onError || 'fail',
    defaultFields: Object.entries(s.default || {}).map(([key, value]) => ({ key, value })),
    expanded: true,
  }))
}

function toFlowSteps(entries: StepEntry[]): FlowStep[] | undefined {
  const valid = entries.filter(e => e.name.trim() && e.connector)
  if (valid.length === 0) return undefined

  return valid.map(e => {
    const step: FlowStep = {
      name: e.name.trim(),
      connector: e.connector,
    }
    if (e.operation.trim()) step.operation = e.operation.trim()
    if (e.query.trim()) step.query = e.query.trim()
    if (e.target.trim()) step.target = e.target.trim()
    if (e.when.trim()) step.when = e.when.trim()
    if (e.timeout.trim()) step.timeout = e.timeout.trim()
    if (e.onError !== 'fail') step.onError = e.onError

    const params = e.params.reduce((acc, p) => {
      if (p.key.trim() && p.value.trim()) acc[p.key.trim()] = p.value.trim()
      return acc
    }, {} as Record<string, string>)
    if (Object.keys(params).length > 0) step.params = params

    if (e.onError === 'default') {
      const defaults = e.defaultFields.reduce((acc, f) => {
        if (f.key.trim() && f.value.trim()) acc[f.key.trim()] = f.value.trim()
        return acc
      }, {} as Record<string, string>)
      if (Object.keys(defaults).length > 0) step.default = defaults
    }

    return step
  })
}

const TIMEOUT_PRESETS = ['1s', '2s', '5s', '10s', '30s', '1m']

export default function StepEditor({
  isOpen,
  steps,
  availableConnectors,
  onSave,
  onClose,
}: StepEditorProps) {
  const [entries, setEntries] = useState<StepEntry[]>([])

  useEffect(() => {
    if (isOpen) {
      const initial = toEntries(steps)
      setEntries(initial.length > 0 ? initial : [])
    }
  }, [steps, isOpen])

  const addStep = useCallback(() => {
    setEntries(prev => [
      ...prev,
      {
        id: `step-${Date.now()}`,
        name: '',
        connector: availableConnectors[0]?.name || '',
        operation: '',
        query: '',
        target: '',
        params: [],
        when: '',
        timeout: '',
        onError: 'fail',
        defaultFields: [],
        expanded: true,
      },
    ])
  }, [availableConnectors])

  const removeStep = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const updateStep = useCallback((id: string, updates: Partial<StepEntry>) => {
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

  const addDefaultField = useCallback((id: string) => {
    setEntries(prev =>
      prev.map(e =>
        e.id === id ? { ...e, defaultFields: [...e.defaultFields, { key: '', value: '' }] } : e
      )
    )
  }, [])

  const updateDefaultField = useCallback(
    (entryId: string, idx: number, updates: { key?: string; value?: string }) => {
      setEntries(prev =>
        prev.map(e => {
          if (e.id !== entryId) return e
          const newFields = [...e.defaultFields]
          newFields[idx] = { ...newFields[idx], ...updates }
          return { ...e, defaultFields: newFields }
        })
      )
    },
    []
  )

  const removeDefaultField = useCallback((entryId: string, idx: number) => {
    setEntries(prev =>
      prev.map(e => {
        if (e.id !== entryId) return e
        return { ...e, defaultFields: e.defaultFields.filter((_, i) => i !== idx) }
      })
    )
  }, [])

  const handleSave = useCallback(() => {
    onSave(toFlowSteps(entries))
    onClose()
  }, [entries, onSave, onClose])

  const handleClear = useCallback(() => {
    onSave(undefined)
    onClose()
  }, [onSave, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-[650px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-neutral-200">Step Configuration</h2>
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
          <div className="flex items-start gap-2 p-3 bg-neutral-700/50 rounded-lg text-sm text-neutral-400">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p>
                Steps fetch data from external connectors during flow execution.
                Results are available as{' '}
                <code className="bg-neutral-600 px-1 rounded">step.name.field</code>{' '}
                in transforms and subsequent steps.
              </p>
            </div>
          </div>

          {availableConnectors.length === 0 && (
            <div className="px-3 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded text-sm text-yellow-300">
              No connectors available. Add connectors to the canvas first.
            </div>
          )}

          {/* Step entries */}
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
                    {entry.name || 'New Step'}
                  </span>
                  {entry.connector && (
                    <span className="text-xs text-neutral-500">→ {entry.connector}</span>
                  )}
                  {entry.onError !== 'fail' && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                      on_error={entry.onError}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeStep(entry.id)
                    }}
                    className="ml-auto p-1 text-neutral-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Entry content */}
                {entry.expanded && (
                  <div className="p-3 space-y-3">
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-400">Step Name</label>
                      <input
                        type="text"
                        value={entry.name}
                        onChange={(e) => updateStep(entry.id, { name: e.target.value })}
                        placeholder="customer, pricing, inventory..."
                        className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>

                    {/* Connector + Operation */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-neutral-400">Connector</label>
                        <select
                          value={entry.connector}
                          onChange={(e) => updateStep(entry.id, { connector: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                          <option value="">Select...</option>
                          {availableConnectors.map((conn) => (
                            <option key={conn.name} value={conn.name}>
                              {conn.name} ({conn.type})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-neutral-400">Operation</label>
                        <input
                          type="text"
                          value={entry.operation}
                          onChange={(e) => updateStep(entry.id, { operation: e.target.value })}
                          placeholder="GET /users/:id, query..."
                          className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                        />
                      </div>
                    </div>

                    {/* Query (for database steps) */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-400">Query (optional, for DB connectors)</label>
                      <input
                        type="text"
                        value={entry.query}
                        onChange={(e) => updateStep(entry.id, { query: e.target.value })}
                        placeholder="SELECT * FROM users WHERE id = ?"
                        className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                      />
                    </div>

                    {/* Params */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-neutral-400">Parameters</label>
                        <button
                          onClick={() => addParam(entry.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
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
                            className="w-1/3 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                          <span className="text-neutral-500">=</span>
                          <input
                            type="text"
                            value={param.value}
                            onChange={(e) => updateParam(entry.id, idx, { value: e.target.value })}
                            placeholder="input.field"
                            className="flex-1 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
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

                    {/* Advanced: when, timeout, on_error */}
                    <div className="border-t border-neutral-600 pt-3 space-y-3">
                      <div className="text-xs font-medium text-neutral-500 uppercase">Advanced</div>

                      {/* When condition */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-neutral-400">Condition (skip if false)</label>
                        <input
                          type="text"
                          value={entry.when}
                          onChange={(e) => updateStep(entry.id, { when: e.target.value })}
                          placeholder="input.include_details == true"
                          className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Timeout */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-neutral-400">Timeout</label>
                          <input
                            type="text"
                            value={entry.timeout}
                            onChange={(e) => updateStep(entry.id, { timeout: e.target.value })}
                            placeholder="5s"
                            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                          />
                          <div className="flex flex-wrap gap-1">
                            {TIMEOUT_PRESETS.map((t) => (
                              <button
                                key={t}
                                onClick={() => updateStep(entry.id, { timeout: t })}
                                className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                                  entry.timeout === t
                                    ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300'
                                    : 'bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-neutral-200'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* On Error */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-neutral-400">On Error</label>
                          <select
                            value={entry.onError}
                            onChange={(e) => updateStep(entry.id, { onError: e.target.value as 'fail' | 'skip' | 'default' })}
                            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          >
                            <option value="fail">Fail (abort flow)</option>
                            <option value="skip">Skip (continue without data)</option>
                            <option value="default">Default (use fallback value)</option>
                          </select>
                        </div>
                      </div>

                      {/* Default value (only when on_error = default) */}
                      {entry.onError === 'default' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-neutral-400">Default Value</label>
                            <button
                              onClick={() => addDefaultField(entry.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              Add
                            </button>
                          </div>
                          {entry.defaultFields.map((field, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={field.key}
                                onChange={(e) => updateDefaultField(entry.id, idx, { key: e.target.value })}
                                placeholder="field"
                                className="w-1/3 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              />
                              <span className="text-neutral-500">=</span>
                              <input
                                type="text"
                                value={field.value}
                                onChange={(e) => updateDefaultField(entry.id, idx, { value: e.target.value })}
                                placeholder="'Unknown'"
                                className="flex-1 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                              />
                              <button
                                onClick={() => removeDefaultField(entry.id, idx)}
                                className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add button */}
          <button
            onClick={addStep}
            disabled={availableConnectors.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-neutral-600 hover:border-blue-500/50 rounded-lg text-sm text-neutral-400 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Step
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white font-medium transition-colors"
            >
              Save Steps
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
