import { useState, useCallback, useRef } from 'react'
import { ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react'
import FileTree from '../FileTree/FileTree'
import Palette from '../Palette/Palette'
import { useLayoutStore } from '../../stores/useLayoutStore'

export default function Sidebar() {
  const [explorerExpanded, setExplorerExpanded] = useState(true)
  const [componentsExpanded, setComponentsExpanded] = useState(true)
  const width = useLayoutStore(s => s.leftWidth)
  const setWidth = useLayoutStore(s => s.setLeftWidth)
  const collapsed = useLayoutStore(s => s.leftCollapsed)
  const setCollapsed = useLayoutStore(s => s.setLeftCollapsed)
  const [isResizing, setIsResizing] = useState(false)
  const [isSplitResizing, setIsSplitResizing] = useState(false)
  const [splitRatio, setSplitRatio] = useState(0.5) // Explorer gets this fraction of total height
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const startX = e.clientX
    const startWidth = width

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startX)
      setWidth(Math.max(200, Math.min(480, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [width, setWidth])

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsSplitResizing(true)

    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const y = e.clientY - rect.top
      const ratio = y / rect.height
      setSplitRatio(Math.max(0.15, Math.min(0.85, ratio)))
    }

    const handleMouseUp = () => {
      setIsSplitResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  // Header height for each section (~32px)
  const HEADER_H = 32

  return (
    <div className="relative flex-shrink-0 h-full">
      {/* Collapse toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`absolute top-5 z-20 flex items-center justify-center bg-neutral-800 border border-neutral-700 hover:bg-indigo-600 hover:border-indigo-500 transition-all shadow-lg ${
          collapsed
            ? 'left-0 w-5 h-8 rounded-r-md border-l-0'
            : '-right-3 w-6 h-6 rounded-full'
        }`}
      >
        {collapsed ? <ChevronRight className="w-3 h-3 text-neutral-300" /> : <ChevronLeft className="w-3 h-3 text-neutral-300" />}
      </button>

      <div
        style={{ width: collapsed ? 0 : width }}
        className={`bg-neutral-900 border-r border-neutral-800 overflow-hidden h-full transition-[width] duration-200 ease-in-out ${isResizing || isSplitResizing ? 'select-none transition-none' : ''}`}
      >
        <div ref={containerRef} style={{ width }} className="flex flex-col h-full">
          {/* Explorer Section */}
          <div
            className="flex flex-col min-h-0 border-b border-neutral-800"
            style={{
              height: explorerExpanded && componentsExpanded
                ? `calc(${splitRatio * 100}% - ${HEADER_H / 2}px)`
                : explorerExpanded ? '100%' : undefined,
              flexShrink: explorerExpanded ? undefined : 0,
            }}
          >
            <button
              onClick={() => setExplorerExpanded(!explorerExpanded)}
              className="w-full flex items-center gap-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 shrink-0"
            >
              {explorerExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Explorer
            </button>
            {explorerExpanded && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <FileTree />
              </div>
            )}
          </div>

          {/* Resize handle between sections */}
          {explorerExpanded && componentsExpanded && (
            <div
              className="h-1 cursor-ns-resize hover:bg-indigo-500/50 transition-colors shrink-0"
              onMouseDown={handleSplitMouseDown}
            />
          )}

          {/* Components Palette Section */}
          <div className="flex-1 min-h-0 flex flex-col">
            <button
              onClick={() => setComponentsExpanded(!componentsExpanded)}
              className="w-full flex items-center gap-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 shrink-0"
            >
              {componentsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Components
            </button>
            {componentsExpanded && (
              <div className="flex-1 min-h-0 overflow-y-auto pb-2">
                <Palette />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resize handle (hidden when collapsed) */}
      {!collapsed && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-indigo-500/50 transition-colors"
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  )
}
