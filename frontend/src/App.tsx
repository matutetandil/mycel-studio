import { ReactFlowProvider } from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'
import { useThemeStore } from './stores/useThemeStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useAutoSave } from './hooks/useAutoSave'
import { useWorkspacePersistence } from './hooks/useWorkspacePersistence'
import { useDebugSync } from './hooks/useDebugSync'
import { useNativeMenu } from './hooks/useNativeMenu'
import { useGitPolling } from './hooks/useGitPolling'
import { isWailsRuntime } from './lib/api'
import MenuBar from './components/MenuBar/MenuBar'
import Sidebar from './components/Sidebar/Sidebar'
import Canvas from './components/Canvas/Canvas'
import Properties from './components/Properties/Properties'
import EditorPanel from './components/EditorPanel'
import ShortcutsDialog from './components/ShortcutsDialog'
import TemplateGallery from './components/TemplateGallery'
import AboutDialog from './components/AboutDialog'
import StatusBar from './components/StatusBar'
import { useProjectStore } from './stores/useProjectStore'
import { useStudioStore } from './stores/useStudioStore'
import { useEditorPanelStore } from './stores/useEditorPanelStore'
import EditorPanelComponent from './components/EditorPanel/EditorPanel'

function AppInner() {
  const { theme, toggleTheme } = useThemeStore()
  const { showShortcuts, setShowShortcuts, showTemplates, setShowTemplates } = useKeyboardShortcuts()
  const [showAbout, setShowAbout] = useState(false)
  const { newProject, openProject, saveProject, closeProject } = useProjectStore()
  const { undo, redo, duplicateNode } = useStudioStore()
  const { toggleCollapse } = useEditorPanelStore()
  useAutoSave()
  useWorkspacePersistence()
  useDebugSync()
  useGitPolling()

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
    onToggleTheme: () => toggleTheme(),
    onToggleEditor: () => toggleCollapse(),
    onToggleTerminal: () => EditorPanelComponent.switchToTerminal(),
    onShowShortcuts: () => setShowShortcuts(true),
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
        />
      )}

      {/* No title bar spacer needed — native macOS title bar handles it */}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - File Tree + Palette */}
        <Sidebar />

        {/* Center - Canvas and Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas area */}
          <div className="flex-1 min-h-0">
            <Canvas />
          </div>

          {/* Editor panel with tabs, split, resize */}
          <EditorPanel />
        </div>

        {/* Right sidebar - Properties */}
        <Properties />
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Dialogs */}
      <ShortcutsDialog isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <TemplateGallery isOpen={showTemplates} onClose={() => setShowTemplates(false)} />
      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
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
