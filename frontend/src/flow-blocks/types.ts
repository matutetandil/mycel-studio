import type { LucideIcon } from 'lucide-react'
import type { FlowNodeData } from '../types'

export type FlowBlockFieldType =
  | 'storage_select'    // Dropdown of cache connector names
  | 'connector_select'  // Dropdown of all connector names
  | 'cel_expression'    // Text input with optional patterns dropdown
  | 'duration'          // Text input with duration presets
  | 'number'            // Number input with optional presets
  | 'select'            // Standard dropdown
  | 'boolean'           // Checkbox
  | 'string'            // Plain text input

export interface FlowBlockField {
  key: string
  label: string
  type: FlowBlockFieldType
  placeholder?: string
  helpText?: string
  required?: boolean
  defaultValue?: unknown
  // Duration/number presets shown as buttons
  presets?: Array<{ label: string; value: string | number }>
  // CEL expression patterns shown in a dropdown
  patterns?: Array<{ label: string; pattern: string }>
  // For 'select' type
  options?: Array<{ value: string; label: string }>
  // Show field only when another field has a specific value
  visibleWhen?: { field: string; value: unknown }
}

export type FlowBlockGroup = 'data' | 'concurrency' | 'output'

// Maps a flow block field key to an HCL attribute
export interface HclFieldMapping {
  key: string         // Field key in the data object
  hclKey: string      // HCL attribute name
  type: 'string' | 'number' | 'boolean'
  omitDefault?: unknown  // Don't emit if value equals this
}

export interface FlowBlockDefinition {
  // Identity
  key: string                            // e.g., 'cache', 'lock'
  dataKey: keyof FlowNodeData            // Key on FlowNodeData
  hclBlock: string                       // HCL block name

  // Display
  label: string
  menuDescription: string
  infoText: string
  icon: LucideIcon
  color: string                          // Tailwind text color class for icon
  accentColor: string                    // Tailwind color name for buttons/rings (e.g., 'cyan', 'yellow')
  group: FlowBlockGroup

  // Editor
  customEditor?: boolean                 // If true, uses its own editor component
  fields?: FlowBlockField[]             // For generic editor

  // HCL generation
  hclFields?: HclFieldMapping[]

  // Check if block is configured on a flow node
  isActive: (data: FlowNodeData) => boolean
}
