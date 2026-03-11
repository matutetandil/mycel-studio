import { Copy } from 'lucide-react'
import type { FlowBlockDefinition } from '../types'

export const dedupe: FlowBlockDefinition = {
  key: 'dedupe',
  dataKey: 'dedupe',
  hclBlock: 'dedupe',
  label: 'Deduplication',
  menuDescription: 'Skip duplicate events by unique key',
  infoText: 'Prevent processing duplicate events. Uses a cache connector to track seen keys.',
  icon: Copy,
  color: 'text-teal-400',
  accentColor: 'teal',
  group: 'data',
  isActive: (data) => !!data.dedupe,
  nodeIndicator: { title: 'Deduplication' },

  fields: [
    {
      key: 'storage', label: 'Storage (Cache Connector)', type: 'storage_select', required: true,
    },
    {
      key: 'key', label: 'Dedup Key (CEL Expression)', type: 'cel_expression', required: true,
      placeholder: 'input.payment_id',
      patterns: [
        { label: 'By ID', pattern: 'input.id' },
        { label: 'By payment', pattern: 'input.payment_id' },
        { label: 'By event', pattern: 'input.event_id' },
        { label: 'Composite', pattern: 'input.type + ":" + input.id' },
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
    {
      key: 'onDuplicate', label: 'On Duplicate', type: 'select', defaultValue: 'skip',
      options: [
        { value: 'skip', label: 'Skip (silently)' },
        { value: 'error', label: 'Error (fail flow)' },
      ],
    },
  ],

  hclFields: [
    { key: 'storage', hclKey: 'storage', type: 'string' },
    { key: 'key', hclKey: 'key', type: 'string' },
    { key: 'ttl', hclKey: 'ttl', type: 'string' },
    { key: 'onDuplicate', hclKey: 'on_duplicate', type: 'string', omitDefault: 'skip' },
  ],
}
