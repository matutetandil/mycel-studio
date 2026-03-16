import { useProjectStore } from '../stores/useProjectStore'
import { GitBranch } from 'lucide-react'

export default function StatusBar() {
  const gitBranch = useProjectStore((s) => s.gitBranch)
  const projectName = useProjectStore((s) => s.projectName)

  return (
    <div className="h-6 flex items-center px-3 bg-neutral-900 border-t border-neutral-800 text-[11px] text-neutral-400 select-none shrink-0">
      <div className="flex items-center gap-3">
        {gitBranch && (
          <span className="flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            {gitBranch}
          </span>
        )}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        {projectName && (
          <span>{projectName}</span>
        )}
      </div>
    </div>
  )
}
