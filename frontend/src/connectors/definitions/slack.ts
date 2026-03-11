import { Hash } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const slack: ConnectorDefinition = {
  type: 'slack',
  label: 'Slack',
  icon: Hash,
  color: 'bg-purple-600',
  category: 'Notifications',
  defaultDirection: 'output',
  fields: [
    { key: 'webhook_url', label: 'Webhook URL', type: 'string', placeholder: 'https://hooks.slack.com/services/...', helpText: 'Use webhook OR token, not both' },
    { key: 'token', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...' },
    { key: 'channel', label: 'Default Channel', type: 'string', placeholder: '#general' },
    { key: 'username', label: 'Username', type: 'string', placeholder: 'Mycel Bot' },
    { key: 'icon_emoji', label: 'Icon Emoji', type: 'string', placeholder: ':robot_face:' },
    { key: 'timeout', label: 'Timeout', type: 'string', placeholder: '30s' },
  ],
}
