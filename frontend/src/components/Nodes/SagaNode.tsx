import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { GitBranch, ArrowRight, Undo2, Clock, Pause } from 'lucide-react'
import type { SagaNodeData } from '../../types'

interface SagaNodeProps {
  data: SagaNodeData
  selected?: boolean
}

function SagaNode({ data, selected }: SagaNodeProps) {
  const isLongRunning = data.steps?.some(s => s.delay || s.await) || false

  return (
    <div
      className={`
        px-4 py-3 rounded-lg bg-neutral-800 border-2 shadow-md min-w-[200px] max-w-[280px]
        ${selected ? 'border-rose-500 shadow-lg shadow-rose-500/20' : 'border-neutral-700'}
      `}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-neutral-400" />

      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-rose-600">
          <GitBranch className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-neutral-100 truncate">{data.label}</div>
          <div className="text-xs text-neutral-400">
            {isLongRunning ? 'WORKFLOW' : 'SAGA'}
            {data.timeout && <span className="ml-1 text-rose-400">({data.timeout})</span>}
          </div>
        </div>
      </div>

      {/* Steps preview */}
      {data.steps && data.steps.length > 0 && (
        <div className="space-y-1">
          {data.steps.slice(0, 4).map((step, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-neutral-700/50 border border-neutral-600/30 rounded text-xs">
              <span className="text-neutral-500 font-mono w-3">{i + 1}</span>
              {step.delay ? (
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
              ) : step.await ? (
                <Pause className="w-3 h-3 text-blue-400 shrink-0" />
              ) : (
                <ArrowRight className="w-3 h-3 text-rose-400 shrink-0" />
              )}
              <span className="text-neutral-300 truncate flex-1">{step.name}</span>
              {step.compensate && (
                <span title="Has compensation"><Undo2 className="w-3 h-3 text-amber-500 shrink-0" /></span>
              )}
              {step.onError === 'skip' && (
                <span className="text-neutral-500 text-[10px]">skip</span>
              )}
            </div>
          ))}
          {data.steps.length > 4 && (
            <div className="text-xs text-neutral-500 px-2">+{data.steps.length - 4} more</div>
          )}
        </div>
      )}

      {/* Callbacks */}
      <div className="flex gap-1 mt-2">
        {data.onComplete && (
          <span className="px-1.5 py-0.5 text-[10px] bg-green-900/30 border border-green-700/50 rounded text-green-400">
            on_complete
          </span>
        )}
        {data.onFailure && (
          <span className="px-1.5 py-0.5 text-[10px] bg-red-900/30 border border-red-700/50 rounded text-red-400">
            on_failure
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-neutral-400" />
    </div>
  )
}

export default memo(SagaNode)
