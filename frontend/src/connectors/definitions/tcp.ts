import { Network } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const tcp: ConnectorDefinition = {
  type: 'tcp',
  label: 'TCP',
  icon: Network,
  color: 'bg-cyan-600',
  category: 'API & Web',
  defaultDirection: 'input',
  fields: [
    { key: 'port', label: 'Port', type: 'number', placeholder: '9000' },
    {
      key: 'protocol', label: 'Protocol', type: 'select',
      options: [
        { value: 'json', label: 'JSON' },
        { value: 'msgpack', label: 'MessagePack' },
        { value: 'line', label: 'Line-delimited' },
        { value: 'length_prefixed', label: 'Length-prefixed' },
      ],
    },
  ],
}
