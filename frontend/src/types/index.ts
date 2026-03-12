import type { Node, Edge } from '@xyflow/react'

// =============================================================================
// Connector Types
// =============================================================================

export type ConnectorType =
  | 'rest'
  | 'http'
  | 'database'
  | 'queue'
  | 'cache'
  | 'grpc'
  | 'graphql'
  | 'tcp'
  | 'file'
  | 's3'
  | 'exec'
  | 'websocket'
  | 'sse'
  | 'cdc'
  | 'elasticsearch'
  | 'oauth'
  | 'mqtt'
  | 'ftp'
  | 'soap'
  | 'email'
  | 'slack'
  | 'discord'
  | 'sms'
  | 'push'
  | 'webhook'

export type DatabaseDriver = 'sqlite' | 'postgres' | 'mysql' | 'mongodb'
export type QueueDriver = 'rabbitmq' | 'kafka'
export type CacheDriver = 'memory' | 'redis'
export type ConnectorMode = 'server' | 'client'

// Direction determines which handles are shown on the connector node
// - input: Only right handle (source of data, triggers flows)
// - output: Only left handle (destination, receives data from flows)
// - bidirectional: Both handles (can be source or destination)
export type ConnectorDirection = 'input' | 'output' | 'bidirectional'

// Default directions for each connector type
// NOTE: This is the canonical source. The connector registry also exposes
// getDefaultDirection() but this record is kept for backward compatibility.
export const DEFAULT_CONNECTOR_DIRECTIONS: Record<ConnectorType, ConnectorDirection> = {
  rest: 'input',
  http: 'output',
  graphql: 'input',
  grpc: 'input',
  tcp: 'input',
  queue: 'input',
  database: 'output',
  cache: 'bidirectional',
  file: 'output',
  s3: 'output',
  exec: 'output',
  websocket: 'bidirectional',
  sse: 'output',
  cdc: 'input',
  elasticsearch: 'bidirectional',
  oauth: 'input',
  mqtt: 'bidirectional',
  ftp: 'bidirectional',
  soap: 'bidirectional',
  email: 'output',
  slack: 'output',
  discord: 'output',
  sms: 'output',
  push: 'output',
  webhook: 'output',
}

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

export interface FlowFilter {
  condition: string
  onReject?: 'ack' | 'reject' | 'requeue'
  idField?: string
  maxRequeue?: number
}

export interface FlowFrom {
  connector: string
  operation: string
  filter?: string | FlowFilter
}

export interface FlowTo {
  connector: string
  target?: string
  query?: string
  operation?: string
  exchange?: string
  when?: string
  parallel?: boolean
  transform?: Record<string, string>
}

export interface FlowStep {
  name: string
  connector: string
  operation?: string
  query?: string
  target?: string
  params?: Record<string, string>
  body?: Record<string, string>
  format?: 'json' | 'xml'
  when?: string
  timeout?: string
  onError?: 'fail' | 'skip' | 'default'
  default?: Record<string, string>
}

export interface FlowResponse {
  fields: Record<string, string>
  httpStatusCode?: string
  grpcStatusCode?: string
}

export interface FlowBatch {
  source: string
  query: string
  chunkSize?: number
  params?: Record<string, string>
  onError?: 'stop' | 'continue'
  transform?: Record<string, string>
  to: FlowTo
}

