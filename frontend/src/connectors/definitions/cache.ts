import { Zap } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const cache: ConnectorDefinition = {
  type: 'cache',
  label: 'Cache',
  icon: Zap,
  color: 'bg-yellow-500',
  category: 'Database',
  defaultDirection: 'bidirectional',
  fields: [],
  drivers: [
    {
      value: 'memory',
      label: 'In-Memory',
      fields: [
        { key: 'max_items', label: 'Max Items', type: 'number', placeholder: '10000' },
        { key: 'default_ttl', label: 'Default TTL', type: 'string', placeholder: '5m' },
      ],
    },
    {
      value: 'redis',
      label: 'Redis',
      fields: [
        { key: 'address', label: 'Address', type: 'string', placeholder: 'localhost:6379' },
        { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
        { key: 'db', label: 'DB', type: 'number', placeholder: '0' },
        { key: 'key_prefix', label: 'Key Prefix', type: 'string', placeholder: 'myapp:' },
        { key: 'default_ttl', label: 'Default TTL', type: 'string', placeholder: '5m' },
        { key: 'pool_max', label: 'Max Connections', type: 'number', placeholder: '10' },
        { key: 'pool_min', label: 'Min Connections', type: 'number', placeholder: '1' },
      ],
    },
  ],
}
