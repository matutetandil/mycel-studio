import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import MonacoEditor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { setupMonaco, setActiveIDEFilePath, createIDEValidator } from '../../monaco'
import { getLastDefinitionLocation, navigateToDefinition } from '../../monaco/ideDefinitionProvider'
import { computeGutterItems, toggleBookmark, getBookmarks, type GutterItem } from '../../monaco/gutterDecorations'
import GutterPanel from './GutterPanel'

// Simple DOM-based context menu for gutter right-click
function showGutterMenu(x: number, y: number, items: Array<{ label: string; action: () => void }>) {
  // Remove existing menu
  document.getElementById('gutter-ctx-menu')?.remove()
  const menu = document.createElement('div')
  menu.id = 'gutter-ctx-menu'
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:99999;background:#262626;border:1px solid #404040;border-radius:6px;padding:4px 0;box-shadow:0 4px 12px rgba(0,0,0,0.5);min-width:180px;`
  for (const item of items) {
    const btn = document.createElement('button')
    btn.textContent = item.label
    btn.style.cssText = 'display:block;width:100%;text-align:left;padding:5px 12px;font-size:12px;color:#d4d4d4;background:none;border:none;cursor:pointer;'
    btn.onmouseenter = () => { btn.style.background = '#3f3f46' }
    btn.onmouseleave = () => { btn.style.background = 'none' }
    btn.onclick = () => { item.action(); menu.remove() }
    menu.appendChild(btn)
  }
  document.body.appendChild(menu)
  // Close on click outside
  const close = (e: MouseEvent) => { if (!menu.contains(e.target as Node)) { menu.remove(); document.removeEventListener('mousedown', close) } }
  setTimeout(() => document.addEventListener('mousedown', close), 0)
}
import { setHintExecutor } from '../../monaco/ideCodeActionProvider'
import { useEditorPanelStore, unscopePath } from '../../stores/useEditorPanelStore'
import { useStudioStore } from '../../stores/useStudioStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useMultiProjectStore } from '../../stores/useMultiProjectStore'
import { useDebugStore, breakpointKey } from '../../stores/useDebugStore'
import { generateProject, toIdentifier, type GeneratedFile } from '../../utils/hclGenerator'
import { computeLineDiff, type LineDiffResult } from '../../utils/lineDiff'
import { apiGetGitFileContent, isWailsRuntime, ideAllBreakpoints, type IDEBreakpointLocation } from '../../lib/api'
import { getFileTypeInfo, getLanguageForFile } from '../../utils/fileIcons'
import { triggerAutoSave } from '../../hooks/useAutoSave'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { applyKeymap } from '../../monaco/keymaps'
import { getPreviewerForFile, PreviewToggle } from '../../file-previewers'
import TabBar from './TabBar'
import CanvasTab from './CanvasTab'
import JSZip from 'jszip'

interface LineStageInfo {
  flow: string
  stage: string
  ruleIndex: number
}

// Valid pipeline stages that support breakpoints (from Mycel debug protocol)
const VALID_STAGES = new Set([
  'sanitize', 'filter', 'dedupe', 'validate_input',
  'enrich', 'transform', 'step', 'validate_output',
  'read', 'write', 'cache_hit', 'cache_miss', 'response',
])

// Only 'transform' and 'response' have per-CEL-rule breakpoints (ruleIndex 0+)
// All other stages only support stage-level breakpoints (ruleIndex -1)
const STAGES_WITH_RULES = new Set(['transform', 'response'])

// Map HCL block names to pipeline stage names
const BLOCK_TO_STAGE: Record<string, string> = {
  from: '', // 'from' is not a breakpointable stage
  to: 'write',
  transform: 'transform',
  response: 'response',
  error_handling: '', // not a stage
  validate: 'validate_input',
  cache: 'cache_hit',
  lock: '', // not a stage
  semaphore: '', // not a stage
  dedupe: 'dedupe',
  step: 'step',
  batch: 'write',
  enrich: 'enrich',
  filter: 'filter',
}

// Top-level HCL block types that map to canvas nodes
const HCL_BLOCK_TYPES = new Set([
  'connector', 'flow', 'type', 'validator', 'transform', 'aspect', 'saga', 'state_machine',
])

