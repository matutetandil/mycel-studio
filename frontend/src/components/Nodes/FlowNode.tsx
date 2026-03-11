import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { ArrowRight, Clock, Lock, Shield, Database as CacheIcon, Layers, AlertTriangle, MessageSquare, Copy } from 'lucide-react'
import type { FlowNodeData } from '../../types'

interface FlowNodeProps {
  data: FlowNodeData
  selected?: boolean
}

function FlowNode({ data, selected }: FlowNodeProps) {
  const hasTransform = data.transform && data.transform.fields && Object.keys(data.transform.fields).length > 0
  const hasSchedule = !!data.when
  const hasLock = !!data.lock || !!data.semaphore
  const hasCache = !!data.cache
  const hasRequire = !!data.require
  const hasSteps = data.steps && data.steps.length > 0
  const hasEnrich = data.enrich && data.enrich.length > 0
  const hasErrorHandling = !!data.errorHandling
  const hasResponse = !!data.response
  const hasDedupe = !!data.dedupe
  const hasFilter = !!(data.from?.filter)

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
        px-4 py-3 rounded-lg bg-neutral-800 border-2 shadow-md min-w-[180px]
        ${selected ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-neutral-700'}
      `}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-neutral-400" />

      <div className="flex items-center gap-2 mb-2">
        <ArrowRight className="w-4 h-4 text-indigo-400" />
        <span className="font-semibold text-neutral-100">{data.label}</span>
        <div className="flex items-center gap-1 ml-auto">
          {hasSchedule && <span title="Scheduled"><Clock className="w-3.5 h-3.5 text-orange-400" /></span>}
          {hasLock && <span title="Has lock/semaphore"><Lock className="w-3.5 h-3.5 text-yellow-400" /></span>}
          {hasCache && <span title="Cached"><CacheIcon className="w-3.5 h-3.5 text-cyan-400" /></span>}
          {hasSteps && <span title="Has steps"><Layers className="w-3.5 h-3.5 text-blue-400" /></span>}
          {hasDedupe && <span title="Deduplication"><Copy className="w-3.5 h-3.5 text-teal-400" /></span>}
          {hasResponse && <span title="Custom response"><MessageSquare className="w-3.5 h-3.5 text-green-400" /></span>}
          {hasErrorHandling && <span title="Error handling"><AlertTriangle className="w-3.5 h-3.5 text-red-400" /></span>}
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
