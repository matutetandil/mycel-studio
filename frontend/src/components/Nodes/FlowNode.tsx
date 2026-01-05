import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { ArrowRight, Clock } from 'lucide-react'
import type { FlowNodeData } from '../../types'

interface FlowNodeProps {
  data: FlowNodeData
  selected?: boolean
}

function FlowNode({ data, selected }: FlowNodeProps) {
  const hasTransform = data.transform && Object.keys(data.transform).length > 0
  const hasSchedule = !!data.when

  return (
    <div
      className={`
        px-4 py-3 rounded-lg bg-white border-2 shadow-md min-w-[180px]
        ${selected ? 'border-indigo-500 shadow-lg' : 'border-gray-200'}
      `}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3" />

      <div className="flex items-center gap-2 mb-2">
        <ArrowRight className="w-4 h-4 text-indigo-500" />
        <span className="font-semibold text-gray-800">{data.label}</span>
        {hasSchedule && (
          <Clock className="w-4 h-4 text-orange-500" />
        )}
      </div>

      {data.fromOperation && (
        <div className="text-xs text-gray-600 mb-1">
          <span className="font-medium">From:</span> {data.fromOperation}
        </div>
      )}

      {data.toTarget && (
        <div className="text-xs text-gray-600 mb-1">
          <span className="font-medium">To:</span> {data.toTarget}
        </div>
      )}

      {hasTransform && (
        <div className="mt-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs">
          <span className="font-medium text-amber-700">Transform</span>
          <span className="text-amber-600 ml-1">
            ({Object.keys(data.transform!).length} fields)
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  )
}

export default memo(FlowNode)
