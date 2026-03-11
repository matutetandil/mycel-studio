import { Server } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const grpc: ConnectorDefinition = {
  type: 'grpc',
  label: 'gRPC',
  icon: Server,
  color: 'bg-purple-500',
  category: 'API & Web',
  defaultDirection: 'input',
  modeMapping: { input: 'server', output: 'client' },
  fields: [
    { key: 'port', label: 'Port', type: 'number', placeholder: '50051' },
    { key: 'proto_path', label: 'Proto Path', type: 'string', placeholder: './proto' },
  ],
  drivers: [
    {
      value: 'server',
      label: 'Server',
      fields: [
        { key: 'reflection', label: 'Enable Reflection', type: 'boolean' },
      ],
    },
    {
      value: 'client',
      label: 'Client',
      fields: [
        { key: 'address', label: 'Server Address', type: 'string', placeholder: 'localhost:50051' },
      ],
    },
  ],
}
