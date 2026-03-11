import { Globe } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const rest: ConnectorDefinition = {
  type: 'rest',
  label: 'REST API',
  icon: Globe,
  color: 'bg-blue-500',
  category: 'API & Web',
  defaultDirection: 'input',
  modeMapping: { input: 'server', output: 'client' },
  hasOperationsEditor: true,
  fields: [
    { key: 'port', label: 'Port', type: 'number', placeholder: '3000' },
    { key: 'cors', label: 'Enable CORS', type: 'boolean' },
  ],
  drivers: undefined,
}
