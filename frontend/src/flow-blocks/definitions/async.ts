import { Timer } from 'lucide-react'
import type { FlowBlockDefinition } from '../types'

export const async: FlowBlockDefinition = {
  key: 'async',
  dataKey: 'async',
  hclBlock: 'async',
  label: 'Async Execution',
  menuDescription: 'Execute asynchronously with job polling',
  infoText: 'Async flows return HTTP 202 immediately with a job_id. Mycel auto-registers a GET /jobs/{job_id} polling endpoint to check status.',
  icon: Timer,
  color: 'text-sky-400',
  accentColor: 'sky',
  group: 'data',
  isActive: (data) => !!data.async,
  nodeIndicator: { title: 'Async' },

  fields: [
    {
      key: 'storage', label: 'Storage (Cache Connector)', type: 'storage_select', required: true,
      helpText: 'Redis or cache connector to store job status',
    },
    {
      key: 'ttl', label: 'Result TTL', type: 'duration',
      placeholder: '1h', defaultValue: '1h',
      helpText: 'How long to keep the job result after completion',
      presets: [
        { label: '15m', value: '15m' },
        { label: '1h', value: '1h' },
        { label: '24h', value: '24h' },
        { label: '7d', value: '168h' },
      ],
    },
  ],

  hclFields: [
    { key: 'storage', hclKey: 'storage', type: 'string' },
    { key: 'ttl', hclKey: 'ttl', type: 'string' },
  ],
}
