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
    { key: 'proto_files', label: 'Proto Files (comma-separated)', type: 'string', placeholder: 'service.proto, types.proto' },
    { key: 'max_recv_mb', label: 'Max Receive MB', type: 'number' },
    { key: 'max_send_mb', label: 'Max Send MB', type: 'number' },
    { key: 'tls_enabled', label: 'Enable TLS', type: 'boolean' },
    { key: 'tls_cert_file', label: 'TLS Cert File', type: 'string', visibleWhen: { field: 'tls_enabled', value: 'true' } },
    { key: 'tls_key_file', label: 'TLS Key File', type: 'string', visibleWhen: { field: 'tls_enabled', value: 'true' } },
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
        { key: 'target', label: 'Server Address', type: 'string', placeholder: 'localhost:50051' },
      ],
    },
  ],
}
