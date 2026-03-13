import { memo } from 'react'
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

const whenStrokeColors: Record<string, string> = {
  before: '#0ea5e9',   // sky-500
  after: '#22c55e',    // green-500
  around: '#a855f7',   // purple-500
  on_error: '#ef4444', // red-500
}

function AspectEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props
  const when = (data as { when?: string })?.when || 'before'
  const stroke = whenStrokeColors[when] || '#6b7280'

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  })

  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke,
        strokeWidth: 1.5,
        strokeDasharray: '6 4',
        opacity: 0.6,
      }}
    />
  )
}

export default memo(AspectEdge)
