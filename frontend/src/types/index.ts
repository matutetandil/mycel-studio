import type { Node, Edge } from '@xyflow/react'

// =============================================================================
// Connector Types
// =============================================================================

export type ConnectorType =
  | 'rest'
  | 'database'
  | 'queue'
  | 'cache'
  | 'grpc'
  | 'graphql'
  | 'tcp'
  | 'file'
  | 's3'
  | 'exec'

export type DatabaseDriver = 'sqlite' | 'postgres' | 'mysql' | 'mongodb'
export type QueueDriver = 'rabbitmq' | 'kafka'
export type CacheDriver = 'memory' | 'redis'
export type ConnectorMode = 'server' | 'client'

// REST Connector
export interface RestServerConfig {
  mode: 'server'
  port: number
  host?: string
  cors?: {
    origins: string[]
    methods: string[]
    headers?: string[]
    credentials?: boolean
  }
  rateLimit?: {
    requests: number
    window: string
    by?: 'ip' | 'header' | 'query'
  }
  tls?: {
    cert: string
    key: string
  }
}

export interface RestClientConfig {
  mode: 'client'
  baseUrl: string
  timeout?: string
  auth?: {
    type: 'bearer' | 'basic' | 'api_key' | 'oauth2'
    token?: string
    username?: string
    password?: string
    header?: string
    value?: string
  }
  retry?: {
    attempts: number
    backoff: 'exponential' | 'linear' | 'constant'
    initial?: string
    max?: string
  }
  circuitBreaker?: {
    threshold: number
    timeout: string
    successThreshold?: number
  }
  headers?: Record<string, string>
}

// Database Connector
export interface DatabaseConfig {
  driver: DatabaseDriver
  // SQLite
  database?: string
  // PostgreSQL/MySQL
  host?: string
  port?: number
  username?: string
  password?: string
  schema?: string
  charset?: string
  // MongoDB
  uri?: string
  authSource?: string
  replicaSet?: string
  // Common
  pool?: {
    maxOpen?: number
    maxIdle?: number
    maxLifetime?: string
  }
  ssl?: {
    mode?: string
    caCert?: string
    cert?: string
    key?: string
  }
}

// Queue Connector (RabbitMQ/Kafka)
export interface RabbitMQConfig {
  driver: 'rabbitmq'
  host: string
  port: number
  username: string
  password: string
  vhost?: string
  exchange?: {
    name: string
    type: 'direct' | 'topic' | 'fanout' | 'headers'
    durable?: boolean
    autoDelete?: boolean
  }
  prefetch?: number
  heartbeat?: string
  reconnect?: {
    enabled: boolean
    interval: string
    maxAttempts?: number
  }
}

export interface KafkaConfig {
  driver: 'kafka'
  brokers: string[]
  auth?: {
    mechanism: 'SASL_PLAIN' | 'SASL_SCRAM_256' | 'SASL_SCRAM_512'
    username: string
    password: string
  }
  tls?: {
    enabled: boolean
    caCert?: string
  }
  schemaRegistry?: {
    url: string
    username?: string
    password?: string
  }
}

export type QueueConfig = RabbitMQConfig | KafkaConfig

// Cache Connector
export interface MemoryCacheConfig {
  driver: 'memory'
  maxSize?: string
  maxItems?: number
  ttl?: string
  eviction?: 'lru' | 'lfu'
}

export interface RedisCacheConfig {
  driver: 'redis'
  host: string
  port: number
  password?: string
  db?: number
  prefix?: string
  cluster?: {
    enabled: boolean
    nodes: string[]
  }
  sentinel?: {
    master: string
    nodes: string[]
  }
}

export type CacheConfig = MemoryCacheConfig | RedisCacheConfig

// gRPC Connector
export interface GrpcConfig {
  mode: ConnectorMode
  port?: number
  address?: string
  proto: {
    path: string
    files?: string[]
  }
  tls?: {
    cert?: string
    key?: string
    caCert?: string
    enabled?: boolean
  }
  reflection?: boolean
  healthCheck?: boolean
  timeout?: string
  loadBalancing?: 'round_robin' | 'pick_first'
}

// GraphQL Connector
export interface GraphqlConfig {
  mode: ConnectorMode
  port?: number
  path?: string
  endpoint?: string
  schema?: string
  schemaFile?: string
  playground?: boolean
  introspection?: boolean
  auth?: {
    type: string
    token?: string
  }
  headers?: Record<string, string>
  timeout?: string
}

// TCP Connector
export interface TcpConfig {
  mode: ConnectorMode
  port?: number
  host?: string
  protocol: 'json' | 'msgpack' | 'line' | 'length_prefixed'
  tls?: {
    enabled?: boolean
    cert?: string
    key?: string
    caCert?: string
  }
  maxConnections?: number
  pool?: {
    size: number
  }
}

// File Connector
export interface FileConfig {
  basePath: string
  fileMode?: string
  dirMode?: string
}

// S3 Connector
export interface S3Config {
  bucket: string
  region: string
  accessKey: string
  secretKey: string
  endpoint?: string
  forcePathStyle?: boolean
  prefix?: string
}

// Exec Connector
export interface ExecConfig {
  workingDir?: string
  timeout?: string
  shell?: string
  env?: Record<string, string>
  ssh?: {
    host: string
    port?: number
    user: string
    keyFile?: string
    password?: string
  }
}

