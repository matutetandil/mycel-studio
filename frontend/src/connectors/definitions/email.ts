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
      ],
    },
    {
      value: 'sendgrid',
      label: 'SendGrid',
      fields: [
        { key: 'api_key', label: 'API Key', type: 'password', required: true },
      ],
    },
    {
      value: 'ses',
      label: 'AWS SES',
      fields: [
        { key: 'region', label: 'Region', type: 'string', placeholder: 'us-east-1' },
        { key: 'access_key_id', label: 'Access Key ID', type: 'string' },
        { key: 'secret_access_key', label: 'Secret Access Key', type: 'password' },
      ],
    },
  ],
}
