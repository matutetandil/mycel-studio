import { MessageSquare } from 'lucide-react'
import type { FlowBlockDefinition } from '../types'

export const response: FlowBlockDefinition = {
  key: 'response',
  dataKey: 'response',
  hclBlock: 'response',
  label: 'Response',
  menuDescription: 'Configure HTTP response (status, body)',
  infoText: 'Configure the HTTP response returned by this flow, including status code, headers, and body.',
  icon: MessageSquare,
  color: 'text-green-400',
  accentColor: 'green',
  group: 'output',
  customEditor: true,
  isActive: (data) => !!data.response,
  nodeIndicator: { title: 'Custom response' },
}
