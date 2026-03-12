import { useState, useCallback, useEffect } from 'react'
import { X, Layers, Info, Plus, Trash2 } from 'lucide-react'
import type { FlowBatch } from '../../types'

interface BatchEditorProps {
  isOpen: boolean
  batch?: FlowBatch
  availableConnectors: Array<{ name: string; type: string }>
  onSave: (batch: FlowBatch | undefined) => void
  onClose: () => void
}

const CHUNK_PRESETS = [50, 100, 200, 500, 1000]

export default function BatchEditor({
  isOpen,
  batch,
  availableConnectors,
  onSave,
  onClose,
}: BatchEditorProps) {
  const [source, setSource] = useState('')
  const [query, setQuery] = useState('')
  const [chunkSize, setChunkSize] = useState(100)
  const [onError, setOnError] = useState<'stop' | 'continue'>('stop')
  const [params, setParams] = useState<Array<{ key: string; value: string }>>([])
  const [transformFields, setTransformFields] = useState<Array<{ key: string; value: string }>>([])
  const [toConnector, setToConnector] = useState('')
  const [toTarget, setToTarget] = useState('')
  const [toOperation, setToOperation] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (batch) {
        setSource(batch.source)
        setQuery(batch.query)
        setChunkSize(batch.chunkSize || 100)
        setOnError(batch.onError || 'stop')
        setParams(
          Object.entries(batch.params || {}).map(([key, value]) => ({ key, value }))
        )
        setTransformFields(
          Object.entries(batch.transform || {}).map(([key, value]) => ({ key, value }))
        )
        setToConnector(batch.to?.connector || '')
        setToTarget(batch.to?.target || '')
        setToOperation(batch.to?.operation || '')
      } else {
        setSource('')
        setQuery('')
        setChunkSize(100)
        setOnError('stop')
        setParams([])
        setTransformFields([])
        setToConnector('')
        setToTarget('')
        setToOperation('')
      }
    }
  }, [batch, isOpen])

  const handleSave = useCallback(() => {
    if (!source.trim() || !query.trim() || !toConnector.trim()) return

    const paramMap = params.reduce((acc, p) => {
      if (p.key.trim() && p.value.trim()) acc[p.key.trim()] = p.value.trim()
      return acc
    }, {} as Record<string, string>)

    const transformMap = transformFields.reduce((acc, f) => {
      if (f.key.trim() && f.value.trim()) acc[f.key.trim()] = f.value.trim()
      return acc
    }, {} as Record<string, string>)

    onSave({
      source: source.trim(),
      query: query.trim(),
      chunkSize: chunkSize !== 100 ? chunkSize : undefined,
      onError: onError !== 'stop' ? onError : undefined,
      params: Object.keys(paramMap).length > 0 ? paramMap : undefined,
      transform: Object.keys(transformMap).length > 0 ? transformMap : undefined,
      to: {
        connector: toConnector.trim(),
        target: toTarget.trim() || undefined,
        operation: toOperation.trim() || undefined,
      },
    })
    onClose()
  }, [source, query, chunkSize, onError, params, transformFields, toConnector, toTarget, toOperation, onSave, onClose])

  const handleClear = useCallback(() => {
    onSave(undefined)
    onClose()
  }, [onSave, onClose])

  if (!isOpen) return null

  const canSave = source.trim() && query.trim() && toConnector.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onKeyDown={e => e.stopPropagation()}>
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-[600px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold text-neutral-200">Batch Processing</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-start gap-2 p-3 bg-neutral-700/50 rounded-lg text-sm text-neutral-400">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p>Process large datasets in chunks. Reads from a source, optionally transforms each item, and writes to a target connector.</p>
          </div>

          {/* Source */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Source Connector *</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="">Select connector...</option>
              {availableConnectors.map((c) => (
                <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
              ))}
            </select>
          </div>

          {/* Query */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Query *</label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SELECT * FROM users ORDER BY id"
              rows={2}
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono resize-none"
            />
          </div>

          {/* Chunk size + on_error */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Chunk Size</label>
              <input
                type="number"
                min={1}
                value={chunkSize}
                onChange={(e) => setChunkSize(Math.max(1, parseInt(e.target.value) || 100))}
                className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
              <div className="flex flex-wrap gap-1">
                {CHUNK_PRESETS.map((size) => (
                  <button
                    key={size}
                    onClick={() => setChunkSize(size)}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      chunkSize === size
                        ? 'bg-orange-500/20 border border-orange-500/50 text-orange-300'
                        : 'bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">On Error</label>
              <select
                value={onError}
                onChange={(e) => setOnError(e.target.value as 'stop' | 'continue')}
                className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="stop">Stop (halt on first failure)</option>
                <option value="continue">Continue (skip failed chunks)</option>
              </select>
            </div>
          </div>

          {/* Params */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-300">Query Parameters (optional)</label>
              <button
                onClick={() => setParams(prev => [...prev, { key: '', value: '' }])}
                className="flex items-center gap-1 px-2 py-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            {params.map((param, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={param.key}
                  onChange={(e) => {
                    const updated = [...params]
                    updated[idx] = { ...updated[idx], key: e.target.value }
                    setParams(updated)
                  }}
                  placeholder="param_name"
                  className="w-1/3 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
                <span className="text-neutral-500">=</span>
                <input
                  type="text"
                  value={param.value}
                  onChange={(e) => {
                    const updated = [...params]
                    updated[idx] = { ...updated[idx], value: e.target.value }
                    setParams(updated)
                  }}
                  placeholder="input.field or CEL"
                  className="flex-1 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono"
                />
                <button
                  onClick={() => setParams(prev => prev.filter((_, i) => i !== idx))}
                  className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Transform */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-300">Per-item Transform (optional)</label>
              <button
                onClick={() => setTransformFields(prev => [...prev, { key: '', value: '' }])}
                className="flex items-center gap-1 px-2 py-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            <p className="text-xs text-neutral-500">Each item is available as <code className="text-orange-300">input.*</code></p>
            {transformFields.map((field, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) => {
                    const updated = [...transformFields]
                    updated[idx] = { ...updated[idx], key: e.target.value }
                    setTransformFields(updated)
                  }}
                  placeholder="field_name"
                  className="w-1/3 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
                <span className="text-neutral-500">=</span>
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => {
                    const updated = [...transformFields]
                    updated[idx] = { ...updated[idx], value: e.target.value }
                    setTransformFields(updated)
                  }}
                  placeholder="input.field or CEL expr"
                  className="flex-1 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono"
                />
                <button
                  onClick={() => setTransformFields(prev => prev.filter((_, i) => i !== idx))}
                  className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* To (target) */}
          <div className="space-y-2 pt-2 border-t border-neutral-700">
            <label className="text-sm font-medium text-neutral-300">Target *</label>
            <div className="space-y-2">
              <select
                value={toConnector}
                onChange={(e) => setToConnector(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="">Select target connector...</option>
                {availableConnectors.map((c) => (
                  <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={toTarget}
                  onChange={(e) => setToTarget(e.target.value)}
                  placeholder="target (e.g. users)"
                  className="px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
                <input
                  type="text"
                  value={toOperation}
                  onChange={(e) => setToOperation(e.target.value)}
                  placeholder="operation (e.g. INSERT)"
                  className="px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
            </div>
          </div>

          {/* HCL Preview */}
          {canSave && (
            <div className="p-3 bg-neutral-900 rounded text-xs font-mono text-neutral-400">
              <div className="text-neutral-500 mb-1">HCL preview:</div>
              <div className="text-orange-300">batch {'{'}</div>
              <div className="text-neutral-300">{'  '}source     = "{source}"</div>
              <div className="text-neutral-300">{'  '}query      = "{query}"</div>
              {chunkSize !== 100 && <div className="text-neutral-300">{'  '}chunk_size = {chunkSize}</div>}
              {onError !== 'stop' && <div className="text-neutral-300">{'  '}on_error   = "{onError}"</div>}
              {params.some(p => p.key.trim()) && (
                <>
                  <div className="text-neutral-300">{'  '}params     = {'{'} {params.filter(p => p.key.trim()).map(p => `${p.key} = "${p.value}"`).join(', ')} {'}'}</div>
                </>
              )}
              {transformFields.some(f => f.key.trim()) && (
                <>
                  <div className="text-orange-300 mt-1">{'  '}transform {'{'}</div>
                  {transformFields.filter(f => f.key.trim()).map((f, i) => (
                    <div key={i} className="text-neutral-300">{'    '}{f.key} = "{f.value}"</div>
                  ))}
                  <div className="text-orange-300">{'  }'}{'}'}</div>
                </>
              )}
              <div className="text-orange-300 mt-1">{'  '}to {'{'}</div>
              <div className="text-neutral-300">{'    '}connector = "{toConnector}"</div>
              {toTarget && <div className="text-neutral-300">{'    '}target    = "{toTarget}"</div>}
              {toOperation && <div className="text-neutral-300">{'    '}operation = "{toOperation}"</div>}
              <div className="text-orange-300">{'  }'}{'}'}</div>
              <div className="text-orange-300">{'}'}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-700">
          <button onClick={handleClear} className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors">
            Clear Batch
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
              disabled={!canSave}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                canSave
                  ? 'bg-orange-600 hover:bg-orange-500 text-white'
                  : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
              }`}
            >
              Save Batch
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
