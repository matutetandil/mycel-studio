import {
  Globe,
  Database,
  MessageSquare,
  Zap,
  Server,
  Hexagon,
  Folder,
  ArrowRight,
} from 'lucide-react'
import type { ConnectorType } from '../../types'

interface PaletteItem {
  type: 'connector' | 'flow'
  connectorType?: ConnectorType
  label: string
  icon: React.ElementType
  color: string
}

const paletteItems: PaletteItem[] = [
  { type: 'connector', connectorType: 'rest', label: 'REST API', icon: Globe, color: 'bg-blue-500' },
  { type: 'connector', connectorType: 'database', label: 'Database', icon: Database, color: 'bg-green-500' },
  { type: 'connector', connectorType: 'mq', label: 'Message Queue', icon: MessageSquare, color: 'bg-orange-500' },
  { type: 'connector', connectorType: 'cache', label: 'Cache', icon: Zap, color: 'bg-yellow-500' },
  { type: 'connector', connectorType: 'grpc', label: 'gRPC', icon: Server, color: 'bg-purple-500' },
  { type: 'connector', connectorType: 'graphql', label: 'GraphQL', icon: Hexagon, color: 'bg-pink-500' },
  { type: 'connector', connectorType: 'file', label: 'File Storage', icon: Folder, color: 'bg-gray-500' },
  { type: 'flow', label: 'Flow', icon: ArrowRight, color: 'bg-indigo-500' },
]

function PaletteItem({ item }: { item: PaletteItem }) {
  const Icon = item.icon

  const onDragStart = (event: React.DragEvent) => {
    const nodeData =
      item.type === 'connector'
        ? {
            label: item.label,
            connectorType: item.connectorType,
            config: { type: item.connectorType },
          }
        : {
            label: 'New Flow',
          }

    event.dataTransfer.setData('application/mycel-node-type', item.type)
    event.dataTransfer.setData('application/mycel-node-data', JSON.stringify(nodeData))
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-grab hover:border-gray-300 hover:shadow-sm transition-all active:cursor-grabbing"
    >
      <div className={`p-2 rounded-lg ${item.color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <span className="text-sm font-medium text-gray-700">{item.label}</span>
    </div>
  )
}

export default function Palette() {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Components
      </h2>

      <div className="space-y-3">
        <div>
          <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Connectors</h3>
          <div className="space-y-2">
            {paletteItems
              .filter((item) => item.type === 'connector')
              .map((item) => (
                <PaletteItem key={item.connectorType} item={item} />
              ))}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Logic</h3>
          <div className="space-y-2">
            {paletteItems
              .filter((item) => item.type === 'flow')
              .map((item, index) => (
                <PaletteItem key={index} item={item} />
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
