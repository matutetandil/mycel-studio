import { Folder } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const file: ConnectorDefinition = {
  type: 'file',
  label: 'File Storage',
  icon: Folder,
  color: 'bg-neutral-500',
  category: 'Storage',
  defaultDirection: 'output',
  fields: [
    { key: 'base_path', label: 'Base Path', type: 'string', placeholder: '/data/files', required: true },
    {
      key: 'format', label: 'Format', type: 'select',
      options: [
        { value: '', label: 'Auto' },
        { value: 'json', label: 'JSON' },
        { value: 'csv', label: 'CSV' },
        { value: 'excel', label: 'Excel' },
        { value: 'text', label: 'Text' },
        { value: 'lines', label: 'Lines' },
        { value: 'binary', label: 'Binary' },
      ],
    },
    { key: 'create_dirs', label: 'Create Directories', type: 'boolean' },
    { key: 'permissions', label: 'Permissions', type: 'string', placeholder: '0644' },
    { key: 'watch', label: 'Watch for changes', type: 'boolean' },
    { key: 'watch_interval', label: 'Watch Interval', type: 'string', placeholder: '5s', visibleWhen: { field: 'watch', value: 'true' } },
    // CSV options — visible when format is csv
    {
      key: 'csv_delimiter', label: 'CSV Delimiter', type: 'select',
      options: [
        { value: ',', label: 'Comma (,)' },
        { value: '\\t', label: 'Tab (TSV)' },
        { value: ';', label: 'Semicolon (;)' },
        { value: '|', label: 'Pipe (|)' },
      ],
      visibleWhen: { field: 'format', value: 'csv' },
      helpText: 'Field separator character',
    },
    {
      key: 'csv_comment', label: 'Comment Character', type: 'string',
      placeholder: '#',
      visibleWhen: { field: 'format', value: 'csv' },
      helpText: 'Character marking comment lines to skip',
    },
    {
      key: 'csv_skip_rows', label: 'Skip Rows', type: 'number',
      placeholder: '0',
      visibleWhen: { field: 'format', value: 'csv' },
      helpText: 'Number of rows to skip before reading data',
    },
    {
      key: 'csv_no_header', label: 'No Header Row', type: 'boolean',
      visibleWhen: { field: 'format', value: 'csv' },
      helpText: 'Columns will be named column_1, column_2, etc.',
    },
    {
      key: 'csv_trim_space', label: 'Trim Whitespace', type: 'boolean',
      visibleWhen: { field: 'format', value: 'csv' },
      helpText: 'Remove leading/trailing whitespace from field values',
    },
  ],
}
