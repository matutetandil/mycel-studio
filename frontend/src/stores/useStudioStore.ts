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
import type { ConnectorNodeData, FlowNodeData, ServiceConfig, AuthConfig, EnvironmentConfig, SecurityConfig, PluginConfig } from '../types'

type StudioNode = Node<ConnectorNodeData | FlowNodeData>

interface StudioState {
  nodes: StudioNode[]
  edges: Edge[]
  selectedNodeId: string | null
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
  updateServiceConfig: (config: Partial<ServiceConfig>) => void
  updateAuthConfig: (config: Partial<AuthConfig>) => void
  updateEnvConfig: (config: Partial<EnvironmentConfig>) => void
  updateSecurityConfig: (config: Partial<SecurityConfig>) => void
  updatePluginConfig: (config: Partial<PluginConfig>) => void
  onNodesChange: (changes: NodeChange<StudioNode>[]) => void
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void
  onConnect: (connection: Connection) => void
}

export const useStudioStore = create<StudioState>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
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

  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),

  updateNode: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
    })),

  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    })),

  selectNode: (id) => set({ selectedNodeId: id }),

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

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    })),

  onConnect: (connection) =>
    set((state) => ({
      edges: addEdge(connection, state.edges),
    })),
}))
