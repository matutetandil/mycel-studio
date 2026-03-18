// Context-aware destination properties per connector type.
// Defines what fields to show in the "to" block based on the target connector.

export interface DestinationFieldDef {
  key: string
  label: string
  type: 'text' | 'select' | 'textarea' | 'checkbox' | 'kv-map'
  placeholder?: string
  helpText?: string
  options?: { value: string; label: string }[]
  /** Show this field only when a specific driver is selected */
  visibleWhenDriver?: string[]
  /** Show this field only when a specific driver is NOT selected */
  hiddenWhenDriver?: string[]
  /** Map to a specific FlowTo field instead of params.key */
  mapsTo?: 'target' | 'operation' | 'query' | 'query_filter' | 'update' | 'format'
}

export interface DestinationConfig {
  targetLabel: string
  targetPlaceholder: string
  targetHelpText?: string
  /** Hide target field entirely (e.g., notification connectors) */
  hideTarget?: boolean
  operationOptions?: { value: string; label: string }[]
  operationHelpText?: string
  /** Hide operation field */
  hideOperation?: boolean
  /** Extra fields specific to this connector type */
  fields?: DestinationFieldDef[]
  /** Info note shown at the bottom (e.g., for notification connectors) */
  infoNote?: string
}

// Helper to check if a database connector uses MongoDB driver
export function isMongoDriver(config: Record<string, unknown> | undefined): boolean {
  return config?.driver === 'mongodb'
}

const DATABASE_SQL: DestinationConfig = {
  targetLabel: 'Table',
  targetPlaceholder: 'users',
  operationOptions: [
    { value: '', label: 'Auto (from HTTP method)' },
    { value: 'INSERT', label: 'INSERT' },
    { value: 'UPDATE', label: 'UPDATE' },
    { value: 'DELETE', label: 'DELETE' },
  ],
  fields: [
    {
      key: 'query',
      label: 'Raw SQL (optional)',
      type: 'textarea',
      placeholder: 'INSERT INTO users (name, email) VALUES (:name, :email)',
      helpText: 'Named parameters (:name) resolved from payload',
      mapsTo: 'query',
    },
  ],
}

const DATABASE_MONGODB: DestinationConfig = {
  targetLabel: 'Collection',
  targetPlaceholder: 'users',
  operationOptions: [
    { value: 'INSERT_ONE', label: 'INSERT_ONE' },
    { value: 'INSERT_MANY', label: 'INSERT_MANY' },
    { value: 'UPDATE_ONE', label: 'UPDATE_ONE' },
    { value: 'UPDATE_MANY', label: 'UPDATE_MANY' },
    { value: 'DELETE_ONE', label: 'DELETE_ONE' },
    { value: 'DELETE_MANY', label: 'DELETE_MANY' },
    { value: 'REPLACE_ONE', label: 'REPLACE_ONE' },
  ],
  fields: [
    {
      key: 'query_filter',
      label: 'Filter (WHERE)',
      type: 'kv-map',
      placeholder: 'input.order_id',
      helpText: 'MongoDB filter document',
      mapsTo: 'query_filter',
    },
    {
      key: 'update',
      label: 'Update Document',
      type: 'kv-map',
      placeholder: '"completed"',
      helpText: 'MongoDB update: $set, $inc, $push, etc.',
      mapsTo: 'update',
    },
    {
      key: 'upsert',
      label: 'Upsert',
      type: 'checkbox',
    },
  ],
}

const MQ_RABBITMQ: DestinationConfig = {
  targetLabel: 'Routing Key',
  targetPlaceholder: 'order.created',
  hideOperation: true,
  fields: [
    {
      key: 'exchange',
      label: 'Exchange',
      type: 'text',
      placeholder: 'orders',
      helpText: 'RabbitMQ exchange name',
    },
  ],
}

const MQ_KAFKA: DestinationConfig = {
  targetLabel: 'Topic',
  targetPlaceholder: 'orders',
  hideOperation: true,
}

const MQ_REDIS: DestinationConfig = {
  targetLabel: 'Channel',
  targetPlaceholder: 'events.orders',
  hideOperation: true,
}

