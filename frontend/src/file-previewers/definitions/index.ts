import type { FilePreviewerDefinition } from '../types'
import { markdownPreviewer } from './markdown'
import { csvPreviewer } from './csv'
import { jsonPreviewer } from './json'
import { htmlPreviewer } from './html'
import { yamlPreviewer } from './yaml'
import { svgPreviewer } from './svg'
import { envPreviewer } from './env'

export const allDefinitions: FilePreviewerDefinition[] = [
  markdownPreviewer,
  csvPreviewer,
  jsonPreviewer,
  htmlPreviewer,
  yamlPreviewer,
  svgPreviewer,
  envPreviewer,
]
