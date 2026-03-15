// File System Provider Factory
// Automatically selects the best available provider based on environment

import type { FileSystemProvider, FSCapabilities, FSProject, FSProjectFile } from './types'
import { BrowserFileSystem, isBrowserFSAvailable } from './browserFS'
import { FallbackFileSystem } from './fallbackFS'
import { WailsFileSystem, isWailsRuntime } from './wailsFS'

export type { FileSystemProvider, FSCapabilities, FSProject, FSProjectFile }

// Singleton instance
let providerInstance: FileSystemProvider | null = null

// Get the best available file system provider
export function getFileSystemProvider(): FileSystemProvider {
  if (providerInstance) return providerInstance

  if (isWailsRuntime()) {
    providerInstance = new WailsFileSystem()
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
export { BrowserFileSystem, isBrowserFSAvailable } from './browserFS'
export { FallbackFileSystem } from './fallbackFS'
export { WailsFileSystem } from './wailsFS'
