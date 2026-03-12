import { useState, useCallback } from 'react'
import { GripVertical, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useStudioStore } from '../../stores/useStudioStore'
import type { ConnectorNodeData, FlowNodeData, FlowTo, ConnectorDirection, RestOperation, GraphQLOperation, ConnectorOperation, TypeNodeData, TypeFieldDefinition, ValidatorNodeData, TransformNodeData, AspectNodeData, SagaNodeData, SagaStep, SagaAction, StateMachineNodeData, StateMachineState, StateMachineTransition, AuthConfig, AuthPreset, JwtAlgorithm, MfaRequirement, MfaMethod, AuthSocialProvider, EnvVariable, SecuritySanitizer, PluginDefinition } from '../../types'
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

      {/* --- Flow Blocks (inline) --- */}

      {/* Transform */}
      <FlowBlockSection
        title="Transform"
        color="amber"
        isActive={!!(data.transform?.fields && Object.keys(data.transform.fields).length > 0)}
        onClear={() => onChange({ transform: undefined })}
      >
        <InlineFieldMappings
          fields={data.transform?.fields || {}}
          onChange={(fields) => onChange({ transform: { ...data.transform, fields } })}
          placeholder="CEL expression (input.*)"
          color="amber"
        />
      </FlowBlockSection>

      {/* Response */}
      <FlowBlockSection
        title="Response"
        color="green"
        isActive={!!(data.response?.fields && Object.keys(data.response.fields).length > 0)}
        onClear={() => onChange({ response: undefined })}
      >
        <InlineFieldMappings
          fields={data.response?.fields || {}}
          onChange={(fields) => onChange({ response: { ...data.response, fields } })}
          placeholder="CEL expression (output.*)"
          color="green"
        />
        <div className="mt-2 flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-neutral-500 mb-0.5">HTTP Status</label>
            <input
              type="text"
              value={data.response?.httpStatusCode || ''}
              onChange={(e) => onChange({ response: { ...data.response, fields: data.response?.fields || {}, httpStatusCode: e.target.value || undefined } })}
              placeholder="200"
              className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white font-mono"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-neutral-500 mb-0.5">gRPC Status</label>
            <input
              type="text"
              value={data.response?.grpcStatusCode || ''}
              onChange={(e) => onChange({ response: { ...data.response, fields: data.response?.fields || {}, grpcStatusCode: e.target.value || undefined } })}
              placeholder="0"
              className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white font-mono"
            />
          </div>
        </div>
      </FlowBlockSection>

      {/* Steps */}
      <FlowBlockSection
        title="Steps"
        color="blue"
        isActive={!!(data.steps && data.steps.length > 0)}
        onClear={() => onChange({ steps: undefined })}
      >
        {(data.steps || []).map((step, i) => (
          <div key={i} className="p-2 bg-neutral-800/50 rounded mb-1 space-y-1">
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={step.name}
                onChange={(e) => {
                  const steps = [...(data.steps || [])]
                  steps[i] = { ...steps[i], name: e.target.value }
                  onChange({ steps })
                }}
                placeholder="step_name"
                className="flex-1 px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-blue-300 font-mono"
              />
              <button onClick={() => {
                const steps = (data.steps || []).filter((_, idx) => idx !== i)
                onChange({ steps: steps.length > 0 ? steps : undefined })
              }} className="text-red-500 hover:text-red-400 p-0.5">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <input
              type="text"
              value={step.connector}
              onChange={(e) => {
                const steps = [...(data.steps || [])]
                steps[i] = { ...steps[i], connector: e.target.value }
                onChange({ steps })
              }}
              placeholder="connector"
              className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white"
            />
            <input
              type="text"
              value={step.operation || ''}
              onChange={(e) => {
                const steps = [...(data.steps || [])]
                steps[i] = { ...steps[i], operation: e.target.value || undefined }
                onChange({ steps })
              }}
              placeholder="operation"
              className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white"
            />
          </div>
        ))}
        <button
          onClick={() => onChange({ steps: [...(data.steps || []), { name: `step_${(data.steps?.length || 0) + 1}`, connector: '' }] })}
          className="w-full px-2 py-1 text-xs text-blue-400 hover:text-blue-300 border border-dashed border-neutral-700 rounded"
        >
          + Add Step
        </button>
      </FlowBlockSection>

      {/* Error Handling */}
      <FlowBlockSection
        title="Error Handling"
        color="red"
        isActive={!!(data.errorHandling?.retry?.attempts || data.errorHandling?.fallback?.connector || data.errorHandling?.errorResponse?.status)}
        onClear={() => onChange({ errorHandling: undefined })}
      >
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-neutral-500 mb-0.5">Retry attempts</label>
            <input
              type="number"
              value={data.errorHandling?.retry?.attempts || ''}
              onChange={(e) => onChange({ errorHandling: { ...data.errorHandling, retry: { delay: data.errorHandling?.retry?.delay || '1s', ...data.errorHandling?.retry, attempts: parseInt(e.target.value) || 3, backoff: data.errorHandling?.retry?.backoff || 'exponential' } } })}
              placeholder="3"
              className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-0.5">Backoff</label>
            <select
              value={data.errorHandling?.retry?.backoff || ''}
              onChange={(e) => onChange({ errorHandling: { ...data.errorHandling, retry: { delay: data.errorHandling?.retry?.delay || '1s', ...data.errorHandling?.retry, attempts: data.errorHandling?.retry?.attempts || 3, backoff: (e.target.value || undefined) as 'constant' | 'linear' | 'exponential' | undefined } } })}
              className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white"
            >
              <option value="">None</option>
              <option value="constant">Constant</option>
              <option value="linear">Linear</option>
              <option value="exponential">Exponential</option>
            </select>
          </div>
        </div>
      </FlowBlockSection>
    </div>
  )
}

// Color maps for Tailwind (dynamic class names aren't supported)
const blockColors: Record<string, { border: string; bg: string; text: string; fieldKey: string; btn: string; btnHover: string }> = {
  amber: { border: 'border-amber-700/50', bg: 'bg-amber-900/10', text: 'text-amber-400', fieldKey: 'text-amber-300', btn: 'text-amber-400', btnHover: 'hover:text-amber-300' },
  green: { border: 'border-green-700/50', bg: 'bg-green-900/10', text: 'text-green-400', fieldKey: 'text-green-300', btn: 'text-green-400', btnHover: 'hover:text-green-300' },
  blue: { border: 'border-blue-700/50', bg: 'bg-blue-900/10', text: 'text-blue-400', fieldKey: 'text-blue-300', btn: 'text-blue-400', btnHover: 'hover:text-blue-300' },
  red: { border: 'border-red-700/50', bg: 'bg-red-900/10', text: 'text-red-400', fieldKey: 'text-red-300', btn: 'text-red-400', btnHover: 'hover:text-red-300' },
}

