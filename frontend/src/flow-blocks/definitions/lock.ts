import { Lock } from 'lucide-react'
import type { FlowBlockDefinition } from '../types'

export const lock: FlowBlockDefinition = {
  key: 'lock',
  dataKey: 'lock',
  hclBlock: 'lock',
  label: 'Lock (Mutex) Configuration',
  menuDescription: 'Ensure only one execution at a time',
  infoText: 'A mutex lock ensures only one execution of this flow can run at a time for a given key. Useful for preventing race conditions on shared resources.',
  icon: Lock,
  color: 'text-yellow-400',
  accentColor: 'yellow',
  group: 'concurrency',
  isActive: (data) => !!data.lock,
  nodeIndicator: {
    title: 'Has lock/semaphore',
    isVisible: (data) => !!data.lock || !!data.semaphore,
  },

  fields: [
    {
      key: 'storage', label: 'Lock Storage (Redis/Cache)', type: 'storage_select', required: true,
    },
    {
      key: 'key', label: 'Lock Key (CEL Expression)', type: 'cel_expression', required: true,
      placeholder: '"lock:" + input.id',
      helpText: 'The key uniquely identifies the lock. Only one flow with the same key can execute at a time.',
      patterns: [
        { label: 'By ID', pattern: '"lock:" + input.id' },
        { label: 'By user', pattern: '"lock:user:" + input.user_id' },
        { label: 'By order', pattern: '"lock:order:" + input.order_id' },
        { label: 'By resource', pattern: '"lock:" + input.resource_type + ":" + input.resource_id' },
      ],
    },
    {
      key: 'timeout', label: 'Lock Timeout', type: 'duration', required: true,
      placeholder: '30s', defaultValue: '30s',
      presets: [
        { label: '5s', value: '5s' },
        { label: '10s', value: '10s' },
        { label: '30s', value: '30s' },
        { label: '1m', value: '1m' },
        { label: '5m', value: '5m' },
      ],
    },
    {
      key: 'wait', label: 'Wait for lock', type: 'boolean', defaultValue: true,
      helpText: 'If enabled, the flow will wait until the lock is available. If disabled, it will fail immediately if locked.',
    },
    {
      key: 'retry', label: 'Retry Interval (optional)', type: 'duration',
      placeholder: '100ms',
      helpText: 'How often to check if the lock is available while waiting.',
      visibleWhen: { field: 'wait', value: true },
    },
  ],

  hclFields: [
    { key: 'storage', hclKey: 'storage', type: 'string' },
    { key: 'key', hclKey: 'key', type: 'string' },
    { key: 'timeout', hclKey: 'timeout', type: 'string' },
    { key: 'wait', hclKey: 'wait', type: 'boolean' },
    { key: 'retry', hclKey: 'retry', type: 'string' },
  ],
}
