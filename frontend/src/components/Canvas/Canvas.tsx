import { useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type OnSelectionChangeFunc,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useStudioStore } from '../../stores/useStudioStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { nodeTypes } from '../Nodes'
import { useSync } from '../../hooks/useSync'
import type { ConnectorNodeData, FlowNodeData } from '../../types'

type StudioNode = Node<ConnectorNodeData | FlowNodeData>

export default function Canvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    addNode,
  } = useStudioStore()

  const { activeFile } = useProjectStore()
  const { syncToHCL } = useSync()
  const prevNodesRef = useRef<string>('')

  // Sync to HCL when nodes change significantly (not just position during drag)
  useEffect(() => {
    // Skip if no active file
    if (!activeFile) return

    // Create a stable string representation of node data (without positions)
    const nodesData = JSON.stringify(
      nodes.map(n => ({ id: n.id, type: n.type, data: n.data }))
    )

    // Only sync if data actually changed
    if (nodesData !== prevNodesRef.current) {
      prevNodesRef.current = nodesData
      // Skip initial render
      if (nodes.length > 0) {
        syncToHCL(activeFile)
      }
    }
  }, [nodes, activeFile, syncToHCL])

  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (selectedNodes.length === 1) {
        selectNode(selectedNodes[0].id)
      } else {
        selectNode(null)
      }
    },
    [selectNode]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/mycel-node-type')
      const dataStr = event.dataTransfer.getData('application/mycel-node-data')

      if (!type || !dataStr) return

      const data = JSON.parse(dataStr)
      const position = {
        x: event.clientX - 250,
        y: event.clientY - 100,
      }

      const newNode: StudioNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data,
      }

      addNode(newNode)
    },
    [addNode]
  )

  return (
    <div className="flex-1 h-full bg-neutral-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-neutral-950"
      >
        <Background gap={20} size={1} color="#333" />
        <Controls className="bg-neutral-800 border-neutral-700" />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-neutral-900"
          maskColor="rgba(0, 0, 0, 0.7)"
        />
      </ReactFlow>
    </div>
  )
}
