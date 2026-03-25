// Shared delete logic for canvas nodes and file tree
// Handles: confirmation dialogs, file deletion, block removal, tab cleanup

import { useStudioStore } from '../stores/useStudioStore'
import { useProjectStore } from '../stores/useProjectStore'
import { useEditorPanelStore, scopedPath, unscopePath } from '../stores/useEditorPanelStore'
import { ideRemoveBlock, ideUpdateFile, ideSymbolsForFile, isWailsRuntime, apiConfirm } from '../lib/api'
import { toIdentifier } from './hclGenerator'
import type { ConnectorNodeData, FlowNodeData, StudioNode } from '../types'

// Map node type to HCL block type
const NODE_TO_BLOCK_TYPE: Record<string, string> = {
  connector: 'connector',
  flow: 'flow',
  type: 'type',
  validator: 'validator',
  transform: 'transform',
  aspect: 'aspect',
  saga: 'saga',
  state_machine: 'state_machine',
}

function getNodeBlockName(node: StudioNode): string {
  const data = node.data as ConnectorNodeData | FlowNodeData
  return toIdentifier(data.label)
}

function getNodeFile(node: StudioNode): string | undefined {
  const data = node.data as Record<string, unknown>
  return data.hclFile as string | undefined
}

function closeTabForFile(filePath: string, projectPath: string | null) {
  const editorStore = useEditorPanelStore.getState()
  const scoped = projectPath ? scopedPath(projectPath, filePath) : filePath
  for (const group of editorStore.groups) {
    const tab = group.tabs.find(t => {
      const tabRel = unscopePath(t.id).relativePath
      return t.id === scoped || t.id === filePath || tabRel === filePath
    })
    if (tab) {
      editorStore.closeTab(group.id, tab.id)
    }
  }
}

// Delete a node from the canvas, handling file changes
export async function deleteCanvasNode(node: StudioNode): Promise<boolean> {
  const blockType = NODE_TO_BLOCK_TYPE[node.type || '']
  if (!blockType) return false

  const blockName = getNodeBlockName(node)
  const projectPath = useProjectStore.getState().projectPath
  const mycelRoot = useProjectStore.getState().mycelRoot
  let hclFile = getNodeFile(node)

  // If no hclFile (new node), check if the generated file exists on disk
  if (!hclFile) {
    const defaultPaths: Record<string, string> = {
      connector: `${mycelRoot}connectors/${blockName}.mycel`,
      flow: `${mycelRoot}flows/flows.mycel`,
      type: `${mycelRoot}types/types.mycel`,
      validator: `${mycelRoot}validators/validators.mycel`,
      transform: `${mycelRoot}transforms/transforms.mycel`,
      aspect: `${mycelRoot}aspects/aspects.mycel`,
      saga: `${mycelRoot}sagas/sagas.mycel`,
      state_machine: `${mycelRoot}machines/machines.mycel`,
    }
    const defaultPath = defaultPaths[blockType]
    if (defaultPath) {
      const files = useProjectStore.getState().files
      if (files.some(f => f.relativePath === defaultPath)) {
        hclFile = defaultPath
      }
    }
  }

  if (!hclFile) {
    // Truly new — not on disk
    const confirmed = await apiConfirm(
      'Delete Component',
      `Delete "${blockName}"?`
    )
    if (!confirmed) return false
    useStudioStore.getState().removeNode(node.id)
    return true
  }

  // Check how many blocks are in this file
  let fileBlockCount = 1
  if (isWailsRuntime() && projectPath) {
    const absPath = projectPath + '/' + hclFile
    const symbols = await ideSymbolsForFile(absPath)
    fileBlockCount = symbols.length
  }

  if (fileBlockCount <= 1) {
    // Only block in file — delete the entire file
    const confirmed = await apiConfirm(
      'Delete Component',
      `Delete "${blockName}"?\n\nThis will also delete the file "${hclFile}" since it only contains this component.`
    )
    if (!confirmed) return false

    useStudioStore.getState().removeNode(node.id)
    await useProjectStore.getState().deleteFile(hclFile)
    closeTabForFile(hclFile, projectPath)
  } else {
    // Multiple blocks in file — remove only this block
    const confirmed = await apiConfirm(
      'Delete Component',
      `Delete "${blockName}" from "${hclFile}"?\n\nThe file contains ${fileBlockCount} components. Only this block will be removed.`
    )
    if (!confirmed) return false

    if (isWailsRuntime() && projectPath) {
      const absPath = projectPath + '/' + hclFile
      const edit = await ideRemoveBlock(absPath, blockType, blockName)
      if (edit) {
        // Apply the edit to the file content
        const file = useProjectStore.getState().files.find(f => f.relativePath === hclFile)
        if (file) {
          const lines = file.content.split('\n')
          const startLine = edit.range.start.line - 1 // 0-based
          const endLine = edit.range.end.line // exclusive
          lines.splice(startLine, endLine - startLine, ...edit.newText.split('\n').filter(l => l !== ''))
          const newContent = lines.join('\n')
          useProjectStore.getState().updateFile(hclFile, newContent)

          // Write to disk
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const app = (window as any).go?.main?.App
          if (app?.WriteFile) {
            await app.WriteFile(projectPath + '/' + hclFile, newContent)
          }

          // Update IDE engine
          await ideUpdateFile(absPath, newContent)
        }
      }
    }

    useStudioStore.getState().removeNode(node.id)
  }

  return true
}

// Delete a file from the explorer, handling canvas node cleanup
export async function deleteFileFromExplorer(filePath: string): Promise<boolean> {
  const projectPath = useProjectStore.getState().projectPath

  // Check what's in this file
  let symbols: Array<{ name: string; kind: number; kindName: string }> = []
  if (isWailsRuntime() && projectPath) {
    const absPath = projectPath + '/' + filePath
    symbols = await ideSymbolsForFile(absPath)
  }

  let message: string
  if (symbols.length === 0) {
    message = `Delete "${filePath}"?`
  } else if (symbols.length === 1) {
    message = `Delete "${filePath}"?\n\nThis will also remove the "${symbols[0].name}" ${symbols[0].kindName || 'component'} from the canvas.`
  } else {
    const names = symbols.map(s => `  - ${s.name} (${s.kindName || 'component'})`).join('\n')
    message = `Delete "${filePath}"?\n\nThis file contains ${symbols.length} components that will be removed from the canvas:\n${names}`
  }

  const confirmed = await apiConfirm('Delete File', message)
  if (!confirmed) return false

  // Remove canvas nodes that belong to this file
  const studioStore = useStudioStore.getState()
  const nodesToRemove = studioStore.nodes.filter(n => {
    const data = n.data as Record<string, unknown>
    return data.hclFile === filePath
  })
  for (const node of nodesToRemove) {
    studioStore.removeNode(node.id)
  }

  // Delete the file
  await useProjectStore.getState().deleteFile(filePath)

  // Close editor tab
  closeTabForFile(filePath, projectPath)

  return true
}
