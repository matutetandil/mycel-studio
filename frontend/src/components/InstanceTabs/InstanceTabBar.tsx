// Top-level tab bar for workspace instances (like Chrome tabs).
// Each tab is a completely independent workspace with its own projects.

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useInstanceStore } from '../../stores/useInstanceStore'

export default function InstanceTabBar() {
  const { instances, activeInstanceId, addInstance, removeInstance, switchInstance, getInstanceLabel } = useInstanceStore()
  const [dragOverIndex] = useState<number | null>(null)

  return (
    <div className="flex items-center bg-neutral-950 border-b border-neutral-800 min-h-[30px] shrink-0 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Tabs */}
      <div
        className="flex-1 flex items-center overflow-x-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {instances.map((inst, index) => {
          const isActive = inst.id === activeInstanceId
          const label = getInstanceLabel(inst.id)
          return (
            <div
              key={inst.id}
              onClick={() => switchInstance(inst.id)}
              className={`
                group flex items-center gap-1.5 px-3 py-1 text-xs cursor-pointer shrink-0
                ${isActive
                  ? 'bg-neutral-900 text-white border-b-2 border-b-indigo-500'
                  : 'bg-neutral-950 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'}
                ${dragOverIndex === index ? 'border-l-2 border-l-indigo-500' : ''}
              `}
            >
              <span className="max-w-40 truncate">{label}</span>
              {instances.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeInstance(inst.id)
                  }}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-700 shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Add tab button */}
      <button
        onClick={() => addInstance()}
        className="p-1.5 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded shrink-0 mx-1"
        title="New workspace tab"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
