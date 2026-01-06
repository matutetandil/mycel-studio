import { useMemo, useState, useEffect } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { Copy, Check, Download, AlertTriangle, FileText } from 'lucide-react'
import { useStudioStore } from '../../stores/useStudioStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { generateProject } from '../../utils/hclGenerator'
import { getVirtualActiveFile } from '../FileTree/FileTree'
import JSZip from 'jszip'

export default function Preview() {
  const { nodes, edges } = useStudioStore()
  const { projectName, files: projectFiles, activeFile: projectActiveFile } = useProjectStore()
  const [copied, setCopied] = useState(false)
  const [virtualActiveFile, setVirtualActiveFile] = useState<string | null>(getVirtualActiveFile())

  // Subscribe to virtual active file changes
  useEffect(() => {
    const interval = setInterval(() => {
      const current = getVirtualActiveFile()
      if (current !== virtualActiveFile) {
        setVirtualActiveFile(current)
      }
    }, 100) // Poll for changes

    return () => clearInterval(interval)
  }, [virtualActiveFile])

  const project = useMemo(() => generateProject(nodes, edges), [nodes, edges])

  // Determine which file to show
  const activeFilePath = projectName ? projectActiveFile : virtualActiveFile
  const currentFile = projectName
    ? projectFiles.find(f => f.relativePath === activeFilePath)
    : project.files.find(f => f.path === activeFilePath) || project.files[0]

  const currentContent = projectName
    ? (currentFile as { content: string } | undefined)?.content || ''
    : (currentFile as { content: string } | undefined)?.content || ''

  const currentFileName = projectName
    ? (currentFile as { name: string } | undefined)?.name
    : (currentFile as { name: string } | undefined)?.name

  const handleCopy = async () => {
    if (!currentContent) return
    await navigator.clipboard.writeText(currentContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadZip = async () => {
    const zip = new JSZip()

    for (const file of project.files) {
      zip.file(file.path, file.content)
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mycel-project.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const hasContent = nodes.length > 0

  if (!hasContent) {
    return (
      <div className="h-64 border-t border-neutral-800 bg-neutral-900 flex items-center justify-center">
        <div className="text-center text-neutral-500">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Drag connectors and flows to the canvas</p>
          <p className="text-xs mt-1">HCL will be generated automatically</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-64 border-t border-neutral-800 bg-neutral-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-850 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-neutral-300">
            {currentFileName || 'No file selected'}
          </h3>
          {project.errors.length > 0 && (
            <div className="flex items-center gap-1 text-amber-500 text-xs">
              <AlertTriangle className="w-3 h-3" />
              <span>{project.errors.length} warning{project.errors.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
            title="Copy current file"
            disabled={!currentContent}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownloadZip}
            className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-300 hover:text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
            title="Download all files as ZIP"
          >
            <Download className="w-3 h-3" />
            Download ZIP
          </button>
        </div>
      </div>

      {/* Errors panel */}
      {project.errors.length > 0 && (
        <div className="px-4 py-2 bg-amber-900/20 border-b border-amber-800/50">
          {project.errors.map((error, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-amber-400">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Editor - now full width since file tree is in Explorer */}
      <div className="flex-1 min-h-0">
        {currentContent ? (
          <MonacoEditor
            height="100%"
            language="hcl"
            value={currentContent}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
            Select a file from the Explorer
          </div>
        )}
      </div>
    </div>
  )
}
