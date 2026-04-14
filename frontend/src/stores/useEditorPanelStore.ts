import { create } from 'zustand'
import { registerSnapshotProvider } from './snapshotRegistry'

export interface EditorTab {
  id: string        // Scoped path: `{projectPath}::{relativePath}` or `canvas:{projectId}` or `diff:{id}`
  type: 'file' | 'canvas' | 'diff'
  filePath: string  // Scoped path for files, `canvas:{projectId}` for canvas, diff id for diff
  fileName: string  // Display name
  projectId?: string // Which project this tab belongs to
  // Diff tab fields
  diffOriginal?: string
  diffModified?: string
  diffOriginalLabel?: string
  diffModifiedLabel?: string
  diffLanguage?: string
  diffReadOnly?: boolean  // false for conflict resolution
  diffFilePath?: string   // Real file path for saving resolved conflicts
  pinned?: boolean
}

// Scope a relative file path with its project path for unique identification
// across multiple projects (e.g., both projects have `config.hcl`)
export function scopedPath(projectPath: string | null, relativePath: string): string {
  if (!projectPath) return relativePath
  return `${projectPath}::${relativePath}`
}

// Extract the project path and relative path from a scoped path
export function unscopePath(scoped: string): { projectPath: string | null; relativePath: string } {
  const idx = scoped.indexOf('::')
  if (idx === -1) return { projectPath: null, relativePath: scoped }
  return { projectPath: scoped.slice(0, idx), relativePath: scoped.slice(idx + 2) }
}

export interface EditorGroup {
  id: string
  tabs: EditorTab[]
  activeTabId: string | null
}

export type SplitDirection = 'horizontal' | 'vertical' | null

interface EditorPanelState {
  panelHeight: number
  isCollapsed: boolean
  groups: EditorGroup[]
  activeGroupId: string
  splitDirection: SplitDirection
  splitRatio: number
  revealLine: number | null  // Line to scroll to in active editor
  previewModes: Record<string, 'source' | 'preview'>  // per-file preview mode (keyed by relative path)
  cursorPositions: Record<string, { line: number; column: number }>  // per-file cursor position
  editorViewStates: Record<string, unknown>  // per-file Monaco view state (scroll, folds, etc.)

  openFile: (filePath: string, fileName: string, groupId?: string, projectPath?: string | null) => void
  openCanvas: (projectId: string, projectName: string, groupId?: string) => void
  openDiff: (id: string, fileName: string, original: string, modified: string, originalLabel: string, modifiedLabel: string, language?: string, readOnly?: boolean, filePath?: string) => void
  renameTab: (oldFilePath: string, newFilePath: string, newFileName: string) => void
  setRevealLine: (line: number | null) => void
  setPreviewMode: (tabId: string, mode: 'source' | 'preview') => void
  setCursorPosition: (filePath: string, line: number, column: number) => void
  setEditorViewState: (filePath: string, state: unknown) => void
  closeTab: (groupId: string, tabId: string) => void
  closeOtherTabs: (groupId: string, tabId: string) => void
  closeAllTabs: (groupId: string) => void
  closeTabsToTheLeft: (groupId: string, tabId: string) => void
  closeTabsToTheRight: (groupId: string, tabId: string) => void
  closeUnmodifiedTabs: (groupId: string, isModified: (tab: EditorTab) => boolean) => void
  togglePinTab: (groupId: string, tabId: string) => void
  setActiveTab: (groupId: string, tabId: string) => void
  reorderTab: (groupId: string, fromIndex: number, toIndex: number) => void
  moveTabToGroup: (fromGroupId: string, tabId: string, toGroupId: string) => void
  splitEditor: (direction: SplitDirection) => void
  closeSplit: (groupId: string) => void
  setPanelHeight: (height: number) => void
  toggleCollapse: () => void
  setActiveGroup: (groupId: string) => void
}

