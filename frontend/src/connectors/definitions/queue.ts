import { MessageSquare } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const queue: ConnectorDefinition = {
  type: 'queue',
  label: 'Message Queue',
  icon: MessageSquare,
  color: 'bg-orange-500',
  category: 'Messaging',
  defaultDirection: 'input',
  modeMapping: { input: 'consumer', output: 'producer' },
  fields: [],
  drivers: [
    {
      value: 'rabbitmq',
      label: 'RabbitMQ',
      fields: [
        { key: 'url', label: 'URL', type: 'string', placeholder: 'amqp://guest:guest@localhost:5672/' },
      ],
    },
    {
      value: 'kafka',
      label: 'Kafka',
      fields: [
        { key: 'brokers', label: 'Brokers', type: 'string', placeholder: 'kafka1:9092,kafka2:9092' },
      ],
    },
    {
      value: 'redis',
      label: 'Redis Pub/Sub',
      fields: [
        { key: 'address', label: 'Address', type: 'string', placeholder: 'localhost:6379' },
        { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
        { key: 'db', label: 'DB', type: 'number', placeholder: '0' },
        { key: 'channels', label: 'Channels', type: 'string', placeholder: 'channel1,channel2', helpText: 'Comma-separated channel names' },
        { key: 'patterns', label: 'Patterns', type: 'string', placeholder: 'events.*', helpText: 'Comma-separated glob patterns' },
      ],
    },
  ],
}
