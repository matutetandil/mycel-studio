import { useState, useCallback } from 'react'
import { GripVertical } from 'lucide-react'
import { useStudioStore } from '../../stores/useStudioStore'
import type { ConnectorNodeData, FlowNodeData, FlowTo, ConnectorDirection, RestOperation, GraphQLOperation, ConnectorOperation } from '../../types'
import OperationsEditor from './OperationsEditor'
import GraphQLOperationsEditor from './GraphQLOperationsEditor'
import { getConnector, type FieldDefinition } from '../../connectors'

const directionOptions: { value: ConnectorDirection; label: string; description: string }[] = [
  { value: 'input', label: 'Source', description: 'Triggers flows (e.g., API server, queue consumer)' },
  { value: 'output', label: 'Target', description: 'Receives data (e.g., database, queue publisher)' },
  { value: 'bidirectional', label: 'Both', description: 'Can be source or target' },
]

// Generic field renderer for connector properties
function FieldRenderer({
  field,
  value,
  config,
  onChange,
}: {
  field: FieldDefinition
  value: unknown
  config: Record<string, unknown>
  onChange: (key: string, val: unknown) => void
}) {
  const inputClass = "w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"

  // Check visibility condition
  if (field.visibleWhen) {
    const depValue = config[field.visibleWhen.field]
    const allowed = Array.isArray(field.visibleWhen.value)
      ? field.visibleWhen.value.includes(String(depValue))
      : String(depValue) === field.visibleWhen.value
    if (!allowed) return null
  }

  switch (field.type) {
    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`field-${field.key}`}
            checked={Boolean(value)}
            onChange={(e) => onChange(field.key, e.target.checked || undefined)}
            className="w-4 h-4 text-indigo-600 bg-neutral-800 border-neutral-600 rounded focus:ring-indigo-500"
          />
          <label htmlFor={`field-${field.key}`} className="text-sm text-neutral-300">
            {field.label}
          </label>
        </div>
      )

    case 'select':
      return (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">{field.label}</label>
          <select
            value={String(value || '')}
            onChange={(e) => onChange(field.key, e.target.value || undefined)}
            className={inputClass}
          >
            {!field.required && <option value="">Select...</option>}
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {field.helpText && <p className="text-xs text-neutral-500 mt-1">{field.helpText}</p>}
        </div>
      )

    case 'number':
      return (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">{field.label}</label>
          <input
            type="number"
            value={value != null ? String(value) : ''}
            onChange={(e) => onChange(field.key, e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder={field.placeholder}
            className={inputClass}
          />
          {field.helpText && <p className="text-xs text-neutral-500 mt-1">{field.helpText}</p>}
        </div>
      )

    case 'password':
      return (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">{field.label}</label>
          <input
            type="password"
            value={String(value || '')}
            onChange={(e) => onChange(field.key, e.target.value || undefined)}
            placeholder={field.placeholder || '••••••••'}
            className={inputClass}
          />
          {field.helpText && <p className="text-xs text-neutral-500 mt-1">{field.helpText}</p>}
        </div>
      )

    case 'text':
      return (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">{field.label}</label>
          <textarea
            value={String(value || '')}
            onChange={(e) => onChange(field.key, e.target.value || undefined)}
            placeholder={field.placeholder}
            rows={3}
            className={inputClass + ' resize-y'}
          />
          {field.helpText && <p className="text-xs text-neutral-500 mt-1">{field.helpText}</p>}
        </div>
      )

    default: // string
      return (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">{field.label}</label>
          <input
            type="text"
            value={String(value || '')}
            onChange={(e) => onChange(field.key, e.target.value || undefined)}
            placeholder={field.placeholder}
            className={inputClass}
          />
          {field.helpText && <p className="text-xs text-neutral-500 mt-1">{field.helpText}</p>}
        </div>
      )
  }
}

function ConnectorProperties({
  data,
  onChange,
}: {
  data: ConnectorNodeData
  onChange: (data: Partial<ConnectorNodeData>) => void
}) {
  const def = getConnector(data.connectorType)
  const config = data.config || {}

  const handleFieldChange = (key: string, value: unknown) => {
    // Special handling for CORS (REST) — preserve complex object
    if (key === 'cors') {
      onChange({ config: { ...config, cors: value ? { origins: ['*'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] } : undefined } })
      return
    }
    onChange({ config: { ...config, [key]: value } })
  }

  // Get current driver's additional fields
  const currentDriver = config.driver as string | undefined
  const driverDef = def?.drivers?.find(d => d.value === currentDriver)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Name</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
        />
      </div>

      {/* Direction */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Direction</label>
        <select
          value={data.direction || 'bidirectional'}
          onChange={(e) => onChange({ direction: e.target.value as ConnectorDirection })}
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
        >
          {directionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-500 mt-1">
          {directionOptions.find((o) => o.value === (data.direction || 'bidirectional'))?.description}
        </p>
      </div>

      {/* Driver selector (if connector has drivers) */}
      {def?.drivers && def.drivers.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Driver</label>
          <select
            value={currentDriver || ''}
            onChange={(e) => onChange({ config: { ...config, driver: e.target.value || undefined } })}
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
          >
            <option value="">Select driver...</option>
            {def.drivers.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Common fields from definition */}
      {def?.fields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={config[field.key]}
          config={config}
          onChange={handleFieldChange}
        />
      ))}

      {/* Driver-specific fields */}
      {driverDef?.fields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={config[field.key]}
          config={config}
          onChange={handleFieldChange}
        />
      ))}

      {/* Operations editor for REST */}
      {data.connectorType === 'rest' && (
        <OperationsEditor
          connectorType={data.connectorType}
          operations={(data.operations || []) as RestOperation[]}
          onChange={(operations) => onChange({ operations })}
        />
      )}

      {/* Operations editor for GraphQL */}
      {data.connectorType === 'graphql' && (
        <GraphQLOperationsEditor
          operations={(data.operations || []) as GraphQLOperation[]}
          onChange={(operations) => onChange({ operations })}
        />
      )}
    </div>
  )
}

