import {
  FileCode,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Circle,
  Plus,
  Package,
  AlertTriangle,
} from 'lucide-react'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useProjectStore, type ProjectFile } from '../../stores/useProjectStore'
import { useStudioStore } from '../../stores/useStudioStore'
import { useEditorPanelStore } from '../../stores/useEditorPanelStore'
import { generateProject, toIdentifier, type GeneratedFile } from '../../utils/hclGenerator'
import type { ConnectorNodeData, FlowNodeData } from '../../types'

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
}

function FileItem({ file, isActive, onClick, isGenerated }: FileItemProps) {
  const projectFile = file as ProjectFile
  const statusColor = gitStatusColors[projectFile.gitStatus || 'clean']
  const statusIcon = gitStatusIcons[projectFile.gitStatus || 'clean']

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2 px-2 py-1 text-sm rounded
        ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-800 text-neutral-300'}
      `}
    >
      <FileCode className={`w-4 h-4 shrink-0 ${isGenerated ? 'text-indigo-400' : 'text-amber-500'}`} />
      <span className="flex-1 text-left truncate">{file.name}</span>
      {projectFile.isDirty && (
        <Circle className="w-2 h-2 fill-current text-amber-500" />
      )}
      {statusIcon && (
        <span className={`text-xs font-medium ${statusColor}`}>
          {statusIcon}
        </span>
      )}
    </button>
  )
}

function openFileInEditor(filePath: string) {
  const fileName = filePath.split('/').pop() || filePath
  useEditorPanelStore.getState().openFile(filePath, fileName)
  // Auto-expand editor if collapsed
  const { isCollapsed, toggleCollapse } = useEditorPanelStore.getState()
  if (isCollapsed) toggleCollapse()
}

export default function FileTree() {
  const { projectName, files, activeFile, setActiveFile, openProject, createFile, capabilities } = useProjectStore()
  const { nodes, edges, selectedNodeId, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig } = useStudioStore()
  const editorActiveTabId = useEditorPanelStore(s => s.groups.find(g => g.id === s.activeGroupId)?.activeTabId || null)
  const [isExpanded, setIsExpanded] = useState(true)

  // Generate project from canvas
  const generatedProject = useMemo(() => generateProject(nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig), [nodes, edges, serviceConfig, authConfig, envConfig, securityConfig, pluginConfig])

  // Track the previously opened file per node, so we can rename tabs on label change
  const prevNodeFileRef = useRef<Record<string, string>>({})

  // Auto-select file when component is selected
  useEffect(() => {
    if (selectedNodeId && nodes.length > 0) {
      const selectedNode = nodes.find(n => n.id === selectedNodeId)
      if (selectedNode) {
        const data = selectedNode.data as ConnectorNodeData | FlowNodeData
        const name = toIdentifier(data.label)

        const filePathMap: Record<string, string> = {
          connector: `connectors/${name}.hcl`,
          flow: (data as FlowNodeData).hclFile || 'flows/flows.hcl',
          type: 'types/types.hcl',
          validator: 'validators/validators.hcl',
          transform: 'transforms/transforms.hcl',
          aspect: 'aspects/aspects.hcl',
          saga: 'sagas/sagas.hcl',
          state_machine: 'machines/machines.hcl',
        }
        const filePath = filePathMap[selectedNode.type || '']
        if (filePath) {
          const prevPath = prevNodeFileRef.current[selectedNodeId]

          if (prevPath && prevPath !== filePath) {
            // Label changed — rename existing tab instead of opening new one
            const fileName = filePath.split('/').pop() || filePath
            useEditorPanelStore.getState().renameTab(prevPath, filePath, fileName)
          } else if (!prevPath) {
            // First time selecting — open file
            openFileInEditor(filePath)
          }

          prevNodeFileRef.current[selectedNodeId] = filePath

          if (projectName) {
            setActiveFile(filePath)
          }
        }
      }
    }
  }, [selectedNodeId, nodes, projectName, setActiveFile])

  const handleNewFile = () => {
    const fileName = prompt('Enter file name (e.g., flows/users.hcl):')
    if (fileName) {
      createFile(fileName)
    }
  }

  const getOpenLabel = () => {
    if (capabilities.canOpenFolder) {
      return 'Open Folder...'
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

  // Show real project files
  const filesByDir = files.reduce((acc, file) => {
    const parts = file.relativePath.split('/')
    const dir = parts.length > 1 ? parts[0] : ''
    if (!acc[dir]) acc[dir] = []
    acc[dir].push(file)
    return acc
  }, {} as Record<string, ProjectFile[]>)

  const sortedDirs = Object.keys(filesByDir).sort((a, b) => {
    if (a === '') return -1
    if (b === '') return 1
    return a.localeCompare(b)
  })

  return (
    <div className="text-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-1 px-2 py-1.5 hover:bg-neutral-800 font-medium"
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {isExpanded ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <Folder className="w-4 h-4 text-amber-500" />}
        <span className="truncate">{projectName}</span>
      </button>

      {isExpanded && (
        <div className="pl-2">
          {sortedDirs.map((dir) => (
            <DirectorySection
              key={dir || 'root'}
              name={dir}
              files={filesByDir[dir]}
              activeFile={activeFile}
              onFileClick={setActiveFile}
            />
          ))}

          <button
            onClick={handleNewFile}
            className="w-full flex items-center gap-2 px-2 py-1 text-sm text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded mt-1"
          >
            <Plus className="w-4 h-4" />
            <span>New file...</span>
          </button>
        </div>
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

interface DirectorySectionProps {
  name: string
  files: ProjectFile[]
  activeFile: string | null
  onFileClick: (relativePath: string) => void
}

function DirectorySection({ name, files, activeFile, onFileClick }: DirectorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (!name) {
    return (
      <>
        {files.map((file) => (
          <FileItem
            key={file.relativePath}
            file={file}
            isActive={activeFile === file.relativePath}
            onClick={() => onFileClick(file.relativePath)}
          />
        ))}
      </>
    )
  }

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-1 px-2 py-1 hover:bg-neutral-800 text-neutral-400"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {isExpanded ? <FolderOpen className="w-3.5 h-3.5 text-amber-600" /> : <Folder className="w-3.5 h-3.5 text-amber-600" />}
        <span className="truncate">{name}</span>
      </button>
      {isExpanded && (
        <div className="pl-4">
          {files.map((file) => (
            <FileItem
              key={file.relativePath}
              file={file}
              isActive={activeFile === file.relativePath}
              onClick={() => onFileClick(file.relativePath)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
