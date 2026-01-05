import type { ComponentType } from 'react'
import ConnectorNode from './ConnectorNode'
import FlowNode from './FlowNode'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const nodeTypes: Record<string, ComponentType<any>> = {
  connector: ConnectorNode,
  flow: FlowNode,
}

export { ConnectorNode, FlowNode }
