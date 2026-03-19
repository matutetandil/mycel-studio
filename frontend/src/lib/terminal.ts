// Terminal backend abstraction
// Desktop (Wails): uses Go bindings + Wails events
// Browser/Docker: uses WebSocket

import { isWailsRuntime } from './api'

export interface TerminalBackend {
  create(cols: number, rows: number, workDir?: string): Promise<string>
  write(id: string, data: string): void
  resize(id: string, cols: number, rows: number): void
  onData(id: string, callback: (data: string) => void): () => void
  onExit(id: string, callback: () => void): () => void
  close(id: string): void
  getCwd(id: string): Promise<string>
}

class WailsTerminalBackend implements TerminalBackend {
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

  async create(cols: number, rows: number, workDir?: string): Promise<string> {
    return await this.app.CreateTerminal(cols, rows, workDir || '')
  }

  write(id: string, data: string): void {
    this.app.WriteTerminal(id, data)
  }

  resize(id: string, cols: number, rows: number): void {
    this.app.ResizeTerminal(id, cols, rows)
  }

  onData(id: string, callback: (data: string) => void): () => void {
    const event = `terminal:output:${id}`
    this.runtime.EventsOn(event, (encoded: string) => {
      // Decode base64 → bytes → UTF-8 string
      const binary = atob(encoded)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      const decoded = new TextDecoder('utf-8').decode(bytes)
      callback(decoded)
    })
    return () => this.runtime.EventsOff(event)
  }

  onExit(id: string, callback: () => void): () => void {
    const event = `terminal:exit:${id}`
    this.runtime.EventsOn(event, callback)
    return () => this.runtime.EventsOff(event)
  }

  close(id: string): void {
    this.app.CloseTerminal(id)
  }

  async getCwd(id: string): Promise<string> {
    return await this.app.GetTerminalCwd(id) || ''
  }
}

class WebSocketTerminalBackend implements TerminalBackend {
  private sockets = new Map<string, WebSocket>()
  private dataCallbacks = new Map<string, (data: string) => void>()
  private exitCallbacks = new Map<string, () => void>()

  async create(cols: number, rows: number, workDir?: string): Promise<string> {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const params = workDir ? `?workDir=${encodeURIComponent(workDir)}` : ''
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/terminal/ws${params}`)

    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        // Send initial size
        ws.send(JSON.stringify({ type: 'resize', cols, rows }))
      }

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (msg.type === 'ready') {
          const id = msg.id as string
          this.sockets.set(id, ws)

          // Re-wire message handler now that we have the ID
          ws.onmessage = (e) => {
            const m = JSON.parse(e.data)
            if (m.type === 'output') {
              this.dataCallbacks.get(id)?.(m.data)
            }
          }

          ws.onclose = () => {
            this.exitCallbacks.get(id)?.()
            this.sockets.delete(id)
          }

          resolve(id)
        }
      }

      ws.onerror = () => reject(new Error('WebSocket connection failed'))
    })
  }

  write(id: string, data: string): void {
    this.sockets.get(id)?.send(JSON.stringify({ type: 'input', data }))
  }

  resize(id: string, cols: number, rows: number): void {
    this.sockets.get(id)?.send(JSON.stringify({ type: 'resize', cols, rows }))
  }

  onData(id: string, callback: (data: string) => void): () => void {
    this.dataCallbacks.set(id, callback)
    return () => this.dataCallbacks.delete(id)
  }

  onExit(id: string, callback: () => void): () => void {
    this.exitCallbacks.set(id, callback)
    return () => this.exitCallbacks.delete(id)
  }

  close(id: string): void {
    const ws = this.sockets.get(id)
    if (ws) {
      ws.close()
      this.sockets.delete(id)
    }
    this.dataCallbacks.delete(id)
    this.exitCallbacks.delete(id)
  }

  async getCwd(_id: string): Promise<string> {
    // WebSocket backend doesn't support CWD tracking
    return ''
  }
}

let backend: TerminalBackend | null = null

export function getTerminalBackend(): TerminalBackend {
  if (!backend) {
    backend = isWailsRuntime() ? new WailsTerminalBackend() : new WebSocketTerminalBackend()
  }
  return backend
}
