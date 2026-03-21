import type { ComponentType } from 'react'

export interface FilePreviewerProps {
  content: string
  fileName: string
}

export interface FilePreviewerDefinition {
  extensions: string[]
  label: string
  component: ComponentType<FilePreviewerProps>
}
