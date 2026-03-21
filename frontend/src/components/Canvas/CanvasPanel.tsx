// CanvasPanel wraps the main canvas area in visual-first mode.
// When multiple projects are attached, shows a tab bar to switch between canvases.
// When only one project, renders Canvas directly (no tab overhead).

import { useCallback } from 'react'
import { LayoutGrid, X } from 'lucide-react'
import { useMultiProjectStore } from '../../stores/useMultiProjectStore'
import Canvas from './Canvas'

export default function CanvasPanel() {
  const { projectOrder, projects, activeProjectId, setActiveProject, removeProject } = useMultiProjectStore()

  // Ensure the correct project is active when interacting with the canvas
  const handleCanvasInteraction = useCallback(() => {
    // Canvas always shows the active project — nothing to do here
    // The tab click already switches. This handler is for future use
    // if we ever render multiple canvases simultaneously.
  }, [])

  // Single or no project — render canvas directly (backward-compatible)
  if (projectOrder.length <= 1) {
    return <Canvas />
  }

  // Multiple projects — show tab bar at top
  return (
    <div className="h-full flex flex-col">
      {/* Canvas tab bar */}
      <div className="flex items-center bg-neutral-900 border-b border-neutral-800 min-h-[29px] shrink-0">
        {projectOrder.map(id => {
          const project = projects.get(id)
          if (!project) return null
          const isActive = id === activeProjectId
          return (
            <div
              key={id}
              onClick={() => setActiveProject(id)}
              className={`
                group flex items-center gap-1.5 px-3 py-1 text-xs border-r border-neutral-800 cursor-pointer shrink-0 select-none
                ${isActive
                  ? 'bg-neutral-800 text-white border-b-2 border-b-indigo-500'
                  : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-850 hover:text-neutral-300'}
              `}
            >
              <LayoutGrid className={`w-3 h-3 shrink-0 ${isActive ? 'text-indigo-400' : 'text-neutral-500'}`} />
              <span className="max-w-32 truncate">{project.projectName || 'Unnamed'}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeProject(id)
                }}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-700 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Active canvas — clicking anywhere ensures this project is active */}
      <div className="flex-1 min-h-0" onMouseDown={handleCanvasInteraction}>
        <Canvas />
      </div>
    </div>
  )
}
