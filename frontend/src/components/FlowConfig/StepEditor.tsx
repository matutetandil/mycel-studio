import { useState, useCallback, useEffect, useMemo } from 'react'
import { X, Layers, Info, Plus, Trash2, ChevronDown, ChevronRight, Database, Globe, MessageSquare } from 'lucide-react'
import type { FlowStep, ConnectorNodeData } from '../../types'
import MiniEditor from './MiniEditor'

interface StepEditorProps {
  isOpen: boolean
  steps?: FlowStep[]
  availableConnectors: Array<{ name: string; type: string; operations?: ConnectorNodeData['operations'] }>
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
  paramsJson: string // JSON string for the params editor
  bodyJson: string   // JSON string for the body editor
  format: string
  when: string
  timeout: string
  onError: boolean
  defaultJson: string // JSON string for default values
  expanded: boolean
}

const DB_TYPES = new Set(['database', 'cache', 'elasticsearch'])
const HTTP_TYPES = new Set(['rest', 'http', 'graphql', 'grpc', 'soap', 'webhook'])
const MQ_TYPES = new Set(['mq', 'mqtt'])

function getConnectorCategory(type: string): 'db' | 'http' | 'mq' | 'other' {
  if (DB_TYPES.has(type)) return 'db'
  if (HTTP_TYPES.has(type)) return 'http'
  if (MQ_TYPES.has(type)) return 'mq'
  return 'other'
}

function recordToJson(rec?: Record<string, string>): string {
  if (!rec || Object.keys(rec).length === 0) return ''
  try {
    return JSON.stringify(rec, null, 2)
  } catch {
    return ''
  }
}

function jsonToRecord(json: string): Record<string, string> | undefined {
  if (!json.trim()) return undefined
  try {
    const parsed = JSON.parse(json)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const result: Record<string, string> = {}
      for (const [k, v] of Object.entries(parsed)) {
        result[k] = String(v)
      }
      return Object.keys(result).length > 0 ? result : undefined
    }
    // If it's an array (for params), convert to record with index keys
    if (Array.isArray(parsed)) {
      const result: Record<string, string> = {}
      parsed.forEach((v, i) => {
        result[String(i)] = String(v)
      })
      return Object.keys(result).length > 0 ? result : undefined
    }
  } catch {
    // invalid JSON, ignore
  }
  return undefined
}

function paramsToJson(params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return ''
  // Check if keys are numeric indices (array-style params)
  const keys = Object.keys(params)
  const allNumeric = keys.every(k => /^\d+$/.test(k))
  if (allNumeric) {
    const arr = keys.sort((a, b) => Number(a) - Number(b)).map(k => params[k])
    return JSON.stringify(arr, null, 2)
  }
  return JSON.stringify(params, null, 2)
}

