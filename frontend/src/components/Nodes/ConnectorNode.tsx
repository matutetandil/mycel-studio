import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import {
  Globe,
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
} from 'lucide-react'
import type { ConnectorNodeData, ConnectorDirection } from '../../types'
import { getConnector } from '../../connectors'

const directionIcons: Record<ConnectorDirection, React.ElementType> = {
  input: ArrowRight,
  output: ArrowLeft,
  bidirectional: ArrowLeftRight,
}

const directionLabels: Record<ConnectorDirection, string> = {
  input: 'Source',
  output: 'Target',
  bidirectional: 'Both',
}

interface ConnectorNodeProps {
  data: ConnectorNodeData
  selected?: boolean
}

function ConnectorNode({ data, selected }: ConnectorNodeProps) {
  const def = getConnector(data.connectorType)
  const Icon = def?.icon || Globe
  const colorClass = def?.color || 'bg-neutral-500'
  const direction = data.direction || 'bidirectional'
  const DirectionIcon = directionIcons[direction]

  // Determine which handles to show based on direction
  const showLeftHandle = direction === 'output' || direction === 'bidirectional'
  const showRightHandle = direction === 'input' || direction === 'bidirectional'

  return (
    <div
      className={`
        px-4 py-3 rounded-lg bg-neutral-800 border-2 shadow-md min-w-[150px]
        ${selected ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-neutral-700'}
      `}
    >
      {/* Left handle - for receiving connections (output/bidirectional) */}
      {showLeftHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-green-500"
        />
      )}

      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-neutral-100">{data.label}</div>
          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <span className="uppercase">{data.connectorType}</span>
            <span className="text-neutral-600">|</span>
            <DirectionIcon className="w-3 h-3" />
            <span>{directionLabels[direction]}</span>
          </div>
        </div>
      </div>

      {/* Right handle - for sending connections (input/bidirectional) */}
      {showRightHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-blue-500"
        />
      )}

    </div>
  )
}

export default memo(ConnectorNode)
