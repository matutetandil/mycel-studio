import { useState, useCallback, useEffect } from 'react'
import { Info, X, ChevronDown } from 'lucide-react'
import type { FlowBlockDefinition, FlowBlockField } from './types'

interface GenericBlockEditorProps {
  definition: FlowBlockDefinition
  isOpen: boolean
  data: Record<string, unknown> | undefined
  availableStorages: string[]
  onSave: (data: Record<string, unknown> | undefined) => void
  onClose: () => void
}

export default function GenericBlockEditor({
  definition,
  isOpen,
  data,
  availableStorages,
  onSave,
  onClose,
}: GenericBlockEditorProps) {
  const [values, setValues] = useState<Record<string, unknown>>({})

  // Initialize values from data or defaults
  useEffect(() => {
    if (!isOpen) return
    const initial: Record<string, unknown> = {}
    for (const field of definition.fields || []) {
      initial[field.key] = data?.[field.key] ?? field.defaultValue ?? ''
    }
    setValues(initial)
  }, [isOpen, data, definition.fields])

  const updateValue = useCallback((key: string, value: unknown) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(() => {
    // Check required fields
    const fields = definition.fields || []
    for (const field of fields) {
      if (!field.required) continue
      const val = values[field.key]
      if (val === undefined || val === null || val === '') return
    }

    // Build clean data object, omitting empty values
    const result: Record<string, unknown> = {}
    for (const field of fields) {
      const val = values[field.key]
      if (val !== undefined && val !== null && val !== '') {
        result[field.key] = val
      }
    }

    onSave(result)
    onClose()
  }, [values, definition.fields, onSave, onClose])

  const handleRemove = useCallback(() => {
    onSave(undefined)
    onClose()
  }, [onSave, onClose])

  if (!isOpen) return null

  const fields = definition.fields || []
  const Icon = definition.icon
  const accent = definition.accentColor

  // Check if save is disabled (missing required fields)
  const saveDisabled = fields.some(field => {
    if (!field.required) return false
    if (!isFieldVisible(field, values)) return false
    const val = values[field.key]
    return val === undefined || val === null || val === ''
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${definition.color}`} />
            <h2 className="text-lg font-semibold text-neutral-200">{definition.label}</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Info text */}
          <div className="flex items-start gap-2 p-3 bg-neutral-700/50 rounded-lg text-sm text-neutral-400">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{definition.infoText}</p>
          </div>

          {/* Fields */}
          {fields.map(field => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={values[field.key]}
              values={values}
              accent={accent}
              availableStorages={availableStorages}
              onChange={(val) => updateValue(field.key, val)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-700">
          <button
            onClick={handleRemove}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Remove {definition.label.split(' ')[0]}
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
              disabled={saveDisabled}
              className={`px-4 py-2 bg-${accent}-600 hover:bg-${accent}-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-white font-medium transition-colors`}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function isFieldVisible(field: FlowBlockField, values: Record<string, unknown>): boolean {
  if (!field.visibleWhen) return true
  return values[field.visibleWhen.field] === field.visibleWhen.value
}

function FieldRenderer({
  field,
  value,
  values,
  accent,
  availableStorages,
  onChange,
}: {
  field: FlowBlockField
  value: unknown
  values: Record<string, unknown>
  accent: string
  availableStorages: string[]
  onChange: (value: unknown) => void
}) {
  if (!isFieldVisible(field, values)) return null

  const ringClass = `focus:ring-${accent}-500/50`

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-300">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>

      {field.helpText && (
        <p className="text-xs text-neutral-500">{field.helpText}</p>
      )}

      {field.type === 'storage_select' && (
        <StorageSelect
          value={String(value || '')}
          storages={availableStorages}
          ringClass={ringClass}
          onChange={(v) => onChange(v)}
        />
      )}

      {field.type === 'cel_expression' && (
        <CelExpressionInput
          value={String(value || '')}
          field={field}
          accent={accent}
          ringClass={ringClass}
          onChange={(v) => onChange(v)}
        />
      )}

      {field.type === 'duration' && (
        <DurationInput
          value={String(value || '')}
          field={field}
          accent={accent}
          ringClass={ringClass}
          onChange={(v) => onChange(v)}
        />
      )}

      {field.type === 'number' && (
        <NumberInput
          value={value as number | ''}
          field={field}
          accent={accent}
          ringClass={ringClass}
          onChange={(v) => onChange(v)}
        />
      )}

      {field.type === 'select' && (
        <select
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 ${ringClass}`}
        >
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {field.type === 'boolean' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className={`w-4 h-4 rounded bg-neutral-700 border-neutral-600 text-${accent}-500 focus:ring-${accent}-500/50`}
          />
          <span className="text-sm text-neutral-300">{field.label}</span>
        </label>
      )}

      {field.type === 'string' && (
        <input
          type="text"
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 ${ringClass}`}
        />
      )}
    </div>
  )
}

function StorageSelect({
  value,
  storages,
  ringClass,
  onChange,
}: {
  value: string
  storages: string[]
  ringClass: string
  onChange: (v: string) => void
}) {
  if (storages.length === 0) {
    return (
      <div className="px-3 py-2 bg-neutral-700/50 border border-dashed border-neutral-600 rounded text-sm text-neutral-400">
        No cache connectors available. Add a cache connector first.
      </div>
    )
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 ${ringClass}`}
    >
      <option value="">Select storage...</option>
      {storages.map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}

function CelExpressionInput({
  value,
  field,
  accent,
  ringClass,
  onChange,
}: {
  value: string
  field: FlowBlockField
  accent: string
  ringClass: string
  onChange: (v: string) => void
}) {
  const [showPatterns, setShowPatterns] = useState(false)

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 ${ringClass} font-mono`}
        />
        {field.patterns && field.patterns.length > 0 && (
          <button
            onClick={() => setShowPatterns(!showPatterns)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showPatterns ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {showPatterns && field.patterns && (
        <div className="flex flex-wrap gap-1">
          {field.patterns.map(p => (
            <button
              key={p.pattern}
              onClick={() => { onChange(p.pattern); setShowPatterns(false) }}
              className={`px-2 py-1 text-xs rounded bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-neutral-200 hover:border-${accent}-500/50 transition-colors font-mono`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DurationInput({
  value,
  field,
  accent,
  ringClass,
  onChange,
}: {
  value: string
  field: FlowBlockField
  accent: string
  ringClass: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={`w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 ${ringClass} font-mono`}
      />
      {field.presets && field.presets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {field.presets.map(p => (
            <button
              key={String(p.value)}
              onClick={() => onChange(String(p.value))}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                value === String(p.value)
                  ? `bg-${accent}-500/20 border border-${accent}-500/50 text-${accent}-300`
                  : 'bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NumberInput({
  value,
  field,
  accent,
  ringClass,
  onChange,
}: {
  value: number | ''
  field: FlowBlockField
  accent: string
  ringClass: string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder={field.placeholder}
        className={`w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 ${ringClass}`}
      />
      {field.presets && field.presets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {field.presets.map(p => (
            <button
              key={String(p.value)}
              onClick={() => onChange(Number(p.value))}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                value === Number(p.value)
                  ? `bg-${accent}-500/20 border border-${accent}-500/50 text-${accent}-300`
                  : 'bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
