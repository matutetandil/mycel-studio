import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Eye } from 'lucide-react'
import type { AspectNodeData } from '../../types'

const whenColors: Record<string, string> = {
  before: 'bg-blue-600',
  after: 'bg-green-600',
  around: 'bg-purple-600',
  on_error: 'bg-red-600',
}

const whenLabels: Record<string, string> = {
  before: 'Before',
  after: 'After',
  around: 'Around',
  on_error: 'On Error',
}

interface AspectNodeProps {
  data: AspectNodeData
  selected?: boolean
}

function AspectNode({ data, selected }: AspectNodeProps) {
  const colorClass = whenColors[data.when] || 'bg-neutral-600'

  return (
    <div
      className={`
        px-4 py-3 rounded-lg bg-neutral-800 border-2 shadow-md min-w-[160px]
        ${selected ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-neutral-700'}
      `}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-neutral-400" />

      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Eye className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-neutral-100">{data.label}</div>
          <div className="text-xs text-neutral-400">
            ASPECT
            <span className={`ml-1 ${data.when === 'on_error' ? 'text-red-400' : data.when === 'before' ? 'text-blue-400' : data.when === 'after' ? 'text-green-400' : 'text-purple-400'}`}>
              ({whenLabels[data.when] || data.when})
            </span>
          </div>
        </div>
      </div>

      {/* Show matching patterns */}
      {data.on && data.on.length > 0 && (
        <div className="mt-2 px-2 py-1.5 bg-neutral-700/50 border border-neutral-600/30 rounded text-xs space-y-0.5">
          {data.on.slice(0, 3).map((pattern, i) => (
            <div key={i} className="text-neutral-400 font-mono truncate">{pattern}</div>
          ))}
          {data.on.length > 3 && (
            <div className="text-neutral-500">+{data.on.length - 3} more</div>
          )}
        </div>
      )}

      {/* Show what the aspect does */}
      {data.action && (
        <div className="mt-1 px-2 py-1 bg-blue-900/20 border border-blue-700/30 rounded text-xs text-blue-300 truncate">
          Action: {data.action.connector} → {data.action.target}
        </div>
      )}
      {data.cache && (
        <div className="mt-1 px-2 py-1 bg-cyan-900/20 border border-cyan-700/30 rounded text-xs text-cyan-300">
          Cache: {data.cache.storage}
        </div>
      )}
      {data.invalidate && (
        <div className="mt-1 px-2 py-1 bg-orange-900/20 border border-orange-700/30 rounded text-xs text-orange-300">
          Invalidate: {data.invalidate.storage}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-neutral-400" />
    </div>
  )
}

export default memo(AspectNode)
