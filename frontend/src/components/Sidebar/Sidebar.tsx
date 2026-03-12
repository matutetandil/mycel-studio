import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
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

  return (
    <div className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col overflow-hidden">
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
  )
}
