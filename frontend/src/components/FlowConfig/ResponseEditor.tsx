import { useState, useCallback, useEffect } from 'react'
import { X, MessageSquare, Info, Plus, Trash2 } from 'lucide-react'
import type { FlowResponse } from '../../types'

interface ResponseEditorProps {
  isOpen: boolean
  response?: FlowResponse
  onSave: (response: FlowResponse | undefined) => void
  onClose: () => void
}

const STATUS_PRESETS = [
  { value: 200, label: '200 OK' },
  { value: 201, label: '201 Created' },
  { value: 202, label: '202 Accepted' },
  { value: 204, label: '204 No Content' },
  { value: 400, label: '400 Bad Request' },
  { value: 404, label: '404 Not Found' },
  { value: 409, label: '409 Conflict' },
  { value: 422, label: '422 Unprocessable' },
  { value: 500, label: '500 Server Error' },
]

const BODY_TEMPLATES: Array<{ label: string; fields: Record<string, string> }> = [
  { label: 'Success with data', fields: { data: 'output', success: "'true'" } },
  { label: 'Created with ID', fields: { id: 'output.id', message: "'Created successfully'" } },
  { label: 'Accepted', fields: { message: "'Request accepted'", request_id: 'uuid()' } },
]

export default function ResponseEditor({
  isOpen,
  response,
  onSave,
  onClose,
}: ResponseEditorProps) {
  const [status, setStatus] = useState(200)
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([])
  const [bodyFields, setBodyFields] = useState<Array<{ key: string; value: string }>>([])

  useEffect(() => {
    if (isOpen) {
      if (response) {
        setStatus(response.status)
        setHeaders(
          Object.entries(response.headers || {}).map(([key, value]) => ({ key, value }))
        )
        setBodyFields(
          Object.entries(response.body || {}).map(([key, value]) => ({ key, value }))
        )
      } else {
        setStatus(200)
        setHeaders([])
        setBodyFields([])
      }
    }
  }, [response, isOpen])

  const handleSave = useCallback(() => {
    const hdrs = headers.reduce((acc, h) => {
      if (h.key.trim() && h.value.trim()) acc[h.key.trim()] = h.value.trim()
      return acc
    }, {} as Record<string, string>)

    const body = bodyFields.reduce((acc, f) => {
      if (f.key.trim() && f.value.trim()) acc[f.key.trim()] = f.value.trim()
      return acc
    }, {} as Record<string, string>)

    onSave({
      status,
      headers: Object.keys(hdrs).length > 0 ? hdrs : undefined,
      body: Object.keys(body).length > 0 ? body : undefined,
    })
    onClose()
  }, [status, headers, bodyFields, onSave, onClose])

  const handleClear = useCallback(() => {
    onSave(undefined)
    onClose()
  }, [onSave, onClose])

  const applyTemplate = useCallback((fields: Record<string, string>) => {
    setBodyFields(Object.entries(fields).map(([key, value]) => ({ key, value })))
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-[550px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-neutral-200">Response Configuration</h2>
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
              Configure the HTTP response for this flow. Body values are CEL expressions
              (wrap strings in single quotes).
            </p>
          </div>

          {/* Status code */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Status Code</label>
            <input
              type="number"
              min={100}
              max={599}
              value={status}
              onChange={(e) => setStatus(Math.max(100, Math.min(599, parseInt(e.target.value) || 200)))}
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
            <div className="flex flex-wrap gap-1">
              {STATUS_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setStatus(preset.value)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    status === preset.value
                      ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                      : 'bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Headers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-300">Headers (optional)</label>
              <button
                onClick={() => setHeaders(prev => [...prev, { key: '', value: '' }])}
                className="flex items-center gap-1 px-2 py-1 text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            {headers.map((header, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={header.key}
                  onChange={(e) => {
                    const updated = [...headers]
                    updated[idx] = { ...updated[idx], key: e.target.value }
                    setHeaders(updated)
                  }}
                  placeholder="Header-Name"
                  className="w-2/5 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
                <span className="text-neutral-500">:</span>
                <input
                  type="text"
                  value={header.value}
                  onChange={(e) => {
                    const updated = [...headers]
                    updated[idx] = { ...updated[idx], value: e.target.value }
                    setHeaders(updated)
                  }}
                  placeholder="value"
                  className="flex-1 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
                <button
                  onClick={() => setHeaders(prev => prev.filter((_, i) => i !== idx))}
                  className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-300">Body (CEL expressions)</label>
              <button
                onClick={() => setBodyFields(prev => [...prev, { key: '', value: '' }])}
                className="flex items-center gap-1 px-2 py-1 text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Field
              </button>
            </div>

            {/* Templates */}
            <div className="flex flex-wrap gap-1">
              {BODY_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={() => applyTemplate(tpl.fields)}
                  className="px-2 py-1 text-xs bg-neutral-700 border border-neutral-600 rounded text-neutral-400 hover:text-green-300 hover:border-green-500/50 transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            {bodyFields.map((field, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) => {
                    const updated = [...bodyFields]
                    updated[idx] = { ...updated[idx], key: e.target.value }
                    setBodyFields(updated)
                  }}
                  placeholder="field_name"
                  className="w-1/3 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
                <span className="text-neutral-500">=</span>
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => {
                    const updated = [...bodyFields]
                    updated[idx] = { ...updated[idx], value: e.target.value }
                    setBodyFields(updated)
                  }}
                  placeholder="output.field or 'literal'"
                  className="flex-1 px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 font-mono"
                />
                <button
                  onClick={() => setBodyFields(prev => prev.filter((_, i) => i !== idx))}
                  className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Preview */}
          {bodyFields.length > 0 && (
            <div className="p-3 bg-neutral-900 rounded text-xs font-mono text-neutral-400">
              <div className="text-neutral-500 mb-1">HCL preview:</div>
              <div className="text-green-300">response {'{'}</div>
              <div className="text-neutral-300">  status = {status}</div>
              {bodyFields.filter(f => f.key.trim()).map((f, i) => (
                <div key={i} className="text-neutral-300">
                  {'  '}{f.key} = "{f.value}"
                </div>
              ))}
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
