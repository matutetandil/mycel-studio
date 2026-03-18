// Syncs canvas node property changes back to HCL files
// When a user edits properties in the Properties panel, the node data changes.
// This hook detects those changes and updates the corresponding HCL block in the file.

import { useEffect, useRef } from 'react'
import { useProjectStore } from '../stores/useProjectStore'
import { useStudioStore } from '../stores/useStudioStore'
import { generateNodeHCL, replaceHclBlock, getHclBlockType, toIdentifier } from '../utils/hclGenerator'
import type { ConnectorNodeData, FlowNodeData } from '../types'

// Shared suppression flags to prevent sync loops between canvas→file and file→canvas
let _suppressFileToCanvas = false
let _suppressCanvasToFile = false
export function isSuppressingFileToCanvas(): boolean { return _suppressFileToCanvas }
export function suppressCanvasToFile(duration = 1000) {
  _suppressCanvasToFile = true
  setTimeout(() => { _suppressCanvasToFile = false }, duration)
}

interface ChangedNodeInfo {
  id: string
  prevLabel: string  // label before the change, for finding old block name
}

export function useCanvasToFileSync() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingChangesRef = useRef<ChangedNodeInfo[]>([])

  useEffect(() => {
    const unsub = useStudioStore.subscribe((state, prev) => {
      // Only react when nodes change
      if (state.nodes === prev.nodes) return

      // Only sync when a project is open (otherwise the virtual preview handles it)
      const { projectName } = useProjectStore.getState()
      if (!projectName) return

      // Skip if change came from file→canvas sync (avoid loop)
      if (_suppressCanvasToFile) return

      // Find which nodes actually changed data (not position)
      const changedNodes: ChangedNodeInfo[] = []
      for (const node of state.nodes) {
        const prevNode = prev.nodes.find(n => n.id === node.id)
        if (!prevNode) continue // New node — skip for now
        // Compare data only (not position)
        if (JSON.stringify(node.data) !== JSON.stringify(prevNode.data)) {
          const prevData = prevNode.data as ConnectorNodeData | FlowNodeData
          changedNodes.push({
            id: node.id,
            prevLabel: prevData.label,
          })
        }
      }

      if (changedNodes.length === 0) return

      // Accumulate changes in case multiple fire before debounce
      pendingChangesRef.current = changedNodes

      // Debounce to avoid excessive file writes
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const changes = pendingChangesRef.current
        pendingChangesRef.current = []
        syncNodesToFiles(changes)
      }, 400)
    })

    return () => {
      unsub()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])
}

function syncNodesToFiles(changes: ChangedNodeInfo[]) {
  const { nodes, edges } = useStudioStore.getState()
  const { files, updateFile } = useProjectStore.getState()

  // Suppress file→canvas sync BEFORE any updateFile calls,
  // because Zustand subscribers fire synchronously inside set()
  _suppressFileToCanvas = true

  try {
    for (const change of changes) {
      const node = nodes.find(n => n.id === change.id)
      if (!node || !node.type) continue

      const data = node.data as ConnectorNodeData | FlowNodeData
      const hclFile = (data as Record<string, unknown>).hclFile as string | undefined
      if (!hclFile) continue // No source file — it's a new node, skip

      const blockType = getHclBlockType(node.type)
      if (!blockType) continue

      const newHcl = generateNodeHCL(node, nodes, edges)
      if (!newHcl) continue

      // Find the file in the project
      const file = files.find(f => f.relativePath === hclFile)
      if (!file) continue

      // Try current name first, then previous name (handles renames)
      const currentName = toIdentifier(data.label)
      const prevName = toIdentifier(change.prevLabel)

      let updatedContent = replaceHclBlock(file.content, blockType, currentName, newHcl)
      if (updatedContent === null && prevName !== currentName) {
        // Block was renamed — find with old name
        updatedContent = replaceHclBlock(file.content, blockType, prevName, newHcl)
      }

      if (updatedContent === null) {
        console.warn(`Canvas→File sync: block ${blockType} "${currentName}" not found in ${hclFile}`)
        continue
      }

      if (updatedContent !== file.content) {
        updateFile(hclFile, updatedContent)
      }
    }
  } finally {
    // Release suppression after debounce window of file→canvas sync (800ms)
    setTimeout(() => { _suppressFileToCanvas = false }, 1200)
  }
}
