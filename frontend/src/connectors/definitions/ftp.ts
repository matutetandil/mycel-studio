import { ArrowUpDown } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const ftp: ConnectorDefinition = {
  type: 'ftp',
  label: 'FTP/SFTP',
  icon: ArrowUpDown,
  color: 'bg-stone-500',
  category: 'Storage',
  defaultDirection: 'bidirectional',
  fields: [
    { key: 'host', label: 'Host', type: 'string', placeholder: 'ftp.example.com', required: true },
    { key: 'username', label: 'Username', type: 'string' },
    { key: 'password', label: 'Password', type: 'password' },
    { key: 'base_path', label: 'Base Path', type: 'string', placeholder: '/uploads' },
    { key: 'timeout', label: 'Timeout', type: 'string', placeholder: '30s' },
  ],
  drivers: [
    {
      value: 'ftp',
      label: 'FTP',
      fields: [
        { key: 'port', label: 'Port', type: 'number', placeholder: '21' },
        { key: 'passive', label: 'Passive Mode', type: 'boolean', defaultValue: true },
        { key: 'tls', label: 'Use TLS (FTPS)', type: 'boolean' },
      ],
    },
    {
      value: 'sftp',
      label: 'SFTP',
      fields: [
        { key: 'port', label: 'Port', type: 'number', placeholder: '22' },
        { key: 'key_file', label: 'SSH Key File', type: 'string', placeholder: '~/.ssh/id_rsa' },
      ],
    },
  ],
}
