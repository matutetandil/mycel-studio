// Hook that manages the project open/attach/new-tab flow.
// IntelliJ-style: picker opens first, THEN if there's already a project open,
// shows the Attach/New Tab dialog.

import { useState, useCallback } from 'react'
import { useProjectStore } from '../stores/useProjectStore'
import { useStudioStore } from '../stores/useStudioStore'
import { useMultiProjectStore, registerCurrentAsProject } from '../stores/useMultiProjectStore'
import { useInstanceStore } from '../stores/useInstanceStore'
import { useEditorPanelStore } from '../stores/useEditorPanelStore'
import { isWailsRuntime } from '../lib/api'

interface PendingProject {
  path: string
  name: string
}

// Open native directory picker and return the selected path (without loading files)
async function pickDirectory(): Promise<string | null> {
  if (isWailsRuntime()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).go?.main?.App
    if (!app?.OpenDirectoryDialog) return null
    const path: string = await app.OpenDirectoryDialog()
    return path || null
  }
  return null
}

// Check if there's currently a project open (reads fresh from store, no stale closure)
function hasProject(): boolean {
  return !!useProjectStore.getState().projectName
}

// Clear editor tabs and canvas state for a clean project switch
function clearCurrentProjectUI() {
  useEditorPanelStore.setState({
    groups: [{ id: 'main', tabs: [], activeTabId: null }],
    activeGroupId: 'main',
    splitDirection: null,
  })
  useStudioStore.setState({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    activeFlowEditor: null,
  })
}

export function useProjectOpen() {
  const [showAttachDialog, setShowAttachDialog] = useState(false)
  const [pendingProject, setPendingProject] = useState<PendingProject | null>(null)

  // NOTE: All callbacks read hasProject() fresh from the store inside the function,
  // NOT from a closure. This avoids stale state from useMemo/useCallback deps.

  const openProject = useCallback(async () => {
    if (!hasProject()) {
      clearCurrentProjectUI()
      const success = await useProjectStore.getState().openProject()
      if (success) registerCurrentAsProject()
      return
    }

    // Already have a project — pick directory first, then show dialog
    const path = await pickDirectory()
    if (!path) return // user cancelled

    const name = path.split('/').pop() || path
    setPendingProject({ path, name })
    setShowAttachDialog(true)
  }, [])

  const newProject = useCallback(async () => {
    if (!hasProject()) {
      clearCurrentProjectUI()
      const success = await useProjectStore.getState().newProject()
      if (success) registerCurrentAsProject()
      return
    }

    // Already have a project — pick directory first, then show dialog
    const path = await pickDirectory()
    if (!path) return // user cancelled

    const name = path.split('/').pop() || path
    setPendingProject({ path, name })
    setShowAttachDialog(true)
  }, [])

  const openProjectAtPath = useCallback(async (path: string) => {
    if (!hasProject()) {
      clearCurrentProjectUI()
      const success = await useProjectStore.getState().openProjectAtPath(path)
      if (success) registerCurrentAsProject()
      return
    }

    const name = path.split('/').pop() || path
    setPendingProject({ path, name })
    setShowAttachDialog(true)
  }, [])

  // User chose "Attach" — add to current workspace
  const handleAttach = useCallback(async () => {
    setShowAttachDialog(false)
    if (!pendingProject) return

    const multiStore = useMultiProjectStore.getState()
    const projectStore = useProjectStore.getState()

    // Register current project if not yet in multi-project store
    if (multiStore.projectOrder.length === 0 && projectStore.projectName) {
      registerCurrentAsProject()
    } else {
      multiStore.snapshotActiveProject()
    }

    // Clear UI and open the new project
    clearCurrentProjectUI()
    const success = await projectStore.openProjectAtPath(pendingProject.path)

    if (success) {
      const newProjectId = registerCurrentAsProject()
      const newProjectName = useProjectStore.getState().projectName || pendingProject.name
      useEditorPanelStore.getState().openCanvas(newProjectId, newProjectName)
    }

    setPendingProject(null)
  }, [pendingProject])

  // User chose "New Tab" — open in independent workspace instance
  const handleNewTab = useCallback(async () => {
    setShowAttachDialog(false)
    if (!pendingProject) return

    // Create a new instance (snapshots current, clears stores)
    useInstanceStore.getState().addInstance()

    // Open the project in the clean workspace
    await useProjectStore.getState().openProjectAtPath(pendingProject.path)
    registerCurrentAsProject()

    setPendingProject(null)
  }, [pendingProject])

  const handleCancel = useCallback(() => {
    setShowAttachDialog(false)
    setPendingProject(null)
  }, [])

  return {
    openProject,
    openProjectAtPath,
    newProject,
    showAttachDialog,
    pendingProjectName: pendingProject?.name || '',
    handleAttach,
    handleNewTab,
    handleCancel,
  }
}
