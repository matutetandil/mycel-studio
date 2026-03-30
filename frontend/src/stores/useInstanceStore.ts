import { create } from 'zustand'
import { useProjectStore } from './useProjectStore'
import { captureAllProviders, restoreAllProviders, clearAllProviders } from './snapshotRegistry'
import { ideInit, isWailsRuntime } from '../lib/api'

// Import all stores so their registerSnapshotProvider calls execute
import './useStudioStore'
import './useProjectStore'
import './useEditorPanelStore'
import './useMultiProjectStore'
import './useLayoutStore'
import './useGitStore'
import './useDebugStore'
import './useDiagnosticsStore'
import './useHintsStore'
import './useOutputStore'
import './useTerminalStore'

// Serialized snapshot of an entire workspace instance
export interface WorkspaceInstanceSnapshot {
  providers: Record<string, unknown>
}

export interface WorkspaceInstance {
  id: string
  label: string
  snapshot: WorkspaceInstanceSnapshot | null // null = currently active (live state)
}

interface InstanceState {
  instances: WorkspaceInstance[]
  activeInstanceId: string

  addInstance: () => Promise<string>
  removeInstance: (id: string) => Promise<void>
  switchInstance: (id: string) => Promise<void>
  updateLabel: (id: string, label: string) => void
  getInstanceLabel: (id: string) => string
}

function generateInstanceId(): string {
  return `inst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function deriveLabel(): string {
  const projectName = useProjectStore.getState().projectName
  return projectName || 'New Workspace'
}

async function captureSnapshot(): Promise<WorkspaceInstanceSnapshot> {
  return { providers: await captureAllProviders() }
}

function restoreSnapshot(snapshot: WorkspaceInstanceSnapshot) {
  restoreAllProviders(snapshot.providers)
  // Reinitialize Go-side singletons for the restored project
  reinitializeBackend()
}

// Reinitialize IDE engine and refresh git for the current project after an instance switch.
// These are Go singletons that don't participate in the snapshot registry.
async function reinitializeBackend() {
  const { projectPath } = useProjectStore.getState()
  if (!projectPath || !isWailsRuntime()) return

  // Reinitialize IDE engine for this project (full reindex)
  try {
    await ideInit(projectPath)
  } catch (err) {
    console.error('Failed to reinitialize IDE engine after instance switch:', err)
  }

  // Refresh git status for the restored project
  try {
    useProjectStore.getState().refreshGitStatus()
  } catch (err) {
    console.error('Failed to refresh git after instance switch:', err)
  }

  // Refresh diagnostics
  try {
    const { useDiagnosticsStore } = await import('./useDiagnosticsStore')
    useDiagnosticsStore.getState().refreshAll()
  } catch { /* ignore */ }
}

// Initialize with a default instance
const defaultInstanceId = generateInstanceId()

export const useInstanceStore = create<InstanceState>((set, get) => ({
  instances: [{ id: defaultInstanceId, label: 'Workspace', snapshot: null }],
  activeInstanceId: defaultInstanceId,

  addInstance: async () => {
    const state = get()
    const id = generateInstanceId()

    // Snapshot current active instance (async — captures real terminal CWDs)
    const snapshot = await captureSnapshot()
    const updatedInstances = state.instances.map(inst =>
      inst.id === state.activeInstanceId
        ? { ...inst, label: deriveLabel(), snapshot }
        : inst
    )

    // Clear all stores for new empty workspace
    clearAllProviders()

    const newInstance: WorkspaceInstance = { id, label: 'New Workspace', snapshot: null }

    set({
      instances: [...updatedInstances, newInstance],
      activeInstanceId: id,
    })

    return id
  },

  removeInstance: async (id) => {
    const state = get()
    if (state.instances.length <= 1) return // Can't remove last instance

    const remaining = state.instances.filter(inst => inst.id !== id)
    const wasActive = state.activeInstanceId === id

    if (wasActive) {
      // Switch to next available instance
      const newActive = remaining[0]
      if (newActive.snapshot) {
        restoreSnapshot(newActive.snapshot)
        newActive.snapshot = null
      }
      set({ instances: remaining, activeInstanceId: newActive.id })
      reinitializeBackend()
    } else {
      set({ instances: remaining })
    }
  },

  switchInstance: async (id) => {
    const state = get()
    if (state.activeInstanceId === id) return

    const target = state.instances.find(inst => inst.id === id)
    if (!target) return

    // Snapshot current instance (async — captures real terminal CWDs)
    const snapshot = await captureSnapshot()
    const updatedInstances = state.instances.map(inst =>
      inst.id === state.activeInstanceId
        ? { ...inst, label: deriveLabel(), snapshot }
        : inst
    )

    // Restore target instance
    if (target.snapshot) {
      restoreSnapshot(target.snapshot)
    }

    // Mark target as active (no snapshot needed since it's live)
    set({
      instances: updatedInstances.map(inst =>
        inst.id === id ? { ...inst, snapshot: null } : inst
      ),
      activeInstanceId: id,
    })

    // Reinitialize Go-side singletons for the restored project
    reinitializeBackend()
  },

  updateLabel: (id, label) => {
    set(state => ({
      instances: state.instances.map(inst =>
        inst.id === id ? { ...inst, label } : inst
      ),
    }))
  },

  getInstanceLabel: (id) => {
    const inst = get().instances.find(i => i.id === id)
    if (!inst) return 'Workspace'
    if (inst.snapshot === null) return deriveLabel()
    return inst.label
  },
}))
