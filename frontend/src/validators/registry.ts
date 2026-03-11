import type { ValidatorTypeDefinition } from './types'
import * as definitions from './definitions'

const registry = new Map<string, ValidatorTypeDefinition>()

for (const def of Object.values(definitions)) {
  registry.set(def.type, def)
}

export function getValidatorType(type: string): ValidatorTypeDefinition | undefined {
  return registry.get(type)
}

export function getAllValidatorTypes(): ValidatorTypeDefinition[] {
  return Array.from(registry.values())
}
