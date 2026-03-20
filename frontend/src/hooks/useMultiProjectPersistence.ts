// Persists multi-project and instance state across app restarts.
// Saves project paths and instance structure to localStorage (via useSettingsStore).
// On startup, reopens all attached projects and restores instance tabs.

import { useEffect, useRef } from 'react'
import { useSettingsStore, type PersistedInstance } from '../stores/useSettingsStore'
import { useMultiProjectStore } from '../stores/useMultiProjectStore'
import { useInstanceStore } from '../stores/useInstanceStore'
import { useProjectStore } from '../stores/useProjectStore'
import { isWailsRuntime } from '../lib/api'

// Save current multi-project + instance state to settings
export function persistMultiProjectState() {
  const instanceStore = useInstanceStore.getState()
  const multiStore = useMultiProjectStore.getState()

  // Snapshot active project before persisting
  multiStore.snapshotActiveProject()

  const persistedInstances: PersistedInstance[] = instanceStore.instances.map(inst => {
    if (inst.id === instanceStore.activeInstanceId) {
      // Active instance — read live state
      const projectPaths = multiStore.projectOrder
        .map(id => multiStore.projects.get(id)?.projectPath)
        .filter((p): p is string => p !== null && p !== undefined)

      const activeProject = multiStore.activeProjectId
        ? multiStore.projects.get(multiStore.activeProjectId)
        : undefined

      return {
        id: inst.id,
        label: useProjectStore.getState().projectName || inst.label,
        projectPaths,
        activeProjectPath: activeProject?.projectPath ?? null,
      }
    }

    // Inactive instance — read from snapshot
    if (inst.snapshot) {
      const projectPaths = inst.snapshot.projectOrder
        .map(id => {
          const entry = inst.snapshot!.projects.find(([k]) => k === id)
          return entry?.[1]?.projectPath
        })
        .filter((p): p is string => p !== null && p !== undefined)

      const activeEntry = inst.snapshot.activeProjectId
        ? inst.snapshot.projects.find(([k]) => k === inst.snapshot!.activeProjectId)
        : undefined

      return {
        id: inst.id,
        label: inst.label,
        projectPaths,
        activeProjectPath: activeEntry?.[1]?.projectPath ?? null,
      }
    }

    return {
      id: inst.id,
      label: inst.label,
      projectPaths: [],
      activeProjectPath: null,
    }
  })

  useSettingsStore.getState().setWorkspaceInstances(
    persistedInstances,
    instanceStore.activeInstanceId,
  )
}

// Restore multi-project state on startup
async function restoreMultiProjectState() {
  const { workspaceInstances, activeInstanceId } = useSettingsStore.getState()

  // Nothing to restore
  if (workspaceInstances.length === 0) return

  // Only on Wails (desktop) — browser can't reopen by path
  if (!isWailsRuntime()) return

  // Find the active instance to restore first
  const activeInstance = workspaceInstances.find(i => i.id === activeInstanceId) || workspaceInstances[0]
  if (!activeInstance || activeInstance.projectPaths.length === 0) return

  const projectStore = useProjectStore.getState()

  // Open the active project of the active instance
  // (The first project is opened via useAppLifecycle's lastProjectPath)
  // Open additional attached projects
  if (activeInstance.projectPaths.length > 1) {
    // Wait a bit for the first project to load (useAppLifecycle handles it)
    await new Promise(resolve => setTimeout(resolve, 1500))

    const { registerCurrentAsProject } = await import('../stores/useMultiProjectStore')
    const multiStore = useMultiProjectStore.getState()

    // Register the first project if not yet registered
    if (multiStore.projectOrder.length === 0 && projectStore.projectName) {
      registerCurrentAsProject()
    }

    // Open remaining projects
    for (let i = 1; i < activeInstance.projectPaths.length; i++) {
      const path = activeInstance.projectPaths[i]
      if (!path) continue

      // Snapshot current state
      multiStore.snapshotActiveProject()

      // Open the project
      try {
        await projectStore.openProjectAtPath(path)
        registerCurrentAsProject()
      } catch (err) {
        console.error(`Failed to restore project at ${path}:`, err)
      }
    }

    // Switch back to the originally active project
    if (activeInstance.activeProjectPath) {
      const updatedMulti = useMultiProjectStore.getState()
      for (const [id, proj] of updatedMulti.projects) {
        if (proj.projectPath === activeInstance.activeProjectPath) {
          updatedMulti.setActiveProject(id)
          break
        }
      }
    }
  }

  // Restore additional instance tabs (with their projects)
  if (workspaceInstances.length > 1) {
    const instanceStore = useInstanceStore.getState()

    for (const persisted of workspaceInstances) {
      if (persisted.id === activeInstance.id) continue
      if (persisted.projectPaths.length === 0) continue

      // Create a new instance
      const newId = instanceStore.addInstance()

      // Open projects in the new (now active) instance
      for (let i = 0; i < persisted.projectPaths.length; i++) {
        const path = persisted.projectPaths[i]
        if (!path) continue

        try {
          if (i === 0) {
            await projectStore.openProjectAtPath(path)
          } else {
            const multiStore = useMultiProjectStore.getState()
            multiStore.snapshotActiveProject()
            await projectStore.openProjectAtPath(path)
          }
          const { registerCurrentAsProject } = await import('../stores/useMultiProjectStore')
          registerCurrentAsProject()
        } catch (err) {
          console.error(`Failed to restore project at ${path}:`, err)
        }
      }

      // Update the instance label
      instanceStore.updateLabel(newId, persisted.label)
    }

    // Switch back to the original active instance
    const updatedInstances = useInstanceStore.getState()
    const originalInstance = updatedInstances.instances[0]
    if (originalInstance) {
      instanceStore.switchInstance(originalInstance.id)
    }
  }
}

export function useMultiProjectPersistence() {
  const didRestore = useRef(false)

  // Restore on startup (once, after a delay to let the first project load)
  useEffect(() => {
    if (didRestore.current) return
    didRestore.current = true

    const { workspaceInstances } = useSettingsStore.getState()
    if (workspaceInstances.length > 0) {
      // Only restore additional projects (first is handled by useAppLifecycle)
      const activeInstance = workspaceInstances.find(i => i.id === useSettingsStore.getState().activeInstanceId)
      if (activeInstance && activeInstance.projectPaths.length > 1) {
        restoreMultiProjectState()
      }
    }
  }, [])

  // Persist before close — hook into existing beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      persistMultiProjectState()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Also listen for Wails before-close event
    if (isWailsRuntime()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const runtime = (window as any).runtime
      if (runtime?.EventsOn) {
        runtime.EventsOn('app:before-close-multiproject', () => {
          persistMultiProjectState()
        })
        return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload)
          runtime.EventsOff('app:before-close-multiproject')
        }
      }
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
}
