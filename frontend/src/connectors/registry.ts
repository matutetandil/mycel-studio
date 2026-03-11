import type { ConnectorDefinition, ConnectorCategory } from './types'
import type { ConnectorDirection } from '../types'
import * as definitions from './definitions'

// Build registry from all definitions
const registry = new Map<string, ConnectorDefinition>()

for (const def of Object.values(definitions)) {
  registry.set(def.type, def)
}

// Get a connector definition by type
export function getConnector(type: string): ConnectorDefinition | undefined {
  return registry.get(type)
}

// Get all connector definitions
export function getAllConnectors(): ConnectorDefinition[] {
  return Array.from(registry.values())
}

// Get all connector type strings
export function getAllConnectorTypes(): string[] {
  return Array.from(registry.keys())
}

// Get connectors grouped by category (for Palette)
export function getConnectorsByCategory(): Array<{ category: ConnectorCategory; connectors: ConnectorDefinition[] }> {
  const groups = new Map<ConnectorCategory, ConnectorDefinition[]>()

  for (const def of registry.values()) {
    const list = groups.get(def.category) || []
    list.push(def)
    groups.set(def.category, list)
  }

  // Return in a stable order
  const categoryOrder: ConnectorCategory[] = [
    'API & Web',
    'Database',
    'Messaging',
    'Real-time',
    'Storage',
    'Execution',
    'Integration',
    'Notifications',
  ]

  return categoryOrder
    .filter(cat => groups.has(cat))
    .map(cat => ({ category: cat, connectors: groups.get(cat)! }))
}

// Get the default direction for a connector type
export function getDefaultDirection(type: string): ConnectorDirection {
  return registry.get(type)?.defaultDirection || 'bidirectional'
}

// Get the HCL mode string for a connector type + direction
export function getConnectorMode(type: string, direction: ConnectorDirection | undefined): string | null {
  const def = registry.get(type)
  if (!def?.modeMapping || !direction) return null
  return def.modeMapping[direction as 'input' | 'output'] ?? null
}

// Get driver options for a connector type
export function getDriverOptions(type: string): string[] {
  const def = registry.get(type)
  return def?.drivers?.map(d => d.value) || []
}
