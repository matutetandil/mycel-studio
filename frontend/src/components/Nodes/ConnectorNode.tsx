import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import {
  Globe,
  Database,
  MessageSquare,
  Zap,
  Server,
  Hexagon,
  Folder,
} from 'lucide-react'
import type { ConnectorNodeData, ConnectorType } from '../../types'

const iconMap: Record<ConnectorType, React.ElementType> = {
  rest: Globe,
  database: Database,
  mq: MessageSquare,
  cache: Zap,
  grpc: Server,
  graphql: Hexagon,
  file: Folder,
}

const colorMap: Record<ConnectorType, string> = {
  rest: 'bg-blue-500',
  database: 'bg-green-500',
  mq: 'bg-orange-500',
  cache: 'bg-yellow-500',
  grpc: 'bg-purple-500',
  graphql: 'bg-pink-500',
  file: 'bg-gray-500',
}

interface ConnectorNodeProps {
  data: ConnectorNodeData
  selected?: boolean
}

function ConnectorNode({ data, selected }: ConnectorNodeProps) {
  const Icon = iconMap[data.connectorType] || Globe
  const colorClass = colorMap[data.connectorType] || 'bg-gray-500'

  return (
    <div
      className={`
        px-4 py-3 rounded-lg bg-white border-2 shadow-md min-w-[150px]
        ${selected ? 'border-blue-500 shadow-lg' : 'border-gray-200'}
      `}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3" />

      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-semibold text-gray-800">{data.label}</div>
          <div className="text-xs text-gray-500 uppercase">{data.connectorType}</div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  )
}

export default memo(ConnectorNode)
