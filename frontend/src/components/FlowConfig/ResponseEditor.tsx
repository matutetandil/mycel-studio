import { useState, useCallback, useEffect } from 'react'
import { X, MessageSquare, Info, Plus, Trash2 } from 'lucide-react'
import type { FlowResponse } from '../../types'

interface ResponseEditorProps {
  isOpen: boolean
  response?: FlowResponse
  isEchoFlow?: boolean
  onSave: (response: FlowResponse | undefined) => void
  onClose: () => void
}

const CEL_PATTERNS = [
  { label: 'output.field', value: 'output.' },
  { label: 'input.field', value: 'input.' },
  { label: 'lower()', value: 'lower(output.)' },
  { label: 'upper()', value: 'upper(output.)' },
  { label: 'uuid()', value: 'uuid()' },
  { label: 'now()', value: 'now()' },
  { label: 'step.name', value: 'step.' },
  { label: 'string concat', value: 'output.first + " " + output.last' },
]

const TEMPLATES: Array<{ label: string; fields: Record<string, string> }> = [
  {
    label: 'Pass through output',
    fields: { id: 'output.id', email: 'output.email', name: 'output.name' },
  },
  {
    label: 'Normalize output',
    fields: { id: 'output.id', email: 'lower(output.email)', created_at: 'output.created_at' },
  },
  {
    label: 'Echo with metadata',
    fields: { id: 'uuid()', email: 'lower(input.email)', created_at: 'now()' },
  },
]

export default function ResponseEditor({
  isOpen,
  response,
  isEchoFlow,
  onSave,
  onClose,
}: ResponseEditorProps) {
  const [fields, setFields] = useState<Array<{ key: string; value: string }>>([])
  const [httpStatusCode, setHttpStatusCode] = useState('')
  const [grpcStatusCode, setGrpcStatusCode] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (response) {
        setFields(
          Object.entries(response.fields || {}).map(([key, value]) => ({ key, value }))
        )
        setHttpStatusCode(response.httpStatusCode || '')
        setGrpcStatusCode(response.grpcStatusCode || '')
      } else {
        setFields([])
        setHttpStatusCode('')
        setGrpcStatusCode('')
      }
    }
  }, [response, isOpen])

  const handleSave = useCallback(() => {
    const fieldMap = fields.reduce((acc, f) => {
      if (f.key.trim() && f.value.trim()) acc[f.key.trim()] = f.value.trim()
      return acc
    }, {} as Record<string, string>)

    if (Object.keys(fieldMap).length === 0 && !httpStatusCode && !grpcStatusCode) {
      onSave(undefined)
    } else {
      onSave({
        fields: fieldMap,
        httpStatusCode: httpStatusCode || undefined,
        grpcStatusCode: grpcStatusCode || undefined,
      })
    }
    onClose()
  }, [fields, httpStatusCode, grpcStatusCode, onSave, onClose])

  const handleClear = useCallback(() => {
    onSave(undefined)
    onClose()
  }, [onSave, onClose])

  const applyTemplate = useCallback((tplFields: Record<string, string>) => {
    setFields(Object.entries(tplFields).map(([key, value]) => ({ key, value })))
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-[550px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-neutral-200">Response Transform</h2>
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
            <p>
              {isEchoFlow
                ? 'Transform the input and return it directly (echo flow — no destination). Use input.* variables.'
                : 'Transform the output after receiving from the destination. Use output.* (destination result) and input.* (original request).'}
            </p>
          </div>

          {/* CEL field mappings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-300">Field Mappings (CEL)</label>
              <button
                onClick={() => setFields(prev => [...prev, { key: '', value: '' }])}
                className="flex items-center gap-1 px-2 py-1 text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Field
              </button>
            </div>

            {/* Templates */}
            <div className="flex flex-wrap gap-1">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={() => applyTemplate(tpl.fields)}
                  className="px-2 py-1 text-xs bg-neutral-700 border border-neutral-600 rounded text-neutral-400 hover:text-green-300 hover:border-green-500/50 transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            {fields.map((field, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) => {
                    const updated = [...fields]
                    updated[idx] = { ...updated[idx], key: e.target.value }
                    setFields(updated)
                  }}
                  placeholder="field_name"
                  className="w-1/3 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
                <span className="text-neutral-500">=</span>
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => {
                    const updated = [...fields]
                    updated[idx] = { ...updated[idx], value: e.target.value }
                    setFields(updated)
                  }}
                  placeholder={isEchoFlow ? "input.field or CEL expr" : "output.field or CEL expr"}
                  className="flex-1 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 font-mono"
                />
                <button
                  onClick={() => setFields(prev => prev.filter((_, i) => i !== idx))}
                  className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {fields.length === 0 && (
              <div className="text-xs text-neutral-500 py-2 text-center">
                No fields — add fields or pick a template above
              </div>
            )}
          </div>

          {/* CEL patterns helper */}
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">CEL patterns:</label>
            <div className="flex flex-wrap gap-1">
              {CEL_PATTERNS.map((p) => (
                <span
                  key={p.label}
                  className="px-1.5 py-0.5 text-xs bg-neutral-700/50 border border-neutral-600/50 rounded text-neutral-500 font-mono"
                >
                  {p.label}
                </span>
              ))}
            </div>
          </div>

          {/* Status code overrides */}
          <div className="space-y-3 pt-2 border-t border-neutral-700">
            <label className="text-sm font-medium text-neutral-300">Status Code Overrides (optional)</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-neutral-400">HTTP Status (REST/SOAP)</label>
                <input
                  type="text"
                  value={httpStatusCode}
                  onChange={(e) => setHttpStatusCode(e.target.value)}
                  placeholder="e.g. 201"
                  className="w-full px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-neutral-400">gRPC Status</label>
                <input
                  type="text"
                  value={grpcStatusCode}
                  onChange={(e) => setGrpcStatusCode(e.target.value)}
                  placeholder="e.g. 0"
                  className="w-full px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 font-mono"
                />
              </div>
            </div>
          </div>

          {/* HCL Preview */}
          {(fields.length > 0 || httpStatusCode || grpcStatusCode) && (
            <div className="p-3 bg-neutral-900 rounded text-xs font-mono text-neutral-400">
              <div className="text-neutral-500 mb-1">HCL preview:</div>
              <div className="text-green-300">response {'{'}</div>
              {fields.filter(f => f.key.trim()).map((f, i) => (
                <div key={i} className="text-neutral-300">
                  {'  '}{f.key} = "{f.value}"
                </div>
              ))}
              {httpStatusCode && (
                <div className="text-neutral-300">
                  {'  '}http_status_code = "{httpStatusCode}"
                </div>
              )}
              {grpcStatusCode && (
                <div className="text-neutral-300">
                  {'  '}grpc_status_code = "{grpcStatusCode}"
                </div>
              )}
              <div className="text-green-300">{'}'}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-700">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Clear Response
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
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-sm text-white font-medium transition-colors"
            >
              Save Response
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
