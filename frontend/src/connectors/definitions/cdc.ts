import { Activity } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const cdc: ConnectorDefinition = {
  type: 'cdc',
  label: 'CDC',
  icon: Activity,
  color: 'bg-emerald-600',
  category: 'Database',
  defaultDirection: 'input',
  fields: [],
  drivers: [
    {
      value: 'postgres',
      label: 'PostgreSQL',
      fields: [
        { key: 'host', label: 'Host', type: 'string', placeholder: 'localhost' },
        { key: 'port', label: 'Port', type: 'number', placeholder: '5432' },
        { key: 'database', label: 'Database', type: 'string', placeholder: 'myapp', required: true },
        { key: 'user', label: 'User', type: 'string', placeholder: 'replication_user', required: true },
        { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••', required: true },
        { key: 'slot_name', label: 'Slot Name', type: 'string', placeholder: 'mycel_slot' },
        { key: 'publication', label: 'Publication', type: 'string', placeholder: 'mycel_pub' },
      ],
    },
  ],
}
