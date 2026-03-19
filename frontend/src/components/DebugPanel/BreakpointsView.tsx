import { Circle, X } from 'lucide-react'
import { useDebugStore } from '../../stores/useDebugStore'

export default function BreakpointsView() {
  const breakpoints = useDebugStore(s => s.breakpoints)
  const setBreakpoints = useDebugStore(s => s.setBreakpoints)

  const allBps: Array<{ flow: string; stage: string; ruleIndex: number; condition?: string }> = []
  for (const [flow, specs] of breakpoints) {
    for (const spec of specs) {
      allBps.push({ flow, ...spec })
    }
  }

  if (allBps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 text-xs p-4 text-center">
        No breakpoints set. Click on a line number in the editor to add one.
      </div>
    )
  }

  const handleRemove = (flow: string, stage: string, ruleIndex: number) => {
    const current = breakpoints.get(flow) || []
    const filtered = current.filter(b => !(b.stage === stage && b.ruleIndex === ruleIndex))
    setBreakpoints(flow, filtered)
  }

  return (
    <div className="h-full overflow-auto text-xs p-1">
      {allBps.map((bp, i) => (
        <div
          key={`${bp.flow}:${bp.stage}:${bp.ruleIndex}:${i}`}
          className="flex items-center gap-2 px-2 py-1 hover:bg-neutral-800 rounded group"
        >
          <Circle className="w-2.5 h-2.5 text-red-500 fill-red-500 shrink-0" />
          <span className="text-blue-400 font-mono">{bp.flow}</span>
          <span className="text-neutral-600">:</span>
          <span className="text-neutral-300">{bp.stage}</span>
          {bp.ruleIndex >= 0 && (
            <span className="text-neutral-500">[{bp.ruleIndex}]</span>
          )}
          {bp.condition && (
            <span className="text-amber-400 truncate" title={bp.condition}>if {bp.condition}</span>
          )}
          <div className="flex-1" />
          <button
            onClick={() => handleRemove(bp.flow, bp.stage, bp.ruleIndex)}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-neutral-700 rounded text-neutral-500 hover:text-red-400"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
