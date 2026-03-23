import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight as ChevronRightIcon, GripVertical, Plus, Trash2, Variable, Type, Pencil, X, Check, Lock, FolderOpen, FileText } from 'lucide-react'
import { useStudioStore } from '../../stores/useStudioStore'
import { useLayoutStore } from '../../stores/useLayoutStore'
import type { ConnectorNodeData, ConnectorProfile, ConnectorProfileConfig, FlowNodeData, FlowTo, FlowTransform, ConnectorDirection, RestOperation, GraphQLOperation, ConnectorOperation, TypeNodeData, TypeFieldDefinition, ValidatorNodeData, TransformNodeData, AspectNodeData, SagaNodeData, SagaStep, SagaAction, StateMachineNodeData, StateMachineState, StateMachineTransition, AuthConfig, AuthPreset, JwtAlgorithm, MfaRequirement, MfaMethod, AuthSocialProvider, EnvVariable, SecuritySanitizer, PluginDefinition } from '../../types'
import OperationsEditor from './OperationsEditor'
import GraphQLOperationsEditor from './GraphQLOperationsEditor'
import { getConnector, type FieldDefinition } from '../../connectors'
import { getDestinationConfig } from '../../connectors/destinationProperties'
import { getSourceConfig } from '../../connectors/sourceProperties'
import { getAllValidatorTypes, getValidatorType } from '../../validators'
import { useProjectStore } from '../../stores/useProjectStore'
import { useEditorPanelStore } from '../../stores/useEditorPanelStore'
import { TransformEditor } from '../FlowConfig'
import { Wand2 } from 'lucide-react'

// Reusable button that opens TransformEditor popup for any Record<string, string> transform
function TransformPopupButton({
  fields,
  onSave,
  label = 'Transform',
}: {
  fields: Record<string, string> | undefined
  onSave: (fields: Record<string, string> | undefined) => void
  label?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const count = fields ? Object.keys(fields).length : 0

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs bg-neutral-800 border border-neutral-700 rounded-md hover:border-amber-500/50 hover:bg-neutral-700/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-neutral-300">
          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
          {label}
        </span>
        <span className={`text-xs ${count > 0 ? 'text-amber-400' : 'text-neutral-500'}`}>
          {count > 0 ? `${count} field${count > 1 ? 's' : ''}` : 'None'}
        </span>
      </button>
      <TransformEditor
        isOpen={isOpen}
        transform={fields && Object.keys(fields).length > 0 ? { fields } : undefined}
        onSave={(transform: FlowTransform | undefined) => {
          onSave(transform?.fields && Object.keys(transform.fields).length > 0 ? transform.fields : undefined)
        }}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}

const directionOptions: { value: ConnectorDirection; label: string; description: string }[] = [
  { value: 'input', label: 'Source', description: 'Triggers flows (e.g., API server, queue consumer)' },
  { value: 'output', label: 'Target', description: 'Receives data (e.g., database, queue publisher)' },
  { value: 'bidirectional', label: 'Both', description: 'Can be source or target' },
]

// Check if a value is an env() reference and extract the var name
function parseEnvRef(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = value.match(/^env\("([^"]+)"\)$/)
  return match ? match[1] : null
}

// Toggle button for switching between free text and env variable
function EnvToggle({
  isEnvMode,
  onToggle,
}: {
  isEnvMode: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex-shrink-0 p-1.5 rounded transition-colors ${
        isEnvMode
          ? 'bg-green-800/40 text-green-400 hover:bg-green-800/60'
          : 'text-neutral-500 hover:text-neutral-400 hover:bg-neutral-700'
      }`}
      title={isEnvMode ? 'Using environment variable — click for free text' : 'Using free text — click to use env variable'}
    >
      {isEnvMode ? <Variable className="w-3.5 h-3.5" /> : <Type className="w-3.5 h-3.5" />}
    </button>
  )
}

// Env variable selector dropdown
function EnvVarSelector({
  variables,
  currentVar,
  onChange,
}: {
  variables: EnvVariable[]
  currentVar: string | null
  onChange: (varName: string) => void
}) {
  const inputClass = "w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-green-400 font-mono"

  if (variables.length === 0) {
    return (
      <p className="text-xs text-neutral-500 italic py-2">No env variables defined. Add them in the Environment panel below.</p>
    )
  }

  return (
    <select
      value={currentVar || ''}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    >
      <option value="">Select variable...</option>
      {variables.map(v => (
        <option key={v.key} value={v.key}>{v.key}</option>
      ))}
    </select>
  )
}

// File picker that shows project files filtered by extension
function FileFieldRenderer({
  field,
  value,
  onChange,
  inputClass,
}: {
  field: FieldDefinition
  value: unknown
  onChange: (key: string, val: unknown) => void
  inputClass: string
}) {
  const [showPicker, setShowPicker] = useState(false)
  const { files, mycelRoot } = useProjectStore()
  const { openFile } = useEditorPanelStore()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter project files by allowed extensions
  const matchingFiles = useMemo(() => {
    if (!files.length) return []
    const exts = field.fileExtensions || []
    return files
      .filter(f => {
        if (!exts.length) return true
        const lower = f.relativePath.toLowerCase()
        return exts.some(ext => lower.endsWith(ext))
      })
      .map(f => {
        // Make path relative to mycelRoot
        const rel = mycelRoot && f.relativePath.startsWith(mycelRoot)
          ? './' + f.relativePath.slice(mycelRoot.length)
          : './' + f.relativePath
        return { path: rel, fullPath: f.relativePath }
      })
      .sort((a, b) => a.path.localeCompare(b.path))
  }, [files, mycelRoot, field.fileExtensions])

  // Close dropdown on outside click
  useEffect(() => {
    if (!showPicker) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPicker])

  const currentValue = value != null ? String(value) : ''

  // Open the file in the editor panel
  const handleOpenInEditor = () => {
    if (!currentValue) return
    // Find the matching project file
    const match = matchingFiles.find(f => f.path === currentValue)
    if (match) {
      const fileName = match.fullPath.split('/').pop() || match.fullPath
      openFile(match.fullPath, fileName)
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-neutral-400 mb-1">{field.label}</label>
      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-1">
          <input
            type="text"
            value={currentValue}
            onChange={(e) => onChange(field.key, e.target.value || undefined)}
            placeholder={field.placeholder}
            className={inputClass + ' flex-1 pr-8'}
          />
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="px-2 py-2 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded-md transition-colors"
            title="Browse project files"
          >
            <FolderOpen className="w-4 h-4 text-neutral-300" />
          </button>
          {currentValue && (
            <button
              onClick={handleOpenInEditor}
              className="px-2 py-2 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded-md transition-colors"
              title="Open in editor"
            >
              <FileText className="w-4 h-4 text-neutral-300" />
            </button>
          )}
        </div>
        {showPicker && (
          <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-neutral-800 border border-neutral-600 rounded-md shadow-lg">
            {matchingFiles.length === 0 ? (
              <div className="px-3 py-2 text-xs text-neutral-500">
                {files.length === 0
                  ? 'Open a project to browse files'
                  : `No ${field.fileExtensions?.join('/') || ''} files found in project`}
              </div>
            ) : (
              matchingFiles.map(f => (
                <button
                  key={f.fullPath}
                  onClick={() => {
                    onChange(field.key, f.path)
                    setShowPicker(false)
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-700 transition-colors ${
                    f.path === currentValue ? 'bg-indigo-900/30 text-indigo-300' : 'text-neutral-300'
                  }`}
                >
                  {f.path}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {field.helpText && <p className="text-xs text-neutral-500 mt-1">{field.helpText}</p>}
    </div>
  )
}

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
  const { envConfig } = useStudioStore()
  const inputClass = "w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"

  // Check visibility condition
  if (field.visibleWhen) {
    const depValue = config[field.visibleWhen.field]
    const matchValue = field.visibleWhen.value
    let allowed: boolean
    if (matchValue === '*') {
      // Wildcard: visible when field has any non-empty value
      allowed = depValue !== undefined && depValue !== null && depValue !== '' && depValue !== false
    } else if (Array.isArray(matchValue)) {
      allowed = matchValue.includes(String(depValue))
    } else {
      allowed = String(depValue) === matchValue
    }
    if (!allowed) return null
  }

  // Determine if current value is an env() ref
  const envVar = parseEnvRef(value)
  const isEnvMode = envVar !== null

  // For string, number, password fields: support env var toggle
  const supportsEnvToggle = field.type === 'string' || field.type === 'password' || field.type === 'number' || field.type === undefined

  const handleToggleEnv = () => {
    if (isEnvMode) {
      // Switch to free text — clear value
      onChange(field.key, undefined)
    } else {
      // Switch to env mode — pick first available or empty
      const firstVar = envConfig.variables[0]?.key
      if (firstVar) {
        onChange(field.key, `env("${firstVar}")`)
      } else {
        onChange(field.key, 'env("")')
      }
    }
  }

  const handleEnvVarChange = (varName: string) => {
    onChange(field.key, varName ? `env("${varName}")` : undefined)
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

    case 'file': {
      return (
        <FileFieldRenderer
          field={field}
          value={value}
          onChange={onChange}
          inputClass={inputClass}
        />
      )
    }

    default: {
      // string, number, password — all support env var toggle
      return (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-neutral-400">{field.label}</label>
            {supportsEnvToggle && (
              <EnvToggle isEnvMode={isEnvMode} onToggle={handleToggleEnv} />
            )}
          </div>
          {isEnvMode ? (
            <EnvVarSelector
              variables={envConfig.variables}
              currentVar={envVar}
              onChange={handleEnvVarChange}
            />
          ) : (
            <input
              type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
              value={value != null ? String(value) : ''}
              onChange={(e) => {
                if (field.type === 'number') {
                  onChange(field.key, e.target.value ? parseInt(e.target.value) : undefined)
                } else {
                  onChange(field.key, e.target.value || undefined)
                }
              }}
              placeholder={field.type === 'password' ? (field.placeholder || '••••••••') : field.placeholder}
              className={inputClass}
            />
          )}
          {field.helpText && <p className="text-xs text-neutral-500 mt-1">{field.helpText}</p>}
        </div>
      )
    }
  }
}

