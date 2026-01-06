// Bi-directional sync between Canvas (React Flow) and HCL files
import { useCallback, useRef, useState } from 'react'
import { useStudioStore } from '../stores/useStudioStore'
import { useProjectStore } from '../stores/useProjectStore'
import type { Node } from '@xyflow/react'
import type {
  ConnectorNodeData,
  FlowNodeData,
  StudioNode,
} from '../types'

const API_BASE = '/api'

// Types for API responses
interface ParsedProject {
  service?: { name: string; version: string }
  connectors: Array<{
    name: string
    type: string
    driver?: string
    properties?: Record<string, unknown>
  }>
  flows: Array<{
    name: string
    sourceFile?: string
    when?: string
    from?: { connector: string; operation?: string }
    to?: { connector: string; target?: string; query?: string; filter?: string }
    transform?: { use?: string[]; mappings?: Record<string, string> }
    validate?: { input?: string; output?: string }
    enrichments?: Array<{
      name: string
      connector: string
      operation: string
      params?: Record<string, string>
    }>
    cache?: { storage: string; key: string; ttl: string }
    lock?: { storage: string; key: string; timeout: string; wait?: boolean; retry?: string }
    semaphore?: { storage: string; key: string; maxPermits: number; timeout: string; lease?: string }
    coordinate?: {
      storage: string
      timeout: string
      onTimeout?: string
      maxRetries?: number
      wait?: { when: string; for: string }
      signal?: { when: string; emit: string; ttl?: string }
    }
    require?: { roles?: string[] }
    errorHandling?: { retry?: { attempts: number; delay: string; backoff?: string } }
  }>
  types: Array<{
    name: string
    fields: Record<string, { type: string; required?: boolean }>
  }>
  transforms: Array<{ name: string; mappings: Record<string, string> }>
  validators: Array<{
    name: string
    type: string
    pattern?: string
    expr?: string
    module?: string
    function?: string
    message: string
  }>
  aspects: Array<{
    name: string
    on: string[]
    when: string
    condition?: string
    priority?: number
    action?: { connector: string; target: string; transform?: Record<string, string> }
    cache?: { storage: string; key: string; ttl: string }
    invalidate?: { storage: string; keys?: string[]; patterns?: string[] }
  }>
  namedCaches: Array<{ name: string; storage: string; key: string; ttl: string }>
}

interface GenerateRequest {
  project: {
    service?: { name: string; version: string }
    connectors: Array<{
      name: string
      type: string
      driver?: string
      properties?: Record<string, unknown>
    }>
    flows: Array<{
      name: string
      when?: string
      from?: { connector: string; operation?: string }
      to?: { connector: string; target?: string; query?: string; filter?: string }
      transform?: { use?: string[]; mappings?: Record<string, string> }
      validate?: { input?: string; output?: string }
      enrichments?: Array<{
        name: string
        connector: string
        operation: string
        params?: Record<string, string>
      }>
      cache?: { storage: string; key: string; ttl: string }
      require?: { roles?: string[] }
      errorHandling?: { retry?: { attempts: number; delay: string; backoff?: string } }
    }>
    types: Array<{
      name: string
      fields: Record<string, { type: string; required?: boolean }>
    }>
    transforms: Array<{ name: string; mappings: Record<string, string> }>
    validators: Array<{
      name: string
      type: string
      pattern?: string
      expr?: string
      module?: string
      function?: string
      message: string
    }>
    aspects: Array<{
      name: string
      on: string[]
      when: string
      condition?: string
      priority?: number
    }>
    namedCaches: Array<{ name: string; storage: string; key: string; ttl: string }>
  }
  singleFile?: boolean
}

