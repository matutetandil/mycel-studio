// Context-aware source properties per connector type.
// Defines what the `operation` field means and what `input.*` variables are available.

export interface SourceConfig {
  operationLabel: string
  operationPlaceholder: string
  operationHelpText?: string
  /** Available input.* variables for reference tooltip */
  inputVariables: string[]
  /** For REST: show split method+path input instead of single text field */
  splitMethodPath?: boolean
  /** For GraphQL: show prefix dropdown (Query/Mutation/Subscription) + field name */
  splitGraphqlPrefix?: boolean
  /** Predefined operation options (e.g., WebSocket events, SSE events) */
  operationOptions?: { value: string; label: string }[]
}

const REST: SourceConfig = {
  operationLabel: 'HTTP Method + Path',
  operationPlaceholder: 'GET /users/:id',
  operationHelpText: 'Path params use :param syntax',
  inputVariables: ['input.<param> (path)', 'input.<param> (query)', 'input.<field> (body)', 'input.headers'],
}

const GRAPHQL: SourceConfig = {
  operationLabel: 'GraphQL Operation',
  operationPlaceholder: 'Query.users or Mutation.createUser',
  inputVariables: ['input.<arg> (arguments)'],
}

const GRPC: SourceConfig = {
  operationLabel: 'RPC Method',
  operationPlaceholder: 'UserService/CreateUser',
  inputVariables: ['input.<field> (proto message)'],
}

const SOAP: SourceConfig = {
  operationLabel: 'SOAP Operation',
  operationPlaceholder: 'CreateOrder',
  inputVariables: ['input.<field> (SOAP body)'],
}

const TCP: SourceConfig = {
  operationLabel: 'Message Type',
  operationPlaceholder: 'create_order',
  inputVariables: ['input.<field> (message data)'],
}

const MQ_RABBITMQ: SourceConfig = {
  operationLabel: 'Routing Key',
  operationPlaceholder: 'orders.created',
  operationHelpText: 'AMQP patterns: * = one word, # = zero or more',
  inputVariables: ['input.body', 'input.headers', 'input.properties', 'input.routing_key', 'input.exchange'],
}

const MQ_KAFKA: SourceConfig = {
  operationLabel: 'Topic',
  operationPlaceholder: 'order-events',
  inputVariables: ['input.body', 'input.headers', 'input.topic', 'input.partition', 'input.offset', 'input.key', 'input.timestamp'],
}

const MQ_REDIS: SourceConfig = {
  operationLabel: 'Channel Pattern',
  operationPlaceholder: 'orders.*',
  operationHelpText: 'Supports glob patterns for PSubscribe',
  inputVariables: ['input._channel', 'input._pattern', 'input.<field> (payload)'],
}

const MQTT: SourceConfig = {
  operationLabel: 'Topic Pattern',
  operationPlaceholder: 'sensors/+/temperature',
  operationHelpText: 'MQTT wildcards: + = single level, # = multi-level',
  inputVariables: ['input._topic', 'input._message_id', 'input._qos', 'input._retained', 'input.<field> (payload)'],
}

const WEBSOCKET: SourceConfig = {
  operationLabel: 'Event Type',
  operationPlaceholder: 'message',
  operationOptions: [
    { value: 'connect', label: 'connect' },
    { value: 'disconnect', label: 'disconnect' },
    { value: 'message', label: 'message' },
  ],
  inputVariables: ['input.event', 'input.user_id', 'input.<field> (data)'],
}

const SSE: SourceConfig = {
  operationLabel: 'Event Type',
  operationPlaceholder: 'connect',
  operationOptions: [
    { value: 'connect', label: 'connect' },
    { value: 'disconnect', label: 'disconnect' },
  ],
  inputVariables: ['input.event', 'input.client_id', 'input.remote_addr'],
}

const CDC: SourceConfig = {
  operationLabel: 'Trigger:Table',
  operationPlaceholder: 'INSERT:users',
  operationHelpText: 'Format: TRIGGER:table (e.g., INSERT:users, *:*, UPDATE:orders)',
  inputVariables: ['input.trigger', 'input.table', 'input.schema', 'input.new', 'input.old', 'input.timestamp'],
}

const FILE_WATCH: SourceConfig = {
  operationLabel: 'File Pattern',
  operationPlaceholder: '*.csv',
  operationHelpText: 'Glob pattern matched against filename',
  inputVariables: ['input._path', 'input._name', 'input._size', 'input._mod_time', 'input._event', 'input.rows'],
}

const GENERIC: SourceConfig = {
  operationLabel: 'Operation',
  operationPlaceholder: 'operation',
  inputVariables: [],
}

const SOURCE_CONFIGS: Record<string, SourceConfig> = {
  rest: REST,
  graphql: GRAPHQL,
  grpc: GRPC,
  soap: SOAP,
  tcp: TCP,
  mqtt: MQTT,
  websocket: WEBSOCKET,
  sse: SSE,
  cdc: CDC,
}

/**
 * Get source properties config for a connector type + driver combo.
 */
export function getSourceConfig(
  connectorType: string,
  driver?: string
): SourceConfig {
  // MQ depends on driver
  if (connectorType === 'mq') {
    if (driver === 'kafka') return MQ_KAFKA
    if (driver === 'redis') return MQ_REDIS
    return MQ_RABBITMQ
  }

  // File with watch enabled acts as source
  if (connectorType === 'file') return FILE_WATCH

  return SOURCE_CONFIGS[connectorType] || GENERIC
}
