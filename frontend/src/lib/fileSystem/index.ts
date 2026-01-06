// File System Provider Factory
// Automatically selects the best available provider based on environment

import type { FileSystemProvider, FSCapabilities, FSProject, FSProjectFile } from './types'
import { ElectronFileSystem } from './electronFS'
import { BrowserFileSystem, isBrowserFSAvailable } from './browserFS'
import { FallbackFileSystem } from './fallbackFS'

export type { FileSystemProvider, FSCapabilities, FSProject, FSProjectFile }

// Singleton instance
let providerInstance: FileSystemProvider | null = null

// Check if running in Electron
function isElectron(): boolean {
  return typeof window !== 'undefined' && window.mycelAPI !== undefined
}

// Get the best available file system provider
export function getFileSystemProvider(): FileSystemProvider {
  if (providerInstance) return providerInstance

  if (isElectron()) {
    providerInstance = new ElectronFileSystem()
  } else if (isBrowserFSAvailable()) {
    providerInstance = new BrowserFileSystem()
  } else {
    providerInstance = new FallbackFileSystem()
  }

  return providerInstance
}

// Reset provider (useful for testing)
export function resetFileSystemProvider(): void {
  providerInstance = null
}

// Get capabilities of the current provider
export function getCapabilities(): FSCapabilities {
  return getFileSystemProvider().getCapabilities()
}

// Convenience exports
export { ElectronFileSystem } from './electronFS'
export { BrowserFileSystem, isBrowserFSAvailable } from './browserFS'
export { FallbackFileSystem } from './fallbackFS'
