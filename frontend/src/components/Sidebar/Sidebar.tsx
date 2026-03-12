import { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react'
import FileTree from '../FileTree/FileTree'
import Palette from '../Palette/Palette'

interface CollapsibleSectionProps {
  title: string
  defaultExpanded?: boolean
  children: React.ReactNode
}

function CollapsibleSection({
  title,
  defaultExpanded = true,
  children,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border-b border-neutral-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        {title}
      </button>
      {isExpanded && <div className="pb-2">{children}</div>}
    </div>
  )
}

export default function Sidebar() {
  const [componentsExpanded, setComponentsExpanded] = useState(true)
  const [width, setWidth] = useState(280)
  const [collapsed, setCollapsed] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

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
  }, [width])

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
        className={`bg-neutral-900 border-r border-neutral-800 overflow-hidden h-full transition-[width] duration-200 ease-in-out ${isResizing ? 'select-none transition-none' : ''}`}
      >
        <div style={{ width }} className="flex flex-col h-full">
          {/* File Tree Section */}
          <CollapsibleSection title="Explorer" defaultExpanded>
            <div className="max-h-64 overflow-y-auto">
              <FileTree />
            </div>
          </CollapsibleSection>

          {/* Components Palette Section - fills remaining space with scroll */}
          <div className="flex-1 min-h-0 flex flex-col border-b border-neutral-800">
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
