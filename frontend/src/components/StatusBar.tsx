import { useState, useRef, useEffect } from 'react'
import { useProjectStore } from '../stores/useProjectStore'
import { useEditorPanelStore } from '../stores/useEditorPanelStore'
import { GitBranch } from 'lucide-react'
import { getFileTypeInfo, KNOWN_LANGUAGES, setLanguageOverride, removeLanguageOverride, getLanguageOverride } from '../utils/fileIcons'

export default function StatusBar() {
  const gitBranch = useProjectStore((s) => s.gitBranch)
  const projectName = useProjectStore((s) => s.projectName)
  const activeGroupId = useEditorPanelStore(s => s.activeGroupId)
  const groups = useEditorPanelStore(s => s.groups)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [langSearch, setLangSearch] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const activeGroup = groups.find(g => g.id === activeGroupId)
  const activeTab = activeGroup?.tabs.find(t => t.id === activeGroup.activeTabId)
  const fileTypeInfo = activeTab ? getFileTypeInfo(activeTab.fileName) : null
  const hasOverride = activeTab ? !!getLanguageOverride(activeTab.fileName) : false

  useEffect(() => {
    if (showLangPicker && searchRef.current) {
      searchRef.current.focus()
    }
  }, [showLangPicker])

  useEffect(() => {
    if (!showLangPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowLangPicker(false)
        setLangSearch('')
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowLangPicker(false); setLangSearch('') }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [showLangPicker])

  const handleSelectLanguage = (langId: string) => {
    if (!activeTab) return
    setLanguageOverride(activeTab.fileName, langId)
    // Close and reopen tab to apply
    const store = useEditorPanelStore.getState()
    store.closeTab(activeGroupId, activeTab.filePath)
    setTimeout(() => store.openFile(activeTab.filePath, activeTab.fileName), 50)
    setShowLangPicker(false)
    setLangSearch('')
  }

  const handleResetLanguage = () => {
    if (!activeTab) return
    removeLanguageOverride(activeTab.fileName)
    const store = useEditorPanelStore.getState()
    store.closeTab(activeGroupId, activeTab.filePath)
    setTimeout(() => store.openFile(activeTab.filePath, activeTab.fileName), 50)
    setShowLangPicker(false)
    setLangSearch('')
  }

  const filteredLangs = KNOWN_LANGUAGES.filter(l =>
    !langSearch || l.label.toLowerCase().includes(langSearch.toLowerCase())
  )

  return (
    <div className="h-6 flex items-center px-3 bg-neutral-900 border-t border-neutral-800 text-[11px] text-neutral-400 select-none shrink-0 relative">
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
        {fileTypeInfo && (
          <button
            onClick={() => setShowLangPicker(!showLangPicker)}
            className="hover:text-neutral-200 cursor-pointer"
            title="Select language mode"
          >
            {fileTypeInfo.label}{hasOverride ? ' *' : ''}
          </button>
        )}
        {projectName && (
          <span>{projectName}</span>
        )}
      </div>

      {/* Language picker popup */}
      {showLangPicker && (
        <div
          ref={pickerRef}
          className="absolute bottom-7 right-3 w-56 max-h-72 bg-neutral-800 border border-neutral-700 rounded-md shadow-xl text-sm flex flex-col z-[9999]"
        >
          <div className="px-2 py-1.5 border-b border-neutral-700">
            <input
              ref={searchRef}
              type="text"
              value={langSearch}
              onChange={(e) => setLangSearch(e.target.value)}
              placeholder="Select language..."
              className="w-full bg-neutral-900 text-neutral-300 text-xs px-2 py-1 rounded border border-neutral-600 outline-none placeholder-neutral-600"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {hasOverride && !langSearch && (
              <>
                <button
                  onClick={handleResetLanguage}
                  className="w-full text-left px-3 py-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 text-xs"
                >
                  Auto-detect
                </button>
                <div className="border-t border-neutral-700 my-0.5" />
              </>
            )}
            {filteredLangs.map(lang => (
              <button
                key={lang.id}
                onClick={() => handleSelectLanguage(lang.id)}
                className={`w-full text-left px-3 py-1.5 hover:bg-neutral-700 text-xs ${
                  fileTypeInfo?.language === lang.id ? 'text-indigo-400' : 'text-neutral-300 hover:text-neutral-200'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
