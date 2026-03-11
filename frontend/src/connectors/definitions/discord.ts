import { MessageCircle } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const discord: ConnectorDefinition = {
  type: 'discord',
  label: 'Discord',
  icon: MessageCircle,
  color: 'bg-indigo-600',
  category: 'Notifications',
  defaultDirection: 'output',
  fields: [
    { key: 'webhook_url', label: 'Webhook URL', type: 'string', placeholder: 'https://discord.com/api/webhooks/...', helpText: 'Use webhook OR bot token, not both' },
    { key: 'bot_token', label: 'Bot Token', type: 'password' },
    { key: 'channel_id', label: 'Channel ID', type: 'string', placeholder: 'For bot mode' },
    { key: 'username', label: 'Username', type: 'string' },
    { key: 'avatar_url', label: 'Avatar URL', type: 'string' },
    { key: 'timeout', label: 'Timeout', type: 'string', placeholder: '30s' },
  ],
}
