// Git panel — shows commit graph + commit details
// Tab in the bottom panel area alongside Terminal, Debug, Output, Hints

import { useEffect, useState, useRef, useCallback } from 'react'
import { GitBranch, RefreshCw, X } from 'lucide-react'
import { useGitStore } from '../../stores/useGitStore'
import { useProjectStore } from '../../stores/useProjectStore'
import GitGraph from './GitGraph'
import CommitDetails from './CommitDetails'

interface GitPanelProps {
  isVisible?: boolean
}

const DETAILS_WIDTH_KEY = 'mycel-git-details-width'
const DEFAULT_WIDTH = 320

export default function GitPanel({ isVisible }: GitPanelProps) {
  const { commits, isLoading, refresh, filterFile, clearFilter } = useGitStore()
  const projectPath = useProjectStore(s => s.projectPath)
  const [detailsWidth, setDetailsWidth] = useState(() => {
    try { return parseInt(localStorage.getItem(DETAILS_WIDTH_KEY) || '') || DEFAULT_WIDTH }
    catch { return DEFAULT_WIDTH }
  })
  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const selectedCommit = useGitStore(s => s.selectedCommit)

  // Load on first visible, poll every 10s only when no commit is selected (avoids graph crash)
  useEffect(() => {
    if (!isVisible || !projectPath) return
    if (commits.length === 0) refresh()
    if (selectedCommit) return // Don't poll while viewing a commit
    const interval = setInterval(() => refresh(), 10000)
    return () => clearInterval(interval)
  }, [isVisible, projectPath, selectedCommit])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = detailsWidth

    const handleMove = (ev: MouseEvent) => {
      const delta = startXRef.current - ev.clientX
      const newWidth = Math.max(200, Math.min(600, startWidthRef.current + delta))
      setDetailsWidth(newWidth)
    }
    const handleUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      try { localStorage.setItem(DETAILS_WIDTH_KEY, String(detailsWidth)) } catch { /* ignore */ }
    }
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }, [detailsWidth])

  // Save width on change
  useEffect(() => {
    if (!isResizing) {
      try { localStorage.setItem(DETAILS_WIDTH_KEY, String(detailsWidth)) } catch { /* ignore */ }
    }
  }, [detailsWidth, isResizing])

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-neutral-700 shrink-0">
        <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-xs font-medium text-neutral-300">Git</span>
        <span className="text-[10px] text-neutral-500">{commits.length} commits</span>
        {filterFile && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded">
            {filterFile.split('/').pop()}
            <button onClick={clearFilter} className="hover:text-amber-200"><X className="w-2.5 h-2.5" /></button>
          </span>
        )}
        <button
          onClick={() => refresh()}
          className="ml-auto p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
          title="Refresh"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content: graph + resizable details */}
      <div className="flex-1 flex min-h-0">
        {/* Git graph (left — fills remaining space) */}
        <div className="flex-1 min-w-0 border-r border-neutral-800">
          <GitGraph commits={commits} onSelectCommit={useGitStore.getState().selectCommit} selectedHash={selectedCommit?.hash} />
        </div>

        {/* Resize handle */}
        <div
          className={`w-1 cursor-col-resize hover:bg-indigo-500/50 ${isResizing ? 'bg-indigo-500/50' : ''}`}
          onMouseDown={handleResizeStart}
        />

        {/* Commit details (right — resizable) */}
        <div style={{ width: detailsWidth }} className="shrink-0">
          <CommitDetails />
        </div>
      </div>
    </div>
  )
}
