import { useState, useCallback } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useStudioStore } from '../../stores/useStudioStore'
import type { ConnectorNodeData, FlowNodeData, FlowTo, ConnectorDirection, RestOperation, GraphQLOperation, ConnectorOperation, TypeNodeData, TypeFieldDefinition, ValidatorNodeData, TransformNodeData, AspectNodeData } from '../../types'
import OperationsEditor from './OperationsEditor'
import GraphQLOperationsEditor from './GraphQLOperationsEditor'
import { getConnector, type FieldDefinition } from '../../connectors'
import { getAllValidatorTypes, getValidatorType } from '../../validators'

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

// =============================================================================
// Type constraint options per base type
// =============================================================================

const baseTypeOptions = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'object', label: 'Object' },
  { value: 'array', label: 'Array' },
]

const formatOptions = [
  { value: '', label: 'None' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'uuid', label: 'UUID' },
  { value: 'date', label: 'Date (ISO)' },
  { value: 'datetime', label: 'DateTime (RFC3339)' },
  { value: 'phone', label: 'Phone' },
  { value: 'ip', label: 'IP Address' },
]

function TypeFieldEditor({
  name,
  field,
  validators,
  onUpdate,
  onRemove,
  onRename,
}: {
  name: string
  field: TypeFieldDefinition
  validators: string[]
  onUpdate: (field: TypeFieldDefinition) => void
  onRemove: () => void
  onRename: (newName: string) => void
}) {
  const inputClass = "w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-neutral-500"

  return (
    <div className="p-3 bg-neutral-800/50 rounded-md space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => onRename(e.target.value)}
          placeholder="field_name"
          className="flex-1 px-2 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-cyan-300 font-mono focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
        <select
          value={field.type}
          onChange={(e) => onUpdate({ ...field, type: e.target.value as TypeFieldDefinition['type'] })}
          className="px-2 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-white"
        >
          {baseTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={onRemove} className="text-red-500 hover:text-red-400 p-1">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer">
          <input
            type="checkbox"
            checked={field.required !== false}
            onChange={(e) => onUpdate({ ...field, required: e.target.checked ? undefined : false })}
            className="w-3.5 h-3.5 text-cyan-600 bg-neutral-800 border-neutral-600 rounded"
          />
          Required
        </label>
      </div>

      {/* String constraints */}
      {field.type === 'string' && (
        <div className="space-y-2 pl-2 border-l-2 border-neutral-700">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Format</label>
              <select
                value={field.format || ''}
                onChange={(e) => onUpdate({ ...field, format: e.target.value || undefined })}
                className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white"
              >
                {formatOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Validator</label>
              <select
                value={field.validate || ''}
                onChange={(e) => onUpdate({ ...field, validate: e.target.value || undefined })}
                className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white"
              >
                <option value="">None</option>
                {validators.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Min Length</label>
              <input
                type="number"
                value={field.minLength ?? ''}
                onChange={(e) => onUpdate({ ...field, minLength: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Max Length</label>
              <input
                type="number"
                value={field.maxLength ?? ''}
                onChange={(e) => onUpdate({ ...field, maxLength: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Pattern (regex)</label>
            <input
              type="text"
              value={field.pattern || ''}
              onChange={(e) => onUpdate({ ...field, pattern: e.target.value || undefined })}
              placeholder="^[a-zA-Z]+$"
              className={inputClass + ' text-xs font-mono'}
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Enum (comma-separated)</label>
            <input
              type="text"
              value={field.enum?.join(', ') || ''}
              onChange={(e) => {
                const val = e.target.value.trim()
                onUpdate({ ...field, enum: val ? val.split(',').map(s => s.trim()) : undefined })
              }}
              placeholder="admin, user, guest"
              className={inputClass + ' text-xs'}
            />
          </div>
        </div>
      )}

      {/* Number constraints */}
      {field.type === 'number' && (
        <div className="space-y-2 pl-2 border-l-2 border-neutral-700">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Min</label>
              <input
                type="number"
                value={field.min ?? ''}
                onChange={(e) => onUpdate({ ...field, min: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Max</label>
              <input
                type="number"
                value={field.max ?? ''}
                onChange={(e) => onUpdate({ ...field, max: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TypeProperties({
  data,
  onChange,
}: {
  data: TypeNodeData
  onChange: (data: Partial<TypeNodeData>) => void
}) {
  const { nodes } = useStudioStore()

  // Get validator names from canvas
  const validatorNames = nodes
    .filter(n => n.type === 'validator')
    .map(n => (n.data as ValidatorNodeData).label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))

  const fields = data.fields || {}

  const updateField = (name: string, field: TypeFieldDefinition) => {
    onChange({ fields: { ...fields, [name]: field } })
  }

  const removeField = (name: string) => {
    const newFields = { ...fields }
    delete newFields[name]
    onChange({ fields: newFields })
  }

  const renameField = (oldName: string, newName: string) => {
    if (!newName || newName === oldName) return
    const clean = newName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    if (!clean || clean in fields) return
    const newFields: Record<string, TypeFieldDefinition> = {}
    for (const [k, v] of Object.entries(fields)) {
      newFields[k === oldName ? clean : k] = v
    }
    onChange({ fields: newFields })
  }

  const addField = () => {
    let name = 'new_field'
    let i = 1
    while (name in fields) { name = `new_field_${i++}` }
    onChange({ fields: { ...fields, [name]: { type: 'string' } } })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Name</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-neutral-400">Fields</label>
          <button
            onClick={addField}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
          >
            <Plus className="w-3 h-3" /> Add Field
          </button>
        </div>

        <div className="space-y-2">
          {Object.entries(fields).map(([name, field]) => (
            <TypeFieldEditor
              key={name}
              name={name}
              field={field}
              validators={validatorNames}
              onUpdate={(f) => updateField(name, f)}
              onRemove={() => removeField(name)}
              onRename={(newName) => renameField(name, newName)}
            />
          ))}

          {Object.keys(fields).length === 0 && (
            <div className="text-xs text-neutral-500 text-center py-4 border border-dashed border-neutral-700 rounded">
              No fields defined. Click "Add Field" to start.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ValidatorProperties({
  data,
  onChange,
}: {
  data: ValidatorNodeData
  onChange: (data: Partial<ValidatorNodeData>) => void
}) {
  const allTypes = getAllValidatorTypes()
  const currentType = getValidatorType(data.validatorType)
  const inputClass = "w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-neutral-500"

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Name</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Validator Type</label>
        <div className="grid grid-cols-3 gap-1">
          {allTypes.map(vt => {
            const Icon = vt.icon
            const isActive = data.validatorType === vt.type
            return (
              <button
                key={vt.type}
                onClick={() => onChange({ validatorType: vt.type as ValidatorNodeData['validatorType'] })}
                className={`flex flex-col items-center gap-1 p-2 rounded-md border text-xs transition-colors ${
                  isActive
                    ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                    : 'border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {vt.label}
              </button>
            )
          })}
        </div>
        {currentType && (
          <p className="text-xs text-neutral-500 mt-1">{currentType.description}</p>
        )}
      </div>

      {/* Type-specific fields from registry */}
      {currentType?.fields.map(field => (
        <div key={field.key}>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          {field.type === 'text' ? (
            <textarea
              value={String((data as Record<string, unknown>)[field.key] || '')}
              onChange={(e) => onChange({ [field.key]: e.target.value || undefined } as Partial<ValidatorNodeData>)}
              placeholder={field.placeholder}
              rows={3}
              className={inputClass + (field.mono ? ' font-mono' : '') + ' resize-y'}
            />
          ) : (
            <input
              type="text"
              value={String((data as Record<string, unknown>)[field.key] || '')}
              onChange={(e) => onChange({ [field.key]: e.target.value || undefined } as Partial<ValidatorNodeData>)}
              placeholder={field.placeholder}
              className={inputClass + (field.mono ? ' font-mono' : '')}
            />
          )}
          {field.helpText && <p className="text-xs text-neutral-500 mt-1">{field.helpText}</p>}
        </div>
      ))}

      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">
          Error Message <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={data.message || ''}
          onChange={(e) => onChange({ message: e.target.value })}
          placeholder="Invalid value"
          className={inputClass}
        />
        <p className="text-xs text-neutral-500 mt-1">Shown when validation fails</p>
      </div>
    </div>
  )
}

function TransformProperties({
  data,
  onChange,
}: {
  data: TransformNodeData
  onChange: (data: Partial<TransformNodeData>) => void
}) {
  const fields = data.fields || {}
  const inputClass = "w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white placeholder-neutral-500"

  const updateField = (key: string, value: string) => {
    onChange({ fields: { ...fields, [key]: value } })
  }

  const removeField = (key: string) => {
    const newFields = { ...fields }
    delete newFields[key]
    onChange({ fields: newFields })
  }

  const renameField = (oldKey: string, newKey: string) => {
    if (!newKey || newKey === oldKey) return
    const clean = newKey.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    if (!clean || clean in fields) return
    const newFields: Record<string, string> = {}
    for (const [k, v] of Object.entries(fields)) {
      newFields[k === oldKey ? clean : k] = v
    }
    onChange({ fields: newFields })
  }

  const addField = () => {
    let name = 'field'
    let i = 1
    while (name in fields) { name = `field_${i++}` }
    onChange({ fields: { ...fields, [name]: '' } })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Name</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className={inputClass}
        />
        <p className="text-xs text-neutral-500 mt-1">Reference in flows with <code className="text-amber-400">use = [transform.{'{name}'}]</code></p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-neutral-400">Field Mappings (CEL)</label>
          <button onClick={addField} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(fields).map(([key, expr]) => (
            <div key={key} className="flex items-center gap-1">
              <input
                type="text"
                value={key}
                onChange={(e) => renameField(key, e.target.value)}
                className="w-28 px-2 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded text-amber-300 font-mono focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <span className="text-neutral-500 text-xs">=</span>
              <input
                type="text"
                value={expr}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder="CEL expression"
                className="flex-1 px-2 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded text-white font-mono placeholder-neutral-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <button onClick={() => removeField(key)} className="text-red-500 hover:text-red-400 p-0.5">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {Object.keys(fields).length === 0 && (
            <div className="text-xs text-neutral-500 text-center py-3 border border-dashed border-neutral-700 rounded">
              No mappings. Click "Add" to define fields.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const aspectWhenOptions = [
  { value: 'before', label: 'Before', description: 'Run before the flow executes' },
  { value: 'after', label: 'After', description: 'Run after the flow completes successfully' },
  { value: 'around', label: 'Around', description: 'Wrap the flow (e.g., caching)' },
  { value: 'on_error', label: 'On Error', description: 'Run when the flow fails' },
]

function AspectProperties({
  data,
  onChange,
}: {
  data: AspectNodeData
  onChange: (data: Partial<AspectNodeData>) => void
}) {
  const inputClass = "w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"

  const patterns = data.on || []

  const updatePattern = (index: number, value: string) => {
    const newPatterns = [...patterns]
    newPatterns[index] = value
    onChange({ on: newPatterns })
  }

  const addPattern = () => onChange({ on: [...patterns, '**/*.hcl'] })

  const removePattern = (index: number) => {
    onChange({ on: patterns.filter((_, i) => i !== index) })
  }

  // Action section
  const action = data.action || { connector: '', target: '' }
  const hasAction = !!data.action

  const updateAction = (updates: Partial<typeof action>) => {
    onChange({ action: { ...action, ...updates } })
  }

  // Action transform fields
  const actionFields = data.action?.transform || {}

  const updateActionField = (key: string, value: string) => {
    updateAction({ transform: { ...actionFields, [key]: value } })
  }

  const removeActionField = (key: string) => {
    const newFields = { ...actionFields }
    delete newFields[key]
    updateAction({ transform: newFields })
  }

  const addActionField = () => {
    let name = 'field'
    let i = 1
    while (name in actionFields) { name = `field_${i++}` }
    updateAction({ transform: { ...actionFields, [name]: '' } })
  }

  // Invalidation section
  const invalidate = data.invalidate
  const hasInvalidation = !!invalidate

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Name</label>
        <input type="text" value={data.label} onChange={(e) => onChange({ label: e.target.value })} className={inputClass} />
      </div>

      {/* When */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">When</label>
        <div className="grid grid-cols-2 gap-1">
          {aspectWhenOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ when: opt.value as AspectNodeData['when'] })}
              className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                data.when === opt.value
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                  : 'border-neutral-700 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-500 mt-1">
          {aspectWhenOptions.find(o => o.value === data.when)?.description}
        </p>
      </div>

      {/* Flow Patterns (on) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-neutral-400">Match Flows (glob patterns)</label>
          <button onClick={addPattern} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="space-y-1">
          {patterns.map((pattern, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                type="text"
                value={pattern}
                onChange={(e) => updatePattern(i, e.target.value)}
                placeholder="**/create_*.hcl"
                className="flex-1 px-2 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded text-white font-mono placeholder-neutral-500"
              />
              <button onClick={() => removePattern(i)} className="text-red-500 hover:text-red-400 p-0.5">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {patterns.length === 0 && (
            <p className="text-xs text-neutral-500 italic">No patterns. Aspect won't match any flows.</p>
          )}
        </div>
      </div>

      {/* Condition */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Condition (optional CEL)</label>
        <input
          type="text"
          value={data.condition || ''}
          onChange={(e) => onChange({ condition: e.target.value || undefined })}
          placeholder='result.affected > 0'
          className={inputClass + ' font-mono'}
        />
      </div>

      {/* Priority */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Priority (optional)</label>
        <input
          type="number"
          value={data.priority ?? ''}
          onChange={(e) => onChange({ priority: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="0 (lower = first)"
          className={inputClass}
        />
      </div>

      {/* Action (for before/after/on_error) */}
      {data.when !== 'around' && (
        <div className="p-3 bg-neutral-800/50 rounded-md space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-400">Action</label>
            {!hasAction ? (
              <button onClick={() => onChange({ action: { connector: '', target: '' } })} className="text-xs text-blue-400 hover:text-blue-300">
                + Add Action
              </button>
            ) : (
              <button onClick={() => onChange({ action: undefined })} className="text-xs text-red-400 hover:text-red-300">
                Remove
              </button>
            )}
          </div>
          {hasAction && (
            <div className="space-y-2">
              <input type="text" value={action.connector} onChange={(e) => updateAction({ connector: e.target.value })} placeholder="connector_name" className={inputClass + ' text-xs'} />
              <input type="text" value={action.target} onChange={(e) => updateAction({ target: e.target.value })} placeholder="target (table, operation)" className={inputClass + ' text-xs'} />
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-medium text-neutral-500">Transform</label>
                <button onClick={addActionField} className="text-[10px] text-amber-400 hover:text-amber-300">+ Add</button>
              </div>
              {Object.entries(actionFields).map(([key, expr]) => (
                <div key={key} className="flex items-center gap-1">
                  <input type="text" value={key} onChange={(e) => {
                    const newKey = e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                    if (newKey && !(newKey in actionFields)) {
                      const nf: Record<string, string> = {}
                      for (const [k, v] of Object.entries(actionFields)) { nf[k === key ? newKey : k] = v }
                      updateAction({ transform: nf })
                    }
                  }} className="w-24 px-1.5 py-1 text-[11px] bg-neutral-800 border border-neutral-700 rounded text-amber-300 font-mono" />
                  <span className="text-neutral-600 text-[10px]">=</span>
                  <input type="text" value={expr} onChange={(e) => updateActionField(key, e.target.value)} placeholder="CEL" className="flex-1 px-1.5 py-1 text-[11px] bg-neutral-800 border border-neutral-700 rounded text-white font-mono placeholder-neutral-500" />
                  <button onClick={() => removeActionField(key)} className="text-red-500 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cache (for around) */}
      {data.when === 'around' && (
        <div className="p-3 bg-neutral-800/50 rounded-md space-y-2">
          <label className="text-xs font-medium text-neutral-400">Cache</label>
          <input type="text" value={data.cache?.storage || ''} onChange={(e) => onChange({ cache: { storage: e.target.value, key: data.cache?.key || '', ttl: data.cache?.ttl || '5m' } })} placeholder="storage (cache connector)" className={inputClass + ' text-xs'} />
          <input type="text" value={data.cache?.key || ''} onChange={(e) => onChange({ cache: { ...data.cache!, key: e.target.value } })} placeholder="cache key expression" className={inputClass + ' text-xs font-mono'} />
          <input type="text" value={data.cache?.ttl || ''} onChange={(e) => onChange({ cache: { ...data.cache!, ttl: e.target.value } })} placeholder="TTL (e.g., 10m)" className={inputClass + ' text-xs font-mono'} />
        </div>
      )}

      {/* Invalidation (for after) */}
      {(data.when === 'after') && (
        <div className="p-3 bg-neutral-800/50 rounded-md space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-400">Invalidation</label>
            {!hasInvalidation ? (
              <button onClick={() => onChange({ invalidate: { storage: '' } })} className="text-xs text-orange-400 hover:text-orange-300">
                + Add
              </button>
            ) : (
              <button onClick={() => onChange({ invalidate: undefined })} className="text-xs text-red-400 hover:text-red-300">
                Remove
              </button>
            )}
          </div>
          {hasInvalidation && (
            <div className="space-y-2">
              <input type="text" value={invalidate!.storage || ''} onChange={(e) => onChange({ invalidate: { ...invalidate!, storage: e.target.value } })} placeholder="storage (cache connector)" className={inputClass + ' text-xs'} />
              <input type="text" value={invalidate!.keys?.join(', ') || ''} onChange={(e) => {
                const val = e.target.value.trim()
                onChange({ invalidate: { ...invalidate!, keys: val ? val.split(',').map(s => s.trim()) : undefined } })
              }} placeholder="keys (comma-separated)" className={inputClass + ' text-xs font-mono'} />
              <input type="text" value={invalidate!.patterns?.join(', ') || ''} onChange={(e) => {
                const val = e.target.value.trim()
                onChange({ invalidate: { ...invalidate!, patterns: val ? val.split(',').map(s => s.trim()) : undefined } })
              }} placeholder="patterns (comma-separated globs)" className={inputClass + ' text-xs font-mono'} />
            </div>
          )}
        </div>
      )}
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

      {selectedNode.type === 'connector' && (
        <ConnectorProperties
          data={selectedNode.data as ConnectorNodeData}
          onChange={handleChange}
        />
      )}
      {selectedNode.type === 'flow' && (
        <FlowProperties
          data={selectedNode.data as FlowNodeData}
          nodeId={selectedNode.id}
          onChange={handleChange}
        />
      )}
      {selectedNode.type === 'type' && (
        <TypeProperties
          data={selectedNode.data as TypeNodeData}
          onChange={handleChange}
        />
      )}
      {selectedNode.type === 'validator' && (
        <ValidatorProperties
          data={selectedNode.data as ValidatorNodeData}
          onChange={handleChange}
        />
      )}
      {selectedNode.type === 'transform' && (
        <TransformProperties
          data={selectedNode.data as TransformNodeData}
          onChange={handleChange}
        />
      )}
      {selectedNode.type === 'aspect' && (
        <AspectProperties
          data={selectedNode.data as AspectNodeData}
          onChange={handleChange}
        />
      )}
    </div>
  )
}
