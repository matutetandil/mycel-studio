import { useState, useCallback, useEffect } from 'react'
import { X, Database, Info, Clock } from 'lucide-react'
import type { FlowCache } from '../../types'

interface CacheEditorProps {
  isOpen: boolean
  cache?: FlowCache
  availableStorages: string[] // Names of cache connectors
  onSave: (cache: FlowCache | undefined) => void
  onClose: () => void
}

// Common TTL presets
const TTL_PRESETS = [
  { label: '1 minute', value: '1m' },
  { label: '5 minutes', value: '5m' },
  { label: '15 minutes', value: '15m' },
  { label: '30 minutes', value: '30m' },
  { label: '1 hour', value: '1h' },
  { label: '6 hours', value: '6h' },
  { label: '12 hours', value: '12h' },
  { label: '1 day', value: '24h' },
  { label: '7 days', value: '168h' },
]

// Common cache key patterns
const KEY_PATTERNS = [
  { label: 'By ID', pattern: '"entity:" + input.id' },
  { label: 'By user', pattern: '"user:" + input.user_id' },
  { label: 'By operation', pattern: '"op:" + input.operation + ":" + input.id' },
  { label: 'By path', pattern: '"path:" + input.path' },
  { label: 'Composite', pattern: '"key:" + input.type + ":" + input.id' },
]

export default function CacheEditor({
  isOpen,
  cache,
  availableStorages,
  onSave,
  onClose,
}: CacheEditorProps) {
  const [storage, setStorage] = useState('')
  const [key, setKey] = useState('')
  const [ttl, setTtl] = useState('5m')
  const [showKeyPatterns, setShowKeyPatterns] = useState(false)

  // Initialize state from cache prop
  useEffect(() => {
    if (cache) {
      setStorage(cache.storage)
      setKey(cache.key)
      setTtl(cache.ttl)
    } else {
      setStorage(availableStorages[0] || '')
      setKey('')
      setTtl('5m')
    }
  }, [cache, isOpen, availableStorages])

  const handleSave = useCallback(() => {
    if (!storage || !key.trim() || !ttl.trim()) {
      return
    }

    onSave({
      storage,
      key: key.trim(),
      ttl: ttl.trim(),
    })
    onClose()
  }, [storage, key, ttl, onSave, onClose])

  const handleClear = useCallback(() => {
    onSave(undefined)
    onClose()
  }, [onSave, onClose])

  const insertKeyPattern = useCallback((pattern: string) => {
    setKey(pattern)
    setShowKeyPatterns(false)
  }, [])

  if (!isOpen) return null

  const isValid = storage && key.trim() && ttl.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-neutral-200">Cache Configuration</h2>
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
                Cache the flow result to improve performance. The cache key is a CEL expression
                that uniquely identifies the cached data.
              </p>
            </div>
          </div>

          {/* Storage selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Cache Storage
            </label>
            {availableStorages.length === 0 ? (
              <div className="px-3 py-2 bg-neutral-700/50 border border-dashed border-neutral-600 rounded text-sm text-neutral-400">
                No cache connectors available. Add a cache connector first.
              </div>
            ) : (
              <select
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="">Select a cache storage...</option>
                {availableStorages.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Cache key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Cache Key (CEL Expression)
            </label>
            <div className="relative">
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder='"prefix:" + input.id'
                className="w-full px-3 py-2 pr-20 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono"
              />
              <button
                onClick={() => setShowKeyPatterns(!showKeyPatterns)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Patterns
              </button>
              {/* Key patterns dropdown */}
              {showKeyPatterns && (
                <div className="absolute right-0 top-full mt-1 w-full bg-neutral-800 border border-neutral-600 rounded-lg shadow-xl z-10 py-1">
                  {KEY_PATTERNS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => insertKeyPattern(item.pattern)}
                      className="w-full px-3 py-2 text-left hover:bg-neutral-700 transition-colors"
                    >
                      <div className="text-sm text-neutral-200">{item.label}</div>
                      <div className="text-xs text-neutral-500 font-mono">{item.pattern}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              The key should uniquely identify the data being cached (e.g., by request ID, user, etc.)
            </p>
          </div>

          {/* TTL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-400" />
              Time to Live (TTL)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ttl}
                onChange={(e) => setTtl(e.target.value)}
                placeholder="5m"
                className="flex-1 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono"
              />
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {TTL_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setTtl(preset.value)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    ttl === preset.value
                      ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                      : 'bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-700">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Remove Cache
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
              disabled={!isValid}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-white font-medium transition-colors"
            >
              Save Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
