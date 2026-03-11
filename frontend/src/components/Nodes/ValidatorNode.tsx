import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { ShieldCheck } from 'lucide-react'
import { getValidatorType } from '../../validators'
import type { ValidatorNodeData } from '../../types'

interface ValidatorNodeProps {
  data: ValidatorNodeData
  selected?: boolean
}

function ValidatorNode({ data, selected }: ValidatorNodeProps) {
  const def = getValidatorType(data.validatorType)
  const Icon = def?.icon || ShieldCheck
  const colorClass = def?.color || 'bg-purple-500'

  return (
    <div
      className={`
        px-4 py-3 rounded-lg bg-neutral-800 border-2 shadow-md min-w-[160px]
        ${selected ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-neutral-700'}
      `}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-neutral-400" />

      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-neutral-100">{data.label}</div>
          <div className="text-xs text-neutral-400">
            VALIDATOR
            <span className="ml-1 text-purple-400">({def?.label || data.validatorType})</span>
          </div>
        </div>
      </div>

      {/* Show message preview */}
      {data.message && (
        <div className="mt-2 px-2 py-1 bg-purple-900/20 border border-purple-700/30 rounded text-xs text-purple-300 truncate">
          {data.message}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-neutral-400" />
    </div>
  )
}

export default memo(ValidatorNode)
