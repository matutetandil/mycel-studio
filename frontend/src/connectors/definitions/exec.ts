import { Terminal } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const exec: ConnectorDefinition = {
  type: 'exec',
  label: 'Exec/Script',
  icon: Terminal,
  color: 'bg-slate-600',
  category: 'Execution',
  defaultDirection: 'output',
  fields: [
    { key: 'command', label: 'Command', type: 'string', placeholder: '/usr/bin/python3' },
    { key: 'working_dir', label: 'Working Directory', type: 'string', placeholder: '/app/scripts' },
    { key: 'timeout', label: 'Timeout', type: 'string', placeholder: '30s' },
    { key: 'shell', label: 'Shell', type: 'string', placeholder: '/bin/sh' },
    {
      key: 'input_format', label: 'Input Format', type: 'select',
      options: [
        { value: 'args', label: 'Args' },
        { value: 'stdin', label: 'Stdin' },
        { value: 'json', label: 'JSON' },
      ],
    },
    {
      key: 'output_format', label: 'Output Format', type: 'select',
      options: [
        { value: 'text', label: 'Text' },
        { value: 'json', label: 'JSON' },
        { value: 'lines', label: 'Lines' },
      ],
    },
    { key: 'retry_count', label: 'Retry Count', type: 'number' },
    { key: 'retry_delay', label: 'Retry Delay', type: 'string', placeholder: '1s' },
  ],
}
