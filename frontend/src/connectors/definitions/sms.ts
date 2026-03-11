import { Smartphone } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const sms: ConnectorDefinition = {
  type: 'sms',
  label: 'SMS',
  icon: Smartphone,
  color: 'bg-lime-600',
  category: 'Notifications',
  defaultDirection: 'output',
  fields: [
    { key: 'timeout', label: 'Timeout', type: 'string', placeholder: '30s' },
  ],
  drivers: [
    {
      value: 'twilio',
      label: 'Twilio',
      fields: [
        { key: 'account_sid', label: 'Account SID', type: 'string', required: true },
        { key: 'auth_token', label: 'Auth Token', type: 'password', required: true },
        { key: 'from', label: 'From Number', type: 'string', placeholder: '+1234567890', required: true },
      ],
    },
    {
      value: 'sns',
      label: 'AWS SNS',
      fields: [
        { key: 'region', label: 'Region', type: 'string', placeholder: 'us-east-1' },
        { key: 'access_key_id', label: 'Access Key ID', type: 'string' },
        { key: 'secret_access_key', label: 'Secret Access Key', type: 'password' },
        { key: 'sender_id', label: 'Sender ID', type: 'string' },
        {
          key: 'sms_type', label: 'SMS Type', type: 'select',
          options: [
            { value: 'Promotional', label: 'Promotional' },
            { value: 'Transactional', label: 'Transactional' },
          ],
        },
      ],
    },
  ],
}
