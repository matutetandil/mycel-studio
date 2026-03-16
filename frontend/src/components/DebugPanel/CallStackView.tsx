import { useDebugStore } from '../../stores/useDebugStore'

// Pipeline stage order for visual call stack
const STAGE_ORDER = [
  'input', 'sanitize', 'filter', 'dedupe', 'validate_input',
  'enrich', 'transform', 'step', 'validate_output', 'write', 'read',
  'cache_hit', 'cache_miss', 'response',
]

const stageLabels: Record<string, string> = {
  input: 'Input',
  sanitize: 'Sanitize',
  filter: 'Filter',
  dedupe: 'Deduplicate',
  validate_input: 'Validate Input',
  enrich: 'Enrich',
  transform: 'Transform',
  step: 'Step',
  validate_output: 'Validate Output',
  write: 'Write',
  read: 'Read',
  cache_hit: 'Cache Hit',
  cache_miss: 'Cache Miss',
  response: 'Response',
}

export default function CallStackView() {
  const { stoppedAt, threads, activeThreadId } = useDebugStore()

  const thread = threads.find(t => t.id === activeThreadId)

  if (!thread) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 text-xs p-4 text-center">
        No active debug thread. Trigger a request to see the pipeline call stack.
      </div>
    )
  }

  const currentStage = stoppedAt?.stage || thread.stage
  const currentIdx = STAGE_ORDER.indexOf(currentStage)

  return (
    <div className="h-full overflow-auto text-xs p-2">
      <div className="text-neutral-500 text-[10px] uppercase tracking-wider mb-2">
        Pipeline: {thread.flowName}
      </div>
      <div className="space-y-0.5">
        {STAGE_ORDER.map((stage, i) => {
          const isCurrent = stage === currentStage
          const isPast = i < currentIdx
          const isFuture = i > currentIdx

          return (
            <div
              key={stage}
              className={`flex items-center gap-2 px-2 py-1 rounded ${
                isCurrent
                  ? stoppedAt ? 'bg-amber-900/30 border border-amber-700/50' : 'bg-blue-900/30 border border-blue-700/50'
                  : isPast ? 'bg-neutral-800/30' : ''
              }`}
            >
              {/* Stage indicator */}
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                isCurrent
                  ? stoppedAt ? 'bg-amber-400' : 'bg-blue-400 animate-pulse'
                  : isPast ? 'bg-green-600' : 'bg-neutral-700'
              }`} />

              <span className={`${
                isCurrent ? 'text-white font-medium' : isPast ? 'text-neutral-400' : isFuture ? 'text-neutral-600' : 'text-neutral-400'
              }`}>
                {stageLabels[stage] || stage}
              </span>

              {isCurrent && stoppedAt?.rule && (
                <span className="text-amber-400 ml-auto text-[10px]">
                  [{stoppedAt.rule.target}]
                </span>
              )}

              {isCurrent && stoppedAt && (
                <span className="text-amber-400 text-[10px] ml-auto">PAUSED</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
