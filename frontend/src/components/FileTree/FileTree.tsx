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
} from 'lucide-react'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useProjectStore, type ProjectFile } from '../../stores/useProjectStore'
import { useStudioStore } from '../../stores/useStudioStore'
import { useEditorPanelStore } from '../../stores/useEditorPanelStore'
import { generateProject, toIdentifier, type GeneratedFile } from '../../utils/hclGenerator'
import type { ConnectorNodeData, FlowNodeData } from '../../types'
import ContextMenu, { type ContextMenuItem } from '../ContextMenu'
import { getFileTypeInfo, KNOWN_LANGUAGES, setLanguageOverride, getLanguageOverride, removeLanguageOverride, NEW_FILE_TYPES, resolveFileName, type NewFileType } from '../../utils/fileIcons'

const gitStatusColors: Record<string, string> = {
  clean: 'text-neutral-500',
  modified: 'text-amber-500',
  new: 'text-green-500',
  added: 'text-green-500',
  untracked: 'text-green-500',
  deleted: 'text-red-500',
  ignored: 'text-neutral-600',
}

const gitStatusIcons: Record<string, string> = {
  clean: '',
  modified: 'M',
  new: 'U',
  added: 'A',
  untracked: 'U',
  deleted: 'D',
  ignored: '',
}

interface FileItemProps {
  file: ProjectFile | GeneratedFile
  isActive: boolean
  onClick: () => void
  isGenerated?: boolean
  onContextMenu?: (e: React.MouseEvent) => void
  isEditing?: boolean
  editName?: string
  onEditChange?: (name: string) => void
  onEditCommit?: () => void
  onEditCancel?: () => void
}

function FileItem({ file, isActive, onClick, isGenerated, onContextMenu, isEditing, editName, onEditChange, onEditCommit, onEditCancel }: FileItemProps) {
  const projectFile = file as ProjectFile
  const statusColor = gitStatusColors[projectFile.gitStatus || 'clean']
  const statusIcon = gitStatusIcons[projectFile.gitStatus || 'clean']
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
        <span className="flex-1 text-left truncate">{file.name}</span>
      )}
      {!isEditing && projectFile.isDirty && (
        <Circle className="w-2 h-2 fill-current text-amber-500" />
      )}
      {!isEditing && statusIcon && (
        <span className={`text-xs font-medium ${statusColor}`}>
          {statusIcon}
        </span>
      )}
    </button>
  )
}

function openFileInEditor(filePath: string, revealLine?: number) {
  const fileName = filePath.split('/').pop() || filePath
  useEditorPanelStore.getState().openFile(filePath, fileName)
  // Auto-expand editor if collapsed
  const { isCollapsed, toggleCollapse } = useEditorPanelStore.getState()
  if (isCollapsed) toggleCollapse()
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

export default function FileTree() {
  const { projectName, files, activeFile, setActiveFile, openProject, createFile, createDirectory, deleteFile, renameFile, capabilities, mycelRoot } = useProjectStore()
  const { nodes, edges, selectedNodeId, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig } = useStudioStore()
  const editorActiveTabId = useEditorPanelStore(s => s.groups.find(g => g.id === s.activeGroupId)?.activeTabId || null)
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

  // Auto-select file when component is selected
  useEffect(() => {
    if (selectedNodeId && nodes.length > 0) {
      const selectedNode = nodes.find(n => n.id === selectedNodeId)
      if (selectedNode) {
        const data = selectedNode.data as ConnectorNodeData | FlowNodeData
        const name = toIdentifier(data.label)

        const filePathMap: Record<string, string> = {
          connector: (data as ConnectorNodeData).hclFile || `connectors/${name}.hcl`,
          flow: (data as FlowNodeData).hclFile || 'flows/flows.hcl',
          type: (data as Record<string, unknown>).hclFile as string || 'types/types.hcl',
          validator: (data as Record<string, unknown>).hclFile as string || 'validators/validators.hcl',
          transform: (data as Record<string, unknown>).hclFile as string || 'transforms/transforms.hcl',
          aspect: (data as Record<string, unknown>).hclFile as string || 'aspects/aspects.hcl',
          saga: (data as Record<string, unknown>).hclFile as string || 'sagas/sagas.hcl',
          state_machine: (data as Record<string, unknown>).hclFile as string || 'machines/machines.hcl',
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
            useEditorPanelStore.getState().renameTab(prevPath, filePath, fileName)
            if (revealLine) {
              setTimeout(() => useEditorPanelStore.getState().setRevealLine(revealLine!), 50)
            }
          } else {
            // Open file (or activate existing tab) and scroll to block
            openFileInEditor(filePath, revealLine)
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
      // Update editor tab if open
      const fileName = editingFile.newName.trim()
      useEditorPanelStore.getState().renameTab(oldPath, newPath, fileName)
    }
    setEditingFile(null)
  }, [editingFile, renameFile])

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
      // Close editor tab if open
      const editorStore = useEditorPanelStore.getState()
      for (const group of editorStore.groups) {
        if (group.tabs.some(t => t.filePath === path)) {
          editorStore.closeTab(group.id, path)
        }
      }
    }
  }, [deleteFile])

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
  const currentActiveFile = editorActiveTabId || activeFile

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
    openFileInEditor(path)
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
        <span className="truncate">{projectName}</span>
      </button>

      {isExpanded && (
        <div className="pl-2">
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
            isRoot
            parentPath=""
          />
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
                className="w-full flex items-center gap-1 px-2 py-1 hover:bg-neutral-800 text-neutral-400"
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
      onContextMenu={onContextMenu ? (e) => onContextMenu(e, file.relativePath, file.name) : undefined}
      isEditing={editingFile?.path === file.relativePath}
      editName={editingFile?.path === file.relativePath ? editingFile.newName : undefined}
      onEditChange={onEditChange}
      onEditCommit={onEditCommit}
      onEditCancel={onEditCancel}
    />
  )

  const childProps = { activeFile, onFileClick, onContextMenu, onDirContextMenu, editingFile, onEditChange, onEditCommit, onEditCancel }

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

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        onContextMenu={(e) => { if (onDirContextMenu) { e.preventDefault(); e.stopPropagation(); onDirContextMenu(e, dirPath) } }}
        className="w-full flex items-center gap-1 px-2 py-1 hover:bg-neutral-800 text-neutral-400"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {isExpanded ? <FolderOpen className="w-3.5 h-3.5 text-amber-600" /> : <Folder className="w-3.5 h-3.5 text-amber-600" />}
        <span className="truncate">{node.name}</span>
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
