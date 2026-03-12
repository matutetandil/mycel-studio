import { Cloud } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const s3: ConnectorDefinition = {
  type: 's3',
  label: 'S3 Storage',
  icon: Cloud,
  color: 'bg-amber-600',
  category: 'Storage',
  defaultDirection: 'output',
  fields: [
    { key: 'bucket', label: 'Bucket', type: 'string', placeholder: 'my-bucket', required: true },
    { key: 'region', label: 'Region', type: 'string', placeholder: 'us-east-1' },
    { key: 'access_key', label: 'Access Key', type: 'string', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
    { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: '••••••••' },
    { key: 'endpoint', label: 'Endpoint (optional)', type: 'string', placeholder: 'http://localhost:9000 (for MinIO)' },
    { key: 'force_path_style', label: 'Force Path Style', type: 'boolean', helpText: 'Enable for MinIO compatibility' },
  ],
}
