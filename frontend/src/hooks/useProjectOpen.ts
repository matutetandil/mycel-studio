// Hook that manages the project open/attach/new-tab flow.
// When a project is already open and the user opens another,
// shows the Attach/New Tab dialog and routes accordingly.

import { useState, useCallback } from 'react'
import { useProjectStore } from '../stores/useProjectStore'
import { useMultiProjectStore, registerCurrentAsProject } from '../stores/useMultiProjectStore'
import { useInstanceStore } from '../stores/useInstanceStore'
import { useEditorPanelStore } from '../stores/useEditorPanelStore'

export type AttachMode = 'attach' | 'new-tab'

interface PendingOpen {
  type: 'open' | 'new'
  path?: string // for openProjectAtPath
}

export function useProjectOpen() {
  const [showAttachDialog, setShowAttachDialog] = useState(false)
  const [pendingOpen, setPendingOpen] = useState<PendingOpen | null>(null)

  const hasExistingProject = useProjectStore(s => !!s.projectName)

  // Execute the actual open/new after dialog choice
  const executeOpen = useCallback(async (pending: PendingOpen, mode: AttachMode) => {
    const projectStore = useProjectStore.getState()
    const multiStore = useMultiProjectStore.getState()
    const instanceStore = useInstanceStore.getState()

    if (mode === 'new-tab') {
      // Create a new instance tab, then open the project there
      instanceStore.addInstance()
      // Now we're in a clean workspace — proceed with normal open
      if (pending.type === 'new') {
        await projectStore.newProject()
      } else if (pending.path) {
        await projectStore.openProjectAtPath(pending.path)
      } else {
        await projectStore.openProject()
      }
      // Register as first project in this instance
      registerCurrentAsProject()
      return
    }

    // Attach mode: save current project to multi-project store, then open new one
    // Ensure current project is registered
    if (multiStore.projectOrder.length === 0 && projectStore.projectName) {
      registerCurrentAsProject()
    } else {
      // Snapshot the currently active project before opening new one
      multiStore.snapshotActiveProject()
    }

    // Open the new project (this replaces the live stores)
    let success = false
    if (pending.type === 'new') {
      success = await projectStore.newProject()
    } else if (pending.path) {
      success = await projectStore.openProjectAtPath(pending.path)
    } else {
      success = await projectStore.openProject()
    }

    if (success) {
      // Register the newly opened project
      const newProjectId = registerCurrentAsProject()

      // Open a canvas tab for the new project
      const newProjectName = projectStore.projectName || 'Project'
      useEditorPanelStore.getState().openCanvas(newProjectId, newProjectName)
    }
  }, [])

  const openProject = useCallback(async () => {
    if (hasExistingProject) {
      setPendingOpen({ type: 'open' })
      setShowAttachDialog(true)
    } else {
      await useProjectStore.getState().openProject()
      registerCurrentAsProject()
    }
  }, [hasExistingProject])

  const openProjectAtPath = useCallback(async (path: string) => {
    if (hasExistingProject) {
      setPendingOpen({ type: 'open', path })
      setShowAttachDialog(true)
    } else {
      await useProjectStore.getState().openProjectAtPath(path)
      registerCurrentAsProject()
    }
  }, [hasExistingProject])

  const newProject = useCallback(async () => {
    if (hasExistingProject) {
      setPendingOpen({ type: 'new' })
      setShowAttachDialog(true)
    } else {
      await useProjectStore.getState().newProject()
      registerCurrentAsProject()
    }
  }, [hasExistingProject])

  const handleAttach = useCallback(async () => {
    setShowAttachDialog(false)
    if (pendingOpen) {
      await executeOpen(pendingOpen, 'attach')
      setPendingOpen(null)
    }
  }, [pendingOpen, executeOpen])

  const handleNewTab = useCallback(async () => {
    setShowAttachDialog(false)
    if (pendingOpen) {
      await executeOpen(pendingOpen, 'new-tab')
      setPendingOpen(null)
    }
  }, [pendingOpen, executeOpen])

  const handleCancel = useCallback(() => {
    setShowAttachDialog(false)
    setPendingOpen(null)
  }, [])

  return {
    openProject,
    openProjectAtPath,
    newProject,
    showAttachDialog,
    handleAttach,
    handleNewTab,
    handleCancel,
  }
}