interface HclBlockRange {
  type: string   // e.g., 'connector', 'flow'
  name: string   // e.g., 'magento-db', 'create_user'
  startLine: number
  endLine: number
}

// Parse HCL content and return line ranges for each top-level block
function buildBlockRanges(content: string): HclBlockRange[] {
  if (!content) return []
  const ranges: HclBlockRange[] = []
  const lines = content.split('\n')
  let braceDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    // Match top-level block: type "name" {
    if (braceDepth === 0) {
      const match = line.match(/^(\w+)\s+"([^"]+)"\s*\{/)
      if (match && HCL_BLOCK_TYPES.has(match[1])) {
        const blockType = match[1]
        const blockName = match[2]
        const startLine = i + 1 // 1-based
        // Find the closing brace
        let depth = 0
        let endLine = startLine
        for (let j = i; j < lines.length; j++) {
          depth += (lines[j].match(/\{/g) || []).length
          depth -= (lines[j].match(/\}/g) || []).length
          if (depth === 0) {
            endLine = j + 1 // 1-based
            break
          }
        }
        ranges.push({ type: blockType, name: blockName, startLine, endLine })
      }
    }
    braceDepth += (line.match(/\{/g) || []).length
    braceDepth -= (line.match(/\}/g) || []).length
    if (braceDepth < 0) braceDepth = 0
  }
  return ranges
}

// Flag to prevent FileTree's selectedNodeId effect from re-opening the file
// when the selection was triggered by cursor movement in the editor
export let cursorDrivenSelection = false

// Find the canvas node matching an HCL block type+name
function selectNodeByBlock(blockType: string, blockName: string) {
  const { nodes, selectNode } = useStudioStore.getState()
  // Map HCL block type to canvas node type
  const nodeTypeMap: Record<string, string> = {
    connector: 'connector', flow: 'flow', type: 'type', validator: 'validator',
    transform: 'transform', aspect: 'aspect', saga: 'saga', state_machine: 'state_machine',
  }
  const nodeType = nodeTypeMap[blockType]
  if (!nodeType) { selectNode(null); return }

  // Find node by matching the HCL name against the node's identifier
  const node = nodes.find(n => {
    if (n.type !== nodeType) return false
    const data = n.data as { label?: string }
    if (!data.label) return false
    return toIdentifier(data.label) === blockName || data.label === blockName
  })
  cursorDrivenSelection = true
  selectNode(node?.id ?? null)
  // Reset flag after React processes the state update
  setTimeout(() => { cursorDrivenSelection = false }, 0)
}

