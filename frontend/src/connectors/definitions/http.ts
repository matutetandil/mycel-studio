import { Globe } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const http: ConnectorDefinition = {
  type: 'http',
  label: 'HTTP Client',
  icon: Globe,
  color: 'bg-blue-400',
  category: 'API & Web',
  defaultDirection: 'output',
  fields: [
    { key: 'base_url', label: 'Base URL', type: 'string', placeholder: 'https://api.example.com', required: true },
    { key: 'timeout', label: 'Timeout', type: 'string', placeholder: '30s' },
    {
      key: 'auth_type', label: 'Auth Type', type: 'select',
      options: [
        { value: '', label: 'None' },
        { value: 'bearer', label: 'Bearer Token' },
        { value: 'basic', label: 'Basic Auth' },
        { value: 'api_key', label: 'API Key' },
        { value: 'oauth2', label: 'OAuth2' },
      ],
    },
    { key: 'auth_token', label: 'Token', type: 'password', placeholder: 'Bearer token', visibleWhen: { field: 'auth_type', value: 'bearer' } },
    { key: 'auth_username', label: 'Username', type: 'string', placeholder: 'user', visibleWhen: { field: 'auth_type', value: 'basic' } },
    { key: 'auth_password', label: 'Password', type: 'password', placeholder: '••••••••', visibleWhen: { field: 'auth_type', value: 'basic' } },
    { key: 'auth_header', label: 'Header Name', type: 'string', placeholder: 'X-API-Key', visibleWhen: { field: 'auth_type', value: 'api_key' } },
    { key: 'auth_value', label: 'API Key', type: 'password', placeholder: '••••••••', visibleWhen: { field: 'auth_type', value: 'api_key' } },
    { key: 'retry_count', label: 'Retry Count', type: 'number', placeholder: '3' },
    { key: 'retry_interval', label: 'Retry Interval', type: 'string', placeholder: '1s' },
    {
      key: 'retry_backoff', label: 'Retry Backoff', type: 'select',
      options: [
        { value: '', label: 'None' },
        { value: 'constant', label: 'Constant' },
        { value: 'exponential', label: 'Exponential' },
      ],
    },
  ],
}
