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
      key: 'template_dir',
      label: 'Template Directory',
      type: 'string',
      placeholder: './templates',
      helpText: 'Directory containing HTML templates for PDF generation',
    },
    {
      key: 'default_template',
      label: 'Default Template',
      type: 'string',
      placeholder: 'invoice.html',
      helpText: 'Default HTML template file (Go text/template syntax)',
    },
    {
      key: 'output_dir',
      label: 'Output Directory',
      type: 'string',
      placeholder: './output',
      helpText: 'Directory for saved PDF files (used with "save" operation)',
    },
  ],
}