function FlowProperties({
  data,
  nodeId,
  onChange,
}: {
  data: FlowNodeData
  nodeId: string
  onChange: (data: Partial<FlowNodeData>) => void
}) {
  const { nodes, edges } = useStudioStore()

  // Find connected connectors
  const incomingEdge = edges.find((e) => e.target === nodeId)
  const outgoingEdges = edges.filter((e) => e.source === nodeId)

  const sourceConnector = incomingEdge
    ? nodes.find((n) => n.id === incomingEdge.source && n.type === 'connector')
    : null

  const sourceData = sourceConnector?.data as ConnectorNodeData | undefined

  // Get operations from source connector
  const sourceOperations = (sourceData?.operations as ConnectorOperation[]) || []

  // Get current values
  const fromOperation = data.from?.operation || ''
  const fromFilter = typeof data.from?.filter === 'string' ? data.from.filter : (data.from?.filter as { condition?: string } | undefined)?.condition || ''

  // Multi-to support
  const toTargets: FlowTo[] = data.to
    ? Array.isArray(data.to)
      ? data.to
      : [data.to]
    : []

  // Format operation display based on type
  const formatOperation = (op: ConnectorOperation): string => {
    if ('method' in op && 'path' in op) {
      return `${op.method} ${op.path}`
    } else if ('type' in op && 'name' in op) {
      return `${op.type}.${op.name}`
    }
    return op.id
  }

  const updateToTarget = (index: number, updates: Partial<FlowTo>) => {
    const newTargets = [...toTargets]
    newTargets[index] = { ...newTargets[index], ...updates }
    onChange({ to: newTargets.length === 1 ? newTargets[0] : newTargets })
  }

  const addToTarget = () => {
    const newTargets = [...toTargets, { connector: '', target: '' }]
    onChange({ to: newTargets })
  }

  const removeToTarget = (index: number) => {
    const newTargets = toTargets.filter((_, i) => i !== index)
    onChange({ to: newTargets.length === 1 ? newTargets[0] : newTargets.length === 0 ? undefined : newTargets })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Name</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
        />
      </div>

      {/* Source (From) */}
      <div className="p-3 bg-neutral-800/50 rounded-md space-y-3">
        <div className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
          <span className="font-medium">FROM</span>
          {sourceData ? (
            <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs">
              {sourceData.label} ({sourceData.connectorType})
            </span>
          ) : (
            <span className="text-amber-500 italic">Not connected</span>
          )}
        </div>

        {sourceOperations.length > 0 ? (
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Operation</label>
            <select
              value={fromOperation}
              onChange={(e) => onChange({ from: { ...data.from, connector: sourceData?.label.toLowerCase().replace(/\s+/g, '_') || '', operation: e.target.value } })}
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
            >
              <option value="">Select operation...</option>
              {sourceOperations.map((op) => (
                <option key={op.id} value={formatOperation(op)}>
                  {formatOperation(op)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Operation</label>
            <input
              type="text"
              value={fromOperation}
              onChange={(e) => onChange({ from: { ...data.from, connector: sourceData?.label.toLowerCase().replace(/\s+/g, '_') || '', operation: e.target.value } })}
              placeholder={
                sourceData?.connectorType === 'rest'
                  ? 'GET /users (define on connector)'
                  : sourceData?.connectorType === 'graphql'
                  ? 'Query.users (define on connector)'
                  : sourceData?.connectorType === 'grpc'
                  ? 'GetUser'
                  : 'operation'
              }
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
        )}

        {/* Filter */}
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Filter (CEL, optional)</label>
          <input
            type="text"
            value={fromFilter}
            onChange={(e) => {
              const filter = e.target.value || undefined
              onChange({ from: { ...data.from, connector: data.from?.connector || '', operation: data.from?.operation || '', filter } })
            }}
            placeholder="input.status != 'internal'"
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500 font-mono"
          />
          <p className="text-xs text-neutral-500 mt-1">Skip events where condition is false</p>
        </div>
      </div>

      {/* Targets (To) - Multi-to support */}
      {toTargets.map((to, idx) => {
        const targetConnector = outgoingEdges[idx]
          ? nodes.find((n) => n.id === outgoingEdges[idx].target && n.type === 'connector')
          : null
        const targetData = targetConnector?.data as ConnectorNodeData | undefined

        return (
          <div key={idx} className="p-3 bg-neutral-800/50 rounded-md space-y-3">
            <div className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
              <span className="font-medium">TO {toTargets.length > 1 ? `#${idx + 1}` : ''}</span>
              {targetData ? (
                <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs">
                  {targetData.label} ({targetData.connectorType})
                </span>
              ) : (
                to.connector ? (
                  <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs">
                    {to.connector}
                  </span>
                ) : (
                  <span className="text-amber-500 italic">Not connected</span>
                )
              )}
              {toTargets.length > 1 && (
                <button
                  onClick={() => removeToTarget(idx)}
                  className="ml-auto text-xs text-red-500 hover:text-red-400"
                >
                  Remove
                </button>
              )}
            </div>

            {!targetData && (
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Connector</label>
                <input
                  type="text"
                  value={to.connector}
                  onChange={(e) => updateToTarget(idx, { connector: e.target.value })}
                  placeholder="connector_name"
                  className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                {targetData?.connectorType === 'database' ? 'Table/Collection' : 'Target'}
              </label>
              <input
                type="text"
                value={to.target || ''}
                onChange={(e) => updateToTarget(idx, { connector: targetData?.label.toLowerCase().replace(/\s+/g, '_') || to.connector || '', target: e.target.value })}
                placeholder={targetData?.connectorType === 'database' ? 'users' : 'target'}
                className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
              />
            </div>

            {/* Per-to condition (for multi-to) */}
            {toTargets.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Condition (optional)</label>
                <input
                  type="text"
                  value={to.when || ''}
                  onChange={(e) => updateToTarget(idx, { when: e.target.value || undefined })}
                  placeholder="input.amount > 500"
                  className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500 font-mono"
                />
              </div>
            )}
          </div>
        )
      })}

      {/* Add target button */}
      <button
        onClick={addToTarget}
        className="w-full px-3 py-2 text-xs text-blue-400 hover:text-blue-300 border border-dashed border-neutral-700 hover:border-blue-500/50 rounded-md transition-colors"
      >
        + Add Target
      </button>

      {/* Schedule */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Schedule (cron)</label>
        <input
          type="text"
          value={data.when || ''}
          onChange={(e) => onChange({ when: e.target.value || undefined })}
          placeholder="0 * * * * or @every 5m"
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
        />
      </div>
    </div>
  )
}

function ServiceProperties() {
  const { serviceConfig, updateServiceConfig } = useStudioStore()

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
        Service
      </h2>
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Name</label>
        <input
          type="text"
          value={serviceConfig.name}
          onChange={(e) => updateServiceConfig({ name: e.target.value })}
          placeholder="my-service"
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
        />
        <p className="text-xs text-neutral-500 mt-1">Shown in /health, metrics, and logs</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Version</label>
        <input
          type="text"
          value={serviceConfig.version}
          onChange={(e) => updateServiceConfig({ version: e.target.value })}
          placeholder="1.0.0"
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
        />
      </div>
      <div className="pt-2 border-t border-neutral-800">
        <p className="text-xs text-neutral-500">Select a node to edit its properties</p>
      </div>
    </div>
  )
}

export default function Properties() {
  const { nodes, selectedNodeId, updateNode, removeNode } = useStudioStore()
  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const [width, setWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const startX = e.clientX
    const startWidth = width

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth - (e.clientX - startX)
      setWidth(Math.max(200, Math.min(500, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [width])

  if (!selectedNode) {
    return (
      <div style={{ width }} className="bg-neutral-900 border-l border-neutral-800 p-4 relative">
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-indigo-500/50 transition-colors flex items-center"
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="w-3 h-3 text-neutral-600 -ml-1" />
        </div>
        <ServiceProperties />
      </div>
    )
  }

  const handleChange = (data: Partial<ConnectorNodeData | FlowNodeData>) => {
    updateNode(selectedNode.id, data)
  }

  return (
    <div
      style={{ width }}
      className={`bg-neutral-900 border-l border-neutral-800 p-4 overflow-y-auto relative ${isResizing ? 'select-none' : ''}`}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-indigo-500/50 transition-colors flex items-center"
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="w-3 h-3 text-neutral-600 -ml-1" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Properties
        </h2>
        <button
          onClick={() => removeNode(selectedNode.id)}
          className="text-xs text-red-500 hover:text-red-400"
        >
          Delete
        </button>
      </div>

      {selectedNode.type === 'connector' ? (
        <ConnectorProperties
          data={selectedNode.data as ConnectorNodeData}
          onChange={handleChange}
        />
      ) : (
        <FlowProperties
          data={selectedNode.data as FlowNodeData}
          nodeId={selectedNode.id}
          onChange={handleChange}
        />
      )}
    </div>
  )
}
