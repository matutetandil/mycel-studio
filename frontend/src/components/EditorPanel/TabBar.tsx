import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { X, Columns2, Rows2, Copy, Check, Download, XCircle, LayoutGrid, GitCompare, Pin } from 'lucide-react'
import { useEditorPanelStore, unscopePath, type EditorTab } from '../../stores/useEditorPanelStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useMultiProjectStore } from '../../stores/useMultiProjectStore'
import { selectNodeForFile } from '../FileTree/FileTree'
import { useDiagnosticsStore } from '../../stores/useDiagnosticsStore'
import { getFileTypeInfo } from '../../utils/fileIcons'

// Git status colors (same as FileTree)
const gitNameColors: Record<string, string> = {
  modified: 'text-sky-400',
  new: 'text-green-400',
  added: 'text-green-400',
  untracked: 'text-green-400',
  deleted: 'text-red-400',
  ignored: 'text-neutral-600',
  staged: 'text-emerald-300',
  staged_added: 'text-emerald-300',
  staged_deleted: 'text-red-300',
  staged_renamed: 'text-emerald-300',
  staged_modified: 'text-amber-300',
}
const gitBadgeColors: Record<string, string> = {
  modified: 'text-sky-400',
  new: 'text-green-400',
  added: 'text-green-400',
  untracked: 'text-green-400',
  deleted: 'text-red-400',
  ignored: 'text-neutral-600',
  staged: 'text-emerald-400',
  staged_added: 'text-emerald-400',
  staged_deleted: 'text-red-400',
  staged_renamed: 'text-emerald-400',
  staged_modified: 'text-amber-400',
}
const gitBadgeLetters: Record<string, string> = {
  modified: 'M',
  new: 'U',
  added: 'A',
  untracked: 'U',
  deleted: 'D',
  staged: 'S',
  staged_added: 'S',
  staged_deleted: 'D',
  staged_renamed: 'R',
  staged_modified: 'SM',
}

interface TabBarProps {
  groupId: string
  tabs: EditorTab[]
  activeTabId: string | null
  isSecondary?: boolean
  onCopy: () => void
  onDownloadZip: () => void
  copied: boolean
}

