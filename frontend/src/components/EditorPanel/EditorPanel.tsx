import { useCallback, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { useEditorPanelStore } from '../../stores/useEditorPanelStore'
import { useStudioStore } from '../../stores/useStudioStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { generateProject } from '../../utils/hclGenerator'
import EditorGroupView from './EditorGroup'

export default function EditorPanel() {
  const { panelHeight, isCollapsed, groups, splitDirection, splitRatio, setPanelHeight, toggleCollapse } = useEditorPanelStore()
  const { nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig } = useStudioStore()
  const projectFiles = useProjectStore(s => s.files)
  const mycelRoot = useProjectStore(s => s.mycelRoot)
  const [isResizing, setIsResizing] = useState(false)
  const [isSplitResizing, setIsSplitResizing] = useState(false)

  const existingPaths = useMemo(() => new Set(projectFiles.map(f => f.relativePath)), [projectFiles])
  const project = useMemo(
    () => generateProject(nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig, mycelRoot, existingPaths),
    [nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig, mycelRoot, existingPaths]
  )

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const startY = e.clientY
    const startHeight = panelHeight

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startY - e.clientY
      setPanelHeight(startHeight + delta)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [panelHeight, setPanelHeight])

  const handleSplitResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsSplitResizing(true)

    const container = (e.target as HTMLElement).parentElement
    if (!container) return

    const containerSize = splitDirection === 'horizontal'
      ? container.clientWidth
      : container.clientHeight

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = splitDirection === 'horizontal' ? e.clientX : e.clientY
      const rect = container.getBoundingClientRect()
      const offset = splitDirection === 'horizontal'
        ? currentPos - rect.left
        : currentPos - rect.top
      const ratio = Math.max(0.2, Math.min(0.8, offset / containerSize))
      useEditorPanelStore.setState({ splitRatio: ratio })
    }

    const handleMouseUp = () => {
      setIsSplitResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [splitDirection])

  const hasErrors = project.errors.length > 0

  return (
    <div className="flex-shrink-0 relative">
      {/* Collapse toggle - pill sitting ON TOP of the divider line */}
      <button
        onClick={toggleCollapse}
        title={isCollapsed ? 'Show editor panel (Ctrl+J)' : 'Hide editor panel (Ctrl+J)'}
        className={`absolute left-1/2 -translate-x-1/2 z-20 flex items-center justify-center bg-neutral-800 border border-neutral-700 hover:bg-indigo-600 hover:border-indigo-500 transition-all shadow-lg ${
          isCollapsed
            ? '-top-5 w-8 h-5 rounded-t-md border-b-0'
            : '-top-5 w-8 h-5 rounded-t-md border-b-0'
        }`}
      >
        {isCollapsed
          ? <ChevronUp className="w-3 h-3 text-neutral-300" />
          : <ChevronDown className="w-3 h-3 text-neutral-300" />
        }
      </button>

      {/* Resize handle */}
      <div
        className={`h-1 cursor-ns-resize hover:bg-indigo-500/50 transition-colors ${isResizing ? 'bg-indigo-500/50' : 'bg-neutral-800'}`}
        onMouseDown={!isCollapsed ? handleResizeMouseDown : undefined}
      />

      {/* Panel content */}
      <div
        style={{ height: isCollapsed ? 0 : panelHeight }}
        className={`bg-neutral-900 border-t border-neutral-800 overflow-hidden transition-[height] duration-200 ease-in-out ${isResizing || isSplitResizing ? 'select-none transition-none' : ''}`}
      >
        {/* Errors bar */}
        {hasErrors && !isCollapsed && (
          <div className="px-3 py-1 bg-amber-900/20 border-b border-amber-800/50 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-xs text-amber-400 truncate">
              {project.errors.length} warning{project.errors.length > 1 ? 's' : ''}: {project.errors[0]}
            </span>
          </div>
        )}

        {/* Editor groups */}
        <div
          className={`h-full ${
            splitDirection === 'horizontal' ? 'flex flex-row' :
            splitDirection === 'vertical' ? 'flex flex-col' :
            ''
          }`}
        >
          {/* Main group */}
          <div
            style={splitDirection ? { flexBasis: `${splitRatio * 100}%` } : undefined}
            className={splitDirection ? 'min-w-0 min-h-0 overflow-hidden' : 'h-full'}
          >
            <EditorGroupView groupId={groups[0]?.id || 'main'} />
          </div>

          {/* Split resize handle */}
          {splitDirection && groups.length > 1 && (
            <div
              className={`shrink-0 hover:bg-indigo-500/50 transition-colors ${
                splitDirection === 'horizontal'
                  ? 'w-1 cursor-ew-resize bg-neutral-800'
                  : 'h-1 cursor-ns-resize bg-neutral-800'
              } ${isSplitResizing ? 'bg-indigo-500/50' : ''}`}
              onMouseDown={handleSplitResizeMouseDown}
            />
          )}

          {/* Secondary group */}
          {splitDirection && groups.length > 1 && (
            <div
              style={{ flexBasis: `${(1 - splitRatio) * 100}%` }}
              className="min-w-0 min-h-0 overflow-hidden"
            >
              <EditorGroupView groupId={groups[1].id} isSecondary />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
