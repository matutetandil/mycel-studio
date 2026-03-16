import { Mail } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const email: ConnectorDefinition = {
  type: 'email',
  label: 'Email',
  icon: Mail,
  color: 'bg-sky-500',
  category: 'Notifications',
  defaultDirection: 'output',
  fields: [
    { key: 'from', label: 'Default Sender', type: 'string', placeholder: 'noreply@example.com' },
    { key: 'from_name', label: 'Sender Name', type: 'string', placeholder: 'My App' },
    { key: 'reply_to', label: 'Reply-To', type: 'string', placeholder: 'support@example.com' },
    {
      key: 'template', label: 'HTML Template', type: 'file',
      placeholder: './templates/order_confirmation.html',
      helpText: 'Default HTML template file path (Go text/template syntax). Can be overridden per-email via payload.',
      fileExtensions: ['.html', '.htm'],
    },
  ],
  drivers: [
    {
      value: 'smtp',
      label: 'SMTP',
      fields: [
        { key: 'host', label: 'SMTP Host', type: 'string', placeholder: 'smtp.gmail.com', required: true },
        { key: 'port', label: 'Port', type: 'number', placeholder: '587' },
        { key: 'username', label: 'Username', type: 'string' },
        { key: 'password', label: 'Password', type: 'password' },
        {
          key: 'tls', label: 'TLS Mode', type: 'select',
          options: [
            { value: 'starttls', label: 'STARTTLS' },
            { value: 'tls', label: 'TLS' },
            { value: 'none', label: 'None' },
          ],
        },
        { key: 'timeout', label: 'Timeout', type: 'string', placeholder: '30s' },
        { key: 'pool_size', label: 'Pool Size', type: 'number', placeholder: '5', helpText: 'Connection pool size' },
      ],
    },
    {
      value: 'sendgrid',
      label: 'SendGrid',
      fields: [
        { key: 'api_key', label: 'API Key', type: 'password', required: true },
        { key: 'endpoint', label: 'API Endpoint', type: 'string', placeholder: 'https://api.sendgrid.com' },
        { key: 'timeout', label: 'Timeout', type: 'string', placeholder: '30s' },
      ],
    },
    {
      value: 'ses',
      label: 'AWS SES',
      fields: [
        { key: 'region', label: 'Region', type: 'string', placeholder: 'us-east-1' },
        { key: 'access_key_id', label: 'Access Key ID', type: 'string' },
        { key: 'secret_access_key', label: 'Secret Access Key', type: 'password' },
        { key: 'configuration_set', label: 'Configuration Set', type: 'string', helpText: 'SES configuration set name' },
        { key: 'timeout', label: 'Timeout', type: 'string', placeholder: '30s' },
      ],
    },
  ],
}
