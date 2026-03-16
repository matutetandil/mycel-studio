import { create } from 'zustand'
import { getDebugBackend } from '../lib/debug'

// --- Protocol types ---

export interface BreakpointSpec {
  stage: string
  ruleIndex: number // -1 = stage-level, 0+ = CEL rule index
  condition?: string
}

export interface DebugThread {
  id: string
  flowName: string
  stage: string
  name: string
  paused: boolean
}

export interface RuleInfo {
  index: number
  target: string
  expression: string
  result?: unknown
}

export interface VariablesResult {
  input: Record<string, unknown>
  output: Record<string, unknown>
  enriched?: Record<string, unknown>
  steps?: Record<string, unknown>
  rule?: RuleInfo
}

export interface FlowInfo {
  name: string
  from: { connector: string; operation: string }
  to: { connector: string; operation: string } | null
  hasSteps: boolean
  stepCount: number
  transform: Record<string, string> | null
  response: Record<string, string> | null
  validate: { input: string; output: string } | null
  hasCache: boolean
  hasRetry: boolean
}

export interface DebugEvent {
  id: number
  timestamp: number
  method: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

// Breakpoint keyed by "flowName:stage:ruleIndex"
export function breakpointKey(flow: string, stage: string, ruleIndex: number): string {
  return `${flow}:${stage}:${ruleIndex}`
}

// --- Store ---

interface DebugState {
  // Connection
  status: ConnectionStatus
  sessionId: string | null
  runtimeUrl: string
  availableFlows: string[]

  // Threads
  threads: DebugThread[]
  activeThreadId: string | null

  // Variables (for active paused thread)
  variables: VariablesResult | null

  // Breakpoints per flow
  breakpoints: Map<string, BreakpointSpec[]> // flow name → specs

  // Event log
  events: DebugEvent[]
  eventCounter: number

  // Stopped state
  stoppedAt: {
    flow: string
    stage: string
    rule?: RuleInfo
    threadId: string
  } | null

  // Watch expressions
  watchExpressions: string[]
  watchResults: Map<string, { value: string; type: string; error?: string }>

  // Flow runtime info (from inspect)
  flowInfos: FlowInfo[]

