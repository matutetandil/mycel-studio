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
  } = useStudioStore()

  const { activeFile } = useProjectStore()
  const { syncToHCL } = useSync()
  const prevNodesRef = useRef<string>('')

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  // Unified editor state: which block editor is open
  const [activeEditor, setActiveEditor] = useState<string | null>(null)

  // Get the selected flow node data for editors
  const selectedFlowNode = useMemo(() => {
    if (!contextMenu) return null
    const node = nodes.find(n => n.id === contextMenu.nodeId)
    if (!node || node.type !== 'flow') return null
    return node as Node<FlowNodeData>
  }, [contextMenu, nodes])

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

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const closeEditor = useCallback(() => {
    setActiveEditor(null)
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
