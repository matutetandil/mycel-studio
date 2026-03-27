import { useState } from 'react'
import { Circle, Pencil, X, Check } from 'lucide-react'
import { useDebugStore } from '../../stores/useDebugStore'

export default function BreakpointsView() {
  const breakpoints = useDebugStore(s => s.breakpoints)
  const setBreakpoints = useDebugStore(s => s.setBreakpoints)
  const editBreakpointCondition = useDebugStore(s => s.editBreakpointCondition)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

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

  const startEditing = (bp: typeof allBps[0]) => {
    const key = `${bp.flow}:${bp.stage}:${bp.ruleIndex}`
    setEditingKey(key)
    setEditValue(bp.condition || '')
  }

  const commitEdit = (bp: typeof allBps[0]) => {
    editBreakpointCondition(bp.flow, bp.stage, bp.ruleIndex, editValue.trim())
    setEditingKey(null)
  }

  return (
    <div className="h-full overflow-auto text-xs p-1">
      {allBps.map((bp, i) => {
        const key = `${bp.flow}:${bp.stage}:${bp.ruleIndex}`
        const isEditing = editingKey === key

        return (
          <div
            key={`${key}:${i}`}
            className="flex items-center gap-2 px-2 py-1 hover:bg-neutral-800 rounded group"
          >
            <Circle className={`w-2.5 h-2.5 shrink-0 ${bp.condition ? 'text-amber-500 fill-amber-500' : 'text-red-500 fill-red-500'}`} />
            <span className="text-blue-400 font-mono">{bp.flow}</span>
            <span className="text-neutral-600">:</span>
            <span className="text-neutral-300">{bp.stage}</span>
            {bp.ruleIndex >= 0 && (
              <span className="text-neutral-500">[{bp.ruleIndex}]</span>
            )}
            {isEditing ? (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="text-amber-400 shrink-0">if</span>
                <input
                  autoFocus
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit(bp)
                    if (e.key === 'Escape') setEditingKey(null)
                    e.stopPropagation()
                  }}
                  placeholder="CEL expression"
                  className="flex-1 min-w-0 px-1.5 py-0.5 text-xs font-mono bg-neutral-900 border border-neutral-600 rounded text-amber-300 outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => commitEdit(bp)}
                  className="p-0.5 hover:bg-neutral-700 rounded text-green-400"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : bp.condition ? (
              <span
                className="text-amber-400 truncate cursor-pointer hover:text-amber-300"
                title={`Condition: ${bp.condition} (click to edit)`}
                onClick={() => startEditing(bp)}
              >
                if {bp.condition}
              </span>
            ) : (
              <button
                onClick={() => startEditing(bp)}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-neutral-700 rounded text-neutral-500 hover:text-amber-400"
                title="Add condition"
              >
                <Pencil className="w-2.5 h-2.5" />
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => handleRemove(bp.flow, bp.stage, bp.ruleIndex)}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-neutral-700 rounded text-neutral-500 hover:text-red-400"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
