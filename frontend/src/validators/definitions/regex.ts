import { Regex } from 'lucide-react'
import type { ValidatorTypeDefinition } from '../types'

export const regex: ValidatorTypeDefinition = {
  type: 'regex',
  label: 'Regex',
  description: 'Validate using a regular expression pattern',
  icon: Regex,
  color: 'bg-purple-500',
  fields: [
    {
      key: 'pattern',
      label: 'Pattern',
      type: 'string',
      placeholder: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      helpText: 'Regular expression the value must match',
      required: true,
      mono: true,
    },
  ],
}
