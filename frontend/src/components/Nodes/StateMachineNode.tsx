import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Circle, ArrowRight } from 'lucide-react'
import type { StateMachineNodeData } from '../../types'

interface StateMachineNodeProps {
  data: StateMachineNodeData
  selected?: boolean
}

function StateMachineNode({ data, selected }: StateMachineNodeProps) {
  const totalTransitions = data.states.reduce((sum, s) => sum + s.transitions.length, 0)
  const finalStates = data.states.filter(s => s.final)

  return (
    <div
      className={`
        px-4 py-3 rounded-lg bg-neutral-800 border-2 shadow-md min-w-[200px] max-w-[280px]
        ${selected ? 'border-teal-500 shadow-lg shadow-teal-500/20' : 'border-neutral-700'}
      `}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-neutral-400" />

      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-teal-600">
          <Circle className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-neutral-100 truncate">{data.label}</div>
          <div className="text-xs text-neutral-400">
            STATE MACHINE
            {data.initial && <span className="ml-1 text-teal-400">({data.initial})</span>}
          </div>
        </div>
      </div>

      {/* States preview */}
      {data.states.length > 0 && (
        <div className="space-y-1">
          {data.states.slice(0, 5).map((state, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-0.5 text-xs">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                state.name === data.initial
                  ? 'bg-teal-400'
                  : state.final
                  ? 'bg-neutral-500 ring-1 ring-neutral-400'
                  : 'bg-neutral-600'
              }`} />
              <span className={`truncate ${state.name === data.initial ? 'text-teal-300' : state.final ? 'text-neutral-400' : 'text-neutral-300'}`}>
                {state.name}
              </span>
              {state.transitions.length > 0 && (
                <span className="text-neutral-600 ml-auto flex items-center gap-0.5">
                  <ArrowRight className="w-2.5 h-2.5" />
                  {state.transitions.length}
                </span>
              )}
              {state.final && (
                <span className="text-neutral-500 text-[10px] ml-auto">final</span>
              )}
            </div>
          ))}
          {data.states.length > 5 && (
            <div className="text-xs text-neutral-500 px-2">+{data.states.length - 5} more</div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="mt-2 flex gap-2 text-[10px] text-neutral-500">
        <span>{data.states.length} states</span>
        <span>{totalTransitions} transitions</span>
        {finalStates.length > 0 && <span>{finalStates.length} final</span>}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-neutral-400" />
    </div>
  )
}

export default memo(StateMachineNode)
