import type { LucideIcon } from 'lucide-react'
import type { ConnectorDirection } from '../types'

// Field types that the generic property renderer supports
export type FieldType = 'string' | 'number' | 'boolean' | 'password' | 'select' | 'text'

export interface FieldDefinition {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  required?: boolean
  // For 'select' type
  options?: Array<{ value: string; label: string }>
  // Show field only when another field has a specific value
  visibleWhen?: { field: string; value: string | string[] }
  // Group name for HCL sub-blocks (e.g., "cors", "tls")
  group?: string
  // Default value
  defaultValue?: unknown
  // Help text shown below the field
  helpText?: string
}

export interface DriverDefinition {
  value: string
  label: string
  fields: FieldDefinition[]
}

export type ConnectorCategory =
  | 'API & Web'
  | 'Database'
  | 'Messaging'
  | 'Storage'
  | 'Execution'
  | 'Real-time'
  | 'Integration'
  | 'Notifications'

export interface ConnectorDefinition {
  type: string
  label: string
  icon: LucideIcon
  color: string
  category: ConnectorCategory
  defaultDirection: ConnectorDirection
  // Fields that appear regardless of driver (e.g., port)
  fields: FieldDefinition[]
  // Driver-specific field sets
  drivers?: DriverDefinition[]
  // Mode mapping for HCL generation (direction → mode string)
  modeMapping?: {
    input?: string
    output?: string
  }
  // Whether this connector type has an operations editor (REST, GraphQL, etc.)
  hasOperationsEditor?: boolean
}
