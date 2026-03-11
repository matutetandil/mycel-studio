import { Cpu } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const mqtt: ConnectorDefinition = {
  type: 'mqtt',
  label: 'MQTT',
  icon: Cpu,
  color: 'bg-teal-500',
  category: 'Messaging',
  defaultDirection: 'bidirectional',
  fields: [
    { key: 'broker', label: 'Broker', type: 'string', placeholder: 'tcp://localhost:1883' },
    { key: 'client_id', label: 'Client ID', type: 'string', placeholder: 'mycel' },
    { key: 'username', label: 'Username', type: 'string' },
    { key: 'password', label: 'Password', type: 'password' },
    {
      key: 'qos', label: 'QoS', type: 'select',
      options: [
        { value: '0', label: '0 - At most once' },
        { value: '1', label: '1 - At least once' },
        { value: '2', label: '2 - Exactly once' },
      ],
    },
    { key: 'topic', label: 'Default Topic', type: 'string', placeholder: 'devices/+/telemetry' },
    { key: 'auto_reconnect', label: 'Auto Reconnect', type: 'boolean', defaultValue: true },
  ],
}
