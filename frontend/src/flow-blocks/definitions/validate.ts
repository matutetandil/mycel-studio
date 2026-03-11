import { ShieldCheck } from 'lucide-react'
import type { FlowBlockDefinition } from '../types'

export const validate: FlowBlockDefinition = {
  key: 'validate',
  dataKey: 'validate',
  hclBlock: 'validate',
  label: 'Validate',
  menuDescription: 'Validate input/output against a type schema',
  infoText: 'Apply type validation to the flow input or output. References a type defined in the canvas. Returns 422 on validation failure.',
  icon: ShieldCheck,
  color: 'text-violet-400',
  accentColor: 'violet',
  group: 'data',
  isActive: (data) => !!(data.validate?.input || data.validate?.output),
  nodeIndicator: { title: 'Has validation' },

  fields: [
    {
      key: 'input',
      label: 'Input Type',
      type: 'string',
      placeholder: 'user',
      helpText: 'Type name to validate incoming request data against',
    },
    {
      key: 'output',
      label: 'Output Type',
      type: 'string',
      placeholder: 'user',
      helpText: 'Type name to validate transform result before writing',
    },
  ],

  hclFields: [
    { key: 'input', hclKey: 'input', type: 'string' },
    { key: 'output', hclKey: 'output', type: 'string' },
  ],
}
