import type { Node, Edge } from '@xyflow/react'

export type ConnectorType = 'rest' | 'database' | 'mq' | 'cache' | 'grpc' | 'graphql' | 'file'

export interface ConnectorConfig {
  type: ConnectorType
  port?: number
  driver?: string
  database?: string
  connection?: string
  queue?: string
  topic?: string
  proto_path?: string
  schema?: string
  cors?: boolean
  [key: string]: unknown
}

export interface ConnectorNodeData extends Record<string, unknown> {
  label: string
  connectorType: ConnectorType
  config: ConnectorConfig
}

export interface FlowNodeData extends Record<string, unknown> {
  label: string
  fromConnector?: string
  fromOperation?: string
  toConnector?: string
  toTarget?: string
  transform?: Record<string, string>
  when?: string
}

export type ConnectorNode = Node<ConnectorNodeData, 'connector'>
export type FlowNode = Node<FlowNodeData, 'flow'>
export type StudioNode = Node<ConnectorNodeData | FlowNodeData>

export type StudioEdge = Edge
