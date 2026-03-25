import { useCallback, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, FileCode, Terminal, Bug, Eye, ScrollText, Lightbulb } from 'lucide-react'
import { useEditorPanelStore } from '../../stores/useEditorPanelStore'
import { useStudioStore } from '../../stores/useStudioStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useDebugStore } from '../../stores/useDebugStore'
import { useOutputStore } from '../../stores/useOutputStore'
import { useLayoutStore } from '../../stores/useLayoutStore'
import { generateProject } from '../../utils/hclGenerator'
import EditorGroupView from './EditorGroup'
import TerminalPanel from './TerminalPanel'
import DebugPanel from '../DebugPanel/DebugPanel'
import OutputPanel from './OutputPanel'
import HintsPanel from './HintsPanel'
import { useHintsStore } from '../../stores/useHintsStore'
import CanvasPanel from '../Canvas/CanvasPanel'

type PanelTab = 'editor' | 'terminal' | 'debug' | 'output' | 'hints'

export default function EditorPanel() {
  const { panelHeight, isCollapsed, groups, splitDirection, splitRatio, setPanelHeight, toggleCollapse } = useEditorPanelStore()
  const { nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig } = useStudioStore()
  const projectFiles = useProjectStore(s => s.files)
  const mycelRoot = useProjectStore(s => s.mycelRoot)

  const debugStatus = useDebugStore(s => s.status)
  const debugStopped = useDebugStore(s => s.stoppedAt)
  const outputCount = useOutputStore(s => s.entries.length)
  const hintsCount = useHintsStore(s => s.hints.filter(h => h.status === 'active').length)
  const viewMode = useLayoutStore(s => s.viewMode)
  const [isResizing, setIsResizing] = useState(false)
  const [isSplitResizing, setIsSplitResizing] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelTab>('editor')

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

  const handlePanelTabClick = (tab: PanelTab) => {
    if (isCollapsed) {
      toggleCollapse()
      setActivePanel(tab)
    } else if (activePanel === tab) {
      toggleCollapse()
    } else {
      setActivePanel(tab)
    }
  }

  // When toggling terminal from keyboard/menu, switch to terminal panel
  const switchToTerminal = useCallback(() => {
    if (activePanel !== 'terminal') {
      setActivePanel('terminal')
    }
    if (isCollapsed) {
      toggleCollapse()
    }
    // Create a terminal if none exist
    if (useTerminalStore.getState().terminals.length === 0) {
      useTerminalStore.getState().createTerminal()
    }
  }, [activePanel, isCollapsed, toggleCollapse])

  // When toggling debug from keyboard/event, switch to debug panel
  const switchToDebug = useCallback(() => {
    if (activePanel !== 'debug') {
      setActivePanel('debug')
    }
    if (isCollapsed) {
      toggleCollapse()
    }
  }, [activePanel, isCollapsed, toggleCollapse])

  // Expose switch methods globally for keyboard shortcut access
  useMemo(() => {
    EditorPanel.switchToTerminal = switchToTerminal
    EditorPanel.switchToDebug = switchToDebug
  }, [switchToTerminal, switchToDebug])

  const hasErrors = project.errors.length > 0

  const panelContent = (
    <div className="flex h-full">
      {/* Left icon bar */}
      <div className="w-10 shrink-0 bg-neutral-950 border-r border-neutral-800 flex flex-col items-center py-1 gap-0.5">
        <button
          onClick={() => handlePanelTabClick('editor')}
          title={viewMode === 'visual-first' ? 'Editor' : 'Visual Editor'}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activePanel === 'editor' && !isCollapsed
              ? 'bg-neutral-800 text-white border-l-2 border-indigo-500'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          {viewMode === 'visual-first'
            ? <FileCode className="w-4 h-4" />
            : <Eye className="w-4 h-4" />
          }
        </button>
        <button
          onClick={() => handlePanelTabClick('terminal')}
          title="Terminal (Cmd+`)"
          className={`relative w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activePanel === 'terminal' && !isCollapsed
              ? 'bg-neutral-800 text-white border-l-2 border-green-500'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
        </button>
        <button
          onClick={() => handlePanelTabClick('debug')}
          title="Debug"
          className={`relative w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activePanel === 'debug' && !isCollapsed
              ? 'bg-neutral-800 text-white border-l-2 border-amber-500'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <Bug className="w-4 h-4" />
          {debugStatus === 'connected' && (
            <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ${
              debugStopped ? 'bg-amber-500 animate-pulse' : 'bg-green-500'
            }`} />
          )}
        </button>
        <button
          onClick={() => handlePanelTabClick('output')}
          title="Output"
          className={`relative w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activePanel === 'output' && !isCollapsed
              ? 'bg-neutral-800 text-white border-l-2 border-sky-500'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <ScrollText className="w-4 h-4" />
          {outputCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-sky-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
              {outputCount > 99 ? '99' : outputCount}
            </span>
          )}
        </button>
        <button
          onClick={() => handlePanelTabClick('hints')}
          title="Organization Hints"
          className={`relative w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activePanel === 'hints' && !isCollapsed
              ? 'bg-neutral-800 text-white border-l-2 border-amber-500'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          {hintsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
              {hintsCount > 9 ? '9+' : hintsCount}
            </span>
          )}
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Errors bar */}
        {hasErrors && (
          <div className="px-3 py-1 bg-amber-900/20 border-b border-amber-800/50 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-xs text-amber-400 truncate">
              {project.errors.length} warning{project.errors.length > 1 ? 's' : ''}: {project.errors[0]}
            </span>
          </div>
        )}

        {/* Panel content — both always mounted, toggled via display */}
        <div className="flex-1 min-h-0 relative">
          {/* Editor / Visual Editor view */}
          <div
            className={`absolute inset-0 ${
              viewMode === 'visual-first' && splitDirection === 'horizontal' ? 'flex flex-row' :
              viewMode === 'visual-first' && splitDirection === 'vertical' ? 'flex flex-col' :
              ''
            }`}
            style={{ display: activePanel === 'editor' ? undefined : 'none' }}
          >
            {viewMode === 'text-first' ? (
              /* In text-first mode, the bottom panel shows Canvas with project tabs */
              <CanvasPanel />
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Terminal view — always mounted once created, hidden via display */}
          <div
            className="absolute inset-0"
            style={{ display: activePanel === 'terminal' ? undefined : 'none' }}
          >
            <TerminalPanel isVisible={activePanel === 'terminal'} />
          </div>

          {/* Debug view */}
          <div
            className="absolute inset-0"
            style={{ display: activePanel === 'debug' ? undefined : 'none' }}
          >
            <DebugPanel />
          </div>

          {/* Output view */}
          <div
            className="absolute inset-0"
            style={{ display: activePanel === 'output' ? undefined : 'none' }}
          >
            <OutputPanel />
          </div>

          {/* Hints view */}
          <div
            className="absolute inset-0"
            style={{ display: activePanel === 'hints' ? undefined : 'none' }}
          >
            <HintsPanel />
          </div>
        </div>
      </div>
    </div>
  )

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
        {panelContent}
      </div>
    </div>
  )
}

// Static references for keyboard shortcut access
EditorPanel.switchToTerminal = () => {}
EditorPanel.switchToDebug = () => {}
