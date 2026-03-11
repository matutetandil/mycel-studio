import type { LucideIcon } from 'lucide-react'

export interface ValidatorFieldDefinition {
  key: string
  label: string
  type: 'string' | 'text'
  placeholder?: string
  helpText?: string
  required?: boolean
  mono?: boolean
}

export interface ValidatorTypeDefinition {
  type: string
  label: string
  description: string
  icon: LucideIcon
  color: string
  fields: ValidatorFieldDefinition[]
}
