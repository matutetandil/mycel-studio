import { RefreshCw } from 'lucide-react'
import type { FlowBlockDefinition } from '../types'

export const transform: FlowBlockDefinition = {
  key: 'transform',
  dataKey: 'transform',
  hclBlock: 'transform',
  label: 'Transform',
  menuDescription: 'Map and transform data with CEL expressions',
  infoText: 'Transform the flow data using CEL expressions. Map input fields to output fields, compute values, and reshape data.',
  icon: RefreshCw,
  color: 'text-amber-400',
  accentColor: 'amber',
  group: 'data',
  customEditor: true,
  isActive: (data) => !!(data.transform?.fields && Object.keys(data.transform.fields).length > 0),
  // Transform has a custom badge in FlowNode, not just an icon
  showInNode: false,
}
