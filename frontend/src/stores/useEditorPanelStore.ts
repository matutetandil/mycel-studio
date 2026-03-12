import { create } from 'zustand'

export interface EditorTab {
  id: string        // Same as filePath
  filePath: string
  fileName: string
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

  openFile: (filePath: string, fileName: string, groupId?: string) => void
  renameTab: (oldFilePath: string, newFilePath: string, newFileName: string) => void
  setRevealLine: (line: number | null) => void
  closeTab: (groupId: string, tabId: string) => void
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

  openFile: (filePath, fileName, groupId?) => {
    const state = get()
    const targetGroupId = groupId || state.activeGroupId

    // Check if tab already exists in any group
    for (const group of state.groups) {
      const existing = group.tabs.find(t => t.filePath === filePath)
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
    const newTab: EditorTab = { id: filePath, filePath, fileName }
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
        tabs: g.tabs.map(t =>
          t.filePath === oldFilePath
            ? { id: newFilePath, filePath: newFilePath, fileName: newFileName }
            : t
        ),
        activeTabId: g.activeTabId === oldFilePath ? newFilePath : g.activeTabId,
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
}))
