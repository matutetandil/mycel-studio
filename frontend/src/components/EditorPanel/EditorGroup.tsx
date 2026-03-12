import { useState, useMemo, useRef, useEffect } from 'react'
import MonacoEditor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { FileCode } from 'lucide-react'
import { setupMonaco } from '../../monaco'
import { useEditorPanelStore } from '../../stores/useEditorPanelStore'
import { useStudioStore } from '../../stores/useStudioStore'
import { generateProject, type GeneratedFile } from '../../utils/hclGenerator'
import TabBar from './TabBar'
import JSZip from 'jszip'

interface EditorGroupProps {
  groupId: string
  isSecondary?: boolean
}

export default function EditorGroupView({ groupId, isSecondary }: EditorGroupProps) {
  const group = useEditorPanelStore(s => s.groups.find(g => g.id === groupId))
  const setActiveGroup = useEditorPanelStore(s => s.setActiveGroup)
  const { nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig } = useStudioStore()
  const revealLine = useEditorPanelStore(s => s.revealLine)
  const setRevealLine = useEditorPanelStore(s => s.setRevealLine)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [copied, setCopied] = useState(false)

  const project = useMemo(
    () => generateProject(nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig),
    [nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig]
  )

  // Scroll to specific line when revealLine changes
  useEffect(() => {
    if (revealLine && editorRef.current) {
      editorRef.current.revealLineInCenter(revealLine)
      editorRef.current.setPosition({ lineNumber: revealLine, column: 1 })
      setRevealLine(null)
    }
  }, [revealLine, setRevealLine])

  if (!group) return null

  const activeTab = group.tabs.find(t => t.id === group.activeTabId)
  const activeFile: GeneratedFile | undefined = activeTab
    ? project.files.find(f => f.path === activeTab.filePath)
    : undefined

  const handleCopy = async () => {
    if (!activeFile?.content) return
    await navigator.clipboard.writeText(activeFile.content)
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

  return (
    <div
      className="flex flex-col h-full bg-neutral-900"
      onClick={() => setActiveGroup(groupId)}
    >
      <TabBar
        groupId={groupId}
        tabs={group.tabs}
        activeTabId={group.activeTabId}
        isSecondary={isSecondary}
        onCopy={handleCopy}
        onDownloadZip={handleDownloadZip}
        copied={copied}
      />

      <div className="flex-1 min-h-0">
        {activeFile ? (
          <MonacoEditor
            height="100%"
            language="hcl"
            value={activeFile.content}
            theme="mycel-dark"
            beforeMount={setupMonaco}
            onMount={(editor) => { editorRef.current = editor }}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              padding: { top: 8 },
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
            <div className="text-center">
              <FileCode className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-xs">Select a file from the Explorer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