// Reusable collapsible section for flow blocks
function FlowBlockSection({
  title,
  color,
  isActive,
  onClear,
  children,
}: {
  title: string
  color: string
  isActive: boolean
  onClear: () => void
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(isActive)
  const c = blockColors[color] || blockColors.amber

  return (
    <div className={`border rounded-md ${isActive ? `${c.border} ${c.bg}` : 'border-neutral-700/50'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs"
      >
        {expanded ? <ChevronDown className="w-3 h-3 text-neutral-400" /> : <ChevronRight className="w-3 h-3 text-neutral-400" />}
        <span className={`font-medium ${isActive ? c.text : 'text-neutral-400'}`}>{title}</span>
        {isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onClear() }}
            className="ml-auto text-neutral-500 hover:text-red-400"
            title="Clear"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </button>
      {expanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

// Reusable inline field mappings editor (for transform, response)
function InlineFieldMappings({
  fields,
  onChange,
  placeholder,
  color,
}: {
  fields: Record<string, string>
  onChange: (fields: Record<string, string>) => void
  placeholder: string
  color: string
}) {
  const c = blockColors[color] || blockColors.amber

  // Use stable entries with numeric IDs to prevent focus loss
  const [entries, setEntries] = useState(() =>
    Object.entries(fields).map(([k, v], i) => ({ id: i, key: k, value: v }))
  )
  const nextId = useCallback(() => Math.max(0, ...entries.map(e => e.id)) + 1, [entries])

  const sync = (updated: typeof entries) => {
    setEntries(updated)
    const result: Record<string, string> = {}
    for (const e of updated) {
      if (e.key) result[e.key] = e.value
    }
    onChange(result)
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-center gap-1">
          <input
            type="text"
            value={entry.key}
            onChange={(e) => {
              const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
              sync(entries.map(en => en.id === entry.id ? { ...en, key: clean } : en))
            }}
            placeholder="field"
            className={`w-24 px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded ${c.fieldKey} font-mono`}
          />
          <span className="text-neutral-600 text-xs">=</span>
          <input
            type="text"
            value={entry.value}
            onChange={(e) => sync(entries.map(en => en.id === entry.id ? { ...en, value: e.target.value } : en))}
            placeholder={placeholder}
            className="flex-1 px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white font-mono placeholder-neutral-600"
          />
          <button onClick={() => sync(entries.filter(en => en.id !== entry.id))} className="text-red-500 hover:text-red-400 p-0.5">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        onClick={() => {
          let name = 'field'
          let i = 1
          const keys = new Set(entries.map(e => e.key))
          while (keys.has(name)) { name = `field_${i++}` }
          sync([...entries, { id: nextId(), key: name, value: '' }])
        }}
        className={`w-full px-2 py-1 text-xs ${c.btn} ${c.btnHover} border border-dashed border-neutral-700 rounded`}
      >
        + Add Field
      </button>
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

  // Use stable array for rendering to avoid focus loss on key rename
  const [fieldEntries, setFieldEntries] = useState(() => Object.entries(fields).map(([k, v], i) => ({ id: i, key: k, value: v })))

  // Sync from props when fields change externally (but not during local edits)
  const fieldsRef = useCallback((entries: typeof fieldEntries) => {
    const newFields: Record<string, string> = {}
    for (const e of entries) {
      if (e.key) newFields[e.key] = e.value
    }
    onChange({ fields: newFields })
  }, [onChange])

  const updateEntryKey = (id: number, newKey: string) => {
    const clean = newKey.toLowerCase().replace(/[^a-z0-9_]/g, '')
    const updated = fieldEntries.map(e => e.id === id ? { ...e, key: clean } : e)
    setFieldEntries(updated)
    fieldsRef(updated)
  }

  const updateEntryValue = (id: number, value: string) => {
    const updated = fieldEntries.map(e => e.id === id ? { ...e, value } : e)
    setFieldEntries(updated)
    fieldsRef(updated)
  }

  const removeEntry = (id: number) => {
    const updated = fieldEntries.filter(e => e.id !== id)
    setFieldEntries(updated)
    fieldsRef(updated)
  }

  const addField = () => {
    let name = 'field'
    let i = 1
    const keys = new Set(fieldEntries.map(e => e.key))
    while (keys.has(name)) { name = `field_${i++}` }
    const newId = Math.max(0, ...fieldEntries.map(e => e.id)) + 1
    const updated = [...fieldEntries, { id: newId, key: name, value: '' }]
    setFieldEntries(updated)
    fieldsRef(updated)
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
          {fieldEntries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-1">
              <input
                type="text"
                value={entry.key}
                onChange={(e) => updateEntryKey(entry.id, e.target.value)}
                className="w-28 px-2 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded text-amber-300 font-mono focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <span className="text-neutral-500 text-xs">=</span>
              <input
                type="text"
                value={entry.value}
                onChange={(e) => updateEntryValue(entry.id, e.target.value)}
                placeholder="CEL expression"
                className="flex-1 px-2 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded text-white font-mono placeholder-neutral-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <button onClick={() => removeEntry(entry.id)} className="text-red-500 hover:text-red-400 p-0.5">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {fieldEntries.length === 0 && (
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

function SagaActionEditor({ action, onChange, label }: { action?: SagaAction; onChange: (a: SagaAction | undefined) => void; label: string }) {
  const inputClass = "w-full px-2 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-white placeholder-neutral-500"

  if (!action) {
    return (
      <button onClick={() => onChange({ connector: '' })} className="text-xs text-rose-400 hover:text-rose-300">
        + Add {label}
      </button>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-neutral-500">{label}</label>
        <button onClick={() => onChange(undefined)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
      </div>
      <input type="text" value={action.connector} onChange={(e) => onChange({ ...action, connector: e.target.value })} placeholder="connector" className={inputClass} />
      <div className="grid grid-cols-2 gap-1.5">
        <input type="text" value={action.operation || ''} onChange={(e) => onChange({ ...action, operation: e.target.value || undefined })} placeholder="operation" className={inputClass} />
        <input type="text" value={action.target || ''} onChange={(e) => onChange({ ...action, target: e.target.value || undefined })} placeholder="target" className={inputClass} />
      </div>
    </div>
  )
}

function SagaProperties({ data, onChange }: { data: SagaNodeData; onChange: (updates: Partial<SagaNodeData>) => void }) {
  const inputClass = "w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-white placeholder-neutral-500"

  const updateStep = (index: number, updates: Partial<SagaStep>) => {
    const steps = [...(data.steps || [])]
    steps[index] = { ...steps[index], ...updates }
    onChange({ steps })
  }

  const addStep = () => {
    const steps = [...(data.steps || []), { name: `step_${(data.steps?.length || 0) + 1}` }]
    onChange({ steps })
  }

  const removeStep = (index: number) => {
    const steps = (data.steps || []).filter((_, i) => i !== index)
    onChange({ steps })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Saga</h2>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Name</label>
        <input type="text" value={data.label} onChange={(e) => onChange({ label: e.target.value })} placeholder="create_order" className={inputClass} />
      </div>

      {/* Timeout */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Timeout (optional)</label>
        <input type="text" value={data.timeout || ''} onChange={(e) => onChange({ timeout: e.target.value || undefined })} placeholder="e.g. 30m, 7d" className={inputClass + ' font-mono'} />
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Steps</label>
          <button onClick={addStep} className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300">
            <Plus className="w-3 h-3" /> Add Step
          </button>
        </div>

        {(data.steps || []).map((step, i) => (
          <div key={i} className="mb-3 p-3 bg-neutral-800/50 rounded-md space-y-2 border border-neutral-700/50">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3 h-3 text-neutral-600" />
              <span className="text-xs text-neutral-500 font-mono">#{i + 1}</span>
              <input
                type="text"
                value={step.name}
                onChange={(e) => updateStep(i, { name: e.target.value })}
                placeholder="step_name"
                className="flex-1 px-2 py-1 text-xs bg-neutral-700 border border-neutral-600 rounded text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <button onClick={() => removeStep(i)} className="text-neutral-500 hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Step type: action, delay, or await */}
            <div className="grid grid-cols-2 gap-1.5">
              <input type="text" value={step.delay || ''} onChange={(e) => updateStep(i, { delay: e.target.value || undefined })} placeholder="delay (e.g. 24h)" className="px-2 py-1 text-xs bg-neutral-700 border border-neutral-600 rounded text-white placeholder-neutral-500 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500" />
              <input type="text" value={step.await || ''} onChange={(e) => updateStep(i, { await: e.target.value || undefined })} placeholder="await (event)" className="px-2 py-1 text-xs bg-neutral-700 border border-neutral-600 rounded text-white placeholder-neutral-500 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500" />
            </div>

            {/* Action & Compensate */}
            {!step.delay && !step.await && (
              <div className="space-y-2">
                <SagaActionEditor action={step.action} onChange={(a) => updateStep(i, { action: a })} label="Action" />
                <SagaActionEditor action={step.compensate} onChange={(a) => updateStep(i, { compensate: a })} label="Compensate" />
              </div>
            )}

            {/* on_error + timeout */}
            <div className="grid grid-cols-2 gap-1.5">
              <select value={step.onError || 'fail'} onChange={(e) => updateStep(i, { onError: e.target.value as 'fail' | 'skip' })} className="px-2 py-1 text-xs bg-neutral-700 border border-neutral-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-rose-500">
                <option value="fail">on_error: fail</option>
                <option value="skip">on_error: skip</option>
              </select>
              <input type="text" value={step.timeout || ''} onChange={(e) => updateStep(i, { timeout: e.target.value || undefined })} placeholder="timeout (e.g. 30s)" className="px-2 py-1 text-xs bg-neutral-700 border border-neutral-600 rounded text-white placeholder-neutral-500 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500" />
            </div>
          </div>
        ))}

        {(data.steps || []).length === 0 && (
          <p className="text-xs text-neutral-500 text-center py-2">No steps — add one above</p>
        )}
      </div>

      {/* on_complete / on_failure */}
      <div className="space-y-3 pt-2 border-t border-neutral-700">
        <SagaActionEditor action={data.onComplete} onChange={(a) => onChange({ onComplete: a })} label="On Complete" />
        <SagaActionEditor action={data.onFailure} onChange={(a) => onChange({ onFailure: a })} label="On Failure" />
      </div>
    </div>
  )
}

function StateMachineProperties({ data, onChange }: { data: StateMachineNodeData; onChange: (updates: Partial<StateMachineNodeData>) => void }) {
  const inputClass = "w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-neutral-500"

  const updateState = (index: number, updates: Partial<StateMachineState>) => {
    const states = [...(data.states || [])]
    states[index] = { ...states[index], ...updates }
    onChange({ states })
  }

  const addState = () => {
    const states = [...(data.states || []), { name: `state_${(data.states?.length || 0) + 1}`, transitions: [] }]
    onChange({ states })
  }

  const removeState = (index: number) => {
    const states = (data.states || []).filter((_, i) => i !== index)
    onChange({ states })
  }

  const updateTransition = (stateIdx: number, transIdx: number, updates: Partial<StateMachineTransition>) => {
    const states = [...(data.states || [])]
    const transitions = [...states[stateIdx].transitions]
    transitions[transIdx] = { ...transitions[transIdx], ...updates }
    states[stateIdx] = { ...states[stateIdx], transitions }
    onChange({ states })
  }

  const addTransition = (stateIdx: number) => {
    const states = [...(data.states || [])]
    states[stateIdx] = {
      ...states[stateIdx],
      transitions: [...states[stateIdx].transitions, { event: '', transitionTo: '' }],
    }
    onChange({ states })
  }

  const removeTransition = (stateIdx: number, transIdx: number) => {
    const states = [...(data.states || [])]
    states[stateIdx] = {
      ...states[stateIdx],
      transitions: states[stateIdx].transitions.filter((_, i) => i !== transIdx),
    }
    onChange({ states })
  }

  const stateNames = data.states.map(s => s.name)

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">State Machine</h2>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Name</label>
        <input type="text" value={data.label} onChange={(e) => onChange({ label: e.target.value })} placeholder="order_status" className={inputClass} />
      </div>

      {/* Initial state */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Initial State</label>
        {stateNames.length > 0 ? (
          <select value={data.initial} onChange={(e) => onChange({ initial: e.target.value })} className={inputClass}>
            <option value="">Select...</option>
            {stateNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        ) : (
          <input type="text" value={data.initial} onChange={(e) => onChange({ initial: e.target.value })} placeholder="pending" className={inputClass} />
        )}
      </div>

      {/* States */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">States</label>
          <button onClick={addState} className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300">
            <Plus className="w-3 h-3" /> Add State
          </button>
        </div>

        {data.states.map((state, si) => (
          <div key={si} className="mb-3 p-3 bg-neutral-800/50 rounded-md space-y-2 border border-neutral-700/50">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                state.name === data.initial ? 'bg-teal-400' : state.final ? 'bg-neutral-500 ring-1 ring-neutral-400' : 'bg-neutral-600'
              }`} />
              <input
                type="text"
                value={state.name}
                onChange={(e) => updateState(si, { name: e.target.value })}
                placeholder="state_name"
                className="flex-1 px-2 py-1 text-xs bg-neutral-700 border border-neutral-600 rounded text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <label className="flex items-center gap-1 text-xs text-neutral-400">
                <input type="checkbox" checked={state.final || false} onChange={(e) => updateState(si, { final: e.target.checked || undefined })} className="rounded border-neutral-600 bg-neutral-700 text-teal-500 focus:ring-teal-500" />
                final
              </label>
              <button onClick={() => removeState(si)} className="text-neutral-500 hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Transitions */}
            {!state.final && (
              <div className="pl-3 space-y-1.5">
                {state.transitions.map((trans, ti) => (
                  <div key={ti} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-500 shrink-0">on</span>
                    <input
                      type="text"
                      value={trans.event}
                      onChange={(e) => updateTransition(si, ti, { event: e.target.value })}
                      placeholder="event"
                      className="w-1/4 px-1.5 py-1 text-xs bg-neutral-700 border border-neutral-600 rounded text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <span className="text-[10px] text-neutral-500 shrink-0">→</span>
                    <select
                      value={trans.transitionTo}
                      onChange={(e) => updateTransition(si, ti, { transitionTo: e.target.value })}
                      className="flex-1 px-1.5 py-1 text-xs bg-neutral-700 border border-neutral-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">target...</option>
                      {stateNames.filter(n => n !== state.name).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <input
                      type="text"
                      value={trans.guard || ''}
                      onChange={(e) => updateTransition(si, ti, { guard: e.target.value || undefined })}
                      placeholder="guard"
                      className="w-1/4 px-1.5 py-1 text-xs bg-neutral-700 border border-neutral-600 rounded text-white placeholder-neutral-500 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <button onClick={() => removeTransition(si, ti)} className="text-neutral-500 hover:text-red-400 shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button onClick={() => addTransition(si)} className="text-[10px] text-teal-400 hover:text-teal-300">
                  + transition
                </button>
              </div>
            )}
          </div>
        ))}

        {data.states.length === 0 && (
          <p className="text-xs text-neutral-500 text-center py-2">No states — add one above</p>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Security Properties
// =============================================================================

const controlCharOptions = [
  { value: 'tab', label: 'Tab' },
  { value: 'newline', label: 'Newline' },
  { value: 'cr', label: 'Carriage Return' },
]

function SecurityProperties() {
  const { securityConfig, updateSecurityConfig } = useStudioStore()
  const [isExpanded, setIsExpanded] = useState(false)

  const inputClass = "w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"

  const updateSanitizer = (index: number, fields: Partial<SecuritySanitizer>) => {
    const updated = securityConfig.sanitizers.map((s, i) =>
      i === index ? { ...s, ...fields } : s
    )
    updateSecurityConfig({ sanitizers: updated })
  }

  const addSanitizer = () => {
    updateSecurityConfig({
      sanitizers: [...securityConfig.sanitizers, { name: '', wasm: '', entrypoint: 'sanitize' }],
    })
  }

  const removeSanitizer = (index: number) => {
    updateSecurityConfig({ sanitizers: securityConfig.sanitizers.filter((_, i) => i !== index) })
  }

  const toggleControlChar = (char: string) => {
    const current = securityConfig.allowedControlChars || ['tab', 'newline', 'cr']
    const updated = current.includes(char)
      ? current.filter(c => c !== char)
      : [...current, char]
    updateSecurityConfig({ allowedControlChars: updated })
  }

  if (!securityConfig.enabled) {
    return (
      <div className="space-y-3 pt-3 border-t border-neutral-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Security</h3>
        </div>
        <p className="text-xs text-neutral-500">Input sanitization and limits are not configured.</p>
        <button
          onClick={() => updateSecurityConfig({ enabled: true, maxInputLength: 1048576, maxFieldLength: 65536, maxFieldDepth: 20, allowedControlChars: ['tab', 'newline', 'cr'] })}
          className="w-full px-3 py-2 text-sm bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded-md transition-colors"
        >
          Enable Security
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3 pt-3 border-t border-neutral-800">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Security</h3>
        <button
          onClick={() => updateSecurityConfig({ enabled: false })}
          className="text-xs text-red-500 hover:text-red-400"
        >
          Disable
        </button>
      </div>

      {/* Input Limits */}
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between py-1 text-xs font-medium text-neutral-400 hover:text-neutral-300"
        >
          <span>Input Limits</span>
          <span className="text-neutral-600">{isExpanded ? '−' : '+'}</span>
        </button>
        {isExpanded && (
          <div className="space-y-2 pl-1">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Max Input Length (bytes)</label>
              <input
                type="number"
                value={securityConfig.maxInputLength || 1048576}
                onChange={(e) => updateSecurityConfig({ maxInputLength: parseInt(e.target.value) || 1048576 })}
                className={inputClass}
              />
              <p className="text-xs text-neutral-600 mt-0.5">Default: 1MB (1048576)</p>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Max Field Length (bytes)</label>
              <input
                type="number"
                value={securityConfig.maxFieldLength || 65536}
                onChange={(e) => updateSecurityConfig({ maxFieldLength: parseInt(e.target.value) || 65536 })}
                className={inputClass}
              />
              <p className="text-xs text-neutral-600 mt-0.5">Default: 64KB (65536)</p>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Max Field Depth</label>
              <input
                type="number"
                value={securityConfig.maxFieldDepth || 20}
                onChange={(e) => updateSecurityConfig({ maxFieldDepth: parseInt(e.target.value) || 20 })}
                min={1}
                max={100}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Allowed Control Characters</label>
              <div className="flex gap-2">
                {controlCharOptions.map(opt => (
                  <label key={opt.value} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={(securityConfig.allowedControlChars || ['tab', 'newline', 'cr']).includes(opt.value)}
                      onChange={() => toggleControlChar(opt.value)}
                      className="w-3 h-3 text-indigo-600 bg-neutral-800 border-neutral-600 rounded"
                    />
                    <span className="text-xs text-neutral-400">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* WASM Sanitizers */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">WASM Sanitizers</label>
        {securityConfig.sanitizers.map((s, i) => (
          <div key={i} className="p-2 bg-neutral-800 rounded-md space-y-1.5 mb-2">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={s.name}
                onChange={(e) => updateSanitizer(i, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                placeholder="sanitizer_name"
                className="flex-1 px-2 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-white font-mono placeholder-neutral-600"
              />
              <button onClick={() => removeSanitizer(i)} className="ml-1 text-red-500 hover:text-red-400">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-0.5">WASM Path</label>
              <input
                type="text"
                value={s.wasm}
                onChange={(e) => updateSanitizer(i, { wasm: e.target.value })}
                placeholder="./wasm/sanitizer.wasm"
                className="w-full px-2 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-white placeholder-neutral-600"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-0.5">Apply To (glob patterns, comma-sep)</label>
              <input
                type="text"
                value={(s.applyTo || []).join(', ')}
                onChange={(e) => updateSanitizer(i, { applyTo: e.target.value ? e.target.value.split(',').map(s => s.trim()) : undefined })}
                placeholder="flows/api/*"
                className="w-full px-2 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-white placeholder-neutral-600"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-0.5">Fields (comma-sep, empty = all)</label>
              <input
                type="text"
                value={(s.fields || []).join(', ')}
                onChange={(e) => updateSanitizer(i, { fields: e.target.value ? e.target.value.split(',').map(s => s.trim()) : undefined })}
                placeholder="email, phone, body"
                className="w-full px-2 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-white placeholder-neutral-600"
              />
            </div>
          </div>
        ))}
        <button
          onClick={addSanitizer}
          className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-300 border border-dashed border-neutral-700 hover:border-neutral-600 rounded"
        >
          <Plus className="w-3 h-3" />
          Add Sanitizer
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// Plugin Properties
// =============================================================================

function PluginProperties() {
  const { pluginConfig, updatePluginConfig } = useStudioStore()

  const addPlugin = () => {
    updatePluginConfig({
      plugins: [...pluginConfig.plugins, { name: '', source: '' }],
    })
  }

  const updatePlugin = (index: number, fields: Partial<PluginDefinition>) => {
    const updated = pluginConfig.plugins.map((p, i) =>
      i === index ? { ...p, ...fields } : p
    )
    updatePluginConfig({ plugins: updated })
  }

  const removePlugin = (index: number) => {
    updatePluginConfig({ plugins: pluginConfig.plugins.filter((_, i) => i !== index) })
  }

  if (pluginConfig.plugins.length === 0) {
    return (
      <div className="space-y-2 pt-3 border-t border-neutral-800">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Plugins</h3>
        <p className="text-xs text-neutral-500">No plugins configured.</p>
        <button
          onClick={addPlugin}
          className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-300 border border-dashed border-neutral-700 hover:border-neutral-600 rounded"
        >
          <Plus className="w-3 h-3" /> Add Plugin
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2 pt-3 border-t border-neutral-800">
      <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Plugins</h3>
      {pluginConfig.plugins.map((p, i) => (
        <div key={i} className="p-2 bg-neutral-800 rounded-md space-y-1.5">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={p.name}
              onChange={(e) => updatePlugin(i, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
              placeholder="plugin-name"
              className="flex-1 px-2 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-white font-mono placeholder-neutral-600"
            />
            <button onClick={() => removePlugin(i)} className="ml-1 text-red-500 hover:text-red-400">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <div>
            <label className="block text-xs text-neutral-600 mb-0.5">Source (git URL or path)</label>
            <input
              type="text"
              value={p.source}
              onChange={(e) => updatePlugin(i, { source: e.target.value })}
              placeholder="github.com/org/plugin or ./plugins/my.wasm"
              className="w-full px-2 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-white placeholder-neutral-600"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-600 mb-0.5">Version</label>
            <input
              type="text"
              value={p.version || ''}
              onChange={(e) => updatePlugin(i, { version: e.target.value || undefined })}
              placeholder="v1.0.0 or latest"
              className="w-full px-2 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-white placeholder-neutral-600"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-600 mb-0.5">Exported functions (comma-sep)</label>
            <input
              type="text"
              value={(p.functions || []).join(', ')}
              onChange={(e) => updatePlugin(i, { functions: e.target.value ? e.target.value.split(',').map(s => s.trim()) : undefined })}
              placeholder="validate, transform, sanitize"
              className="w-full px-2 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-white placeholder-neutral-600"
            />
          </div>
        </div>
      ))}
      <button
        onClick={addPlugin}
        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-300 border border-dashed border-neutral-700 hover:border-neutral-600 rounded"
      >
        <Plus className="w-3 h-3" /> Add Plugin
      </button>
    </div>
  )
}

// =============================================================================
// Auth Properties
// =============================================================================

const presetDescriptions: Record<AuthPreset, string> = {
  strict: 'Access: 15m, Refresh: 1d, MFA required, Strong passwords (12+)',
  standard: 'Access: 1h, Refresh: 7d, MFA optional, Moderate passwords (8+)',
  relaxed: 'Access: 24h, Refresh: 30d, MFA off, Basic passwords (6+)',
  development: 'Access: 24h, Refresh: 90d, No restrictions',
}

const presetDefaults: Record<AuthPreset, Partial<AuthConfig>> = {
  strict: {
    jwt: { algorithm: 'RS256', accessLifetime: '15m', refreshLifetime: '1d', rotation: true },
    password: { minLength: 12, requireUpper: true, requireLower: true, requireNumber: true, requireSpecial: true },
    mfa: { required: 'required', methods: ['totp', 'webauthn'] },
    sessions: { maxActive: 3, idleTimeout: '30m', absoluteTimeout: '8h', onMaxReached: 'deny' },
    security: { bruteForce: true, bruteForceMaxAttempts: 3, bruteForceWindow: '15m', bruteForceLockout: '1h', replayProtection: true },
  },
  standard: {
    jwt: { algorithm: 'HS256', accessLifetime: '1h', refreshLifetime: '7d' },
    password: { minLength: 8, requireUpper: true, requireLower: true, requireNumber: true, requireSpecial: false },
    mfa: { required: 'optional', methods: ['totp'] },
    sessions: { maxActive: 5, idleTimeout: '1h', onMaxReached: 'revoke_oldest' },
    security: { bruteForce: true, bruteForceMaxAttempts: 5, bruteForceWindow: '15m', bruteForceLockout: '30m' },
  },
  relaxed: {
    jwt: { algorithm: 'HS256', accessLifetime: '24h', refreshLifetime: '30d' },
    password: { minLength: 6, requireUpper: false, requireLower: false, requireNumber: false, requireSpecial: false },
    mfa: { required: 'off', methods: [] },
    sessions: { maxActive: 10, idleTimeout: '24h', onMaxReached: 'revoke_oldest' },
    security: {},
  },
  development: {
    jwt: { algorithm: 'HS256', accessLifetime: '24h', refreshLifetime: '90d' },
    password: { minLength: 1, requireUpper: false, requireLower: false, requireNumber: false, requireSpecial: false },
    mfa: { required: 'off', methods: [] },
    sessions: { maxActive: 100, idleTimeout: '24h', onMaxReached: 'revoke_oldest' },
    security: {},
  },
}

const mfaMethodLabels: Record<MfaMethod, string> = {
  totp: 'TOTP (Authenticator)',
  webauthn: 'WebAuthn/Passkeys',
  sms: 'SMS',
  email: 'Email',
  push: 'Push Notification',
}

const socialProviderOptions = ['google', 'github', 'apple'] as const

function AuthProperties() {
  const { authConfig, updateAuthConfig, nodes } = useStudioStore()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['preset']))

  const inputClass = "w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
  const selectClass = inputClass

  const toggleSection = (section: string) => {
    const next = new Set(expandedSections)
    if (next.has(section)) next.delete(section)
    else next.add(section)
    setExpandedSections(next)
  }

  const connectorNodes = nodes.filter(n => n.type === 'connector')

  const applyPreset = (preset: AuthPreset) => {
    const defaults = presetDefaults[preset]
    updateAuthConfig({
      preset,
      ...defaults,
    } as Partial<AuthConfig>)
  }

  const updateJwt = (fields: Partial<AuthConfig['jwt']>) => {
    updateAuthConfig({ jwt: { ...authConfig.jwt, ...fields } })
  }

  const updatePassword = (fields: Partial<AuthConfig['password']>) => {
    updateAuthConfig({ password: { ...authConfig.password, ...fields } })
  }

  const updateMfa = (fields: Partial<AuthConfig['mfa']>) => {
    updateAuthConfig({ mfa: { ...authConfig.mfa, ...fields } })
  }

  const updateSessions = (fields: Partial<AuthConfig['sessions']>) => {
    updateAuthConfig({ sessions: { ...authConfig.sessions, ...fields } })
  }

  const updateSecurity = (fields: Partial<AuthConfig['security']>) => {
    updateAuthConfig({ security: { ...authConfig.security, ...fields } })
  }

  const updateStorage = (fields: Partial<AuthConfig['storage']>) => {
    updateAuthConfig({ storage: { ...authConfig.storage, ...fields } })
  }

  const toggleMfaMethod = (method: MfaMethod) => {
    const methods = authConfig.mfa.methods.includes(method)
      ? authConfig.mfa.methods.filter(m => m !== method)
      : [...authConfig.mfa.methods, method]
    updateMfa({ methods })
  }

  const addSocialProvider = (provider: string) => {
    if (authConfig.socialProviders.some(p => p.provider === provider)) return
    updateAuthConfig({
      socialProviders: [...authConfig.socialProviders, { provider, scopes: [] }],
    })
  }

  const removeSocialProvider = (provider: string) => {
    updateAuthConfig({
      socialProviders: authConfig.socialProviders.filter(p => p.provider !== provider),
    })
  }

  const updateSocialProvider = (provider: string, fields: Partial<AuthSocialProvider>) => {
    updateAuthConfig({
      socialProviders: authConfig.socialProviders.map(p =>
        p.provider === provider ? { ...p, ...fields } : p
      ),
    })
  }

  const SectionHeader = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-300"
    >
      <span>{label}</span>
      <span className="text-neutral-600">{expandedSections.has(id) ? '−' : '+'}</span>
    </button>
  )

  if (!authConfig.enabled) {
    return (
      <div className="space-y-3 pt-3 border-t border-neutral-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Auth</h3>
        </div>
        <p className="text-xs text-neutral-500">Authentication is not configured for this service.</p>
        <button
          onClick={() => updateAuthConfig({ enabled: true })}
          className="w-full px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors"
        >
          Enable Authentication
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3 pt-3 border-t border-neutral-800">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Auth</h3>
        <button
          onClick={() => updateAuthConfig({ enabled: false })}
          className="text-xs text-red-500 hover:text-red-400"
        >
          Disable
        </button>
      </div>

      {/* Preset */}
      <div>
        <SectionHeader id="preset" label="Preset" />
        {expandedSections.has('preset') && (
          <div className="space-y-2 pl-1">
            <select
              value={authConfig.preset}
              onChange={(e) => applyPreset(e.target.value as AuthPreset)}
              className={selectClass}
            >
              <option value="strict">Strict</option>
              <option value="standard">Standard</option>
              <option value="relaxed">Relaxed</option>
              <option value="development">Development</option>
            </select>
            <p className="text-xs text-neutral-500">{presetDescriptions[authConfig.preset]}</p>
          </div>
        )}
      </div>

      {/* JWT */}
      <div>
        <SectionHeader id="jwt" label="JWT" />
        {expandedSections.has('jwt') && (
          <div className="space-y-2 pl-1">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Algorithm</label>
              <select
                value={authConfig.jwt.algorithm}
                onChange={(e) => updateJwt({ algorithm: e.target.value as JwtAlgorithm })}
                className={selectClass}
              >
                <option value="HS256">HS256 (HMAC)</option>
                <option value="HS384">HS384 (HMAC)</option>
                <option value="HS512">HS512 (HMAC)</option>
                <option value="RS256">RS256 (RSA)</option>
                <option value="RS384">RS384 (RSA)</option>
                <option value="RS512">RS512 (RSA)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Secret / Key</label>
              <input
                type="password"
                value={authConfig.jwt.secret || ''}
                onChange={(e) => updateJwt({ secret: e.target.value || undefined })}
                placeholder='env("JWT_SECRET")'
                className={inputClass}
              />
              <p className="text-xs text-neutral-600 mt-0.5">Use env() for production</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Access TTL</label>
                <input
                  type="text"
                  value={authConfig.jwt.accessLifetime}
                  onChange={(e) => updateJwt({ accessLifetime: e.target.value })}
                  placeholder="1h"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Refresh TTL</label>
                <input
                  type="text"
                  value={authConfig.jwt.refreshLifetime}
                  onChange={(e) => updateJwt({ refreshLifetime: e.target.value })}
                  placeholder="7d"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Issuer</label>
              <input
                type="text"
                value={authConfig.jwt.issuer || ''}
                onChange={(e) => updateJwt({ issuer: e.target.value || undefined })}
                placeholder="my-service"
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="jwt-rotation"
                checked={authConfig.jwt.rotation || false}
                onChange={(e) => updateJwt({ rotation: e.target.checked || undefined })}
                className="w-4 h-4 text-indigo-600 bg-neutral-800 border-neutral-600 rounded"
              />
              <label htmlFor="jwt-rotation" className="text-xs text-neutral-300">Refresh token rotation</label>
            </div>
          </div>
        )}
      </div>

      {/* Password Policy */}
      <div>
        <SectionHeader id="password" label="Password Policy" />
        {expandedSections.has('password') && (
          <div className="space-y-2 pl-1">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Min Length</label>
              <input
                type="number"
                value={authConfig.password.minLength}
                onChange={(e) => updatePassword({ minLength: parseInt(e.target.value) || 1 })}
                min={1}
                max={128}
                className={inputClass}
              />
            </div>
            {[
              { key: 'requireUpper' as const, label: 'Require uppercase' },
              { key: 'requireLower' as const, label: 'Require lowercase' },
              { key: 'requireNumber' as const, label: 'Require number' },
              { key: 'requireSpecial' as const, label: 'Require special character' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`pw-${key}`}
                  checked={authConfig.password[key]}
                  onChange={(e) => updatePassword({ [key]: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 bg-neutral-800 border-neutral-600 rounded"
                />
                <label htmlFor={`pw-${key}`} className="text-xs text-neutral-300">{label}</label>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pw-breach"
                checked={authConfig.password.breachCheck || false}
                onChange={(e) => updatePassword({ breachCheck: e.target.checked || undefined })}
                className="w-4 h-4 text-indigo-600 bg-neutral-800 border-neutral-600 rounded"
              />
              <label htmlFor="pw-breach" className="text-xs text-neutral-300">Breach check (haveibeenpwned)</label>
            </div>
          </div>
        )}
      </div>

      {/* MFA */}
      <div>
        <SectionHeader id="mfa" label="Multi-Factor Authentication" />
        {expandedSections.has('mfa') && (
          <div className="space-y-2 pl-1">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Requirement</label>
              <select
                value={authConfig.mfa.required}
                onChange={(e) => updateMfa({ required: e.target.value as MfaRequirement })}
                className={selectClass}
              >
                <option value="required">Required</option>
                <option value="optional">Optional</option>
                <option value="off">Off</option>
              </select>
            </div>
            {authConfig.mfa.required !== 'off' && (
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Methods</label>
                {(Object.entries(mfaMethodLabels) as [MfaMethod, string][]).map(([method, label]) => (
                  <div key={method} className="flex items-center gap-2 py-0.5">
                    <input
                      type="checkbox"
                      id={`mfa-${method}`}
                      checked={authConfig.mfa.methods.includes(method)}
                      onChange={() => toggleMfaMethod(method)}
                      className="w-4 h-4 text-indigo-600 bg-neutral-800 border-neutral-600 rounded"
                    />
                    <label htmlFor={`mfa-${method}`} className="text-xs text-neutral-300">{label}</label>
                  </div>
                ))}
              </div>
            )}
            {authConfig.mfa.required !== 'off' && authConfig.mfa.methods.includes('totp') && (
              <div>
                <label className="block text-xs text-neutral-500 mb-1">TOTP Issuer</label>
                <input
                  type="text"
                  value={authConfig.mfa.totpIssuer || ''}
                  onChange={(e) => updateMfa({ totpIssuer: e.target.value || undefined })}
                  placeholder="My App"
                  className={inputClass}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sessions */}
      <div>
        <SectionHeader id="sessions" label="Sessions" />
        {expandedSections.has('sessions') && (
          <div className="space-y-2 pl-1">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Max Active</label>
              <input
                type="number"
                value={authConfig.sessions.maxActive}
                onChange={(e) => updateSessions({ maxActive: parseInt(e.target.value) || 1 })}
                min={1}
                max={100}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Idle Timeout</label>
              <input
                type="text"
                value={authConfig.sessions.idleTimeout}
                onChange={(e) => updateSessions({ idleTimeout: e.target.value })}
                placeholder="1h"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">On Max Reached</label>
              <select
                value={authConfig.sessions.onMaxReached}
                onChange={(e) => updateSessions({ onMaxReached: e.target.value as 'deny' | 'revoke_oldest' | 'revoke_all' })}
                className={selectClass}
              >
                <option value="revoke_oldest">Revoke Oldest</option>
                <option value="deny">Deny New</option>
                <option value="revoke_all">Revoke All</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Security */}
      <div>
        <SectionHeader id="security" label="Security" />
        {expandedSections.has('security') && (
          <div className="space-y-2 pl-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sec-brute"
                checked={authConfig.security.bruteForce || false}
                onChange={(e) => updateSecurity({ bruteForce: e.target.checked || undefined })}
                className="w-4 h-4 text-indigo-600 bg-neutral-800 border-neutral-600 rounded"
              />
              <label htmlFor="sec-brute" className="text-xs text-neutral-300">Brute force protection</label>
            </div>
            {authConfig.security.bruteForce && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Max Attempts</label>
                    <input
                      type="number"
                      value={authConfig.security.bruteForceMaxAttempts || 5}
                      onChange={(e) => updateSecurity({ bruteForceMaxAttempts: parseInt(e.target.value) || 5 })}
                      min={1}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Lockout</label>
                    <input
                      type="text"
                      value={authConfig.security.bruteForceLockout || '30m'}
                      onChange={(e) => updateSecurity({ bruteForceLockout: e.target.value })}
                      placeholder="30m"
                      className={inputClass}
                    />
                  </div>
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sec-replay"
                checked={authConfig.security.replayProtection || false}
                onChange={(e) => updateSecurity({ replayProtection: e.target.checked || undefined })}
                className="w-4 h-4 text-indigo-600 bg-neutral-800 border-neutral-600 rounded"
              />
              <label htmlFor="sec-replay" className="text-xs text-neutral-300">Replay protection</label>
            </div>
          </div>
        )}
      </div>

      {/* Storage */}
      <div>
        <SectionHeader id="storage" label="Storage" />
        {expandedSections.has('storage') && (
          <div className="space-y-2 pl-1">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Users Connector</label>
              <select
                value={authConfig.storage.usersConnector || ''}
                onChange={(e) => updateStorage({ usersConnector: e.target.value || undefined })}
                className={selectClass}
              >
                <option value="">None (default)</option>
                {connectorNodes.map(n => {
                  const d = n.data as ConnectorNodeData
                  return <option key={n.id} value={d.label.toLowerCase().replace(/\s+/g, '_')}>{d.label}</option>
                })}
              </select>
            </div>
            {authConfig.storage.usersConnector && (
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Users Table</label>
                <input
                  type="text"
                  value={authConfig.storage.usersTable || ''}
                  onChange={(e) => updateStorage({ usersTable: e.target.value || undefined })}
                  placeholder="users"
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Token Storage</label>
              <select
                value={authConfig.storage.tokenDriver}
                onChange={(e) => updateStorage({ tokenDriver: e.target.value as 'memory' | 'redis' })}
                className={selectClass}
              >
                <option value="memory">Memory (dev only)</option>
                <option value="redis">Redis</option>
              </select>
            </div>
            {authConfig.storage.tokenDriver === 'redis' && (
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Redis Address</label>
                <input
                  type="text"
                  value={authConfig.storage.tokenAddress || ''}
                  onChange={(e) => updateStorage({ tokenAddress: e.target.value || undefined })}
                  placeholder="localhost:6379"
                  className={inputClass}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Social Providers */}
      <div>
        <SectionHeader id="social" label="Social Login" />
        {expandedSections.has('social') && (
          <div className="space-y-2 pl-1">
            {authConfig.socialProviders.map(sp => (
              <div key={sp.provider} className="p-2 bg-neutral-800 rounded-md space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-300 capitalize">{sp.provider}</span>
                  <button
                    onClick={() => removeSocialProvider(sp.provider)}
                    className="text-red-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-0.5">Client ID</label>
                  <input
                    type="text"
                    value={sp.clientId || ''}
                    onChange={(e) => updateSocialProvider(sp.provider, { clientId: e.target.value || undefined })}
                    placeholder={`env("${sp.provider.toUpperCase()}_CLIENT_ID")`}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-0.5">Client Secret</label>
                  <input
                    type="password"
                    value={sp.clientSecret || ''}
                    onChange={(e) => updateSocialProvider(sp.provider, { clientSecret: e.target.value || undefined })}
                    placeholder={`env("${sp.provider.toUpperCase()}_CLIENT_SECRET")`}
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
            {socialProviderOptions.filter(p => !authConfig.socialProviders.some(sp => sp.provider === p)).length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {socialProviderOptions
                  .filter(p => !authConfig.socialProviders.some(sp => sp.provider === p))
                  .map(p => (
                    <button
                      key={p}
                      onClick={() => addSocialProvider(p)}
                      className="px-2 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-300 rounded capitalize"
                    >
                      + {p}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Endpoint Prefix */}
      <div>
        <label className="block text-xs text-neutral-500 mb-1">Endpoint Prefix</label>
        <input
          type="text"
          value={authConfig.endpointPrefix || ''}
          onChange={(e) => updateAuthConfig({ endpointPrefix: e.target.value || undefined })}
          placeholder="/auth"
          className={inputClass}
        />
        <p className="text-xs text-neutral-600 mt-0.5">Auto-generated endpoints: /login, /register, /me, etc.</p>
      </div>
    </div>
  )
}

// =============================================================================
// Environment Variables Properties
// =============================================================================

function scanEnvReferences(nodes: { data: Record<string, unknown> }[]): string[] {
  const refs = new Set<string>()
  const envPattern = /env\(\s*["']([^"']+)["']/g

  function scanValue(val: unknown) {
    if (typeof val === 'string') {
      let match
      while ((match = envPattern.exec(val)) !== null) {
        refs.add(match[1])
      }
    } else if (val && typeof val === 'object') {
      for (const v of Object.values(val as Record<string, unknown>)) {
        scanValue(v)
      }
    }
  }

  for (const node of nodes) {
    scanValue(node.data)
  }
  return Array.from(refs).sort()
}

function EnvProperties() {
  const { envConfig, updateEnvConfig, nodes, authConfig } = useStudioStore()
  const [activeTab, setActiveTab] = useState<'variables' | 'environments'>('variables')
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null)

  // Scan for env() references in the project
  const allNodes = nodes.map(n => ({ data: n.data as Record<string, unknown> }))
  // Also scan auth config
  const authData = authConfig.enabled ? [{ data: authConfig as unknown as Record<string, unknown> }] : []
  const envRefs = scanEnvReferences([...allNodes, ...authData])

  // Find which refs are defined
  const definedKeys = new Set(envConfig.variables.map(v => v.key))
  const undefinedRefs = envRefs.filter(r => !definedKeys.has(r))

  const addVariable = (key?: string) => {
    const newVar: EnvVariable = { key: key || '', value: '', secret: false }
    updateEnvConfig({ variables: [...envConfig.variables, newVar] })
  }

  const updateVariable = (index: number, fields: Partial<EnvVariable>) => {
    const updated = envConfig.variables.map((v, i) =>
      i === index ? { ...v, ...fields } : v
    )
    updateEnvConfig({ variables: updated })
  }

  const removeVariable = (index: number) => {
    updateEnvConfig({ variables: envConfig.variables.filter((_, i) => i !== index) })
  }

  const addEnvironment = () => {
    const name = envConfig.environments.length === 0 ? 'development'
      : envConfig.environments.length === 1 ? 'staging'
      : envConfig.environments.length === 2 ? 'production'
      : `env_${envConfig.environments.length + 1}`
    updateEnvConfig({
      environments: [...envConfig.environments, { name, variables: [] }],
    })
    setSelectedEnv(name)
  }

  const removeEnvironment = (name: string) => {
    updateEnvConfig({
      environments: envConfig.environments.filter(e => e.name !== name),
      activeEnvironment: envConfig.activeEnvironment === name ? undefined : envConfig.activeEnvironment,
    })
    if (selectedEnv === name) setSelectedEnv(null)
  }

  const updateEnvOverlay = (envName: string, variables: EnvVariable[]) => {
    updateEnvConfig({
      environments: envConfig.environments.map(e =>
        e.name === envName ? { ...e, variables } : e
      ),
    })
  }

  const addEnvVariable = (envName: string, key?: string) => {
    const env = envConfig.environments.find(e => e.name === envName)
    if (!env) return
    updateEnvOverlay(envName, [...env.variables, { key: key || '', value: '' }])
  }

  const updateEnvVariable = (envName: string, index: number, fields: Partial<EnvVariable>) => {
    const env = envConfig.environments.find(e => e.name === envName)
    if (!env) return
    updateEnvOverlay(envName, env.variables.map((v, i) => i === index ? { ...v, ...fields } : v))
  }

  const removeEnvVariable = (envName: string, index: number) => {
    const env = envConfig.environments.find(e => e.name === envName)
    if (!env) return
    updateEnvOverlay(envName, env.variables.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3 pt-3 border-t border-neutral-800">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Environment
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-800 rounded-md p-0.5">
        <button
          onClick={() => setActiveTab('variables')}
          className={`flex-1 px-2 py-1 text-xs rounded ${activeTab === 'variables' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-300'}`}
        >
          Variables
        </button>
        <button
          onClick={() => setActiveTab('environments')}
          className={`flex-1 px-2 py-1 text-xs rounded ${activeTab === 'environments' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-300'}`}
        >
          Environments
        </button>
      </div>

      {activeTab === 'variables' && (
        <div className="space-y-2">
          {/* Undefined references warning */}
          {undefinedRefs.length > 0 && (
            <div className="p-2 bg-amber-900/20 border border-amber-700/30 rounded text-xs">
              <p className="text-amber-400 font-medium mb-1">Referenced but not defined:</p>
              <div className="flex flex-wrap gap-1">
                {undefinedRefs.map(ref => (
                  <button
                    key={ref}
                    onClick={() => addVariable(ref)}
                    className="px-1.5 py-0.5 bg-amber-800/30 hover:bg-amber-800/50 text-amber-300 rounded text-xs"
                    title="Click to add"
                  >
                    {ref}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Variable list */}
          {envConfig.variables.map((v, i) => (
            <div key={i} className="flex gap-1 items-start">
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={v.key}
                  onChange={(e) => updateVariable(i, { key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                  placeholder="VAR_NAME"
                  className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white font-mono placeholder-neutral-600"
                />
                <input
                  type={v.secret ? 'password' : 'text'}
                  value={v.value}
                  onChange={(e) => updateVariable(i, { value: e.target.value })}
                  placeholder="value"
                  className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-600"
                />
              </div>
              <div className="flex flex-col gap-0.5 pt-0.5">
                <button
                  onClick={() => updateVariable(i, { secret: !v.secret })}
                  className={`px-1 py-0.5 text-xs rounded ${v.secret ? 'text-amber-400 bg-amber-900/30' : 'text-neutral-500 hover:text-neutral-400'}`}
                  title={v.secret ? 'Secret (hidden in .env.example)' : 'Mark as secret'}
                >
                  {v.secret ? 'S' : 's'}
                </button>
                <button
                  onClick={() => removeVariable(i)}
                  className="text-red-500 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => addVariable()}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-300 border border-dashed border-neutral-700 hover:border-neutral-600 rounded"
          >
            <Plus className="w-3 h-3" />
            Add Variable
          </button>

          {envConfig.variables.length > 0 && (
            <p className="text-xs text-neutral-600">
              Use as: env("{envConfig.variables[0]?.key || 'VAR_NAME'}")
            </p>
          )}
        </div>
      )}

      {activeTab === 'environments' && (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500">
            Override variables per environment. Files go in environments/ directory.
          </p>

          {/* Environment list */}
          {envConfig.environments.map(env => (
            <div key={env.name} className="border border-neutral-700 rounded">
              <div className="flex items-center justify-between px-2 py-1.5 bg-neutral-800 rounded-t">
                <button
                  onClick={() => setSelectedEnv(selectedEnv === env.name ? null : env.name)}
                  className="flex-1 text-left text-xs font-medium text-neutral-300"
                >
                  {env.name}
                  <span className="text-neutral-500 ml-1">({env.variables.length} vars)</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateEnvConfig({ activeEnvironment: env.name })}
                    className={`px-1.5 py-0.5 text-xs rounded ${envConfig.activeEnvironment === env.name ? 'bg-green-800/50 text-green-400' : 'text-neutral-500 hover:text-neutral-400'}`}
                  >
                    {envConfig.activeEnvironment === env.name ? 'Active' : 'Set'}
                  </button>
                  <button
                    onClick={() => removeEnvironment(env.name)}
                    className="text-red-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {selectedEnv === env.name && (
                <div className="p-2 space-y-1.5">
                  {env.variables.map((v, i) => (
                    <div key={i} className="flex gap-1 items-center">
                      <input
                        type="text"
                        value={v.key}
                        onChange={(e) => updateEnvVariable(env.name, i, { key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                        placeholder="VAR_NAME"
                        className="flex-1 px-2 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-white font-mono placeholder-neutral-600"
                      />
                      <input
                        type="text"
                        value={v.value}
                        onChange={(e) => updateEnvVariable(env.name, i, { value: e.target.value })}
                        placeholder="value"
                        className="flex-1 px-2 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-white placeholder-neutral-600"
                      />
                      <button onClick={() => removeEnvVariable(env.name, i)} className="text-red-500 hover:text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addEnvVariable(env.name)}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs text-neutral-500 hover:text-neutral-300 border border-dashed border-neutral-700 rounded"
                  >
                    <Plus className="w-3 h-3" /> Add Override
                  </button>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addEnvironment}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-300 border border-dashed border-neutral-700 hover:border-neutral-600 rounded"
          >
            <Plus className="w-3 h-3" />
            Add Environment
          </button>
        </div>
      )}
    </div>
  )
}

function ServiceProperties() {
  const { serviceConfig, updateServiceConfig, nodes } = useStudioStore()
  const inputClass = "w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"

  const hasSagas = nodes.some(n => n.type === 'saga')
  const hasLongRunning = nodes.some(n => {
    if (n.type !== 'saga') return false
    const data = n.data as SagaNodeData
    return data.steps?.some(s => s.delay || s.await)
  })

  const connectorNodes = nodes.filter(n => n.type === 'connector')
  const workflow = serviceConfig.workflow || { enabled: false }

  const updateWorkflow = (fields: Partial<typeof workflow>) => {
    updateServiceConfig({ workflow: { ...workflow, ...fields } })
  }

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
          className={inputClass}
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
          className={inputClass}
        />
      </div>

      {/* Workflow Storage — shown when sagas exist */}
      {hasSagas && (
        <div className="space-y-2 pt-2 border-t border-neutral-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Workflow Storage
            </h3>
            <input
              type="checkbox"
              checked={workflow.enabled}
              onChange={(e) => updateWorkflow({ enabled: e.target.checked })}
              className="w-4 h-4 text-indigo-600 bg-neutral-800 border-neutral-600 rounded"
            />
          </div>
          {hasLongRunning && !workflow.enabled && (
            <p className="text-xs text-amber-500">
              Sagas with delay/await need persistent storage to survive restarts.
            </p>
          )}
          {workflow.enabled && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Database Connector</label>
                <select
                  value={workflow.storage || ''}
                  onChange={(e) => updateWorkflow({ storage: e.target.value || undefined })}
                  className={inputClass}
                >
                  <option value="">Select connector...</option>
                  {connectorNodes
                    .filter(n => {
                      const d = n.data as ConnectorNodeData
                      return d.connectorType === 'database'
                    })
                    .map(n => {
                      const d = n.data as ConnectorNodeData
                      const name = d.label.toLowerCase().replace(/\s+/g, '_')
                      return <option key={n.id} value={name}>{d.label}</option>
                    })}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Table</label>
                <input
                  type="text"
                  value={workflow.table || ''}
                  onChange={(e) => updateWorkflow({ table: e.target.value || undefined })}
                  placeholder="mycel_workflows"
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="wf-autocreate"
                  checked={workflow.autoCreate !== false}
                  onChange={(e) => updateWorkflow({ autoCreate: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 bg-neutral-800 border-neutral-600 rounded"
                />
                <label htmlFor="wf-autocreate" className="text-xs text-neutral-300">Auto-create table on startup</label>
              </div>
              <div className="p-2 bg-neutral-800 rounded text-xs text-neutral-500">
                <p className="font-medium text-neutral-400 mb-1">Auto-generated endpoints:</p>
                <p className="font-mono">GET /workflows/:id</p>
                <p className="font-mono">POST /workflows/:id/signal/:event</p>
                <p className="font-mono">POST /workflows/:id/cancel</p>
              </div>
            </div>
          )}
        </div>
      )}

      <SecurityProperties />

      <PluginProperties />

      <AuthProperties />

      <EnvProperties />

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
      {selectedNode.type === 'saga' && (
        <SagaProperties
          data={selectedNode.data as SagaNodeData}
          onChange={handleChange}
        />
      )}
      {selectedNode.type === 'state_machine' && (
        <StateMachineProperties
          data={selectedNode.data as StateMachineNodeData}
          onChange={handleChange}
        />
      )}
    </div>
  )
}
