import { Layers } from 'lucide-react'
import type { FlowBlockDefinition } from '../types'

export const batch: FlowBlockDefinition = {
  key: 'batch',
  dataKey: 'batch',
  hclBlock: 'batch',
  label: 'Batch',
  menuDescription: 'Chunked data processing (ETL, migrations)',
  infoText: 'Process large datasets in chunks. Reads from a source connector, optionally transforms each item, and writes to a target.',
  icon: Layers,
  color: 'text-orange-400',
  accentColor: 'orange',
  group: 'data',
  customEditor: true,
  isActive: (data) => !!data.batch,
  nodeIndicator: { title: 'Batch processing' },
}
