import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react'
import type { ConnectorNodeData, FlowNodeData, FlowTo, ServiceConfig, AuthConfig, EnvironmentConfig, SecurityConfig, PluginConfig, TypeNodeData, TransformNodeData, ValidatorNodeData, AspectNodeData, SagaNodeData, StateMachineNodeData } from '../types'
import { useHistoryStore } from './useHistoryStore'

// Convert label to identifier (same logic as toIdentifier in hclGenerator)
function labelToId(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

// Propagate a name change across all nodes that reference the old name
function propagateRename(
  nodes: StudioNode[],
  changedNodeType: string,
  oldName: string,
  newName: string,
): StudioNode[] {
  if (oldName === newName || !oldName || !newName) return nodes

  return nodes.map(node => {
    // Connector renamed → update flows, aspects, sagas, steps, enrichments
    if (changedNodeType === 'connector') {
      if (node.type === 'flow') {
        const d = node.data as FlowNodeData
        let changed = false
        const updates: Partial<FlowNodeData> = {}

        if (d.from?.connector === oldName) {
          updates.from = { ...d.from, connector: newName }
          changed = true
        }
        if (d.to) {
          if (Array.isArray(d.to)) {
            const origTo = d.to as FlowTo[]
            const newTo = origTo.map((t: FlowTo) => t.connector === oldName ? { ...t, connector: newName } : t)
            if (newTo.some((t: FlowTo, i: number) => t !== origTo[i])) {
              updates.to = newTo
              changed = true
            }
          } else if ((d.to as FlowTo).connector === oldName) {
            updates.to = { ...(d.to as FlowTo), connector: newName }
            changed = true
          }
        }
        if (d.steps?.some(s => s.connector === oldName)) {
          updates.steps = d.steps.map(s => s.connector === oldName ? { ...s, connector: newName } : s)
          changed = true
        }
        if (d.enrich?.some(e => e.connector === oldName)) {
          updates.enrich = d.enrich.map(e => e.connector === oldName ? { ...e, connector: newName } : e)
          changed = true
        }
        if (d.cache?.storage === oldName) {
          updates.cache = { ...d.cache, storage: newName }
          changed = true
        }
        if (d.lock?.storage === oldName) {
          updates.lock = { ...d.lock, storage: newName }
          changed = true
        }
        if (d.semaphore?.storage === oldName) {
          updates.semaphore = { ...d.semaphore, storage: newName }
          changed = true
        }
        if (d.dedupe?.storage === oldName) {
          updates.dedupe = { ...d.dedupe, storage: newName }
          changed = true
        }
        if (d.batch?.to?.connector === oldName) {
          updates.batch = { ...d.batch, to: { ...d.batch.to, connector: newName } }
          changed = true
        }
        if (changed) {
          return { ...node, data: { ...d, ...updates } } as StudioNode
        }
      }
      if (node.type === 'aspect') {
        const d = node.data as AspectNodeData
        if (d.action?.connector === oldName) {
          return { ...node, data: { ...d, action: { ...d.action, connector: newName } } } as StudioNode
        }
        if (d.invalidate?.storage === oldName) {
          return { ...node, data: { ...d, invalidate: { ...d.invalidate, storage: newName } } } as StudioNode
        }
        if (d.cache?.storage === oldName) {
          return { ...node, data: { ...d, cache: { ...d.cache, storage: newName } } } as StudioNode
        }
      }
      if (node.type === 'saga') {
        const d = node.data as SagaNodeData
        const newSteps = d.steps.map(s => {
          let step = s
          if (s.action?.connector === oldName) step = { ...step, action: { ...s.action!, connector: newName } }
          if (s.compensate?.connector === oldName) step = { ...step, compensate: { ...s.compensate!, connector: newName } }
          return step
        })
        if (newSteps.some((s, i) => s !== d.steps[i])) {
          return { ...node, data: { ...d, steps: newSteps } } as StudioNode
        }
      }
    }

    // Flow renamed → update aspect on[] patterns (exact matches only)
    if (changedNodeType === 'flow' && node.type === 'aspect') {
      const d = node.data as AspectNodeData
      if (d.on?.includes(oldName)) {
        return { ...node, data: { ...d, on: d.on.map(p => p === oldName ? newName : p) } } as StudioNode
      }
    }

    // Type renamed → update flow validate references
    if (changedNodeType === 'type' && node.type === 'flow') {
      const d = node.data as FlowNodeData
      if (d.validate?.input === oldName || d.validate?.output === oldName) {
        return { ...node, data: { ...d, validate: {
          input: d.validate?.input === oldName ? newName : d.validate?.input,
          output: d.validate?.output === oldName ? newName : d.validate?.output,
        } } } as StudioNode
      }
    }

    // Transform renamed → update flow transform.use references
    if (changedNodeType === 'transform' && node.type === 'flow') {
      const d = node.data as FlowNodeData
      if (d.transform?.use?.includes(oldName)) {
        return { ...node, data: { ...d, transform: {
          ...d.transform,
          use: d.transform.use.map(u => u === oldName ? newName : u),
        } } } as StudioNode
      }
    }

    return node
  })
}

type StudioNode = Node<ConnectorNodeData | FlowNodeData | TypeNodeData | TransformNodeData | ValidatorNodeData | AspectNodeData | SagaNodeData | StateMachineNodeData>

// Clipboard for copy/paste
interface ClipboardEntry {
  node: StudioNode
  connectedEdges: Edge[]
}

interface StudioState {
  nodes: StudioNode[]
  edges: Edge[]
  selectedNodeId: string | null
  activeFlowEditor: string | null
  clipboard: ClipboardEntry | null
  serviceConfig: ServiceConfig
  authConfig: AuthConfig
  envConfig: EnvironmentConfig
  securityConfig: SecurityConfig
  pluginConfig: PluginConfig
  setNodes: (nodes: StudioNode[]) => void
  setEdges: (edges: Edge[]) => void
  addNode: (node: StudioNode) => void
  updateNode: (id: string, data: Partial<ConnectorNodeData | FlowNodeData>) => void
  removeNode: (id: string) => void
  selectNode: (id: string | null) => void
  openFlowEditor: (editor: string | null) => void
  copyNode: () => void
  pasteNode: () => void
  duplicateNode: () => void
  undo: () => void
  redo: () => void
  saveSnapshot: () => void
  loadTemplate: (nodes: StudioNode[], edges: Edge[]) => void
  updateServiceConfig: (config: Partial<ServiceConfig>) => void
  updateAuthConfig: (config: Partial<AuthConfig>) => void
  updateEnvConfig: (config: Partial<EnvironmentConfig>) => void
  updateSecurityConfig: (config: Partial<SecurityConfig>) => void
  updatePluginConfig: (config: Partial<PluginConfig>) => void
  onNodesChange: (changes: NodeChange<StudioNode>[]) => void
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void
  onConnect: (connection: Connection) => void
}

function saveToHistory(state: { nodes: StudioNode[]; edges: Edge[] }) {
  useHistoryStore.getState().pushState({
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    edges: JSON.parse(JSON.stringify(state.edges)),
  })
}

export const useStudioStore = create<StudioState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  activeFlowEditor: null,
  clipboard: null,
  serviceConfig: { name: 'my-service', version: '1.0.0' },
  authConfig: {
    enabled: false,
    preset: 'standard',
    jwt: {
      algorithm: 'HS256',
      accessLifetime: '1h',
      refreshLifetime: '7d',
    },
    password: {
      minLength: 8,
      requireUpper: true,
      requireLower: true,
      requireNumber: true,
      requireSpecial: false,
    },
    mfa: {
      required: 'optional',
      methods: ['totp'],
    },
    sessions: {
      maxActive: 5,
      idleTimeout: '1h',
      onMaxReached: 'revoke_oldest',
    },
    security: {},
    storage: {
      tokenDriver: 'memory',
    },
    socialProviders: [],
  },
  envConfig: {
    variables: [],
    environments: [],
  },
  securityConfig: {
    enabled: false,
    sanitizers: [],
  },
  pluginConfig: {
    plugins: [],
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) => {
    const state = get()
    saveToHistory(state)
    set({ nodes: [...state.nodes, node] })
  },

  updateNode: (id, data) => {
    const state = get()
    saveToHistory(state)

    const targetNode = state.nodes.find(n => n.id === id)
    let updatedNodes = state.nodes.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, ...data } } as StudioNode : node
    )

    // If label changed, propagate rename to all referencing nodes
    if (targetNode && data.label && data.label !== (targetNode.data as { label: string }).label) {
      const oldName = labelToId((targetNode.data as { label: string }).label)
      const newName = labelToId(data.label as string)
      updatedNodes = propagateRename(updatedNodes, targetNode.type || '', oldName, newName)
    }

    set({ nodes: updatedNodes })
  },

  removeNode: (id) => {
    const state = get()
    saveToHistory(state)
    set({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    })
  },

  selectNode: (id) => set({ selectedNodeId: id }),
  openFlowEditor: (editor) => set({ activeFlowEditor: editor }),

  copyNode: () => {
    const { selectedNodeId, nodes, edges } = get()
    if (!selectedNodeId) return
    const node = nodes.find(n => n.id === selectedNodeId)
    if (!node) return
    const connectedEdges = edges.filter(e => e.source === selectedNodeId || e.target === selectedNodeId)
    set({ clipboard: { node: JSON.parse(JSON.stringify(node)), connectedEdges: JSON.parse(JSON.stringify(connectedEdges)) } })
  },

  pasteNode: () => {
    const { clipboard, nodes, edges } = get()
    if (!clipboard) return
    saveToHistory({ nodes, edges })
    const newId = `${clipboard.node.type}-${Date.now()}`
    const newNode: StudioNode = {
      ...clipboard.node,
      id: newId,
      position: {
        x: clipboard.node.position.x + 50,
        y: clipboard.node.position.y + 50,
      },
      selected: false,
    }
    set({ nodes: [...nodes, newNode], selectedNodeId: newId })
  },

  duplicateNode: () => {
    const { selectedNodeId, nodes, edges } = get()
    if (!selectedNodeId) return
    const node = nodes.find(n => n.id === selectedNodeId)
    if (!node) return
    saveToHistory({ nodes, edges })
    const newId = `${node.type}-${Date.now()}`
    const newNode: StudioNode = {
      ...JSON.parse(JSON.stringify(node)),
      id: newId,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      selected: false,
    }
    set({ nodes: [...nodes, newNode], selectedNodeId: newId })
  },

  undo: () => {
    const state = get()
    const history = useHistoryStore.getState()
    if (!history.canUndo()) return
    // Push current state to future
    history.future = [
      { nodes: JSON.parse(JSON.stringify(state.nodes)), edges: JSON.parse(JSON.stringify(state.edges)) },
      ...history.future,
    ]
    const snapshot = history.undo()
    if (snapshot) {
      set({ nodes: snapshot.nodes as StudioNode[], edges: snapshot.edges })
    }
  },

  redo: () => {
    const state = get()
    const history = useHistoryStore.getState()
    if (!history.canRedo()) return
    // Push current state to past
    history.past = [
      ...history.past,
      { nodes: JSON.parse(JSON.stringify(state.nodes)), edges: JSON.parse(JSON.stringify(state.edges)) },
    ]
    const snapshot = history.redo()
    if (snapshot) {
      set({ nodes: snapshot.nodes as StudioNode[], edges: snapshot.edges })
    }
  },

  saveSnapshot: () => {
    saveToHistory(get())
  },

  loadTemplate: (nodes, edges) => {
    const state = get()
    saveToHistory(state)
    set({ nodes, edges, selectedNodeId: null })
  },

  updateServiceConfig: (config) =>
    set((state) => ({
      serviceConfig: { ...state.serviceConfig, ...config },
    })),

  updateAuthConfig: (config) =>
    set((state) => ({
      authConfig: { ...state.authConfig, ...config },
    })),

  updateEnvConfig: (config) =>
    set((state) => ({
      envConfig: { ...state.envConfig, ...config },
    })),

  updateSecurityConfig: (config) =>
    set((state) => ({
      securityConfig: { ...state.securityConfig, ...config },
    })),

  updatePluginConfig: (config) =>
    set((state) => ({
      pluginConfig: { ...state.pluginConfig, ...config },
    })),

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    })),

  onEdgesChange: (changes) => {
    // Save to history if edges are being removed
    const hasRemoval = changes.some(c => c.type === 'remove')
    if (hasRemoval) saveToHistory(get())
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }))
  },

  onConnect: (connection) => {
    const state = get()
    const sourceNode = state.nodes.find(n => n.id === connection.source)
    const targetNode = state.nodes.find(n => n.id === connection.target)

    // If aspect → connector, auto-assign action connector
    if (sourceNode?.type === 'aspect' && targetNode?.type === 'connector') {
      saveToHistory(state)
      const connectorData = targetNode.data as ConnectorNodeData
      const connectorName = connectorData.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      const aspectData = sourceNode.data as AspectNodeData
      set({
        nodes: state.nodes.map(n =>
          n.id === sourceNode.id
            ? { ...n, data: { ...n.data, action: { ...aspectData.action, connector: connectorName, target: aspectData.action?.target || '' } } } as StudioNode
            : n
        ),
      })
      // Don't create an edge — the action is stored in data, virtual edge renders it
      return
    }

    // If aspect → flow or flow → aspect, auto-add flow name to aspect's on patterns
    const aspectNode = sourceNode?.type === 'aspect' ? sourceNode : targetNode?.type === 'aspect' ? targetNode : null
    const flowNode = sourceNode?.type === 'flow' ? sourceNode : targetNode?.type === 'flow' ? targetNode : null
    if (aspectNode && flowNode) {
      saveToHistory(state)
      const flowData = flowNode.data as FlowNodeData
      const flowName = flowData.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      const aspectData = aspectNode.data as AspectNodeData
      const currentPatterns = aspectData.on || []
      if (flowName && !currentPatterns.includes(flowName)) {
        set({
          nodes: state.nodes.map(n =>
            n.id === aspectNode.id
              ? { ...n, data: { ...n.data, on: [...currentPatterns, flowName] } } as StudioNode
              : n
          ),
        })
      }
      // Don't create an edge — the virtual aspect edge renders it
      return
    }

    // If both ends are connectors, auto-create a Flow node in between
    if (sourceNode?.type === 'connector' && targetNode?.type === 'connector') {
      saveToHistory(state)
      const sourceData = sourceNode.data as ConnectorNodeData
      const targetData = targetNode.data as ConnectorNodeData
      const flowId = `flow-${Date.now()}`

      // Position the flow between the two connectors
      const flowNode: StudioNode = {
        id: flowId,
        type: 'flow',
        position: {
          x: (sourceNode.position.x + targetNode.position.x) / 2,
          y: (sourceNode.position.y + targetNode.position.y) / 2,
        },
        data: {
          label: `${sourceData.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_to_${targetData.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`,
        } as FlowNodeData,
      }

      // Create two edges: source → flow, flow → target
      const edge1 = {
        id: `e-${sourceNode.id}-${flowId}`,
        source: sourceNode.id,
        target: flowId,
      }
      const edge2 = {
        id: `e-${flowId}-${targetNode.id}`,
        source: flowId,
        target: targetNode.id,
      }

      set({
        nodes: [...state.nodes, flowNode],
        edges: [...state.edges, edge1, edge2],
        selectedNodeId: flowId,
      })
      return
    }

    saveToHistory(state)
    set({ edges: addEdge(connection, state.edges) })
  },
}))
