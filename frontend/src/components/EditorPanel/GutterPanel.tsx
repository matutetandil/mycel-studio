// Custom gutter panel — positioned using Monaco's getTopForLineNumber for pixel-perfect alignment.

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { editor } from 'monaco-editor'
import type { GutterItem } from '../../monaco/gutterDecorations'

interface GutterPanelProps {
  editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>
  gutterItems: GutterItem[]
  blameData: Array<{ line: number; hash: string; author: string; date: string; summary?: string }> | null
  onItemClick: (item: GutterItem) => void
  projectPath: string
}

function RefDownIcon({ letter }: { letter?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20">
      <circle cx="9" cy="8" r="5.5" fill="#22c55e15" stroke="#22c55e" strokeWidth="1" />
      <text x="9" y="11" textAnchor="middle" fill="#22c55e" fontSize="7" fontWeight="800" fontFamily="sans-serif">{letter || 'C'}</text>
      <path d="M16 12l-3 5-3-5" fill="#22c55e" />
    </svg>
  )
}

function RefUpIcon({ letter }: { letter?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20">
      <circle cx="9" cy="10" r="5.5" fill="#818cf815" stroke="#818cf8" strokeWidth="1" />
      <text x="9" y="13" textAnchor="middle" fill="#818cf8" fontSize="7" fontWeight="800" fontFamily="sans-serif">{letter || 'C'}</text>
      <path d="M16 8l-3-5-3 5" fill="#818cf8" />
    </svg>
  )
}

function HintIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16">
      <path d="M8 1a4.5 4.5 0 0 0-2.5 8.2V11a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V9.2A4.5 4.5 0 0 0 8 1zm0 1.5a3 3 0 0 1 1.5 5.6V11h-3V8.1A3 3 0 0 1 8 2.5zM6.5 12.5h3v.5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1z" fill="#eab308" />
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 12 16">
      <path d="M2 0h8a1 1 0 0 1 1 1v14l-5-3-5 3V1a1 1 0 0 1 1-1z" fill="#eab308" />
    </svg>
  )
}

function BlamePopup({ blame, anchorRect, onEnter, onLeave }: {
  blame: { hash: string; author: string; date: string; summary?: string }
  anchorRect: DOMRect
  onEnter?: () => void
  onLeave?: () => void
}) {
  return createPortal(
    <div
      className="fixed z-[99999] bg-neutral-800 border border-neutral-600 rounded-md shadow-xl p-3 w-72"
      style={{ top: anchorRect.bottom + 4, left: anchorRect.left }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[10px] font-mono text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded cursor-pointer hover:bg-indigo-900"
          onClick={async () => {
            // Open Git panel and select this commit
            const { useGitStore } = await import('../../stores/useGitStore')
            await useGitStore.getState().selectCommitByHash(blame.hash)
            document.dispatchEvent(new CustomEvent('mycel:switch-panel', { detail: 'git' }))
          }}
          title="Open in Git panel"
        >
          {blame.hash.substring(0, 8)}
        </span>
        <span className="text-[10px] text-neutral-500">{blame.date}</span>
      </div>
      <div className="text-[11px] text-neutral-300 font-medium mb-1">{blame.author}</div>
      {blame.summary && (
        <div className="text-[11px] text-neutral-400 leading-relaxed">{blame.summary}</div>
      )}
    </div>,
    document.body
  )
}

function BlameCell({ blame }: { blame?: { hash: string; author: string; date: string; summary?: string } }) {
  const [showPopup, setShowPopup] = useState(false)
  const cellRef = useRef<HTMLSpanElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!blame) return <span className="w-40 pr-2">&nbsp;</span>

  const show = () => { if (hideTimer.current) clearTimeout(hideTimer.current); setShowPopup(true) }
  const hide = () => { hideTimer.current = setTimeout(() => setShowPopup(false), 300) }

  const handleClick = async () => {
    const { useGitStore } = await import('../../stores/useGitStore')
    await useGitStore.getState().selectCommitByHash(blame.hash)
    document.dispatchEvent(new CustomEvent('mycel:switch-panel', { detail: 'git' }))
    setShowPopup(false)
  }

  return (
    <span
      ref={cellRef}
      className="text-[10px] text-neutral-600 font-mono pr-2 w-40 text-right truncate cursor-pointer hover:text-neutral-400"
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={handleClick}
    >
      {blame.date} {blame.author.substring(0, 10)}
      {showPopup && cellRef.current && (
        <BlamePopup blame={blame} anchorRect={cellRef.current.getBoundingClientRect()} onEnter={show} onLeave={hide} />
      )}
    </span>
  )
}

