import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { RefreshCw } from 'lucide-react'
import type { TransformNodeData } from '../../types'

interface TransformNodeProps {
  data: TransformNodeData
  selected?: boolean
}

function TransformNode({ data, selected }: TransformNodeProps) {
  const fieldCount = Object.keys(data.fields || {}).length

  return (
    <div
      className={`
        px-4 py-3 rounded-lg bg-neutral-800 border-2 shadow-md min-w-[160px]
        ${selected ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-neutral-700'}
      `}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-neutral-400" />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-600">
          <RefreshCw className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-neutral-100">{data.label}</div>
          <div className="text-xs text-neutral-400">
            TRANSFORM
            {fieldCount > 0 && (
              <span className="ml-1 text-amber-400">
                ({fieldCount} field{fieldCount !== 1 ? 's' : ''})
              </span>
            )}
          </div>
        </div>
      </div>

      {fieldCount > 0 && (
        <div className="mt-2 px-2 py-1.5 bg-amber-900/20 border border-amber-700/30 rounded text-xs space-y-0.5">
          {Object.entries(data.fields).slice(0, 4).map(([name, expr]) => (
            <div key={name} className="flex items-center gap-1.5 truncate">
              <span className="text-amber-300 font-mono">{name}</span>
              <span className="text-neutral-500">=</span>
              <span className="text-neutral-400 font-mono truncate">{expr}</span>
            </div>
          ))}
          {fieldCount > 4 && (
            <div className="text-neutral-500">+{fieldCount - 4} more</div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-neutral-400" />
    </div>
  )
}

export default memo(TransformNode)
