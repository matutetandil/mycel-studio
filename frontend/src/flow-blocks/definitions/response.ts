import { MessageSquare } from 'lucide-react'
import type { FlowBlockDefinition } from '../types'

export const response: FlowBlockDefinition = {
  key: 'response',
  dataKey: 'response',
  hclBlock: 'response',
  label: 'Response',
  menuDescription: 'Transform output after destination (CEL)',
  infoText: 'Transform the output after receiving from the destination using CEL expressions. For echo flows (no destination), transforms input directly.',
  icon: MessageSquare,
  color: 'text-green-400',
  accentColor: 'green',
  group: 'output',
  customEditor: true,
  isActive: (data) => !!(data.response && Object.keys(data.response.fields || {}).length > 0),
  nodeIndicator: { title: 'Response transform' },
}
