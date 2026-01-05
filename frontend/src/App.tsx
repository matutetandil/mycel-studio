import { ReactFlowProvider } from '@xyflow/react'
import Canvas from './components/Canvas/Canvas'
import Palette from './components/Palette/Palette'
import Properties from './components/Properties/Properties'
import Preview from './components/Preview/Preview'

function App() {
  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Header */}
        <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 shrink-0">
          <h1 className="text-lg font-semibold text-gray-800">Mycel Studio</h1>
        </header>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar - Palette */}
          <Palette />

          {/* Center - Canvas and Preview */}
          <div className="flex-1 flex flex-col">
            <Canvas />
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
