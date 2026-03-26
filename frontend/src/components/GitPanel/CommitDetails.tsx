// Shows commit info + changed files list when a commit is selected

import { FileCode, FilePlus, FileX, FilePen, ArrowRight } from 'lucide-react'
import { useGitStore } from '../../stores/useGitStore'
import { useEditorPanelStore } from '../../stores/useEditorPanelStore'
import { apiGetGitFileAtCommit } from '../../lib/api'
import { getLanguageForFile } from '../../utils/fileIcons'

const STATUS_ICONS: Record<string, { icon: typeof FileCode; color: string; label: string }> = {
  A: { icon: FilePlus, color: 'text-green-400', label: 'Added' },
  M: { icon: FilePen, color: 'text-sky-400', label: 'Modified' },
  D: { icon: FileX, color: 'text-red-400', label: 'Deleted' },
  R: { icon: ArrowRight, color: 'text-amber-400', label: 'Renamed' },
}

export default function CommitDetails() {
  const { selectedCommit, commitFiles, isLoading } = useGitStore()

  if (!selectedCommit) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 text-xs">
        Select a commit to view details
      </div>
    )
  }

  const handleFileClick = async (filePath: string, status: string) => {
    if (status === 'D') return // Can't show diff for deleted file (no "after")

    const hash = selectedCommit.hash
    let original = ''
    let modified = ''

    try {
      if (status === 'A') {
        modified = await apiGetGitFileAtCommit(hash, filePath)
      } else {
        original = await apiGetGitFileAtCommit(hash + '~1', filePath)
        modified = await apiGetGitFileAtCommit(hash, filePath)
      }
    } catch {
      // Parent might not exist for initial commit
      try { modified = await apiGetGitFileAtCommit(hash, filePath) } catch { /* ignore */ }
    }

    const fileName = filePath.split('/').pop() || filePath
    useEditorPanelStore.getState().openDiff(
      `${hash.substring(0, 8)}-${filePath}`,
      `${fileName} (${selectedCommit.abbrev})`,
      original, modified,
      `${selectedCommit.abbrev}~1`, selectedCommit.abbrev,
      getLanguageForFile(fileName),
    )
  }

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      {/* Commit header */}
      <div className="px-3 py-2 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded">
            {selectedCommit.abbrev}
          </span>
          <span className="text-[10px] text-neutral-500">{selectedCommit.date.substring(0, 10)}</span>
        </div>
        <div className="text-xs text-neutral-300 font-medium">{selectedCommit.message}</div>
        <div className="text-[10px] text-neutral-500 mt-0.5">{selectedCommit.author}</div>
      </div>

      {/* Changed files */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 text-xs text-neutral-500">Loading files...</div>
        ) : commitFiles.length === 0 ? (
          <div className="p-3 text-xs text-neutral-500">No files changed</div>
        ) : (
          <div className="py-1">
            <div className="px-3 py-1 text-[10px] text-neutral-500">
              {commitFiles.length} file{commitFiles.length > 1 ? 's' : ''} changed
            </div>
            {commitFiles.map(file => {
              const info = STATUS_ICONS[file.status] || STATUS_ICONS.M
              const Icon = info.icon
              return (
                <button
                  key={file.path}
                  onClick={() => handleFileClick(file.path, file.status)}
                  className="w-full flex items-center gap-2 px-3 py-1 text-xs hover:bg-neutral-800 text-left"
                  title={`${info.label}: ${file.path}`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${info.color}`} />
                  <span className="truncate text-neutral-300">{file.path}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
