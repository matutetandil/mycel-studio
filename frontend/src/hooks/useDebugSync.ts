// Auto-switch to debug panel and reveal HCL file when a breakpoint is hit
import { useEffect, useRef } from 'react'
import { useDebugStore } from '../stores/useDebugStore'
import { useStudioStore } from '../stores/useStudioStore'
import { useEditorPanelStore } from '../stores/useEditorPanelStore'
import { useProjectStore } from '../stores/useProjectStore'
import { useLayoutStore } from '../stores/useLayoutStore'
import { toIdentifier } from '../utils/hclGenerator'
import EditorPanel from '../components/EditorPanel/EditorPanel'
import type { FlowNodeData } from '../types'

export function useDebugSync() {
  const stoppedAt = useDebugStore(s => s.stoppedAt)
  const prevStoppedRef = useRef(stoppedAt)

  useEffect(() => {
    if (stoppedAt && stoppedAt !== prevStoppedRef.current) {
      // Switch to text-first mode and debug panel
      useLayoutStore.getState().setViewMode('text-first')
      EditorPanel.switchToDebug()

      // Find the flow node on canvas and select it
      const nodes = useStudioStore.getState().nodes
      const flowNode = nodes.find(n => {
        if (n.type !== 'flow') return false
        return toIdentifier((n.data as FlowNodeData).label) === stoppedAt.flow
      })

      if (flowNode) {
        useStudioStore.getState().selectNode(flowNode.id)
      }

      // Open the HCL file in the editor and reveal the stopped line
      // The file selection is handled by FileTree's useEffect (triggered by selectNode)
      // But we also want to ensure the editor shows the file
      if (flowNode) {
        const data = flowNode.data as FlowNodeData
        const filePath = data.hclFile || 'flows/flows.mycel'
        const fileName = filePath.split('/').pop() || filePath
        const editorStore = useEditorPanelStore.getState()
        editorStore.openFile(filePath, fileName, undefined, useProjectStore.getState().projectPath)
      }
    }
    prevStoppedRef.current = stoppedAt
  }, [stoppedAt])
}
