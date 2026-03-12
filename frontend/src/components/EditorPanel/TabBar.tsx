import { useState, useRef } from 'react'
import { X, FileCode, Columns2, Rows2, Copy, Check, Download, XCircle } from 'lucide-react'
import { useEditorPanelStore, type EditorTab } from '../../stores/useEditorPanelStore'
import { useStudioStore } from '../../stores/useStudioStore'
import { toIdentifier } from '../../utils/hclGenerator'
import type { ConnectorNodeData } from '../../types'

interface TabBarProps {
  groupId: string
  tabs: EditorTab[]
  activeTabId: string | null
  isSecondary?: boolean
  onCopy: () => void
  onDownloadZip: () => void
  copied: boolean
}

// Map a file path to the corresponding canvas node
function selectNodeForFile(filePath: string) {
  const { nodes, selectNode } = useStudioStore.getState()

  // connectors/{name}.hcl → find connector with that identifier
  const connectorMatch = filePath.match(/^connectors\/(.+)\.hcl$/)
  if (connectorMatch) {
    const identifier = connectorMatch[1]
    const node = nodes.find(n => {
      if (n.type !== 'connector') return false
      const data = n.data as ConnectorNodeData
      return toIdentifier(data.label) === identifier
    })
    if (node) { selectNode(node.id); return }
  }

  // Shared files → select first node of that type
  const typeMap: Record<string, string> = {
    'flows/flows.hcl': 'flow',
    'types/types.hcl': 'type',
    'validators/validators.hcl': 'validator',
    'transforms/transforms.hcl': 'transform',
    'aspects/aspects.hcl': 'aspect',
    'sagas/sagas.hcl': 'saga',
    'machines/machines.hcl': 'state_machine',
  }

  const nodeType = typeMap[filePath]
  if (nodeType) {
    const node = nodes.find(n => n.type === nodeType)
    if (node) { selectNode(node.id); return }
  }

  // config.hcl, auth, security, plugins, env files → deselect (show ServiceProperties)
  selectNode(null)
}

export default function TabBar({ groupId, tabs, activeTabId, isSecondary, onCopy, onDownloadZip, copied }: TabBarProps) {
  const { setActiveTab, closeTab, reorderTab, moveTabToGroup, splitEditor, closeSplit } = useEditorPanelStore()
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragSourceRef = useRef<{ groupId: string; index: number } | null>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragSourceRef.current = { groupId, index }
    e.dataTransfer.setData('text/plain', JSON.stringify({ groupId, index }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (data.groupId === groupId) {
        reorderTab(groupId, data.index, toIndex)
      } else {
        const sourceGroup = useEditorPanelStore.getState().groups.find(g => g.id === data.groupId)
        const tab = sourceGroup?.tabs[data.index]
        if (tab) {
          moveTabToGroup(data.groupId, tab.id, groupId)
        }
      }
    } catch {
      // ignore
    }
    dragSourceRef.current = null
  }

  const handleSplit = (direction: 'horizontal' | 'vertical') => {
    splitEditor(direction)
  }

  return (
    <div className="flex items-center bg-neutral-900 border-b border-neutral-800 min-h-[33px]">
      {/* Tabs */}
      <div className="flex-1 flex items-center overflow-x-auto">
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => { setActiveTab(groupId, tab.id); selectNodeForFile(tab.filePath) }}
            className={`
              group flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-neutral-800 cursor-pointer shrink-0 select-none
              ${activeTabId === tab.id
                ? 'bg-neutral-800 text-white border-b-2 border-b-indigo-500'
                : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-850 hover:text-neutral-300'}
              ${dragOverIndex === index ? 'border-l-2 border-l-indigo-500' : ''}
            `}
          >
            <FileCode className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="max-w-32 truncate">{tab.fileName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTab(groupId, tab.id)
              }}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-700 shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 px-2 shrink-0">
        {activeTabId && (
          <>
            <button
              onClick={onCopy}
              className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
              title="Copy file content"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onDownloadZip}
              className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
              title="Download all files as ZIP"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {!isSecondary && tabs.length > 0 && (
          <>
            <button
              onClick={() => handleSplit('horizontal')}
              className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
              title="Split right"
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSplit('vertical')}
              className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
              title="Split down"
            >
              <Rows2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {isSecondary && (
          <button
            onClick={() => closeSplit(groupId)}
            className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
            title="Close split"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
