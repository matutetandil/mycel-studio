import { useState, useCallback, useRef, useEffect } from 'react'
import { Bug, Columns2, X } from 'lucide-react'
import { useDebugStore } from '../../stores/useDebugStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import DebugToolbar from './DebugToolbar'
import VariablesView from './VariablesView'
import WatchView from './WatchView'
import EventLog from './EventLog'
import CallStackView from './CallStackView'
import BreakpointsView from './BreakpointsView'

type DebugTab = 'variables' | 'watch' | 'breakpoints' | 'callstack' | 'events'

const ALL_TABS: { key: DebugTab; label: string }[] = [
  { key: 'variables', label: 'Variables' },
  { key: 'watch', label: 'Watch' },
  { key: 'breakpoints', label: 'Breakpoints' },
  { key: 'callstack', label: 'Call Stack' },
  { key: 'events', label: 'Events' },
]

function TabContent({ tab }: { tab: DebugTab }) {
  switch (tab) {
    case 'variables': return <VariablesView />
    case 'watch': return <WatchView />
    case 'breakpoints': return <BreakpointsView />
    case 'callstack': return <CallStackView />
    case 'events': return <EventLog />
  }
}

function DebugTabBar({ tabs, activeTab, onSelect, onDragStart, onDragOver, onDrop, extra }: {
  tabs: DebugTab[]
  activeTab: DebugTab
  onSelect: (tab: DebugTab) => void
  onDragStart: (e: React.DragEvent, tab: DebugTab) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  extra?: React.ReactNode
}) {
  const breakpointCount = useDebugStore(s => {
    let count = 0
    for (const specs of s.breakpoints.values()) count += specs.length
    return count
  })

  const getLabel = (key: DebugTab) => {
    if (key === 'breakpoints' && breakpointCount > 0) return `Breakpoints (${breakpointCount})`
    return ALL_TABS.find(t => t.key === key)?.label || key
  }

  return (
    <div
      className="flex border-b border-neutral-800 bg-neutral-900 min-h-[29px]"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {tabs.map(tab => (
        <button
          key={tab}
          draggable
          onDragStart={(e) => onDragStart(e, tab)}
          onClick={() => onSelect(tab)}
          className={`px-3 py-1.5 text-xs transition-colors cursor-grab active:cursor-grabbing select-none ${
            activeTab === tab
              ? 'text-white border-b-2 border-amber-500 bg-neutral-800'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          {getLabel(tab)}
        </button>
      ))}
      <div className="flex-1" />
      {extra}
    </div>
  )
}

export default function DebugPanel() {
  const status = useDebugStore(s => s.status)

  // Restore layout from settings or use defaults
  const savedLayout = useSettingsStore.getState().debugLayout
  const defaultLeftTabs: DebugTab[] = ['variables', 'watch', 'breakpoints', 'callstack', 'events']

  // Left pane tabs and active tab
  const [leftTabs, setLeftTabs] = useState<DebugTab[]>(
    (savedLayout?.leftTabs as DebugTab[]) || defaultLeftTabs
  )
  const [leftActive, setLeftActive] = useState<DebugTab>(
    (savedLayout?.leftActive as DebugTab) || 'variables'
  )

  // Right pane (split) — null means no split
  const [rightTabs, setRightTabs] = useState<DebugTab[] | null>(
    savedLayout?.rightTabs ? (savedLayout.rightTabs as DebugTab[]) : null
  )
  const [rightActive, setRightActive] = useState<DebugTab>(
    (savedLayout?.rightActive as DebugTab) || 'watch'
  )

  // Split ratio
  const [splitRatio, setSplitRatio] = useState(savedLayout?.splitRatio ?? 0.5)
  const [isResizing, setIsResizing] = useState(false)

  // Persist layout changes
  useEffect(() => {
    useSettingsStore.getState().setDebugLayout({
      leftTabs,
      leftActive,
      rightTabs,
      rightActive,
      splitRatio,
    })
  }, [leftTabs, leftActive, rightTabs, rightActive, splitRatio])

  const dragTabRef = useRef<{ tab: DebugTab; from: 'left' | 'right' } | null>(null)

  const handleSplit = useCallback(() => {
    if (rightTabs) return // already split
    // Move the active tab to the right pane
    const tabToMove = leftActive
    const remaining = leftTabs.filter(t => t !== tabToMove)
    if (remaining.length === 0) return // can't leave left empty
    setLeftTabs(remaining)
    setLeftActive(remaining[0])
    setRightTabs([tabToMove])
    setRightActive(tabToMove)
  }, [rightTabs, leftActive, leftTabs])

  const handleCloseSplit = useCallback(() => {
    if (!rightTabs) return
    // Merge right tabs back to left, avoiding duplicates
    const merged = [...leftTabs, ...rightTabs.filter(t => !leftTabs.includes(t))]
    setLeftTabs(merged)
    setRightTabs(null)
  }, [leftTabs, rightTabs])

  const handleDragStart = useCallback((e: React.DragEvent, tab: DebugTab, from: 'left' | 'right') => {
    dragTabRef.current = { tab, from }
    e.dataTransfer.setData('text/plain', tab)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDropOnLeft = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const drag = dragTabRef.current
    if (!drag) return

    if (drag.from === 'right' && rightTabs) {
      // Move from right to left
      const newRight = rightTabs.filter(t => t !== drag.tab)
      if (!leftTabs.includes(drag.tab)) {
        setLeftTabs([...leftTabs, drag.tab])
      }
      setLeftActive(drag.tab)

      if (newRight.length === 0) {
        // Right pane is empty — close split
        setRightTabs(null)
      } else {
        setRightTabs(newRight)
        if (rightActive === drag.tab) setRightActive(newRight[0])
      }
    }
    dragTabRef.current = null
  }, [leftTabs, rightTabs, rightActive])

  const handleDropOnRight = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const drag = dragTabRef.current
    if (!drag) return

    if (drag.from === 'left') {
      // Move from left to right
      const newLeft = leftTabs.filter(t => t !== drag.tab)
      if (newLeft.length === 0) return // can't leave left empty

      setLeftTabs(newLeft)
      if (leftActive === drag.tab) setLeftActive(newLeft[0])

      if (rightTabs) {
        if (!rightTabs.includes(drag.tab)) {
          setRightTabs([...rightTabs, drag.tab])
        }
      } else {
        setRightTabs([drag.tab])
      }
      setRightActive(drag.tab)
    }
    dragTabRef.current = null
  }, [leftTabs, leftActive, rightTabs])

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const container = (e.target as HTMLElement).parentElement
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const ratio = Math.max(0.2, Math.min(0.8, (e.clientX - rect.left) / rect.width))
      setSplitRatio(ratio)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  if (status === 'disconnected') {
    return (
      <div className="h-full flex flex-col">
        <DebugToolbar />
        <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
          <div className="text-center">
            <Bug className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-xs mb-1">Debug Panel</p>
            <p className="text-[11px] text-neutral-600">Connect to a running Mycel service to start debugging</p>
          </div>
        </div>
      </div>
    )
  }

  const isSplit = rightTabs !== null && rightTabs.length > 0

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      <DebugToolbar />

      {/* Split content area */}
      <div className={`flex-1 min-h-0 flex flex-row ${isResizing ? 'select-none' : ''}`}>
        {/* Left pane */}
        <div
          className="flex flex-col min-w-0 overflow-hidden"
          style={isSplit ? { flexBasis: `${splitRatio * 100}%` } : { flex: 1 }}
        >
          <DebugTabBar
            tabs={leftTabs}
            activeTab={leftActive}
            onSelect={setLeftActive}
            onDragStart={(e, tab) => handleDragStart(e, tab, 'left')}
            onDragOver={handleDragOver}
            onDrop={handleDropOnLeft}
            extra={
              !isSplit ? (
                <button
                  onClick={handleSplit}
                  className="p-1 mr-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 self-center"
                  title="Split debug panel"
                >
                  <Columns2 className="w-3.5 h-3.5" />
                </button>
              ) : undefined
            }
          />
          <div className="flex-1 min-h-0">
            <TabContent tab={leftActive} />
          </div>
        </div>

        {/* Resize handle */}
        {isSplit && (
          <div
            className={`w-1 shrink-0 cursor-ew-resize hover:bg-indigo-500/50 transition-colors ${
              isResizing ? 'bg-indigo-500/50' : 'bg-neutral-800'
            }`}
            onMouseDown={handleResizeMouseDown}
          />
        )}

        {/* Right pane */}
        {isSplit && (
          <div
            className="flex flex-col min-w-0 overflow-hidden"
            style={{ flexBasis: `${(1 - splitRatio) * 100}%` }}
          >
            <DebugTabBar
              tabs={rightTabs!}
              activeTab={rightActive}
              onSelect={setRightActive}
              onDragStart={(e, tab) => handleDragStart(e, tab, 'right')}
              onDragOver={handleDragOver}
              onDrop={handleDropOnRight}
              extra={
                <button
                  onClick={handleCloseSplit}
                  className="p-1 mr-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 self-center"
                  title="Close split"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              }
            />
            <div className="flex-1 min-h-0">
              <TabContent tab={rightActive} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
