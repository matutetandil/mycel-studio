import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type OnSelectionChangeFunc,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useStudioStore } from '../../stores/useStudioStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { nodeTypes } from '../Nodes'
import { useSync } from '../../hooks/useSync'
import { FlowContextMenu, TransformEditor, CacheEditor } from '../FlowConfig'
import type { ConnectorNodeData, FlowNodeData, FlowTransform, FlowCache } from '../../types'

type StudioNode = Node<ConnectorNodeData | FlowNodeData>

interface ContextMenuState {
  position: { x: number; y: number }
  nodeId: string
}

export default function Canvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    addNode,
    updateNode,
  } = useStudioStore()

  const { activeFile } = useProjectStore()
  const { syncToHCL } = useSync()
  const prevNodesRef = useRef<string>('')

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [transformEditorOpen, setTransformEditorOpen] = useState(false)
  const [cacheEditorOpen, setCacheEditorOpen] = useState(false)

  // Get the selected flow node data for editors
  const selectedFlowNode = useMemo(() => {
    if (!contextMenu) return null
    const node = nodes.find(n => n.id === contextMenu.nodeId)
    if (!node || node.type !== 'flow') return null
    return node as Node<FlowNodeData>
  }, [contextMenu, nodes])

  // Get available cache storages for CacheEditor
  const availableCacheStorages = useMemo(() => {
    return nodes
      .filter(n => n.type === 'connector' && (n.data as ConnectorNodeData).connectorType === 'cache')
      .map(n => (n.data as ConnectorNodeData).label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))
  }, [nodes])

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

  // Handle right-click on nodes
  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      // Only show context menu for flow nodes
      if (node.type !== 'flow') return

      event.preventDefault()
      setContextMenu({
        position: { x: event.clientX, y: event.clientY },
        nodeId: node.id,
      })
    },
    []
  )

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Update flow node data
  const updateFlowData = useCallback(
    (updates: Partial<FlowNodeData>) => {
      if (!contextMenu) return
      const node = nodes.find(n => n.id === contextMenu.nodeId)
      if (!node || node.type !== 'flow') return

      updateNode(contextMenu.nodeId, {
        ...node.data,
        ...updates,
      } as FlowNodeData)
    },
    [contextMenu, nodes, updateNode]
  )

  // Transform handlers
  const handleAddTransform = useCallback(() => {
    closeContextMenu()
    setTransformEditorOpen(true)
  }, [closeContextMenu])

  const handleSaveTransform = useCallback(
    (transform: FlowTransform | undefined) => {
      updateFlowData({ transform })
    },
    [updateFlowData]
  )

  // Cache handlers
  const handleAddCache = useCallback(() => {
    closeContextMenu()
    setCacheEditorOpen(true)
  }, [closeContextMenu])

  const handleSaveCache = useCallback(
    (cache: FlowCache | undefined) => {
      updateFlowData({ cache })
    },
    [updateFlowData]
  )

  // Placeholder handlers for other features (to be implemented)
  const handleAddEnrich = useCallback(() => {
    closeContextMenu()
    // TODO: Open EnrichEditor
    console.log('Add Enrich - not implemented yet')
  }, [closeContextMenu])

  const handleAddLock = useCallback(() => {
    closeContextMenu()
    // TODO: Open LockEditor
    console.log('Add Lock - not implemented yet')
  }, [closeContextMenu])

  const handleAddSemaphore = useCallback(() => {
    closeContextMenu()
    // TODO: Open SemaphoreEditor
    console.log('Add Semaphore - not implemented yet')
  }, [closeContextMenu])

  const handleAddResponse = useCallback(() => {
    closeContextMenu()
    // TODO: Open ResponseEditor
    console.log('Add Response - not implemented yet')
  }, [closeContextMenu])

  const handleAddErrorHandling = useCallback(() => {
    closeContextMenu()
    // TODO: Open ErrorHandlingEditor
    console.log('Add Error Handling - not implemented yet')
  }, [closeContextMenu])

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
        onNodeContextMenu={onNodeContextMenu}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        edgesReconnectable
        elementsSelectable
        selectNodesOnDrag={false}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2 },
          selectable: true,
          deletable: true,
          interactionWidth: 20,
        }}
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

      {/* Flow Context Menu */}
      {contextMenu && selectedFlowNode && (
        <FlowContextMenu
          position={contextMenu.position}
          flowData={selectedFlowNode.data}
          onClose={closeContextMenu}
          onAddTransform={handleAddTransform}
          onAddCache={handleAddCache}
          onAddEnrich={handleAddEnrich}
          onAddLock={handleAddLock}
          onAddSemaphore={handleAddSemaphore}
          onAddResponse={handleAddResponse}
          onAddErrorHandling={handleAddErrorHandling}
        />
      )}

      {/* Transform Editor Modal */}
      <TransformEditor
        isOpen={transformEditorOpen}
        transform={selectedFlowNode?.data.transform}
        onSave={handleSaveTransform}
        onClose={() => setTransformEditorOpen(false)}
      />

      {/* Cache Editor Modal */}
      <CacheEditor
        isOpen={cacheEditorOpen}
        cache={selectedFlowNode?.data.cache}
        availableStorages={availableCacheStorages}
        onSave={handleSaveCache}
        onClose={() => setCacheEditorOpen(false)}
      />
    </div>
  )
}
