import { Hexagon } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const graphql: ConnectorDefinition = {
  type: 'graphql',
  label: 'GraphQL',
  icon: Hexagon,
  color: 'bg-pink-500',
  category: 'API & Web',
  defaultDirection: 'input',
  modeMapping: { input: 'server', output: 'client' },
  hasOperationsEditor: true,
  fields: [
    { key: 'port', label: 'Port', type: 'number', placeholder: '4000' },
    { key: 'endpoint', label: 'Endpoint', type: 'string', placeholder: '/graphql' },
  ],
  drivers: [
    {
      value: 'server',
      label: 'Server',
      fields: [
        { key: 'playground', label: 'Enable Playground', type: 'boolean' },
        { key: 'playground_path', label: 'Playground Path', type: 'string', placeholder: '/playground' },
        { key: 'introspection', label: 'Enable Introspection', type: 'boolean' },
        { key: 'cors_origins', label: 'CORS Origins', type: 'string', placeholder: '*, http://localhost:3000' },
        { key: 'cors_methods', label: 'CORS Methods', type: 'string', placeholder: 'GET, POST, OPTIONS' },
      ],
    },
    {
      value: 'client',
      label: 'Client',
      fields: [],
    },
  ],
}