export const useEditorPanelStore = create<EditorPanelState>((set, get) => ({
  panelHeight: 256,
  isCollapsed: false,
  groups: [{ id: 'main', tabs: [], activeTabId: null }],
  activeGroupId: 'main',
  splitDirection: null,
  splitRatio: 0.5,
  revealLine: null,
  previewModes: (() => {
    try { return JSON.parse(localStorage.getItem('mycel-preview-modes') || '{}') }
    catch { return {} }
  })(),
  cursorPositions: (() => {
    try { return JSON.parse(localStorage.getItem('mycel-cursor-positions') || '{}') }
    catch { return {} }
  })(),
  editorViewStates: (() => {
    try { return JSON.parse(localStorage.getItem('mycel-editor-viewstates') || '{}') }
    catch { return {} }
  })(),

  openFile: (filePath, fileName, groupId?, projectPath?) => {
    const state = get()
    const targetGroupId = groupId || state.activeGroupId
    const id = projectPath ? scopedPath(projectPath, filePath) : filePath

    // Check if tab already exists in any group (match by exact ID, scoped path, or relative path)
    const relPath = unscopePath(id).relativePath
    for (const group of state.groups) {
      const existing = group.tabs.find(t => {
        if (t.id === id) return true
        // Also match if the relative paths are the same (handles scoped vs unscoped mismatch)
        const tabRel = unscopePath(t.id).relativePath
        return tabRel === relPath || tabRel === filePath || t.id === filePath
      })
      if (existing) {
        set({
          groups: state.groups.map(g =>
            g.id === group.id ? { ...g, activeTabId: existing.id } : g
          ),
          activeGroupId: group.id,
        })
        return
      }
    }

    // Add new tab to target group
    const newTab: EditorTab = { id, type: 'file', filePath: id, fileName }
    set({
      groups: state.groups.map(g =>
        g.id === targetGroupId
          ? { ...g, tabs: [...g.tabs, newTab], activeTabId: newTab.id }
          : g
      ),
      activeGroupId: targetGroupId,
    })
  },

  openCanvas: (projectId, projectName, groupId?) => {
    const state = get()
    const targetGroupId = groupId || state.activeGroupId
    const canvasPath = `canvas:${projectId}`

    // Check if canvas tab already exists in any group
    for (const group of state.groups) {
      const existing = group.tabs.find(t => t.filePath === canvasPath)
      if (existing) {
        set({
          groups: state.groups.map(g =>
            g.id === group.id ? { ...g, activeTabId: existing.id } : g
          ),
          activeGroupId: group.id,
        })
        return
      }
    }

    // Add new canvas tab
    const newTab: EditorTab = {
      id: canvasPath,
      type: 'canvas',
      filePath: canvasPath,
      fileName: projectName,
      projectId,
    }
    set({
      groups: state.groups.map(g =>
        g.id === targetGroupId
          ? { ...g, tabs: [...g.tabs, newTab], activeTabId: newTab.id }
          : g
      ),
      activeGroupId: targetGroupId,
    })
  },

  openDiff: (id, fileName, original, modified, originalLabel, modifiedLabel, language, readOnly = true, filePath) => {
    const state = get()
    const targetGroupId = state.activeGroupId
    const tabId = `diff:${id}`

    // Check if already open
    for (const group of state.groups) {
      const existing = group.tabs.find(t => t.id === tabId)
      if (existing) {
        set({
          groups: state.groups.map(g =>
            g.id === group.id ? { ...g, activeTabId: existing.id } : g
          ),
          activeGroupId: group.id,
        })
        return
      }
    }

    const newTab: EditorTab = {
      id: tabId, type: 'diff', filePath: tabId, fileName,
      diffOriginal: original, diffModified: modified,
      diffOriginalLabel: originalLabel, diffModifiedLabel: modifiedLabel,
      diffLanguage: language, diffReadOnly: readOnly, diffFilePath: filePath,
    }
    set({
      groups: state.groups.map(g =>
        g.id === targetGroupId
          ? { ...g, tabs: [...g.tabs, newTab], activeTabId: newTab.id }
          : g
      ),
      activeGroupId: targetGroupId,
    })
  },

  renameTab: (oldFilePath, newFilePath, newFileName) => {
    set(state => ({
      groups: state.groups.map(g => ({
        ...g,
        tabs: g.tabs.map(t => {
          // Match by exact id or by the old file path (for backward compat with unscoped paths)
          if (t.id === oldFilePath || t.filePath === oldFilePath) {
            // Preserve project scope prefix if present
            const { projectPath } = unscopePath(t.id)
            const newId = projectPath ? scopedPath(projectPath, newFilePath) : newFilePath
            return { ...t, id: newId, filePath: newId, fileName: newFileName }
          }
          return t
        }),
        activeTabId: g.activeTabId === oldFilePath
          ? (() => {
              // Find the tab to get the correct new id
              const tab = g.tabs.find(t => t.id === oldFilePath || t.filePath === oldFilePath)
              if (tab) {
                const { projectPath: pp } = unscopePath(tab.id)
                return pp ? scopedPath(pp, newFilePath) : newFilePath
              }
              return g.activeTabId
            })()
          : g.activeTabId,
      })),
    }))
  },

  closeTab: (groupId, tabId) => {
    const state = get()
    const group = state.groups.find(g => g.id === groupId)
    if (!group) return

    const idx = group.tabs.findIndex(t => t.id === tabId)
    const newTabs = group.tabs.filter(t => t.id !== tabId)
    let newActiveId = group.activeTabId

    if (group.activeTabId === tabId) {
      if (newTabs.length > 0) {
        newActiveId = newTabs[Math.min(idx, newTabs.length - 1)].id
      } else {
        newActiveId = null
      }
    }

    // If last tab in a split group, close the split
    if (newTabs.length === 0 && state.groups.length > 1) {
      const otherGroup = state.groups.find(g => g.id !== groupId)!
      set({
        groups: [otherGroup],
        activeGroupId: otherGroup.id,
        splitDirection: null,
      })
      return
    }

    set({
      groups: state.groups.map(g =>
        g.id === groupId ? { ...g, tabs: newTabs, activeTabId: newActiveId } : g
      ),
    })
  },

  closeOtherTabs: (groupId, tabId) => {
    const state = get()
    const group = state.groups.find(g => g.id === groupId)
    if (!group) return
    const kept = group.tabs.filter(t => t.id === tabId || t.pinned)
    set({
      groups: state.groups.map(g =>
        g.id === groupId ? { ...g, tabs: kept, activeTabId: tabId } : g
      ),
    })
  },

  closeAllTabs: (groupId) => {
    const state = get()
    const group = state.groups.find(g => g.id === groupId)
    if (!group) return
    const kept = group.tabs.filter(t => t.pinned)
    if (kept.length === 0 && state.groups.length > 1) {
      const otherGroup = state.groups.find(g => g.id !== groupId)!
      set({ groups: [otherGroup], activeGroupId: otherGroup.id, splitDirection: null })
      return
    }
    set({
      groups: state.groups.map(g =>
        g.id === groupId ? { ...g, tabs: kept, activeTabId: kept[0]?.id ?? null } : g
      ),
    })
  },

  closeTabsToTheLeft: (groupId, tabId) => {
    const state = get()
    const group = state.groups.find(g => g.id === groupId)
    if (!group) return
    const idx = group.tabs.findIndex(t => t.id === tabId)
    const kept = group.tabs.filter((t, i) => i >= idx || t.pinned)
    const activeStillExists = kept.some(t => t.id === group.activeTabId)
    set({
      groups: state.groups.map(g =>
        g.id === groupId ? { ...g, tabs: kept, activeTabId: activeStillExists ? group.activeTabId : tabId } : g
      ),
    })
  },

  closeTabsToTheRight: (groupId, tabId) => {
    const state = get()
    const group = state.groups.find(g => g.id === groupId)
    if (!group) return
    const idx = group.tabs.findIndex(t => t.id === tabId)
    const kept = group.tabs.filter((t, i) => i <= idx || t.pinned)
    const activeStillExists = kept.some(t => t.id === group.activeTabId)
    set({
      groups: state.groups.map(g =>
        g.id === groupId ? { ...g, tabs: kept, activeTabId: activeStillExists ? group.activeTabId : tabId } : g
      ),
    })
  },

  closeUnmodifiedTabs: (groupId, isModified) => {
    const state = get()
    const group = state.groups.find(g => g.id === groupId)
    if (!group) return
    const kept = group.tabs.filter(t => t.pinned || isModified(t))
    if (kept.length === 0 && state.groups.length > 1) {
      const otherGroup = state.groups.find(g => g.id !== groupId)!
      set({ groups: [otherGroup], activeGroupId: otherGroup.id, splitDirection: null })
      return
    }
    const activeStillExists = kept.some(t => t.id === group.activeTabId)
    set({
      groups: state.groups.map(g =>
        g.id === groupId ? { ...g, tabs: kept, activeTabId: activeStillExists ? group.activeTabId : (kept[0]?.id ?? null) } : g
      ),
    })
  },

  togglePinTab: (groupId, tabId) => {
    set(state => ({
      groups: state.groups.map(g =>
        g.id === groupId
          ? { ...g, tabs: g.tabs.map(t => t.id === tabId ? { ...t, pinned: !t.pinned } : t) }
          : g
      ),
    }))
  },

  setActiveTab: (groupId, tabId) => {
    set(state => ({
      groups: state.groups.map(g =>
        g.id === groupId ? { ...g, activeTabId: tabId } : g
      ),
      activeGroupId: groupId,
    }))
  },

  reorderTab: (groupId, fromIndex, toIndex) => {
    set(state => ({
      groups: state.groups.map(g => {
        if (g.id !== groupId) return g
        const tabs = [...g.tabs]
        const [moved] = tabs.splice(fromIndex, 1)
        tabs.splice(toIndex, 0, moved)
        return { ...g, tabs }
      }),
    }))
  },

  moveTabToGroup: (fromGroupId, tabId, toGroupId) => {
    const state = get()
    const fromGroup = state.groups.find(g => g.id === fromGroupId)
    if (!fromGroup) return
    const tab = fromGroup.tabs.find(t => t.id === tabId)
    if (!tab) return

    // Remove from source, add to target
    const newGroups = state.groups.map(g => {
      if (g.id === fromGroupId) {
        const newTabs = g.tabs.filter(t => t.id !== tabId)
        const newActive = g.activeTabId === tabId
          ? (newTabs[0]?.id || null)
          : g.activeTabId
        return { ...g, tabs: newTabs, activeTabId: newActive }
      }
      if (g.id === toGroupId) {
        return { ...g, tabs: [...g.tabs, tab], activeTabId: tab.id }
      }
      return g
    })

    // Clean up empty groups from split
    const nonEmpty = newGroups.filter(g => g.tabs.length > 0)
    if (nonEmpty.length < newGroups.length) {
      set({
        groups: nonEmpty.length > 0 ? nonEmpty : [{ id: 'main', tabs: [], activeTabId: null }],
        splitDirection: nonEmpty.length <= 1 ? null : state.splitDirection,
        activeGroupId: toGroupId,
      })
    } else {
      set({ groups: newGroups, activeGroupId: toGroupId })
    }
  },

  splitEditor: (direction) => {
    const state = get()
    if (state.groups.length > 1) return // Already split

    const mainGroup = state.groups[0]
    if (!mainGroup.activeTabId) return

    // Move active tab to new group
    const activeTab = mainGroup.tabs.find(t => t.id === mainGroup.activeTabId)
    if (!activeTab) return

    const newMainTabs = mainGroup.tabs.filter(t => t.id !== mainGroup.activeTabId)
    const newMainActive = newMainTabs[0]?.id || null

    set({
      groups: [
        { ...mainGroup, tabs: newMainTabs, activeTabId: newMainActive },
        { id: 'split', tabs: [activeTab], activeTabId: activeTab.id },
      ],
      splitDirection: direction,
      activeGroupId: 'split',
      splitRatio: 0.5,
    })
  },

  closeSplit: (groupId) => {
    const state = get()
    const closing = state.groups.find(g => g.id === groupId)
    const surviving = state.groups.find(g => g.id !== groupId)
    if (!closing || !surviving) return

    // Merge tabs, dedup by filePath
    const existingPaths = new Set(surviving.tabs.map(t => t.filePath))
    const newTabs = [...surviving.tabs, ...closing.tabs.filter(t => !existingPaths.has(t.filePath))]

    set({
      groups: [{ ...surviving, tabs: newTabs }],
      splitDirection: null,
      activeGroupId: surviving.id,
    })
  },

  setPanelHeight: (height) => {
    set({ panelHeight: Math.max(120, Math.min(height, window.innerHeight * 0.7)) })
  },

  toggleCollapse: () => {
    set(state => ({ isCollapsed: !state.isCollapsed }))
  },

  setActiveGroup: (groupId) => {
    set({ activeGroupId: groupId })
  },

  setRevealLine: (line) => {
    set({ revealLine: line })
  },

  setPreviewMode: (filePath, mode) => {
    set(state => {
      const next = { ...state.previewModes, [filePath]: mode }
      if (mode === 'source') delete next[filePath]
      try { localStorage.setItem('mycel-preview-modes', JSON.stringify(next)) } catch { /* ignore */ }
      return { previewModes: next }
    })
  },

  setCursorPosition: (filePath, line, column) => {
    set(state => {
      const next = { ...state.cursorPositions, [filePath]: { line, column } }
      try { localStorage.setItem('mycel-cursor-positions', JSON.stringify(next)) } catch { /* ignore */ }
      return { cursorPositions: next }
    })
  },

  setEditorViewState: (filePath, state) => {
    set(s => {
      const next = { ...s.editorViewStates, [filePath]: state }
      try { localStorage.setItem('mycel-editor-viewstates', JSON.stringify(next)) } catch { /* ignore */ }
      return { editorViewStates: next }
    })
  },
}))

registerSnapshotProvider('editor', {
  capture: () => {
    const e = useEditorPanelStore.getState()
    return JSON.parse(JSON.stringify({
      groups: e.groups, activeGroupId: e.activeGroupId, splitDirection: e.splitDirection,
      splitRatio: e.splitRatio, panelHeight: e.panelHeight, isCollapsed: e.isCollapsed,
    }))
  },
  restore: (data) => useEditorPanelStore.setState(data as Record<string, unknown>),
  clear: () => useEditorPanelStore.setState({
    groups: [{ id: 'main', tabs: [], activeTabId: null }],
    activeGroupId: 'main', splitDirection: null,
  }),
})
