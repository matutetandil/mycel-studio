import { useCallback } from 'react'
import { X } from 'lucide-react'
import { getFlowBlocksByGroup } from '../../flow-blocks'
import type { FlowNodeData } from '../../types'

interface FlowContextMenuProps {
  position: { x: number; y: number }
  flowData: FlowNodeData
  onClose: () => void
  onSelectBlock: (blockKey: string) => void
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
  onSelectBlock,
}: FlowContextMenuProps) {
  const groups = getFlowBlocksByGroup()

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
          {groups.map((group, gi) => (
            <div key={group.group}>
              {gi > 0 && <div className="border-t border-neutral-700 my-2" />}
              {group.blocks.map(block => (
                <MenuItem
                  key={block.key}
                  icon={block.icon}
                  label={block.label}
                  description={block.menuDescription}
                  onClick={() => {
                    onClose()
                    onSelectBlock(block.key)
                  }}
                  active={block.isActive(flowData)}
                  color={block.color}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
