import { Gauge } from 'lucide-react'
import type { FlowBlockDefinition } from '../types'

export const semaphore: FlowBlockDefinition = {
  key: 'semaphore',
  dataKey: 'semaphore',
  hclBlock: 'semaphore',
  label: 'Semaphore Configuration',
  menuDescription: 'Limit concurrent executions',
  infoText: 'A semaphore limits the number of concurrent executions of this flow for a given key. Useful for rate limiting external API calls or protecting resources with limited capacity.',
  icon: Gauge,
  color: 'text-orange-400',
  accentColor: 'orange',
  group: 'concurrency',
  isActive: (data) => !!data.semaphore,
  showInNode: false,  // Lock indicator covers both lock and semaphore

  fields: [
    {
      key: 'storage', label: 'Semaphore Storage (Redis/Cache)', type: 'storage_select', required: true,
    },
    {
      key: 'key', label: 'Semaphore Key', type: 'string', required: true,
      placeholder: 'external_api, payment_gateway, etc.',
      helpText: 'A static key that identifies the shared resource. All flows with the same key share the permit pool.',
    },
    {
      key: 'maxPermits', label: 'Max Concurrent Executions', type: 'number', required: true,
      defaultValue: 5,
      presets: [
        { label: '1', value: 1 },
        { label: '2', value: 2 },
        { label: '3', value: 3 },
        { label: '5', value: 5 },
        { label: '10', value: 10 },
        { label: '20', value: 20 },
        { label: '50', value: 50 },
        { label: '100', value: 100 },
      ],
    },
    {
      key: 'timeout', label: 'Acquire Timeout', type: 'duration', required: true,
      placeholder: '30s', defaultValue: '30s',
      helpText: 'Maximum time to wait for a permit. Flow fails if a permit cannot be acquired.',
      presets: [
        { label: '5s', value: '5s' },
        { label: '10s', value: '10s' },
        { label: '30s', value: '30s' },
        { label: '1m', value: '1m' },
        { label: '5m', value: '5m' },
      ],
    },
    {
      key: 'lease', label: 'Permit Lease Time (optional)', type: 'duration',
      placeholder: '1m',
      helpText: 'Auto-release permit after this duration (safety mechanism if flow crashes).',
      presets: [
        { label: '5s', value: '5s' },
        { label: '10s', value: '10s' },
        { label: '30s', value: '30s' },
        { label: '1m', value: '1m' },
        { label: '5m', value: '5m' },
      ],
    },
  ],

  hclFields: [
    { key: 'storage', hclKey: 'storage', type: 'string' },
    { key: 'key', hclKey: 'key', type: 'string' },
    { key: 'maxPermits', hclKey: 'max_permits', type: 'number' },
    { key: 'timeout', hclKey: 'timeout', type: 'string' },
    { key: 'lease', hclKey: 'lease', type: 'string' },
  ],
}
