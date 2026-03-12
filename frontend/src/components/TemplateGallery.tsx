import { X, Layout, Zap, Radio, Building2 } from 'lucide-react'
import { templates, categoryLabels, type ProjectTemplate } from '../utils/templates'
import { useStudioStore } from '../stores/useStudioStore'

const categoryIcons: Record<string, typeof Layout> = {
  basic: Layout,
  messaging: Zap,
  realtime: Radio,
  enterprise: Building2,
}

interface TemplateGalleryProps {
  isOpen: boolean
  onClose: () => void
}

export default function TemplateGallery({ isOpen, onClose }: TemplateGalleryProps) {
  const { loadTemplate } = useStudioStore()

  if (!isOpen) return null

  const handleSelect = (template: ProjectTemplate) => {
    loadTemplate(template.nodes, template.edges)
    onClose()
  }

  const grouped = templates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {} as Record<string, ProjectTemplate[]>)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <h2 className="text-sm font-medium">New from Template</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-5">
          {Object.entries(grouped).map(([category, items]) => {
            const Icon = categoryIcons[category] || Layout
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    {categoryLabels[category] || category}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {items.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleSelect(template)}
                      className="text-left p-3 rounded-lg border border-neutral-700 hover:border-indigo-500 hover:bg-neutral-800/50 transition-colors"
                    >
                      <div className="text-sm font-medium text-neutral-200">{template.name}</div>
                      <div className="text-xs text-neutral-500 mt-1">{template.description}</div>
                      <div className="text-xs text-neutral-600 mt-2">
                        {template.nodes.length} nodes, {template.edges.length} edges
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
