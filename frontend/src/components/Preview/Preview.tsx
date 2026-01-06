import { useMemo, useState } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { Copy, Check, Download } from 'lucide-react'
import { useStudioStore } from '../../stores/useStudioStore'
import { generateHCL } from '../../utils/hclGenerator'

export default function Preview() {
  const { nodes, edges } = useStudioStore()
  const [copied, setCopied] = useState(false)

  const hcl = useMemo(() => generateHCL(nodes, edges), [nodes, edges])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hcl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([hcl], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mycel.hcl'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-64 border-t border-neutral-800 bg-neutral-900 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-850 border-b border-neutral-800">
        <h3 className="text-sm font-medium text-neutral-300">Generated HCL</h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
          >
            <Download className="w-3 h-3" />
            Download
          </button>
        </div>
      </div>
      <div className="flex-1">
        <MonacoEditor
          height="100%"
          defaultLanguage="hcl"
          value={hcl}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  )
}
