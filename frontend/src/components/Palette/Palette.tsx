import { useState, useMemo } from 'react'
import {
  ArrowRight,
  ChevronRight,
  ChevronDown,
  FileCode,
  ShieldCheck,
  RefreshCw,
  Eye,
  GitBranch,
  CircleDot,
  Search,
} from 'lucide-react'
import { type ConnectorType, DEFAULT_CONNECTOR_DIRECTIONS } from '../../types'
import { getConnectorsByCategory, type ConnectorDefinition } from '../../connectors'

interface PaletteItem {
  type: 'connector' | 'flow' | 'type' | 'validator' | 'transform' | 'aspect' | 'saga' | 'state_machine'
  connectorType?: ConnectorType
  label: string
  icon: React.ElementType
  color: string
}

function PaletteItemView({ item }: { item: PaletteItem }) {
  const Icon = item.icon

  const onDragStart = (event: React.DragEvent) => {
    let nodeData: Record<string, unknown>

    if (item.type === 'connector' && item.connectorType) {
      nodeData = {
        label: item.label,
        connectorType: item.connectorType,
        direction: DEFAULT_CONNECTOR_DIRECTIONS[item.connectorType!],
        config: { type: item.connectorType },
      }
    } else if (item.type === 'type') {
      nodeData = { label: `New ${item.label}`, fields: {} }
    } else if (item.type === 'validator') {
      nodeData = { label: `New ${item.label}`, validatorType: 'regex', message: '' }
    } else if (item.type === 'transform') {
      nodeData = { label: `New ${item.label}`, fields: {} }
    } else if (item.type === 'aspect') {
      nodeData = { label: `New ${item.label}`, on: [], when: 'after' }
    } else if (item.type === 'saga') {
      nodeData = { label: `New ${item.label}`, steps: [] }
    } else if (item.type === 'state_machine') {
      nodeData = { label: `New ${item.label}`, initial: '', states: [] }
    } else {
      nodeData = { label: `New ${item.label}` }
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
      { type: 'saga', label: 'Saga', icon: GitBranch, color: 'bg-rose-600' },
      { type: 'state_machine', label: 'State Machine', icon: CircleDot, color: 'bg-teal-600' },
    ],
  })

  categories.push({
    name: 'Schema',
    items: [
      { type: 'type', label: 'Type', icon: FileCode, color: 'bg-cyan-600' },
      { type: 'validator', label: 'Validator', icon: ShieldCheck, color: 'bg-purple-500' },
      { type: 'transform', label: 'Transform', icon: RefreshCw, color: 'bg-amber-600' },
      { type: 'aspect', label: 'Aspect', icon: Eye, color: 'bg-indigo-600' },
    ],
  })

  return categories
}

const categories = buildCategories()

export default function Palette() {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return categories
    const q = search.toLowerCase()
    return categories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item => item.label.toLowerCase().includes(q)),
      }))
      .filter(cat => cat.items.length > 0)
  }, [search])

  return (
    <div className="px-2">
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search components..."
          className="w-full pl-7 pr-2 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
      {filtered.map((category) => (
        <CategorySection key={category.name} name={category.name} items={category.items} />
      ))}
      {filtered.length === 0 && (
        <div className="text-xs text-neutral-500 text-center py-4">No matches</div>
      )}
    </div>
  )
}
