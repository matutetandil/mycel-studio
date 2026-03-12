import { Database } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const database: ConnectorDefinition = {
  type: 'database',
  label: 'Database',
  icon: Database,
  color: 'bg-green-500',
  category: 'Database',
  defaultDirection: 'output',
  fields: [],
  drivers: [
    {
      value: 'sqlite',
      label: 'SQLite',
      fields: [
        { key: 'database', label: 'Database Path', type: 'string', placeholder: './data/app.db', required: true },
      ],
    },
    {
      value: 'postgres',
      label: 'PostgreSQL',
      fields: [
        { key: 'host', label: 'Host', type: 'string', placeholder: 'localhost' },
        { key: 'port', label: 'Port', type: 'number', placeholder: '5432' },
        { key: 'database', label: 'Database', type: 'string', placeholder: 'myapp' },
        { key: 'user', label: 'User', type: 'string', placeholder: 'postgres' },
        { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
        {
          key: 'ssl_mode', label: 'SSL Mode', type: 'select',
          options: [
            { value: '', label: 'Default' },
            { value: 'disable', label: 'Disable' },
            { value: 'require', label: 'Require' },
            { value: 'verify-full', label: 'Verify Full' },
          ],
        },
        { key: 'pool_max', label: 'Max Connections', type: 'number', placeholder: '10' },
        { key: 'pool_min', label: 'Min Connections', type: 'number', placeholder: '1' },
        { key: 'pool_max_lifetime', label: 'Max Connection Lifetime', type: 'string', placeholder: '30m' },
      ],
    },
    {
      value: 'mysql',
      label: 'MySQL',
      fields: [
        { key: 'host', label: 'Host', type: 'string', placeholder: 'localhost' },
        { key: 'port', label: 'Port', type: 'number', placeholder: '3306' },
        { key: 'database', label: 'Database', type: 'string', placeholder: 'myapp' },
        { key: 'user', label: 'User', type: 'string', placeholder: 'root' },
        { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
        { key: 'charset', label: 'Charset', type: 'string', placeholder: 'utf8mb4' },
        { key: 'pool_max', label: 'Max Connections', type: 'number', placeholder: '10' },
        { key: 'pool_min', label: 'Min Connections', type: 'number', placeholder: '1' },
        { key: 'pool_max_lifetime', label: 'Max Connection Lifetime', type: 'string', placeholder: '30m' },
      ],
    },
    {
      value: 'mongodb',
      label: 'MongoDB',
      fields: [
        { key: 'uri', label: 'URI', type: 'string', placeholder: 'mongodb://localhost:27017' },
        { key: 'database', label: 'Database', type: 'string', placeholder: 'myapp' },
      ],
    },
  ],
}
