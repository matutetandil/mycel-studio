import { Webhook } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const webhook: ConnectorDefinition = {
  type: 'webhook',
  label: 'Webhook',
  icon: Webhook,
  color: 'bg-orange-600',
  category: 'Integration',
  defaultDirection: 'output',
  fields: [
    { key: 'url', label: 'URL', type: 'string', placeholder: 'https://api.example.com/webhook', helpText: 'For outbound webhooks' },
    { key: 'path', label: 'Path', type: 'string', placeholder: '/webhooks/github', helpText: 'For inbound webhooks' },
    {
      key: 'method', label: 'Method', type: 'select',
      options: [
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'PATCH', label: 'PATCH' },
      ],
    },
    { key: 'secret', label: 'Secret', type: 'password', helpText: 'For HMAC signature verification' },
    { key: 'timeout', label: 'Timeout', type: 'string', placeholder: '30s' },
  ],
}
