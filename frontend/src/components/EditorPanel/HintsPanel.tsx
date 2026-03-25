// SOLID organization hints panel — shows all suggestions with apply/dismiss actions
// Similar to IntelliJ's "Problems" panel but for project organization

import { useEffect } from 'react'
import { Lightbulb, Check, X, FolderInput, FileWarning, Layers, FolderTree, Settings, ArrowRight } from 'lucide-react'
import { useHintsStore, type TrackedHint } from '../../stores/useHintsStore'
import { executeHint } from '../../utils/refactorUtils'

const HINT_ICONS: Record<number, typeof Lightbulb> = {
  1: Layers,         // MultipleBlocksInFile
  2: FileWarning,    // FileNameMismatch
  3: Layers,         // MixedTypesInFile
  4: FolderInput,    // WrongDirectory
  5: Settings,       // ServiceNotInConfig
  6: FolderTree,     // NoDirectoryStructure
}

const HINT_COLORS: Record<number, string> = {
  1: 'text-amber-400',
  2: 'text-sky-400',
  3: 'text-amber-400',
  4: 'text-orange-400',
  5: 'text-violet-400',
  6: 'text-indigo-400',
}

function HintItem({ tracked, index }: { tracked: TrackedHint; index: number }) {
  const { applyHint, dismissHint } = useHintsStore()
  const Icon = HINT_ICONS[tracked.hint.kind] || Lightbulb
  const color = HINT_COLORS[tracked.hint.kind] || 'text-amber-400'
  const isApplied = tracked.status === 'applied'
  const isDismissed = tracked.status === 'dismissed'

  const handleApply = async () => {
    const success = await executeHint(tracked.hint)
    if (success) {
      applyHint(index)
      // Refresh hints after applying
      useHintsStore.getState().refreshHints()
    }
  }

  return (
    <div className={`flex items-start gap-2 px-3 py-2 border-b border-neutral-800 ${
      isApplied ? 'opacity-40' : isDismissed ? 'opacity-60' : 'hover:bg-neutral-800/50'
    }`}>
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isApplied ? 'text-green-500' : color}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs ${isApplied ? 'line-through text-neutral-500' : 'text-neutral-300'}`}>
          {tracked.hint.message}
        </p>
        {tracked.hint.suggestedFile && !isApplied && (
          <p className="text-[10px] text-neutral-500 mt-0.5 flex items-center gap-1">
            <ArrowRight className="w-3 h-3" />
            {tracked.hint.suggestedFile}
          </p>
        )}
        {tracked.hint.file && (
          <p className="text-[10px] text-neutral-600 mt-0.5">{tracked.hint.file}</p>
        )}
      </div>
      {!isApplied && (
        <div className="flex items-center gap-1 shrink-0">
          {tracked.hint.suggestedFile && tracked.status === 'active' && (
            <button
              onClick={handleApply}
              className="p-1 rounded text-indigo-400 hover:text-indigo-300 hover:bg-neutral-700"
              title="Apply suggestion"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          {tracked.status !== 'dismissed' && (
            <button
              onClick={() => dismissHint(index)}
              className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {tracked.status === 'dismissed' && tracked.hint.suggestedFile && (
            <button
              onClick={handleApply}
              className="p-1 rounded text-neutral-500 hover:text-indigo-400 hover:bg-neutral-700"
              title="Apply suggestion"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      {isApplied && (
        <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
      )}
    </div>
  )
}

export default function HintsPanel() {
  const hints = useHintsStore(s => s.hints)

  useEffect(() => {
    useHintsStore.getState().refreshHints()
  }, [])

  const activeCount = hints.filter(h => h.status === 'active').length
  const appliedCount = hints.filter(h => h.status === 'applied').length

  if (hints.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
        <div className="text-center">
          <Lightbulb className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-xs">No organization suggestions</p>
          <p className="text-[10px] text-neutral-600 mt-1">Your project structure looks good!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-700 shrink-0">
        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-medium text-neutral-300">Organization Suggestions</span>
        <span className="text-[10px] text-neutral-500">
          {activeCount} active{appliedCount > 0 ? ` · ${appliedCount} applied` : ''}
        </span>
      </div>

      {/* Hint list */}
      <div className="flex-1 overflow-y-auto">
        {hints.map((tracked, index) => (
          <HintItem key={`${tracked.hint.blockType}:${tracked.hint.blockName}:${tracked.hint.kind}`} tracked={tracked} index={index} />
        ))}
      </div>
    </div>
  )
}
