import { useState, useCallback, useEffect } from 'react'
import { X, AlertTriangle, Info, RotateCcw, Plus, Trash2, ArrowDownToLine, MessageSquareWarning } from 'lucide-react'
import type { FlowErrorHandling } from '../../types'
import MiniEditor from './MiniEditor'

interface ErrorHandlingEditorProps {
  isOpen: boolean
  errorHandling?: FlowErrorHandling
  availableConnectors?: Array<{ name: string; type: string }>
  onSave: (errorHandling: FlowErrorHandling | undefined) => void
  onClose: () => void
}

const DELAY_PRESETS = [
  { label: '100ms', value: '100ms' },
  { label: '500ms', value: '500ms' },
  { label: '1s', value: '1s' },
  { label: '2s', value: '2s' },
  { label: '5s', value: '5s' },
  { label: '10s', value: '10s' },
]

const MAX_DELAY_PRESETS = [
  { label: '10s', value: '10s' },
  { label: '30s', value: '30s' },
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
]

const BACKOFF_OPTIONS: Array<{ value: 'exponential' | 'linear' | 'constant'; label: string; description: string }> = [
  { value: 'exponential', label: 'Exponential', description: 'Delay doubles each retry (1s, 2s, 4s, 8s...)' },
  { value: 'linear', label: 'Linear', description: 'Delay increases linearly (1s, 2s, 3s, 4s...)' },
  { value: 'constant', label: 'Constant', description: 'Same delay between all retries' },
]

const STATUS_PRESETS = [
  { value: 400, label: '400' },
  { value: 422, label: '422' },
  { value: 500, label: '500' },
  { value: 503, label: '503' },
]

function recordToCode(rec?: Record<string, string>): string {
  if (!rec || Object.keys(rec).length === 0) return ''
  const entries = Object.entries(rec)
  const maxKeyLen = Math.max(...entries.map(([k]) => k.length), 0)
  return entries.map(([k, v]) => `${k.padEnd(maxKeyLen)} = "${v}"`).join('\n')
}

function codeToRecord(code: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of code.split('\n')) {
    if (!line.includes('=')) continue
    const eqIdx = line.indexOf('=')
    const key = line.substring(0, eqIdx).trim()
    let value = line.substring(eqIdx + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (key) result[key] = value
  }
  return result
}

