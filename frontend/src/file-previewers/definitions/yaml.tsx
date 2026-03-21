import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import type { FilePreviewerDefinition, FilePreviewerProps } from '../types'

interface YamlNode {
  key: string
  value: string | null
  children: YamlNode[]
  indent: number
}

function parseYaml(content: string): YamlNode[] {
  const lines = content.split('\n')
  const root: YamlNode[] = []
  const stack: { nodes: YamlNode[]; indent: number }[] = [{ nodes: root, indent: -1 }]

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue

    const indent = line.search(/\S/)
    const trimmed = line.trim()

    // Pop stack to find parent at correct indent level
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) {
      // List item or bare value
      const listMatch = trimmed.match(/^-\s*(.*)/)
      if (listMatch) {
        const node: YamlNode = { key: '-', value: listMatch[1] || null, children: [], indent }
        stack[stack.length - 1].nodes.push(node)
        if (!listMatch[1]) {
          stack.push({ nodes: node.children, indent: indent + 1 })
        }
      }
      continue
    }

    const key = trimmed.slice(0, colonIdx).replace(/^-\s*/, '').trim()
    const rawValue = trimmed.slice(colonIdx + 1).trim()

    const node: YamlNode = {
      key,
      value: rawValue || null,
      children: [],
      indent,
    }

    stack[stack.length - 1].nodes.push(node)

    if (!rawValue) {
      stack.push({ nodes: node.children, indent })
    }
  }

  return root
}

function YamlTreeNode({ node, depth }: { node: YamlNode; depth: number }) {
  const [isOpen, setIsOpen] = useState(depth < 2)
  const hasChildren = node.children.length > 0

  const valueColor = (val: string) => {
    if (val === 'true' || val === 'false') return 'text-amber-400'
    if (val === 'null' || val === '~') return 'text-neutral-500'
    if (/^-?\d+(\.\d+)?$/.test(val)) return 'text-emerald-400'
    if (val.startsWith('"') || val.startsWith("'")) return 'text-sky-400'
    return 'text-sky-400'
  }

  return (
    <div>
      <div
        className={`flex items-center gap-0.5 py-0.5 ${hasChildren ? 'cursor-pointer hover:bg-neutral-800/50' : ''} rounded`}
        onClick={hasChildren ? () => setIsOpen(!isOpen) : undefined}
      >
        {hasChildren
          ? (isOpen ? <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />)
          : <span className="w-3.5 shrink-0" />}
        <span className="text-violet-400">{node.key}</span>
        {node.value && (
          <>
            <span className="text-neutral-600">:</span>
            <span className={valueColor(node.value)}>{node.value}</span>
          </>
        )}
        {hasChildren && !isOpen && (
          <span className="text-neutral-600 text-xs ml-1">({node.children.length})</span>
        )}
      </div>
      {hasChildren && isOpen && (
        <div className="pl-3 border-l border-neutral-800 ml-1.5">
          {node.children.map((child, i) => (
            <YamlTreeNode key={`${child.key}-${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function YamlPreview({ content }: FilePreviewerProps) {
  const nodes = parseYaml(content)

  if (nodes.length === 0) {
    return <p className="text-neutral-500 text-sm">Empty or unparseable YAML</p>
  }

  return (
    <div className="font-mono text-xs leading-relaxed">
      {nodes.map((node, i) => (
        <YamlTreeNode key={`${node.key}-${i}`} node={node} depth={0} />
      ))}
    </div>
  )
}

export const yamlPreviewer: FilePreviewerDefinition = {
  extensions: ['.yaml', '.yml'],
  label: 'Tree',
  component: YamlPreview,
}
