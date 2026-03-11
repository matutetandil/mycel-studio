import { Bell } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const push: ConnectorDefinition = {
  type: 'push',
  label: 'Push Notifications',
  icon: Bell,
  color: 'bg-red-500',
  category: 'Notifications',
  defaultDirection: 'output',
  fields: [
    { key: 'timeout', label: 'Timeout', type: 'string', placeholder: '30s' },
  ],
  drivers: [
    {
      value: 'fcm',
      label: 'Firebase (FCM)',
      fields: [
        { key: 'project_id', label: 'Project ID', type: 'string', required: true },
        { key: 'service_account_json', label: 'Service Account JSON', type: 'string', placeholder: './credentials/firebase.json' },
      ],
    },
    {
      value: 'apns',
      label: 'Apple (APNs)',
      fields: [
        { key: 'team_id', label: 'Team ID', type: 'string', required: true },
        { key: 'key_id', label: 'Key ID', type: 'string', required: true },
        { key: 'private_key', label: 'Private Key Path', type: 'string', placeholder: './credentials/apns.p8' },
        { key: 'bundle_id', label: 'Bundle ID', type: 'string', placeholder: 'com.example.app', required: true },
        { key: 'production', label: 'Production', type: 'boolean' },
      ],
    },
  ],
}