export default function TabBar({ groupId, tabs, activeTabId, isSecondary, onCopy, onDownloadZip, copied }: TabBarProps) {
  const { setActiveTab, closeTab, closeOtherTabs, closeAllTabs, closeTabsToTheLeft, closeTabsToTheRight, closeUnmodifiedTabs, togglePinTab, reorderTab, moveTabToGroup, splitEditor, closeSplit } = useEditorPanelStore()
  const projectFiles = useProjectStore(s => s.files)
  // Subscribe to the files data (not the function) so React re-renders when diagnostics change
  const diagFiles = useDiagnosticsStore(s => s.files)
  const getFileSeverity = (path: string) => {
    for (const [key, diag] of Object.entries(diagFiles)) {
      if (key === path || key.endsWith('/' + path) || path.endsWith('/' + key)) return diag.severity
    }
    return 'none' as const
  }
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragSourceRef = useRef<{ groupId: string; index: number } | null>(null)

  // Build a map of relativePath → gitStatus for quick lookup
  const gitStatusMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const f of projectFiles) {
      if (f.gitStatus && f.gitStatus !== 'clean' && f.gitStatus !== 'ignored') {
        map[f.relativePath] = f.gitStatus
      }
    }
    // Also include files from all attached projects
    const multi = useMultiProjectStore.getState()
    for (const project of multi.projects.values()) {
      for (const f of project.files) {
        if (f.gitStatus && f.gitStatus !== 'clean' && f.gitStatus !== 'ignored') {
          map[f.relativePath] = f.gitStatus
        }
      }
    }
    return map
  }, [projectFiles])

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragSourceRef.current = { groupId, index }
    e.dataTransfer.setData('text/plain', JSON.stringify({ groupId, index }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (data.groupId === groupId) {
        reorderTab(groupId, data.index, toIndex)
      } else {
        const sourceGroup = useEditorPanelStore.getState().groups.find(g => g.id === data.groupId)
        const tab = sourceGroup?.tabs[data.index]
        if (tab) {
          moveTabToGroup(data.groupId, tab.id, groupId)
        }
      }
    } catch {
      // ignore
    }
    dragSourceRef.current = null
  }

  const handleSplit = (direction: 'horizontal' | 'vertical') => {
    splitEditor(direction)
  }

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, tabId })
  }, [])

  // Close context menu on click outside or Escape
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [contextMenu])

  const isTabModified = useCallback((tab: EditorTab): boolean => {
    if (tab.type !== 'file') return false
    const { relativePath } = unscopePath(tab.filePath)
    // Check active project files
    const file = useProjectStore.getState().files.find(f => f.relativePath === relativePath)
    if (file?.isDirty) return true
    // Check attached project files
    for (const project of useMultiProjectStore.getState().projects.values()) {
      const f = project.files.find(pf => pf.relativePath === relativePath)
      if (f?.isDirty) return true
    }
    return false
  }, [])

  return (
    <div className="flex items-center bg-neutral-900 border-b border-neutral-800 min-h-[33px]">
      {/* Tabs */}
      <div className="flex-1 flex items-center overflow-x-auto">
        {tabs.map((tab, index) => {
          // Unscope the file path for display and git status lookup
          const { projectPath: tabProjectPath, relativePath: tabRelPath } = unscopePath(tab.filePath)
          const gitStatus = gitStatusMap[tabRelPath]
          const nameColor = gitStatus ? gitNameColors[gitStatus] : ''
          const badgeLetter = gitStatus ? gitBadgeLetters[gitStatus] : ''
          const badgeColor = gitStatus ? gitBadgeColors[gitStatus] : ''
          // Show project folder name in tooltip when scoped
          const projectHint = tabProjectPath ? tabProjectPath.split('/').pop() : null

          return (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              title={projectHint ? `${projectHint} / ${tabRelPath}` : tabRelPath}
              onClick={() => {
                setActiveTab(groupId, tab.id)
                if (tab.type === 'canvas' && tab.projectId) {
                  // Activate the project this canvas belongs to
                  const multi = useMultiProjectStore.getState()
                  if (multi.activeProjectId !== tab.projectId) {
                    multi.setActiveProject(tab.projectId)
                  }
                } else {
                  // Switch to the tab's project if needed
                  if (tabProjectPath) {
                    const multi = useMultiProjectStore.getState()
                    for (const [id, proj] of multi.projects) {
                      if (proj.projectPath === tabProjectPath && multi.activeProjectId !== id) {
                        multi.setActiveProject(id)
                        break
                      }
                    }
                  }
                  // For HCL files, cursor-driven selection in Monaco handles node selection on mount.
                  // For non-HCL files, select the node by file path.
                  if (!tabRelPath.endsWith('.mycel')) {
                    selectNodeForFile(tab.filePath)
                  }
                }
              }}
              className={`
                group flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-neutral-800 cursor-pointer shrink-0 select-none
                ${activeTabId === tab.id
                  ? 'bg-neutral-800 text-white border-b-2 border-b-indigo-500'
                  : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-850 hover:text-neutral-300'}
                ${dragOverIndex === index ? 'border-l-2 border-l-indigo-500' : ''}
              `}
            >
              {tab.type === 'canvas'
                ? <LayoutGrid className={`w-3 h-3 shrink-0 ${activeTabId === tab.id ? 'text-indigo-400' : 'text-neutral-500'}`} />
                : tab.type === 'diff'
                ? <GitCompare className={`w-3 h-3 shrink-0 ${activeTabId === tab.id ? 'text-orange-400' : 'text-neutral-500'}`} />
                : (() => { const ft = getFileTypeInfo(tab.fileName); const Icon = ft.icon; return <Icon className={`w-3 h-3 shrink-0 ${activeTabId === tab.id ? ft.color : 'text-neutral-500'}`} /> })()}
              <span className={`max-w-32 truncate ${nameColor} ${
                tab.type === 'file' ? (getFileSeverity(tabRelPath) === 'error' ? 'diag-error diag-tab' : getFileSeverity(tabRelPath) === 'warning' ? 'diag-warning diag-tab' : '') : ''
              }`}>{tab.fileName}</span>
              {badgeLetter && (
                <span className={`text-[9px] font-bold leading-none ${badgeColor}`}>{badgeLetter}</span>
              )}
              {tab.pinned ? (
                <Pin className="w-3 h-3 text-neutral-500 shrink-0" />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(groupId, tab.id)
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

      {/* Actions */}
      <div className="flex items-center gap-0.5 px-2 shrink-0">
        {activeTabId && (
          <>
            <button
              onClick={onCopy}
              className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
              title="Copy file content"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onDownloadZip}
              className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
              title="Download all files as ZIP"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {!isSecondary && tabs.length > 0 && (
          <>
            <button
              onClick={() => handleSplit('horizontal')}
              className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
              title="Split right"
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSplit('vertical')}
              className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
              title="Split down"
            >
              <Rows2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {isSecondary && (
          <button
            onClick={() => closeSplit(groupId)}
            className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
            title="Close split"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tab context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] bg-neutral-800 border border-neutral-600 rounded-md shadow-xl py-1 text-xs min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {(() => {
            const targetTab = tabs.find(t => t.id === contextMenu.tabId)
            const targetIdx = tabs.findIndex(t => t.id === contextMenu.tabId)
            const isPinned = targetTab?.pinned ?? false
            const items: { label: string; action: () => void; disabled?: boolean; separator?: boolean }[] = [
              {
                label: 'Close',
                action: () => closeTab(groupId, contextMenu.tabId),
                disabled: isPinned,
              },
              {
                label: 'Close Others',
                action: () => closeOtherTabs(groupId, contextMenu.tabId),
                disabled: tabs.length <= 1,
              },
              {
                label: 'Close All',
                action: () => closeAllTabs(groupId),
              },
              {
                label: 'Close Unmodified',
                action: () => closeUnmodifiedTabs(groupId, isTabModified),
                separator: true,
              },
              {
                label: 'Close Tabs to the Left',
                action: () => closeTabsToTheLeft(groupId, contextMenu.tabId),
                disabled: targetIdx === 0,
              },
              {
                label: 'Close Tabs to the Right',
                action: () => closeTabsToTheRight(groupId, contextMenu.tabId),
                disabled: targetIdx === tabs.length - 1,
                separator: true,
              },
              {
                label: isPinned ? 'Unpin Tab' : 'Pin Tab',
                action: () => togglePinTab(groupId, contextMenu.tabId),
              },
            ]
            return items.map((item, i) => (
              <div key={i}>
                {item.separator && i > 0 && <div className="border-t border-neutral-700 my-1" />}
                <button
                  onClick={() => { item.action(); setContextMenu(null) }}
                  disabled={item.disabled}
                  className={`w-full text-left px-3 py-1.5 ${
                    item.disabled
                      ? 'text-neutral-600 cursor-default'
                      : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              </div>
            ))
          })()}
        </div>
      )}
    </div>
  )
}
