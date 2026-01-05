import type { Node, Edge } from '@xyflow/react'
import type { ConnectorNodeData, FlowNodeData } from '../types'

type StudioNode = Node<ConnectorNodeData | FlowNodeData>

function generateConnector(node: StudioNode): string {
  const data = node.data as ConnectorNodeData
  const name = data.label.toLowerCase().replace(/\s+/g, '_')
  const lines: string[] = []

  lines.push(`connector "${name}" {`)
  lines.push(`  type = "${data.connectorType}"`)

  if (data.config.port) {
    lines.push(`  port = ${data.config.port}`)
  }

  if (data.config.driver) {
    lines.push(`  driver = "${data.config.driver}"`)
  }

  if (data.config.database) {
    lines.push(`  database = "${data.config.database}"`)
  }

  if (data.config.connection) {
    lines.push(`  connection = "${data.config.connection}"`)
  }

  if (data.config.queue) {
    lines.push(`  queue = "${data.config.queue}"`)
  }

  if (data.config.topic) {
    lines.push(`  topic = "${data.config.topic}"`)
  }

  if (data.config.proto_path) {
    lines.push(`  proto_path = "${data.config.proto_path}"`)
  }

  if (data.config.schema) {
    lines.push(`  schema = "${data.config.schema}"`)
  }

  if (data.config.cors) {
    lines.push(`  cors = true`)
  }

  lines.push('}')

  return lines.join('\n')
}

function generateFlow(
  node: StudioNode,
  edges: Edge[],
  nodesMap: Map<string, StudioNode>
): string {
  const data = node.data as FlowNodeData
  const name = data.label.toLowerCase().replace(/\s+/g, '_')
  const lines: string[] = []

  // Find connected nodes
  const incomingEdge = edges.find((e) => e.target === node.id)
  const outgoingEdge = edges.find((e) => e.source === node.id)

  const fromNode = incomingEdge ? nodesMap.get(incomingEdge.source) : null
  const toNode = outgoingEdge ? nodesMap.get(outgoingEdge.target) : null

  lines.push(`flow "${name}" {`)

  // Schedule (when)
  if (data.when) {
    lines.push(`  when = "${data.when}"`)
    lines.push('')
  }

  // From block
  if (fromNode && fromNode.type === 'connector') {
    const fromData = fromNode.data as ConnectorNodeData
    const connectorName = fromData.label.toLowerCase().replace(/\s+/g, '_')
    const fromLines = [`  from {`, `    connector = "${connectorName}"`]

    if (data.fromOperation) {
      fromLines.push(`    operation = "${data.fromOperation}"`)
    }

    fromLines.push('  }')
    lines.push(fromLines.join('\n'))
  }

  // Transform block
  if (data.transform && Object.keys(data.transform).length > 0) {
    lines.push('')
    lines.push('  transform {')
    for (const [key, value] of Object.entries(data.transform)) {
      lines.push(`    ${key} = "${value}"`)
    }
    lines.push('  }')
  }

  // To block
  if (toNode && toNode.type === 'connector') {
    const toData = toNode.data as ConnectorNodeData
    const connectorName = toData.label.toLowerCase().replace(/\s+/g, '_')
    lines.push('')
    const toLines = [`  to {`, `    connector = "${connectorName}"`]

    if (data.toTarget) {
      toLines.push(`    target = "${data.toTarget}"`)
    }

    toLines.push('  }')
    lines.push(toLines.join('\n'))
  }

  lines.push('}')

  return lines.join('\n')
}

export function generateHCL(nodes: StudioNode[], edges: Edge[]): string {
  const nodesMap = new Map(nodes.map((n) => [n.id, n]))
  const parts: string[] = []

  // Generate connectors first
  const connectorNodes = nodes.filter((n) => n.type === 'connector')
  for (const node of connectorNodes) {
    parts.push(generateConnector(node))
  }

  // Then generate flows
  const flowNodes = nodes.filter((n) => n.type === 'flow')
  for (const node of flowNodes) {
    parts.push(generateFlow(node, edges, nodesMap))
  }

  return parts.join('\n\n')
}
