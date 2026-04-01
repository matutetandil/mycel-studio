import { useState, useRef, useEffect } from 'react'
import { useProjectStore } from '../stores/useProjectStore'
import { useEditorPanelStore, unscopePath } from '../stores/useEditorPanelStore'
import { useNotificationStore } from '../stores/useNotificationStore'
import { GitBranch, Bell, BellDot, CheckCircle, Download, MemoryStick } from 'lucide-react'
import { getFileTypeInfo, KNOWN_LANGUAGES, setLanguageOverride, removeLanguageOverride, getLanguageOverride } from '../utils/fileIcons'
import { isWailsRuntime } from '../lib/api'

interface StatusBarProps {
  downloadProgress?: { percent: number; message: string } | null
  isDownloading?: boolean
  updateReady?: boolean
  updateVersion?: string
}

export default function StatusBar({ downloadProgress, isDownloading, updateReady, updateVersion }: StatusBarProps) {
  const gitBranch = useProjectStore((s) => s.gitBranch)
  const projectName = useProjectStore((s) => s.projectName)
  const activeGroupId = useEditorPanelStore(s => s.activeGroupId)
  const groups = useEditorPanelStore(s => s.groups)
  const notifications = useNotificationStore(s => s.notifications)
  const togglePopup = useNotificationStore(s => s.togglePopup)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [langSearch, setLangSearch] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const cursorPositions = useEditorPanelStore(s => s.cursorPositions)
  const activeGroup = groups.find(g => g.id === activeGroupId)
  const activeTab = activeGroup?.tabs.find(t => t.id === activeGroup.activeTabId)
  const fileTypeInfo = activeTab ? getFileTypeInfo(activeTab.fileName) : null
  const hasOverride = activeTab ? !!getLanguageOverride(activeTab.fileName) : false
  // Get cursor position for active file
  const activeFilePath = activeTab ? unscopePath(activeTab.filePath).relativePath : null
  const cursorPos = activeFilePath ? cursorPositions[activeFilePath] : null
  const notifCount = notifications.length

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

  // Memory usage polling (every 5s)
  const [memoryMB, setMemoryMB] = useState<number | null>(null)
  useEffect(() => {
    if (!isWailsRuntime()) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).go?.main?.App
    if (!app?.MemoryUsageMB) return
    const poll = () => app.MemoryUsageMB().then((mb: number) => setMemoryMB(mb))
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [])

  const BellIcon = notifCount > 0 ? BellDot : Bell

  return (
    <div className="h-6 flex items-center px-3 bg-neutral-900 border-t border-neutral-800 text-[11px] text-neutral-400 select-none shrink-0 relative">
      {/* Left side: git branch + notifications bell + download progress */}
      <div className="flex items-center gap-3">
        {gitBranch && (
          <span className="flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            {gitBranch}
          </span>
        )}

        {/* Bell icon */}
        <button
          data-notification-bell
          onClick={togglePopup}
          className="flex items-center gap-1 hover:text-neutral-200 relative"
          title={`${notifCount} notification${notifCount !== 1 ? 's' : ''}`}
        >
          <BellIcon className="w-3 h-3" />
          {notifCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center bg-indigo-500 text-white text-[9px] font-bold rounded-full leading-none px-0.5">
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          )}
        </button>

        {/* Download progress */}
        {isDownloading && downloadProgress && (
          <div className="flex items-center gap-1.5 text-indigo-300">
            <Download className="w-3 h-3 animate-pulse" />
            <span className="text-[10px]">
              {updateVersion ? `v${updateVersion}` : 'Downloading'}... {Math.round(downloadProgress.percent)}%
            </span>
            <div className="w-24 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Update ready indicator */}
        {updateReady && !isDownloading && (
          <span className="flex items-center gap-1 text-green-400 text-[10px]">
            <CheckCircle className="w-3 h-3" />
            Update ready
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Right side: cursor position + language + project name */}
      <div className="flex items-center gap-3">
        {cursorPos && (
          <span className="tabular-nums" title="Cursor position">
            Ln {cursorPos.line}, Col {cursorPos.column}
          </span>
        )}
        {fileTypeInfo && (
          <button
            onClick={() => setShowLangPicker(!showLangPicker)}
            className="hover:text-neutral-200 cursor-pointer"
            title="Select language mode"
          >
            {fileTypeInfo.label}{hasOverride ? ' *' : ''}
          </button>
        )}
        {memoryMB !== null && (
          <span className="flex items-center gap-1 text-neutral-500" title="Memory usage">
            <MemoryStick className="w-3 h-3" />
            {memoryMB < 1024 ? `${Math.round(memoryMB)} MB` : `${(memoryMB / 1024).toFixed(1)} GB`}
          </span>
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
