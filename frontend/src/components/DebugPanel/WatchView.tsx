import { useState } from 'react'
import { Plus, X, AlertCircle } from 'lucide-react'
import { useDebugStore } from '../../stores/useDebugStore'

export default function WatchView() {
  const { watchExpressions, watchResults, stoppedAt, addWatch, removeWatch } = useDebugStore()
  const [newExpr, setNewExpr] = useState('')

  const handleAdd = () => {
    if (newExpr.trim()) {
      addWatch(newExpr.trim())
      setNewExpr('')
    }
  }

  return (
    <div className="h-full flex flex-col text-xs">
      {/* Add expression */}
      <div className="flex items-center gap-1 p-1 border-b border-neutral-800">
        <input
          value={newExpr}
          onChange={e => setNewExpr(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); e.stopPropagation() }}
          placeholder="Add CEL expression..."
          className="flex-1 bg-neutral-800 text-white px-2 py-1 rounded border border-neutral-700 outline-none font-mono text-xs"
        />
        <button
          onClick={handleAdd}
          className="p-1 rounded text-neutral-500 hover:text-green-400 hover:bg-neutral-800"
          title="Add watch"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Watch list */}
      <div className="flex-1 overflow-auto">
        {watchExpressions.length === 0 ? (
          <div className="p-4 text-center text-neutral-500">
            No watch expressions. Add CEL expressions to evaluate at breakpoints.
          </div>
        ) : (
          watchExpressions.map(expr => {
            const result = watchResults.get(expr)
            return (
              <div
                key={expr}
                className="flex items-start gap-1 px-2 py-1 border-b border-neutral-800/50 hover:bg-neutral-800/30 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-blue-400 truncate">{expr}</div>
                  {stoppedAt && result && (
                    result.error ? (
                      <div className="flex items-center gap-1 text-red-400 mt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate">{result.error}</span>
                      </div>
                    ) : (
                      <div className="text-green-400 font-mono mt-0.5 truncate" title={result.value}>
                        {result.value} <span className="text-neutral-500">({result.type})</span>
                      </div>
                    )
                  )}
                  {!stoppedAt && (
                    <div className="text-neutral-600 italic mt-0.5">not evaluated</div>
                  )}
                </div>
                <button
                  onClick={() => removeWatch(expr)}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-700 shrink-0 mt-0.5"
                >
                  <X className="w-3 h-3 text-neutral-500" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
