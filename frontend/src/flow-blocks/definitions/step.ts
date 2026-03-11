import { Layers } from 'lucide-react'
import type { FlowBlockDefinition } from '../types'

export const step: FlowBlockDefinition = {
  key: 'step',
  dataKey: 'steps',
  hclBlock: 'step',
  label: 'Steps',
  menuDescription: 'Fetch data from external connectors (step.*)',
  infoText: 'Steps fetch data from external connectors during flow execution. Results are available as step.name.field in transforms.',
  icon: Layers,
  color: 'text-blue-400',
  accentColor: 'blue',
  group: 'data',
  customEditor: true,
  isActive: (data) => !!(data.steps && data.steps.length > 0),
}
