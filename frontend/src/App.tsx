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
import { useUpdateManager } from './hooks/useUpdateManager'
import { isWailsRuntime } from './lib/api'
import MenuBar from './components/MenuBar/MenuBar'
import Sidebar from './components/Sidebar/Sidebar'
import Canvas from './components/Canvas/Canvas'
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
import { useProjectStore } from './stores/useProjectStore'
import { useStudioStore } from './stores/useStudioStore'
import { useEditorPanelStore } from './stores/useEditorPanelStore'
import { useLayoutStore } from './stores/useLayoutStore'
import EditorPanelComponent from './components/EditorPanel/EditorPanel'

function CanvasPreview() {
  const { panelHeight, isCollapsed, setPanelHeight } = useEditorPanelStore()
  const [isResizing, setIsResizing] = useState(false)

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    const startY = e.clientY
    const startHeight = panelHeight

    const handleMouseMove = (e: MouseEvent) => {
      // Inverted: dragging up increases canvas height
      const delta = startY - e.clientY
      setPanelHeight(startHeight + delta)
    }
    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [panelHeight, setPanelHeight])

  return (
    <div className="flex-shrink-0 relative">
      <div
        className={`h-1 cursor-ns-resize hover:bg-indigo-500/50 transition-colors ${isResizing ? 'bg-indigo-500/50' : 'bg-neutral-800'}`}
        onMouseDown={!isCollapsed ? handleResizeMouseDown : undefined}
      />
      <div
        style={{ height: isCollapsed ? 0 : panelHeight }}
        className={`border-t border-neutral-800 overflow-hidden ${isResizing ? 'select-none' : ''}`}
      >
        <Canvas />
      </div>
    </div>
  )
}

function AppInner() {
  const { theme, toggleTheme } = useThemeStore()
  const { showShortcuts, setShowShortcuts, showTemplates, setShowTemplates, showSettings, setShowSettings } = useKeyboardShortcuts()
  const [showAbout, setShowAbout] = useState(false)
  const { newProject, openProject, saveProject, closeProject } = useProjectStore()
  const { undo, redo, duplicateNode } = useStudioStore()
  const { toggleCollapse } = useEditorPanelStore()
  const viewMode = useLayoutStore((s) => s.viewMode)
  const toggleViewMode = useLayoutStore((s) => s.toggleViewMode)
  useAutoSave()
  useWorkspacePersistence()
  useDebugSync()
  useGitPolling()
  useFileToCanvasSync()
  useCanvasToFileSync()
  useAppLifecycle()

  const updateManager = useUpdateManager()

  const isDesktop = isWailsRuntime()

  // Native macOS menu event handlers
  const menuCallbacks = useMemo(() => ({
    onNewProject: () => newProject(),
    onNewTemplate: () => setShowTemplates(true),
    onOpenProject: () => openProject(),
    onSaveProject: () => saveProject(),
    onCloseProject: () => closeProject(),
    onUndo: () => undo(),
    onRedo: () => redo(),
    onDuplicate: () => duplicateNode(),
    onToggleViewMode: () => toggleViewMode(),
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
      {!isDesktop && (
        <MenuBar
          onShowShortcuts={() => setShowShortcuts(true)}
          onShowTemplates={() => setShowTemplates(true)}
          onShowAbout={() => setShowAbout(true)}
          onShowSettings={() => setShowSettings(true)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - File Tree + Palette */}
        <Sidebar />

        {/* Center - Canvas and Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {viewMode === 'visual-first' ? (
            <>
              {/* Canvas area (main) */}
              <div className="flex-1 min-h-0">
                <Canvas />
              </div>
              {/* Editor panel (bottom) */}
              <EditorPanel />
            </>
          ) : (
            <>
              {/* Editor panel (main) */}
              <EditorPanel isMain />
              {/* Canvas preview (bottom, resizable via EditorPanel height) */}
              <CanvasPreview />
            </>
          )}
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
        onUpdateNow={updateManager.updateInfo ? () => {
          // Trigger download via the update manager's event system
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updater = (window as any).go?.main?.Updater
          if (updater && updateManager.updateInfo) {
            updater.DownloadAndInstall(
              updateManager.updateInfo.assetURL,
              updateManager.updateInfo.checksumURL,
              updateManager.updateInfo.assetName
            )
          }
        } : undefined}
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
