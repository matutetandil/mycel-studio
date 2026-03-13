import type { ComponentType } from 'react'
import AspectEdge from './AspectEdge'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const edgeTypes: Record<string, ComponentType<any>> = {
  aspect: AspectEdge,
}

export { AspectEdge }
