import { useState } from 'react'
import { Bug } from 'lucide-react'
import { useDebugStore } from '../../stores/useDebugStore'
import DebugToolbar from './DebugToolbar'
import VariablesView from './VariablesView'
import WatchView from './WatchView'
import EventLog from './EventLog'
import CallStackView from './CallStackView'
import BreakpointsView from './BreakpointsView'

type DebugTab = 'variables' | 'watch' | 'breakpoints' | 'callstack' | 'events'

export default function DebugPanel() {
  const status = useDebugStore(s => s.status)
  const [activeTab, setActiveTab] = useState<DebugTab>('variables')

  const breakpointCount = useDebugStore(s => {
    let count = 0
    for (const specs of s.breakpoints.values()) count += specs.length
    return count
  })

  const tabs: { key: DebugTab; label: string }[] = [
    { key: 'variables', label: 'Variables' },
    { key: 'watch', label: 'Watch' },
    { key: 'breakpoints', label: `Breakpoints${breakpointCount > 0 ? ` (${breakpointCount})` : ''}` },
    { key: 'callstack', label: 'Call Stack' },
    { key: 'events', label: 'Events' },
  ]

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

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      <DebugToolbar />

      {/* Tab bar */}
      <div className="flex border-b border-neutral-800 bg-neutral-900">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs transition-colors ${
              activeTab === tab.key
                ? 'text-white border-b-2 border-amber-500 bg-neutral-800'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'variables' && <VariablesView />}
        {activeTab === 'watch' && <WatchView />}
        {activeTab === 'breakpoints' && <BreakpointsView />}
        {activeTab === 'callstack' && <CallStackView />}
        {activeTab === 'events' && <EventLog />}
      </div>
    </div>
  )
}
