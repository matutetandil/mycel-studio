import { useState, useCallback, useEffect } from 'react'
import { X, Gauge, Info } from 'lucide-react'
import type { FlowSemaphore } from '../../types'

interface SemaphoreEditorProps {
  isOpen: boolean
  semaphore?: FlowSemaphore
  availableStorages: string[] // Names of cache/redis connectors
  onSave: (semaphore: FlowSemaphore | undefined) => void
  onClose: () => void
}

// Common timeout/lease presets
const TIME_PRESETS = [
  { label: '5s', value: '5s' },
  { label: '10s', value: '10s' },
  { label: '30s', value: '30s' },
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
]

// Common permit counts
const PERMIT_PRESETS = [1, 2, 3, 5, 10, 20, 50, 100]

export default function SemaphoreEditor({
  isOpen,
  semaphore,
  availableStorages,
  onSave,
  onClose,
}: SemaphoreEditorProps) {
  const [storage, setStorage] = useState('')
  const [key, setKey] = useState('')
  const [maxPermits, setMaxPermits] = useState(5)
  const [timeout, setTimeout] = useState('30s')
  const [lease, setLease] = useState('')

  // Initialize state from semaphore prop
  useEffect(() => {
    if (semaphore) {
      setStorage(semaphore.storage)
      setKey(semaphore.key)
      setMaxPermits(semaphore.maxPermits)
      setTimeout(semaphore.timeout)
      setLease(semaphore.lease || '')
    } else {
      setStorage(availableStorages[0] || '')
      setKey('')
      setMaxPermits(5)
      setTimeout('30s')
      setLease('')
    }
  }, [semaphore, isOpen, availableStorages])

  const handleSave = useCallback(() => {
    if (!storage || !key.trim() || !timeout.trim() || maxPermits < 1) {
      return
    }

    onSave({
      storage,
      key: key.trim(),
      maxPermits,
      timeout: timeout.trim(),
      lease: lease.trim() || undefined,
    })
    onClose()
  }, [storage, key, maxPermits, timeout, lease, onSave, onClose])

  const handleClear = useCallback(() => {
    onSave(undefined)
    onClose()
  }, [onSave, onClose])

  if (!isOpen) return null

  const isValid = storage && key.trim() && timeout.trim() && maxPermits >= 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold text-neutral-200">Semaphore Configuration</h2>
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
                A semaphore limits the number of concurrent executions of this flow for a given key.
                Useful for rate limiting external API calls or protecting resources with limited capacity.
              </p>
            </div>
          </div>

          {/* Storage selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Semaphore Storage (Redis/Cache)
            </label>
            {availableStorages.length === 0 ? (
              <div className="px-3 py-2 bg-neutral-700/50 border border-dashed border-neutral-600 rounded text-sm text-neutral-400">
                No cache/redis connectors available. Add a cache connector first.
              </div>
            ) : (
              <select
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
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

          {/* Semaphore key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Semaphore Key
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="external_api, payment_gateway, etc."
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
            <p className="text-xs text-neutral-500">
              A static key that identifies the shared resource. All flows with the same key share the permit pool.
            </p>
          </div>

          {/* Max permits */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Max Concurrent Executions
            </label>
            <input
              type="number"
              min={1}
              value={maxPermits}
              onChange={(e) => setMaxPermits(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
            <div className="flex flex-wrap gap-1">
              {PERMIT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setMaxPermits(preset)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    maxPermits === preset
                      ? 'bg-orange-500/20 border border-orange-500/50 text-orange-300'
                      : 'bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Timeout */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Acquire Timeout
            </label>
            <input
              type="text"
              value={timeout}
              onChange={(e) => setTimeout(e.target.value)}
              placeholder="30s"
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono"
            />
            <div className="flex flex-wrap gap-1">
              {TIME_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setTimeout(preset.value)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    timeout === preset.value
                      ? 'bg-orange-500/20 border border-orange-500/50 text-orange-300'
                      : 'bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500">
              Maximum time to wait for a permit. Flow fails if a permit cannot be acquired.
            </p>
          </div>

          {/* Lease time */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Permit Lease Time (optional)
            </label>
            <input
              type="text"
              value={lease}
              onChange={(e) => setLease(e.target.value)}
              placeholder="1m"
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono"
            />
            <div className="flex flex-wrap gap-1">
              {TIME_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setLease(preset.value)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    lease === preset.value
                      ? 'bg-orange-500/20 border border-orange-500/50 text-orange-300'
                      : 'bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500">
              Auto-release permit after this duration (safety mechanism if flow crashes).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-700">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Remove Semaphore
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
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-white font-medium transition-colors"
            >
              Save Semaphore
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
