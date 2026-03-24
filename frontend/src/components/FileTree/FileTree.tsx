import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Circle,
  Package,
  AlertTriangle,
  Pencil,
  Trash2,
  FolderInput,
  FolderPlus,
  FilePlus,
  X,
  GitBranch,
} from 'lucide-react'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useProjectStore, type ProjectFile } from '../../stores/useProjectStore'
import { useStudioStore } from '../../stores/useStudioStore'
import { useEditorPanelStore, scopedPath, unscopePath } from '../../stores/useEditorPanelStore'
import { useMultiProjectStore } from '../../stores/useMultiProjectStore'
import { generateProject, toIdentifier, type GeneratedFile } from '../../utils/hclGenerator'
import { useDiagnosticsStore, type DiagnosticSeverity } from '../../stores/useDiagnosticsStore'
import { cursorDrivenSelection } from '../EditorPanel/EditorGroup'
import type { ConnectorNodeData, FlowNodeData } from '../../types'
import ContextMenu, { type ContextMenuItem } from '../ContextMenu'
import { getFileTypeInfo, KNOWN_LANGUAGES, setLanguageOverride, getLanguageOverride, removeLanguageOverride, NEW_FILE_TYPES, resolveFileName, type NewFileType } from '../../utils/fileIcons'

// Badge colors (the M/U/A/D/S indicator)
const gitStatusColors: Record<string, string> = {
  clean: 'text-neutral-500',
  modified: 'text-amber-500',
  new: 'text-green-500',
  added: 'text-green-500',
  untracked: 'text-green-500',
  deleted: 'text-red-500',
  ignored: 'text-neutral-600',
  staged: 'text-emerald-400',
  staged_added: 'text-emerald-400',
  staged_deleted: 'text-red-400',
  staged_renamed: 'text-emerald-400',
  staged_modified: 'text-amber-400',
}

// Name text colors (IntelliJ-style: tint the filename itself)
const gitStatusNameColors: Record<string, string> = {
  clean: '',
  modified: 'text-sky-400',
  new: 'text-green-400',
  added: 'text-green-400',
  untracked: 'text-green-400',
  deleted: 'text-red-400',
  ignored: 'text-neutral-600',
  staged: 'text-emerald-300',
  staged_added: 'text-emerald-300',
  staged_deleted: 'text-red-300',
  staged_renamed: 'text-emerald-300',
  staged_modified: 'text-amber-300',
}

const gitStatusIcons: Record<string, string> = {
  clean: '',
  modified: 'M',
  new: 'U',
  added: 'A',
  untracked: 'U',
  deleted: 'D',
  ignored: '',
  staged: 'S',
  staged_added: 'S',
  staged_deleted: 'D',
  staged_renamed: 'R',
  staged_modified: 'SM',
}

interface FileItemProps {
  file: ProjectFile | GeneratedFile
  isActive: boolean
  onClick: () => void
  isGenerated?: boolean
  diagSeverity?: DiagnosticSeverity
  onContextMenu?: (e: React.MouseEvent) => void
  isEditing?: boolean
  editName?: string
  onEditChange?: (name: string) => void
  onEditCommit?: () => void
  onEditCancel?: () => void
}

