// Determines the refactor context (canvas, monaco, explorer) and triggers the appropriate action

import { useStudioStore } from '../stores/useStudioStore'
import { useProjectStore } from '../stores/useProjectStore'
import { useEditorPanelStore, unscopePath } from '../stores/useEditorPanelStore'
import { useRefactorStore } from '../stores/useRefactorStore'
import { toIdentifier } from './hclGenerator'

// Map node types to entity kinds
const NODE_TYPE_TO_KIND: Record<string, string> = {
  connector: 'connector',
  flow: 'flow',
  type: 'type',
  validator: 'validator',
  transform: 'transform',
  aspect: 'aspect',
  saga: 'saga',
  state_machine: 'state_machine',
}

export async function triggerRefactor() {
  // 1. Check if we're in Monaco — use cursor position for context-aware rename
  const editorStore = useEditorPanelStore.getState()
  const activeGroup = editorStore.groups.find(g => g.id === editorStore.activeGroupId)
  const activeTab = activeGroup?.tabs.find(t => t.id === activeGroup?.activeTabId)

  if (activeTab && activeTab.type === 'file') {
    const { relativePath } = unscopePath(activeTab.filePath)

    if (relativePath.endsWith('.mycel')) {
      // Get cursor position and the word under cursor
      const cursorPos = editorStore.cursorPositions[relativePath]
      if (cursorPos) {
        const projectPath = useProjectStore.getState().projectPath
        if (projectPath) {
          // Open refactor dialog in "cursor" mode — the engine will figure out
          // what to rename (entity name, transform field, reference value)
          const absPath = projectPath + '/' + relativePath
          useRefactorStore.getState().openAtCursor(absPath, cursorPos.line, cursorPos.column)
          return
        }
      }
    }

    // Non-mycel file — trigger file rename
    triggerFileRename(relativePath)
    return
  }

  // 2. Check if a canvas node is selected
  const { selectedNodeId, nodes } = useStudioStore.getState()
  if (selectedNodeId) {
    const node = nodes.find(n => n.id === selectedNodeId)
    if (node) {
      const data = node.data as { label?: string }
      const kind = NODE_TYPE_TO_KIND[node.type || '']
      if (data.label && kind) {
        useRefactorStore.getState().open(kind, toIdentifier(data.label))
        return
      }
    }
  }

  // 3. Check if there's an active file in the explorer
  const activeFile = useProjectStore.getState().activeFile
  if (activeFile) {
    triggerFileRename(activeFile)
  }
}

function triggerFileRename(filePath: string) {
  const fileName = filePath.split('/').pop() || filePath
  const newName = prompt(`Rename file:`, fileName)
  if (newName && newName !== fileName) {
    const dir = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/')) : ''
    const newPath = dir ? `${dir}/${newName}` : newName
    useProjectStore.getState().renameFile(filePath, newPath).then(success => {
      if (success) {
        useEditorPanelStore.getState().renameTab(filePath, newPath, newName)
      }
    })
  }
}
