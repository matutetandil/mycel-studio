import {
  FileCode,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Circle,
  Plus,
  Package,
} from 'lucide-react'
import { useState } from 'react'
import { useProjectStore, type ProjectFile } from '../../stores/useProjectStore'

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
  file: ProjectFile
  isActive: boolean
  onClick: () => void
}

function FileItem({ file, isActive, onClick }: FileItemProps) {
  const statusColor = gitStatusColors[file.gitStatus || 'clean']
  const statusIcon = gitStatusIcons[file.gitStatus || 'clean']

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2 px-2 py-1 text-sm rounded
        ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-800 text-neutral-300'}
      `}
    >
      <FileCode className="w-4 h-4 shrink-0 text-amber-500" />
      <span className="flex-1 text-left truncate">{file.name}</span>
      {file.isDirty && (
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

export default function FileTree() {
  const { projectName, files, activeFile, setActiveFile, openProject, createFile, capabilities } = useProjectStore()
  const [isExpanded, setIsExpanded] = useState(true)

  const handleNewFile = () => {
    // TODO: Show dialog to create new file
    const fileName = prompt('Enter file name (e.g., flows/users.hcl):')
    if (fileName) {
      createFile(fileName)
    }
  }

  // Get button label based on provider
  const getOpenLabel = () => {
    if (capabilities.canOpenFolder) {
      return 'Open Folder...'
    }
    return 'Import ZIP...'
  }

  if (!projectName) {
    return (
      <div className="p-4 text-center text-neutral-500 text-sm">
        <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No project open</p>
        <button
          onClick={() => openProject()}
          className="mt-2 text-indigo-400 hover:text-indigo-300 text-xs"
        >
          {getOpenLabel()}
        </button>
        <div className="mt-3 flex flex-col items-center gap-1 text-xs text-neutral-600">
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            <span>
              {capabilities.providerName === 'browser' && 'Chrome/Edge'}
              {capabilities.providerName === 'fallback' && 'Safari/Firefox'}
            </span>
          </div>
          {capabilities.providerName === 'fallback' && (
            <span className="text-amber-600 text-center">
              Use Chrome or Edge for folder access
            </span>
          )}
        </div>
      </div>
    )
  }

  // Group files by directory
  const filesByDir = files.reduce((acc, file) => {
    const parts = file.relativePath.split('/')
    const dir = parts.length > 1 ? parts[0] : ''
    if (!acc[dir]) acc[dir] = []
    acc[dir].push(file)
    return acc
  }, {} as Record<string, ProjectFile[]>)

  // Sort directories: root files first, then alphabetically
  const sortedDirs = Object.keys(filesByDir).sort((a, b) => {
    if (a === '') return -1
    if (b === '') return 1
    return a.localeCompare(b)
  })

  return (
    <div className="text-sm">
      {/* Project folder */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-1 px-2 py-1.5 hover:bg-neutral-800 font-medium"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-amber-500" />
        ) : (
          <Folder className="w-4 h-4 text-amber-500" />
        )}
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

          {/* New file button */}
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

interface DirectorySectionProps {
  name: string
  files: ProjectFile[]
  activeFile: string | null
  onFileClick: (relativePath: string) => void
}

function DirectorySection({ name, files, activeFile, onFileClick }: DirectorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Root files (no directory)
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
        {isExpanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        {isExpanded ? (
          <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
        ) : (
          <Folder className="w-3.5 h-3.5 text-amber-600" />
        )}
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
