import type { Node, Edge } from '@xyflow/react'
import type { ConnectorNodeData, FlowNodeData, ServiceConfig } from '../types'

type StudioNode = Node<ConnectorNodeData | FlowNodeData>

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

// Map direction to mode for connectors that support server/client
function getConnectorMode(connectorType: string, direction: string | undefined): string | null {
  const dir = direction || 'bidirectional'

  switch (connectorType) {
    case 'rest':
    case 'graphql':
    case 'grpc':
    case 'tcp':
      // These support server/client mode
      if (dir === 'input') return 'server'
      if (dir === 'output') return 'client'
      return null // bidirectional doesn't specify mode
    case 'queue':
      // Queue uses consumer/producer
      if (dir === 'input') return 'consumer'
      if (dir === 'output') return 'producer'
      return null
    default:
      return null
  }
}

function generateConnectorHCL(node: StudioNode): string {
  const data = node.data as ConnectorNodeData
  const name = toIdentifier(data.label)
  const lines: string[] = []
  const config = data.config || {}

  // Determine mode based on direction
  const mode = getConnectorMode(data.connectorType, data.direction)

  lines.push(`# ${data.label} connector`)
  lines.push(`connector "${name}" {`)
  lines.push(`  type = "${data.connectorType}"`)

  // Add mode if applicable
  if (mode) {
    lines.push(`  mode = "${mode}"`)
  }

  // Type-specific configuration
  switch (data.connectorType) {
    case 'rest':
      if (config.port) lines.push(`  port = ${config.port}`)
      if (config.cors) {
        lines.push('')
        lines.push('  cors {')
        lines.push('    origins = ["*"]')
        lines.push('    methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]')
        lines.push('  }')
      }
      break

    case 'database':
      if (config.driver) lines.push(`  driver = "${config.driver}"`)
      if (config.driver === 'sqlite') {
        if (config.database) lines.push(`  database = "${config.database}"`)
      } else if (config.driver === 'mongodb') {
        if (config.uri) lines.push(`  uri = "${config.uri}"`)
        if (config.database) lines.push(`  database = "${config.database}"`)
      } else {
        // PostgreSQL, MySQL
        if (config.host) lines.push(`  host = "${config.host}"`)
        if (config.port) lines.push(`  port = ${config.port}`)
        if (config.database) lines.push(`  database = "${config.database}"`)
        if (config.user) lines.push(`  user = "${config.user}"`)
        if (config.password) lines.push(`  password = "${config.password}"`)
        if (config.ssl_mode) lines.push(`  ssl_mode = "${config.ssl_mode}"`)
        if (config.charset) lines.push(`  charset = "${config.charset}"`)
      }
      break

    case 'graphql':
      if (config.port) lines.push(`  port = ${config.port}`)
      if (config.endpoint) lines.push(`  path = "${config.endpoint}"`)
      if (config.playground) lines.push(`  playground = true`)
      break

    case 'grpc':
      if (config.port) lines.push(`  port = ${config.port}`)
      break

    case 'tcp':
      if (config.port) lines.push(`  port = ${config.port}`)
      break

    case 'queue':
      if (config.driver) lines.push(`  driver = "${config.driver}"`)
      if (config.driver === 'rabbitmq' && config.url) {
        lines.push(`  url = "${config.url}"`)
      } else if (config.driver === 'kafka' && config.brokers) {
        lines.push(`  brokers = ["${config.brokers}"]`)
      }
      break

    case 'cache':
      if (config.driver) lines.push(`  driver = "${config.driver}"`)
      if (config.driver === 'memory') {
        if (config.max_items) lines.push(`  max_items = ${config.max_items}`)
        if (config.default_ttl) lines.push(`  default_ttl = "${config.default_ttl}"`)
      } else if (config.driver === 'redis') {
        if (config.address) lines.push(`  address = "${config.address}"`)
        if (config.password) lines.push(`  password = "${config.password}"`)
        if (config.db !== undefined) lines.push(`  db = ${config.db}`)
        if (config.key_prefix) lines.push(`  key_prefix = "${config.key_prefix}"`)
      }
      break

    case 's3':
      if (config.bucket) lines.push(`  bucket = "${config.bucket}"`)
      if (config.region) lines.push(`  region = "${config.region}"`)
      if (config.access_key) lines.push(`  access_key = "${config.access_key}"`)
      if (config.secret_key) lines.push(`  secret_key = "${config.secret_key}"`)
      if (config.endpoint) lines.push(`  endpoint = "${config.endpoint}"`)
      break

    case 'file':
      if (config.driver) lines.push(`  driver = "${config.driver}"`)
      if (config.base_path) lines.push(`  base_path = "${config.base_path}"`)
      break

    case 'exec':
      if (config.command) lines.push(`  command = "${config.command}"`)
      if (config.working_dir) lines.push(`  working_dir = "${config.working_dir}"`)
      if (config.timeout) lines.push(`  timeout = "${config.timeout}"`)
      break
  }

  lines.push('}')

  return lines.join('\n')
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
  const outgoingEdge = edges.find((e) => e.source === node.id)

  const fromNode = incomingEdge ? nodesMap.get(incomingEdge.source) : null
  const toNode = outgoingEdge ? nodesMap.get(outgoingEdge.target) : null

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
    lines.push('  }')
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

  // Cache block
  if (data.cache) {
    lines.push('')
    lines.push('  cache {')
    lines.push(`    storage = "${data.cache.storage}"`)
    lines.push(`    key     = "${data.cache.key}"`)
    lines.push(`    ttl     = "${data.cache.ttl}"`)
    lines.push('  }')
  }

  // Lock block
  if (data.lock) {
    lines.push('')
    lines.push('  lock {')
    lines.push(`    storage = "${data.lock.storage}"`)
    lines.push(`    key     = "${data.lock.key}"`)
    lines.push(`    timeout = "${data.lock.timeout}"`)
    if (data.lock.wait !== undefined) {
      lines.push(`    wait    = ${data.lock.wait}`)
    }
    if (data.lock.retry) {
      lines.push(`    retry   = "${data.lock.retry}"`)
    }
    lines.push('  }')
  }

  // Semaphore block
  if (data.semaphore) {
    lines.push('')
    lines.push('  semaphore {')
    lines.push(`    storage     = "${data.semaphore.storage}"`)
    lines.push(`    key         = "${data.semaphore.key}"`)
    lines.push(`    max_permits = ${data.semaphore.maxPermits}`)
    lines.push(`    timeout     = "${data.semaphore.timeout}"`)
    if (data.semaphore.lease) {
      lines.push(`    lease       = "${data.semaphore.lease}"`)
    }
    lines.push('  }')
  }

  // Enrich blocks
  if (data.enrich && data.enrich.length > 0) {
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

  // Error handling block
  if (data.errorHandling?.retry) {
    lines.push('')
    lines.push('  error_handling {')
    lines.push('    retry {')
    lines.push(`      attempts = ${data.errorHandling.retry.attempts}`)
    lines.push(`      delay    = "${data.errorHandling.retry.delay}"`)
    if (data.errorHandling.retry.backoff) {
      lines.push(`      backoff  = "${data.errorHandling.retry.backoff}"`)
    }
    lines.push('    }')
    lines.push('  }')
  }

  // To block
  if (toNode && toNode.type === 'connector') {
    const toData = toNode.data as ConnectorNodeData
    const connectorName = toIdentifier(toData.label)
    lines.push('')
    lines.push('  to {')
    lines.push(`    connector = "${connectorName}"`)
    if (data.to?.target) {
      lines.push(`    target = "${data.to.target}"`)
    }
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
export function generateProject(nodes: StudioNode[], edges: Edge[], serviceConfig?: ServiceConfig): GeneratedProject {
  const nodesMap = new Map(nodes.map((n) => [n.id, n]))
  const files: GeneratedFile[] = []
  const errors = validateProject(nodes)

  const connectorNodes = nodes.filter((n) => n.type === 'connector')
  const flowNodes = nodes.filter((n) => n.type === 'flow')

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

  // Generate flows file (all flows together, grouped by source connector)
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
