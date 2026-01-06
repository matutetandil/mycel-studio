import { useState, useCallback, useEffect } from 'react'
import { X, Plus, Trash2, Info, Wand2 } from 'lucide-react'
import type { FlowTransform } from '../../types'

interface TransformEditorProps {
  isOpen: boolean
  transform?: FlowTransform
  onSave: (transform: FlowTransform | undefined) => void
  onClose: () => void
}

interface FieldMapping {
  id: string
  key: string
  expression: string
}

// Common CEL expression templates
const CEL_TEMPLATES = [
  { label: 'Direct mapping', template: 'input.fieldName' },
  { label: 'UUID generation', template: 'uuid()' },
  { label: 'Current timestamp', template: 'now()' },
  { label: 'Lowercase', template: 'lower(input.fieldName)' },
  { label: 'Uppercase', template: 'upper(input.fieldName)' },
  { label: 'String concatenation', template: 'input.first + " " + input.last' },
  { label: 'Conditional', template: 'input.value > 0 ? "positive" : "negative"' },
  { label: 'Default value', template: 'input.field ?? "default"' },
  { label: 'From enrichment', template: 'enriched.name.field' },
  { label: 'Array access', template: 'input.items[0]' },
]

export default function TransformEditor({
  isOpen,
  transform,
  onSave,
  onClose,
}: TransformEditorProps) {
  const [fields, setFields] = useState<FieldMapping[]>([])
  const [useTransforms, setUseTransforms] = useState<string[]>([])
  const [newUseName, setNewUseName] = useState('')
  const [showTemplates, setShowTemplates] = useState<string | null>(null)

  // Initialize state from transform prop
  useEffect(() => {
    if (transform) {
      const mappings = Object.entries(transform.fields || {}).map(([key, expression], index) => ({
        id: `field-${index}-${Date.now()}`,
        key,
        expression,
      }))
      setFields(mappings.length > 0 ? mappings : [{ id: `field-${Date.now()}`, key: '', expression: '' }])
      setUseTransforms(transform.use || [])
    } else {
      setFields([{ id: `field-${Date.now()}`, key: '', expression: '' }])
      setUseTransforms([])
    }
  }, [transform, isOpen])

  const addField = useCallback(() => {
    setFields(prev => [...prev, { id: `field-${Date.now()}`, key: '', expression: '' }])
  }, [])

  const removeField = useCallback((id: string) => {
    setFields(prev => prev.filter(f => f.id !== id))
  }, [])

  const updateField = useCallback((id: string, updates: Partial<FieldMapping>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }, [])

  const addUseTransform = useCallback(() => {
    if (newUseName.trim() && !useTransforms.includes(newUseName.trim())) {
      setUseTransforms(prev => [...prev, newUseName.trim()])
      setNewUseName('')
    }
  }, [newUseName, useTransforms])

  const removeUseTransform = useCallback((name: string) => {
    setUseTransforms(prev => prev.filter(n => n !== name))
  }, [])

  const insertTemplate = useCallback((fieldId: string, template: string) => {
    updateField(fieldId, { expression: template })
    setShowTemplates(null)
  }, [updateField])

  const handleSave = useCallback(() => {
    // Filter out empty fields
    const validFields = fields.filter(f => f.key.trim() && f.expression.trim())

    if (validFields.length === 0 && useTransforms.length === 0) {
      // If no transforms, clear the transform entirely
      onSave(undefined)
    } else {
      const fieldsRecord: Record<string, string> = {}
      for (const field of validFields) {
        fieldsRecord[field.key.trim()] = field.expression.trim()
      }

      onSave({
        use: useTransforms.length > 0 ? useTransforms : undefined,
        fields: fieldsRecord,
      })
    }
    onClose()
  }, [fields, useTransforms, onSave, onClose])

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
            <Wand2 className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-neutral-200">Transform Editor</h2>
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
                Transforms map input fields to output fields using{' '}
                <a
                  href="https://cel.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  CEL expressions
                </a>.
              </p>
              <p className="mt-1 text-neutral-500">
                Use <code className="bg-neutral-600 px-1 rounded">input.*</code> for request data,{' '}
                <code className="bg-neutral-600 px-1 rounded">enriched.*</code> for enrichment data.
              </p>
            </div>
          </div>

          {/* Use named transforms section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Use Named Transforms (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newUseName}
                onChange={(e) => setNewUseName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addUseTransform()}
                placeholder="Transform name..."
                className="flex-1 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <button
                onClick={addUseTransform}
                disabled={!newUseName.trim()}
                className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-600 rounded text-sm text-neutral-200 transition-colors"
              >
                Add
              </button>
            </div>
            {useTransforms.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {useTransforms.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 border border-amber-500/50 rounded text-sm text-amber-300"
                  >
                    {name}
                    <button
                      onClick={() => removeUseTransform(name)}
                      className="text-amber-400 hover:text-amber-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Field mappings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-300">
                Field Mappings
              </label>
              <button
                onClick={addField}
                className="flex items-center gap-1 px-2 py-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Field
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="p-3 bg-neutral-700/30 border border-neutral-600 rounded-lg space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) => updateField(field.id, { key: e.target.value })}
                      placeholder="output_field"
                      className="flex-1 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono"
                    />
                    <span className="text-neutral-500">=</span>
                    <button
                      onClick={() => removeField(field.id)}
                      disabled={fields.length === 1}
                      className="p-2 text-neutral-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Remove field"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={field.expression}
                      onChange={(e) => updateField(field.id, { expression: e.target.value })}
                      placeholder="CEL expression (e.g., input.name, uuid(), now())"
                      className="w-full px-3 py-2 pr-10 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono"
                    />
                    <button
                      onClick={() => setShowTemplates(showTemplates === field.id ? null : field.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-amber-400 transition-colors"
                      title="Insert template"
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>
                    {/* Templates dropdown */}
                    {showTemplates === field.id && (
                      <div className="absolute right-0 top-full mt-1 w-64 bg-neutral-800 border border-neutral-600 rounded-lg shadow-xl z-10 py-1 max-h-60 overflow-y-auto">
                        {CEL_TEMPLATES.map((tpl, idx) => (
                          <button
                            key={idx}
                            onClick={() => insertTemplate(field.id, tpl.template)}
                            className="w-full px-3 py-2 text-left hover:bg-neutral-700 transition-colors"
                          >
                            <div className="text-sm text-neutral-200">{tpl.label}</div>
                            <div className="text-xs text-neutral-500 font-mono">{tpl.template}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
            Clear Transform
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
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm text-white font-medium transition-colors"
            >
              Save Transform
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
