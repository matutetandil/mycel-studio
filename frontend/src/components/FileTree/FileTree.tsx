import {
  FileCode,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Circle,
  Plus,
} from 'lucide-react'
import { useState } from 'react'
import { useProjectStore, type ProjectFile } from '../../stores/useProjectStore'

const gitStatusColors: Record<string, string> = {
  clean: 'text-neutral-500',
  modified: 'text-amber-500',
  new: 'text-green-500',
  deleted: 'text-red-500',
  ignored: 'text-neutral-600',
}

const gitStatusIcons: Record<string, string> = {
  clean: '',
  modified: 'M',
  new: 'U',
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
  const { projectName, files, activeFile, setActiveFile } = useProjectStore()
  const [isExpanded, setIsExpanded] = useState(true)

  if (!projectName) {
    return (
      <div className="p-4 text-center text-neutral-500 text-sm">
        <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No project open</p>
        <button className="mt-2 text-indigo-400 hover:text-indigo-300 text-xs">
          Open Project...
        </button>
      </div>
    )
  }

  // Group files by type
  const hclFiles = files.filter((f) => f.name.endsWith('.hcl'))
  const otherFiles = files.filter((f) => !f.name.endsWith('.hcl'))

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
        <div className="pl-4">
          {/* HCL Files */}
          {hclFiles.map((file) => (
            <FileItem
              key={file.path}
              file={file}
              isActive={activeFile === file.path}
              onClick={() => setActiveFile(file.path)}
            />
          ))}

          {/* Other files */}
          {otherFiles.length > 0 && (
            <>
              <div className="border-t border-neutral-800 my-2" />
              {otherFiles.map((file) => (
                <FileItem
                  key={file.path}
                  file={file}
                  isActive={activeFile === file.path}
                  onClick={() => setActiveFile(file.path)}
                />
              ))}
            </>
          )}

          {/* New file button */}
          <button className="w-full flex items-center gap-2 px-2 py-1 text-sm text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded mt-1">
            <Plus className="w-4 h-4" />
            <span>New file...</span>
          </button>
        </div>
      )}
    </div>
  )
}
