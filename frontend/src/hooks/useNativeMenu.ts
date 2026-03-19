// Listen for native macOS menu events from Wails
// These events are emitted by Go menu.go via runtime.EventsEmit

import { useEffect } from 'react'
import { isWailsRuntime } from '../lib/api'

interface NativeMenuCallbacks {
  onNewProject: () => void
  onNewTemplate: () => void
  onOpenProject: () => void
  onSaveProject: () => void
  onCloseProject: () => void
  onUndo: () => void
  onRedo: () => void
  onDuplicate: () => void
  onToggleViewMode: () => void
  onToggleTheme: () => void
  onToggleEditor: () => void
  onToggleTerminal: () => void
  onShowShortcuts: () => void
  onShowSettings: () => void
}

export function useNativeMenu(callbacks: NativeMenuCallbacks) {
  useEffect(() => {
    if (!isWailsRuntime()) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const runtime = w.runtime
    if (!runtime?.EventsOn) return

    const cleanups: Array<() => void> = []

    const on = (event: string, cb: () => void) => {
      runtime.EventsOn(event, cb)
      cleanups.push(() => runtime.EventsOff(event))
    }

    on('menu:new-project', callbacks.onNewProject)
    on('menu:new-template', callbacks.onNewTemplate)
    on('menu:open-project', callbacks.onOpenProject)
    on('menu:save-project', callbacks.onSaveProject)
    on('menu:close-project', callbacks.onCloseProject)
    on('menu:undo', callbacks.onUndo)
    on('menu:redo', callbacks.onRedo)
    on('menu:duplicate', callbacks.onDuplicate)
    on('menu:toggle-view-mode', callbacks.onToggleViewMode)
    on('menu:toggle-theme', callbacks.onToggleTheme)
    on('menu:toggle-editor', callbacks.onToggleEditor)
    on('menu:toggle-terminal', callbacks.onToggleTerminal)
    on('menu:show-shortcuts', callbacks.onShowShortcuts)
    on('menu:show-settings', callbacks.onShowSettings)

    return () => {
      cleanups.forEach(fn => fn())
    }
  }, [callbacks])
}
