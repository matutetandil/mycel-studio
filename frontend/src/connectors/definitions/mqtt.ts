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
    { key: 'connect_timeout', label: 'Connect Timeout', type: 'string', placeholder: '10s' },
    { key: 'keep_alive', label: 'Keep Alive', type: 'string', placeholder: '30s' },
    { key: 'clean_session', label: 'Clean Session', type: 'boolean' },
    { key: 'max_reconnect_interval', label: 'Max Reconnect Interval', type: 'string', placeholder: '5m' },
    { key: 'tls_enabled', label: 'Enable TLS', type: 'boolean' },
    { key: 'tls_cert', label: 'TLS Cert File', type: 'string', visibleWhen: { field: 'tls_enabled', value: 'true' } },
    { key: 'tls_key', label: 'TLS Key File', type: 'string', visibleWhen: { field: 'tls_enabled', value: 'true' } },
    { key: 'tls_ca', label: 'TLS CA File', type: 'string', visibleWhen: { field: 'tls_enabled', value: 'true' } },
  ],
}
