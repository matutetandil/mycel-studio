// CanvasTab renders a React Flow canvas inside an editor tab.
// In visual-first mode, the main canvas is the center area.
// In text-first mode (or when viewing canvas as a tab), this wraps Canvas
// with its own ReactFlowProvider so multiple instances can coexist.

import { ReactFlowProvider } from '@xyflow/react'
import Canvas from '../Canvas/Canvas'

interface CanvasTabProps {
  projectId: string
}

export default function CanvasTab({ projectId: _projectId }: CanvasTabProps) {
  // Each canvas tab gets its own ReactFlowProvider so React Flow instances
  // don't conflict with each other.
  // Currently, since we switch the active project in stores before rendering,
  // the Canvas reads from useStudioStore which already has the right data.
  return (
    <ReactFlowProvider>
      <div className="h-full w-full">
        <Canvas />
      </div>
    </ReactFlowProvider>
  )
}
