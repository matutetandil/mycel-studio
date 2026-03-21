import type { FilePreviewerDefinition } from './types'
import { allDefinitions } from './definitions'

const registry = new Map<string, FilePreviewerDefinition>()

function registerPreviewer(def: FilePreviewerDefinition) {
  for (const ext of def.extensions) {
    registry.set(ext.toLowerCase(), def)
  }
}

// Auto-register all definitions
for (const def of allDefinitions) {
  registerPreviewer(def)
}

export function getPreviewerForFile(fileName: string): FilePreviewerDefinition | undefined {
  const lower = fileName.toLowerCase()
  // Match .env files: .env, .env.example, .env.production, etc.
  if (lower === '.env' || lower.startsWith('.env.')) {
    return registry.get('.env')
  }
  const dotIdx = lower.lastIndexOf('.')
  if (dotIdx === -1) return undefined
  return registry.get(lower.slice(dotIdx))
}

export function hasPreview(fileName: string): boolean {
  return !!getPreviewerForFile(fileName)
}
