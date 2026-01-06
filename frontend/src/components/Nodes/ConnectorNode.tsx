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
  Cloud,
  Terminal,
  Network,
} from 'lucide-react'
import type { ConnectorNodeData, ConnectorType } from '../../types'

const iconMap: Record<ConnectorType, React.ElementType> = {
  rest: Globe,
  database: Database,
  queue: MessageSquare,
  cache: Zap,
  grpc: Server,
  graphql: Hexagon,
  file: Folder,
  s3: Cloud,
  exec: Terminal,
  tcp: Network,
}

const colorMap: Record<ConnectorType, string> = {
  rest: 'bg-blue-500',
  database: 'bg-green-500',
  queue: 'bg-orange-500',
  cache: 'bg-yellow-500',
  grpc: 'bg-purple-500',
  graphql: 'bg-pink-500',
  file: 'bg-neutral-500',
  s3: 'bg-amber-600',
  exec: 'bg-slate-600',
  tcp: 'bg-cyan-600',
}

interface ConnectorNodeProps {
  data: ConnectorNodeData
  selected?: boolean
}

function ConnectorNode({ data, selected }: ConnectorNodeProps) {
  const Icon = iconMap[data.connectorType] || Globe
  const colorClass = colorMap[data.connectorType] || 'bg-neutral-500'

  return (
    <div
      className={`
        px-4 py-3 rounded-lg bg-neutral-800 border-2 shadow-md min-w-[150px]
        ${selected ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-neutral-700'}
      `}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-neutral-400" />

      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-semibold text-neutral-100">{data.label}</div>
          <div className="text-xs text-neutral-400 uppercase">{data.connectorType}</div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-neutral-400" />
    </div>
  )
}

export default memo(ConnectorNode)
