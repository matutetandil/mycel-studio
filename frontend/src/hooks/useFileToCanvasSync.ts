// Syncs .mycel file edits back to the canvas (file = source of truth)
// When a user edits a .mycel file in Monaco, re-parses the project via IDE engine
// and updates the canvas nodes/edges to reflect the changes.

import { useEffect, useRef } from 'react'
import { useProjectStore } from '../stores/useProjectStore'
import { ideUpdateFile, ideParseProject } from '../lib/api'
import { convertProjectToNodes, type ParsedProject } from './useSync'
import { useStudioStore } from '../stores/useStudioStore'

export function useFileToCanvasSync() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const busyRef = useRef(false)
  const pendingRef = useRef(false)

  useEffect(() => {
    const unsub = useProjectStore.subscribe((state, prev) => {
      // Only react to file content changes
      if (state.files === prev.files) return
      if (!state.projectName) return

      // Check if any .mycel file content actually changed and is dirty
      const changedMycel = state.files.some(file => {
        if (!file.name.endsWith('.mycel')) return false
        const prevFile = prev.files.find(f => f.relativePath === file.relativePath)
        return prevFile && prevFile.content !== file.content && file.isDirty
      })

      if (!changedMycel) return

      // Debounce re-parse (800ms to avoid parsing on every keystroke)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        reparseProject()
      }, 800)
    })

    return () => {
      unsub()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  async function reparseProject() {
    // Skip if properties or canvas is actively editing — only run for Monaco edits or external changes
    const { editSource } = useStudioStore.getState()
    if (editSource === 'properties' || editSource === 'canvas') return

    // Pending queue pattern: if busy, mark pending and re-run after
    if (busyRef.current) {
      pendingRef.current = true
      return
    }
    busyRef.current = true

    try {
      // Read fresh state inside the callback, not from subscribe closure
      const { files, projectPath } = useProjectStore.getState()
      if (!projectPath) return

      const mycelFiles = files.filter(f => f.name.endsWith('.mycel'))
      if (mycelFiles.length === 0) return

      // Update IDE engine with changed files
      for (const file of mycelFiles) {
        if (file.isDirty) {
          await ideUpdateFile(`${projectPath}/${file.relativePath}`, file.content)
        }
      }

      // Re-parse entire project via IDE engine
      const result = await ideParseProject(projectPath)

      if (result.success && result.project) {
        // Convert to nodes/edges
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { newNodes, newEdges } = convertProjectToNodes(result.project as any)

        // Read current state for position/selection preservation
        const store = useStudioStore.getState()
        const { nodes: existingNodes, selectedNodeId } = store

        // Build position map by ID
        const positionById = new Map<string, { x: number; y: number }>()
        for (const node of existingNodes) {
          positionById.set(node.id, node.position)
        }

        // Build a map of old nodes by hclFile+type for rename fallback.
        // When a block is renamed, its ID changes but its sourceFile+type stays the same.
        // We greedily match unmatched old nodes to unmatched new nodes by hclFile+type.
        const matchedOldIds = new Set<string>()

        // First pass: match by exact ID
        const repositioned = newNodes.map(node => {
          const prevPos = positionById.get(node.id)
          if (prevPos) {
            matchedOldIds.add(node.id)
            return { ...node, position: prevPos }
          }
          return node
        })

        // Second pass: for unmatched new nodes, find unmatched old nodes by hclFile+type
        for (let i = 0; i < repositioned.length; i++) {
          if (positionById.has(repositioned[i].id)) continue // already matched
          const newData = repositioned[i].data as { hclFile?: string }
          if (!newData.hclFile || !repositioned[i].type) continue

          // Find an old node with same hclFile+type that wasn't matched by ID
          const oldMatch = existingNodes.find(old => {
            if (matchedOldIds.has(old.id)) return false
            if (old.type !== repositioned[i].type) return false
            const oldData = old.data as { hclFile?: string }
            return oldData.hclFile === newData.hclFile
          })
          if (oldMatch) {
            matchedOldIds.add(oldMatch.id)
            repositioned[i] = { ...repositioned[i], position: oldMatch.position }
          }
        }

        // Resolve selectedNodeId: keep if still exists, fallback to hclFile+type match
        let resolvedSelectedId = selectedNodeId
        if (selectedNodeId && !repositioned.some(n => n.id === selectedNodeId)) {
          const oldNode = existingNodes.find(n => n.id === selectedNodeId)
          if (oldNode) {
            const oldData = oldNode.data as { hclFile?: string; label?: string }
            // Try to find new node by hclFile+type (rename case)
            const match = repositioned.find(n => {
              if (n.type !== oldNode.type) return false
              const d = n.data as { hclFile?: string }
              return d.hclFile && d.hclFile === oldData.hclFile
            })
            // Fallback: try by type+label (non-rename case where ID changed for other reasons)
            const labelMatch = !match ? repositioned.find(n => {
              if (n.type !== oldNode.type) return false
              const d = n.data as { label?: string }
              return d.label === oldData.label
            }) : null
            resolvedSelectedId = match?.id ?? labelMatch?.id ?? null
          } else {
            resolvedSelectedId = null
          }
        }

        // Mark the selected node with selected:true so React Flow doesn't
        // trigger onSelectionChange({nodes:[]}) and clear our selection
        const finalNodes = repositioned.map(node => ({
          ...node,
          selected: node.id === resolvedSelectedId,
        }))

        // Apply everything atomically in a single setState to prevent intermediate
        // states that would cause React Flow to clear the selection
        const stateUpdate: Record<string, unknown> = {
          nodes: finalNodes,
          edges: newEdges,
          selectedNodeId: resolvedSelectedId,
        }

        // Apply service config if present
        const project = result.project as unknown as ParsedProject
        if (project.service) {
          stateUpdate.serviceConfig = {
            ...store.serviceConfig,
            name: project.service.name || 'my-service',
            version: project.service.version || '1.0.0',
          }
        }

        useStudioStore.setState(stateUpdate)
      }
    } catch (err) {
      console.error('File→Canvas sync error:', err)
    } finally {
      busyRef.current = false
      // If changes arrived while we were busy, re-run
      if (pendingRef.current) {
        pendingRef.current = false
        reparseProject()
      }
    }
  }
}