// Union type for all connector configs
export type ConnectorConfig =
  | ({ type: 'rest' } & (RestServerConfig | RestClientConfig))
  | ({ type: 'database' } & DatabaseConfig)
  | ({ type: 'queue' } & QueueConfig)
  | ({ type: 'cache' } & CacheConfig)
  | ({ type: 'grpc' } & GrpcConfig)
  | ({ type: 'graphql' } & GraphqlConfig)
  | ({ type: 'tcp' } & TcpConfig)
  | ({ type: 'file' } & FileConfig)
  | ({ type: 's3' } & S3Config)
  | ({ type: 'exec' } & ExecConfig)

// =============================================================================
// Flow Types
// =============================================================================

export interface FlowFrom {
  connector: string
  operation: string
}

export interface FlowTo {
  connector: string
  target?: string
  query?: string
}

export interface FlowTransform {
  use?: string[]
  fields: Record<string, string>
}

export interface FlowEnrich {
  name: string
  connector: string
  operation: string
  params?: Record<string, string>
}

export interface FlowCache {
  storage: string
  key: string
  ttl: string
}

export interface FlowLock {
  storage: string
  key: string
  timeout: string
  wait?: boolean
  retry?: string
}

export interface FlowSemaphore {
  storage: string
  key: string
  maxPermits: number
  timeout: string
  lease?: string
}

export interface FlowCoordinate {
  storage: string
  timeout: string
  onTimeout?: 'fail' | 'retry' | 'skip' | 'pass'
  maxRetries?: number
  wait?: {
    when: string
    for: string
  }
  signal?: {
    when: string
    emit: string
    ttl?: string
  }
  preflight?: {
    connector: string
    query: string
    params?: Record<string, string>
    ifExists?: 'pass' | 'fail'
  }
}

export interface FlowRequire {
  roles?: string[]
}

export interface FlowErrorHandling {
  retry?: {
    attempts: number
    delay: string
    backoff?: 'exponential' | 'linear' | 'constant'
  }
}

export interface FlowValidate {
  input?: string
  output?: string
}

// =============================================================================
// Node Data Types
// =============================================================================

export interface ConnectorNodeData extends Record<string, unknown> {
  label: string
  connectorType: ConnectorType
  config: Record<string, unknown>
}

export interface FlowNodeData extends Record<string, unknown> {
  label: string
  from?: FlowFrom
  to?: FlowTo
  validate?: FlowValidate
  transform?: FlowTransform
  enrich?: FlowEnrich[]
  cache?: FlowCache
  lock?: FlowLock
  semaphore?: FlowSemaphore
  coordinate?: FlowCoordinate
  require?: FlowRequire
  errorHandling?: FlowErrorHandling
  when?: string
}

export interface TypeNodeData extends Record<string, unknown> {
  label: string
  fields: Record<string, TypeFieldDefinition>
}

export interface TypeFieldDefinition {
  type: 'string' | 'number' | 'bool' | 'object' | 'array'
  required?: boolean
  format?: string
  pattern?: string
  enum?: string[]
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  default?: unknown
  validate?: string
  items?: TypeFieldDefinition
  fields?: Record<string, TypeFieldDefinition>
}

export interface TransformNodeData extends Record<string, unknown> {
  label: string
  fields: Record<string, string>
}

export interface ValidatorNodeData extends Record<string, unknown> {
  label: string
  validatorType: 'regex' | 'cel' | 'wasm'
  pattern?: string
  expr?: string
  module?: string
  function?: string
  message: string
}

export interface AspectNodeData extends Record<string, unknown> {
  label: string
  on: string[]
  when: 'before' | 'after' | 'around' | 'on_error'
  condition?: string
  priority?: number
  action?: {
    connector: string
    target: string
    transform?: Record<string, string>
  }
  cache?: FlowCache
  invalidate?: {
    storage: string
    keys?: string[]
    patterns?: string[]
  }
}

// =============================================================================
// React Flow Node Types
// =============================================================================

export type NodeType = 'connector' | 'flow' | 'type' | 'transform' | 'validator' | 'aspect'

export type ConnectorNode = Node<ConnectorNodeData, 'connector'>
export type FlowNode = Node<FlowNodeData, 'flow'>
export type TypeNode = Node<TypeNodeData, 'type'>
export type TransformNode = Node<TransformNodeData, 'transform'>
export type ValidatorNode = Node<ValidatorNodeData, 'validator'>
export type AspectNode = Node<AspectNodeData, 'aspect'>

export type StudioNode = Node<
  | ConnectorNodeData
  | FlowNodeData
  | TypeNodeData
  | TransformNodeData
  | ValidatorNodeData
  | AspectNodeData
>

export type StudioEdge = Edge

// =============================================================================
// Project Types
// =============================================================================

export interface ServiceConfig {
  name: string
  version: string
}

export interface ProjectMetadata {
  nodePositions: Record<string, { x: number; y: number }>
  canvasZoom: number
  canvasPosition: { x: number; y: number }
  expandedPanels: string[]
  lastOpenedFile?: string
}

export interface MycelProject {
  path: string
  service?: ServiceConfig
  connectors: Record<string, ConnectorNodeData>
  flows: Record<string, FlowNodeData>
  types: Record<string, TypeNodeData>
  transforms: Record<string, TransformNodeData>
  validators: Record<string, ValidatorNodeData>
  aspects: Record<string, AspectNodeData>
  metadata: ProjectMetadata
}