export function useSync() {
  const { setNodes, setEdges, nodes } = useStudioStore()
  const { files, updateFile } = useProjectStore()
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Parse HCL content and update canvas
  const parseAndUpdateCanvas = useCallback(async (content: string) => {
    if (isSyncing) return

    try {
      setIsSyncing(true)

      const response = await fetch(`${API_BASE}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Parse error:', error)
        return
      }

      const result = await response.json()
      if (!result.success || !result.project) return

      const { newNodes, newEdges } = convertProjectToNodes(result.project)
      setNodes(newNodes)
      setEdges(newEdges)
    } catch (error) {
      console.error('Failed to parse HCL:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [setNodes, setEdges, isSyncing])

  // Convert canvas nodes to HCL and update file
  const generateAndUpdateFile = useCallback(async (targetFile?: string) => {
    if (isSyncing) return

    try {
      setIsSyncing(true)

      const project = convertNodesToProject(nodes)
      const request: GenerateRequest = {
        project,
        singleFile: true,
      }

      const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Generate error:', error)
        return
      }

      const result = await response.json()
      if (!result.success || !result.files || result.files.length === 0) return

      // Update the target file or the first HCL file
      const fileToUpdate = targetFile || files.find(f => f.name.endsWith('.hcl'))?.relativePath
      if (fileToUpdate) {
        updateFile(fileToUpdate, result.files[0].content)
      }
    } catch (error) {
      console.error('Failed to generate HCL:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [nodes, files, updateFile, isSyncing])

  // Debounced sync from HCL to canvas
  const syncFromHCL = useCallback((content: string, delay = 500) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      parseAndUpdateCanvas(content)
    }, delay)
  }, [parseAndUpdateCanvas])

  // Debounced sync from canvas to HCL
  const syncToHCL = useCallback((targetFile?: string, delay = 500) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      generateAndUpdateFile(targetFile)
    }, delay)
  }, [generateAndUpdateFile])

  return {
    parseAndUpdateCanvas,
    generateAndUpdateFile,
    syncFromHCL,
    syncToHCL,
    isSyncing,
  }
}

// Convert parsed project to React Flow nodes
function convertProjectToNodes(project: ParsedProject): {
  newNodes: StudioNode[]
  newEdges: Array<{ id: string; source: string; target: string }>
} {
  const newNodes: StudioNode[] = []
  const newEdges: Array<{ id: string; source: string; target: string }> = []
  const connectorPositions: Record<string, { x: number; y: number }> = {}

  // Layout constants
  const CONNECTOR_START_X = 100
  const CONNECTOR_START_Y = 100
  const CONNECTOR_SPACING_Y = 150
  const FLOW_START_X = 500
  const FLOW_START_Y = 100
  const FLOW_SPACING_Y = 200

  // Create connector nodes
  project.connectors.forEach((conn, index) => {
    const position = { x: CONNECTOR_START_X, y: CONNECTOR_START_Y + index * CONNECTOR_SPACING_Y }
    connectorPositions[conn.name] = position

    const nodeData: ConnectorNodeData = {
      label: conn.name,
      connectorType: conn.type as ConnectorNodeData['connectorType'],
      config: {
        driver: conn.driver,
        ...conn.properties,
      },
    }

    newNodes.push({
      id: `connector-${conn.name}`,
      type: 'connector',
      position,
      data: nodeData,
    })
  })

  // Create flow nodes and edges
  project.flows.forEach((flow, index) => {
    const position = { x: FLOW_START_X, y: FLOW_START_Y + index * FLOW_SPACING_Y }

    const nodeData: FlowNodeData = {
      label: flow.name,
      when: flow.when,
      from: flow.from ? {
        connector: flow.from.connector,
        operation: flow.from.operation || '',
      } : undefined,
      to: flow.to ? {
        connector: flow.to.connector,
        target: flow.to.target,
        query: flow.to.query,
      } : undefined,
      transform: flow.transform ? {
        use: flow.transform.use,
        fields: flow.transform.mappings || {},
      } : undefined,
      validate: flow.validate,
      enrich: flow.enrichments?.map(e => ({
        name: e.name,
        connector: e.connector,
        operation: e.operation,
        params: e.params,
      })),
      cache: flow.cache,
      lock: flow.lock,
      semaphore: flow.semaphore,
      coordinate: flow.coordinate ? {
        storage: flow.coordinate.storage,
        timeout: flow.coordinate.timeout,
        onTimeout: flow.coordinate.onTimeout as 'fail' | 'retry' | 'skip' | 'pass' | undefined,
        maxRetries: flow.coordinate.maxRetries,
        wait: flow.coordinate.wait,
        signal: flow.coordinate.signal,
      } : undefined,
      require: flow.require,
      errorHandling: flow.errorHandling ? {
        retry: flow.errorHandling.retry ? {
          attempts: flow.errorHandling.retry.attempts,
          delay: flow.errorHandling.retry.delay,
          backoff: flow.errorHandling.retry.backoff as 'exponential' | 'linear' | 'constant' | undefined,
        } : undefined,
      } : undefined,
    }

    const flowNodeId = `flow-${flow.name}`
    newNodes.push({
      id: flowNodeId,
      type: 'flow',
      position,
      data: nodeData,
    })

    // Create edges from connector to flow
    if (flow.from?.connector) {
      const sourceId = `connector-${flow.from.connector}`
      newEdges.push({
        id: `edge-${sourceId}-${flowNodeId}`,
        source: sourceId,
        target: flowNodeId,
      })
    }

    // Create edges from flow to connector
    if (flow.to?.connector) {
      const targetId = `connector-${flow.to.connector}`
      newEdges.push({
        id: `edge-${flowNodeId}-${targetId}`,
        source: flowNodeId,
        target: targetId,
      })
    }
  })

  return { newNodes, newEdges }
}

// Convert React Flow nodes to project format for API
function convertNodesToProject(nodes: Node[]): GenerateRequest['project'] {
  const connectors: GenerateRequest['project']['connectors'] = []
  const flows: GenerateRequest['project']['flows'] = []
  const types: GenerateRequest['project']['types'] = []
  const transforms: GenerateRequest['project']['transforms'] = []
  const validators: GenerateRequest['project']['validators'] = []
  const aspects: GenerateRequest['project']['aspects'] = []
  const namedCaches: GenerateRequest['project']['namedCaches'] = []

  for (const node of nodes) {
    if (node.type === 'connector') {
      const data = node.data as ConnectorNodeData
      const { driver, ...properties } = data.config as Record<string, unknown>
      connectors.push({
        name: data.label,
        type: data.connectorType,
        driver: driver as string | undefined,
        properties,
      })
    } else if (node.type === 'flow') {
      const data = node.data as FlowNodeData
      flows.push({
        name: data.label,
        when: data.when,
        from: data.from ? {
          connector: data.from.connector,
          operation: data.from.operation,
        } : undefined,
        to: data.to ? {
          connector: data.to.connector,
          target: data.to.target,
          query: data.to.query,
        } : undefined,
        transform: data.transform ? {
          use: data.transform.use,
          mappings: data.transform.fields,
        } : undefined,
        validate: data.validate,
        enrichments: data.enrich?.map(e => ({
          name: e.name,
          connector: e.connector,
          operation: e.operation,
          params: e.params,
        })),
        cache: data.cache,
        require: data.require,
        errorHandling: data.errorHandling ? {
          retry: data.errorHandling.retry ? {
            attempts: data.errorHandling.retry.attempts,
            delay: data.errorHandling.retry.delay,
            backoff: data.errorHandling.retry.backoff,
          } : undefined,
        } : undefined,
      })
    }
    // TODO: Handle type, transform, validator, aspect nodes
  }

  return {
    connectors,
    flows,
    types,
    transforms,
    validators,
    aspects,
    namedCaches,
  }
}

export default useSync
