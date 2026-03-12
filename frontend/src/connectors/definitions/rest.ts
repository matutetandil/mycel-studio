import { Globe } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const rest: ConnectorDefinition = {
  type: 'rest',
  label: 'REST API',
  icon: Globe,
  color: 'bg-blue-500',
  category: 'API & Web',
  defaultDirection: 'input',
  hasOperationsEditor: true,
  fields: [
    { key: 'port', label: 'Port', type: 'number', placeholder: '3000' },
    { key: 'cors', label: 'Enable CORS', type: 'boolean' },
    { key: 'cors_origins', label: 'Allowed Origins', type: 'string', placeholder: '*, http://localhost:3000', visibleWhen: { field: 'cors', value: 'true' } },
    { key: 'cors_methods', label: 'Allowed Methods', type: 'string', placeholder: 'GET, POST, PUT, DELETE, OPTIONS', visibleWhen: { field: 'cors', value: 'true' } },
    { key: 'cors_headers', label: 'Allowed Headers', type: 'string', placeholder: 'Content-Type, Authorization', visibleWhen: { field: 'cors', value: 'true' } },
  ],
  drivers: undefined,
}