export interface FlowDedupe {
  storage: string
  key: string
  ttl?: string
  onDuplicate?: 'skip' | 'error'
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

export interface FlowFallback {
  connector: string
  target: string
  includeError?: boolean
  transform?: Record<string, string>
}

export interface FlowErrorResponse {
  status: number
  headers?: Record<string, string>
  body?: Record<string, string>
}

export interface FlowErrorHandling {
  retry?: {
    attempts: number
    delay: string
    maxDelay?: string
    backoff?: 'exponential' | 'linear' | 'constant'
  }
  fallback?: FlowFallback
  errorResponse?: FlowErrorResponse
}

export interface FlowValidate {
  input?: string
  output?: string
}

// =============================================================================
// Connector Operations
// =============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

export interface RestOperation {
  id: string
  method: HttpMethod
  path: string
  description?: string
}

export interface GraphQLOperation {
  id: string
  type: 'query' | 'mutation' | 'subscription'
  name: string
  description?: string
}

export interface DatabaseOperation {
  id: string
  type: 'query' | 'insert' | 'update' | 'delete'
  target: string
  description?: string
}

export interface GrpcOperation {
  id: string
  service: string
  method: string
  description?: string
}

export interface QueueOperation {
  id: string
  type: 'publish' | 'subscribe'
  queue?: string
  topic?: string
  description?: string
}

export type ConnectorOperation =
  | RestOperation
  | GraphQLOperation
  | DatabaseOperation
  | GrpcOperation
  | QueueOperation

// =============================================================================
// Node Data Types
// =============================================================================

export interface ConnectorProfile {
  name: string
  config: Record<string, unknown>
  connectorType?: ConnectorType  // For profiled type, each profile can have its own type
  transform?: Record<string, string>
}

export interface ConnectorProfileConfig {
  enabled: boolean
  select: string       // CEL expression to pick profile
  default: string      // Fallback profile name
  fallback: string[]   // Ordered fallback chain
  profiles: ConnectorProfile[]
}

export interface ConnectorNodeData extends Record<string, unknown> {
  label: string
  connectorType: ConnectorType
  direction: ConnectorDirection
  config: Record<string, unknown>
  operations?: ConnectorOperation[]
  profileConfig?: ConnectorProfileConfig
}

export interface FlowNodeData extends Record<string, unknown> {
  label: string
  from?: FlowFrom
  to?: FlowTo | FlowTo[]
  validate?: FlowValidate
  transform?: FlowTransform
  steps?: FlowStep[]
  enrich?: FlowEnrich[]
  dedupe?: FlowDedupe
  response?: FlowResponse
  cache?: FlowCache
  lock?: FlowLock
  semaphore?: FlowSemaphore
  coordinate?: FlowCoordinate
  require?: FlowRequire
  batch?: FlowBatch
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
// Saga Types
// =============================================================================

export interface SagaAction {
  connector: string
  operation?: string
  target?: string
  query?: string
  body?: Record<string, string>
  data?: Record<string, string>
  set?: Record<string, string>
  where?: Record<string, string>
}

export interface SagaStep {
  name: string
  action?: SagaAction
  compensate?: SagaAction
  onError?: 'fail' | 'skip'
  timeout?: string
  delay?: string
  await?: string
}

export interface SagaNodeData extends Record<string, unknown> {
  label: string
  from?: FlowFrom
  steps: SagaStep[]
  onComplete?: SagaAction
  onFailure?: SagaAction
  timeout?: string
}

// =============================================================================
// State Machine Types
// =============================================================================

export interface StateMachineTransition {
  event: string
  transitionTo: string
  guard?: string
  action?: SagaAction
}

export interface StateMachineState {
  name: string
  final?: boolean
  transitions: StateMachineTransition[]
}

export interface StateMachineNodeData extends Record<string, unknown> {
  label: string
  initial: string
  states: StateMachineState[]
}

// =============================================================================
// Auth Types
// =============================================================================

export type AuthPreset = 'strict' | 'standard' | 'relaxed' | 'development'
export type JwtAlgorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512'
export type MfaRequirement = 'required' | 'optional' | 'off'
export type MfaMethod = 'totp' | 'webauthn' | 'sms' | 'email' | 'push'
export type TokenStorageDriver = 'memory' | 'redis'

export interface AuthJwtConfig {
  secret?: string
  algorithm: JwtAlgorithm
  accessLifetime: string
  refreshLifetime: string
  issuer?: string
  audience?: string[]
  rotation?: boolean
}

export interface AuthPasswordConfig {
  minLength: number
  maxLength?: number
  requireUpper: boolean
  requireLower: boolean
  requireNumber: boolean
  requireSpecial: boolean
  history?: number
  breachCheck?: boolean
}

export interface AuthMfaConfig {
  required: MfaRequirement
  methods: MfaMethod[]
  totpIssuer?: string
  recoveryCodes?: boolean
  recoveryCount?: number
}

export interface AuthSessionsConfig {
  maxActive: number
  idleTimeout: string
  absoluteTimeout?: string
  onMaxReached: 'deny' | 'revoke_oldest' | 'revoke_all'
}

export interface AuthSecurityConfig {
  bruteForce?: boolean
  bruteForceMaxAttempts?: number
  bruteForceWindow?: string
  bruteForceLockout?: string
  replayProtection?: boolean
}

export interface AuthStorageConfig {
  usersConnector?: string
  usersTable?: string
  tokenDriver: TokenStorageDriver
  tokenAddress?: string
}

export interface AuthSocialProvider {
  provider: string
  clientId?: string
  clientSecret?: string
  scopes?: string[]
}

export interface AuthConfig {
  enabled: boolean
  preset: AuthPreset
  jwt: AuthJwtConfig
  password: AuthPasswordConfig
  mfa: AuthMfaConfig
  sessions: AuthSessionsConfig
  security: AuthSecurityConfig
  storage: AuthStorageConfig
  socialProviders: AuthSocialProvider[]
  endpointPrefix?: string
}

// =============================================================================
// Security Types
// =============================================================================

export interface SecuritySanitizer {
  name: string
  wasm: string
  entrypoint?: string
  applyTo?: string[]
  fields?: string[]
}

export interface SecurityConfig {
  enabled: boolean
  maxInputLength?: number
  maxFieldLength?: number
  maxFieldDepth?: number
  allowedControlChars?: string[]
  sanitizers: SecuritySanitizer[]
}

// =============================================================================
// Plugin Types
// =============================================================================

export interface PluginDefinition {
  name: string
  source: string
  version?: string
  functions?: string[]
}

export interface PluginConfig {
  plugins: PluginDefinition[]
}

// =============================================================================
// Environment Variables
// =============================================================================

export interface EnvVariable {
  key: string
  value: string
  secret?: boolean
  description?: string
}

export interface EnvironmentOverlay {
  name: string
  variables: EnvVariable[]
}

export interface EnvironmentConfig {
  variables: EnvVariable[]
  environments: EnvironmentOverlay[]
  activeEnvironment?: string
}

// =============================================================================
// React Flow Node Types
// =============================================================================

export type NodeType = 'connector' | 'flow' | 'type' | 'transform' | 'validator' | 'aspect' | 'saga' | 'state_machine'

export type ConnectorNode = Node<ConnectorNodeData, 'connector'>
export type FlowNode = Node<FlowNodeData, 'flow'>
export type TypeNode = Node<TypeNodeData, 'type'>
export type TransformNode = Node<TransformNodeData, 'transform'>
export type ValidatorNode = Node<ValidatorNodeData, 'validator'>
export type AspectNode = Node<AspectNodeData, 'aspect'>
export type SagaNode = Node<SagaNodeData, 'saga'>
export type StateMachineNode = Node<StateMachineNodeData, 'state_machine'>

export type StudioNode = Node<
  | ConnectorNodeData
  | FlowNodeData
  | TypeNodeData
  | TransformNodeData
  | ValidatorNodeData
  | AspectNodeData
  | SagaNodeData
  | StateMachineNodeData
>

export type StudioEdge = Edge

// =============================================================================
// Project Types
// =============================================================================

export interface WorkflowStorageConfig {
  enabled: boolean
  storage?: string
  table?: string
  autoCreate?: boolean
}

export interface ServiceConfig {
  name: string
  version: string
  workflow?: WorkflowStorageConfig
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
