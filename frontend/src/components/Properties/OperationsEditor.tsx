import { Plus, Trash2 } from 'lucide-react'
import type { RestOperation, HttpMethod, ConnectorType } from '../../types'

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-green-600',
  POST: 'bg-blue-600',
  PUT: 'bg-amber-600',
  DELETE: 'bg-red-600',
  PATCH: 'bg-purple-600',
  HEAD: 'bg-neutral-600',
  OPTIONS: 'bg-neutral-600',
}

interface OperationsEditorProps {
  connectorType: ConnectorType
  operations: RestOperation[]
  onChange: (operations: RestOperation[]) => void
}

export default function OperationsEditor({
  connectorType,
  operations,
  onChange,
}: OperationsEditorProps) {
  if (connectorType !== 'rest') {
    return null
  }

  const addOperation = () => {
    const newOp: RestOperation = {
      id: `op-${Date.now()}`,
      method: 'GET',
      path: '/new-endpoint',
    }
    onChange([...operations, newOp])
  }

  const updateOperation = (id: string, updates: Partial<RestOperation>) => {
    onChange(
      operations.map((op) =>
        op.id === id ? { ...op, ...updates } : op
      )
    )
  }

  const removeOperation = (id: string) => {
    onChange(operations.filter((op) => op.id !== id))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-neutral-400">
          Endpoints
        </label>
        <button
          onClick={addOperation}
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {operations.length === 0 ? (
        <p className="text-xs text-neutral-500 italic">
          No endpoints defined. Add one to expose via this connector.
        </p>
      ) : (
        <div className="space-y-2">
          {operations.map((op) => (
            <div
              key={op.id}
              className="flex items-center gap-2 bg-neutral-800 rounded-md p-2"
            >
              <select
                value={op.method}
                onChange={(e) =>
                  updateOperation(op.id, { method: e.target.value as HttpMethod })
                }
                className={`${METHOD_COLORS[op.method]} text-white text-xs font-medium px-2 py-1 rounded cursor-pointer border-0 appearance-none`}
                style={{ width: '70px' }}
              >
                {HTTP_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={op.path}
                onChange={(e) => updateOperation(op.id, { path: e.target.value })}
                placeholder="/path"
                className="flex-1 px-2 py-1 text-sm bg-neutral-700 border-0 rounded text-white placeholder-neutral-500"
              />
              <button
                onClick={() => removeOperation(op.id)}
                className="text-neutral-500 hover:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
