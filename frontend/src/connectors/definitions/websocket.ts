import { Radio } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const websocket: ConnectorDefinition = {
  type: 'websocket',
  label: 'WebSocket',
  icon: Radio,
  color: 'bg-violet-500',
  category: 'Real-time',
  defaultDirection: 'bidirectional',
  modeMapping: { input: 'server', output: 'client' },
  fields: [
    { key: 'port', label: 'Port', type: 'number', placeholder: '8080' },
    { key: 'host', label: 'Host', type: 'string', placeholder: '0.0.0.0' },
    { key: 'path', label: 'Path', type: 'string', placeholder: '/ws' },
    { key: 'ping_interval', label: 'Ping Interval', type: 'string', placeholder: '30s' },
    { key: 'pong_timeout', label: 'Pong Timeout', type: 'string', placeholder: '10s' },
  ],
}
