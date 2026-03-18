// Syncs HCL file edits back to the canvas (file = source of truth)
// When a user edits an HCL file in Monaco, re-parses ALL project HCL files
// and updates the canvas nodes/edges to reflect the changes.

import { useEffect, useRef } from 'react'
import { useProjectStore, type ProjectFile } from '../stores/useProjectStore'
import { apiParse } from '../lib/api'
import { parseProjectToCanvas } from './useSync'
import { useStudioStore } from '../stores/useStudioStore'
import { isSuppressingFileToCanvas, suppressCanvasToFile } from './useCanvasToFileSync'

export function useFileToCanvasSync() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const parsingRef = useRef(false)

  useEffect(() => {
    const unsub = useProjectStore.subscribe((state, prev) => {
      // Only react to file content changes
      if (state.files === prev.files) return
      if (!state.projectName) return

      // Check if any HCL file content actually changed
      const changedHcl = state.files.some(file => {
        if (!file.name.endsWith('.hcl')) return false
        const prevFile = prev.files.find(f => f.relativePath === file.relativePath)
        return prevFile && prevFile.content !== file.content && file.isDirty
      })

      if (!changedHcl) return

      // Skip if the change came from canvas→file sync (avoid loop)
      if (isSuppressingFileToCanvas()) return

      // Debounce re-parse (800ms to avoid parsing on every keystroke)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        reparseProject(state.files)
      }, 800)
    })

    return () => {
      unsub()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  async function reparseProject(files: ProjectFile[]) {
    if (parsingRef.current) return
    parsingRef.current = true

    try {
      const hclFiles = files.filter(f => f.name.endsWith('.hcl'))
      if (hclFiles.length === 0) return

      const fileEntries = hclFiles.map(f => ({ path: f.relativePath, content: f.content }))
      const result = await apiParse({ files: fileEntries })

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
      parsingRef.current = false
    }
  }
}
