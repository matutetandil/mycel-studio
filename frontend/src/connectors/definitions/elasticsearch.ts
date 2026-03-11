import { Search } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const elasticsearch: ConnectorDefinition = {
  type: 'elasticsearch',
  label: 'Elasticsearch',
  icon: Search,
  color: 'bg-yellow-600',
  category: 'Database',
  defaultDirection: 'bidirectional',
  fields: [
    { key: 'url', label: 'URL', type: 'string', placeholder: 'http://localhost:9200' },
    { key: 'username', label: 'Username', type: 'string', placeholder: 'elastic' },
    { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
    { key: 'timeout', label: 'Timeout', type: 'string', placeholder: '30s' },
  ],
}
