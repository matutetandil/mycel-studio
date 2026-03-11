import type { FlowBlockDefinition, FlowBlockGroup } from './types'
import * as definitions from './definitions'

const registry = new Map<string, FlowBlockDefinition>()

for (const def of Object.values(definitions)) {
  registry.set(def.key, def)
}

export function getFlowBlock(key: string): FlowBlockDefinition | undefined {
  return registry.get(key)
}

export function getAllFlowBlocks(): FlowBlockDefinition[] {
  return Array.from(registry.values())
}

export function getFlowBlocksByGroup(): Array<{ group: FlowBlockGroup; blocks: FlowBlockDefinition[] }> {
  const groupOrder: FlowBlockGroup[] = ['data', 'concurrency', 'output']
  const grouped = new Map<FlowBlockGroup, FlowBlockDefinition[]>()

  for (const group of groupOrder) {
    grouped.set(group, [])
  }

  for (const def of registry.values()) {
    grouped.get(def.group)?.push(def)
  }

  return groupOrder
    .map(group => ({ group, blocks: grouped.get(group) || [] }))
    .filter(g => g.blocks.length > 0)
}

export function getSimpleFlowBlocks(): FlowBlockDefinition[] {
  return Array.from(registry.values()).filter(def => !def.customEditor && def.fields)
}

export function getCustomFlowBlocks(): FlowBlockDefinition[] {
  return Array.from(registry.values()).filter(def => def.customEditor)
}
