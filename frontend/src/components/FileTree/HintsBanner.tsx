// Banner shown at the top of FileTree when SOLID hints are available
// Shows a summary and actions: Apply All / Later

import { Lightbulb, X } from 'lucide-react'
import { useHintsStore } from '../../stores/useHintsStore'
import { executeHint } from '../../utils/refactorUtils'

export default function HintsBanner() {
  const hints = useHintsStore(s => s.hints)
  const bannerDismissed = useHintsStore(s => s.bannerDismissed)
  const dismissBanner = useHintsStore(s => s.dismissBanner)

  const activeHints = hints.filter(h => h.status === 'active')
  if (activeHints.length === 0 || bannerDismissed) return null

  const handleApplyAll = async () => {
    for (let i = 0; i < hints.length; i++) {
      if (hints[i].status === 'active' && hints[i].hint.suggestedFile) {
        const success = await executeHint(hints[i].hint)
        if (success) {
          useHintsStore.getState().applyHint(i)
        }
      }
    }
    useHintsStore.getState().refreshHints()
    dismissBanner()
  }

  return (
    <div className="mx-2 mb-2 p-2 bg-indigo-950/50 border border-indigo-800/50 rounded-md">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-indigo-300 font-medium">
            {activeHints.length} organization suggestion{activeHints.length > 1 ? 's' : ''}
          </p>
          <p className="text-[10px] text-indigo-400/70 mt-0.5">
            {activeHints.length === 1
              ? activeHints[0].hint.message
              : 'Improve project structure with SOLID principles'}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={handleApplyAll}
              className="text-[10px] px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded"
            >
              Apply {activeHints.filter(h => h.hint.suggestedFile).length > 1 ? 'All' : ''}
            </button>
            <button
              onClick={dismissBanner}
              className="text-[10px] px-2 py-0.5 text-indigo-400 hover:text-indigo-300"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={dismissBanner}
          className="p-0.5 rounded text-indigo-500 hover:text-indigo-300"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
