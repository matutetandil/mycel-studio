import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Eye } from 'lucide-react'
import type { AspectNodeData } from '../../types'

const whenColors: Record<string, { bg: string; border: string; text: string }> = {
  before: { bg: 'bg-sky-600', border: 'border-sky-500', text: 'text-sky-400' },
  after: { bg: 'bg-green-600', border: 'border-green-500', text: 'text-green-400' },
  around: { bg: 'bg-purple-600', border: 'border-purple-500', text: 'text-purple-400' },
  on_error: { bg: 'bg-red-600', border: 'border-red-500', text: 'text-red-400' },
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
  const colors = whenColors[data.when] || { bg: 'bg-neutral-600', border: 'border-neutral-500', text: 'text-neutral-400' }

  return (
    <div
      className={`
        px-4 py-3 rounded-lg bg-neutral-800 border-2 shadow-md min-w-[160px]
        ${selected ? `${colors.border} shadow-lg shadow-indigo-500/20` : 'border-neutral-700'}
      `}
    >
      {/* No left handle — aspects don't receive input */}

      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Eye className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-neutral-100">{data.label}</div>
          <div className="text-xs text-neutral-400">
            ASPECT
            <span className={`ml-1 ${colors.text}`}>
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
        <div className={`mt-1 px-2 py-1 rounded text-xs truncate ${
          data.action.flow
            ? 'bg-emerald-900/20 border border-emerald-700/30 text-emerald-300'
            : 'bg-blue-900/20 border border-blue-700/30 text-blue-300'
        }`}>
          {data.action.flow
            ? <>Flow → {data.action.flow}</>
            : <>Action → {data.action.connector}{data.action.target ? ` (${data.action.target})` : ''}</>
          }
        </div>
      )}
      {data.response && (
        <div className="mt-1 px-2 py-1 bg-green-900/20 border border-green-700/30 rounded text-xs text-green-300 truncate">
          Response enrichment
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

      {/* Right handle — connects to action connector (always visible) */}
      <Handle
        type="source"
        position={Position.Right}
        id="action"
        className="w-3 h-3 !bg-neutral-400"
      />

      {/* Bottom handle — visual link to matched flows */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="aspect-flows"
        className={`w-2.5 h-2.5 !rounded-full !border-2 ${colors.bg.replace('bg-', '!bg-')}`}
      />
    </div>
  )
}

export default memo(AspectNode)
