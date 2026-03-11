import { useState, useCallback, useEffect } from 'react'
import { X, Lock, Info } from 'lucide-react'
import type { FlowLock } from '../../types'

interface LockEditorProps {
  isOpen: boolean
  lock?: FlowLock
  availableStorages: string[] // Names of cache/redis connectors
  onSave: (lock: FlowLock | undefined) => void
  onClose: () => void
}

// Common timeout presets
const TIMEOUT_PRESETS = [
  { label: '5s', value: '5s' },
  { label: '10s', value: '10s' },
  { label: '30s', value: '30s' },
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
]

// Common key patterns
const KEY_PATTERNS = [
  { label: 'By ID', pattern: '"lock:" + input.id' },
  { label: 'By user', pattern: '"lock:user:" + input.user_id' },
  { label: 'By order', pattern: '"lock:order:" + input.order_id' },
  { label: 'By resource', pattern: '"lock:" + input.resource_type + ":" + input.resource_id' },
]

export default function LockEditor({
  isOpen,
  lock,
  availableStorages,
  onSave,
  onClose,
}: LockEditorProps) {
  const [storage, setStorage] = useState('')
  const [key, setKey] = useState('')
  const [timeout, setTimeout] = useState('30s')
  const [wait, setWait] = useState(true)
  const [retry, setRetry] = useState('')
  const [showKeyPatterns, setShowKeyPatterns] = useState(false)

  // Initialize state from lock prop
  useEffect(() => {
    if (lock) {
      setStorage(lock.storage)
      setKey(lock.key)
      setTimeout(lock.timeout)
      setWait(lock.wait ?? true)
      setRetry(lock.retry || '')
    } else {
      setStorage(availableStorages[0] || '')
      setKey('')
      setTimeout('30s')
      setWait(true)
      setRetry('')
    }
  }, [lock, isOpen, availableStorages])

  const handleSave = useCallback(() => {
    if (!storage || !key.trim() || !timeout.trim()) {
      return
    }

    onSave({
      storage,
      key: key.trim(),
      timeout: timeout.trim(),
      wait,
      retry: retry.trim() || undefined,
    })
    onClose()
  }, [storage, key, timeout, wait, retry, onSave, onClose])

  const handleClear = useCallback(() => {
    onSave(undefined)
    onClose()
  }, [onSave, onClose])

  const insertKeyPattern = useCallback((pattern: string) => {
    setKey(pattern)
    setShowKeyPatterns(false)
  }, [])

  if (!isOpen) return null

  const isValid = storage && key.trim() && timeout.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-neutral-200">Lock (Mutex) Configuration</h2>
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
                A mutex lock ensures only one execution of this flow can run at a time for a given key.
                Useful for preventing race conditions on shared resources.
              </p>
            </div>
          </div>

          {/* Storage selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Lock Storage (Redis/Cache)
            </label>
            {availableStorages.length === 0 ? (
              <div className="px-3 py-2 bg-neutral-700/50 border border-dashed border-neutral-600 rounded text-sm text-neutral-400">
                No cache/redis connectors available. Add a cache connector first.
              </div>
            ) : (
              <select
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              >
                <option value="">Select a storage...</option>
                {availableStorages.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Lock key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Lock Key (CEL Expression)
            </label>
            <div className="relative">
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder='"lock:" + input.id'
                className="w-full px-3 py-2 pr-20 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 font-mono"
              />
              <button
                onClick={() => setShowKeyPatterns(!showKeyPatterns)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
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
              The key uniquely identifies the lock. Only one flow with the same key can execute at a time.
            </p>
          </div>

          {/* Timeout */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Lock Timeout
            </label>
            <input
              type="text"
              value={timeout}
              onChange={(e) => setTimeout(e.target.value)}
              placeholder="30s"
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 font-mono"
            />
            <div className="flex flex-wrap gap-1">
              {TIMEOUT_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setTimeout(preset.value)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    timeout === preset.value
                      ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-300'
                      : 'bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wait option */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={wait}
                onChange={(e) => setWait(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-600 bg-neutral-700 text-yellow-500 focus:ring-yellow-500/50"
              />
              <span className="text-sm text-neutral-300">Wait for lock</span>
            </label>
            <p className="text-xs text-neutral-500 ml-6">
              If enabled, the flow will wait until the lock is available. If disabled, it will fail immediately if locked.
            </p>
          </div>

          {/* Retry interval (when wait is enabled) */}
          {wait && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">
                Retry Interval (optional)
              </label>
              <input
                type="text"
                value={retry}
                onChange={(e) => setRetry(e.target.value)}
                placeholder="100ms"
                className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 font-mono"
              />
              <p className="text-xs text-neutral-500">
                How often to check if the lock is available while waiting.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-700">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Remove Lock
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
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-white font-medium transition-colors"
            >
              Save Lock
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
