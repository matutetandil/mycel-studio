import type { MycelAPI } from '../types/electron.d'

// Helper to check if running in Electron
export function isElectron(): boolean {
  return typeof window !== 'undefined' && window.mycelAPI !== undefined
}

// Helper to get the API (throws if not in Electron)
export function getMycelAPI(): MycelAPI {
  if (!window.mycelAPI) {
    throw new Error('Not running in Electron environment')
  }
  return window.mycelAPI
}
