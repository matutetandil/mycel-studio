import { useCallback } from 'react'
import {
  RefreshCw,
  Database,
  Link,
  Lock,
  Gauge,
  MessageSquare,
  AlertTriangle,
  X,
} from 'lucide-react'
import type { FlowNodeData } from '../../types'

interface FlowContextMenuProps {
  position: { x: number; y: number }
  flowData: FlowNodeData
  onClose: () => void
  onAddTransform: () => void
  onAddCache: () => void
  onAddEnrich: () => void
  onAddLock: () => void
  onAddSemaphore: () => void
  onAddResponse: () => void
  onAddErrorHandling: () => void
}

interface MenuItemProps {
  icon: React.ElementType
  label: string
  description: string
  onClick: () => void
  active?: boolean
  color?: string
}

function MenuItem({ icon: Icon, label, description, onClick, active, color = 'text-neutral-400' }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-start gap-3 px-3 py-2 text-left rounded-md transition-colors
        ${active ? 'bg-indigo-600/20 border border-indigo-500/50' : 'hover:bg-neutral-700'}
      `}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-indigo-400' : color}`} />
      <div>
        <div className={`text-sm font-medium ${active ? 'text-indigo-300' : 'text-neutral-200'}`}>
          {label}
          {active && <span className="ml-2 text-xs text-indigo-400">(configured)</span>}
        </div>
        <div className="text-xs text-neutral-500">{description}</div>
      </div>
    </button>
  )
}

export default function FlowContextMenu({
  position,
  flowData,
  onClose,
  onAddTransform,
  onAddCache,
  onAddEnrich,
  onAddLock,
  onAddSemaphore,
  onAddResponse,
  onAddErrorHandling,
}: FlowContextMenuProps) {
  const hasTransform = flowData.transform && Object.keys(flowData.transform.fields || {}).length > 0
  const hasCache = !!flowData.cache
  const hasEnrich = flowData.enrich && flowData.enrich.length > 0
  const hasLock = !!flowData.lock
  const hasSemaphore = !!flowData.semaphore
  const hasErrorHandling = !!flowData.errorHandling

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="absolute bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl p-2 min-w-[280px]"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700 mb-2">
          <span className="text-sm font-medium text-neutral-300">Add to Flow</span>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <MenuItem
            icon={RefreshCw}
            label="Transform"
            description="Map and transform data with CEL expressions"
            onClick={onAddTransform}
            active={hasTransform}
            color="text-amber-400"
          />
          <MenuItem
            icon={Database}
            label="Cache"
            description="Cache responses to improve performance"
            onClick={onAddCache}
            active={hasCache}
            color="text-cyan-400"
          />
          <MenuItem
            icon={Link}
            label="Enrich"
            description="Fetch additional data from another connector"
            onClick={onAddEnrich}
            active={hasEnrich}
            color="text-purple-400"
          />

          <div className="border-t border-neutral-700 my-2" />

          <MenuItem
            icon={Lock}
            label="Lock (Mutex)"
            description="Ensure only one execution at a time"
            onClick={onAddLock}
            active={hasLock}
            color="text-yellow-400"
          />
          <MenuItem
            icon={Gauge}
            label="Semaphore"
            description="Limit concurrent executions"
            onClick={onAddSemaphore}
            active={hasSemaphore}
            color="text-orange-400"
          />

          <div className="border-t border-neutral-700 my-2" />

          <MenuItem
            icon={MessageSquare}
            label="Response"
            description="Configure HTTP response (status, body)"
            onClick={onAddResponse}
            color="text-green-400"
          />
          <MenuItem
            icon={AlertTriangle}
            label="Error Handling"
            description="Retry, DLQ, and error configuration"
            onClick={onAddErrorHandling}
            active={hasErrorHandling}
            color="text-red-400"
          />
        </div>
      </div>
    </div>
  )
}
