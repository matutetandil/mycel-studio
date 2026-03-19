import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { ArrowRight, Clock, Shield, Bug, Fingerprint, Timer, EyeOff } from 'lucide-react'
import { getNodeIndicators } from '../../flow-blocks'
import { useDebugStore } from '../../stores/useDebugStore'
import { toIdentifier } from '../../utils/hclGenerator'
import type { FlowNodeData } from '../../types'

interface FlowNodeProps {
  data: FlowNodeData
  selected?: boolean
}

const indicators = getNodeIndicators()

function FlowNode({ data, selected }: FlowNodeProps) {
  const debugStatus = useDebugStore(s => s.status)
  const threads = useDebugStore(s => s.threads)
  const stoppedAt = useDebugStore(s => s.stoppedAt)

  const flowName = toIdentifier(data.label)
  const activeThread = debugStatus === 'connected' ? threads.find(t => t.flowName === flowName) : null
  const isPausedHere = stoppedAt?.flow === flowName
  const hasTransform = data.transform && data.transform.fields && Object.keys(data.transform.fields).length > 0
  const hasSchedule = !!data.when
  const hasRequire = !!data.require
  const hasSteps = data.steps && data.steps.length > 0
  const hasEnrich = data.enrich && data.enrich.length > 0
  const hasCache = !!data.cache
  const hasFilter = !!(data.from?.filter)
  const hasIdempotency = !!data.idempotency
  const hasAsync = !!data.async
  const isInternal = !!data.isInternal

  // Support both old format (fromOperation/toTarget) and new format (from/to objects)
  const fromOperation = data.from?.operation || (data as Record<string, unknown>).fromOperation as string | undefined
  const toTargets = data.to
    ? Array.isArray(data.to)
      ? data.to
      : [data.to]
    : []
  const toTarget = toTargets[0]?.target || (data as Record<string, unknown>).toTarget as string | undefined

  return (
    <div
      className={`
        px-4 py-3 rounded-lg bg-neutral-800 border-2 shadow-md min-w-[180px] transition-all duration-300
        ${selected ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
          : isPausedHere ? 'border-amber-500 shadow-lg shadow-amber-500/30'
          : activeThread ? 'border-green-500/60 shadow-md shadow-green-500/20'
          : 'border-neutral-700'}
      `}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-neutral-400" />
      <Handle type="target" position={Position.Top} id="aspect-target-top" className="w-2.5 h-2.5 !bg-transparent !border-2 !border-neutral-500" />
      <Handle type="target" position={Position.Bottom} id="aspect-target-bottom" className="w-2.5 h-2.5 !bg-transparent !border-2 !border-neutral-500" />

      <div className="flex items-center gap-2 mb-2">
        <ArrowRight className="w-4 h-4 text-indigo-400" />
        <span className="font-semibold text-neutral-100">{data.label}</span>
        {isPausedHere && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-900/50 border border-amber-700/50 rounded text-[10px] text-amber-400 font-medium animate-pulse">
            <Bug className="w-3 h-3" />
            {stoppedAt?.stage}
          </span>
        )}
        {activeThread && !isPausedHere && (
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title={`Running: ${activeThread.stage}`} />
        )}
        <div className="flex items-center gap-1 ml-auto">
          {isInternal && <span title="Internal (no from block)"><EyeOff className="w-3.5 h-3.5 text-neutral-400" /></span>}
          {hasAsync && <span title="Async execution"><Timer className="w-3.5 h-3.5 text-sky-400" /></span>}
          {hasIdempotency && <span title="Idempotent"><Fingerprint className="w-3.5 h-3.5 text-violet-400" /></span>}
          {hasSchedule && <span title="Scheduled"><Clock className="w-3.5 h-3.5 text-orange-400" /></span>}
          {/* Registry-driven block indicators */}
          {indicators.map(block => {
            const isVisible = block.nodeIndicator!.isVisible
              ? block.nodeIndicator!.isVisible(data)
              : block.isActive(data)
            if (!isVisible) return null
            const Icon = block.icon
            return (
              <span key={block.key} title={block.nodeIndicator!.title}>
                <Icon className={`w-3.5 h-3.5 ${block.color}`} />
              </span>
            )
          })}
          {hasRequire && <span title="Requires auth"><Shield className="w-3.5 h-3.5 text-green-400" /></span>}
        </div>
      </div>

      {fromOperation && (
        <div className="text-xs text-neutral-400 mb-1">
          <span className="font-medium text-neutral-300">From:</span> {fromOperation}
          {hasFilter && <span className="ml-1 text-amber-400" title="Has filter">(filtered)</span>}
        </div>
      )}

      {toTarget && (
        <div className="text-xs text-neutral-400 mb-1">
          <span className="font-medium text-neutral-300">To:</span> {toTarget}
          {toTargets.length > 1 && (
            <span className="ml-1 text-blue-400">+{toTargets.length - 1} more</span>
          )}
        </div>
      )}

      {hasTransform && (
        <div className="mt-2 px-2 py-1 bg-amber-900/30 border border-amber-700/50 rounded text-xs">
          <span className="font-medium text-amber-400">Transform</span>
          <span className="text-amber-500 ml-1">
            ({Object.keys(data.transform!.fields).length} fields)
          </span>
        </div>
      )}

      {hasSteps && (
        <div className="mt-2 px-2 py-1 bg-blue-900/30 border border-blue-700/50 rounded text-xs">
          <span className="font-medium text-blue-400">Steps</span>
          <span className="text-blue-500 ml-1">
            ({data.steps!.length} step{data.steps!.length > 1 ? 's' : ''})
          </span>
        </div>
      )}

      {hasCache && (
        <div className="mt-2 px-2 py-1 bg-cyan-900/30 border border-cyan-700/50 rounded text-xs">
          <span className="font-medium text-cyan-400">Cache</span>
          <span className="text-cyan-500 ml-1">
            ({data.cache!.ttl})
          </span>
        </div>
      )}

      {data.batch && (
        <div className="mt-2 px-2 py-1 bg-orange-900/30 border border-orange-700/50 rounded text-xs">
          <span className="font-medium text-orange-400">Batch</span>
          <span className="text-orange-500 ml-1">
            ({data.batch.source} → {data.batch.to?.connector}{data.batch.chunkSize ? `, ${data.batch.chunkSize}/chunk` : ''})
          </span>
        </div>
      )}

      {(hasEnrich && !hasSteps) && (
        <div className="mt-2 px-2 py-1 bg-purple-900/30 border border-purple-700/50 rounded text-xs">
          <span className="font-medium text-purple-400">Enrich</span>
          <span className="text-purple-500 ml-1">
            ({data.enrich!.length} source{data.enrich!.length > 1 ? 's' : ''})
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-neutral-400" />
    </div>
  )
}

export default memo(FlowNode)
