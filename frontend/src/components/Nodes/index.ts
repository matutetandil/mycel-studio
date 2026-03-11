import type { ComponentType } from 'react'
import ConnectorNode from './ConnectorNode'
import FlowNode from './FlowNode'
import TypeNode from './TypeNode'
import ValidatorNode from './ValidatorNode'
import TransformNode from './TransformNode'
import AspectNode from './AspectNode'
import SagaNode from './SagaNode'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const nodeTypes: Record<string, ComponentType<any>> = {
  connector: ConnectorNode,
  flow: FlowNode,
  type: TypeNode,
  validator: ValidatorNode,
  transform: TransformNode,
  aspect: AspectNode,
  saga: SagaNode,
}

export { ConnectorNode, FlowNode, TypeNode, ValidatorNode, TransformNode, AspectNode, SagaNode }