const MQTT: DestinationConfig = {
  targetLabel: 'Topic',
  targetPlaceholder: 'sensors/temperature',
  hideOperation: true,
  fields: [
    {
      key: 'qos',
      label: 'QoS',
      type: 'select',
      options: [
        { value: '0', label: '0 - At most once' },
        { value: '1', label: '1 - At least once' },
        { value: '2', label: '2 - Exactly once' },
      ],
    },
    {
      key: 'retain',
      label: 'Retain message',
      type: 'checkbox',
    },
  ],
}

const HTTP_CLIENT: DestinationConfig = {
  targetLabel: 'Endpoint',
  targetPlaceholder: '/api/users',
  targetHelpText: 'Path appended to connector base_url',
  operationOptions: [
    { value: '', label: 'Auto' },
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'PATCH', label: 'PATCH' },
    { value: 'DELETE', label: 'DELETE' },
  ],
}

const GRAPHQL_CLIENT: DestinationConfig = {
  targetLabel: 'Query/Mutation',
  targetPlaceholder: 'mutation CreateUser($input: UserInput!) { ... }',
  targetHelpText: 'Full GraphQL query or mutation string',
  hideOperation: true,
}

const GRPC_CLIENT: DestinationConfig = {
  targetLabel: 'RPC Method',
  targetPlaceholder: 'CreateUser',
  hideOperation: true,
}

const SOAP_CLIENT: DestinationConfig = {
  targetLabel: 'SOAP Operation',
  targetPlaceholder: 'CreateItem',
  hideOperation: true,
}

const FILE: DestinationConfig = {
  targetLabel: 'File Path',
  targetPlaceholder: 'output/report.json',
  targetHelpText: 'Relative to connector base_path',
  operationOptions: [
    { value: '', label: 'WRITE (default)' },
    { value: 'WRITE', label: 'WRITE' },
    { value: 'DELETE', label: 'DELETE' },
    { value: 'COPY', label: 'COPY' },
    { value: 'MOVE', label: 'MOVE' },
  ],
  fields: [
    {
      key: 'format',
      label: 'Format',
      type: 'select',
      options: [
        { value: '', label: 'Auto (from extension)' },
        { value: 'json', label: 'JSON' },
        { value: 'csv', label: 'CSV' },
        { value: 'text', label: 'Text' },
      ],
      mapsTo: 'format',
    },
    {
      key: 'append',
      label: 'Append to file',
      type: 'checkbox',
    },
    {
      key: 'sheet',
      label: 'Excel Sheet',
      type: 'text',
      placeholder: 'Sheet1',
      helpText: 'For .xlsx files only',
    },
  ],
}

const S3: DestinationConfig = {
  targetLabel: 'Object Key',
  targetPlaceholder: 'uploads/document.pdf',
  operationOptions: [
    { value: '', label: 'PUT (default)' },
    { value: 'PUT', label: 'PUT' },
    { value: 'DELETE', label: 'DELETE' },
    { value: 'COPY', label: 'COPY' },
  ],
  fields: [
    {
      key: 'content_type',
      label: 'Content Type',
      type: 'text',
      placeholder: 'application/pdf',
    },
    {
      key: 'storage_class',
      label: 'Storage Class',
      type: 'select',
      options: [
        { value: '', label: 'Default' },
        { value: 'STANDARD', label: 'Standard' },
        { value: 'INTELLIGENT_TIERING', label: 'Intelligent Tiering' },
        { value: 'GLACIER', label: 'Glacier' },
      ],
    },
    {
      key: 'acl',
      label: 'ACL',
      type: 'select',
      options: [
        { value: '', label: 'Default' },
        { value: 'private', label: 'Private' },
        { value: 'public-read', label: 'Public Read' },
      ],
    },
  ],
}

const EXEC: DestinationConfig = {
  targetLabel: 'Command',
  targetPlaceholder: 'convert',
  hideOperation: true,
  fields: [
    {
      key: 'args',
      label: 'Arguments',
      type: 'text',
      placeholder: '-resize 800x600',
      helpText: 'Space-separated command arguments',
    },
    {
      key: 'stdin',
      label: 'Stdin',
      type: 'text',
      placeholder: 'input.data',
      helpText: 'CEL expression for stdin input',
    },
  ],
}