function paramsFromJson(json: string): Record<string, string> | undefined {
  if (!json.trim()) return undefined
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed)) {
      const result: Record<string, string> = {}
      parsed.forEach((v, i) => { result[String(i)] = String(v) })
      return Object.keys(result).length > 0 ? result : undefined
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const result: Record<string, string> = {}
      for (const [k, v] of Object.entries(parsed)) {
        result[k] = String(v)
      }
      return Object.keys(result).length > 0 ? result : undefined
    }
  } catch {
    // invalid JSON
  }
  return undefined
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
    paramsJson: paramsToJson(s.params),
    bodyJson: recordToJson(s.body),
    format: s.format || '',
    when: s.when || '',
    timeout: s.timeout || '',
    onError: s.onError === 'skip',
    defaultJson: recordToJson(s.default),
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
    if (e.format) step.format = e.format as 'json' | 'xml'
    if (e.onError) step.onError = 'skip'

    const params = paramsFromJson(e.paramsJson)
    if (params) step.params = params

    const body = jsonToRecord(e.bodyJson)
    if (body) step.body = body

    if (e.onError) {
      const defaults = jsonToRecord(e.defaultJson)
      if (defaults) step.default = defaults
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

  const connectorMap = useMemo(() => {
    const map = new Map<string, { type: string; operations?: ConnectorNodeData['operations'] }>()
    for (const c of availableConnectors) {
      map.set(c.name, { type: c.type, operations: c.operations })
    }
    return map
  }, [availableConnectors])

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
        paramsJson: '',
        bodyJson: '',
        format: '',
        when: '',
        timeout: '',
        onError: false,
        defaultJson: '',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onKeyDown={e => e.stopPropagation()}>
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-[750px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-neutral-200">Step Configuration</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-start gap-2 p-3 bg-neutral-700/50 rounded-lg text-sm text-neutral-400">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p>
                Steps fetch data from connectors during flow execution.
                Results are available as{' '}
                <code className="bg-neutral-600 px-1 rounded">step.name.field</code>{' '}
                in transforms, subsequent steps, and <code className="bg-neutral-600 px-1 rounded">to</code> conditions.
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
            {entries.map((entry, entryIdx) => {
              const connInfo = connectorMap.get(entry.connector)
              const connCategory = connInfo ? getConnectorCategory(connInfo.type) : 'other'
              const connOps = connInfo?.operations || []

              return (
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
                    <span className="text-xs text-neutral-500 font-mono">#{entryIdx + 1}</span>
                    <span className="text-sm font-medium text-neutral-200">
                      {entry.name || 'New Step'}
                    </span>
                    {entry.connector && (
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        {connCategory === 'db' && <Database className="w-3 h-3" />}
                        {connCategory === 'http' && <Globe className="w-3 h-3" />}
                        {connCategory === 'mq' && <MessageSquare className="w-3 h-3" />}
                        {entry.connector}
                        {connInfo && <span className="text-neutral-600">({connInfo.type})</span>}
                      </span>
                    )}
                    {entry.onError && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded">
                        on_error=skip
                      </span>
                    )}
                    {entry.when && (
                      <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                        conditional
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeStep(entry.id) }}
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
                            onChange={(e) => updateStep(entry.id, { connector: e.target.value, operation: '' })}
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
                          {connOps.length > 0 ? (
                            <div className="space-y-1">
                              <select
                                value={entry.operation}
                                onChange={(e) => updateStep(entry.id, { operation: e.target.value })}
                                className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                              >
                                <option value="">Select or type below...</option>
                                {connOps.map((op, oi) => {
                                  let opLabel: string
                                  if ('method' in op && 'path' in op) {
                                    opLabel = `${op.method} ${op.path}`
                                  } else if ('service' in op && 'method' in op) {
                                    opLabel = `${op.service}.${op.method}`
                                  } else if ('name' in op) {
                                    opLabel = (op as { name: string }).name
                                  } else {
                                    opLabel = `op-${oi}`
                                  }
                                  return <option key={oi} value={opLabel}>{opLabel}</option>
                                })}
                              </select>
                              <input
                                type="text"
                                value={entry.operation}
                                onChange={(e) => updateStep(entry.id, { operation: e.target.value })}
                                placeholder="Or type custom..."
                                className="w-full px-3 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                              />
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={entry.operation}
                              onChange={(e) => updateStep(entry.id, { operation: e.target.value })}
                              placeholder={connCategory === 'db' ? 'query' : connCategory === 'http' ? 'GET /users/:id' : 'operation_name'}
                              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                            />
                          )}
                        </div>
                      </div>

                      {/* Target */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-neutral-400">Target</label>
                        <input
                          type="text"
                          value={entry.target}
                          onChange={(e) => updateStep(entry.id, { target: e.target.value })}
                          placeholder={connCategory === 'db' ? 'users' : 'resource_name'}
                          className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                        />
                      </div>

                      {/* Query — SQL editor for DB connectors */}
                      {(connCategory === 'db' || entry.query) && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-neutral-400 flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            Query (SQL)
                          </label>
                          <MiniEditor
                            value={entry.query}
                            onChange={(v) => updateStep(entry.id, { query: v })}
                            language="sql"
                            height="100px"
                            placeholder="SELECT * FROM users WHERE id = ?"
                          />
                        </div>
                      )}

                      {/* Params — JSON editor */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-neutral-400">
                          Parameters
                          <span className="text-neutral-500 ml-1">
                            {connCategory === 'db' ? '(JSON array for positional params)' : '(JSON object or array)'}
                          </span>
                        </label>
                        <MiniEditor
                          value={entry.paramsJson}
                          onChange={(v) => updateStep(entry.id, { paramsJson: v })}
                          language="json"
                          height="80px"
                          placeholder={connCategory === 'db'
                            ? '["input.params.id"]'
                            : '{\n  "product_id": "input.product_id"\n}'}
                        />
                        {connCategory === 'db' && (
                          <p className="text-xs text-neutral-500">
                            Array values map to <code className="bg-neutral-700 px-1 rounded">?</code> placeholders in the query
                          </p>
                        )}
                      </div>

                      {/* Body — JSON editor for HTTP connectors */}
                      {(connCategory === 'http' || connCategory === 'other' || entry.bodyJson) && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-neutral-400 flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            Body (for POST/PUT operations)
                          </label>
                          <MiniEditor
                            value={entry.bodyJson}
                            onChange={(v) => updateStep(entry.id, { bodyJson: v })}
                            language="json"
                            height="100px"
                            placeholder={'{\n  "items": "step.cart.items",\n  "address": "step.customer.address"\n}'}
                          />
                        </div>
                      )}

                      {/* Advanced */}
                      <div className="border-t border-neutral-600 pt-3 space-y-3">
                        <div className="text-xs font-medium text-neutral-500 uppercase">Advanced</div>

                        {/* Format */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-neutral-400">Format</label>
                          <select
                            value={entry.format}
                            onChange={(e) => updateStep(entry.id, { format: e.target.value })}
                            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          >
                            <option value="">Default</option>
                            <option value="json">JSON</option>
                            <option value="xml">XML</option>
                          </select>
                        </div>

                        {/* When condition */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-neutral-400">Condition (skip step if false)</label>
                          <input
                            type="text"
                            value={entry.when}
                            onChange={(e) => updateStep(entry.id, { when: e.target.value })}
                            placeholder="input.include_details == true"
                            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                          />
                          {entryIdx > 0 && (
                            <p className="text-xs text-neutral-500">
                              Can reference previous steps: <code className="bg-neutral-700 px-1 rounded">step.{entries[entryIdx - 1]?.name || 'prev'}.field == true</code>
                            </p>
                          )}
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
                            <div className="flex items-center gap-3 py-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={entry.onError}
                                  onChange={(e) => updateStep(entry.id, { onError: e.target.checked })}
                                  className="rounded border-neutral-600 bg-neutral-700 text-blue-500 focus:ring-blue-500/50"
                                />
                                <span className="text-sm text-neutral-300">Skip on error</span>
                              </label>
                            </div>
                            <p className="text-xs text-neutral-500">
                              {entry.onError
                                ? 'Flow continues if this step fails. Use default values below.'
                                : 'Flow aborts if this step fails.'}
                            </p>
                          </div>
                        </div>

                        {/* Default value — JSON editor when on_error = skip */}
                        {entry.onError && (
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-neutral-400">
                              Default Value (fallback when step is skipped or fails)
                            </label>
                            <MiniEditor
                              value={entry.defaultJson}
                              onChange={(v) => updateStep(entry.id, { defaultJson: v })}
                              language="json"
                              height="80px"
                              placeholder={'{\n  "extras": []\n}'}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
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
