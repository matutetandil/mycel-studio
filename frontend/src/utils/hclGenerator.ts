import type { Node, Edge } from '@xyflow/react'
import type { ConnectorNodeData, FlowNodeData, FlowTo, ServiceConfig, TypeNodeData, TypeFieldDefinition, ValidatorNodeData, TransformNodeData, AspectNodeData, SagaNodeData, SagaAction, StateMachineNodeData, AuthConfig, EnvironmentConfig, SecurityConfig, PluginConfig } from '../types'
import { getConnector, getConnectorMode } from '../connectors'
import { getSimpleFlowBlocks } from '../flow-blocks'

type StudioNode = Node<ConnectorNodeData | FlowNodeData | TypeNodeData | ValidatorNodeData | TransformNodeData | AspectNodeData | SagaNodeData | StateMachineNodeData>

export interface GeneratedFile {
  path: string
  name: string
  content: string
}

export interface GeneratedProject {
  files: GeneratedFile[]
  errors: string[]
}

// Convert label to valid HCL identifier
export function toIdentifier(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

function generateConnectorHCL(node: StudioNode): string {
  const data = node.data as ConnectorNodeData
  const name = toIdentifier(data.label)
  const lines: string[] = []
  const config = data.config || {}
  const def = getConnector(data.connectorType)

  const mode = getConnectorMode(data.connectorType, data.direction)

  lines.push(`# ${data.label} connector`)
  lines.push(`connector "${name}" {`)
  lines.push(`  type = "${data.connectorType}"`)

  if (mode) {
    lines.push(`  mode = "${mode}"`)
  }

  // Output driver if present
  if (config.driver) {
    lines.push(`  driver = "${config.driver}"`)
  }

  // Collect all field definitions (common + driver-specific)
  const allFields = [...(def?.fields || [])]
  if (def?.drivers && config.driver) {
    const driverDef = def.drivers.find(d => d.value === config.driver)
    if (driverDef) {
      allFields.push(...driverDef.fields)
    }
  }

  // Generate HCL for each field that has a value
  for (const field of allFields) {
    const value = config[field.key]
    if (value === undefined || value === null || value === '') continue

    // Special handling for booleans
    if (field.type === 'boolean') {
      if (field.key === 'cors') {
        // CORS is a complex object, not a simple boolean
        lines.push('')
        lines.push('  cors {')
        lines.push('    origins = ["*"]')
        lines.push('    methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]')
        lines.push('  }')
      } else if (value) {
        lines.push(`  ${field.key} = true`)
      }
      continue
    }

    // Special handling for comma-separated lists that should become HCL arrays
    if (field.key === 'brokers' || field.key === 'channels' || field.key === 'patterns' || field.key === 'scopes') {
      const items = String(value).split(',').map(s => `"${s.trim()}"`)
      lines.push(`  ${field.key} = [${items.join(', ')}]`)
      continue
    }

    // Numbers
    if (field.type === 'number') {
      lines.push(`  ${field.key} = ${value}`)
      continue
    }

    // Strings (default)
    lines.push(`  ${field.key} = "${value}"`)
  }

  lines.push('}')

  return lines.join('\n')
}

function generateToBlock(to: FlowTo, indent: string): string[] {
  const lines: string[] = []
  lines.push(`${indent}to {`)
  lines.push(`${indent}  connector = "${to.connector}"`)
  if (to.target) lines.push(`${indent}  target    = "${to.target}"`)
  if (to.operation) lines.push(`${indent}  operation = "${to.operation}"`)
  if (to.exchange) lines.push(`${indent}  exchange  = "${to.exchange}"`)
  if (to.when) lines.push(`${indent}  when      = "${to.when}"`)
  if (to.parallel === false) lines.push(`${indent}  parallel  = false`)
  if (to.transform && Object.keys(to.transform).length > 0) {
    lines.push('')
    lines.push(`${indent}  transform {`)
    for (const [key, value] of Object.entries(to.transform)) {
      lines.push(`${indent}    ${key} = "${value}"`)
    }
    lines.push(`${indent}  }`)
  }
  lines.push(`${indent}}`)
  return lines
}

function generateFlowHCL(
  node: StudioNode,
  edges: Edge[],
  nodesMap: Map<string, StudioNode>
): string {
  const data = node.data as FlowNodeData
  const name = toIdentifier(data.label)
  const lines: string[] = []

  // Find connected nodes
  const incomingEdge = edges.find((e) => e.target === node.id)
  const outgoingEdges = edges.filter((e) => e.source === node.id)

  const fromNode = incomingEdge ? nodesMap.get(incomingEdge.source) : null

  lines.push(`# ${data.label}`)
  lines.push(`flow "${name}" {`)

  // Schedule (when)
  if (data.when) {
    lines.push(`  when = "${data.when}"`)
    lines.push('')
  }

  // From block
  if (fromNode && fromNode.type === 'connector') {
    const fromData = fromNode.data as ConnectorNodeData
    const connectorName = toIdentifier(fromData.label)
    lines.push('  from {')
    lines.push(`    connector = "${connectorName}"`)
    if (data.from?.operation) {
      lines.push(`    operation = "${data.from.operation}"`)
    }
    // Filter
    if (data.from?.filter) {
      if (typeof data.from.filter === 'string') {
        lines.push(`    filter    = "${data.from.filter}"`)
      } else {
        lines.push('')
        lines.push('    filter {')
        lines.push(`      condition = "${data.from.filter.condition}"`)
        if (data.from.filter.onReject) lines.push(`      on_reject = "${data.from.filter.onReject}"`)
        if (data.from.filter.idField) lines.push(`      id_field  = "${data.from.filter.idField}"`)
        if (data.from.filter.maxRequeue) lines.push(`      max_requeue = ${data.from.filter.maxRequeue}`)
        lines.push('    }')
      }
    }
    lines.push('  }')
  }

  // Simple blocks (dedupe, cache, lock, semaphore) — driven by registry
  for (const blockDef of getSimpleFlowBlocks()) {
    const blockData = data[blockDef.dataKey] as Record<string, unknown> | undefined
    if (!blockData || !blockDef.hclFields) continue

    lines.push('')
    lines.push(`  ${blockDef.hclBlock} {`)
    for (const mapping of blockDef.hclFields) {
      const value = blockData[mapping.key]
      if (value === undefined || value === null || value === '') continue
      if (mapping.omitDefault !== undefined && value === mapping.omitDefault) continue

      if (mapping.type === 'boolean') {
        lines.push(`    ${mapping.hclKey} = ${value}`)
      } else if (mapping.type === 'number') {
        lines.push(`    ${mapping.hclKey} = ${value}`)
      } else {
        lines.push(`    ${mapping.hclKey} = "${value}"`)
      }
    }
    lines.push('  }')
  }

  // Step blocks
  if (data.steps && data.steps.length > 0) {
    for (const step of data.steps) {
      lines.push('')
      lines.push(`  step "${step.name}" {`)
      lines.push(`    connector = "${step.connector}"`)
      if (step.operation) lines.push(`    operation = "${step.operation}"`)
      if (step.query) lines.push(`    query     = "${step.query}"`)
      if (step.target) lines.push(`    target    = "${step.target}"`)
      if (step.when) lines.push(`    when      = "${step.when}"`)
      if (step.timeout) lines.push(`    timeout   = "${step.timeout}"`)
      if (step.onError && step.onError !== 'fail') {
        lines.push(`    on_error  = "${step.onError}"`)
      }
      if (step.params && Object.keys(step.params).length > 0) {
        lines.push(`    params    = [${Object.values(step.params).join(', ')}]`)
      }
      if (step.onError === 'default' && step.default && Object.keys(step.default).length > 0) {
        lines.push('    default {')
        for (const [key, value] of Object.entries(step.default)) {
          lines.push(`      ${key} = "${value}"`)
        }
        lines.push('    }')
      }
      lines.push('  }')
    }
  }

  // Enrich blocks (legacy, still supported)
  if (data.enrich && data.enrich.length > 0 && (!data.steps || data.steps.length === 0)) {
    for (const enrich of data.enrich) {
      lines.push('')
      lines.push(`  enrich "${enrich.name}" {`)
      lines.push(`    connector = "${enrich.connector}"`)
      lines.push(`    operation = "${enrich.operation}"`)
      if (enrich.params && Object.keys(enrich.params).length > 0) {
        lines.push('    params {')
        for (const [key, value] of Object.entries(enrich.params)) {
          lines.push(`      ${key} = "${value}"`)
        }
        lines.push('    }')
      }
      lines.push('  }')
    }
  }

  // Transform block
  if (data.transform?.fields && Object.keys(data.transform.fields).length > 0) {
    lines.push('')
    lines.push('  transform {')
    if (data.transform.use && data.transform.use.length > 0) {
      lines.push(`    use = [${data.transform.use.map(u => `"${u}"`).join(', ')}]`)
    }
    for (const [key, value] of Object.entries(data.transform.fields)) {
      lines.push(`    ${key} = "${value}"`)
    }
    lines.push('  }')
  }

  // Batch block
  if (data.batch) {
    const b = data.batch
    lines.push('')
    lines.push('  batch {')
    lines.push(`    source     = "${b.source}"`)
    lines.push(`    query      = "${b.query}"`)
    if (b.chunkSize && b.chunkSize !== 100) {
      lines.push(`    chunk_size = ${b.chunkSize}`)
    }
    if (b.onError && b.onError !== 'stop') {
      lines.push(`    on_error   = "${b.onError}"`)
    }
    if (b.params && Object.keys(b.params).length > 0) {
      lines.push(`    params     = { ${Object.entries(b.params).map(([k, v]) => `${k} = "${v}"`).join(', ')} }`)
    }
    if (b.transform && Object.keys(b.transform).length > 0) {
      lines.push('')
      lines.push('    transform {')
      for (const [key, value] of Object.entries(b.transform)) {
        lines.push(`      ${key} = "${value}"`)
      }
      lines.push('    }')
    }
    lines.push('')
    lines.push('    to {')
    lines.push(`      connector = "${b.to.connector}"`)
    if (b.to.target) lines.push(`      target    = "${b.to.target}"`)
    if (b.to.operation) lines.push(`      operation = "${b.to.operation}"`)
    lines.push('    }')
    lines.push('  }')
  }

  // To blocks (multi-to support)
  const toTargets: FlowTo[] = data.to
    ? Array.isArray(data.to)
      ? data.to
      : [data.to]
    : []

  if (toTargets.length > 0) {
    // Use edge-connected nodes for to blocks
    for (let i = 0; i < toTargets.length; i++) {
      const to = toTargets[i]
      const toEdge = outgoingEdges[i]
      const toNode = toEdge ? nodesMap.get(toEdge.target) : null

      lines.push('')
      if (toNode && toNode.type === 'connector') {
        const toData = toNode.data as ConnectorNodeData
        const connectorName = toIdentifier(toData.label)
        const mergedTo = { ...to, connector: connectorName }
        lines.push(...generateToBlock(mergedTo, '  '))
      } else if (to.connector) {
        lines.push(...generateToBlock(to, '  '))
      }
    }
  } else {
    // Fallback: use edges to find connected output nodes
    for (const edge of outgoingEdges) {
      const toNode = nodesMap.get(edge.target)
      if (toNode && toNode.type === 'connector') {
        const toData = toNode.data as ConnectorNodeData
        const connectorName = toIdentifier(toData.label)
        lines.push('')
        lines.push('  to {')
        lines.push(`    connector = "${connectorName}"`)
        lines.push('  }')
      }
    }
  }

  // Response block (CEL transforms applied after destination)
  if (data.response && Object.keys(data.response.fields || {}).length > 0) {
    lines.push('')
    lines.push('  response {')
    for (const [key, value] of Object.entries(data.response.fields)) {
      lines.push(`    ${key} = "${value}"`)
    }
    if (data.response.httpStatusCode) {
      lines.push(`    http_status_code = "${data.response.httpStatusCode}"`)
    }
    if (data.response.grpcStatusCode) {
      lines.push(`    grpc_status_code = "${data.response.grpcStatusCode}"`)
    }
    lines.push('  }')
  }

  // Error handling block
  if (data.errorHandling) {
    const eh = data.errorHandling
    const hasRetry = !!eh.retry
    const hasFallback = !!eh.fallback
    const hasErrorResponse = !!eh.errorResponse

    if (hasRetry || hasFallback || hasErrorResponse) {
      lines.push('')
      lines.push('  error_handling {')

      if (hasRetry) {
        lines.push('    retry {')
        lines.push(`      attempts  = ${eh.retry!.attempts}`)
        lines.push(`      delay     = "${eh.retry!.delay}"`)
        if (eh.retry!.maxDelay) lines.push(`      max_delay = "${eh.retry!.maxDelay}"`)
        if (eh.retry!.backoff) lines.push(`      backoff   = "${eh.retry!.backoff}"`)
        lines.push('    }')
      }

      if (hasFallback) {
        if (hasRetry) lines.push('')
        lines.push('    fallback {')
        lines.push(`      connector     = "${eh.fallback!.connector}"`)
        lines.push(`      target        = "${eh.fallback!.target}"`)
        if (eh.fallback!.includeError !== undefined) {
          lines.push(`      include_error = ${eh.fallback!.includeError}`)
        }
        if (eh.fallback!.transform && Object.keys(eh.fallback!.transform).length > 0) {
          lines.push('')
          lines.push('      transform {')
          for (const [key, value] of Object.entries(eh.fallback!.transform)) {
            lines.push(`        ${key} = "${value}"`)
          }
          lines.push('      }')
        }
        lines.push('    }')
      }

      if (hasErrorResponse) {
        if (hasRetry || hasFallback) lines.push('')
        lines.push('    error_response {')
        lines.push(`      status = ${eh.errorResponse!.status}`)
        if (eh.errorResponse!.headers && Object.keys(eh.errorResponse!.headers).length > 0) {
          lines.push(`      headers = {`)
          for (const [key, value] of Object.entries(eh.errorResponse!.headers)) {
            lines.push(`        "${key}" = "${value}"`)
          }
          lines.push('      }')
        }
        if (eh.errorResponse!.body && Object.keys(eh.errorResponse!.body).length > 0) {
          lines.push('')
          lines.push('      body {')
          for (const [key, value] of Object.entries(eh.errorResponse!.body)) {
            lines.push(`        ${key} = "${value}"`)
          }
          lines.push('      }')
        }
        lines.push('    }')
      }

      lines.push('  }')
    }
  }

  lines.push('}')

  return lines.join('\n')
}

function generateTypeFieldHCL(name: string, field: TypeFieldDefinition, indent: string): string[] {
  const lines: string[] = []
  const constraints: string[] = []

  // Required (only emit if false, since default is true)
  if (field.required === false) {
    constraints.push(`${indent}    required = false`)
  }

  if (field.type === 'string') {
    if (field.format) constraints.push(`${indent}    format = "${field.format}"`)
    if (field.minLength != null) constraints.push(`${indent}    min_length = ${field.minLength}`)
    if (field.maxLength != null) constraints.push(`${indent}    max_length = ${field.maxLength}`)
    if (field.pattern) constraints.push(`${indent}    pattern = "${field.pattern}"`)
    if (field.enum && field.enum.length > 0) {
      constraints.push(`${indent}    enum = [${field.enum.map(v => `"${v}"`).join(', ')}]`)
    }
    if (field.validate) constraints.push(`${indent}    validate = "${field.validate}"`)
  }

  if (field.type === 'number') {
    if (field.min != null) constraints.push(`${indent}    min = ${field.min}`)
    if (field.max != null) constraints.push(`${indent}    max = ${field.max}`)
  }

  if (constraints.length > 0) {
    lines.push(`${indent}  ${name} = ${field.type} {`)
    lines.push(...constraints)
    lines.push(`${indent}  }`)
  } else {
    lines.push(`${indent}  ${name} = ${field.type}`)
  }

  return lines
}

function generateTypeHCL(node: StudioNode): string {
  const data = node.data as TypeNodeData
  const name = toIdentifier(data.label)
  const lines: string[] = []

  lines.push(`# ${data.label} type`)
  lines.push(`type "${name}" {`)

  for (const [fieldName, field] of Object.entries(data.fields || {})) {
    lines.push(...generateTypeFieldHCL(fieldName, field, ''))
  }

  lines.push('}')
  return lines.join('\n')
}

function generateValidatorHCL(node: StudioNode): string {
  const data = node.data as ValidatorNodeData
  const name = toIdentifier(data.label)
  const lines: string[] = []

  lines.push(`# ${data.label} validator`)
  lines.push(`validator "${name}" {`)
  lines.push(`  type    = "${data.validatorType}"`)

  if (data.validatorType === 'regex' && data.pattern) {
    lines.push(`  pattern = "${data.pattern}"`)
  }

  if (data.validatorType === 'cel' && data.expr) {
    lines.push(`  expr    = "${data.expr}"`)
  }

  if (data.validatorType === 'wasm') {
    if (data.module) lines.push(`  wasm       = "${data.module}"`)
    if (data.function) lines.push(`  entrypoint = "${data.function}"`)
  }

  if (data.message) {
    lines.push(`  message = "${data.message}"`)
  }

  lines.push('}')
  return lines.join('\n')
}

function generateNamedTransformHCL(node: StudioNode): string {
  const data = node.data as TransformNodeData
  const name = toIdentifier(data.label)
  const lines: string[] = []

  lines.push(`# ${data.label} transform`)
  lines.push(`transform "${name}" {`)
  for (const [key, value] of Object.entries(data.fields || {})) {
    if (value) {
      lines.push(`  ${key} = "${value}"`)
    }
  }
  lines.push('}')
  return lines.join('\n')
}

function generateAspectHCL(node: StudioNode): string {
  const data = node.data as AspectNodeData
  const name = toIdentifier(data.label)
  const lines: string[] = []

  lines.push(`# ${data.label} aspect`)
  lines.push(`aspect "${name}" {`)

  if (data.on && data.on.length > 0) {
    lines.push(`  on   = [${data.on.map(p => `"${p}"`).join(', ')}]`)
  }
  lines.push(`  when = "${data.when}"`)

  if (data.condition) {
    lines.push(`  if   = "${data.condition}"`)
  }
  if (data.priority != null) {
    lines.push(`  priority = ${data.priority}`)
  }

  // Action block
  if (data.action) {
    lines.push('')
    lines.push('  action {')
    lines.push(`    connector = "${data.action.connector}"`)
    if (data.action.target) lines.push(`    target    = "${data.action.target}"`)
    if (data.action.transform && Object.keys(data.action.transform).length > 0) {
      lines.push('')
      lines.push('    transform {')
      for (const [key, value] of Object.entries(data.action.transform)) {
        lines.push(`      ${key} = "${value}"`)
      }
      lines.push('    }')
    }
    lines.push('  }')
  }

  // Cache block (for around aspects)
  if (data.cache) {
    lines.push('')
    lines.push('  cache {')
    lines.push(`    storage = "${data.cache.storage}"`)
    if (data.cache.key) lines.push(`    key     = "${data.cache.key}"`)
    if (data.cache.ttl) lines.push(`    ttl     = "${data.cache.ttl}"`)
    lines.push('  }')
  }

  // Invalidation block
  if (data.invalidate) {
    lines.push('')
    lines.push('  invalidate {')
    lines.push(`    storage = "${data.invalidate.storage}"`)
    if (data.invalidate.keys && data.invalidate.keys.length > 0) {
      lines.push(`    keys    = [${data.invalidate.keys.map(k => `"${k}"`).join(', ')}]`)
    }
    if (data.invalidate.patterns && data.invalidate.patterns.length > 0) {
      lines.push(`    patterns = [${data.invalidate.patterns.map(p => `"${p}"`).join(', ')}]`)
    }
    lines.push('  }')
  }

  lines.push('}')
  return lines.join('\n')
}

function generateSagaActionHCL(action: SagaAction, indent: string): string[] {
  const lines: string[] = []
  lines.push(`${indent}connector = "${action.connector}"`)
  if (action.operation) lines.push(`${indent}operation = "${action.operation}"`)
  if (action.target) lines.push(`${indent}target    = "${action.target}"`)
  if (action.query) lines.push(`${indent}query     = "${action.query}"`)
  if (action.body && Object.keys(action.body).length > 0) {
    lines.push(`${indent}body = {`)
    for (const [key, value] of Object.entries(action.body)) {
      lines.push(`${indent}  ${key} = "${value}"`)
    }
    lines.push(`${indent}}`)
  }
  if (action.data && Object.keys(action.data).length > 0) {
    lines.push(`${indent}data = {`)
    for (const [key, value] of Object.entries(action.data)) {
      lines.push(`${indent}  ${key} = "${value}"`)
    }
    lines.push(`${indent}}`)
  }
  if (action.set && Object.keys(action.set).length > 0) {
    lines.push(`${indent}set = {`)
    for (const [key, value] of Object.entries(action.set)) {
      lines.push(`${indent}  ${key} = "${value}"`)
    }
    lines.push(`${indent}}`)
  }
  if (action.where && Object.keys(action.where).length > 0) {
    lines.push(`${indent}where = {`)
    for (const [key, value] of Object.entries(action.where)) {
      lines.push(`${indent}  ${key} = "${value}"`)
    }
    lines.push(`${indent}}`)
  }
  return lines
}

function generateSagaHCL(node: StudioNode): string {
  const data = node.data as SagaNodeData
  const name = toIdentifier(data.label)
  const lines: string[] = []

  lines.push(`# ${data.label} saga`)
  lines.push(`saga "${name}" {`)

  if (data.timeout) {
    lines.push(`  timeout = "${data.timeout}"`)
  }

  // From block
  if (data.from) {
    lines.push('')
    lines.push('  from {')
    lines.push(`    connector = "${data.from.connector}"`)
    if (data.from.operation) lines.push(`    operation = "${data.from.operation}"`)
    lines.push('  }')
  }

  // Steps
  for (const step of data.steps || []) {
    lines.push('')
    lines.push(`  step "${step.name}" {`)

    if (step.delay) {
      lines.push(`    delay = "${step.delay}"`)
    } else if (step.await) {
      lines.push(`    await = "${step.await}"`)
    } else {
      // Action
      if (step.action) {
        lines.push('    action {')
        lines.push(...generateSagaActionHCL(step.action, '      '))
        lines.push('    }')
      }
      // Compensate
      if (step.compensate) {
        lines.push('')
        lines.push('    compensate {')
        lines.push(...generateSagaActionHCL(step.compensate, '      '))
        lines.push('    }')
      }
    }

    if (step.onError && step.onError !== 'fail') {
      lines.push(`    on_error = "${step.onError}"`)
    }
    if (step.timeout) {
      lines.push(`    timeout  = "${step.timeout}"`)
    }

    lines.push('  }')
  }

  // on_complete
  if (data.onComplete) {
    lines.push('')
    lines.push('  on_complete {')
    lines.push(...generateSagaActionHCL(data.onComplete, '    '))
    lines.push('  }')
  }

  // on_failure
  if (data.onFailure) {
    lines.push('')
    lines.push('  on_failure {')
    lines.push(...generateSagaActionHCL(data.onFailure, '    '))
    lines.push('  }')
  }

  lines.push('}')
  return lines.join('\n')
}

function generateStateMachineHCL(node: StudioNode): string {
  const data = node.data as StateMachineNodeData
  const name = toIdentifier(data.label)
  const lines: string[] = []

  lines.push(`# ${data.label} state machine`)
  lines.push(`state_machine "${name}" {`)
  lines.push(`  initial = "${data.initial}"`)

  for (const state of data.states || []) {
    lines.push('')
    lines.push(`  state "${state.name}" {`)

    if (state.final) {
      lines.push('    final = true')
    }

    for (const trans of state.transitions || []) {
      lines.push('')
      lines.push(`    on "${trans.event}" {`)
      lines.push(`      transition_to = "${trans.transitionTo}"`)
      if (trans.guard) {
        lines.push(`      guard         = "${trans.guard}"`)
      }
      if (trans.action) {
        lines.push('')
        lines.push('      action {')
        lines.push(...generateSagaActionHCL(trans.action, '        '))
        lines.push('      }')
      }
      lines.push('    }')
    }

    lines.push('  }')
  }

  lines.push('}')
  return lines.join('\n')
}

function generatePluginHCL(config: PluginConfig): string {
  const lines: string[] = ['# Plugin configuration', '']

  for (const plugin of config.plugins) {
    if (!plugin.name || !plugin.source) continue
    lines.push(`plugin "${plugin.name}" {`)
    lines.push(`  source = "${plugin.source}"`)
    if (plugin.version) lines.push(`  version = "${plugin.version}"`)
    if (plugin.functions && plugin.functions.length > 0) {
      lines.push(`  functions = [${plugin.functions.map(f => `"${f}"`).join(', ')}]`)
    }
    lines.push('}')
    lines.push('')
  }

  return lines.join('\n')
}

function generateSecurityHCL(security: SecurityConfig): string {
  const lines: string[] = []

  lines.push('# Security configuration')
  lines.push('security {')

  if (security.maxInputLength && security.maxInputLength !== 1048576) {
    lines.push(`  max_input_length = ${security.maxInputLength}`)
  }
  if (security.maxFieldLength && security.maxFieldLength !== 65536) {
    lines.push(`  max_field_length = ${security.maxFieldLength}`)
  }
  if (security.maxFieldDepth && security.maxFieldDepth !== 20) {
    lines.push(`  max_field_depth  = ${security.maxFieldDepth}`)
  }
  if (security.allowedControlChars) {
    lines.push(`  allowed_control_chars = [${security.allowedControlChars.map(c => `"${c}"`).join(', ')}]`)
  }

  for (const sanitizer of security.sanitizers) {
    if (!sanitizer.name || !sanitizer.wasm) continue
    lines.push('')
    lines.push(`  sanitizer "${sanitizer.name}" {`)
    lines.push('    source     = "wasm"')
    lines.push(`    wasm       = "${sanitizer.wasm}"`)
    if (sanitizer.entrypoint && sanitizer.entrypoint !== 'sanitize') {
      lines.push(`    entrypoint = "${sanitizer.entrypoint}"`)
    }
    if (sanitizer.applyTo && sanitizer.applyTo.length > 0) {
      lines.push(`    apply_to   = [${sanitizer.applyTo.map(p => `"${p}"`).join(', ')}]`)
    }
    if (sanitizer.fields && sanitizer.fields.length > 0) {
      lines.push(`    fields     = [${sanitizer.fields.map(f => `"${f}"`).join(', ')}]`)
    }
    lines.push('  }')
  }

  lines.push('}')
  return lines.join('\n')
}

function generateAuthHCL(auth: AuthConfig): string {
  const lines: string[] = []

  lines.push('# Authentication configuration')
  lines.push('auth {')
  lines.push(`  preset = "${auth.preset}"`)

  // JWT
  lines.push('')
  lines.push('  jwt {')
  if (auth.jwt.secret) {
    lines.push(`    secret           = ${auth.jwt.secret.startsWith('env(') ? auth.jwt.secret : `"${auth.jwt.secret}"`}`)
  }
  lines.push(`    algorithm        = "${auth.jwt.algorithm}"`)
  lines.push(`    access_lifetime  = "${auth.jwt.accessLifetime}"`)
  lines.push(`    refresh_lifetime = "${auth.jwt.refreshLifetime}"`)
  if (auth.jwt.issuer) lines.push(`    issuer           = "${auth.jwt.issuer}"`)
  if (auth.jwt.audience && auth.jwt.audience.length > 0) {
    lines.push(`    audience         = [${auth.jwt.audience.map(a => `"${a}"`).join(', ')}]`)
  }
  if (auth.jwt.rotation) lines.push('    rotation         = true')
  lines.push('  }')

  // Password
  lines.push('')
  lines.push('  password {')
  lines.push(`    min_length      = ${auth.password.minLength}`)
  if (auth.password.maxLength) lines.push(`    max_length      = ${auth.password.maxLength}`)
  lines.push(`    require_upper   = ${auth.password.requireUpper}`)
  lines.push(`    require_lower   = ${auth.password.requireLower}`)
  lines.push(`    require_number  = ${auth.password.requireNumber}`)
  lines.push(`    require_special = ${auth.password.requireSpecial}`)
  if (auth.password.history) lines.push(`    history         = ${auth.password.history}`)
  if (auth.password.breachCheck) lines.push('    breach_check    = true')
  lines.push('  }')

  // MFA
  if (auth.mfa.required !== 'off') {
    lines.push('')
    lines.push('  mfa {')
    lines.push(`    required = "${auth.mfa.required}"`)
    if (auth.mfa.methods.length > 0) {
      lines.push(`    methods  = [${auth.mfa.methods.map(m => `"${m}"`).join(', ')}]`)
    }
    if (auth.mfa.methods.includes('totp') && auth.mfa.totpIssuer) {
      lines.push('')
      lines.push('    totp {')
      lines.push(`      issuer = "${auth.mfa.totpIssuer}"`)
      lines.push('    }')
    }
    if (auth.mfa.recoveryCodes !== false) {
      lines.push('')
      lines.push('    recovery_codes {')
      lines.push('      enabled = true')
      if (auth.mfa.recoveryCount) lines.push(`      count   = ${auth.mfa.recoveryCount}`)
      lines.push('    }')
    }
    lines.push('  }')
  }

  // Sessions
  lines.push('')
  lines.push('  sessions {')
  lines.push(`    max_active     = ${auth.sessions.maxActive}`)
  lines.push(`    idle_timeout   = "${auth.sessions.idleTimeout}"`)
  if (auth.sessions.absoluteTimeout) {
    lines.push(`    absolute_timeout = "${auth.sessions.absoluteTimeout}"`)
  }
  lines.push(`    on_max_reached = "${auth.sessions.onMaxReached}"`)
  lines.push('  }')

  // Security
  if (auth.security.bruteForce || auth.security.replayProtection) {
    lines.push('')
    lines.push('  security {')
    if (auth.security.bruteForce) {
      lines.push('    brute_force {')
      lines.push('      enabled      = true')
      if (auth.security.bruteForceMaxAttempts) {
        lines.push(`      max_attempts = ${auth.security.bruteForceMaxAttempts}`)
      }
      if (auth.security.bruteForceWindow) {
        lines.push(`      window       = "${auth.security.bruteForceWindow}"`)
      }
      if (auth.security.bruteForceLockout) {
        lines.push(`      lockout_time = "${auth.security.bruteForceLockout}"`)
      }
      lines.push('    }')
    }
    if (auth.security.replayProtection) {
      if (auth.security.bruteForce) lines.push('')
      lines.push('    replay_protection {')
      lines.push('      enabled = true')
      lines.push('    }')
    }
    lines.push('  }')
  }

  // Social providers
  if (auth.socialProviders.length > 0) {
    lines.push('')
    lines.push('  social {')
    for (const sp of auth.socialProviders) {
      lines.push(`    ${sp.provider} {`)
      if (sp.clientId) {
        lines.push(`      client_id     = ${sp.clientId.startsWith('env(') ? sp.clientId : `"${sp.clientId}"`}`)
      }
      if (sp.clientSecret) {
        lines.push(`      client_secret = ${sp.clientSecret.startsWith('env(') ? sp.clientSecret : `"${sp.clientSecret}"`}`)
      }
      if (sp.scopes && sp.scopes.length > 0) {
        lines.push(`      scopes        = [${sp.scopes.map(s => `"${s}"`).join(', ')}]`)
      }
      lines.push('    }')
    }
    lines.push('  }')
  }

  // Storage
  lines.push('')
  lines.push('  storage {')
  lines.push(`    driver = "${auth.storage.tokenDriver}"`)
  if (auth.storage.tokenDriver === 'redis' && auth.storage.tokenAddress) {
    lines.push(`    address = "${auth.storage.tokenAddress}"`)
  }
  lines.push('  }')

  // Users storage
  if (auth.storage.usersConnector) {
    lines.push('')
    lines.push('  users {')
    lines.push(`    connector = "${auth.storage.usersConnector}"`)
    if (auth.storage.usersTable) {
      lines.push(`    table     = "${auth.storage.usersTable}"`)
    }
    lines.push('  }')
  }

  // Endpoints
  if (auth.endpointPrefix && auth.endpointPrefix !== '/auth') {
    lines.push('')
    lines.push('  endpoints {')
    lines.push(`    prefix = "${auth.endpointPrefix}"`)
    lines.push('  }')
  }

  lines.push('}')
  return lines.join('\n')
}

// Validate project - returns array of error messages
export function validateProject(nodes: StudioNode[]): string[] {
  const errors: string[] = []

  const connectorNodes = nodes.filter((n) => n.type === 'connector')
  const flowNodes = nodes.filter((n) => n.type === 'flow')

  // Validate unique ports
  const portUsage = new Map<number, string[]>()
  for (const node of connectorNodes) {
    const data = node.data as ConnectorNodeData
    const port = data.config?.port as number | undefined

    if (port) {
      const existing = portUsage.get(port) || []
      existing.push(data.label)
      portUsage.set(port, existing)
    }
  }

  for (const [port, connectors] of portUsage) {
    if (connectors.length > 1) {
      errors.push(`Port ${port} is used by multiple connectors: ${connectors.join(', ')}`)
    }
  }

  // Validate unique connector names
  const connectorNames = new Map<string, string[]>()
  for (const node of connectorNodes) {
    const data = node.data as ConnectorNodeData
    const name = toIdentifier(data.label)
    const existing = connectorNames.get(name) || []
    existing.push(data.label)
    connectorNames.set(name, existing)
  }

  for (const [name, labels] of connectorNames) {
    if (labels.length > 1) {
      errors.push(`Duplicate connector name "${name}": ${labels.join(', ')}`)
    }
  }

  // Validate unique flow names
  const flowNames = new Map<string, string[]>()
  for (const node of flowNodes) {
    const data = node.data as FlowNodeData
    const name = toIdentifier(data.label)
    const existing = flowNames.get(name) || []
    existing.push(data.label)
    flowNames.set(name, existing)
  }

  for (const [name, labels] of flowNames) {
    if (labels.length > 1) {
      errors.push(`Duplicate flow name "${name}": ${labels.join(', ')}`)
    }
  }

  return errors
}

// Generate project with multiple files
export function generateProject(nodes: StudioNode[], edges: Edge[], serviceConfig?: ServiceConfig, authConfig?: AuthConfig, envConfig?: EnvironmentConfig, securityConfig?: SecurityConfig, pluginConfig?: PluginConfig): GeneratedProject {
  const nodesMap = new Map(nodes.map((n) => [n.id, n]))
  const files: GeneratedFile[] = []
  const errors = validateProject(nodes)

  const connectorNodes = nodes.filter((n) => n.type === 'connector')
  const flowNodes = nodes.filter((n) => n.type === 'flow')
  const typeNodes = nodes.filter((n) => n.type === 'type')
  const validatorNodes = nodes.filter((n) => n.type === 'validator')
  const transformNodes = nodes.filter((n) => n.type === 'transform')
  const aspectNodes = nodes.filter((n) => n.type === 'aspect')
  const sagaNodes = nodes.filter((n) => n.type === 'saga')
  const stateMachineNodes = nodes.filter((n) => n.type === 'state_machine')

  const name = serviceConfig?.name || 'my-service'
  const version = serviceConfig?.version || '1.0.0'

  // Generate config.hcl
  const configLines = ['# Service configuration', 'service {', `  name    = "${name}"`, `  version = "${version}"`]
  if (serviceConfig?.workflow?.enabled) {
    const wf = serviceConfig.workflow
    configLines.push('')
    configLines.push('  workflow {')
    if (wf.storage) configLines.push(`    storage     = "${wf.storage}"`)
    configLines.push(`    table       = "${wf.table || 'mycel_workflows'}"`)
    if (wf.autoCreate !== false) configLines.push('    auto_create = true')
    configLines.push('  }')
  }
  configLines.push('}', '')
  files.push({
    path: 'config.hcl',
    name: 'config.hcl',
    content: configLines.join('\n')
  })

  // Generate auth file
  if (authConfig?.enabled) {
    files.push({
      path: 'auth/auth.hcl',
      name: 'auth.hcl',
      content: generateAuthHCL(authConfig) + '\n'
    })
  }

  // Generate security file
  if (securityConfig?.enabled) {
    files.push({
      path: 'security/security.hcl',
      name: 'security.hcl',
      content: generateSecurityHCL(securityConfig) + '\n'
    })
  }

  // Generate plugins file
  if (pluginConfig && pluginConfig.plugins.some(p => p.name && p.source)) {
    files.push({
      path: 'plugins/plugins.hcl',
      name: 'plugins.hcl',
      content: generatePluginHCL(pluginConfig)
    })
  }

  // Generate .env file
  if (envConfig && envConfig.variables.length > 0) {
    const envLines = envConfig.variables.map(v =>
      `${v.key}=${v.value}`
    )
    files.push({
      path: '.env',
      name: '.env',
      content: envLines.join('\n') + '\n'
    })

    // .env.example (secrets blanked out)
    const exampleLines = envConfig.variables.map(v =>
      v.secret ? `${v.key}=` : `${v.key}=${v.value}`
    )
    files.push({
      path: '.env.example',
      name: '.env.example',
      content: exampleLines.join('\n') + '\n'
    })
  }

  // Generate environment overlay files
  if (envConfig?.environments) {
    for (const env of envConfig.environments) {
      if (env.variables.length === 0) continue
      const lines = env.variables.map(v => `${v.key}=${v.value}`)
      files.push({
        path: `environments/${env.name}.env`,
        name: `${env.name}.env`,
        content: lines.join('\n') + '\n'
      })
    }
  }

  // Generate connector files (one per connector)
  for (const node of connectorNodes) {
    const data = node.data as ConnectorNodeData
    const fileName = `${toIdentifier(data.label)}.hcl`
    files.push({
      path: `connectors/${fileName}`,
      name: fileName,
      content: generateConnectorHCL(node) + '\n'
    })
  }

  // Generate types file
  if (typeNodes.length > 0) {
    const typesContent: string[] = ['# Type definitions', '']
    for (const node of typeNodes) {
      typesContent.push(generateTypeHCL(node))
      typesContent.push('')
    }
    files.push({
      path: 'types/types.hcl',
      name: 'types.hcl',
      content: typesContent.join('\n')
    })
  }

  // Generate validators file
  if (validatorNodes.length > 0) {
    const validatorsContent: string[] = ['# Validators', '']
    for (const node of validatorNodes) {
      validatorsContent.push(generateValidatorHCL(node))
      validatorsContent.push('')
    }
    files.push({
      path: 'validators/validators.hcl',
      name: 'validators.hcl',
      content: validatorsContent.join('\n')
    })
  }

  // Generate transforms file
  if (transformNodes.length > 0) {
    const transformsContent: string[] = ['# Named transforms', '']
    for (const node of transformNodes) {
      transformsContent.push(generateNamedTransformHCL(node))
      transformsContent.push('')
    }
    files.push({
      path: 'transforms/transforms.hcl',
      name: 'transforms.hcl',
      content: transformsContent.join('\n')
    })
  }

  // Generate aspects file
  if (aspectNodes.length > 0) {
    const aspectsContent: string[] = ['# Aspects (cross-cutting concerns)', '']
    for (const node of aspectNodes) {
      aspectsContent.push(generateAspectHCL(node))
      aspectsContent.push('')
    }
    files.push({
      path: 'aspects/aspects.hcl',
      name: 'aspects.hcl',
      content: aspectsContent.join('\n')
    })
  }

  // Generate sagas file
  if (sagaNodes.length > 0) {
    const sagasContent: string[] = ['# Sagas (distributed transactions)', '']
    for (const node of sagaNodes) {
      sagasContent.push(generateSagaHCL(node))
      sagasContent.push('')
    }
    files.push({
      path: 'sagas/sagas.hcl',
      name: 'sagas.hcl',
      content: sagasContent.join('\n')
    })
  }

  // Generate state machines file
  if (stateMachineNodes.length > 0) {
    const smContent: string[] = ['# State machines', '']
    for (const node of stateMachineNodes) {
      smContent.push(generateStateMachineHCL(node))
      smContent.push('')
    }
    files.push({
      path: 'machines/machines.hcl',
      name: 'machines.hcl',
      content: smContent.join('\n')
    })
  }

  // Generate flows file (all flows together)
  if (flowNodes.length > 0) {
    const flowsContent: string[] = ['# Flow definitions', '']

    for (const node of flowNodes) {
      flowsContent.push(generateFlowHCL(node, edges, nodesMap))
      flowsContent.push('')
    }

    files.push({
      path: 'flows/flows.hcl',
      name: 'flows.hcl',
      content: flowsContent.join('\n')
    })
  }

  return { files, errors }
}

// Legacy function for backward compatibility - generates single HCL string
export function generateHCL(nodes: StudioNode[], edges: Edge[], serviceConfig?: ServiceConfig, authConfig?: AuthConfig, envConfig?: EnvironmentConfig, securityConfig?: SecurityConfig, pluginConfig?: PluginConfig): string {
  const project = generateProject(nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig)
  return project.files.map(f => `# === ${f.path} ===\n${f.content}`).join('\n')
}
