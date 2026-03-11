import { Code } from 'lucide-react'
import type { ValidatorTypeDefinition } from '../types'

export const cel: ValidatorTypeDefinition = {
  type: 'cel',
  label: 'CEL Expression',
  description: 'Validate using a CEL expression that returns boolean',
  icon: Code,
  color: 'bg-amber-500',
  fields: [
    {
      key: 'expr',
      label: 'Expression',
      type: 'text',
      placeholder: 'value >= 18 && value <= 120',
      helpText: 'CEL expression using "value" variable. Must return true/false.',
      required: true,
      mono: true,
    },
  ],
}
