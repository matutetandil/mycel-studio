import { Radio } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const sse: ConnectorDefinition = {
  type: 'sse',
  label: 'SSE',
  icon: Radio,
  color: 'bg-violet-400',
  category: 'Real-time',
  defaultDirection: 'output',
  fields: [
    { key: 'port', label: 'Port', type: 'number', placeholder: '8080' },
    { key: 'host', label: 'Host', type: 'string', placeholder: '0.0.0.0' },
    { key: 'path', label: 'Path', type: 'string', placeholder: '/events' },
    { key: 'heartbeat', label: 'Heartbeat Interval', type: 'string', placeholder: '30s' },
  ],
}