  // Actions
  connect: (url?: string) => Promise<void>
  disconnect: () => void
  setBreakpoints: (flow: string, specs: BreakpointSpec[]) => Promise<void>
  toggleBreakpoint: (flow: string, stage: string, ruleIndex: number, condition?: string) => Promise<void>
  clearAllBreakpoints: () => Promise<void>
  debugContinue: (threadId?: string) => Promise<void>
  debugNext: (threadId?: string) => Promise<void>
  debugStepInto: (threadId?: string) => Promise<void>
  fetchVariables: (threadId?: string) => Promise<void>
  evaluate: (expression: string, threadId?: string) => Promise<{ result: string; type: string }>
  addWatch: (expression: string) => void
  removeWatch: (expression: string) => void
  refreshWatch: () => Promise<void>
  setActiveThread: (threadId: string) => void
  setRuntimeUrl: (url: string) => void
  clearEvents: () => void
}

export const useDebugStore = create<DebugState>((set, get) => ({
  status: 'disconnected',
  sessionId: null,
  runtimeUrl: 'ws://localhost:9090/debug',
  availableFlows: [],
  threads: [],
  activeThreadId: null,
  variables: null,
  breakpoints: new Map(),
  events: [],
  eventCounter: 0,
  stoppedAt: null,
  watchExpressions: [],
  watchResults: new Map(),
  flowInfos: [],

  setRuntimeUrl: (url: string) => set({ runtimeUrl: url }),

  connect: async (url?: string) => {
    const targetUrl = url || get().runtimeUrl
    set({ status: 'connecting', runtimeUrl: targetUrl })

    try {
      const backend = getDebugBackend()
      await backend.connect(targetUrl)

      // Listen for events
      backend.onEvent((method, params) => {
        const state = get()
        const event: DebugEvent = {
          id: state.eventCounter + 1,
          timestamp: Date.now(),
          method,
          params,
        }
        set(s => ({
          events: [...s.events.slice(-499), event], // keep last 500
          eventCounter: s.eventCounter + 1,
        }))

        // Handle specific events
        handleDebugEvent(method, params)
      })

      backend.onDisconnect(() => {
        set({
          status: 'disconnected',
          sessionId: null,
          threads: [],
          activeThreadId: null,
          variables: null,
          stoppedAt: null,
          availableFlows: [],
          flowInfos: [],
        })
      })

      // Attach
      const result = await backend.send('debug.attach', { clientName: 'mycel-studio' }) as { sessionId: string; flows: string[] }
      set({
        status: 'connected',
        sessionId: result.sessionId,
        availableFlows: result.flows || [],
      })

      // Fetch flow details
      try {
        const flows = await backend.send('inspect.flows') as FlowInfo[]
        set({ flowInfos: flows || [] })
      } catch {
        // inspect.flows may not be available
      }

      // Re-apply breakpoints
      const bps = get().breakpoints
      for (const [flow, specs] of bps) {
        if (specs.length > 0) {
          await backend.send('debug.setBreakpoints', { flow, breakpoints: specs })
        }
      }
    } catch (err) {
      set({ status: 'disconnected' })
      throw err
    }
  },

  disconnect: () => {
    const backend = getDebugBackend()
    try {
      backend.send('debug.detach').catch(() => {})
    } catch { /* ignore */ }
    backend.disconnect()
    set({
      status: 'disconnected',
      sessionId: null,
      threads: [],
      activeThreadId: null,
      variables: null,
      stoppedAt: null,
    })
  },

  setBreakpoints: async (flow: string, specs: BreakpointSpec[]) => {
    const newBps = new Map(get().breakpoints)
    if (specs.length === 0) {
      newBps.delete(flow)
    } else {
      newBps.set(flow, specs)
    }
    set({ breakpoints: newBps })

    if (get().status === 'connected') {
      const backend = getDebugBackend()
      await backend.send('debug.setBreakpoints', { flow, breakpoints: specs })
    }
  },

  toggleBreakpoint: async (flow: string, stage: string, ruleIndex: number, condition?: string) => {
    const current = get().breakpoints.get(flow) || []
    const exists = current.findIndex(b => b.stage === stage && b.ruleIndex === ruleIndex)

    let newSpecs: BreakpointSpec[]
    if (exists >= 0) {
      newSpecs = current.filter((_, i) => i !== exists)
    } else {
      newSpecs = [...current, { stage, ruleIndex, condition: condition || '' }]
    }

    await get().setBreakpoints(flow, newSpecs)
  },

  clearAllBreakpoints: async () => {
    const bps = get().breakpoints
    const backend = getDebugBackend()
    for (const flow of bps.keys()) {
      if (get().status === 'connected') {
        await backend.send('debug.setBreakpoints', { flow, breakpoints: [] })
      }
    }
    set({ breakpoints: new Map() })
  },

  debugContinue: async (threadId?: string) => {
    const tid = threadId || get().activeThreadId
    if (!tid) return
    const backend = getDebugBackend()
    await backend.send('debug.continue', { threadId: tid })
    set({ stoppedAt: null, variables: null })
  },

  debugNext: async (threadId?: string) => {
    const tid = threadId || get().activeThreadId
    if (!tid) return
    const backend = getDebugBackend()
    await backend.send('debug.next', { threadId: tid })
    set({ stoppedAt: null, variables: null })
  },

  debugStepInto: async (threadId?: string) => {
    const tid = threadId || get().activeThreadId
    if (!tid) return
    const backend = getDebugBackend()
    await backend.send('debug.stepInto', { threadId: tid })
    set({ stoppedAt: null, variables: null })
  },

  fetchVariables: async (threadId?: string) => {
    const tid = threadId || get().activeThreadId
    if (!tid) return
    const backend = getDebugBackend()
    const result = await backend.send('debug.variables', { threadId: tid }) as VariablesResult
    set({ variables: result })
  },

  evaluate: async (expression: string, threadId?: string) => {
    const tid = threadId || get().activeThreadId
    if (!tid) throw new Error('No active thread')
    const backend = getDebugBackend()
    return await backend.send('debug.evaluate', { threadId: tid, expression }) as { result: string; type: string }
  },

  addWatch: (expression: string) => {
    const current = get().watchExpressions
    if (!current.includes(expression)) {
      set({ watchExpressions: [...current, expression] })
      // Auto-evaluate if paused
      if (get().stoppedAt) {
        get().refreshWatch()
      }
    }
  },

  removeWatch: (expression: string) => {
    set(s => ({
      watchExpressions: s.watchExpressions.filter(e => e !== expression),
      watchResults: new Map([...s.watchResults].filter(([k]) => k !== expression)),
    }))
  },

  refreshWatch: async () => {
    const { watchExpressions, activeThreadId, stoppedAt } = get()
    if (!stoppedAt || !activeThreadId) return

    const results = new Map<string, { value: string; type: string; error?: string }>()
    const backend = getDebugBackend()

    for (const expr of watchExpressions) {
      try {
        const result = await backend.send('debug.evaluate', {
          threadId: activeThreadId,
          expression: expr,
        }) as { result: string; type: string }
        results.set(expr, { value: String(result.result), type: result.type })
      } catch (err) {
        results.set(expr, { value: '', type: 'error', error: String(err) })
      }
    }
    set({ watchResults: results })
  },

  setActiveThread: (threadId: string) => set({ activeThreadId: threadId }),
  clearEvents: () => set({ events: [], eventCounter: 0 }),
}))

// --- Event handler ---

function handleDebugEvent(method: string, params: unknown) {
  const store = useDebugStore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = params as any

  switch (method) {
    case 'event.flowStart': {
      const thread: DebugThread = {
        id: p.threadId,
        flowName: p.flowName,
        stage: 'input',
        name: '',
        paused: false,
      }
      store.setState(s => ({
        threads: [...s.threads, thread],
        activeThreadId: s.activeThreadId || thread.id,
      }))
      break
    }

    case 'event.flowEnd': {
      store.setState(s => ({
        threads: s.threads.filter(t => t.id !== p.threadId),
        activeThreadId: s.activeThreadId === p.threadId
          ? (s.threads.find(t => t.id !== p.threadId)?.id || null)
          : s.activeThreadId,
        stoppedAt: s.stoppedAt?.threadId === p.threadId ? null : s.stoppedAt,
        variables: s.stoppedAt?.threadId === p.threadId ? null : s.variables,
      }))
      break
    }

    case 'event.stageEnter': {
      store.setState(s => ({
        threads: s.threads.map(t =>
          t.id === p.threadId ? { ...t, stage: p.stage, name: p.name || '' } : t
        ),
      }))
      break
    }

    case 'event.stopped': {
      store.setState(s => ({
        threads: s.threads.map(t =>
          t.id === p.threadId ? { ...t, stage: p.stage, paused: true } : t
        ),
        activeThreadId: p.threadId,
        stoppedAt: {
          flow: p.flowName,
          stage: p.stage,
          rule: p.rule || undefined,
          threadId: p.threadId,
        },
      }))
      // Auto-fetch variables when stopped
      useDebugStore.getState().fetchVariables(p.threadId)
      // Auto-refresh watch
      useDebugStore.getState().refreshWatch()
      break
    }

    case 'event.continued': {
      store.setState(s => ({
        threads: s.threads.map(t =>
          t.id === p.threadId ? { ...t, paused: false } : t
        ),
        stoppedAt: s.stoppedAt?.threadId === p.threadId ? null : s.stoppedAt,
      }))
      break
    }
  }
}
