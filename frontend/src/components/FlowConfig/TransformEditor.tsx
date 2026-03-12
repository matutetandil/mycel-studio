import { useState, useCallback, useEffect } from 'react'
import { X, Info, Wand2 } from 'lucide-react'
import type { FlowTransform } from '../../types'
import MiniEditor from './MiniEditor'

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

const CEL_TEMPLATES = [
  { label: 'Direct mapping', template: 'input.fieldName' },
  { label: 'UUID generation', template: 'uuid()' },
  { label: 'Current timestamp', template: 'now()' },
  { label: 'Lowercase', template: 'lower(input.fieldName)' },
  { label: 'Uppercase', template: 'upper(input.fieldName)' },
  { label: 'String concatenation', template: 'input.first + " " + input.last' },
  { label: 'Conditional', template: 'input.value > 0 ? "positive" : "negative"' },
  { label: 'Default value', template: 'input.field ?? "default"' },
  { label: 'From step result', template: 'step.name.field' },
  { label: 'Array access', template: 'input.items[0]' },
]

// Build a full CEL transform block as a single string for the Monaco editor
function fieldsToCode(fields: FieldMapping[]): string {
  if (fields.length === 0) return ''
  const maxKeyLen = Math.max(...fields.map(f => f.key.length), 0)
  return fields
    .map(f => {
      const padded = f.key.padEnd(maxKeyLen)
      return `${padded} = ${f.expression}`
    })
    .join('\n')
}

function codeToFields(code: string): FieldMapping[] {
  if (!code.trim()) return []
  return code.split('\n')
    .filter(line => line.includes('='))
    .map((line, idx) => {
      const eqIdx = line.indexOf('=')
      return {
        id: `field-${idx}-${Date.now()}`,
        key: line.substring(0, eqIdx).trim(),
        expression: line.substring(eqIdx + 1).trim(),
      }
    })
    .filter(f => f.key)
}

export default function TransformEditor({
  isOpen,
  transform,
  onSave,
  onClose,
}: TransformEditorProps) {
  const [code, setCode] = useState('')
  const [useTransforms, setUseTransforms] = useState<string[]>([])
  const [newUseName, setNewUseName] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (transform) {
        const mappings = Object.entries(transform.fields || {}).map(([key, expression], index) => ({
          id: `field-${index}-${Date.now()}`,
          key,
          expression,
        }))
        setCode(fieldsToCode(mappings))
        setUseTransforms(transform.use || [])
      } else {
        setCode('')
        setUseTransforms([])
      }
    }
  }, [transform, isOpen])

  const addUseTransform = useCallback(() => {
    if (newUseName.trim() && !useTransforms.includes(newUseName.trim())) {
      setUseTransforms(prev => [...prev, newUseName.trim()])
      setNewUseName('')
    }
  }, [newUseName, useTransforms])

  const removeUseTransform = useCallback((name: string) => {
    setUseTransforms(prev => prev.filter(n => n !== name))
  }, [])

  const insertTemplate = useCallback((template: string) => {
    setCode(prev => {
      if (!prev.trim()) return `field = ${template}`
      return prev + `\nfield = ${template}`
    })
  }, [])

  const handleSave = useCallback(() => {
    const fields = codeToFields(code)

    if (fields.length === 0 && useTransforms.length === 0) {
      onSave(undefined)
    } else {
      const fieldsRecord: Record<string, string> = {}
      for (const field of fields) {
        fieldsRecord[field.key] = field.expression
      }
      onSave({
        use: useTransforms.length > 0 ? useTransforms : undefined,
        fields: fieldsRecord,
      })
    }
    onClose()
  }, [code, useTransforms, onSave, onClose])

  const handleClear = useCallback(() => {
    onSave(undefined)
    onClose()
  }, [onSave, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onKeyDown={e => e.stopPropagation()}>
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-[650px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-neutral-200">Transform Editor</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200 transition-colors">
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
                <a href="https://cel.dev/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">CEL expressions</a>.
              </p>
              <p className="mt-1 text-neutral-500">
                Variables: <code className="bg-neutral-600 px-1 rounded">input.*</code>,{' '}
                <code className="bg-neutral-600 px-1 rounded">step.*</code>,{' '}
                <code className="bg-neutral-600 px-1 rounded">enriched.*</code>
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
                  <span key={name} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 border border-amber-500/50 rounded text-sm text-amber-300">
                    {name}
                    <button onClick={() => removeUseTransform(name)} className="text-amber-400 hover:text-amber-200">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* CEL expression editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-300">Field Mappings (CEL)</label>
            </div>

            {/* Quick insert templates */}
            <div className="flex flex-wrap gap-1">
              {CEL_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={() => insertTemplate(tpl.template)}
                  className="px-2 py-1 text-xs bg-neutral-700 border border-neutral-600 rounded text-neutral-400 hover:text-amber-300 hover:border-amber-500/50 transition-colors"
                  title={tpl.template}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            {/* Monaco editor for transform block */}
            <div className="space-y-1">
              <MiniEditor
                value={code}
                onChange={setCode}
                language="hcl"
                height="200px"
                placeholder={'id         = "uuid()"\nemail      = "lower(input.email)"\ncreated_at = "now()"'}
              />
              <p className="text-xs text-neutral-500">
                Format: <code className="bg-neutral-700 px-1 rounded">field_name = "CEL expression"</code> — one per line
              </p>
            </div>
          </div>

          {/* Live HCL preview */}
          {code.trim() && (() => {
            const lines = code.split('\n').filter(l => l.trim())
            const parsed = lines.map(l => {
              const eq = l.indexOf('=')
              if (eq === -1) return { key: l.trim(), value: '' }
              return { key: l.substring(0, eq).trim(), value: l.substring(eq + 1).trim() }
            })
            const maxKey = Math.max(...parsed.map(p => p.key.length), 0)
            return (
              <div className="p-3 bg-neutral-900 rounded text-xs font-mono text-neutral-400">
                <div className="text-neutral-500 mb-1">HCL preview:</div>
                <pre className="text-amber-300">{'transform {\n'}{parsed.map((p, i) =>
                  <span key={i} className="text-neutral-300">{'  '}{p.key.padEnd(maxKey)}{p.value ? ` = ${p.value}` : ''}{'\n'}</span>
                )}<span className="text-amber-300">{'}'}</span></pre>
              </div>
            )
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-700">
          <button onClick={handleClear} className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors">
            Clear Transform
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded text-sm text-neutral-200 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm text-white font-medium transition-colors">
              Save Transform
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
