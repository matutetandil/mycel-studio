import { FileText } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const pdf: ConnectorDefinition = {
  type: 'pdf',
  label: 'PDF',
  icon: FileText,
  color: 'bg-red-600',
  category: 'Storage',
  defaultDirection: 'output',
  fields: [
    {
      key: 'template', label: 'HTML Template', type: 'file',
      placeholder: './templates/invoice.html',
      helpText: 'Default HTML template file path (Go text/template syntax). Can be overridden per-request via payload.',
      fileExtensions: ['.html', '.htm'],
    },
    {
      key: 'page_size', label: 'Page Size', type: 'select',
      options: [
        { value: 'A4', label: 'A4' },
        { value: 'Letter', label: 'Letter' },
        { value: 'Legal', label: 'Legal' },
      ],
      helpText: 'Page size for generated PDFs',
    },
    {
      key: 'font', label: 'Font', type: 'string',
      placeholder: 'Helvetica',
      helpText: 'Default font family',
    },
    {
      key: 'margin_left', label: 'Margin Left (mm)', type: 'number',
      placeholder: '15',
    },
    {
      key: 'margin_top', label: 'Margin Top (mm)', type: 'number',
      placeholder: '15',
    },
    {
      key: 'margin_right', label: 'Margin Right (mm)', type: 'number',
      placeholder: '15',
    },
    {
      key: 'output_dir', label: 'Output Directory', type: 'string',
      placeholder: '.',
      helpText: 'Default output directory for the "save" operation',
    },
  ],
}
