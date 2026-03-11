import { useState } from 'react'
import {
  ArrowRight,
  ChevronRight,
  ChevronDown,
  FileCode,
  RefreshCw,
} from 'lucide-react'
import { type ConnectorType, DEFAULT_CONNECTOR_DIRECTIONS } from '../../types'
import { getConnectorsByCategory, type ConnectorDefinition } from '../../connectors'

interface PaletteItem {
  type: 'connector' | 'flow' | 'type' | 'transform'
  connectorType?: ConnectorType
  label: string
  icon: React.ElementType
  color: string
}

function PaletteItemView({ item }: { item: PaletteItem }) {
  const Icon = item.icon

  const onDragStart = (event: React.DragEvent) => {
    const nodeData =
      item.type === 'connector' && item.connectorType
        ? {
            label: item.label,
            connectorType: item.connectorType,
            direction: DEFAULT_CONNECTOR_DIRECTIONS[item.connectorType!],
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

function CategorySection({ name, items }: { name: string; items: PaletteItem[] }) {
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
        {name}
      </button>
      {isExpanded && (
        <div className="pl-2">
          {items.map((item, index) => (
            <PaletteItemView key={index} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

// Convert connector definitions to palette items
function connectorToItem(def: ConnectorDefinition): PaletteItem {
  return {
    type: 'connector',
    connectorType: def.type as ConnectorType,
    label: def.label,
    icon: def.icon,
    color: def.color,
  }
}

// Build categories from registry
function buildCategories(): Array<{ name: string; items: PaletteItem[] }> {
  const groups = getConnectorsByCategory()

  const categories: Array<{ name: string; items: PaletteItem[] }> = groups.map(g => ({
    name: g.category,
    items: g.connectors.map(connectorToItem),
  }))

  // Add non-connector categories
  categories.push({
    name: 'Logic',
    items: [
      { type: 'flow', label: 'Flow', icon: ArrowRight, color: 'bg-indigo-500' },
    ],
  })

  categories.push({
    name: 'Schema',
    items: [
      { type: 'type', label: 'Type', icon: FileCode, color: 'bg-cyan-500' },
      { type: 'transform', label: 'Transform', icon: RefreshCw, color: 'bg-amber-500' },
    ],
  })

  return categories
}

const categories = buildCategories()

export default function Palette() {
  return (
    <div className="px-2">
      {categories.map((category) => (
        <CategorySection key={category.name} name={category.name} items={category.items} />
      ))}
    </div>
  )
}
