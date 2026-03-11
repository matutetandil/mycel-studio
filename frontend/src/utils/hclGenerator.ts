import type { Node, Edge } from '@xyflow/react'
import type { ConnectorNodeData, FlowNodeData, FlowTo, ServiceConfig, TypeNodeData, TypeFieldDefinition, ValidatorNodeData } from '../types'
import { getConnector, getConnectorMode } from '../connectors'
import { getSimpleFlowBlocks } from '../flow-blocks'

type StudioNode = Node<ConnectorNodeData | FlowNodeData | TypeNodeData | ValidatorNodeData>

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

  // Response block
  if (data.response) {
    lines.push('')
    lines.push('  response {')
    lines.push(`    status = ${data.response.status}`)
    if (data.response.headers && Object.keys(data.response.headers).length > 0) {
      lines.push(`    headers = {`)
      for (const [key, value] of Object.entries(data.response.headers)) {
        lines.push(`      "${key}" = "${value}"`)
      }
      lines.push('    }')
    }
    if (data.response.body && Object.keys(data.response.body).length > 0) {
      lines.push('')
      lines.push('    body {')
      for (const [key, value] of Object.entries(data.response.body)) {
        lines.push(`      ${key} = "${value}"`)
      }
      lines.push('    }')
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
export function generateProject(nodes: StudioNode[], edges: Edge[], serviceConfig?: ServiceConfig): GeneratedProject {
  const nodesMap = new Map(nodes.map((n) => [n.id, n]))
  const files: GeneratedFile[] = []
  const errors = validateProject(nodes)

  const connectorNodes = nodes.filter((n) => n.type === 'connector')
  const flowNodes = nodes.filter((n) => n.type === 'flow')
  const typeNodes = nodes.filter((n) => n.type === 'type')
  const validatorNodes = nodes.filter((n) => n.type === 'validator')

  const name = serviceConfig?.name || 'my-service'
  const version = serviceConfig?.version || '1.0.0'

  // Generate config.hcl
  files.push({
    path: 'config.hcl',
    name: 'config.hcl',
    content: `# Service configuration\nservice {\n  name    = "${name}"\n  version = "${version}"\n}\n`
  })

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
export function generateHCL(nodes: StudioNode[], edges: Edge[], serviceConfig?: ServiceConfig): string {
  const project = generateProject(nodes, edges, serviceConfig)
  return project.files.map(f => `# === ${f.path} ===\n${f.content}`).join('\n')
}