// Parse HCL content to find which lines correspond to which flow/aspect stages
function buildLineStageMap(content: string, filePath: string): Map<number, LineStageInfo> {
  const map = new Map<number, LineStageInfo>()
  if (!content || !filePath.endsWith('.mycel')) return map

  const lines = content.split('\n')
  let currentFlow: string | null = null
  let currentBlock: string | null = null
  let currentStage: string | null = null
  let braceDepth = 0
  let flowBraceStart = 0
  let ruleIndex = 0
  // For aspects: track aspect name and whether we're inside action { transform { } }
  let currentAspect: string | null = null
  let aspectBraceStart = 0
  let inAspectAction = false
  let aspectActionDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lineNum = i + 1

    // Detect flow block start: flow "name" {
    const flowMatch = line.match(/^flow\s+"([^"]+)"\s*\{/)
    if (flowMatch && braceDepth === 0) {
      currentFlow = flowMatch[1]
      flowBraceStart = braceDepth
      braceDepth++
      currentBlock = null
      currentStage = null
      ruleIndex = 0
      continue
    }

    // Detect aspect block start: aspect "name" {
    const aspectMatch = line.match(/^aspect\s+"([^"]+)"\s*\{/)
    if (aspectMatch && braceDepth === 0) {
      currentAspect = aspectMatch[1]
      aspectBraceStart = braceDepth
      braceDepth++
      inAspectAction = false
      currentBlock = null
      currentStage = null
      ruleIndex = 0
      continue
    }

    // Track braces
    const openBraces = (line.match(/\{/g) || []).length
    const closeBraces = (line.match(/\}/g) || []).length

    if (currentFlow) {
      // Detect sub-blocks within flow
      if (braceDepth === flowBraceStart + 1) {
        // Top-level block inside flow
        const blockMatch = line.match(/^(from|to|transform|response|error_handling|validate|cache|lock|semaphore|dedupe|step|batch|enrich|filter)\s*\{?/)
        if (blockMatch) {
          currentBlock = blockMatch[1]
          currentStage = BLOCK_TO_STAGE[currentBlock] || ''
          ruleIndex = 0

          // Map the block declaration line as stage-level breakpoint
          // (skip 'write' — its breakpoint goes on the query/target/operation line instead)
          if (currentStage && VALID_STAGES.has(currentStage) && currentStage !== 'write') {
            map.set(lineNum, { flow: currentFlow, stage: currentStage, ruleIndex: -1 })
          }
        }
      }

      // Map content lines to stages
      if (currentStage && VALID_STAGES.has(currentStage) && line && !line.startsWith('//') && !line.startsWith('#')) {
        const isAssignment = line.match(/^\w[\w.]*\s*=/) && !line.startsWith('}')

        if (isAssignment && STAGES_WITH_RULES.has(currentStage)) {
          // Per-rule breakpoint (only for transform/response)
          map.set(lineNum, { flow: currentFlow, stage: currentStage, ruleIndex })
          ruleIndex++
        } else if (isAssignment && currentStage === 'write') {
          // For write stage: only the query/operation line is breakpointable
          const attrName = line.match(/^(\w+)\s*=/)?.[1]
          if (attrName === 'query' || attrName === 'operation') {
            map.set(lineNum, { flow: currentFlow, stage: currentStage, ruleIndex: -1 })
          }
        }
      }

      // Reset stage when exiting sub-block
      if (braceDepth === flowBraceStart + 1 && closeBraces > 0 && !line.match(/\{/)) {
        currentBlock = null
        currentStage = null
      }

      // Closing brace at flow level
      if (closeBraces > openBraces && braceDepth - closeBraces + openBraces <= flowBraceStart) {
        currentFlow = null
        currentBlock = null
        currentStage = null
      }
    }

    if (currentAspect) {
      // Detect action block inside aspect
      if (braceDepth === aspectBraceStart + 1 && line.match(/^action\s*\{/)) {
        inAspectAction = true
        aspectActionDepth = braceDepth
      }

      // Detect transform inside action (breakpointable stage for aspects)
      if (inAspectAction && line.match(/^transform\s*\{/)) {
        currentStage = 'transform'
        ruleIndex = 0
        // Map the transform declaration line
        // Aspects report their flow target in the `on` field — use aspect name as flow identifier
        map.set(lineNum, { flow: currentAspect, stage: 'transform', ruleIndex: -1 })
      }

      // Map transform assignment lines inside aspect action
      if (currentStage === 'transform' && inAspectAction && line && !line.startsWith('//') && !line.startsWith('#')) {
        const isAssignment = line.match(/^\w[\w.]*\s*=/) && !line.startsWith('}')
        if (isAssignment) {
          map.set(lineNum, { flow: currentAspect, stage: 'transform', ruleIndex })
          ruleIndex++
        }
      }

      // Reset on closing braces
      if (closeBraces > 0) {
        if (braceDepth - closeBraces + openBraces <= aspectActionDepth && inAspectAction) {
          inAspectAction = false
          currentStage = null
        }
      }

      // Closing brace at aspect level
      if (closeBraces > openBraces && braceDepth - closeBraces + openBraces <= aspectBraceStart) {
        currentAspect = null
        inAspectAction = false
        currentStage = null
      }
    }

    braceDepth += openBraces - closeBraces
    if (braceDepth < 0) braceDepth = 0
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
  const previewModes = useEditorPanelStore(s => s.previewModes)
  const setPreviewMode = useEditorPanelStore(s => s.setPreviewMode)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [copied, setCopied] = useState(false)
  const gitDecoRef = useRef<string[]>([])
  const [gitDiff, setGitDiff] = useState<LineDiffResult | null>(null)
  const [gutterItemsState, setGutterItemsState] = useState<GutterItem[]>([])
  const [blameData, setBlameData] = useState<Array<{ line: number; hash: string; author: string; date: string; summary?: string }> | null>(null)
  const [editorReady, setEditorReady] = useState(false)
  const blameDataRef = useRef(blameData)
  blameDataRef.current = blameData

  const existingPaths = useMemo(() => new Set(projectFiles.map(f => f.relativePath)), [projectFiles])
  const project = useMemo(
    () => generateProject(nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig, mycelRoot, existingPaths),
    [nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig, mycelRoot, existingPaths]
  )

  // Compute active file (safe when group is null)
  const activeTab = group?.tabs.find(t => t.id === group.activeTabId)

  // Resolve file content — may come from a different project than the active one
  const { activeFile, isRealFile } = useMemo(() => {
    if (!activeTab || activeTab.type === 'canvas') return { activeFile: undefined, isRealFile: false }

    const { projectPath: tabProjPath, relativePath: relPath } = unscopePath(activeTab.filePath)

    // Determine which project's data to use
    const multiStore = useMultiProjectStore.getState()
    let resolvedFiles = projectFiles
    let resolvedNodes = nodes
    let resolvedEdges = edges
    let resolvedServiceConfig = serviceConfig
    let resolvedAuthConfig = authConfig
    let resolvedEnvConfig = envConfig
    let resolvedSecurityConfig = securityConfig
    let resolvedPluginConfig = pluginConfig
    let resolvedMycelRoot = mycelRoot
    let resolvedProjectName = projectName

    // If the tab belongs to a different project, use that project's snapshot
    if (tabProjPath && multiStore.projects.size > 0) {
      for (const proj of multiStore.projects.values()) {
        if (proj.projectPath === tabProjPath) {
          const isActive = multiStore.activeProjectId === proj.id
          if (!isActive) {
            // Use snapshot data for inactive project
            resolvedFiles = proj.files
            resolvedNodes = proj.nodes as typeof nodes
            resolvedEdges = proj.edges
            resolvedServiceConfig = proj.serviceConfig
            resolvedAuthConfig = proj.authConfig
            resolvedEnvConfig = proj.envConfig
            resolvedSecurityConfig = proj.securityConfig
            resolvedPluginConfig = proj.pluginConfig
            resolvedMycelRoot = proj.mycelRoot
            resolvedProjectName = proj.projectName
          }
          break
        }
      }
    }

    // Find in real project files
    const realFile = resolvedFiles.find(f => f.relativePath === relPath)
    if (realFile && resolvedProjectName) {
      return {
        activeFile: { path: relPath, name: activeTab.fileName, content: realFile.content } as GeneratedFile,
        isRealFile: true,
      }
    }

    // Find in generated files
    const resolvedExistingPaths = new Set(resolvedFiles.map(f => f.relativePath))
    const generated = generateProject(
      resolvedNodes, resolvedEdges, resolvedServiceConfig, resolvedAuthConfig,
      resolvedEnvConfig, resolvedSecurityConfig, resolvedPluginConfig,
      resolvedMycelRoot, resolvedExistingPaths
    )
    const genFile = generated.files.find(f => f.path === relPath)
    return { activeFile: genFile, isRealFile: false }
  }, [activeTab, projectFiles, nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig, mycelRoot, projectName])

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
  const verifiedBreakpoints = useDebugStore(s => s.verifiedBreakpoints)
  const rejectedBreakpoints = useDebugStore(s => s.rejectedBreakpoints)
  const decorationsRef = useRef<string[]>([])
  const hoverDecoRef = useRef<string[]>([])
  const [hoveredLine, setHoveredLine] = useState<number | null>(null)

  // Map HCL lines to breakpointable stages
  // Build block ranges for cursor-aware node selection
  const blockRanges = useMemo(() => {
    if (!activeFile?.content || !activeFile.name.endsWith('.mycel')) return []
    return buildBlockRanges(activeFile.content)
  }, [activeFile?.content, activeFile?.name])

  // Track which block the cursor is in — select the corresponding canvas node
  const lastSelectedBlockRef = useRef<string | null>(null)
  const handleCursorChange = useCallback((lineNumber: number) => {
    if (blockRanges.length === 0) return
    const block = blockRanges.find(b => lineNumber >= b.startLine && lineNumber <= b.endLine)
    const blockKey = block ? `${block.type}:${block.name}` : null
    if (blockKey !== lastSelectedBlockRef.current) {
      lastSelectedBlockRef.current = blockKey
      if (block) {
        selectNodeByBlock(block.type, block.name)
      } else {
        useStudioStore.getState().selectNode(null)
      }
    }
  }, [blockRanges])

  // Breakpoint locations from IDE engine (replaces buildLineStageMap)
  const [ideBreakpoints, setIdeBreakpoints] = useState<IDEBreakpointLocation[]>([])
  useEffect(() => {
    if (!activeFile?.path || !activeFile.path.endsWith('.mycel')) {
      setIdeBreakpoints([])
      return
    }
    if (isWailsRuntime()) {
      const pp = useProjectStore.getState().projectPath
      if (pp) {
        ideAllBreakpoints().then(allBps => {
          // Find breakpoints for this file (try with and without project path prefix)
          const absPath = pp + '/' + activeFile.path
          const bps = allBps[absPath] || allBps[activeFile.path] || []
          setIdeBreakpoints(bps)
        })
      }
    }
  }, [activeFile?.path, activeFile?.content])

  // Build lineStageMap from IDE breakpoint locations
  const lineStageMap = useMemo(() => {
    const map = new Map<number, LineStageInfo>()
    if (ideBreakpoints.length > 0) {
      for (const bp of ideBreakpoints) {
        map.set(bp.line, { flow: bp.flow, stage: bp.stage, ruleIndex: bp.ruleIndex })
      }
      return map
    }
    // Fallback to static parser for non-Wails mode
    if (!activeFile?.content) return map
    return buildLineStageMap(activeFile.content, activeFile.path)
  }, [ideBreakpoints, activeFile?.content, activeFile?.path])

  // Keep a ref so Monaco event handlers always access latest lineStageMap
  const lineStageMapRef = useRef(lineStageMap)
  lineStageMapRef.current = lineStageMap

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
    // Verified: checkmark, Rejected: exclamation, Default: plain red circle
    for (const line of breakpointLines) {
      const info = lineStageMap.get(line)
      const isStopped = stoppedLine === line
      let lineNumClass = 'debug-bp-linenum'
      if (isStopped) {
        lineNumClass = 'debug-stopped-bp-linenum'
      } else if (info) {
        const key = breakpointKey(info.flow, info.stage, info.ruleIndex)
        if (rejectedBreakpoints.has(key)) {
          lineNumClass = 'debug-bp-rejected-linenum'
        } else if (verifiedBreakpoints.has(key)) {
          lineNumClass = 'debug-bp-verified-linenum'
        }
      }
      newDecorations.push({
        range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
        options: {
          isWholeLine: true,
          lineNumberClassName: lineNumClass,
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
  }, [breakpointLines, stoppedLine, lineStageMap, verifiedBreakpoints, rejectedBreakpoints])

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

    // Skip git diff for ignored files
    const fileInfo = projectFiles.find(f => f.relativePath === activeFile.path)
    if (fileInfo?.gitStatus === 'ignored') {
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
  }, [activeFile?.path, activeFile?.content, projectPath, isRealFile, projectFiles])

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
        {activeTab?.type === 'canvas' && activeTab.projectId ? (
          <CanvasTab projectId={activeTab.projectId} />
        ) : activeFile ? (() => {
          const previewer = getPreviewerForFile(activeFile.name)
          const currentMode = previewModes[activeFile.name] || 'source'
          const PreviewComponent = previewer?.component
          return (
            <div className="relative h-full">
              {previewer && activeTab && (
                <PreviewToggle
                  mode={currentMode}
                  onToggle={(mode) => setPreviewMode(activeFile.name, mode)}
                  label={previewer.label}
                />
              )}
              {currentMode === 'preview' && PreviewComponent ? (
                <div className="h-full overflow-y-auto bg-neutral-900 p-6">
                  <PreviewComponent content={activeFile.content} fileName={activeFile.name} />
                </div>
              ) : (
          <div className="flex h-full">
            {activeFile.name.endsWith('.mycel') && editorReady && (
              <GutterPanel
                editorRef={editorRef}
                gutterItems={gutterItemsState}
                blameData={blameData}
                projectPath={projectPath || ''}
                onItemClick={(item) => {
                  if (item.type === 'ref-down' && item.references && item.references.length > 0) {
                    const handler = ((window as unknown) as Record<string, unknown>).__mycelShowRefs as ((refs: unknown[], name: string, kind: string) => void) | undefined
                    if (handler && item.entityName && item.entityKind) {
                      handler(item.references, item.entityName, item.entityKind)
                    }
                  } else if (item.type === 'ref-up' && item.references && item.references.length > 0) {
                    const ref = item.references[0]
                    const pp = projectPath || ''
                    const relPath = ref.file.startsWith(pp + '/') ? ref.file.slice(pp.length + 1) : ref.file
                    const fileName = relPath.split('/').pop() || relPath
                    useEditorPanelStore.getState().openFile(relPath, fileName, undefined, pp)
                    setTimeout(() => useEditorPanelStore.getState().setRevealLine(ref.line), 50)
                  } else if (item.type === 'hint' && item.hint) {
                    import('../../utils/refactorUtils').then(({ executeHint }) => executeHint(item.hint!))
                  }
                }}
              />
            )}
          <MonacoEditor
            key={activeFile.path}
            height="100%"
            language={getLanguageForFile(activeFile.name)}
            value={activeFile.content}
            theme="mycel-dark"
            beforeMount={setupMonaco}
            onMount={(monacoEditor, monacoInstance) => {
              editorRef.current = monacoEditor
              setEditorReady(true)
              // Apply keymap (IDEA/VS Code)
              applyKeymap(monacoInstance, monacoEditor, useSettingsStore.getState().keymap)
              // Set active file path for IDE engine (completions, hover, diagnostics)
              if (activeFile && isWailsRuntime()) {
                const pp = useProjectStore.getState().projectPath
                if (pp) {
                  setActiveIDEFilePath(pp + '/' + activeFile.path)
                  // Cmd+Click → navigate to definition (uses the last resolved location from the provider)
                  monacoEditor.onMouseDown((e) => {
                    if ((e.event.metaKey || e.event.ctrlKey) && e.target.type === 6 /* CONTENT_TEXT */) {
                      const loc = getLastDefinitionLocation()
                      if (loc) {
                        e.event.preventDefault()
                        navigateToDefinition(loc)
                      }
                    }
                  })
                  // Set up hint executor for SOLID refactoring actions
                  setHintExecutor(async (hint) => {
                    const { executeHint } = await import('../../utils/refactorUtils')
                    await executeHint(hint)
                  })
                  // Find Usages — context menu + multiple keybindings
                  monacoEditor.addAction({
                    id: 'mycel.findUsages',
                    label: 'Find Usages',
                    keybindings: [
                      monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.F7,
                      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyU,
                    ],
                    contextMenuGroupId: 'navigation',
                    contextMenuOrder: 1.5,
                    run: async () => {
                      const { findAllReferences } = await import('../../utils/navigationUtils')
                      await findAllReferences()
                    },
                  })
                  // Go to Definition — also in context menu
                  monacoEditor.addAction({
                    id: 'mycel.goToDefinition',
                    label: 'Go to Definition',
                    contextMenuGroupId: 'navigation',
                    contextMenuOrder: 1,
                    run: async () => {
                      const { goToDefinition } = await import('../../utils/navigationUtils')
                      await goToDefinition()
                    },
                  })
                  // Set up IDE-backed validation (replaces static hclValidator)
                  const ideValidate = createIDEValidator(monacoInstance, () => {
                    const p = useProjectStore.getState().projectPath
                    const af = activeFile
                    return p && af ? p + '/' + af.path : null
                  })
                  monacoEditor.onDidChangeModelContent(() => {
                    ideValidate(monacoEditor.getModel()!)
                  })
                  // Run initial validation
                  if (monacoEditor.getModel()) ideValidate(monacoEditor.getModel()!)

                  // Compute gutter items and update React state (GutterPanel renders them)
                  const absPath = pp + '/' + activeFile.path
                  const refreshGutter = async () => {
                    const items = await computeGutterItems(absPath)
                    setGutterItemsState(items)
                  }
                  refreshGutter()
                  monacoEditor.onDidChangeModelContent(() => {
                    setTimeout(refreshGutter, 1000)
                  })

                  // Context menu on line numbers — bookmark/blame
                  monacoEditor.onContextMenu((e) => {
                    if (e.target.type === 3 /* GUTTER_LINE_NUMBERS */) {
                      const line = e.target.position?.lineNumber
                      if (line && activeFile) {
                        e.event.preventDefault()
                        e.event.stopPropagation()
                        const hasBookmark = getBookmarks(activeFile.path).has(line)
                        showGutterMenu(e.event.posx, e.event.posy, [
                          {
                            label: hasBookmark ? 'Remove Bookmark' : 'Add Bookmark',
                            action: () => { toggleBookmark(activeFile.path, line); refreshGutter() },
                          },
                          {
                            label: blameDataRef.current ? 'Hide Git Blame' : 'Annotate with Git Blame',
                            action: async () => {
                              if (blameDataRef.current) {
                                setBlameData(null)
                                return
                              }
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const wailsApp = (window as any).go?.main?.App
                              if (!wailsApp?.GetGitBlame) return
                              try {
                                const json = await wailsApp.GetGitBlame(pp, activeFile.path)
                                const data = JSON.parse(json)
                                if (!data || data.length === 0) {
                                  alert('File is not tracked by git yet.')
                                } else {
                                  setBlameData(data)
                                }
                              } catch {
                                alert('Failed to get blame.')
                              }
                            },
                          },
                        ])
                      }
                    }
                  })
                }
              }
              // Restore full view state (cursor, scroll, selections, folds)
              let restoringState = false
              if (activeFile) {
                const viewStates = useEditorPanelStore.getState().editorViewStates
                const saved = viewStates[activeFile.path]
                if (saved) {
                  restoringState = true
                  monacoEditor.restoreViewState(saved as editor.ICodeEditorViewState)
                  requestAnimationFrame(() => { restoringState = false })
                }
              }
              // Focus the editor so it receives keyboard input
              monacoEditor.focus()
              // Save view state + cursor position on change, cursor-aware block selection (HCL)
              monacoEditor.onDidChangeCursorPosition((e) => {
                if (restoringState) return
                if (activeFile) {
                  useEditorPanelStore.getState().setCursorPosition(activeFile.path, e.position.lineNumber, e.position.column)
                  // Save full view state (includes scroll position)
                  const vs = monacoEditor.saveViewState()
                  if (vs) useEditorPanelStore.getState().setEditorViewState(activeFile.path, vs)
                }
                handleCursorChange(e.position.lineNumber)
              })
              // Also save on scroll (cursor might not move but scroll does)
              monacoEditor.onDidScrollChange(() => {
                if (restoringState || !activeFile) return
                const vs = monacoEditor.saveViewState()
                if (vs) useEditorPanelStore.getState().setEditorViewState(activeFile.path, vs)
              })
              // Also trigger block selection on initial mount
              const pos = monacoEditor.getPosition()
              if (pos) handleCursorChange(pos.lineNumber)
              // Auto-save when editor loses focus (click canvas, properties, etc.)
              monacoEditor.onDidBlurEditorText(() => {
                triggerAutoSave()
              })
              // Breakpoint click handler on line numbers (uses ref for latest data)
              monacoEditor.onMouseDown((e) => {
                if (e.target.type === 3 /* GUTTER_LINE_NUMBERS */) {
                  const lineNumber = e.target.position?.lineNumber
                  if (lineNumber) {
                    const info = lineStageMapRef.current.get(lineNumber)
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
              if (value !== undefined && isRealFile && activeFile) {
                // Use the unscoped relative path for updating the project store
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
          </div>
              )}
            </div>
          )
        })() : (
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
