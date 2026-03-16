import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import MonacoEditor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { FileCode } from 'lucide-react'
import { setupMonaco } from '../../monaco'
import { useEditorPanelStore } from '../../stores/useEditorPanelStore'
import { useStudioStore } from '../../stores/useStudioStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useDebugStore } from '../../stores/useDebugStore'
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

interface LineStageInfo {
  flow: string
  stage: string
  ruleIndex: number
}

// Parse HCL content to find which lines correspond to which flow stages
function buildLineStageMap(content: string, filePath: string): Map<number, LineStageInfo> {
  const map = new Map<number, LineStageInfo>()
  if (!content || !filePath.endsWith('.hcl')) return map

  const lines = content.split('\n')
  let currentFlow: string | null = null
  let currentBlock: string | null = null
  let braceDepth = 0
  let flowBraceStart = 0
  let ruleIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lineNum = i + 1

    // Detect flow block start: flow "name" {
    const flowMatch = line.match(/^flow\s+"([^"]+)"\s*\{/)
    if (flowMatch) {
      currentFlow = flowMatch[1]
      flowBraceStart = braceDepth
      braceDepth++
      currentBlock = null
      ruleIndex = 0
      // The flow declaration line itself maps to 'input' stage
      map.set(lineNum, { flow: currentFlow, stage: 'input', ruleIndex: -1 })
      continue
    }

    // Track braces
    const openBraces = (line.match(/\{/g) || []).length
    const closeBraces = (line.match(/\}/g) || []).length

    if (currentFlow) {
      // Detect sub-blocks within flow
      if (braceDepth === flowBraceStart + 1) {
        // Top-level block inside flow
        const blockMatch = line.match(/^(from|to|transform|response|error_handling|validate|cache|lock|semaphore|dedupe|step|batch|enrich)\s*\{?/)
        if (blockMatch) {
          const blockName = blockMatch[1]
          // Map block names to pipeline stages
          const stageMap: Record<string, string> = {
            from: 'input',
            to: 'write',
            transform: 'transform',
            response: 'read',
            error_handling: 'write',
            validate: 'validate_input',
            cache: 'cache_hit',
            lock: 'write',
            semaphore: 'write',
            dedupe: 'dedupe',
            step: 'step',
            batch: 'write',
            enrich: 'enrich',
          }
          currentBlock = stageMap[blockName] || blockName
          ruleIndex = 0
        }
      }

      // Map lines to stages
      if (currentBlock && line && !line.startsWith('//') && !line.startsWith('#')) {
        // Lines with assignments (field = value) are individual rules
        if (line.match(/^\w[\w.]*\s*=/) && !line.startsWith('}')) {
          map.set(lineNum, { flow: currentFlow, stage: currentBlock, ruleIndex })
          ruleIndex++
        } else if (!line.startsWith('{') && !line.startsWith('}') && line.length > 0) {
          map.set(lineNum, { flow: currentFlow, stage: currentBlock, ruleIndex: -1 })
        }
      }

      // Closing brace at flow level
      if (closeBraces > openBraces && braceDepth - closeBraces + openBraces <= flowBraceStart) {
        currentFlow = null
        currentBlock = null
      }
    }

    braceDepth += openBraces - closeBraces
  }

  return map
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
  const updateFile = useProjectStore(s => s.updateFile)
  const projectName = useProjectStore(s => s.projectName)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [copied, setCopied] = useState(false)

  const existingPaths = useMemo(() => new Set(projectFiles.map(f => f.relativePath)), [projectFiles])
  const project = useMemo(
    () => generateProject(nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig, mycelRoot, existingPaths),
    [nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig, mycelRoot, existingPaths]
  )

  // Compute active file (safe when group is null)
  const activeTab = group?.tabs.find(t => t.id === group.activeTabId)
  const realProjectFile = activeTab ? projectFiles.find(f => f.relativePath === activeTab.filePath) : undefined
  const generatedFile = activeTab ? project.files.find(f => f.path === activeTab.filePath) : undefined
  const isRealFile = !!realProjectFile && !!projectName
  const activeFile: GeneratedFile | undefined = activeTab
    ? (realProjectFile
        ? { path: activeTab.filePath, name: activeTab.fileName, content: realProjectFile.content }
        : generatedFile)
    : undefined

  // Scroll to specific line when revealLine changes
  useEffect(() => {
    if (revealLine && editorRef.current) {
      editorRef.current.revealLineInCenter(revealLine)
      editorRef.current.setPosition({ lineNumber: revealLine, column: 1 })
      setRevealLine(null)
    }
  }, [revealLine, setRevealLine])

  // Debug subscriptions
  const debugStoppedAt = useDebugStore(s => s.stoppedAt)
  const debugBreakpoints = useDebugStore(s => s.breakpoints)
  const decorationsRef = useRef<string[]>([])

  // Map HCL lines to breakpointable stages
  const lineStageMap = useMemo(() => {
    if (!activeFile?.content) return new Map<number, LineStageInfo>()
    return buildLineStageMap(activeFile.content, activeFile.path)
  }, [activeFile?.content, activeFile?.path, nodes])

  // Apply breakpoint and stopped-at decorations to Monaco editor
  const applyDecorations = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return

    const newDecorations: editor.IModelDeltaDecoration[] = []

    // Breakpoint decorations (red circles in gutter)
    for (const [line, info] of lineStageMap) {
      const flowBps = debugBreakpoints.get(info.flow)
      if (flowBps) {
        const hasBp = flowBps.some(bp => bp.stage === info.stage && (bp.ruleIndex === -1 || bp.ruleIndex === info.ruleIndex))
        if (hasBp) {
          newDecorations.push({
            range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
            options: {
              isWholeLine: true,
              glyphMarginClassName: 'debug-breakpoint-glyph',
              className: 'debug-breakpoint-line',
            },
          })
        }
      }
    }

    // Stopped-at decoration (yellow arrow in gutter)
    if (debugStoppedAt) {
      for (const [line, info] of lineStageMap) {
        if (info.flow === debugStoppedAt.flow && info.stage === debugStoppedAt.stage) {
          // If stopped at a specific rule, highlight that line; otherwise highlight stage header
          if (debugStoppedAt.rule && info.ruleIndex === debugStoppedAt.rule.index) {
            newDecorations.push({
              range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
              options: {
                isWholeLine: true,
                glyphMarginClassName: 'debug-stopped-glyph',
                className: 'debug-stopped-line',
              },
            })
            break
          } else if (!debugStoppedAt.rule && info.ruleIndex === -1) {
            newDecorations.push({
              range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
              options: {
                isWholeLine: true,
                glyphMarginClassName: 'debug-stopped-glyph',
                className: 'debug-stopped-line',
              },
            })
            break
          }
        }
      }
    }

    decorationsRef.current = ed.deltaDecorations(decorationsRef.current, newDecorations)
  }, [lineStageMap, debugBreakpoints, debugStoppedAt])

  // Re-apply decorations when debug state changes
  useEffect(() => {
    applyDecorations()
  }, [applyDecorations])

  if (!group) return null

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
            onMount={(monacoEditor) => {
              editorRef.current = monacoEditor
              // Breakpoint click handler on glyph margin
              monacoEditor.onMouseDown((e) => {
                if (e.target.type === 2 /* GUTTER_GLYPH_MARGIN */ || e.target.type === 3 /* GUTTER_LINE_NUMBERS */) {
                  const lineNumber = e.target.position?.lineNumber
                  if (lineNumber) {
                    const info = lineStageMap.get(lineNumber)
                    if (info) {
                      useDebugStore.getState().toggleBreakpoint(info.flow, info.stage, info.ruleIndex)
                    }
                  }
                }
              })
              applyDecorations()
            }}
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
              glyphMargin: true,
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