const ELASTICSEARCH: DestinationConfig = {
  targetLabel: 'Index',
  targetPlaceholder: 'products',
  operationOptions: [
    { value: '', label: 'index (default)' },
    { value: 'index', label: 'index' },
    { value: 'update', label: 'update' },
    { value: 'delete', label: 'delete' },
    { value: 'bulk', label: 'bulk' },
  ],
}

const PDF: DestinationConfig = {
  targetLabel: 'Template (fallback)',
  targetPlaceholder: './templates/invoice.html',
  targetHelpText: 'Fallback if not set in connector config or payload',
  operationOptions: [
    { value: 'generate', label: 'generate (binary response)' },
    { value: 'save', label: 'save (write to file)' },
  ],
}

const WEBSOCKET: DestinationConfig = {
  targetLabel: 'Room',
  targetPlaceholder: 'order-updates',
  targetHelpText: 'Required for send_to_room',
  operationOptions: [
    { value: 'broadcast', label: 'broadcast' },
    { value: 'send_to_room', label: 'send_to_room' },
    { value: 'send_to_user', label: 'send_to_user' },
  ],
}

const SSE: DestinationConfig = {
  targetLabel: 'Room',
  targetPlaceholder: 'dashboard',
  operationOptions: [
    { value: 'broadcast', label: 'broadcast' },
    { value: 'send_to_room', label: 'send_to_room' },
  ],
}

const TCP: DestinationConfig = {
  targetLabel: 'Connection ID',
  targetPlaceholder: '',
  hideOperation: true,
}

const NOTIFICATION: DestinationConfig = {
  hideTarget: true,
  targetLabel: 'Target',
  targetPlaceholder: '',
  operationOptions: [
    { value: 'send', label: 'send' },
  ],
  infoNote: 'Message fields (to, subject, text, etc.) come from the flow\'s transform block, not from to properties.',
}

const WEBHOOK: DestinationConfig = {
  hideTarget: true,
  targetLabel: 'Target',
  targetPlaceholder: '',
  hideOperation: true,
  infoNote: 'URL, method, and headers are configured in the connector. Payload comes from the flow\'s transform block.',
}

const CACHE: DestinationConfig = {
  targetLabel: 'Key',
  targetPlaceholder: 'user:123',
  operationOptions: [
    { value: '', label: 'SET (default)' },
    { value: 'SET', label: 'SET' },
    { value: 'DELETE', label: 'DELETE' },
  ],
}

const GENERIC: DestinationConfig = {
  targetLabel: 'Target',
  targetPlaceholder: 'target',
}

// Map of connector type → destination config
// For types that depend on driver, use getDestinationConfig() instead
const DESTINATION_CONFIGS: Record<string, DestinationConfig> = {
  http: HTTP_CLIENT,
  graphql: GRAPHQL_CLIENT,
  grpc: GRPC_CLIENT,
  soap: SOAP_CLIENT,
  mqtt: MQTT,
  file: FILE,
  s3: S3,
  exec: EXEC,
  elasticsearch: ELASTICSEARCH,
  pdf: PDF,
  websocket: WEBSOCKET,
  sse: SSE,
  tcp: TCP,
  cache: CACHE,
  webhook: WEBHOOK,
  email: NOTIFICATION,
  slack: NOTIFICATION,
  discord: NOTIFICATION,
  sms: NOTIFICATION,
  push: NOTIFICATION,
}

/**
 * Get destination properties config for a connector type + driver combo.
 */
export function getDestinationConfig(
  connectorType: string,
  driver?: string
): DestinationConfig {
  // Database depends on driver
  if (connectorType === 'database') {
    return driver === 'mongodb' ? DATABASE_MONGODB : DATABASE_SQL
  }

  // MQ depends on driver
  if (connectorType === 'mq') {
    if (driver === 'kafka') return MQ_KAFKA
    if (driver === 'redis') return MQ_REDIS
    return MQ_RABBITMQ
  }

  return DESTINATION_CONFIGS[connectorType] || GENERIC
}
