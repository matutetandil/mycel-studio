// Debug backend abstraction
// Desktop (Wails): uses Go bindings + Wails events
// Browser/Docker: uses WebSocket directly

import { isWailsRuntime } from './api'

export interface DebugBackend {
  connect(url: string): Promise<void>
  disconnect(): void
  isConnected(): boolean
  send(method: string, params?: unknown): Promise<unknown>
  onEvent(callback: (method: string, params: unknown) => void): () => void
  onDisconnect(callback: () => void): () => void
}

class WailsDebugBackend implements DebugBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get app(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).go?.main?.App
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get runtime(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).runtime
  }

  private _connected = false

  async connect(url: string): Promise<void> {
    await this.app.DebugConnect(url)
    this._connected = true
  }

  disconnect(): void {
    this.app.DebugDisconnect()
    this._connected = false
  }

  isConnected(): boolean {
    return this._connected
  }

  async send(method: string, params?: unknown): Promise<unknown> {
    const paramsJSON = params ? JSON.stringify(params) : ''
    const resultJSON = await this.app.DebugSend(method, paramsJSON)
    return JSON.parse(resultJSON)
  }

  onEvent(callback: (method: string, params: unknown) => void): () => void {
    const handler = (data: string) => {
      const parsed = JSON.parse(data)
      callback(parsed.method, JSON.parse(parsed.params))
    }
    this.runtime.EventsOn('debug:event', handler)
    return () => this.runtime.EventsOff('debug:event')
  }

  onDisconnect(callback: () => void): () => void {
    this.runtime.EventsOn('debug:disconnected', () => {
      this._connected = false
      callback()
    })
    return () => this.runtime.EventsOff('debug:disconnected')
  }
}

class WebSocketDebugBackend implements DebugBackend {
  private ws: WebSocket | null = null
  private nextId = 0
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private eventCallbacks: ((method: string, params: unknown) => void)[] = []
  private disconnectCallbacks: (() => void)[] = []

  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        this.ws = ws
        resolve()
      }

      ws.onerror = () => reject(new Error('WebSocket connection failed'))

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.id != null) {
          const pending = this.pending.get(data.id)
          if (pending) {
            this.pending.delete(data.id)
            if (data.error) {
              pending.reject(new Error(data.error.message || 'Unknown error'))
            } else {
              pending.resolve(data.result)
            }
          }
        } else if (data.method) {
          for (const cb of this.eventCallbacks) {
            cb(data.method, data.params)
          }
        }
      }

      ws.onclose = () => {
        this.ws = null
        for (const cb of this.disconnectCallbacks) cb()
      }
    })
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  async send(method: string, params?: unknown): Promise<unknown> {
    if (!this.ws) throw new Error('Not connected')

    const id = ++this.nextId
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws!.send(JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      }))
    })
  }

  onEvent(callback: (method: string, params: unknown) => void): () => void {
    this.eventCallbacks.push(callback)
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter(cb => cb !== callback)
    }
  }

  onDisconnect(callback: () => void): () => void {
    this.disconnectCallbacks.push(callback)
    return () => {
      this.disconnectCallbacks = this.disconnectCallbacks.filter(cb => cb !== callback)
    }
  }
}

let backend: DebugBackend | null = null

export function getDebugBackend(): DebugBackend {
  if (!backend) {
    backend = isWailsRuntime() ? new WailsDebugBackend() : new WebSocketDebugBackend()
  }
  return backend
}