export default function ErrorHandlingEditor({
  isOpen,
  errorHandling,
  availableConnectors = [],
  onSave,
  onClose,
}: ErrorHandlingEditorProps) {
  // Retry state
  const [retryEnabled, setRetryEnabled] = useState(false)
  const [attempts, setAttempts] = useState(3)
  const [delay, setDelay] = useState('1s')
  const [maxDelay, setMaxDelay] = useState('')
  const [backoff, setBackoff] = useState<'exponential' | 'linear' | 'constant'>('exponential')

  // Fallback state
  const [fallbackEnabled, setFallbackEnabled] = useState(false)
  const [fallbackConnector, setFallbackConnector] = useState('')
  const [fallbackTarget, setFallbackTarget] = useState('')
  const [fallbackIncludeError, setFallbackIncludeError] = useState(true)
  const [fallbackTransformCode, setFallbackTransformCode] = useState('')

  // Error response state
  const [errorResponseEnabled, setErrorResponseEnabled] = useState(false)
  const [errorStatus, setErrorStatus] = useState(422)
  const [errorHeaders, setErrorHeaders] = useState<Array<{ key: string; value: string }>>([])
  const [errorBodyCode, setErrorBodyCode] = useState('')

  useEffect(() => {
    if (!isOpen) return

    if (errorHandling?.retry) {
      setRetryEnabled(true)
      setAttempts(errorHandling.retry.attempts)
      setDelay(errorHandling.retry.delay)
      setMaxDelay(errorHandling.retry.maxDelay || '')
      setBackoff(errorHandling.retry.backoff || 'exponential')
    } else {
      setRetryEnabled(false)
      setAttempts(3)
      setDelay('1s')
      setMaxDelay('')
      setBackoff('exponential')
    }

    if (errorHandling?.fallback) {
      setFallbackEnabled(true)
      setFallbackConnector(errorHandling.fallback.connector)
      setFallbackTarget(errorHandling.fallback.target)
      setFallbackIncludeError(errorHandling.fallback.includeError ?? true)
      setFallbackTransformCode(recordToCode(errorHandling.fallback.transform))
    } else {
      setFallbackEnabled(false)
      setFallbackConnector('')
      setFallbackTarget('')
      setFallbackIncludeError(true)
      setFallbackTransformCode('')
    }

    if (errorHandling?.errorResponse) {
      setErrorResponseEnabled(true)
      setErrorStatus(errorHandling.errorResponse.status)
      setErrorHeaders(
        Object.entries(errorHandling.errorResponse.headers || {}).map(([key, value]) => ({ key, value }))
      )
      setErrorBodyCode(recordToCode(errorHandling.errorResponse.body))
    } else {
      setErrorResponseEnabled(false)
      setErrorStatus(422)
      setErrorHeaders([])
      setErrorBodyCode('')
    }
  }, [errorHandling, isOpen])

  const handleSave = useCallback(() => {
    if (!retryEnabled && !fallbackEnabled && !errorResponseEnabled) {
      onSave(undefined)
      onClose()
      return
    }

    const result: FlowErrorHandling = {}

    if (retryEnabled) {
      result.retry = { attempts, delay, backoff }
      if (maxDelay.trim()) result.retry.maxDelay = maxDelay.trim()
    }

    if (fallbackEnabled && fallbackConnector && fallbackTarget) {
      result.fallback = {
        connector: fallbackConnector,
        target: fallbackTarget,
        includeError: fallbackIncludeError,
      }
      const transform = codeToRecord(fallbackTransformCode)
      if (Object.keys(transform).length > 0) result.fallback.transform = transform
    }

    if (errorResponseEnabled) {
      result.errorResponse = { status: errorStatus }
      const hdrs = errorHeaders.reduce((acc, h) => {
        if (h.key.trim() && h.value.trim()) acc[h.key.trim()] = h.value.trim()
        return acc
      }, {} as Record<string, string>)
      if (Object.keys(hdrs).length > 0) result.errorResponse.headers = hdrs
      const body = codeToRecord(errorBodyCode)
      if (Object.keys(body).length > 0) result.errorResponse.body = body
    }

    onSave(result)
    onClose()
  }, [
    retryEnabled, attempts, delay, maxDelay, backoff,
    fallbackEnabled, fallbackConnector, fallbackTarget, fallbackIncludeError, fallbackTransformCode,
    errorResponseEnabled, errorStatus, errorHeaders, errorBodyCode,
    onSave, onClose,
  ])

  const handleClear = useCallback(() => {
    onSave(undefined)
    onClose()
  }, [onSave, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onKeyDown={e => e.stopPropagation()}>
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-[650px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-semibold text-neutral-200">Error Handling</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-start gap-2 p-3 bg-neutral-700/50 rounded-lg text-sm text-neutral-400">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p>Configure retry, fallback (dead letter), and error response behavior.</p>
          </div>

          {/* ── Retry Section ── */}
          <div className="p-4 border border-neutral-600 rounded-lg space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox" checked={retryEnabled}
                onChange={(e) => setRetryEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-neutral-600 bg-neutral-700 text-red-500 focus:ring-red-500/50"
              />
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-neutral-200">Retry</span>
              </div>
            </label>

            {retryEnabled && (
              <div className="space-y-4 pt-2 border-t border-neutral-700">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300">Max Attempts</label>
                  <input
                    type="number" min={1} max={10} value={attempts}
                    onChange={(e) => setAttempts(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                  <div className="flex gap-1">
                    {[1, 2, 3, 5, 10].map((n) => (
                      <button key={n} onClick={() => setAttempts(n)}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          attempts === n ? 'bg-red-500/20 border border-red-500/50 text-red-300' : 'bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-neutral-200'
                        }`}>{n}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">Initial Delay</label>
                    <input type="text" value={delay} onChange={(e) => setDelay(e.target.value)} placeholder="1s"
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 font-mono" />
                    <div className="flex flex-wrap gap-1">
                      {DELAY_PRESETS.map((p) => (
                        <button key={p.value} onClick={() => setDelay(p.value)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${delay === p.value ? 'bg-red-500/20 border border-red-500/50 text-red-300' : 'bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-neutral-200'}`}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">Max Delay</label>
                    <input type="text" value={maxDelay} onChange={(e) => setMaxDelay(e.target.value)} placeholder="30s (optional)"
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 font-mono" />
                    <div className="flex flex-wrap gap-1">
                      {MAX_DELAY_PRESETS.map((p) => (
                        <button key={p.value} onClick={() => setMaxDelay(p.value)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${maxDelay === p.value ? 'bg-red-500/20 border border-red-500/50 text-red-300' : 'bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-neutral-200'}`}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300">Backoff Strategy</label>
                  <div className="space-y-2">
                    {BACKOFF_OPTIONS.map((option) => (
                      <label key={option.value}
                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          backoff === option.value ? 'bg-red-500/10 border border-red-500/50' : 'bg-neutral-700/50 border border-neutral-600 hover:bg-neutral-700'
                        }`}>
                        <input type="radio" name="backoff" value={option.value} checked={backoff === option.value}
                          onChange={() => setBackoff(option.value)}
                          className="mt-1 w-4 h-4 border-neutral-600 bg-neutral-700 text-red-500 focus:ring-red-500/50" />
                        <div>
                          <div className="text-sm font-medium text-neutral-200">{option.label}</div>
                          <div className="text-xs text-neutral-500">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Retry preview */}
                <div className="p-3 bg-neutral-900 rounded text-xs font-mono text-neutral-400">
                  <div className="text-neutral-500 mb-1">Retry sequence preview:</div>
                  {Array.from({ length: Math.min(attempts, 5) }).map((_, i) => {
                    let currentDelay = delay
                    const baseMs = parseDelay(delay)
                    const maxMs = maxDelay ? parseDelay(maxDelay) : Infinity
                    if (backoff === 'exponential') {
                      currentDelay = formatDelay(Math.min(baseMs * Math.pow(2, i), maxMs))
                    } else if (backoff === 'linear') {
                      currentDelay = formatDelay(Math.min(baseMs * (i + 1), maxMs))
                    }
                    return <div key={i} className="text-neutral-300">Attempt {i + 1}: wait {currentDelay}</div>
                  })}
                  {attempts > 5 && <div className="text-neutral-500">...</div>}
                </div>
              </div>
            )}
          </div>

          {/* ── Fallback Section ── */}
          <div className="p-4 border border-neutral-600 rounded-lg space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox" checked={fallbackEnabled}
                onChange={(e) => setFallbackEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-neutral-600 bg-neutral-700 text-orange-500 focus:ring-orange-500/50"
              />
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-neutral-200">Fallback (Dead Letter)</span>
              </div>
            </label>

            {fallbackEnabled && (
              <div className="space-y-3 pt-2 border-t border-neutral-700">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-400">Connector</label>
                    <select value={fallbackConnector} onChange={(e) => setFallbackConnector(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                      <option value="">Select...</option>
                      {availableConnectors.map((c) => (
                        <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-400">Target</label>
                    <input type="text" value={fallbackTarget} onChange={(e) => setFallbackTarget(e.target.value)}
                      placeholder="orders.failed"
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono" />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={fallbackIncludeError}
                    onChange={(e) => setFallbackIncludeError(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-600 bg-neutral-700 text-orange-500 focus:ring-orange-500/50" />
                  <span className="text-sm text-neutral-300">Include error details in message</span>
                </label>

                {/* Fallback transform — Monaco editor */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-400">Transform (optional, CEL)</label>
                  <MiniEditor
                    value={fallbackTransformCode}
                    onChange={setFallbackTransformCode}
                    language="hcl"
                    height="80px"
                    placeholder={'original_id = "input.id"\nerror_msg   = "error.message"'}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Error Response Section ── */}
          <div className="p-4 border border-neutral-600 rounded-lg space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox" checked={errorResponseEnabled}
                onChange={(e) => setErrorResponseEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-neutral-600 bg-neutral-700 text-rose-500 focus:ring-rose-500/50"
              />
              <div className="flex items-center gap-2">
                <MessageSquareWarning className="w-4 h-4 text-rose-400" />
                <span className="text-sm font-medium text-neutral-200">Error Response</span>
              </div>
            </label>

            {errorResponseEnabled && (
              <div className="space-y-3 pt-2 border-t border-neutral-700">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-400">Status Code</label>
                  <input type="number" min={100} max={599} value={errorStatus}
                    onChange={(e) => setErrorStatus(Math.max(100, Math.min(599, parseInt(e.target.value) || 422)))}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
                  <div className="flex gap-1">
                    {STATUS_PRESETS.map((p) => (
                      <button key={p.value} onClick={() => setErrorStatus(p.value)}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          errorStatus === p.value ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300' : 'bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-neutral-200'
                        }`}>{p.label}</button>
                    ))}
                  </div>
                </div>

                {/* Error headers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-neutral-400">Headers</label>
                    <button onClick={() => setErrorHeaders(prev => [...prev, { key: '', value: '' }])}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-rose-400 hover:text-rose-300 transition-colors">
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                  {errorHeaders.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="text" value={h.key}
                        onChange={(e) => { const u = [...errorHeaders]; u[idx] = { ...u[idx], key: e.target.value }; setErrorHeaders(u) }}
                        placeholder="X-Error-Code" className="w-2/5 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
                      <span className="text-neutral-500">:</span>
                      <input type="text" value={h.value}
                        onChange={(e) => { const u = [...errorHeaders]; u[idx] = { ...u[idx], value: e.target.value }; setErrorHeaders(u) }}
                        placeholder="VALIDATION_ERROR" className="flex-1 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
                      <button onClick={() => setErrorHeaders(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-neutral-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Error body — Monaco editor */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-400">Body (CEL expressions)</label>
                  {!errorBodyCode.trim() && (
                    <button
                      onClick={() => setErrorBodyCode('code    = "\'VALIDATION_ERROR\'"\nmessage = "error.message"')}
                      className="w-full px-3 py-2 text-xs text-rose-400 border border-dashed border-neutral-600 rounded hover:border-rose-500/50 transition-colors mb-1"
                    >
                      Use default template (code + message)
                    </button>
                  )}
                  <MiniEditor
                    value={errorBodyCode}
                    onChange={setErrorBodyCode}
                    language="hcl"
                    height="80px"
                    placeholder={'code    = "\'VALIDATION_ERROR\'"\nmessage = "error.message"'}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-700">
          <button onClick={handleClear} className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors">
            Clear All
          </button>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded text-sm text-neutral-200 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-sm text-white font-medium transition-colors">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function parseDelay(delay: string): number {
  const match = delay.match(/^(\d+)(ms|s|m|h)?$/)
  if (!match) return 1000
  const value = parseInt(match[1])
  const unit = match[2] || 's'
  switch (unit) {
    case 'ms': return value
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 60 * 60 * 1000
    default: return value * 1000
  }
}

function formatDelay(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${ms / 1000}s`
  if (ms < 3600000) return `${ms / 60000}m`
  return `${ms / 3600000}h`
}
