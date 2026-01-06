import { Plus, Trash2 } from 'lucide-react'
import type { GraphQLOperation } from '../../types'

const GRAPHQL_TYPES = ['query', 'mutation', 'subscription'] as const
type GraphQLType = typeof GRAPHQL_TYPES[number]

const TYPE_COLORS: Record<GraphQLType, string> = {
  query: 'bg-green-600',
  mutation: 'bg-blue-600',
  subscription: 'bg-purple-600',
}

const TYPE_LABELS: Record<GraphQLType, string> = {
  query: 'Query',
  mutation: 'Mutation',
  subscription: 'Subscription',
}

interface GraphQLOperationsEditorProps {
  operations: GraphQLOperation[]
  onChange: (operations: GraphQLOperation[]) => void
}

export default function GraphQLOperationsEditor({
  operations,
  onChange,
}: GraphQLOperationsEditorProps) {
  const addOperation = () => {
    const newOp: GraphQLOperation = {
      id: `op-${Date.now()}`,
      type: 'query',
      name: 'newOperation',
    }
    onChange([...operations, newOp])
  }

  const updateOperation = (id: string, updates: Partial<GraphQLOperation>) => {
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
          Operations
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
          No operations defined. Add Query, Mutation, or Subscription operations.
        </p>
      ) : (
        <div className="space-y-2">
          {operations.map((op) => (
            <div
              key={op.id}
              className="flex items-center gap-2 bg-neutral-800 rounded-md p-2"
            >
              <select
                value={op.type}
                onChange={(e) =>
                  updateOperation(op.id, { type: e.target.value as GraphQLType })
                }
                className={`${TYPE_COLORS[op.type as GraphQLType]} text-white text-xs font-medium px-2 py-1 rounded cursor-pointer border-0 appearance-none`}
                style={{ width: '100px' }}
              >
                {GRAPHQL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={op.name}
                onChange={(e) => updateOperation(op.id, { name: e.target.value })}
                placeholder="operationName"
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
