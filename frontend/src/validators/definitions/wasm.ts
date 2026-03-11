import { Box } from 'lucide-react'
import type { ValidatorTypeDefinition } from '../types'

export const wasm: ValidatorTypeDefinition = {
  type: 'wasm',
  label: 'WASM Module',
  description: 'Validate using a WebAssembly module',
  icon: Box,
  color: 'bg-emerald-500',
  fields: [
    {
      key: 'wasm',
      label: 'WASM Path',
      type: 'string',
      placeholder: './validators/validator.wasm',
      helpText: 'Path to the .wasm binary file',
      required: true,
    },
    {
      key: 'entrypoint',
      label: 'Entrypoint',
      type: 'string',
      placeholder: 'validate',
      helpText: 'Function name to call in the WASM module',
      required: true,
    },
  ],
}
