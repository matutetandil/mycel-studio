import { useState } from 'react'
import {
  Globe,
  Database,
  MessageSquare,
  Zap,
  Server,
  Hexagon,
  Folder,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  FileCode,
  RefreshCw,
  Cloud,
  Terminal,
  Network,
} from 'lucide-react'
import type { ConnectorType } from '../../types'

interface PaletteCategory {
  name: string
  items: PaletteItem[]
}

interface PaletteItem {
  type: 'connector' | 'flow' | 'type' | 'transform'
  connectorType?: ConnectorType
  label: string
  icon: React.ElementType
  color: string
}

const categories: PaletteCategory[] = [
  {
    name: 'Connectors',
    items: [
      { type: 'connector', connectorType: 'rest', label: 'REST API', icon: Globe, color: 'bg-blue-500' },
      { type: 'connector', connectorType: 'database', label: 'Database', icon: Database, color: 'bg-green-500' },
      { type: 'connector', connectorType: 'queue', label: 'Message Queue', icon: MessageSquare, color: 'bg-orange-500' },
      { type: 'connector', connectorType: 'cache', label: 'Cache', icon: Zap, color: 'bg-yellow-500' },
      { type: 'connector', connectorType: 'grpc', label: 'gRPC', icon: Server, color: 'bg-purple-500' },
      { type: 'connector', connectorType: 'graphql', label: 'GraphQL', icon: Hexagon, color: 'bg-pink-500' },
      { type: 'connector', connectorType: 'tcp', label: 'TCP', icon: Network, color: 'bg-cyan-600' },
      { type: 'connector', connectorType: 'file', label: 'File Storage', icon: Folder, color: 'bg-neutral-500' },
      { type: 'connector', connectorType: 's3', label: 'S3 Storage', icon: Cloud, color: 'bg-amber-600' },
      { type: 'connector', connectorType: 'exec', label: 'Exec/Script', icon: Terminal, color: 'bg-slate-600' },
    ],
  },
  {
    name: 'Logic',
    items: [
      { type: 'flow', label: 'Flow', icon: ArrowRight, color: 'bg-indigo-500' },
    ],
  },
  {
    name: 'Schema',
    items: [
      { type: 'type', label: 'Type', icon: FileCode, color: 'bg-cyan-500' },
      { type: 'transform', label: 'Transform', icon: RefreshCw, color: 'bg-amber-500' },
    ],
  },
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
            label: `New ${item.label}`,
          }

    event.dataTransfer.setData('application/mycel-node-type', item.type)
    event.dataTransfer.setData('application/mycel-node-data', JSON.stringify(nodeData))
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 px-2 py-1.5 rounded cursor-grab hover:bg-neutral-800 active:cursor-grabbing transition-colors"
    >
      <div className={`p-1 rounded ${item.color}`}>
        <Icon className="w-3 h-3 text-white" />
      </div>
      <span className="text-xs text-neutral-300">{item.label}</span>
    </div>
  )
}

function CategorySection({ category }: { category: PaletteCategory }) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-300"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        {category.name}
      </button>
      {isExpanded && (
        <div className="pl-2">
          {category.items.map((item, index) => (
            <PaletteItem key={index} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Palette() {
  return (
    <div className="px-2">
      {categories.map((category) => (
        <CategorySection key={category.name} category={category} />
      ))}
    </div>
  )
}
