import { create } from 'zustand'
import { registerSnapshotProvider } from './snapshotRegistry'

export type OutputLevel = 'info' | 'warn' | 'error' | 'debug' | 'send' | 'recv'
export type OutputChannel = 'Debug' | 'App'

export interface OutputEntry {
  id: number
  timestamp: number
  level: OutputLevel
  channel: OutputChannel
  message: string
}

interface OutputState {
  entries: OutputEntry[]
  counter: number
  activeChannel: OutputChannel
  setActiveChannel: (channel: OutputChannel) => void
  log: (channel: OutputChannel, level: OutputLevel, message: string) => void
  clear: (channel?: OutputChannel) => void
}

export const useOutputStore = create<OutputState>((set, get) => ({
  entries: [],
  counter: 0,
  activeChannel: 'Debug',

  setActiveChannel: (channel) => set({ activeChannel: channel }),

  log: (channel, level, message) => {
    const entry: OutputEntry = {
      id: get().counter + 1,
      timestamp: Date.now(),
      level,
      channel,
      message,
    }
    set(s => ({
      entries: [...s.entries.slice(-999), entry],
      counter: s.counter + 1,
    }))
  },

  clear: (channel) => {
    if (channel) {
      set(s => ({ entries: s.entries.filter(e => e.channel !== channel) }))
    } else {
      set({ entries: [], counter: 0 })
    }
  },
}))

// Convenience functions
export function output(channel: OutputChannel, level: OutputLevel, message: string) {
  useOutputStore.getState().log(channel, level, message)
}

export function debugLog(message: string) {
  useOutputStore.getState().log('Debug', 'info', message)
}

export function debugSend(method: string, params?: unknown) {
  const paramsStr = params ? ` ${JSON.stringify(params)}` : ''
  useOutputStore.getState().log('Debug', 'send', `→ ${method}${paramsStr}`)
}

export function debugRecv(method: string, result?: unknown) {
  const resultStr = result ? ` ${JSON.stringify(result)}` : ''
  useOutputStore.getState().log('Debug', 'recv', `← ${method}${resultStr}`)
}

export function debugError(message: string) {
  useOutputStore.getState().log('Debug', 'error', message)
}

export function debugWarn(message: string) {
  useOutputStore.getState().log('Debug', 'warn', message)
}

registerSnapshotProvider('output', {
  capture: () => {
    const o = useOutputStore.getState()
    return JSON.parse(JSON.stringify({ entries: o.entries, counter: o.counter, activeChannel: o.activeChannel }))
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  restore: (data) => useOutputStore.setState(data as any),
  clear: () => useOutputStore.setState({ entries: [], counter: 0 }),
})