interface VisibleLine {
  line: number
  top: number
  height: number
}

export default function GutterPanel({ editorRef, gutterItems, blameData, onItemClick }: GutterPanelProps) {
  const [visibleLines, setVisibleLines] = useState<VisibleLine[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ed = editorRef.current
    if (!ed) return

    const update = () => {
      const ranges = ed.getVisibleRanges()
      if (!ranges || ranges.length === 0) return

      const startLine = ranges[0].startLineNumber
      const endLine = ranges[ranges.length - 1].endLineNumber
      const scrollTop = ed.getScrollTop()

      const lines: VisibleLine[] = []
      for (let line = startLine; line <= endLine; line++) {
        const top = ed.getTopForLineNumber(line) - scrollTop
        let height = ed.getTopForLineNumber(line + 1) - ed.getTopForLineNumber(line)
        // Last line: getTopForLineNumber(n+1) might equal getTopForLineNumber(n), use fallback
        if (height <= 0) height = Number(ed.getOption(66 /* lineHeight */)) || 19
        lines.push({ line, top, height })
      }
      setVisibleLines(lines)
    }

    // Delay first update to let Monaco render
    setTimeout(update, 100)
    const d1 = ed.onDidScrollChange(update)
    const d2 = ed.onDidLayoutChange(update)
    const d3 = ed.onDidChangeModelContent(() => setTimeout(update, 50))

    return () => { d1.dispose(); d2.dispose(); d3.dispose() }
  }, [editorRef.current])

  const byLine = new Map<number, GutterItem[]>()
  for (const item of gutterItems) {
    if (!byLine.has(item.line)) byLine.set(item.line, [])
    byLine.get(item.line)!.push(item)
  }

  const showBlame = !!blameData && blameData.length > 0

  // Calculate gutter width based on max icons per line (16px per icon + 4px gap + 8px padding)
  let maxIcons = 0
  for (const items of byLine.values()) {
    if (items.length > maxIcons) maxIcons = items.length
  }
  const gutterWidth = Math.max(24, maxIcons * 18 + 8)

  return (
    <div
      ref={containerRef}
      className="h-full overflow-hidden select-none flex-shrink-0 relative bg-neutral-900"
      style={{ paddingLeft: 4, width: showBlame ? 200 : gutterWidth }}
    >
      {visibleLines.map(({ line, top, height }) => {
        const items = byLine.get(line)
        const blame = blameData?.find(b => b.line === line)

        return (
          <div
            key={line}
            className="absolute flex items-center gap-0.5"
            style={{ top, height, left: 4, right: 0 }}
          >
            {showBlame && <BlameCell blame={blame || undefined} />}
            {items?.map((item, idx) => {
              let icon: React.ReactNode = null
              let title = item.tooltip

              switch (item.type) {
                case 'ref-down':
                  icon = <RefDownIcon letter={item.letter} />
                  title = `${item.entityName} — used in ${item.references?.length || 0} place(s)`
                  break
                case 'ref-up':
                  icon = <RefUpIcon letter={item.letter} />
                  title = `Go to ${item.entityName} definition`
                  break
                case 'hint':
                  icon = <HintIcon />
                  break
                case 'bookmark':
                  icon = <BookmarkIcon />
                  title = 'Bookmark'
                  break
              }

              return (
                <button
                  key={`${item.type}-${idx}`}
                  onClick={() => onItemClick(item)}
                  title={title}
                  className="flex items-center justify-center p-0 border-0 bg-transparent cursor-pointer hover:opacity-80"
                  style={{ width: 16, height: 16 }}
                >
                  {icon}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