function FileItem({ file, isActive, onClick, isGenerated, diagSeverity, onContextMenu, isEditing, editName, onEditChange, onEditCommit, onEditCancel }: FileItemProps) {
  const projectFile = file as ProjectFile
  const gitStatus = projectFile.gitStatus || 'clean'
  const statusColor = gitStatusColors[gitStatus]
  const statusIcon = gitStatusIcons[gitStatus]
  const nameColor = gitStatusNameColors[gitStatus] || ''
  const fileType = getFileTypeInfo(file.name)
  const FileIcon = fileType.icon

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`
        w-full flex items-center gap-2 px-2 py-1 text-sm rounded
        ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-800 text-neutral-300'}
      `}
    >
      <FileIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : isGenerated ? 'text-indigo-400' : fileType.color}`} />
      {isEditing ? (
        <input
          autoFocus
          value={editName}
          onChange={(e) => onEditChange?.(e.target.value)}
          onBlur={() => onEditCommit?.()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEditCommit?.()
            if (e.key === 'Escape') onEditCancel?.()
            e.stopPropagation()
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-neutral-700 text-white text-sm px-1 py-0 rounded border border-neutral-600 outline-none min-w-0"
        />
      ) : (
        <span className={`flex-1 text-left truncate ${!isActive && nameColor ? nameColor : ''} ${diagSeverity === 'error' ? 'diag-error' : diagSeverity === 'warning' ? 'diag-warning' : ''}`}>{file.name}</span>
      )}
      {!isEditing && projectFile.isDirty && (
        <Circle className="w-2 h-2 fill-current text-amber-500" />
      )}
      {!isEditing && statusIcon && (
        <span className={`text-xs font-medium ${!isActive && nameColor ? nameColor : statusColor}`}>
          {statusIcon}
        </span>
      )}
    </button>
  )
}

// Select the canvas node that corresponds to a file path (updates Properties panel)
// Accepts both scoped ({projectPath}::{relativePath}) and unscoped paths
export function selectNodeForFile(filePath: string) {
  const { nodes, selectNode } = useStudioStore.getState()

  // Unscope if needed (TabBar passes scoped paths)
  const { relativePath: unscopedPath } = unscopePath(filePath)

  // Handle mycelRoot prefix — strip it for matching
  const mycelRoot = useProjectStore.getState().mycelRoot
  const relPath = mycelRoot && unscopedPath.startsWith(mycelRoot)
    ? unscopedPath.slice(mycelRoot.length)
    : unscopedPath

  // connectors/{name}.mycel → find connector with that identifier
  const connectorMatch = relPath.match(/^connectors\/(.+)\.(?:mycel|hcl)$/)
  if (connectorMatch) {
    const identifier = connectorMatch[1]
    const node = nodes.find(n => {
      if (n.type !== 'connector') return false
      const data = n.data as ConnectorNodeData
      return toIdentifier(data.label) === identifier
    })
    if (node) { selectNode(node.id); return }
  }

  // Match by hclFile field on any node (try all path variants)
  const nodeByHclFile = nodes.find(n => {
    const hf = (n.data as Record<string, unknown>).hclFile as string | undefined
    if (!hf) return false
    return hf === unscopedPath || hf === relPath || hf === filePath
      || (mycelRoot && hf === mycelRoot + relPath)
  })
  if (nodeByHclFile) { selectNode(nodeByHclFile.id); return }

  // Shared files → select first node of that type
  const typeMap: Record<string, string> = {
    'flows/flows.mycel': 'flow',
    'types/types.mycel': 'type',
    'validators/validators.mycel': 'validator',
    'transforms/transforms.mycel': 'transform',
    'aspects/aspects.mycel': 'aspect',
    'sagas/sagas.mycel': 'saga',
    'machines/machines.mycel': 'state_machine',
  }
  const nodeType = typeMap[relPath]
  if (nodeType) {
    const node = nodes.find(n => n.type === nodeType)
    if (node) { selectNode(node.id); return }
  }

  // config.hcl, auth, security, plugins, env files → deselect (show ServiceProperties)
  selectNode(null)
}

function openFileInEditor(filePath: string, revealLine?: number, projectPath?: string | null) {
  const fileName = filePath.split('/').pop() || filePath
  // Pass projectPath so EditorPanelStore can create scoped tab IDs
  const pp = projectPath ?? useProjectStore.getState().projectPath
  useEditorPanelStore.getState().openFile(filePath, fileName, undefined, pp)
  // Auto-expand editor if collapsed
  const { isCollapsed, toggleCollapse } = useEditorPanelStore.getState()
  if (isCollapsed) toggleCollapse()
  // For non-HCL files, select node by file path (HCL files use cursor-aware selection in EditorGroup)
  if (!filePath.endsWith('.mycel')) {
    selectNodeForFile(filePath)
  }
  // Scroll to specific line if provided
  if (revealLine) {
    // Small delay to let the editor mount/switch tab first
    setTimeout(() => useEditorPanelStore.getState().setRevealLine(revealLine), 50)
  }
}

// Modal dialog for entering new file/folder name
function NewFileDialog({
  fileType,
  dirPath,
  onConfirm,
  onCancel,
}: {
  fileType: NewFileType | null // null = directory
  dirPath: string
  onConfirm: (path: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(fileType?.fileName || '')
  const inputRef = useRef<HTMLInputElement>(null)
  const isFixedName = !!fileType?.fileName

  useEffect(() => {
    inputRef.current?.focus()
    if (isFixedName) {
      inputRef.current?.select()
    }
  }, [isFixedName])

  const handleSubmit = () => {
    if (!name.trim()) return
    let finalName: string
    if (fileType) {
      finalName = resolveFileName(name, fileType)
    } else {
      finalName = name.trim()
    }
    const path = dirPath ? `${dirPath}/${finalName}` : finalName
    onConfirm(path)
  }

  const preview = name.trim() && fileType ? resolveFileName(name, fileType) : name.trim()
  const showPreview = fileType && !isFixedName && preview && preview !== name.trim()

  const title = fileType ? `New ${fileType.label}` : 'New Directory'
  const placeholder = fileType
    ? (isFixedName ? '' : `Enter name${fileType.extension ? ` (${fileType.extension} auto-added)` : ''}`)
    : 'Enter directory name'

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={onCancel}
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); e.stopPropagation() }}
    >
      <div
        className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-80 p-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-white mb-3">{title}</h3>
        {dirPath && (
          <p className="text-xs text-neutral-500 mb-2 truncate">
            in {dirPath}/
          </p>
        )}
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
            if (e.key === 'Escape') onCancel()
          }}
          placeholder={placeholder}
          disabled={isFixedName}
          className="w-full bg-neutral-900 text-white text-sm px-3 py-2 rounded border border-neutral-600 outline-none focus:border-indigo-500 disabled:opacity-60"
        />
        {showPreview && (
          <p className="text-xs text-neutral-400 mt-1.5">
            Will create: <span className="text-indigo-400">{preview}</span>
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function SingleProjectFileTree({ hideHeader }: { hideHeader?: boolean } = {}) {
  const { projectPath, projectName, files, activeFile, setActiveFile, openProject, createFile, createDirectory, deleteFile, renameFile, capabilities, mycelRoot } = useProjectStore()
  const { nodes, edges, selectedNodeId, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig } = useStudioStore()
  const editorActiveTabId = useEditorPanelStore(s => s.groups.find(g => g.id === s.activeGroupId)?.activeTabId || null)
  // Subscribe to files data so React re-renders when diagnostics change
  const diagFiles = useDiagnosticsStore(s => s.files)
  const getFileSeverity = (path: string): DiagnosticSeverity => {
    for (const [key, diag] of Object.entries(diagFiles)) {
      if (key === path || key.endsWith('/' + path) || path.endsWith('/' + key)) return diag.severity
    }
    return 'none'
  }
  const getDirSeverity = (dirPath: string): DiagnosticSeverity => {
    let hasError = false
    let hasWarning = false
    for (const [key, diag] of Object.entries(diagFiles)) {
      if (key.startsWith(dirPath + '/') || key.includes('/' + dirPath + '/')) {
        if (diag.severity === 'error') hasError = true
        if (diag.severity === 'warning') hasWarning = true
      }
    }
    return hasError ? 'error' : hasWarning ? 'warning' : 'none'
  }
  const [isExpanded, setIsExpanded] = useState(true)
  const [fileContextMenu, setFileContextMenu] = useState<{ x: number; y: number; path: string; name: string } | null>(null)
  const [dirContextMenu, setDirContextMenu] = useState<{ x: number; y: number; dirPath: string } | null>(null)
  const [editingFile, setEditingFile] = useState<{ path: string; newName: string } | null>(null)
  const [newFileDialog, setNewFileDialog] = useState<{ fileType: NewFileType | null; dirPath: string } | null>(null)

  // Generate project from canvas — pass mycelRoot and existing file paths so generator
  // prefixes correctly and skips files that already exist on disk
  const existingPaths = useMemo(() => new Set(files.map(f => f.relativePath)), [files])
  const generatedProject = useMemo(() => generateProject(nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig, mycelRoot, existingPaths), [nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig, mycelRoot, existingPaths])

  // Track the previously opened file per node, so we can rename tabs on label change
  const prevNodeFileRef = useRef<Record<string, string>>({})
  const prevSelectedNodeIdRef = useRef<string | null>(null)

  // Compute the line number where a named block starts in its generated file
  const getBlockLineInFile = (blockType: string, blockName: string, filePath: string): number | undefined => {
    const file = generatedProject.files.find(f => f.path === filePath)
    if (!file) return undefined
    const lines = file.content.split('\n')
    const pattern = `${blockType} "${blockName}" {`
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trimStart().startsWith(pattern)) {
        return i + 1 // 1-based line numbers
      }
    }
    return undefined
  }

  // Auto-select file when a DIFFERENT node is selected on the canvas.
  // Only fires when selectedNodeId actually changes — not when nodes/edges update.
  // This prevents the editor from jumping back to the node's file while you're editing another file.
  useEffect(() => {
    if (selectedNodeId === prevSelectedNodeIdRef.current) return
    prevSelectedNodeIdRef.current = selectedNodeId

    // Skip file navigation when selection was driven by cursor movement in the editor
    if (cursorDrivenSelection) return

    if (selectedNodeId && nodes.length > 0) {
      const selectedNode = nodes.find(n => n.id === selectedNodeId)
      if (selectedNode) {
        const data = selectedNode.data as ConnectorNodeData | FlowNodeData
        const name = toIdentifier(data.label)

        // mycelRoot prefix (e.g. 'src/') for generated file paths
        const root = mycelRoot || ''
        const filePathMap: Record<string, string> = {
          connector: (data as ConnectorNodeData).hclFile || `${root}connectors/${name}.mycel`,
          flow: (data as FlowNodeData).hclFile || `${root}flows/flows.mycel`,
          type: (data as Record<string, unknown>).hclFile as string || `${root}types/types.mycel`,
          validator: (data as Record<string, unknown>).hclFile as string || `${root}validators/validators.mycel`,
          transform: (data as Record<string, unknown>).hclFile as string || `${root}transforms/transforms.mycel`,
          aspect: (data as Record<string, unknown>).hclFile as string || `${root}aspects/aspects.mycel`,
          saga: (data as Record<string, unknown>).hclFile as string || `${root}sagas/sagas.mycel`,
          state_machine: (data as Record<string, unknown>).hclFile as string || `${root}machines/machines.mycel`,
        }
        const filePath = filePathMap[selectedNode.type || '']
        if (filePath) {
          const prevPath = prevNodeFileRef.current[selectedNodeId]

          // Compute line to reveal for blocks sharing a file
          let revealLine: number | undefined
          const hclBlockType: Record<string, string> = {
            connector: 'connector', flow: 'flow', type: 'type', validator: 'validator',
            transform: 'transform', aspect: 'aspect', saga: 'saga',
            state_machine: 'state_machine',
          }
          const bt = hclBlockType[selectedNode.type || '']
          if (bt) {
            revealLine = getBlockLineInFile(bt, name, filePath)
          }

          if (prevPath && prevPath !== filePath) {
            // Label changed — rename existing tab instead of opening new one
            const fileName = filePath.split('/').pop() || filePath
            // Use scoped paths for rename so tab IDs stay consistent
            const scopedOld = scopedPath(projectPath, prevPath)
            useEditorPanelStore.getState().renameTab(scopedOld, filePath, fileName)
            // Also try unscoped for backward compat
            if (scopedOld !== prevPath) {
              useEditorPanelStore.getState().renameTab(prevPath, filePath, fileName)
            }
            if (revealLine) {
              setTimeout(() => useEditorPanelStore.getState().setRevealLine(revealLine!), 50)
            }
          } else {
            // Check if this file already has a tab open (avoid duplicates from tab click → selectNode → here)
            const editorState = useEditorPanelStore.getState()
            const scoped = scopedPath(projectPath, filePath)
            const existingTab = editorState.groups.some(g =>
              g.tabs.some(t => {
                const tabRel = unscopePath(t.filePath).relativePath
                return t.id === scoped || t.id === filePath || tabRel === filePath
              })
            )
            if (existingTab) {
              // Tab exists — just activate it and scroll to block if needed
              for (const g of editorState.groups) {
                const tab = g.tabs.find(t => {
                  const tabRel = unscopePath(t.filePath).relativePath
                  return t.id === scoped || t.id === filePath || tabRel === filePath
                })
                if (tab) {
                  editorState.setActiveTab(g.id, tab.id)
                  if (revealLine) {
                    setTimeout(() => useEditorPanelStore.getState().setRevealLine(revealLine!), 50)
                  }
                  break
                }
              }
            } else {
              // Open file (or activate existing tab) and scroll to block
              openFileInEditor(filePath, revealLine, projectPath)
            }
          }

          prevNodeFileRef.current[selectedNodeId] = filePath

          if (projectName) {
            setActiveFile(filePath)
          }
        }
      }
    }
  }, [selectedNodeId, nodes, projectName, setActiveFile, generatedProject])

  const handleFileContextMenu = useCallback((e: React.MouseEvent, path: string, name: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDirContextMenu(null)
    setFileContextMenu({ x: e.clientX, y: e.clientY, path, name })
  }, [])

  const handleDirContextMenu = useCallback((e: React.MouseEvent, dirPath: string) => {
    e.preventDefault()
    e.stopPropagation()
    setFileContextMenu(null)
    setDirContextMenu({ x: e.clientX, y: e.clientY, dirPath })
  }, [])

  const handleStartRename = useCallback((path: string, name: string) => {
    setEditingFile({ path, newName: name })
  }, [])

  const handleCommitRename = useCallback(async () => {
    if (!editingFile || !editingFile.newName.trim()) {
      setEditingFile(null)
      return
    }
    const oldPath = editingFile.path
    const parts = oldPath.split('/')
    parts[parts.length - 1] = editingFile.newName.trim()
    const newPath = parts.join('/')

    if (newPath !== oldPath) {
      await renameFile(oldPath, newPath)
      // Update editor tab if open (use scoped path)
      const fileName = editingFile.newName.trim()
      const scopedOld = scopedPath(projectPath, oldPath)
      useEditorPanelStore.getState().renameTab(scopedOld, newPath, fileName)
    }
    setEditingFile(null)
  }, [editingFile, renameFile, projectPath])

  const handleMoveFile = useCallback(async (path: string) => {
    const newPath = prompt('Move to (relative path):', path)
    if (newPath && newPath.trim() !== path) {
      const success = await renameFile(path, newPath.trim())
      if (success) {
        const fileName = newPath.trim().split('/').pop() || newPath.trim()
        useEditorPanelStore.getState().renameTab(path, newPath.trim(), fileName)
      }
    }
  }, [renameFile])

  const handleDeleteFile = useCallback(async (path: string) => {
    const confirmed = confirm(`Delete "${path}"?`)
    if (confirmed) {
      await deleteFile(path)
      // Close editor tab if open (check both scoped and unscoped)
      const editorStore = useEditorPanelStore.getState()
      const scoped = scopedPath(projectPath, path)
      for (const group of editorStore.groups) {
        const tab = group.tabs.find(t => t.id === scoped || t.id === path)
        if (tab) {
          editorStore.closeTab(group.id, tab.id)
        }
      }
    }
  }, [deleteFile, projectPath])

  const handleCreateFile = useCallback(async (path: string) => {
    await createFile(path)
    openFileInEditor(path)
  }, [createFile])

  const handleCreateDirectory = useCallback(async (path: string) => {
    await createDirectory(path)
  }, [createDirectory])

  // Build file context menu items
  const fileContextMenuItems: ContextMenuItem[] = fileContextMenu ? [
    {
      label: 'Rename',
      icon: <Pencil className="w-3.5 h-3.5" />,
      onClick: () => handleStartRename(fileContextMenu.path, fileContextMenu.name),
    },
    {
      label: 'Move...',
      icon: <FolderInput className="w-3.5 h-3.5" />,
      onClick: () => handleMoveFile(fileContextMenu.path),
    },
    { label: '', separator: true, onClick: () => {} },
    {
      label: 'Open as...',
      onClick: () => {},
      submenu: (() => {
        const hasOverride = !!getLanguageOverride(fileContextMenu.name)
        const reopenFile = () => {
          const fileName = fileContextMenu.path.split('/').pop() || fileContextMenu.path
          const store = useEditorPanelStore.getState()
          store.closeTab(store.activeGroupId, fileContextMenu.path)
          setTimeout(() => useEditorPanelStore.getState().openFile(fileContextMenu.path, fileName), 50)
        }
        const items: ContextMenuItem[] = []
        if (hasOverride) {
          items.push({
            label: 'Reset to auto-detect',
            onClick: () => { removeLanguageOverride(fileContextMenu.name); reopenFile() },
          })
          items.push({ label: '', separator: true, onClick: () => {} })
        }
        for (const lang of KNOWN_LANGUAGES) {
          items.push({
            label: lang.label,
            onClick: () => { setLanguageOverride(fileContextMenu.name, lang.id); reopenFile() },
          })
        }
        return items
      })(),
    },
    { label: '', separator: true, onClick: () => {} },
    {
      label: 'Delete',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      onClick: () => handleDeleteFile(fileContextMenu.path),
      danger: true,
    },
  ] : []

  // Build directory context menu items
  const dirContextMenuItems: ContextMenuItem[] = dirContextMenu ? [
    {
      label: 'New File',
      icon: <FilePlus className="w-3.5 h-3.5" />,
      onClick: () => {},
      submenu: NEW_FILE_TYPES.map(ft => ({
        label: ft.label,
        onClick: () => setNewFileDialog({ fileType: ft, dirPath: dirContextMenu.dirPath }),
      })),
    },
    {
      label: 'New Directory',
      icon: <FolderPlus className="w-3.5 h-3.5" />,
      onClick: () => setNewFileDialog({ fileType: null, dirPath: dirContextMenu.dirPath }),
    },
  ] : []

  // Hidden files that shouldn't appear in the tree
  const HIDDEN_FILES = ['.mycel-studio.json']

  // Merge real project files with generated files (generated files that don't exist on disk)
  const mergedFiles = useMemo(() => {
    const visibleFiles = files.filter(f => !HIDDEN_FILES.includes(f.name))
    const realPaths = new Set(visibleFiles.map(f => f.relativePath))
    const generatedAsProject: ProjectFile[] = generatedProject.files
      .filter(gf => !realPaths.has(gf.path))
      .filter(gf => !HIDDEN_FILES.includes(gf.name))
      .map(gf => ({
        name: gf.name,
        path: gf.path,
        relativePath: gf.path,
        content: gf.content,
        isDirty: false,
        gitStatus: 'new' as const,
      }))
    return [...visibleFiles, ...generatedAsProject]
  }, [files, generatedProject])

  // Build nested tree from merged file list (must be before early returns — hooks order)
  const tree = useMemo(() => buildFileTree(mergedFiles), [mergedFiles])
  // Unscope the active tab ID so it can match against relative file paths in the tree
  const currentActiveFile = editorActiveTabId
    ? unscopePath(editorActiveTabId).relativePath
    : activeFile

  const getOpenLabel = () => {
    if (capabilities.canOpenFolder) {
      return 'Open Project...'
    }
    return 'Import ZIP...'
  }

  // Show virtual project when no real project is open
  if (!projectName) {
    const hasContent = nodes.length > 0

    if (!hasContent) {
      return (
        <div className="p-4 text-center text-neutral-500 text-sm">
          <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No project</p>
          <p className="text-xs mt-1 text-neutral-600">
            Drag components to start
          </p>
          <button
            onClick={() => openProject()}
            className="mt-3 text-indigo-400 hover:text-indigo-300 text-xs"
          >
            or {getOpenLabel()}
          </button>
        </div>
      )
    }

    // Show generated virtual project
    return (
      <VirtualProjectTree
        project={generatedProject}
        activeFile={editorActiveTabId}
        onFileClick={openFileInEditor}
        onOpenProject={() => openProject()}
        openLabel={getOpenLabel()}
      />
    )
  }

  const handleFileClick = (path: string) => {
    setActiveFile(path)
    openFileInEditor(path, undefined, projectPath)
  }

  const treeContent = (
    <FileTreeNode
      node={tree}
      activeFile={currentActiveFile}
      onFileClick={handleFileClick}
      onContextMenu={handleFileContextMenu}
      onDirContextMenu={handleDirContextMenu}
      editingFile={editingFile}
      onEditChange={(name) => setEditingFile(prev => prev ? { ...prev, newName: name } : null)}
      onEditCommit={handleCommitRename}
      onEditCancel={() => setEditingFile(null)}
      getFileSeverity={getFileSeverity}
      getDirSeverity={getDirSeverity}
      isRoot
      parentPath=""
    />
  )

  // When used inside MultiProjectRoot, skip the header (MultiProjectRoot provides its own)
  if (hideHeader) {
    return (
      <div className="text-sm">
        {treeContent}

        {/* File context menu */}
        {fileContextMenu && (
          <ContextMenu
            x={fileContextMenu.x}
            y={fileContextMenu.y}
            items={fileContextMenuItems}
            onClose={() => setFileContextMenu(null)}
          />
        )}

        {/* Directory context menu */}
        {dirContextMenu && (
          <ContextMenu
            x={dirContextMenu.x}
            y={dirContextMenu.y}
            items={dirContextMenuItems}
            onClose={() => setDirContextMenu(null)}
          />
        )}

        {/* New file/folder dialog */}
        {newFileDialog && (
          <NewFileDialog
            fileType={newFileDialog.fileType}
            dirPath={newFileDialog.dirPath}
            onConfirm={(path) => {
              if (newFileDialog.fileType) {
                handleCreateFile(path)
              } else {
                handleCreateDirectory(path)
              }
              setNewFileDialog(null)
            }}
            onCancel={() => setNewFileDialog(null)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="text-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        onContextMenu={(e) => handleDirContextMenu(e, '')}
        className="w-full flex items-center gap-1 px-2 py-1.5 hover:bg-neutral-800 font-medium"
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {isExpanded ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <Folder className="w-4 h-4 text-amber-500" />}
        <span className={`truncate ${(() => {
          // Project root shows worst severity across all files
          const diagFiles = useDiagnosticsStore.getState().files
          const hasErrors = Object.values(diagFiles).some(d => d.severity === 'error')
          const hasWarnings = Object.values(diagFiles).some(d => d.severity === 'warning')
          return hasErrors ? 'diag-error' : hasWarnings ? 'diag-warning' : ''
        })()}`}>{projectName}</span>
      </button>

      {isExpanded && (
        <div className="pl-2">
          {treeContent}
        </div>
      )}

      {/* File context menu */}
      {fileContextMenu && (
        <ContextMenu
          x={fileContextMenu.x}
          y={fileContextMenu.y}
          items={fileContextMenuItems}
          onClose={() => setFileContextMenu(null)}
        />
      )}

      {/* Directory context menu */}
      {dirContextMenu && (
        <ContextMenu
          x={dirContextMenu.x}
          y={dirContextMenu.y}
          items={dirContextMenuItems}
          onClose={() => setDirContextMenu(null)}
        />
      )}

      {/* New file/folder dialog */}
      {newFileDialog && (
        <NewFileDialog
          fileType={newFileDialog.fileType}
          dirPath={newFileDialog.dirPath}
          onConfirm={(path) => {
            if (newFileDialog.fileType) {
              handleCreateFile(path)
            } else {
              handleCreateDirectory(path)
            }
            setNewFileDialog(null)
          }}
          onCancel={() => setNewFileDialog(null)}
        />
      )}
    </div>
  )
}

interface VirtualProjectTreeProps {
  project: { files: GeneratedFile[]; errors: string[] }
  activeFile: string | null
  onFileClick: (path: string) => void
  onOpenProject: () => void
  openLabel: string
}

function VirtualProjectTree({ project, activeFile, onFileClick, onOpenProject, openLabel }: VirtualProjectTreeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['connectors', 'flows', 'types', 'validators', 'transforms', 'aspects', 'sagas', 'machines', 'auth', 'security', 'plugins', 'environments']))

  const toggleDir = (dir: string) => {
    const next = new Set(expandedDirs)
    if (next.has(dir)) {
      next.delete(dir)
    } else {
      next.add(dir)
    }
    setExpandedDirs(next)
  }

  // Group files by directory
  const filesByDir = project.files.reduce((acc, file) => {
    const parts = file.path.split('/')
    const dir = parts.length > 1 ? parts[0] : ''
    if (!acc[dir]) acc[dir] = []
    acc[dir].push(file)
    return acc
  }, {} as Record<string, GeneratedFile[]>)

  const sortedDirs = Object.keys(filesByDir).sort((a, b) => {
    if (a === '') return -1
    if (b === '') return 1
    return a.localeCompare(b)
  })

  return (
    <div className="text-sm">
      {/* Errors */}
      {project.errors.length > 0 && (
        <div className="px-2 py-1 mb-1">
          {project.errors.map((error, i) => (
            <div key={i} className="flex items-start gap-1 text-xs text-amber-500">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Virtual project folder */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-1 px-2 py-1.5 hover:bg-neutral-800 font-medium"
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {isExpanded ? <FolderOpen className="w-4 h-4 text-indigo-400" /> : <Folder className="w-4 h-4 text-indigo-400" />}
        <span className="truncate text-indigo-300">Unsaved Project</span>
      </button>

      {isExpanded && (
        <div className="pl-2">
          {/* Root files */}
          {filesByDir['']?.map((file) => (
            <FileItem
              key={file.path}
              file={file}
              isActive={activeFile === file.path}
              onClick={() => onFileClick(file.path)}
              isGenerated
            />
          ))}

          {/* Directories */}
          {sortedDirs.filter(d => d !== '').map((dir) => (
            <div key={dir}>
              <button
                onClick={() => toggleDir(dir)}
                className="w-full flex items-center gap-1 px-2 py-1 hover:bg-neutral-800 text-neutral-300"
              >
                {expandedDirs.has(dir) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {expandedDirs.has(dir) ? <FolderOpen className="w-3.5 h-3.5 text-indigo-500" /> : <Folder className="w-3.5 h-3.5 text-indigo-500" />}
                <span className="truncate">{dir}</span>
              </button>
              {expandedDirs.has(dir) && (
                <div className="pl-4">
                  {filesByDir[dir].map((file) => (
                    <FileItem
                      key={file.path}
                      file={file}
                      isActive={activeFile === file.path}
                      onClick={() => onFileClick(file.path)}
                      isGenerated
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Open project button */}
          <button
            onClick={onOpenProject}
            className="w-full flex items-center gap-2 px-2 py-1 text-sm text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded mt-2"
          >
            <Package className="w-4 h-4" />
            <span>{openLabel}</span>
          </button>
        </div>
      )}
    </div>
  )
}

// Recursive tree node for files/directories
interface TreeNode {
  name: string
  children: Map<string, TreeNode>
  files: ProjectFile[]
}

// Derive a directory's git status from all descendant files
function getDirGitStatus(node: TreeNode): string | undefined {
  const statuses = new Set<string>()
  for (const file of node.files) {
    if (file.gitStatus) statuses.add(file.gitStatus)
  }
  for (const child of node.children.values()) {
    const childStatus = getDirGitStatus(child)
    if (childStatus) statuses.add(childStatus)
  }
  if (statuses.size === 0) return undefined
  // If ALL descendants are ignored, directory is ignored
  if (statuses.size === 1 && statuses.has('ignored')) return 'ignored'
  // If ALL descendants are new/untracked, directory is new
  if ([...statuses].every(s => s === 'new' || s === 'untracked')) return 'new'
  return undefined
}

function buildFileTree(files: ProjectFile[]): TreeNode {
  const root: TreeNode = { name: '', children: new Map(), files: [] }

  for (const file of files) {
    const parts = file.relativePath.split('/')
    let current = root

    // Navigate/create directory nodes
    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i]
      if (!current.children.has(dirName)) {
        current.children.set(dirName, { name: dirName, children: new Map(), files: [] })
      }
      current = current.children.get(dirName)!
    }

    current.files.push(file)
  }

  return root
}

function FileTreeNode({
  node,
  activeFile,
  onFileClick,
  onContextMenu,
  onDirContextMenu,
  editingFile,
  onEditChange,
  onEditCommit,
  onEditCancel,
  getFileSeverity,
  getDirSeverity,
  isRoot,
  parentPath,
}: {
  node: TreeNode
  activeFile: string | null
  onFileClick: (path: string) => void
  onContextMenu?: (e: React.MouseEvent, path: string, name: string) => void
  onDirContextMenu?: (e: React.MouseEvent, dirPath: string) => void
  editingFile?: { path: string; newName: string } | null
  onEditChange?: (name: string) => void
  onEditCommit?: () => void
  onEditCancel?: () => void
  getFileSeverity?: (path: string) => DiagnosticSeverity
  getDirSeverity?: (path: string) => DiagnosticSeverity
  isRoot?: boolean
  parentPath: string
}) {
  const [isExpanded, setIsExpanded] = useState(true)

  const dirPath = isRoot ? parentPath : (parentPath ? `${parentPath}/${node.name}` : node.name)

  // Sort: directories first, then files
  const sortedDirs = [...node.children.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const sortedFiles = [...node.files].sort((a, b) => a.name.localeCompare(b.name))

  const renderFile = (file: ProjectFile) => (
    <FileItem
      key={file.relativePath}
      file={file}
      isActive={activeFile === file.relativePath}
      onClick={() => onFileClick(file.relativePath)}
      diagSeverity={getFileSeverity?.(file.relativePath)}
      onContextMenu={onContextMenu ? (e) => onContextMenu(e, file.relativePath, file.name) : undefined}
      isEditing={editingFile?.path === file.relativePath}
      editName={editingFile?.path === file.relativePath ? editingFile.newName : undefined}
      onEditChange={onEditChange}
      onEditCommit={onEditCommit}
      onEditCancel={onEditCancel}
    />
  )

  const childProps = { activeFile, onFileClick, onContextMenu, onDirContextMenu, editingFile, onEditChange, onEditCommit, onEditCancel, getFileSeverity, getDirSeverity }

  if (isRoot) {
    return (
      <>
        {sortedDirs.map(([name, child]) => (
          <FileTreeNode key={name} node={child} {...childProps} parentPath={dirPath} />
        ))}
        {sortedFiles.map(renderFile)}
      </>
    )
  }

  const dirStatus = getDirGitStatus(node)
  const dirNameColor = dirStatus ? (gitStatusNameColors[dirStatus] || '') : ''

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        onContextMenu={(e) => { if (onDirContextMenu) { e.preventDefault(); e.stopPropagation(); onDirContextMenu(e, dirPath) } }}
        className="w-full flex items-center gap-1 px-2 py-1 hover:bg-neutral-800 text-neutral-300"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {isExpanded ? <FolderOpen className="w-3.5 h-3.5 text-amber-600" /> : <Folder className="w-3.5 h-3.5 text-amber-600" />}
        <span className={`truncate ${dirNameColor} ${(() => {
          const ds = getDirSeverity?.(dirPath)
          return ds === 'error' ? 'diag-error' : ds === 'warning' ? 'diag-warning' : ''
        })()}`}>{node.name}</span>
      </button>
      {isExpanded && (
        <div className="pl-4">
          {sortedDirs.map(([name, child]) => (
            <FileTreeNode key={name} node={child} {...childProps} parentPath={dirPath} />
          ))}
          {sortedFiles.map(renderFile)}
        </div>
      )}
    </div>
  )
}

// Multi-root project header with expand/collapse, git branch, detach, drag reorder
function MultiProjectRoot({ projectId, projectName, gitBranch, onDetach, index }: {
  projectId: string
  projectName: string
  gitBranch: string | null
  onDetach: () => void
  index: number
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const multiStore = useMultiProjectStore()

  // When a file is clicked, silently switch active project if needed, then open the file
  const handleFileClick = useCallback((filePath: string) => {
    const currentActive = useMultiProjectStore.getState().activeProjectId
    if (currentActive !== projectId) {
      useMultiProjectStore.getState().setActiveProject(projectId)
    }
    // Always pass the project's path so tabs get scoped IDs
    const proj = useMultiProjectStore.getState().projects.get(projectId)
    const pp = proj?.projectPath ?? null
    setTimeout(() => {
      useProjectStore.getState().setActiveFile(filePath)
      openFileInEditor(filePath, undefined, pp)
    }, currentActive !== projectId ? 50 : 0)
  }, [projectId])

  // Drag reorder
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
  }, [index])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
    if (!isNaN(fromIndex) && fromIndex !== index) {
      multiStore.reorderProjects(fromIndex, index)
    }
  }, [index, multiStore])

  // Get files for this project from snapshot or live store
  const project = multiStore.projects.get(projectId)
  const isActiveProject = multiStore.activeProjectId === projectId

  // For the active project, use live store files. For inactive, use snapshot.
  const projectFiles = isActiveProject
    ? useProjectStore.getState().files
    : (project?.files || [])

  return (
    <div>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="flex items-center gap-1 px-2 py-1.5 hover:bg-neutral-800 font-medium cursor-pointer group text-white"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {isExpanded ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <Folder className="w-4 h-4 text-amber-500" />}
        <span className="truncate flex-1">{projectName}</span>
        {gitBranch && (
          <span className="text-xs text-neutral-500 flex items-center gap-0.5 shrink-0">
            <GitBranch className="w-3 h-3" />
            {gitBranch}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDetach() }}
          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-700 shrink-0"
          title="Remove from workspace"
        >
          <X className="w-3 h-3 text-neutral-400" />
        </button>
      </div>
      {isExpanded && isActiveProject && (
        <div className="pl-2">
          <SingleProjectFileTree hideHeader />
        </div>
      )}
      {isExpanded && !isActiveProject && projectFiles.length > 0 && (
        <div className="pl-2">
          <StaticFileTree
            files={projectFiles}
            projectPath={project?.projectPath}
            onFileClick={handleFileClick}
          />
        </div>
      )}
    </div>
  )
}

// Simplified read-only file tree for inactive projects (shows files from snapshot)
function StaticFileTree({ files, projectPath: treeProjPath, onFileClick }: { files: ProjectFile[]; projectPath?: string | null; onFileClick: (path: string) => void }) {
  const editorActiveTabId = useEditorPanelStore(s => s.groups.find(g => g.id === s.activeGroupId)?.activeTabId || null)
  // Unscope the active tab ID and check if it belongs to this project
  const activeRelPath = editorActiveTabId ? (() => {
    const { projectPath: pp, relativePath } = unscopePath(editorActiveTabId)
    // Only highlight if this tab belongs to this project (or is unscoped)
    if (pp && treeProjPath && pp !== treeProjPath) return null
    return relativePath
  })() : null

  const HIDDEN_FILES = ['.mycel-studio.json']
  const visibleFiles = files.filter(f => !HIDDEN_FILES.includes(f.name))
  const tree = useMemo(() => buildFileTree(visibleFiles), [visibleFiles])

  // Sort: directories first, then files
  const renderNode = (node: TreeNode, parentPath: string, isRoot?: boolean): React.ReactNode => {
    const dirPath = isRoot ? parentPath : (parentPath ? `${parentPath}/${node.name}` : node.name)
    const sortedDirs = [...node.children.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    const sortedFiles = [...node.files].sort((a, b) => a.name.localeCompare(b.name))

    if (isRoot) {
      return (
        <>
          {sortedDirs.map(([, child]) => renderNode(child, dirPath))}
          {sortedFiles.map(f => (
            <FileItem
              key={f.relativePath}
              file={f}
              isActive={activeRelPath === f.relativePath}
              onClick={() => onFileClick(f.relativePath)}
            />
          ))}
        </>
      )
    }

    return (
      <StaticDirNode key={node.name} name={node.name}>
        {sortedDirs.map(([, child]) => renderNode(child, dirPath))}
        {sortedFiles.map(f => (
          <FileItem
            key={f.relativePath}
            file={f}
            isActive={activeRelPath === f.relativePath}
            onClick={() => onFileClick(f.relativePath)}
          />
        ))}
      </StaticDirNode>
    )
  }

  return <>{renderNode(tree, '', true)}</>
}

function StaticDirNode({ name, children }: { name: string; children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true)
  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-1 px-2 py-1 hover:bg-neutral-800 text-neutral-300"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {isExpanded ? <FolderOpen className="w-3.5 h-3.5 text-amber-600" /> : <Folder className="w-3.5 h-3.5 text-amber-600" />}
        <span className="truncate">{name}</span>
      </button>
      {isExpanded && <div className="pl-4">{children}</div>}
    </div>
  )
}

export default function FileTree() {
  const { projectOrder, projects } = useMultiProjectStore()

  // If there are 0-1 projects in multi-project store, use single project tree directly
  if (projectOrder.length <= 1) {
    return <SingleProjectFileTree />
  }

  // Multiple projects — all expanded independently, no "active" styling difference
  return (
    <div className="text-sm">
      {projectOrder.map((id, index) => {
        const project = projects.get(id)
        if (!project) return null
        return (
          <MultiProjectRoot
            key={id}
            projectId={id}
            projectName={project.projectName || 'Unnamed Project'}
            gitBranch={project.gitBranch}
            onDetach={async () => {
              const proj = useMultiProjectStore.getState().projects.get(id)
              useMultiProjectStore.getState().removeProject(id)
              // Clean up workspace files — remove attachment from child and parent
              if (proj?.projectPath) {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const app = (window as any).go?.main?.App
                  if (app?.WriteFileAtPath) {
                    // Remove workspace role from detached project (make it standalone)
                    const detachedWsPath = `${proj.projectPath}/.mycel-studio.json`
                    try {
                      const content = await app.ReadFileAtPath(detachedWsPath)
                      const ws = JSON.parse(content)
                      delete ws.workspace
                      ws.version = '1.0'
                      await app.WriteFileAtPath(detachedWsPath, JSON.stringify(ws, null, 2))
                    } catch { /* file may not exist */ }
                  }
                  // Re-save remaining projects' workspace
                  const { saveAllProjectWorkspaces } = await import('../../stores/useWorkspaceStore')
                  saveAllProjectWorkspaces(null)
                } catch (err) {
                  console.error('Failed to clean up workspace on detach:', err)
                }
              }
            }}
            index={index}
          />
        )
      })}
    </div>
  )
}
