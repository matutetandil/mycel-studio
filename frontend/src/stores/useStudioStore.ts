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
import type { ConnectorNodeData, FlowNodeData, ServiceConfig, AuthConfig, EnvironmentConfig, SecurityConfig, PluginConfig, TypeNodeData, TransformNodeData, ValidatorNodeData, AspectNodeData, SagaNodeData, StateMachineNodeData } from '../types'
import { useHistoryStore } from './useHistoryStore'

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
    set({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } as StudioNode : node
      ),
    })
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
          label: `${sourceData.label} to ${targetData.label}`,
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
