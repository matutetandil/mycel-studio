import { ReactFlowProvider } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useThemeStore } from './stores/useThemeStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useAutoSave } from './hooks/useAutoSave'
import { useWorkspacePersistence } from './hooks/useWorkspacePersistence'
import { useDebugSync } from './hooks/useDebugSync'
import { useNativeMenu } from './hooks/useNativeMenu'
import { useGitPolling } from './hooks/useGitPolling'
import { useFileToCanvasSync } from './hooks/useFileToCanvasSync'
import { useCanvasToFileSync } from './hooks/useCanvasToFileSync'
import { useAppLifecycle } from './hooks/useAppLifecycle'
import { useMultiProjectPersistence } from './hooks/useMultiProjectPersistence'
import { useUpdateManager } from './hooks/useUpdateManager'
import { isWailsRuntime } from './lib/api'
import MenuBar from './components/MenuBar/MenuBar'
import Sidebar from './components/Sidebar/Sidebar'
import CanvasPanel from './components/Canvas/CanvasPanel'
import Properties from './components/Properties/Properties'
import EditorPanel from './components/EditorPanel'
import ShortcutsDialog from './components/ShortcutsDialog'
import TemplateGallery from './components/TemplateGallery'
import AboutDialog from './components/AboutDialog'
import SettingsDialog from './components/SettingsDialog'
import StatusBar from './components/StatusBar'
import NotificationToast from './components/NotificationToast'
import NotificationPopup from './components/NotificationPopup'
import WhatsNewDialog from './components/WhatsNewDialog'
import AttachDialog from './components/AttachDialog'
import InstanceTabBar from './components/InstanceTabs/InstanceTabBar'
import { useProjectStore } from './stores/useProjectStore'
import { useStudioStore } from './stores/useStudioStore'
import { useEditorPanelStore } from './stores/useEditorPanelStore'
import { useLayoutStore } from './stores/useLayoutStore'
import { useInstanceStore } from './stores/useInstanceStore'
import { useProjectOpen } from './hooks/useProjectOpen'
import EditorPanelComponent from './components/EditorPanel/EditorPanel'
import EditorGroupView from './components/EditorPanel/EditorGroup'

// Main editor area for text-first mode — renders EditorGroupView with splits
function MainEditorArea() {
  const { groups, splitDirection, splitRatio } = useEditorPanelStore()
  const [isSplitResizing, setIsSplitResizing] = useState(false)

  const handleSplitResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsSplitResizing(true)

    const container = (e.target as HTMLElement).parentElement
    if (!container) return

    const containerSize = splitDirection === 'horizontal'
      ? container.clientWidth
      : container.clientHeight

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = splitDirection === 'horizontal' ? e.clientX : e.clientY
      const rect = container.getBoundingClientRect()
      const offset = splitDirection === 'horizontal'
        ? currentPos - rect.left
        : currentPos - rect.top
      const ratio = Math.max(0.2, Math.min(0.8, offset / containerSize))
      useEditorPanelStore.setState({ splitRatio: ratio })
    }

    const handleMouseUp = () => {
      setIsSplitResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [splitDirection])

  return (
    <div
      className={`h-full ${
        splitDirection === 'horizontal' ? 'flex flex-row' :
        splitDirection === 'vertical' ? 'flex flex-col' :
        ''
      } ${isSplitResizing ? 'select-none' : ''}`}
    >
      {/* Main group */}
      <div
        style={splitDirection ? { flexBasis: `${splitRatio * 100}%` } : undefined}
        className={splitDirection ? 'min-w-0 min-h-0 overflow-hidden' : 'h-full'}
      >
        <EditorGroupView groupId={groups[0]?.id || 'main'} />
      </div>

      {/* Split resize handle */}
      {splitDirection && groups.length > 1 && (
        <div
          className={`shrink-0 hover:bg-indigo-500/50 transition-colors ${
            splitDirection === 'horizontal'
              ? 'w-1 cursor-ew-resize bg-neutral-800'
              : 'h-1 cursor-ns-resize bg-neutral-800'
          } ${isSplitResizing ? 'bg-indigo-500/50' : ''}`}
          onMouseDown={handleSplitResizeMouseDown}
        />
      )}

      {/* Secondary group */}
      {splitDirection && groups.length > 1 && (
        <div
          style={{ flexBasis: `${(1 - splitRatio) * 100}%` }}
          className="min-w-0 min-h-0 overflow-hidden"
        >
          <EditorGroupView groupId={groups[1].id} isSecondary />
        </div>
      )}
    </div>
  )
}

