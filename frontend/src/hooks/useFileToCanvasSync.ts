// Syncs .mycel file edits back to the canvas (file = source of truth)
// When a user edits a .mycel file in Monaco, re-parses the project via IDE engine
// and updates the canvas nodes/edges to reflect the changes.

import { useEffect, useRef } from 'react'
import { useProjectStore } from '../stores/useProjectStore'
import { ideUpdateFile, ideParseProject } from '../lib/api'
import { parseProjectToCanvas } from './useSync'
import { useStudioStore } from '../stores/useStudioStore'
import { suppressCanvasToFile } from './useCanvasToFileSync'

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
        // Suppress canvas→file sync to avoid loop (file→canvas→file)
        suppressCanvasToFile()

        // Preserve existing node positions — only update data, not layout
        const existingNodes = useStudioStore.getState().nodes
        const positionMap = new Map<string, { x: number; y: number }>()
        for (const node of existingNodes) {
          positionMap.set(node.id, node.position)
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parseProjectToCanvas(result.project as any)

        // Restore positions for nodes that existed before
        const { nodes, setNodes } = useStudioStore.getState()
        const repositioned = nodes.map(node => {
          const prevPos = positionMap.get(node.id)
          if (prevPos) {
            return { ...node, position: prevPos }
          }
          return node
        })
        setNodes(repositioned)
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
