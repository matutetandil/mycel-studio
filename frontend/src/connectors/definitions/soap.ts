import { FileCode } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const soap: ConnectorDefinition = {
  type: 'soap',
  label: 'SOAP',
  icon: FileCode,
  color: 'bg-rose-600',
  category: 'API & Web',
  defaultDirection: 'bidirectional',
  fields: [
    {
      key: 'soap_version', label: 'SOAP Version', type: 'select',
      options: [
        { value: '1.1', label: 'SOAP 1.1' },
        { value: '1.2', label: 'SOAP 1.2' },
      ],
    },
    { key: 'namespace', label: 'Namespace', type: 'string', placeholder: 'http://example.com/ws' },
  ],
  drivers: [
    {
      value: 'client',
      label: 'Client',
      fields: [
        { key: 'endpoint', label: 'Endpoint', type: 'string', placeholder: 'https://api.example.com/soap', required: true },
        { key: 'wsdl', label: 'WSDL URL', type: 'string', placeholder: 'https://api.example.com/soap?wsdl' },
        { key: 'timeout', label: 'Timeout', type: 'string', placeholder: '30s' },
      ],
    },
    {
      value: 'server',
      label: 'Server',
      fields: [
        { key: 'port', label: 'Port', type: 'number', placeholder: '8080' },
      ],
    },
  ],
}
