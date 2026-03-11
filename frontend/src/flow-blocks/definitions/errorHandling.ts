import { AlertTriangle } from 'lucide-react'
import type { FlowBlockDefinition } from '../types'

export const errorHandling: FlowBlockDefinition = {
  key: 'errorHandling',
  dataKey: 'errorHandling',
  hclBlock: 'error_handling',
  label: 'Error Handling',
  menuDescription: 'Retry, fallback, and error response',
  infoText: 'Configure error handling with retry policies, dead letter queue fallbacks, and custom error responses.',
  icon: AlertTriangle,
  color: 'text-red-400',
  accentColor: 'red',
  group: 'output',
  customEditor: true,
  isActive: (data) => !!data.errorHandling,
  nodeIndicator: { title: 'Error handling' },
}
