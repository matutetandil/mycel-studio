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
import type { ConnectorNodeData, FlowNodeData, ServiceConfig } from '../types'

type StudioNode = Node<ConnectorNodeData | FlowNodeData>

interface StudioState {
  nodes: StudioNode[]
  edges: Edge[]
  selectedNodeId: string | null
  serviceConfig: ServiceConfig
  setNodes: (nodes: StudioNode[]) => void
  setEdges: (edges: Edge[]) => void
  addNode: (node: StudioNode) => void
  updateNode: (id: string, data: Partial<ConnectorNodeData | FlowNodeData>) => void
  removeNode: (id: string) => void
  selectNode: (id: string | null) => void
  updateServiceConfig: (config: Partial<ServiceConfig>) => void
  onNodesChange: (changes: NodeChange<StudioNode>[]) => void
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void
  onConnect: (connection: Connection) => void
}

export const useStudioStore = create<StudioState>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  serviceConfig: { name: 'my-service', version: '1.0.0' },

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
