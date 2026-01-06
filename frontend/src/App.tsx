import { ReactFlowProvider } from '@xyflow/react'
import { useEffect } from 'react'
import { useThemeStore } from './stores/useThemeStore'
import MenuBar from './components/MenuBar/MenuBar'
import Sidebar from './components/Sidebar/Sidebar'
import Canvas from './components/Canvas/Canvas'
import Properties from './components/Properties/Properties'
import Preview from './components/Preview/Preview'

function App() {
  const { theme } = useThemeStore()

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
  }, [theme])

  return (
    <ReactFlowProvider>
      <div className={`h-screen flex flex-col ${theme === 'dark' ? 'bg-neutral-950 text-white' : 'bg-white text-gray-900'}`}>
        {/* Menu Bar */}
        <MenuBar />

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

            {/* Preview area - shows generated HCL */}
            <Preview />
          </div>

          {/* Right sidebar - Properties */}
          <Properties />
        </div>
      </div>
    </ReactFlowProvider>
  )
}

export default App
