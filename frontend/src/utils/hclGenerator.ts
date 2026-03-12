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

// Check if a value is an HCL expression (function call, variable ref) that should NOT be quoted
function isHclExpression(value: string): boolean {
  // Function calls: env("..."), uuid(), now(), lower(...), upper(...), etc.
  if (/^[a-zA-Z_][a-zA-Z0-9_]*\(.*\)$/.test(value)) return true
  // Variable references: input.field, output.field, var.name
  if (/^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z0-9_.]+$/.test(value)) return true
  return false
}

// Format a value for HCL output — expressions are unquoted, strings are quoted
function hclValue(value: string): string {
  return isHclExpression(value) ? value : `"${value}"`
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
    lines.push(`  driver = ${hclValue(String(config.driver))}`)
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
        // CORS is a complex block — generate with sub-fields if enabled
        if (value) {
          const origins = config.cors_origins
            ? String(config.cors_origins).split(',').map(s => `"${s.trim()}"`)
            : ['"*"']
          const methods = config.cors_methods
            ? String(config.cors_methods).split(',').map(s => `"${s.trim()}"`)
            : ['"GET"', '"POST"', '"PUT"', '"DELETE"', '"OPTIONS"']
          const headers = config.cors_headers
            ? String(config.cors_headers).split(',').map(s => `"${s.trim()}"`)
            : ['"Content-Type"', '"Authorization"']
          lines.push('')
          lines.push('  cors {')
          lines.push(`    origins = [${origins.join(', ')}]`)
          lines.push(`    methods = [${methods.join(', ')}]`)
          lines.push(`    headers = [${headers.join(', ')}]`)
          lines.push('  }')
        }
        continue
      }
      // Skip cors sub-fields (handled above)
      if (field.key === 'cors_origins' || field.key === 'cors_methods' || field.key === 'cors_headers') continue
      if (field.key === 'tls_enabled') {
        if (value) {
          lines.push('')
          lines.push('  tls {')
          if (config.tls_cert_file) lines.push(`    cert_file = ${hclValue(String(config.tls_cert_file))}`)
          if (config.tls_key_file) lines.push(`    key_file  = ${hclValue(String(config.tls_key_file))}`)
          if (config.tls_cert) lines.push(`    cert = ${hclValue(String(config.tls_cert))}`)
          if (config.tls_key) lines.push(`    key  = ${hclValue(String(config.tls_key))}`)
          if (config.tls_ca) lines.push(`    ca   = ${hclValue(String(config.tls_ca))}`)
          if (config.tls_ca_cert) lines.push(`    ca_cert = ${hclValue(String(config.tls_ca_cert))}`)
          lines.push('  }')
        }
        continue
      }
      if (value) {
        lines.push(`  ${field.key} = true`)
      }
      continue
    }

    // Skip cors sub-fields (handled in cors block above)
    if (field.key === 'cors_origins' || field.key === 'cors_methods' || field.key === 'cors_headers') continue
    // Skip TLS sub-fields (handled in tls block above)
    if (field.key.startsWith('tls_') && field.key !== 'tls_enabled') continue

    // Generate pool {} block for pool_max field
    if (field.key === 'pool_max') {
      const hasPool = config.pool_max || config.pool_min || config.pool_max_lifetime
      if (hasPool) {
        lines.push('')
        lines.push('  pool {')
        if (config.pool_max) lines.push(`    max          = ${config.pool_max}`)
        if (config.pool_min) lines.push(`    min          = ${config.pool_min}`)
        if (config.pool_max_lifetime) lines.push(`    max_lifetime = "${config.pool_max_lifetime}"`)
        lines.push('  }')
      }
      continue
    }
    // Skip pool sub-fields (handled in pool block above)
    if (field.key === 'pool_min' || field.key === 'pool_max_lifetime') continue

    // Generate retry {} block for retry_count field
    if (field.key === 'retry_count') {
      const hasRetry = config.retry_count || config.retry_interval || config.retry_backoff || config.retry_delay
      if (hasRetry) {
        lines.push('')
        lines.push('  retry {')
        if (config.retry_count) lines.push(`    count    = ${config.retry_count}`)
        if (config.retry_interval) lines.push(`    interval = "${config.retry_interval}"`)
        if (config.retry_delay) lines.push(`    delay    = "${config.retry_delay}"`)
        if (config.retry_backoff) lines.push(`    backoff  = "${config.retry_backoff}"`)
        lines.push('  }')
      }
      continue
    }
    // Skip retry sub-fields (handled in retry block above)
    if (field.key === 'retry_interval' || field.key === 'retry_backoff' || field.key === 'retry_delay') continue

    // MQ sub-blocks: consumer, publisher, exchange, dlq, sasl, schema_registry
    if (field.key === 'consumer_queue' || field.key === 'consumer_group_id') {
      // Consumer block (RabbitMQ or Kafka)
      const isRabbit = config.driver === 'rabbitmq'
      const hasConsumer = isRabbit
        ? (config.consumer_queue || config.consumer_prefetch || config.consumer_workers)
        : (config.consumer_group_id || config.consumer_topics)
      if (hasConsumer) {
        lines.push('')
        lines.push('  consumer {')
        if (isRabbit) {
          if (config.consumer_queue) lines.push(`    queue    = ${hclValue(String(config.consumer_queue))}`)
          if (config.consumer_prefetch) lines.push(`    prefetch = ${config.consumer_prefetch}`)
          if (config.consumer_auto_ack) lines.push(`    auto_ack = true`)
          if (config.consumer_workers) lines.push(`    workers  = ${config.consumer_workers}`)
          if (config.consumer_tag) lines.push(`    tag      = ${hclValue(String(config.consumer_tag))}`)
          if (config.consumer_exclusive) lines.push(`    exclusive = true`)
        } else {
          // Kafka
          if (config.consumer_group_id) lines.push(`    group_id           = ${hclValue(String(config.consumer_group_id))}`)
          if (config.consumer_topics) {
            const topics = String(config.consumer_topics).split(',').map(s => `"${s.trim()}"`)
            lines.push(`    topics             = [${topics.join(', ')}]`)
          }
          if (config.consumer_auto_offset_reset) lines.push(`    auto_offset_reset  = "${config.consumer_auto_offset_reset}"`)
          if (config.consumer_auto_commit) lines.push(`    auto_commit        = true`)
          if (config.consumer_concurrency) lines.push(`    concurrency        = ${config.consumer_concurrency}`)
          if (config.consumer_max_bytes) lines.push(`    max_bytes          = ${config.consumer_max_bytes}`)
          if (config.consumer_max_wait_time) lines.push(`    max_wait_time      = "${config.consumer_max_wait_time}"`)
        }
        // DLQ (RabbitMQ only)
        if (isRabbit && config.dlq_enabled) {
          lines.push('')
          lines.push('    dlq {')
          lines.push('      enabled = true')
          if (config.dlq_exchange) lines.push(`      exchange    = ${hclValue(String(config.dlq_exchange))}`)
          if (config.dlq_queue) lines.push(`      queue       = ${hclValue(String(config.dlq_queue))}`)
          if (config.dlq_max_retries) lines.push(`      max_retries = ${config.dlq_max_retries}`)
          if (config.dlq_retry_delay) lines.push(`      retry_delay = "${config.dlq_retry_delay}"`)
          lines.push('    }')
        }
        lines.push('  }')
      }
      continue
    }
    // Skip all consumer/dlq sub-fields
    if (field.key.startsWith('consumer_') || field.key.startsWith('dlq_')) continue

    // Publisher block (RabbitMQ)
    if (field.key === 'publisher_exchange') {
      const hasPub = config.publisher_exchange || config.publisher_routing_key || config.publisher_confirms
      if (hasPub) {
        lines.push('')
        lines.push('  publisher {')
        if (config.publisher_exchange) lines.push(`    exchange     = ${hclValue(String(config.publisher_exchange))}`)
        if (config.publisher_routing_key) lines.push(`    routing_key  = ${hclValue(String(config.publisher_routing_key))}`)
        if (config.publisher_mandatory) lines.push(`    mandatory    = true`)
        if (config.publisher_persistent) lines.push(`    persistent   = true`)
        if (config.publisher_content_type) lines.push(`    content_type = "${config.publisher_content_type}"`)
        if (config.publisher_confirms) lines.push(`    confirms     = true`)
        lines.push('  }')
      }
      continue
    }
    if (field.key.startsWith('publisher_')) continue

    // Producer block (Kafka)
    if (field.key === 'producer_topic') {
      const hasProd = config.producer_topic || config.producer_acks || config.producer_compression
      if (hasProd) {
        lines.push('')
        lines.push('  producer {')
        if (config.producer_topic) lines.push(`    topic       = ${hclValue(String(config.producer_topic))}`)
        if (config.producer_acks) lines.push(`    acks        = "${config.producer_acks}"`)
        if (config.producer_retries) lines.push(`    retries     = ${config.producer_retries}`)
        if (config.producer_batch_size) lines.push(`    batch_size  = ${config.producer_batch_size}`)
        if (config.producer_linger_ms) lines.push(`    linger_ms   = ${config.producer_linger_ms}`)
        if (config.producer_compression) lines.push(`    compression = "${config.producer_compression}"`)
        lines.push('  }')
      }
      continue
    }
    if (field.key.startsWith('producer_')) continue

    // Exchange block (RabbitMQ)
    if (field.key === 'exchange_name') {
      if (config.exchange_name) {
        lines.push('')
        lines.push('  exchange {')
        lines.push(`    name    = ${hclValue(String(config.exchange_name))}`)
        if (config.exchange_type) lines.push(`    type    = "${config.exchange_type}"`)
        if (config.exchange_durable) lines.push(`    durable = true`)
        lines.push('  }')
      }
      continue
    }
    if (field.key.startsWith('exchange_')) continue

    // SASL block (Kafka)
    if (field.key === 'sasl_mechanism') {
      if (config.sasl_mechanism) {
        lines.push('')
        lines.push('  sasl {')
        lines.push(`    mechanism = "${config.sasl_mechanism}"`)
        if (config.sasl_username) lines.push(`    username  = ${hclValue(String(config.sasl_username))}`)
        if (config.sasl_password) lines.push(`    password  = ${hclValue(String(config.sasl_password))}`)
        lines.push('  }')
      }
      continue
    }
    if (field.key.startsWith('sasl_')) continue

    // Schema Registry block (Kafka)
    if (field.key === 'schema_registry_url') {
      if (config.schema_registry_url) {
        lines.push('')
        lines.push('  schema_registry {')
        lines.push(`    url = ${hclValue(String(config.schema_registry_url))}`)
        if (config.schema_registry_username) lines.push(`    username = ${hclValue(String(config.schema_registry_username))}`)
        if (config.schema_registry_password) lines.push(`    password = ${hclValue(String(config.schema_registry_password))}`)
        if (config.schema_registry_format) lines.push(`    format   = "${config.schema_registry_format}"`)
        lines.push('  }')
      }
      continue
    }
    if (field.key.startsWith('schema_registry_')) continue

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

    // Strings (default) — detect expressions like env("...")
    lines.push(`  ${field.key} = ${hclValue(String(value))}`)
  }

  // Profiles
  const pc = data.profileConfig
  if (pc?.enabled && pc.profiles.length > 0) {
    lines.push('')
    if (pc.select) lines.push(`  select   = "${pc.select}"`)
    if (pc.default) lines.push(`  default  = "${pc.default}"`)
    if (pc.fallback.length > 0) {
      lines.push(`  fallback = [${pc.fallback.map(f => `"${f}"`).join(', ')}]`)
    }

    for (const profile of pc.profiles) {
      lines.push('')
      lines.push(`  profile "${profile.name}" {`)
      // Profile-specific type (for profiled connectors)
      if (profile.connectorType) {
        lines.push(`    type = "${profile.connectorType}"`)
      }
      // Profile config fields
      for (const [k, v] of Object.entries(profile.config)) {
        if (v === undefined || v === null || v === '') continue
        if (typeof v === 'number' || typeof v === 'boolean') {
          lines.push(`    ${k} = ${v}`)
        } else {
          lines.push(`    ${k} = ${hclValue(String(v))}`)
        }
      }
      // Profile transform
      if (profile.transform && Object.keys(profile.transform).length > 0) {
        lines.push('')
        lines.push('    transform {')
        for (const [k, v] of Object.entries(profile.transform)) {
          lines.push(`      ${k} = "${v}"`)
        }
        lines.push('    }')
      }
      lines.push('  }')
    }
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

  // Find all connected connector nodes (regardless of edge direction)
  const connectedEdges = edges.filter((e) => e.source === node.id || e.target === node.id)
  const connectedConnectors: StudioNode[] = []
  for (const edge of connectedEdges) {
    const otherId = edge.source === node.id ? edge.target : edge.source
    const other = nodesMap.get(otherId)
    if (other && other.type === 'connector') {
      connectedConnectors.push(other)
    }
  }

  // Classify connectors by their direction: input connectors are "from", output are "to"
  // For bidirectional, use edge direction as hint (incoming edge = from, outgoing = to)
  let fromNode: StudioNode | null = null
  const toNodes: StudioNode[] = []

  for (const conn of connectedConnectors) {
    const connData = conn.data as ConnectorNodeData
    const dir = connData.direction || 'bidirectional'
    if (!fromNode && (dir === 'input' || dir === 'bidirectional')) {
      // Check if this is connected as a source (incoming to flow) or if it's an input connector
      const edge = connectedEdges.find(e =>
        (e.source === conn.id && e.target === node.id) ||
        (e.target === conn.id && e.source === node.id)
      )
      if (dir === 'input') {
        fromNode = conn
      } else if (edge && edge.source === conn.id) {
        // Bidirectional connected as source → treat as from
        fromNode = conn
      } else if (!toNodes.length) {
        // Bidirectional connected as target → treat as to
        toNodes.push(conn)
      }
    } else if (dir === 'output') {
      toNodes.push(conn)
    } else {
      toNodes.push(conn)
    }
  }

  // Legacy fallback: use edge direction if classification didn't work
  if (!fromNode && connectedConnectors.length > 0) {
    const incomingEdge = edges.find((e) => e.target === node.id)
    if (incomingEdge) {
      const n = nodesMap.get(incomingEdge.source)
      if (n && n.type === 'connector') fromNode = n
    }
  }
  const outgoingEdges = edges.filter((e) => e.source === node.id)

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
    // Fallback: use direction-classified toNodes, then edge-based detection
    const fallbackToNodes = toNodes.length > 0 ? toNodes : outgoingEdges
      .map(e => nodesMap.get(e.target))
      .filter((n): n is StudioNode => !!n && n.type === 'connector')

    for (const toNode of fallbackToNodes) {
      const toData = toNode.data as ConnectorNodeData
      const connectorName = toIdentifier(toData.label)
      lines.push('')
      lines.push('  to {')
      lines.push(`    connector = "${connectorName}"`)
      lines.push('  }')
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
    lines.push(`    secret           = ${hclValue(auth.jwt.secret)}`)
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
        lines.push(`      client_id     = ${hclValue(sp.clientId)}`)
      }
      if (sp.clientSecret) {
        lines.push(`      client_secret = ${hclValue(sp.clientSecret)}`)
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
