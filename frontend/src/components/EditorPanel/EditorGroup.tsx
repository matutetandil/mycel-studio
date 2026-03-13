import { useState, useMemo, useRef, useEffect } from 'react'
import MonacoEditor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { FileCode } from 'lucide-react'
import { setupMonaco } from '../../monaco'
import { useEditorPanelStore } from '../../stores/useEditorPanelStore'
import { useStudioStore } from '../../stores/useStudioStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { generateProject, type GeneratedFile } from '../../utils/hclGenerator'
import TabBar from './TabBar'
import JSZip from 'jszip'

const LANGUAGE_MAP: Record<string, string> = {
  '.hcl': 'hcl', '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
  '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
  '.go': 'go', '.py': 'python', '.rb': 'ruby', '.rs': 'rust', '.java': 'java',
  '.php': 'php', '.sql': 'sql', '.css': 'css', '.scss': 'scss', '.less': 'less',
  '.html': 'html', '.xml': 'xml', '.svg': 'xml',
  '.md': 'markdown', '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell',
  '.graphql': 'graphql', '.gql': 'graphql',
  '.env': 'plaintext', '.txt': 'plaintext', '.toml': 'plaintext',
  '.cfg': 'ini', '.conf': 'ini', '.ini': 'ini',
  '.proto': 'protobuf', '.csv': 'plaintext',
  '.dockerfile': 'dockerfile', '.c': 'c', '.cpp': 'cpp', '.h': 'c',
  '.swift': 'swift', '.kt': 'kotlin', '.lua': 'lua', '.r': 'r',
  '.tf': 'hcl', '.tfvars': 'hcl',
}

// File names (without extension) that map to specific languages
const FILENAME_MAP: Record<string, string> = {
  'dockerfile': 'dockerfile',
  'makefile': 'makefile',
  'gemfile': 'ruby',
  'rakefile': 'ruby',
  'cmakelists.txt': 'cmake',
  '.gitignore': 'plaintext',
  '.editorconfig': 'ini',
  '.dockerignore': 'plaintext',
}

function getLanguageForFile(name: string): string {
  const lower = name.toLowerCase()
  // Check full filename first (e.g., Dockerfile, Makefile)
  if (FILENAME_MAP[lower]) return FILENAME_MAP[lower]
  // Check by extension — try the last part after the last dot
  const dotIdx = lower.lastIndexOf('.')
  if (dotIdx >= 0) {
    const ext = lower.slice(dotIdx)
    if (LANGUAGE_MAP[ext]) return LANGUAGE_MAP[ext]
    // For compound extensions like .local, .example — try the part before
    const base = lower.slice(0, dotIdx)
    const prevDot = base.lastIndexOf('.')
    if (prevDot >= 0) {
      const baseExt = base.slice(prevDot)
      if (LANGUAGE_MAP[baseExt]) return LANGUAGE_MAP[baseExt]
    }
  }
  return 'plaintext'
}

interface EditorGroupProps {
  groupId: string
  isSecondary?: boolean
}

export default function EditorGroupView({ groupId, isSecondary }: EditorGroupProps) {
  const group = useEditorPanelStore(s => s.groups.find(g => g.id === groupId))
  const setActiveGroup = useEditorPanelStore(s => s.setActiveGroup)
  const { nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig } = useStudioStore()
  const projectFiles = useProjectStore(s => s.files)
  const mycelRoot = useProjectStore(s => s.mycelRoot)
  const revealLine = useEditorPanelStore(s => s.revealLine)
  const setRevealLine = useEditorPanelStore(s => s.setRevealLine)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [copied, setCopied] = useState(false)

  const existingPaths = useMemo(() => new Set(projectFiles.map(f => f.relativePath)), [projectFiles])
  const project = useMemo(
    () => generateProject(nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig, mycelRoot, existingPaths),
    [nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig, mycelRoot, existingPaths]
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

  const updateFile = useProjectStore(s => s.updateFile)
  const projectName = useProjectStore(s => s.projectName)

  const activeTab = group.tabs.find(t => t.id === group.activeTabId)
  // When a project is open, prefer real files over generated ones (preserves formatting + sub-blocks)
  const realProjectFile = activeTab ? projectFiles.find(f => f.relativePath === activeTab.filePath) : undefined
  const generatedFile = activeTab ? project.files.find(f => f.path === activeTab.filePath) : undefined
  const isRealFile = !!realProjectFile && !!projectName
  const activeFile: GeneratedFile | undefined = activeTab
    ? (realProjectFile
        ? { path: activeTab.filePath, name: activeTab.fileName, content: realProjectFile.content }
        : generatedFile)
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
            key={activeFile.path}
            height="100%"
            language={getLanguageForFile(activeFile.name)}
            value={activeFile.content}
            theme="mycel-dark"
            beforeMount={setupMonaco}
            onMount={(editor) => { editorRef.current = editor }}
            onChange={(value) => {
              if (value !== undefined && isRealFile) {
                updateFile(activeFile.path, value)
              }
            }}
            options={{
              readOnly: false,
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
