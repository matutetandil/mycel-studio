import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { getTerminalBackend } from '../../lib/terminal'

interface TerminalViewProps {
  sessionId: string
}

export default function TerminalView({ sessionId }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const initializedRef = useRef(false)
  const lastSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return
    initializedRef.current = true

    const backend = getTerminalBackend()

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace",
      theme: {
        background: '#171717',
        foreground: '#e5e5e5',
        cursor: '#e5e5e5',
        selectionBackground: '#525252',
        black: '#171717',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e5e5e5',
        brightBlack: '#737373',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)
    terminal.open(containerRef.current)

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    // Fit after a small delay to ensure container is sized
    requestAnimationFrame(() => {
      fitAddon.fit()
      // Send actual size to backend
      backend.resize(sessionId, terminal.cols, terminal.rows)
    })

    // Wire input: terminal → backend
    const inputDisposable = terminal.onData((data) => {
      backend.write(sessionId, data)
    })

    // Wire resize: terminal → backend
    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      backend.resize(sessionId, cols, rows)
    })

    // Wire output: backend → terminal
    const cleanupData = backend.onData(sessionId, (data) => {
      terminal.write(data)
    })

    // Wire exit: backend → terminal
    const cleanupExit = backend.onExit(sessionId, () => {
      terminal.write('\r\n\x1b[90m[Process exited]\x1b[0m\r\n')
    })

    // Observe container resize → re-fit terminal (only if size actually changed)
    const container = containerRef.current
    const observer = new ResizeObserver(() => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w === lastSizeRef.current.w && h === lastSizeRef.current.h) return
      if (w === 0 || h === 0) return // hidden
      lastSizeRef.current = { w, h }
      requestAnimationFrame(() => {
        try {
          fitAddon.fit()
        } catch {
          // ignore fit errors during rapid resize
        }
      })
    })
    observer.observe(container)

    // Focus terminal
    terminal.focus()

    return () => {
      observer.disconnect()
      inputDisposable.dispose()
      resizeDisposable.dispose()
      cleanupData()
      cleanupExit()
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [sessionId])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ padding: '4px 0 6px 8px' }}
    />
  )
}