function ProfilesEditor({ data, onChange }: { data: ConnectorNodeData; onChange: (d: Partial<ConnectorNodeData>) => void }) {
  const pc = data.profileConfig || { enabled: false, select: '', default: '', fallback: [], profiles: [] }
  const inputClass = "w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"

  const update = (fields: Partial<ConnectorProfileConfig>) => {
    onChange({ profileConfig: { ...pc, ...fields } })
  }

  const updateProfile = (index: number, fields: Partial<ConnectorProfile>) => {
    const profiles = [...pc.profiles]
    profiles[index] = { ...profiles[index], ...fields }
    update({ profiles })
  }

  const addProfile = () => {
    const name = `profile_${pc.profiles.length + 1}`
    update({ profiles: [...pc.profiles, { name, config: {} }] })
  }

  const removeProfile = (index: number) => {
    const profiles = pc.profiles.filter((_, i) => i !== index)
    update({ profiles })
  }

  const updateProfileConfig = (index: number, key: string, value: unknown) => {
    const profiles = [...pc.profiles]
    profiles[index] = { ...profiles[index], config: { ...profiles[index].config, [key]: value } }
    update({ profiles })
  }

  return (
    <div className="pt-3 border-t border-neutral-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Profiles</h3>
        <input
          type="checkbox"
          checked={pc.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          className="w-4 h-4 text-indigo-600 bg-neutral-800 border-neutral-600 rounded"
        />
      </div>
      {pc.enabled && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Select (CEL)</label>
            <input
              type="text"
              value={pc.select}
              onChange={(e) => update({ select: e.target.value })}
              placeholder='env("PROFILE") or input.tenant_id'
              className={inputClass}
            />
            <p className="text-xs text-neutral-600 mt-0.5">CEL expression to pick active profile</p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-neutral-500 mb-1">Default</label>
              <select
                value={pc.default}
                onChange={(e) => update({ default: e.target.value })}
                className={inputClass}
              >
                <option value="">None</option>
                {pc.profiles.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-neutral-500 mb-1">Fallback chain</label>
              <input
                type="text"
                value={pc.fallback.join(', ')}
                onChange={(e) => update({ fallback: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="primary, replica"
                className={inputClass}
              />
            </div>
          </div>

          {/* Profile list */}
          {pc.profiles.map((profile, i) => (
            <div key={i} className="p-2 bg-neutral-800/50 rounded border border-neutral-700/50 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => updateProfile(i, { name: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white font-medium"
                />
                <button onClick={() => removeProfile(i)} className="text-red-500 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Profile-specific config fields */}
              {getConnector(data.connectorType)?.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-xs text-neutral-500 mb-0.5">{field.label}</label>
                  <input
                    type={field.type === 'password' ? 'password' : 'text'}
                    value={String(profile.config[field.key] ?? '')}
                    onChange={(e) => updateProfileConfig(i, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white"
                  />
                </div>
              ))}

              {/* Transform */}
              <TransformPopupButton
                fields={profile.transform && Object.keys(profile.transform).length > 0 ? profile.transform : undefined}
                onSave={(fields) => updateProfile(i, { transform: fields || {} })}
              />
            </div>
          ))}

          <button
            onClick={addProfile}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-dashed border-neutral-700 rounded hover:border-indigo-500"
          >
            <Plus className="w-3 h-3" />
            Add Profile
          </button>
        </div>
      )}
    </div>
  )
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
          onChange={(e) => onChange({ label: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })}
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

      {/* Profiles */}
      <ProfilesEditor data={data} onChange={onChange} />
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

  // Collect existing flow file paths for the selector
  const existingFlowFiles = useMemo(() => {
    const paths = new Set<string>()
    paths.add('flows/flows.mycel')
    for (const n of nodes) {
      if (n.type === 'flow') {
        const fd = n.data as FlowNodeData
        if (fd.hclFile) paths.add(fd.hclFile)
      }
    }
    return Array.from(paths).sort()
  }, [nodes])

  const [showCustomFile, setShowCustomFile] = useState(false)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Name</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => {
            const clean = e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
            onChange({ label: clean })
          }}
          placeholder="my_flow_name"
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white font-mono"
        />
      </div>

      {/* HCL File selector */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">File</label>
        <select
          value={data.hclFile || 'flows/flows.mycel'}
          onChange={(e) => {
            if (e.target.value === '__custom__') {
              setShowCustomFile(true)
            } else {
              onChange({ hclFile: e.target.value === 'flows/flows.mycel' ? undefined : e.target.value })
              setShowCustomFile(false)
            }
          }}
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
        >
          {existingFlowFiles.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
          <option value="__custom__">New file...</option>
        </select>
        {showCustomFile && (
          <input
            type="text"
            autoFocus
            placeholder="flows/users.mycel"
            className="w-full mt-1 px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim()
                if (val) {
                  const path = val.endsWith('.mycel') || val.endsWith('.hcl') ? val : `${val}.mycel`
                  const normalized = path.startsWith('flows/') ? path : `flows/${path}`
                  onChange({ hclFile: normalized })
                }
                setShowCustomFile(false)
              } else if (e.key === 'Escape') {
                setShowCustomFile(false)
              }
            }}
            onBlur={(e) => {
              const val = e.target.value.trim()
              if (val) {
                const path = val.endsWith('.mycel') || val.endsWith('.hcl') ? val : `${val}.mycel`
                const normalized = path.startsWith('flows/') ? path : `flows/${path}`
                onChange({ hclFile: normalized })
              }
              setShowCustomFile(false)
            }}
          />
        )}
        <p className="text-xs text-neutral-500 mt-1">HCL file where this flow is generated</p>
      </div>

      {/* Internal flow toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!data.isInternal}
          onChange={(e) => onChange({ isInternal: e.target.checked || undefined })}
          className="rounded border-neutral-600 bg-neutral-800 text-indigo-500 focus:ring-indigo-500"
        />
        <span className="text-xs text-neutral-400">Internal flow (no <code className="text-neutral-300">from</code> block — invocable from aspects only)</span>
      </label>

      {/* Source (From) — hidden for internal flows */}
      {!data.isInternal && <div className="p-3 bg-neutral-800/50 rounded-md space-y-3">
        {(() => {
          const srcConfig = sourceData
            ? getSourceConfig(sourceData.connectorType, sourceData.config?.driver as string | undefined)
            : null
          const sourceIdent = sourceData?.label.toLowerCase().replace(/\s+/g, '_') || ''

          return (<>
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

            {/* Operation — dropdown if connector has defined operations, text input with contextual label otherwise */}
            {sourceOperations.length > 0 ? (
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  {srcConfig?.operationLabel || 'Operation'}
                </label>
                <select
                  value={fromOperation}
                  onChange={(e) => onChange({ from: { ...data.from, connector: sourceIdent, operation: e.target.value } })}
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
            ) : srcConfig?.operationOptions ? (
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  {srcConfig.operationLabel}
                </label>
                <select
                  value={fromOperation}
                  onChange={(e) => onChange({ from: { ...data.from, connector: sourceIdent, operation: e.target.value } })}
                  className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
                >
                  <option value="">Select...</option>
                  {srcConfig.operationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {srcConfig.operationHelpText && (
                  <p className="text-xs text-neutral-500 mt-1">{srcConfig.operationHelpText}</p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  {srcConfig?.operationLabel || 'Operation'}
                </label>
                <input
                  type="text"
                  value={fromOperation}
                  onChange={(e) => onChange({ from: { ...data.from, connector: sourceIdent, operation: e.target.value } })}
                  placeholder={srcConfig?.operationPlaceholder || 'operation'}
                  className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
                />
                {srcConfig?.operationHelpText && (
                  <p className="text-xs text-neutral-500 mt-1">{srcConfig.operationHelpText}</p>
                )}
              </div>
            )}

            {/* Available input.* variables reference */}
            {srcConfig && srcConfig.inputVariables.length > 0 && (
              <details className="text-xs">
                <summary className="text-neutral-500 cursor-pointer hover:text-neutral-400">
                  Available input variables
                </summary>
                <div className="mt-1 pl-2 border-l border-neutral-700 space-y-0.5">
                  {srcConfig.inputVariables.map((v) => (
                    <div key={v} className="text-neutral-400 font-mono">{v}</div>
                  ))}
                </div>
              </details>
            )}

            {/* Format */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Format</label>
              <select
                value={data.from?.format || ''}
                onChange={(e) => onChange({ from: { ...data.from, connector: data.from?.connector || '', operation: data.from?.operation || '', format: (e.target.value || undefined) as 'json' | 'xml' | 'csv' | undefined } })}
                className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
              >
                <option value="">json (default)</option>
                <option value="json">json</option>
                <option value="xml">xml</option>
                <option value="csv">csv</option>
              </select>
            </div>

            {/* Filter */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Filter (CEL, optional)</label>
              <input
                type="text"
                value={fromFilter}
                onChange={(e) => {
                  // For MQ connectors, preserve block-form filter fields if they exist
                  const existingFilter = data.from?.filter
                  const isBlockFilter = typeof existingFilter === 'object' && existingFilter !== null
                  const newFilter = e.target.value
                    ? isBlockFilter
                      ? { ...existingFilter, condition: e.target.value }
                      : e.target.value
                    : undefined
                  onChange({ from: { ...data.from, connector: data.from?.connector || '', operation: data.from?.operation || '', filter: newFilter } })
                }}
                placeholder="input.status != 'internal'"
                className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500 font-mono"
              />
              <p className="text-xs text-neutral-500 mt-1">Skip events where condition is false</p>
            </div>

            {/* MQ-specific filter block fields (on_reject, id_field, max_requeue) */}
            {sourceData && (sourceData.connectorType === 'mq' || sourceData.connectorType === 'mqtt') && fromFilter && (
              <div className="pl-3 border-l-2 border-neutral-700 space-y-2">
                <p className="text-xs text-neutral-500">Message queue filter options</p>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">On Reject</label>
                  <select
                    value={(typeof data.from?.filter === 'object' ? data.from.filter.onReject : '') || ''}
                    onChange={(e) => {
                      const current = typeof data.from?.filter === 'object' ? data.from.filter : { condition: fromFilter }
                      onChange({ from: { ...data.from, connector: data.from?.connector || '', operation: data.from?.operation || '', filter: { ...current, onReject: (e.target.value || undefined) as 'ack' | 'reject' | 'requeue' | undefined } } })
                    }}
                    className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
                  >
                    <option value="">Default</option>
                    <option value="ack">ack (discard)</option>
                    <option value="reject">reject (DLQ)</option>
                    <option value="requeue">requeue (retry)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">ID Field (dedup)</label>
                  <input
                    type="text"
                    value={(typeof data.from?.filter === 'object' ? data.from.filter.idField : '') || ''}
                    onChange={(e) => {
                      const current = typeof data.from?.filter === 'object' ? data.from.filter : { condition: fromFilter }
                      onChange({ from: { ...data.from, connector: data.from?.connector || '', operation: data.from?.operation || '', filter: { ...current, idField: e.target.value || undefined } } })
                    }}
                    placeholder="input.payment_id"
                    className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Max Requeue</label>
                  <input
                    type="number"
                    value={(typeof data.from?.filter === 'object' ? data.from.filter.maxRequeue : '') || ''}
                    onChange={(e) => {
                      const current = typeof data.from?.filter === 'object' ? data.from.filter : { condition: fromFilter }
                      onChange({ from: { ...data.from, connector: data.from?.connector || '', operation: data.from?.operation || '', filter: { ...current, maxRequeue: e.target.value ? parseInt(e.target.value) : undefined } } })
                    }}
                    placeholder="3"
                    className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
                  />
                </div>
              </div>
            )}
          </>)
        })()}
      </div>}

      {/* Targets (To) - Multi-to support */}
      {toTargets.map((to, idx) => {
        const targetConnector = outgoingEdges[idx]
          ? nodes.find((n) => n.id === outgoingEdges[idx].target && n.type === 'connector')
          : null
        const targetData = targetConnector?.data as ConnectorNodeData | undefined
        const destConfig = targetData
          ? getDestinationConfig(targetData.connectorType, targetData.config?.driver as string | undefined)
          : null
        const connectorIdent = targetData?.label.toLowerCase().replace(/\s+/g, '_') || to.connector || ''

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

            {/* Target field — label and placeholder are context-aware */}
            {!(destConfig?.hideTarget) && (
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  {destConfig?.targetLabel || 'Target'}
                </label>
                <input
                  type="text"
                  value={to.target || ''}
                  onChange={(e) => updateToTarget(idx, { connector: connectorIdent, target: e.target.value })}
                  placeholder={destConfig?.targetPlaceholder || 'target'}
                  className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
                />
                {destConfig?.targetHelpText && (
                  <p className="text-xs text-neutral-500 mt-1">{destConfig.targetHelpText}</p>
                )}
              </div>
            )}

            {/* Operation dropdown — only when connector has specific operations */}
            {destConfig?.operationOptions && !destConfig.hideOperation && (
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Operation</label>
                <select
                  value={to.operation || ''}
                  onChange={(e) => updateToTarget(idx, { connector: connectorIdent, operation: e.target.value || undefined })}
                  className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
                >
                  {destConfig.operationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {destConfig.operationHelpText && (
                  <p className="text-xs text-neutral-500 mt-1">{destConfig.operationHelpText}</p>
                )}
              </div>
            )}

            {/* Connector-specific extra fields */}
            {destConfig?.fields?.map((field) => {
              // Determine where this field stores its value
              const isMapped = field.mapsTo !== undefined
              const getValue = (): string => {
                if (isMapped) {
                  const v = to[field.mapsTo as keyof FlowTo]
                  if (typeof v === 'string') return v
                  if (typeof v === 'object' && v) return JSON.stringify(v)
                  return ''
                }
                return (to.params?.[field.key] as string) || ''
              }
              const setValue = (val: string) => {
                if (isMapped) {
                  updateToTarget(idx, { connector: connectorIdent, [field.mapsTo!]: val || undefined })
                } else {
                  const newParams = { ...(to.params || {}), [field.key]: val }
                  if (!val) delete newParams[field.key]
                  updateToTarget(idx, { connector: connectorIdent, params: Object.keys(newParams).length ? newParams : undefined })
                }
              }

              if (field.type === 'checkbox') {
                const checked = isMapped
                  ? !!to[field.mapsTo as keyof FlowTo]
                  : to.params?.[field.key] === 'true'
                return (
                  <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (isMapped) {
                          updateToTarget(idx, { connector: connectorIdent, [field.mapsTo!]: e.target.checked || undefined })
                        } else {
                          const newParams = { ...(to.params || {}) }
                          if (e.target.checked) newParams[field.key] = 'true'
                          else delete newParams[field.key]
                          updateToTarget(idx, { connector: connectorIdent, params: Object.keys(newParams).length ? newParams : undefined })
                        }
                      }}
                      className="accent-indigo-500"
                    />
                    <span className="text-sm text-neutral-300">{field.label}</span>
                  </label>
                )
              }

              if (field.type === 'select') {
                return (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">{field.label}</label>
                    <select
                      value={getValue()}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {field.helpText && <p className="text-xs text-neutral-500 mt-1">{field.helpText}</p>}
                  </div>
                )
              }

              if (field.type === 'textarea') {
                return (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">{field.label}</label>
                    <textarea
                      value={getValue()}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500 font-mono resize-y"
                    />
                    {field.helpText && <p className="text-xs text-neutral-500 mt-1">{field.helpText}</p>}
                  </div>
                )
              }

              if (field.type === 'kv-map') {
                const mapVal: Record<string, string> = isMapped
                  ? (to[field.mapsTo as keyof FlowTo] as Record<string, string>) || {}
                  : {}
                return (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">{field.label}</label>
                    {Object.entries(mapVal).map(([k, v]) => (
                      <div key={k} className="flex gap-1 mb-1">
                        <input
                          type="text"
                          value={k}
                          readOnly
                          className="w-1/3 px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-neutral-400 font-mono"
                        />
                        <input
                          type="text"
                          value={v}
                          onChange={(e) => {
                            const newMap = { ...mapVal, [k]: e.target.value }
                            if (isMapped) updateToTarget(idx, { connector: connectorIdent, [field.mapsTo!]: newMap })
                          }}
                          className="flex-1 px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white font-mono"
                        />
                        <button
                          onClick={() => {
                            const newMap = { ...mapVal }
                            delete newMap[k]
                            if (isMapped) updateToTarget(idx, { connector: connectorIdent, [field.mapsTo!]: Object.keys(newMap).length ? newMap : undefined })
                          }}
                          className="px-1 text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const key = prompt('Field name:')
                        if (!key) return
                        const newMap = { ...mapVal, [key]: '' }
                        if (isMapped) updateToTarget(idx, { connector: connectorIdent, [field.mapsTo!]: newMap })
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                    >
                      + Add field
                    </button>
                    {field.helpText && <p className="text-xs text-neutral-500 mt-1">{field.helpText}</p>}
                  </div>
                )
              }

              // Default: text input
              return (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">{field.label}</label>
                  <input
                    type="text"
                    value={getValue()}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
                  />
                  {field.helpText && <p className="text-xs text-neutral-500 mt-1">{field.helpText}</p>}
                </div>
              )
            })}

            {/* Exchange (legacy support for existing flows) */}
            {!destConfig?.fields?.some(f => f.key === 'exchange') && to.exchange && (
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Exchange</label>
                <input
                  type="text"
                  value={to.exchange || ''}
                  onChange={(e) => updateToTarget(idx, { connector: connectorIdent, exchange: e.target.value || undefined })}
                  placeholder="exchange_name"
                  className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
                />
              </div>
            )}

            {/* Info note for notification/webhook connectors */}
            {destConfig?.infoNote && (
              <p className="text-xs text-amber-500/80 italic">{destConfig.infoNote}</p>
            )}

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

      {/* --- Flow Blocks (open in modal editors) --- */}

      {/* Transform */}
      <FlowBlockButton
        title="Transform"
        color="amber"
        isActive={!!(data.transform?.fields && Object.keys(data.transform.fields).length > 0)}
        summary={data.transform?.fields ? `${Object.keys(data.transform.fields).length} fields` : undefined}
        onEdit={() => useStudioStore.getState().openFlowEditor('transform')}
        onClear={() => onChange({ transform: undefined })}
      />

      {/* Steps */}
      <FlowBlockButton
        title="Steps"
        color="blue"
        isActive={!!(data.steps && data.steps.length > 0)}
        summary={data.steps ? `${data.steps.length} step${data.steps.length > 1 ? 's' : ''}: ${data.steps.map(s => s.name).join(', ')}` : undefined}
        onEdit={() => useStudioStore.getState().openFlowEditor('step')}
        onClear={() => onChange({ steps: undefined })}
      />

      {/* Response */}
      <FlowBlockButton
        title="Response"
        color="green"
        isActive={!!(data.response?.fields && Object.keys(data.response.fields).length > 0)}
        summary={data.response?.fields ? `${Object.keys(data.response.fields).length} fields${data.response.httpStatusCode ? ` (${data.response.httpStatusCode})` : ''}` : undefined}
        onEdit={() => useStudioStore.getState().openFlowEditor('response')}
        onClear={() => onChange({ response: undefined })}
      />

      {/* Error Handling */}
      <FlowBlockButton
        title="Error Handling"
        color="red"
        isActive={!!(data.errorHandling?.retry?.attempts || data.errorHandling?.fallback?.connector || data.errorHandling?.errorResponse?.status)}
        summary={[
          data.errorHandling?.retry ? `retry(${data.errorHandling.retry.attempts})` : '',
          data.errorHandling?.fallback ? 'fallback' : '',
          data.errorHandling?.errorResponse ? `error(${data.errorHandling.errorResponse.status})` : '',
        ].filter(Boolean).join(', ') || undefined}
        onEdit={() => useStudioStore.getState().openFlowEditor('errorHandling')}
        onClear={() => onChange({ errorHandling: undefined })}
      />
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

// Button that opens a modal editor for a flow block
function FlowBlockButton({
  title,
  color,
  isActive,
  summary,
  onEdit,
  onClear,
}: {
  title: string
  color: string
  isActive: boolean
  summary?: string
  onEdit: () => void
  onClear: () => void
}) {
  const c = blockColors[color] || blockColors.amber

  return (
    <div className={`border rounded-md ${isActive ? `${c.border} ${c.bg}` : 'border-neutral-700/50'}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center gap-2 text-xs text-left"
        >
          <Pencil className="w-3 h-3 text-neutral-500" />
          <span className={`font-medium ${isActive ? c.text : 'text-neutral-400'}`}>{title}</span>
          {isActive && summary && (
            <span className="text-neutral-500 truncate ml-1">{summary}</span>
          )}
          {!isActive && (
            <span className="text-neutral-600 italic">Click to configure</span>
          )}
        </button>
        {isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onClear() }}
            className="text-neutral-500 hover:text-red-400 shrink-0"
            title="Clear"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
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
          onChange={(e) => onChange({ label: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })}
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
          onChange={(e) => onChange({ label: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })}
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
  const inputClass = "w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white placeholder-neutral-500"

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Name</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => onChange({ label: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })}
          className={inputClass}
        />
        <p className="text-xs text-neutral-500 mt-1">Reference in flows with <code className="text-amber-400">use = [transform.{'{name}'}]</code></p>
      </div>

      <TransformPopupButton
        fields={data.fields}
        onSave={(fields) => onChange({ fields: fields || {} })}
        label="Field Mappings (CEL)"
      />
    </div>
  )
}

const aspectWhenOptions = [
  { value: 'before', label: 'Before', description: 'Run before the flow executes' },
  { value: 'after', label: 'After', description: 'Run after the flow completes successfully' },
  { value: 'around', label: 'Around', description: 'Wrap the flow (e.g., caching)' },
  { value: 'on_error', label: 'On Error', description: 'Run when the flow fails' },
]

// Simple glob matcher compatible with Go's filepath.Match
// Supports: * (any chars except separator), ? (single char), [...] (character class)
function globMatch(pattern: string, name: string): boolean {
  let pi = 0, ni = 0
  while (pi < pattern.length && ni < name.length) {
    const pc = pattern[pi]
    if (pc === '*') {
      // * matches any sequence of characters
      pi++
      if (pi === pattern.length) return true
      // Try matching rest of pattern against rest of name
      for (let k = ni; k <= name.length; k++) {
        if (globMatch(pattern.slice(pi), name.slice(k))) return true
      }
      return false
    } else if (pc === '?') {
      pi++
      ni++
    } else if (pc === '[') {
      // Character class
      const close = pattern.indexOf(']', pi + 1)
      if (close === -1) return false
      const negate = pattern[pi + 1] === '^' || pattern[pi + 1] === '!'
      const chars = pattern.slice(pi + (negate ? 2 : 1), close)
      const match = chars.includes(name[ni])
      if (negate ? match : !match) return false
      pi = close + 1
      ni++
    } else {
      if (pc !== name[ni]) return false
      pi++
      ni++
    }
  }
  // Consume trailing *
  while (pi < pattern.length && pattern[pi] === '*') pi++
  return pi === pattern.length && ni === name.length
}

function AspectProperties({
  data,
  onChange,
}: {
  data: AspectNodeData
  onChange: (data: Partial<AspectNodeData>) => void
}) {
  const inputClass = "w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
  const nodes = useStudioStore(s => s.nodes)

  // All flow names in the canvas
  const flowNames = useMemo(() => {
    return nodes
      .filter(n => n.type === 'flow')
      .map(n => (n.data as FlowNodeData).label)
      .map(label => label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))
      .filter(name => name.length > 0)
  }, [nodes])

  const patterns = data.on || []

  // For each pattern, compute which flows match
  const patternMatches = useMemo(() => {
    return patterns.map(pattern => {
      if (!pattern.trim()) return []
      return flowNames.filter(name => globMatch(pattern, name))
    })
  }, [patterns, flowNames])

  const updatePattern = (index: number, value: string) => {
    const newPatterns = [...patterns]
    newPatterns[index] = value
    onChange({ on: newPatterns })
  }

  const addPattern = () => onChange({ on: [...patterns, ''] })

  const removePattern = (index: number) => {
    onChange({ on: patterns.filter((_, i) => i !== index) })
  }


  // Action section
  const action = data.action || { connector: '', target: '' }
  const hasAction = !!data.action
  const actionMode: 'connector' | 'flow' = data.action?.flow ? 'flow' : 'connector'

  const updateAction = (updates: Partial<AspectNodeData['action']>) => {
    onChange({ action: { ...action, ...updates } })
  }

  const setActionMode = (mode: 'connector' | 'flow') => {
    if (mode === 'flow') {
      onChange({ action: { flow: '', transform: action.transform } })
    } else {
      onChange({ action: { connector: '', target: '', transform: action.transform } })
    }
  }

  // Action transform fields
  const actionFields = data.action?.transform || {}

  // Response section (v1.13.0, for after aspects)
  const hasResponse = !!data.response

  // Invalidation section
  const invalidate = data.invalidate
  const hasInvalidation = !!invalidate

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Name</label>
        <input type="text" value={data.label} onChange={(e) => onChange({ label: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })} className={inputClass} />
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
          <label className="text-xs font-medium text-neutral-400">Match Flows (by name, glob patterns)</label>
          <button onClick={addPattern} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
            <Plus className="w-3 h-3" /> Add Pattern
          </button>
        </div>
        <div className="space-y-2">
          {patterns.map((pattern, i) => {
            const matches = patternMatches[i] || []
            const isGlob = pattern.includes('*') || pattern.includes('?') || pattern.includes('[')
            const isValid = pattern.trim() === '' || matches.length > 0 || !isGlob
            const exactExists = !isGlob && pattern.trim() && flowNames.includes(pattern.trim())
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={pattern}
                    onChange={(e) => updatePattern(i, e.target.value)}
                    placeholder="create_* or exact_flow_name"
                    className={`flex-1 px-2 py-1.5 text-xs bg-neutral-800 border rounded text-white font-mono placeholder-neutral-500 ${
                      pattern.trim() && !isValid && !exactExists
                        ? 'border-yellow-500/50'
                        : 'border-neutral-700'
                    }`}
                  />
                  <button onClick={() => removePattern(i)} className="text-red-500 hover:text-red-400 p-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {/* Match results */}
                {pattern.trim() && isGlob && matches.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-1">
                    {matches.map(m => (
                      <span key={m} className="px-1.5 py-0.5 text-[10px] bg-green-500/10 border border-green-500/30 rounded text-green-400 font-mono">{m}</span>
                    ))}
                  </div>
                )}
                {pattern.trim() && isGlob && matches.length === 0 && (
                  <p className="text-[10px] text-yellow-500 pl-1">No flows match this pattern</p>
                )}
                {pattern.trim() && !isGlob && !exactExists && (
                  <p className="text-[10px] text-yellow-500 pl-1">Flow "{pattern}" not found in canvas</p>
                )}
              </div>
            )
          })}
          {patterns.length === 0 && (
            <p className="text-xs text-neutral-500 italic">No patterns. Aspect won't match any flows.</p>
          )}
        </div>

        {/* Quick-add: available flows */}
        {flowNames.length > 0 && (
          <div className="mt-2">
            <label className="text-[10px] text-neutral-500 mb-1 block">Available flows (click to add):</label>
            <div className="flex flex-wrap gap-1">
              {flowNames.map(name => {
                const alreadyMatched = patternMatches.some(matches => matches.includes(name))
                return (
                  <button
                    key={name}
                    onClick={() => onChange({ on: [...patterns, name] })}
                    disabled={alreadyMatched}
                    className={`px-1.5 py-0.5 text-[10px] rounded font-mono transition-colors ${
                      alreadyMatched
                        ? 'bg-green-500/10 border border-green-500/20 text-green-500/50 cursor-default'
                        : 'bg-neutral-700/50 border border-neutral-600/50 text-neutral-400 hover:text-indigo-300 hover:border-indigo-500/50 cursor-pointer'
                    }`}
                  >
                    {alreadyMatched ? '\u2713 ' : ''}{name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
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
              {/* Mode toggle: Connector vs Flow */}
              <div className="flex gap-1">
                <button
                  onClick={() => setActionMode('connector')}
                  className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                    actionMode === 'connector'
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                      : 'border-neutral-700 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Connector
                </button>
                <button
                  onClick={() => setActionMode('flow')}
                  className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                    actionMode === 'flow'
                      ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                      : 'border-neutral-700 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Flow
                </button>
              </div>

              {actionMode === 'connector' ? (
                <>
                  <select
                    value={action.connector || ''}
                    onChange={(e) => updateAction({ connector: e.target.value })}
                    className={inputClass + ' text-xs'}
                  >
                    <option value="">Select connector...</option>
                    {nodes
                      .filter(n => n.type === 'connector')
                      .map(n => {
                        const cd = n.data as ConnectorNodeData
                        const name = cd.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '')
                        return <option key={n.id} value={name}>{cd.label} ({cd.connectorType})</option>
                      })}
                  </select>
                  <input type="text" value={action.operation || ''} onChange={(e) => updateAction({ operation: e.target.value || undefined })} placeholder="operation (optional)" className={inputClass + ' text-xs font-mono'} />
                  <input type="text" value={action.target || ''} onChange={(e) => updateAction({ target: e.target.value || undefined })} placeholder="target (table, resource)" className={inputClass + ' text-xs'} />
                </>
              ) : (
                <>
                  <select
                    value={action.flow || ''}
                    onChange={(e) => updateAction({ flow: e.target.value })}
                    className={inputClass + ' text-xs'}
                  >
                    <option value="">Select flow...</option>
                    {flowNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-neutral-500">
                    The flow receives the transform output as its input. Errors are soft failures (warning logged, main flow unaffected).
                  </p>
                </>
              )}

              <TransformPopupButton
                fields={actionFields}
                onSave={(fields) => updateAction({ transform: fields })}
              />
            </div>
          )}
        </div>
      )}

      {/* Cache (for around) */}
      {data.when === 'around' && (
        <div className="p-3 bg-neutral-800/50 rounded-md space-y-2">
          <label className="text-xs font-medium text-neutral-400">Cache</label>
          <select
            value={data.cache?.storage || ''}
            onChange={(e) => onChange({ cache: { storage: e.target.value, key: data.cache?.key || '', ttl: data.cache?.ttl || '5m' } })}
            className={inputClass + ' text-xs'}
          >
            <option value="">Select cache connector...</option>
            {nodes
              .filter(n => n.type === 'connector' && (n.data as ConnectorNodeData).connectorType === 'cache')
              .map(n => {
                const cd = n.data as ConnectorNodeData
                const name = cd.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                return <option key={n.id} value={name}>{cd.label}</option>
              })}
          </select>
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
              <select
                value={invalidate!.storage || ''}
                onChange={(e) => onChange({ invalidate: { ...invalidate!, storage: e.target.value } })}
                className={inputClass + ' text-xs'}
              >
                <option value="">Select cache connector...</option>
                {nodes
                  .filter(n => n.type === 'connector' && (n.data as ConnectorNodeData).connectorType === 'cache')
                  .map(n => {
                    const cd = n.data as ConnectorNodeData
                    const name = cd.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                    return <option key={n.id} value={name}>{cd.label}</option>
                  })}
              </select>
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

      {/* Response enrichment (for after aspects, v1.13.0) */}
      {data.when === 'after' && (
        <div className="p-3 bg-neutral-800/50 rounded-md space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-400">Response Enrichment</label>
            {!hasResponse ? (
              <button onClick={() => onChange({ response: { fields: {} } })} className="text-xs text-green-400 hover:text-green-300">
                + Add
              </button>
            ) : (
              <button onClick={() => onChange({ response: undefined })} className="text-xs text-red-400 hover:text-red-300">
                Remove
              </button>
            )}
          </div>
          {hasResponse && (
            <div className="space-y-2">
              <p className="text-[10px] text-neutral-500">
                Inject fields into every response row. CEL expressions with <code className="text-amber-400">result.data</code>, <code className="text-amber-400">input.*</code>
              </p>
              <TransformPopupButton
                fields={data.response?.fields}
                onSave={(fields) => onChange({ response: { ...data.response, fields: fields || {} } })}
                label="Response Fields"
              />
              <div>
                <label className="block text-[10px] text-neutral-500 mb-1">Headers (key=value, one per line)</label>
                <textarea
                  value={data.response?.headers ? Object.entries(data.response.headers).map(([k, v]) => `${k}=${v}`).join('\n') : ''}
                  onChange={(e) => {
                    const headers: Record<string, string> = {}
                    e.target.value.split('\n').filter(l => l.trim()).forEach(line => {
                      const eqIdx = line.indexOf('=')
                      if (eqIdx > 0) {
                        headers[line.slice(0, eqIdx).trim()] = line.slice(eqIdx + 1).trim()
                      }
                    })
                    onChange({ response: { ...data.response, headers: Object.keys(headers).length > 0 ? headers : undefined } })
                  }}
                  placeholder="Deprecation=true&#10;Sunset=Thu, 01 Jun 2026"
                  rows={2}
                  className={inputClass + ' text-xs font-mono resize-none'}
                />
              </div>
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
        <input type="text" value={data.label} onChange={(e) => onChange({ label: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })} placeholder="create_order" className={inputClass} />
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
        <input type="text" value={data.label} onChange={(e) => onChange({ label: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })} placeholder="order_status" className={inputClass} />
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

// Popup for adding/editing an env variable
function EnvVarEditPopup({
  variable,
  isNew,
  onSave,
  onCancel,
}: {
  variable: EnvVariable
  isNew: boolean
  onSave: (v: EnvVariable) => void
  onCancel: () => void
}) {
  const [key, setKey] = useState(variable.key)
  const [val, setVal] = useState(variable.value)
  const [secret, setSecret] = useState(variable.secret ?? false)
  const [desc, setDesc] = useState(variable.description ?? '')
  const keyRef = useRef<HTMLInputElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isNew) keyRef.current?.focus()
  }, [isNew])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onCancel()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onCancel])

  const handleSave = () => {
    if (!key.trim()) return
    onSave({ key, value: val, secret, description: desc || undefined })
  }

  const inputClass = "w-full px-2 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-600"

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div ref={popupRef} className="w-80 border border-neutral-600 rounded-lg shadow-2xl p-4 space-y-3" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-200">{isNew ? 'Add Variable' : 'Edit Variable'}</span>
          <button onClick={onCancel} className="text-neutral-500 hover:text-neutral-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      <div>
        <label className="block text-xs text-neutral-500 mb-0.5">Name</label>
        <input
          ref={keyRef}
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
          placeholder="VAR_NAME"
          className={inputClass + ' font-mono'}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
      </div>
      <div>
        <label className="block text-xs text-neutral-500 mb-0.5">Value</label>
        <input
          type={secret ? 'password' : 'text'}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="value"
          className={inputClass}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
      </div>
      <div>
        <label className="block text-xs text-neutral-500 mb-0.5">Description (optional)</label>
        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="What this variable is for..."
          className={inputClass}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
      </div>
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer">
          <input
            type="checkbox"
            checked={secret}
            onChange={(e) => setSecret(e.target.checked)}
            className="w-3.5 h-3.5 text-amber-600 bg-neutral-800 border-neutral-600 rounded"
          />
          <Lock className="w-3 h-3" />
          Secret
        </label>
        <div className="flex gap-1.5">
          <button
            onClick={onCancel}
            className="px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-200 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            {isNew ? 'Add' : 'Save'}
          </button>
        </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function EnvProperties() {
  const { envConfig, updateEnvConfig, nodes, authConfig } = useStudioStore()
  const [activeTab, setActiveTab] = useState<'variables' | 'environments'>('variables')
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newVarName, setNewVarName] = useState('')

  // Scan for env() references in the project
  const allNodes = nodes.map(n => ({ data: n.data as Record<string, unknown> }))
  // Also scan auth config
  const authData = authConfig.enabled ? [{ data: authConfig as unknown as Record<string, unknown> }] : []
  const envRefs = scanEnvReferences([...allNodes, ...authData])

  // Find which refs are defined
  const definedKeys = new Set(envConfig.variables.map(v => v.key))
  const undefinedRefs = envRefs.filter(r => !definedKeys.has(r))

  const addVariable = (key?: string) => {
    if (key) {
      const newVar: EnvVariable = { key, value: '', secret: false }
      updateEnvConfig({ variables: [...envConfig.variables, newVar] })
      // Open editor for the newly added var
      const newIndex = envConfig.variables.length
      setEditingIndex(newIndex)
      setIsAdding(true)
    }
  }

  const handleQuickAdd = () => {
    if (!newVarName.trim()) return
    const newVar: EnvVariable = { key: newVarName.trim(), value: '', secret: false }
    updateEnvConfig({ variables: [...envConfig.variables, newVar] })
    const newIndex = envConfig.variables.length
    setNewVarName('')
    // Open edit popup for the new variable so user can set value
    setEditingIndex(newIndex)
    setIsAdding(true)
  }

  const handleSaveEdit = (index: number, v: EnvVariable) => {
    const updated = envConfig.variables.map((existing, i) =>
      i === index ? v : existing
    )
    updateEnvConfig({ variables: updated })
    setEditingIndex(null)
  }

  const removeVariable = (index: number) => {
    updateEnvConfig({ variables: envConfig.variables.filter((_, i) => i !== index) })
    setEditingIndex(null)
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

          {/* Add input — IntelliJ watch style, always visible at top */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newVarName}
              onChange={(e) => setNewVarName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newVarName.trim()) {
                  handleQuickAdd()
                }
              }}
              placeholder="NEW_VARIABLE"
              className="flex-1 px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-white font-mono placeholder-neutral-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={handleQuickAdd}
              disabled={!newVarName.trim()}
              className="p-1 text-neutral-500 hover:text-green-400 disabled:text-neutral-700 disabled:hover:text-neutral-700 transition-colors"
              title="Add variable (Enter)"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Variable list — compact names */}
          <div className="space-y-0.5">
            {envConfig.variables.map((v, i) => (
              <div key={i} className="flex items-center gap-1 group px-2 py-1 rounded hover:bg-neutral-800/60">
                <span className="flex-1 text-xs font-mono text-neutral-200 truncate" title={v.description || `env("${v.key}")`}>
                  {v.key}
                </span>
                {v.secret && <span title="Secret"><Lock className="w-3 h-3 text-amber-500 flex-shrink-0" /></span>}
                <button
                  onClick={() => { setEditingIndex(i); setIsAdding(true) }}
                  className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-neutral-300 flex-shrink-0 transition-opacity"
                  title="Edit"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => removeVariable(i)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 flex-shrink-0 transition-opacity"
                  title="Remove"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {envConfig.variables.length === 0 && (
            <p className="text-xs text-neutral-600 text-center py-2">Type a name above and press Enter</p>
          )}

          {/* Modal popup for editing */}
          {isAdding && editingIndex !== null && (
            <EnvVarEditPopup
              variable={envConfig.variables[editingIndex]}
              isNew={false}
              onSave={(updated) => handleSaveEdit(editingIndex, updated)}
              onCancel={() => { setIsAdding(false); setEditingIndex(null) }}
            />
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
  // Auto-save is always on (IntelliJ-style)
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

      {/* Auto-save is always on (IntelliJ-style: saves on focus loss) */}

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

      <div className="pt-2 border-t border-neutral-800">
        <p className="text-xs text-neutral-500">Select a node to edit its properties</p>
      </div>
    </div>
  )
}

export default function Properties() {
  const { nodes, selectedNodeId, updateNode, removeNode } = useStudioStore()
  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const width = useLayoutStore(s => s.rightWidth)
  const setWidth = useLayoutStore(s => s.setRightWidth)
  const collapsed = useLayoutStore(s => s.rightCollapsed)
  const setCollapsed = useLayoutStore(s => s.setRightCollapsed)
  const [isResizing, setIsResizing] = useState(false)
  const [envSplit, setEnvSplit] = useState(30) // percentage for env panel
  const [isSplitResizing, setIsSplitResizing] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const startX = e.clientX
    const startWidth = width

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth - (e.clientX - startX)
      setWidth(Math.max(280, Math.min(600, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [width])

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsSplitResizing(true)

    const container = (e.target as HTMLElement).closest('[data-properties-container]')
    if (!container) return
    const containerRect = container.getBoundingClientRect()

    const handleMouseMove = (e: MouseEvent) => {
      const relY = e.clientY - containerRect.top
      const pct = ((containerRect.height - relY) / containerRect.height) * 100
      setEnvSplit(Math.max(15, Math.min(60, pct)))
    }

    const handleMouseUp = () => {
      setIsSplitResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  const handleChange = selectedNode
    ? (data: Partial<ConnectorNodeData | FlowNodeData>) => { updateNode(selectedNode.id, data) }
    : undefined

  const renderContent = () => {
    if (!selectedNode) return <ServiceProperties />
    return (
      <>
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
          <ConnectorProperties data={selectedNode.data as ConnectorNodeData} onChange={handleChange!} />
        )}
        {selectedNode.type === 'flow' && (
          <FlowProperties data={selectedNode.data as FlowNodeData} nodeId={selectedNode.id} onChange={handleChange!} />
        )}
        {selectedNode.type === 'type' && (
          <TypeProperties data={selectedNode.data as TypeNodeData} onChange={handleChange!} />
        )}
        {selectedNode.type === 'validator' && (
          <ValidatorProperties data={selectedNode.data as ValidatorNodeData} onChange={handleChange!} />
        )}
        {selectedNode.type === 'transform' && (
          <TransformProperties data={selectedNode.data as TransformNodeData} onChange={handleChange!} />
        )}
        {selectedNode.type === 'aspect' && (
          <AspectProperties data={selectedNode.data as AspectNodeData} onChange={handleChange!} />
        )}
        {selectedNode.type === 'saga' && (
          <SagaProperties data={selectedNode.data as SagaNodeData} onChange={handleChange!} />
        )}
        {selectedNode.type === 'state_machine' && (
          <StateMachineProperties data={selectedNode.data as StateMachineNodeData} onChange={handleChange!} />
        )}
      </>
    )
  }

  return (
    <div className="relative flex-shrink-0 h-full">
      {/* Collapse toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`absolute top-5 z-20 flex items-center justify-center bg-neutral-800 border border-neutral-700 hover:bg-indigo-600 hover:border-indigo-500 transition-all shadow-lg ${
          collapsed
            ? 'right-0 w-5 h-8 rounded-l-md border-r-0'
            : '-left-3 w-6 h-6 rounded-full'
        }`}
      >
        {collapsed ? <ChevronLeft className="w-3 h-3 text-neutral-300" /> : <ChevronRightIcon className="w-3 h-3 text-neutral-300" />}
      </button>

      <div
        style={{ width: collapsed ? 0 : width }}
        className={`bg-neutral-900 border-l border-neutral-800 overflow-hidden h-full transition-[width] duration-200 ease-in-out ${isResizing || isSplitResizing ? 'select-none transition-none' : ''}`}
      >
        <div style={{ width }} className="flex flex-col h-full" data-properties-container>
          {/* Properties section — top */}
          <div className="overflow-y-auto p-4" style={{ flex: `0 0 ${100 - envSplit}%` }}>
            {renderContent()}
          </div>

          {/* Horizontal resize handle between sections */}
          <div
            className="flex-shrink-0 h-1 cursor-ns-resize hover:bg-indigo-500/50 bg-neutral-800 transition-colors"
            onMouseDown={handleSplitMouseDown}
          />

          {/* Environment Variables section — bottom */}
          <div className="overflow-y-auto p-4" style={{ flex: `0 0 ${envSplit}%` }}>
            <EnvProperties />
          </div>
        </div>
      </div>

      {/* Resize handle (hidden when collapsed) */}
      {!collapsed && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-indigo-500/50 transition-colors"
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  )
}
