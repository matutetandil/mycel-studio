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
import { getFlowBlock, GenericBlockEditor } from '../../flow-blocks'
import {
  FlowContextMenu,
  TransformEditor,
  StepEditor,
  ResponseEditor,
  BatchEditor,
  ErrorHandlingEditor,
} from '../FlowConfig'
import type { ConnectorNodeData, FlowNodeData, FlowTransform, FlowStep, FlowResponse, FlowBatch, FlowErrorHandling } from '../../types'

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
    saveSnapshot,
  } = useStudioStore()

  const { activeFile } = useProjectStore()
  const { syncToHCL } = useSync()
  const prevNodesRef = useRef<string>('')

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  // Editor state from store (shared with Properties panel)
  const activeEditor = useStudioStore(s => s.activeFlowEditor)
  const setActiveEditor = useStudioStore(s => s.openFlowEditor)
  const selectedNodeId = useStudioStore(s => s.selectedNodeId)

  // Get the selected flow node data for editors — works from both context menu and Properties
  const selectedFlowNode = useMemo(() => {
    // Prefer context menu node (right-click), fallback to selected node
    const targetId = contextMenu?.nodeId || selectedNodeId
    if (!targetId) return null
    const node = nodes.find(n => n.id === targetId)
    if (!node || node.type !== 'flow') return null
    return node as Node<FlowNodeData>
  }, [contextMenu, selectedNodeId, nodes])

  // Get available cache storages
  const availableCacheStorages = useMemo(() => {
    return nodes
      .filter(n => n.type === 'connector' && (n.data as ConnectorNodeData).connectorType === 'cache')
      .map(n => (n.data as ConnectorNodeData).label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))
  }, [nodes])

  // Get available connectors for StepEditor/ErrorHandlingEditor
  const availableConnectors = useMemo(() => {
    return nodes
      .filter(n => n.type === 'connector')
      .map(n => {
        const data = n.data as ConnectorNodeData
        return {
          name: data.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
          type: data.connectorType,
          operations: data.operations,
        }
      })
  }, [nodes])

  // Sync to HCL when nodes change significantly
  useEffect(() => {
    if (!activeFile) return
    const nodesData = JSON.stringify(
      nodes.map(n => ({ id: n.id, type: n.type, data: n.data }))
    )
    if (nodesData !== prevNodesRef.current) {
      prevNodesRef.current = nodesData
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

  // Sync external selectedNodeId changes (e.g., from editor tabs) to React Flow node selection
  const prevSelectedRef = useRef<string | null>(null)
  useEffect(() => {
    if (selectedNodeId === prevSelectedRef.current) return
    prevSelectedRef.current = selectedNodeId

    // Check if React Flow already has the correct selection
    const currentlySelected = nodes.filter(n => n.selected)
    if (selectedNodeId === null && currentlySelected.length === 0) return
    if (currentlySelected.length === 1 && currentlySelected[0].id === selectedNodeId) return

    // Apply selection changes via onNodesChange
    const changes = nodes
      .filter(n => n.selected || n.id === selectedNodeId)
      .map(n => ({
        type: 'select' as const,
        id: n.id,
        selected: n.id === selectedNodeId,
      }))
    if (changes.length > 0) {
      onNodesChange(changes)
    }
  }, [selectedNodeId, nodes, onNodesChange])

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

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      if (node.type !== 'flow') return
      event.preventDefault()
      setContextMenu({
        position: { x: event.clientX, y: event.clientY },
        nodeId: node.id,
      })
    },
    []
  )

  // Save snapshot before drag starts (for undo of position changes)
  const onNodeDragStart: NodeMouseHandler = useCallback(() => {
    saveSnapshot()
  }, [saveSnapshot])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const closeEditor = useCallback(() => {
    setActiveEditor(null)
  }, [])

  // Update flow node data
  const updateFlowData = useCallback(
    (updates: Partial<FlowNodeData>) => {
      const targetId = contextMenu?.nodeId || selectedNodeId
      if (!targetId) return
      const node = nodes.find(n => n.id === targetId)
      if (!node || node.type !== 'flow') return
      updateNode(targetId, {
        ...node.data,
        ...updates,
      } as FlowNodeData)
    },
    [contextMenu, selectedNodeId, nodes, updateNode]
  )

  // Unified handler: open the right editor for a block key
  const handleSelectBlock = useCallback((blockKey: string) => {
    setActiveEditor(blockKey)
  }, [])

  // Generic block save handler (for simple blocks via GenericBlockEditor)
  const handleGenericSave = useCallback(
    (data: Record<string, unknown> | undefined) => {
      if (!activeEditor) return
      const def = getFlowBlock(activeEditor)
      if (!def) return
      updateFlowData({ [def.dataKey]: data })
    },
    [activeEditor, updateFlowData]
  )

  // Get the active definition for generic editor
  const activeDefinition = activeEditor ? getFlowBlock(activeEditor) : null
  const isGenericEditor = activeDefinition && !activeDefinition.customEditor && activeDefinition.fields

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
        onNodeDragStart={onNodeDragStart}
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
          onSelectBlock={handleSelectBlock}
        />
      )}

      {/* Generic Block Editor (cache, lock, semaphore, dedupe) */}
      {isGenericEditor && (
        <GenericBlockEditor
          definition={activeDefinition}
          isOpen={true}
          data={selectedFlowNode?.data[activeDefinition.dataKey] as Record<string, unknown> | undefined}
          availableStorages={availableCacheStorages}
          onSave={handleGenericSave}
          onClose={closeEditor}
        />
      )}

      {/* Custom Editors */}
      {/* Custom Editors — each calls onClose() after onSave() internally */}
      <TransformEditor
        isOpen={activeEditor === 'transform'}
        transform={selectedFlowNode?.data.transform}
        onSave={(transform: FlowTransform | undefined) => updateFlowData({ transform })}
        onClose={closeEditor}
      />

      <StepEditor
        isOpen={activeEditor === 'step'}
        steps={selectedFlowNode?.data.steps}
        availableConnectors={availableConnectors}
        onSave={(steps: FlowStep[] | undefined) => updateFlowData({ steps })}
        onClose={closeEditor}
      />

      <ResponseEditor
        isOpen={activeEditor === 'response'}
        response={selectedFlowNode?.data.response}
        isEchoFlow={selectedFlowNode ? !edges.some(e => e.source === selectedFlowNode.id) : false}
        onSave={(response: FlowResponse | undefined) => updateFlowData({ response })}
        onClose={closeEditor}
      />

      <BatchEditor
        isOpen={activeEditor === 'batch'}
        batch={selectedFlowNode?.data.batch}
        availableConnectors={availableConnectors}
        onSave={(batch: FlowBatch | undefined) => updateFlowData({ batch })}
        onClose={closeEditor}
      />

      <ErrorHandlingEditor
        isOpen={activeEditor === 'errorHandling'}
        errorHandling={selectedFlowNode?.data.errorHandling}
        availableConnectors={availableConnectors}
        onSave={(errorHandling: FlowErrorHandling | undefined) => updateFlowData({ errorHandling })}
        onClose={closeEditor}
      />
    </div>
  )
}
