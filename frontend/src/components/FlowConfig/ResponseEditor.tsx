import { useState, useCallback, useEffect } from 'react'
import { X, MessageSquare, Info } from 'lucide-react'
import type { FlowResponse } from '../../types'
import MiniEditor from './MiniEditor'

interface ResponseEditorProps {
  isOpen: boolean
  response?: FlowResponse
  isEchoFlow?: boolean
  onSave: (response: FlowResponse | undefined) => void
  onClose: () => void
}

const TEMPLATES: Array<{ label: string; code: string }> = [
  {
    label: 'Pass through output',
    code: 'id         = "output.id"\nemail      = "output.email"\nname       = "output.name"',
  },
  {
    label: 'Normalize output',
    code: 'id         = "output.id"\nemail      = "lower(output.email)"\ncreated_at = "output.created_at"',
  },
  {
    label: 'Echo with metadata',
    code: 'id         = "uuid()"\nemail      = "lower(input.email)"\ncreated_at = "now()"',
  },
  {
    label: 'From steps',
    code: 'id       = "step.order.id"\nstatus   = "step.order.status"\ncustomer = "step.customer"',
  },
]

const CEL_PATTERNS = [
  'output.field', 'input.field', 'step.name.field',
  'lower()', 'upper()', 'uuid()', 'now()',
  'output.first + " " + output.last',
]

function fieldsToCode(fields: Record<string, string>): string {
  const entries = Object.entries(fields)
  if (entries.length === 0) return ''
  const maxKeyLen = Math.max(...entries.map(([k]) => k.length), 0)
  return entries
    .map(([k, v]) => `${k.padEnd(maxKeyLen)} = "${v}"`)
    .join('\n')
}

function codeToFields(code: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of code.split('\n')) {
    if (!line.includes('=')) continue
    const eqIdx = line.indexOf('=')
    const key = line.substring(0, eqIdx).trim()
    let value = line.substring(eqIdx + 1).trim()
    // Strip surrounding quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }
    if (key) result[key] = value
  }
  return result
}

export default function ResponseEditor({
  isOpen,
  response,
  isEchoFlow,
  onSave,
  onClose,
}: ResponseEditorProps) {
  const [code, setCode] = useState('')
  const [httpStatusCode, setHttpStatusCode] = useState('')
  const [grpcStatusCode, setGrpcStatusCode] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (response) {
        setCode(fieldsToCode(response.fields || {}))
        setHttpStatusCode(response.httpStatusCode || '')
        setGrpcStatusCode(response.grpcStatusCode || '')
      } else {
        setCode('')
        setHttpStatusCode('')
        setGrpcStatusCode('')
      }
    }
  }, [response, isOpen])

  const handleSave = useCallback(() => {
    const fields = codeToFields(code)

    if (Object.keys(fields).length === 0 && !httpStatusCode && !grpcStatusCode) {
      onSave(undefined)
    } else {
      onSave({
        fields,
        httpStatusCode: httpStatusCode || undefined,
        grpcStatusCode: grpcStatusCode || undefined,
      })
    }
    onClose()
  }, [code, httpStatusCode, grpcStatusCode, onSave, onClose])

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
            <MessageSquare className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-neutral-200">Response Transform</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200 transition-colors">
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

          {/* Templates */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-400">Templates</label>
            <div className="flex flex-wrap gap-1">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={() => setCode(tpl.code)}
                  className="px-2 py-1 text-xs bg-neutral-700 border border-neutral-600 rounded text-neutral-400 hover:text-green-300 hover:border-green-500/50 transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Monaco editor for response fields */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Field Mappings (CEL)</label>
            <MiniEditor
              value={code}
              onChange={setCode}
              language="hcl"
              height="180px"
              placeholder={isEchoFlow
                ? 'id         = uuid()\nemail      = lower(input.email)\ncreated_at = now()'
                : 'id         = output.id\nemail      = lower(output.email)\ncreated_at = output.created_at'}
            />
            <p className="text-xs text-neutral-500">
              Format: <code className="bg-neutral-700 px-1 rounded">field_name = CEL expression</code> — one per line (quotes added automatically)
            </p>
          </div>

          {/* CEL patterns helper */}
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Available variables:</label>
            <div className="flex flex-wrap gap-1">
              {CEL_PATTERNS.map((p) => (
                <span key={p} className="px-1.5 py-0.5 text-xs bg-neutral-700/50 border border-neutral-600/50 rounded text-neutral-500 font-mono">
                  {p}
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
                <div className="flex gap-1">
                  {['200', '201', '202', '204'].map(s => (
                    <button key={s} onClick={() => setHttpStatusCode(s)}
                      className={`px-2 py-0.5 text-xs rounded ${httpStatusCode === s ? 'bg-green-500/20 text-green-300 border border-green-500/50' : 'bg-neutral-700 text-neutral-400 border border-neutral-600 hover:text-neutral-200'}`}>
                      {s}
                    </button>
                  ))}
                </div>
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

          {/* Live HCL preview */}
          {code.trim() && (() => {
            const lines = code.split('\n').filter(l => l.trim())
            const parsed = lines.map(l => {
              const eq = l.indexOf('=')
              if (eq === -1) return { key: l.trim(), value: '' }
              return { key: l.substring(0, eq).trim(), value: l.substring(eq + 1).trim() }
            })
            // Wrap values in quotes for HCL
            const withQuotes = parsed.map(p => ({ ...p, value: p.value ? `"${p.value}"` : '' }))
            if (httpStatusCode) withQuotes.push({ key: 'http_status_code', value: `"${httpStatusCode}"` })
            if (grpcStatusCode) withQuotes.push({ key: 'grpc_status_code', value: `"${grpcStatusCode}"` })
            const maxKey = Math.max(...withQuotes.map(p => p.key.length), 0)
            return (
              <div className="p-3 bg-neutral-900 rounded text-xs font-mono text-neutral-400">
                <div className="text-neutral-500 mb-1">HCL preview:</div>
                <pre className="text-green-300">{'response {\n'}{withQuotes.map((p, i) =>
                  <span key={i} className="text-neutral-300">{'  '}{p.key.padEnd(maxKey)}{p.value ? ` = ${p.value}` : ''}{'\n'}</span>
                )}<span className="text-green-300">{'}'}</span></pre>
              </div>
            )
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-700">
          <button onClick={handleClear} className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors">
            Clear Response
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded text-sm text-neutral-200 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-sm text-white font-medium transition-colors">
              Save Response
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