function AppInner() {
  const { theme, toggleTheme } = useThemeStore()
  const { showShortcuts, setShowShortcuts, showTemplates, setShowTemplates, showSettings, setShowSettings } = useKeyboardShortcuts()
  const [showAbout, setShowAbout] = useState(false)
  const { saveProject, closeProject } = useProjectStore()
  const { undo, redo, duplicateNode } = useStudioStore()
  const { toggleCollapse } = useEditorPanelStore()
  const viewMode = useLayoutStore((s) => s.viewMode)
  const instanceCount = useInstanceStore(s => s.instances.length)
  const projectOpen = useProjectOpen()
  useAutoSave()
  useWorkspacePersistence()
  useDebugSync()
  useGitPolling()
  useFileToCanvasSync()
  useCanvasToFileSync()
  useAppLifecycle()
  useMultiProjectPersistence()

  const updateManager = useUpdateManager()

  const isDesktop = isWailsRuntime()

  // Native macOS menu event handlers
  const menuCallbacks = useMemo(() => ({
    onNewProject: () => projectOpen.newProject(),
    onNewTemplate: () => setShowTemplates(true),
    onOpenProject: () => projectOpen.openProject(),
    onAttachProject: () => projectOpen.openProject(),
    onSaveProject: () => saveProject(),
    onCloseProject: () => closeProject(),
    onUndo: () => undo(),
    onRedo: () => redo(),
    onDuplicate: () => duplicateNode(),
    onSetViewMode: (mode: string) => { if (mode === 'visual-first' || mode === 'text-first') useLayoutStore.getState().setViewMode(mode) },
    onToggleTheme: () => toggleTheme(),
    onToggleEditor: () => toggleCollapse(),
    onToggleTerminal: () => EditorPanelComponent.switchToTerminal(),
    onShowShortcuts: () => setShowShortcuts(true),
    onShowSettings: () => setShowSettings(true),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])
  useNativeMenu(menuCallbacks)

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
  }, [theme])

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'bg-neutral-950 text-white' : 'bg-white text-gray-900'}`}>
      {/* Menu Bar — only shown in browser/Docker mode */}
      {/* Instance tab bar — shown when there are multiple workspace instances */}
      {instanceCount > 1 && <InstanceTabBar />}

      {/* Menu Bar — only shown in browser/Docker mode */}
      {!isDesktop && (
        <MenuBar
          onShowShortcuts={() => setShowShortcuts(true)}
          onShowTemplates={() => setShowTemplates(true)}
          onShowAbout={() => setShowAbout(true)}
          onShowSettings={() => setShowSettings(true)}
          onNewProject={() => projectOpen.newProject()}
          onOpenProject={() => projectOpen.openProject()}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - File Tree + Palette */}
        <Sidebar />

        {/* Center - Canvas and Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main area */}
          <div className="flex-1 min-h-0">
            {viewMode === 'visual-first' ? <CanvasPanel /> : <MainEditorArea />}
          </div>
          {/* Bottom panel (always) */}
          <EditorPanel />
        </div>

        {/* Right sidebar - Properties */}
        <Properties />
      </div>

      {/* Status Bar */}
      <StatusBar
        downloadProgress={updateManager.downloadProgress}
        isDownloading={updateManager.isDownloading}
        updateReady={updateManager.updateReady}
        updateVersion={updateManager.updateInfo?.latestVersion}
      />

      {/* Notification system */}
      <NotificationToast />
      <NotificationPopup />

      {/* Dialogs */}
      <ShortcutsDialog isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <TemplateGallery isOpen={showTemplates} onClose={() => setShowTemplates(false)} />
      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <WhatsNewDialog
        isOpen={updateManager.whatsNewOpen}
        onClose={() => updateManager.setWhatsNewOpen(false)}
        version={updateManager.updateInfo?.latestVersion ?? ''}
        releaseNotes={updateManager.updateInfo?.releaseNotes ?? ''}
        onRestartNow={updateManager.updateReady ? async () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updater = (window as any).go?.main?.Updater
          await updater?.RestartApp()
        } : undefined}
      />
      <AttachDialog
        isOpen={projectOpen.showAttachDialog}
        projectName="the selected project"
        onAttach={projectOpen.handleAttach}
        onNewTab={projectOpen.handleNewTab}
        onCancel={projectOpen.handleCancel}
      />
    </div>
  )
}

function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  )
}

export default App
