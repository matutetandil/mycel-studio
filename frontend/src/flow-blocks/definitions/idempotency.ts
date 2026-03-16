import { Fingerprint } from 'lucide-react'
import type { FlowBlockDefinition } from '../types'

export const idempotency: FlowBlockDefinition = {
  key: 'idempotency',
  dataKey: 'idempotency',
  hclBlock: 'idempotency',
  label: 'Idempotency',
  menuDescription: 'Prevent duplicate execution with unique keys',
  infoText: 'Idempotency ensures a flow is only executed once for a given key. Duplicate requests return the cached result.',
  icon: Fingerprint,
  color: 'text-violet-400',
  accentColor: 'violet',
  group: 'data',
  isActive: (data) => !!data.idempotency,
  nodeIndicator: { title: 'Idempotent' },

  fields: [
    {
      key: 'storage', label: 'Storage (Cache Connector)', type: 'storage_select', required: true,
    },
    {
      key: 'key', label: 'Idempotency Key (CEL Expression)', type: 'cel_expression', required: true,
      placeholder: 'input.idempotency_key',
      patterns: [
        { label: 'Header key', pattern: 'input.headers.idempotency_key' },
        { label: 'Request ID', pattern: 'input.request_id' },
        { label: 'Custom', pattern: 'input.type + ":" + input.id' },
      ],
    },
    {
      key: 'ttl', label: 'TTL', type: 'duration',
      placeholder: '24h', defaultValue: '24h',
      presets: [
        { label: '1h', value: '1h' },
        { label: '6h', value: '6h' },
        { label: '24h', value: '24h' },
        { label: '7d', value: '168h' },
      ],
    },
  ],

  hclFields: [
    { key: 'storage', hclKey: 'storage', type: 'string' },
    { key: 'key', hclKey: 'key', type: 'string' },
    { key: 'ttl', hclKey: 'ttl', type: 'string' },
  ],
}
