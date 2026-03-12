import { Folder } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const file: ConnectorDefinition = {
  type: 'file',
  label: 'File Storage',
  icon: Folder,
  color: 'bg-neutral-500',
  category: 'Storage',
  defaultDirection: 'output',
  fields: [
    { key: 'base_path', label: 'Base Path', type: 'string', placeholder: '/data/files', required: true },
    {
      key: 'format', label: 'Format', type: 'select',
      options: [
        { value: '', label: 'Auto' },
        { value: 'json', label: 'JSON' },
        { value: 'csv', label: 'CSV' },
        { value: 'excel', label: 'Excel' },
        { value: 'text', label: 'Text' },
        { value: 'binary', label: 'Binary' },
      ],
    },
    { key: 'watch', label: 'Watch for changes', type: 'boolean' },
    { key: 'watch_interval', label: 'Watch Interval', type: 'string', placeholder: '5s', visibleWhen: { field: 'watch', value: 'true' } },
    { key: 'create_dirs', label: 'Create Directories', type: 'boolean' },
    { key: 'permissions', label: 'Permissions', type: 'string', placeholder: '0644' },
  ],
}
