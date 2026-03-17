import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import MonacoEditor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { setupMonaco } from '../../monaco'
import { useEditorPanelStore } from '../../stores/useEditorPanelStore'
import { useStudioStore } from '../../stores/useStudioStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useDebugStore } from '../../stores/useDebugStore'
import { generateProject, type GeneratedFile } from '../../utils/hclGenerator'
import { computeLineDiff, type LineDiffResult } from '../../utils/lineDiff'
import { apiGetGitFileContent } from '../../lib/api'
import { getFileTypeInfo, getLanguageForFile } from '../../utils/fileIcons'
import TabBar from './TabBar'
import JSZip from 'jszip'

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
  const projectPath = useProjectStore(s => s.projectPath)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [copied, setCopied] = useState(false)
  const gitDecoRef = useRef<string[]>([])
  const [gitDiff, setGitDiff] = useState<LineDiffResult | null>(null)

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
  const hoverDecoRef = useRef<string[]>([])
  const [hoveredLine, setHoveredLine] = useState<number | null>(null)

  // Map HCL lines to breakpointable stages
  const lineStageMap = useMemo(() => {
    if (!activeFile?.content) return new Map<number, LineStageInfo>()
    return buildLineStageMap(activeFile.content, activeFile.path)
  }, [activeFile?.content, activeFile?.path, nodes])

  // Set of lines that have breakpoints (for decoration logic)
  const breakpointLines = useMemo(() => {
    const lines = new Set<number>()
    for (const [line, info] of lineStageMap) {
      const flowBps = debugBreakpoints.get(info.flow)
      if (flowBps) {
        const hasBp = flowBps.some(bp => bp.stage === info.stage && (bp.ruleIndex === -1 || bp.ruleIndex === info.ruleIndex))
        if (hasBp) lines.add(line)
      }
    }
    return lines
  }, [lineStageMap, debugBreakpoints])

  // Find the stopped-at line
  const stoppedLine = useMemo(() => {
    if (!debugStoppedAt) return null
    for (const [line, info] of lineStageMap) {
      if (info.flow === debugStoppedAt.flow && info.stage === debugStoppedAt.stage) {
        if (debugStoppedAt.rule && info.ruleIndex === debugStoppedAt.rule.index) return line
        if (!debugStoppedAt.rule && info.ruleIndex === -1) return line
      }
    }
    return null
  }, [lineStageMap, debugStoppedAt])

  // Apply breakpoint and stopped-at decorations on line numbers (JetBrains-style)
  const applyDecorations = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return

    const newDecorations: editor.IModelDeltaDecoration[] = []

    // Breakpoint decorations — red circle replacing line number
    for (const line of breakpointLines) {
      const isStopped = stoppedLine === line
      newDecorations.push({
        range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
        options: {
          isWholeLine: true,
          lineNumberClassName: isStopped ? 'debug-stopped-bp-linenum' : 'debug-bp-linenum',
          className: isStopped ? 'debug-stopped-line' : 'debug-breakpoint-line',
        },
      })
    }

    // Stopped-at line without breakpoint — yellow arrow replacing line number
    if (stoppedLine && !breakpointLines.has(stoppedLine)) {
      newDecorations.push({
        range: { startLineNumber: stoppedLine, startColumn: 1, endLineNumber: stoppedLine, endColumn: 1 },
        options: {
          isWholeLine: true,
          lineNumberClassName: 'debug-stopped-linenum',
          className: 'debug-stopped-line',
        },
      })
    }

    decorationsRef.current = ed.deltaDecorations(decorationsRef.current, newDecorations)
  }, [breakpointLines, stoppedLine])

  // Apply hover decoration — faded red circle on breakpointable line
  const applyHoverDecoration = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return

    const newDeco: editor.IModelDeltaDecoration[] = []
    if (hoveredLine && lineStageMap.has(hoveredLine) && !breakpointLines.has(hoveredLine) && stoppedLine !== hoveredLine) {
      newDeco.push({
        range: { startLineNumber: hoveredLine, startColumn: 1, endLineNumber: hoveredLine, endColumn: 1 },
        options: {
          lineNumberClassName: 'debug-bp-hover-linenum',
        },
      })
    }
    hoverDecoRef.current = ed.deltaDecorations(hoverDecoRef.current, newDeco)
  }, [hoveredLine, lineStageMap, breakpointLines, stoppedLine])

  // Re-apply decorations when debug state changes
  useEffect(() => {
    applyDecorations()
  }, [applyDecorations])

  // Re-apply hover decoration
  useEffect(() => {
    applyHoverDecoration()
  }, [applyHoverDecoration])

  // Fetch git HEAD content and compute line diff
  useEffect(() => {
    if (!activeFile?.path || !projectPath || !isRealFile) {
      setGitDiff(null)
      return
    }

    let cancelled = false
    apiGetGitFileContent(projectPath, activeFile.path).then(headContent => {
      if (cancelled) return
      if (!headContent) {
        // New file (not in git) — all lines are "added"
        const lines = (activeFile.content || '').split('\n')
        setGitDiff({
          added: lines.map((_, i) => i + 1),
          modified: [],
          deleted: [],
        })
      } else {
        setGitDiff(computeLineDiff(headContent, activeFile.content || ''))
      }
    })

    return () => { cancelled = true }
  }, [activeFile?.path, activeFile?.content, projectPath, isRealFile])

  // Apply git diff gutter decorations
  const applyGitDecorations = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return

    const decos: editor.IModelDeltaDecoration[] = []

    if (gitDiff) {
      for (const line of gitDiff.added) {
        decos.push({
          range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
          options: { linesDecorationsClassName: 'git-gutter-added' },
        })
      }
      for (const line of gitDiff.modified) {
        decos.push({
          range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
          options: { linesDecorationsClassName: 'git-gutter-modified' },
        })
      }
      for (const line of gitDiff.deleted) {
        const ln = Math.max(line, 1)
        decos.push({
          range: { startLineNumber: ln, startColumn: 1, endLineNumber: ln, endColumn: 1 },
          options: { linesDecorationsClassName: 'git-gutter-deleted' },
        })
      }
    }

    gitDecoRef.current = ed.deltaDecorations(gitDecoRef.current, decos)
  }, [gitDiff])

  useEffect(() => {
    applyGitDecorations()
  }, [applyGitDecorations])

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
              // Breakpoint click handler on line numbers
              monacoEditor.onMouseDown((e) => {
                if (e.target.type === 3 /* GUTTER_LINE_NUMBERS */) {
                  const lineNumber = e.target.position?.lineNumber
                  if (lineNumber) {
                    const info = lineStageMap.get(lineNumber)
                    if (info) {
                      useDebugStore.getState().toggleBreakpoint(info.flow, info.stage, info.ruleIndex)
                    }
                  }
                }
              })
              // Hover tracking for faded breakpoint hint
              monacoEditor.onMouseMove((e) => {
                if (e.target.type === 3 /* GUTTER_LINE_NUMBERS */) {
                  const lineNumber = e.target.position?.lineNumber ?? null
                  setHoveredLine(lineNumber)
                } else {
                  setHoveredLine(null)
                }
              })
              monacoEditor.onMouseLeave(() => {
                setHoveredLine(null)
              })
              applyDecorations()
              applyGitDecorations()
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
              glyphMargin: false,
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
            <div className="text-center">
              {(() => { const ft = getFileTypeInfo('untitled.txt'); const Icon = ft.icon; return <Icon className="w-10 h-10 mx-auto mb-2 opacity-20" /> })()}
              <p className="text-xs">Select a file from the Explorer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
