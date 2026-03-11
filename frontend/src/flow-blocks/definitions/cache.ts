import { Database } from 'lucide-react'
import type { FlowBlockDefinition } from '../types'

export const cache: FlowBlockDefinition = {
  key: 'cache',
  dataKey: 'cache',
  hclBlock: 'cache',
  label: 'Cache Configuration',
  menuDescription: 'Cache responses to improve performance',
  infoText: 'Cache the flow result to improve performance. The cache key is a CEL expression that uniquely identifies the cached data.',
  icon: Database,
  color: 'text-cyan-400',
  accentColor: 'cyan',
  group: 'data',
  isActive: (data) => !!data.cache,
  nodeIndicator: { title: 'Cached' },

  fields: [
    {
      key: 'storage', label: 'Cache Storage', type: 'storage_select', required: true,
    },
    {
      key: 'key', label: 'Cache Key (CEL Expression)', type: 'cel_expression', required: true,
      placeholder: '"prefix:" + input.id',
      helpText: 'The key should uniquely identify the data being cached (e.g., by request ID, user, etc.)',
      patterns: [
        { label: 'By ID', pattern: '"entity:" + input.id' },
        { label: 'By user', pattern: '"user:" + input.user_id' },
        { label: 'By operation', pattern: '"op:" + input.operation + ":" + input.id' },
        { label: 'By path', pattern: '"path:" + input.path' },
        { label: 'Composite', pattern: '"key:" + input.type + ":" + input.id' },
      ],
    },
    {
      key: 'ttl', label: 'Time to Live (TTL)', type: 'duration', required: true,
      placeholder: '5m', defaultValue: '5m',
      presets: [
        { label: '1 minute', value: '1m' },
        { label: '5 minutes', value: '5m' },
        { label: '15 minutes', value: '15m' },
        { label: '30 minutes', value: '30m' },
        { label: '1 hour', value: '1h' },
        { label: '6 hours', value: '6h' },
        { label: '12 hours', value: '12h' },
        { label: '1 day', value: '24h' },
        { label: '7 days', value: '168h' },
      ],
    },
  ],

  hclFields: [
    { key: 'storage', hclKey: 'storage', type: 'string' },
    { key: 'key', hclKey: 'key', type: 'string' },
    { key: 'ttl', hclKey: 'ttl', type: 'string' },
  ],
}
