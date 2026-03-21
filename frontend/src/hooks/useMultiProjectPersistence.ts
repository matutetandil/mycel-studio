// Persists multi-project state across app restarts.
// Saves attached project paths to localStorage (via useSettingsStore).
// On startup, reopens additional attached projects after the first one loads.

import { useEffect, useRef } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useMultiProjectStore, registerCurrentAsProject } from '../stores/useMultiProjectStore'
import { useProjectStore } from '../stores/useProjectStore'
import { useEditorPanelStore } from '../stores/useEditorPanelStore'
import { useStudioStore } from '../stores/useStudioStore'
import { isWailsRuntime } from '../lib/api'

// Save current attached project paths to settings
export function persistMultiProjectState() {
  const multiStore = useMultiProjectStore.getState()
  multiStore.snapshotActiveProject()

  // Collect all project paths in order
  const projectPaths = multiStore.projectOrder
    .map(id => multiStore.projects.get(id)?.projectPath)
    .filter((p): p is string => !!p)

  const activeProject = multiStore.activeProjectId
    ? multiStore.projects.get(multiStore.activeProjectId)
    : undefined

  useSettingsStore.getState().setWorkspaceInstances(
    [{
      id: 'main',
      label: 'Workspace',
      projectPaths,
      activeProjectPath: activeProject?.projectPath ?? null,
    }],
    'main',
  )
}

// Restore additional attached projects on startup
async function restoreAttachedProjects() {
  if (!isWailsRuntime()) return

  const { workspaceInstances } = useSettingsStore.getState()
  if (workspaceInstances.length === 0) return

  const instance = workspaceInstances[0]
  if (!instance || instance.projectPaths.length <= 1) return

  // Wait for the first project to finish loading (useAppLifecycle handles it via lastProjectPath)
  await new Promise(resolve => setTimeout(resolve, 2000))

  const projectStore = useProjectStore.getState()
  if (!projectStore.projectName) return // first project didn't load

  // If the project's .mycel-studio.json has workspace attachments (v1.1),
  // the new parent-child architecture handles restoration via loadAttachedProjects().
  // Skip the old localStorage-based restoration to avoid duplicates.
  const multiStore = useMultiProjectStore.getState()
  if (multiStore.projects.size > 1) {
    // loadAttachedProjects already ran and restored everything — nothing to do
    return
  }

  // Register the first project in multi-project store
  registerCurrentAsProject()

  // Open each additional project
  for (let i = 1; i < instance.projectPaths.length; i++) {
    const path = instance.projectPaths[i]
    if (!path) continue

    try {
      // Snapshot current project
      useMultiProjectStore.getState().snapshotActiveProject()

      // Clear UI for new project
      useEditorPanelStore.setState({
        groups: [{ id: 'main', tabs: [], activeTabId: null }],
        activeGroupId: 'main',
        splitDirection: null,
      })
      useStudioStore.setState({
        nodes: [], edges: [], selectedNodeId: null, activeFlowEditor: null,
      })

      // Open the project
      await projectStore.openProjectAtPath(path)
      const newId = registerCurrentAsProject()

      // Open canvas tab for it
      const name = useProjectStore.getState().projectName || path.split('/').pop() || 'Project'
      useEditorPanelStore.getState().openCanvas(newId, name)
    } catch (err) {
      console.error(`Failed to restore attached project at ${path}:`, err)
    }
  }

  // Switch back to the originally active project
  if (instance.activeProjectPath) {
    const multiStore = useMultiProjectStore.getState()
    for (const [id, proj] of multiStore.projects) {
      if (proj.projectPath === instance.activeProjectPath) {
        multiStore.setActiveProject(id)
        break
      }
    }
  }
}

export function useMultiProjectPersistence() {
  const didRestore = useRef(false)

  // Restore on startup
  useEffect(() => {
    if (didRestore.current) return
    didRestore.current = true
    restoreAttachedProjects()
  }, [])

  // Persist before close
  useEffect(() => {
    const handleBeforeUnload = () => {
      persistMultiProjectState()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

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
