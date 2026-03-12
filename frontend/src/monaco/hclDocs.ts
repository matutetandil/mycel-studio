// Shared documentation data for autocompletion and hover providers

export interface DocEntry {
  description: string
  example?: string
}

export const BLOCK_DOCS: Record<string, DocEntry> = {
  // Top-level blocks
  connector: {
    description: 'Defines a data source or target (REST, Database, Queue, Cache, gRPC, etc.).',
    example: 'connector "api" {\n  type = "rest"\n  port = 3000\n}',
  },
  flow: {
    description: 'Defines how data moves between connectors. Contains from, to, transform, and other blocks.',
    example: 'flow "get_users" {\n  from {\n    connector = "api"\n    operation = "GET /users"\n  }\n  to {\n    connector = "db"\n    target    = "users"\n  }\n}',
  },
  type: {
    description: 'Defines a validation schema with typed fields and constraints.',
    example: 'type "user" {\n  email = string {\n    format = "email"\n  }\n  age = number {\n    min = 0\n  }\n}',
  },
  validator: {
    description: 'Defines a reusable validation rule (regex, CEL expression, or WASM).',
    example: 'validator "email_format" {\n  type    = "regex"\n  pattern = "^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+$"\n  message = "Invalid email format"\n}',
  },
  transform: {
    description: 'Defines a reusable named transform with CEL expressions.',
    example: 'transform "normalize" {\n  email = "lower(input.email)"\n  name  = "trim(input.name)"\n}',
  },
  aspect: {
    description: 'Defines cross-cutting concerns (AOP). Runs before/after/around/on_error for matching flows.',
    example: 'aspect "log_requests" {\n  on   = "flow.*"\n  when = "before"\n  action {\n    connector = "logger"\n    target    = "logs"\n  }\n}',
  },
  saga: {
    description: 'Defines a distributed transaction with steps that have compensation (rollback) actions.',
    example: 'saga "create_order" {\n  step "reserve" {\n    action {\n      connector = "inventory"\n    }\n    compensate {\n      connector = "inventory"\n    }\n  }\n}',
  },
  state_machine: {
    description: 'Defines an entity lifecycle with states, transitions, guards, and actions.',
    example: 'state_machine "order" {\n  initial = "pending"\n  state "pending" {\n    transition "approve" {\n      target = "approved"\n    }\n  }\n}',
  },
  service: {
    description: 'Configures the service name and version. Shown in /health, metrics, and logs.',
    example: 'service {\n  name    = "my-service"\n  version = "1.0.0"\n}',
  },
  auth: {
    description: 'Configures authentication and authorization (JWT, password policies, MFA, sessions).',
    example: 'auth {\n  jwt {\n    algorithm = "HS256"\n    secret    = env("JWT_SECRET")\n  }\n}',
  },
  security: {
    description: 'Configures input sanitization limits and WASM sanitizers.',
    example: 'security {\n  input_limits {\n    max_input_length = 1048576\n  }\n}',
  },
  plugin: {
    description: 'Declares an external plugin from a git source with WASM functions.',
    example: 'plugin "validators" {\n  source  = "github.com/org/plugin"\n  version = "^1.0.0"\n}',
  },
  workflow: {
    description: 'Configures persistent storage for long-running sagas with delay/await/signal.',
    example: 'workflow {\n  storage {\n    connector = "db"\n    table     = "workflow_state"\n  }\n}',
  },
  batch: {
    description: 'Defines batch processing within a flow for large dataset processing.',
    example: 'batch {\n  source     = "db"\n  query      = "SELECT * FROM items"\n  chunk_size = 100\n}',
  },

  // Flow sub-blocks
  from: {
    description: 'Specifies the source connector and operation for a flow.',
    example: 'from {\n  connector = "api"\n  operation = "GET /users"\n}',
  },
  to: {
    description: 'Specifies the destination connector and target for a flow. Optional for echo flows.',
    example: 'to {\n  connector = "db"\n  target    = "users"\n}',
  },
  step: {
    description: 'Calls an external connector mid-flow for data enrichment. Results available as step.name.*',
    example: 'step "get_profile" {\n  connector = "user_service"\n  operation = "GET /profile/${input.user_id}"\n}',
  },
  response: {
    description: 'Transforms output AFTER the destination. Variables: input.* (request), output.* (dest result).',
    example: 'response {\n  id         = "output.id"\n  email      = "output.email"\n  created_at = "output.created_at"\n}',
  },
  error_handling: {
    description: 'Configures retry logic, fallback destinations, and error responses.',
    example: 'error_handling {\n  retry {\n    attempts = 3\n    backoff  = "exponential"\n  }\n}',
  },
  retry: {
    description: 'Configures automatic retry behavior on failure.',
    example: 'retry {\n  attempts = 3\n  backoff  = "exponential"\n  delay    = "1s"\n}',
  },
  cache: {
    description: 'Caches flow results using a cache connector.',
    example: 'cache {\n  storage = "my_cache"\n  key     = "users:${input.id}"\n  ttl     = "5m"\n}',
  },
  lock: {
    description: 'Acquires a distributed lock before executing the flow.',
    example: 'lock {\n  storage = "my_cache"\n  key     = "lock:${input.resource}"\n  ttl     = "30s"\n}',
  },
  semaphore: {
    description: 'Limits concurrent executions of a flow.',
    example: 'semaphore {\n  storage = "my_cache"\n  key     = "sem:heavy_task"\n  limit   = 5\n}',
  },
  dedupe: {
    description: 'Prevents duplicate processing of the same data.',
    example: 'dedupe {\n  storage = "my_cache"\n  key     = "dedupe:${input.id}"\n  ttl     = "1h"\n}',
  },
  validate: {
    description: 'Validates input/output data against a defined type.',
    example: 'validate {\n  input  = "user_input_type"\n  output = "user_output_type"\n}',
  },
  filter: {
    description: 'CEL expression that filters incoming requests. Only matching requests proceed.',
    example: 'from {\n  connector = "api"\n  operation = "GET /users"\n  filter    = "input.role == \'admin\'"\n}',
  },
}

export interface FunctionDoc {
  name: string
  signature: string
  description: string
  category: string
}

export const CEL_FUNCTION_DOCS: FunctionDoc[] = [
  // String functions
  { name: 'lower', signature: 'lower(string) -> string', description: 'Converts string to lowercase.', category: 'String' },
  { name: 'upper', signature: 'upper(string) -> string', description: 'Converts string to uppercase.', category: 'String' },
  { name: 'trim', signature: 'trim(string) -> string', description: 'Removes leading and trailing whitespace.', category: 'String' },
  { name: 'split', signature: 'split(string, separator) -> list', description: 'Splits a string by separator.', category: 'String' },
  { name: 'join', signature: 'join(list, separator) -> string', description: 'Joins a list into a string.', category: 'String' },
  { name: 'replace', signature: 'replace(string, old, new) -> string', description: 'Replaces occurrences of old with new.', category: 'String' },
  { name: 'substr', signature: 'substr(string, start, length) -> string', description: 'Extracts a substring.', category: 'String' },
  { name: 'contains', signature: 'contains(string, substr) -> bool', description: 'Checks if string contains substring.', category: 'String' },
  { name: 'starts_with', signature: 'starts_with(string, prefix) -> bool', description: 'Checks if string starts with prefix.', category: 'String' },
  { name: 'ends_with', signature: 'ends_with(string, suffix) -> bool', description: 'Checks if string ends with suffix.', category: 'String' },
  { name: 'format', signature: 'format(template, ...args) -> string', description: 'Formats a string with arguments.', category: 'String' },

  // Generation functions
  { name: 'uuid', signature: 'uuid() -> string', description: 'Generates a random UUID v4.', category: 'Generation' },
  { name: 'now', signature: 'now() -> timestamp', description: 'Returns the current timestamp.', category: 'Generation' },

  // Type conversion
  { name: 'int', signature: 'int(value) -> int', description: 'Converts value to integer.', category: 'Conversion' },
  { name: 'float', signature: 'float(value) -> float', description: 'Converts value to float.', category: 'Conversion' },
  { name: 'string', signature: 'string(value) -> string', description: 'Converts value to string.', category: 'Conversion' },

  // Collection functions
  { name: 'len', signature: 'len(collection) -> int', description: 'Returns the length of a string, list, or map.', category: 'Collection' },
  { name: 'map', signature: 'map(list, expr) -> list', description: 'Transforms each element in a list.', category: 'Collection' },
  { name: 'filter', signature: 'filter(list, predicate) -> list', description: 'Filters a list by predicate.', category: 'Collection' },
  { name: 'sort_by', signature: 'sort_by(list, key) -> list', description: 'Sorts a list by a key.', category: 'Collection' },
  { name: 'coalesce', signature: 'coalesce(...values) -> value', description: 'Returns the first non-null value.', category: 'Collection' },

  // Encoding functions
  { name: 'base64_encode', signature: 'base64_encode(string) -> string', description: 'Encodes a string to base64.', category: 'Encoding' },
  { name: 'base64_decode', signature: 'base64_decode(string) -> string', description: 'Decodes a base64 string.', category: 'Encoding' },
  { name: 'json_encode', signature: 'json_encode(value) -> string', description: 'Serializes a value to JSON string.', category: 'Encoding' },
  { name: 'json_decode', signature: 'json_decode(string) -> value', description: 'Parses a JSON string to a value.', category: 'Encoding' },

  // Environment
  { name: 'env', signature: 'env(name) -> string', description: 'Reads an environment variable.', category: 'Environment' },
]

export const VARIABLE_DOCS: Record<string, string> = {
  'input': 'Data from the source connector (request body, query params, etc.).',
  'output': 'Result from the destination connector. Only available when a `to` block exists.',
  'step': 'Results from step blocks. Access via `step.<step_name>.<field>`.',
  'error': 'Error information when in error_handling context.',
  'enriched': 'Data from enrich blocks (deprecated, use step instead).',
  'context': 'Flow execution context (request metadata, headers, etc.).',
  'flow': 'Flow metadata (name, execution ID, etc.).',
}

export const CONNECTOR_TYPE_DOCS: Record<string, string> = {
  rest: 'REST API server. Exposes HTTP endpoints.',
  http: 'HTTP client. Makes outbound HTTP requests.',
  database: 'Database connector. Supports SQLite, PostgreSQL, MySQL, MongoDB.',
  queue: 'Message queue. Supports RabbitMQ, Kafka, Redis.',
  cache: 'Cache storage. Supports in-memory and Redis.',
  grpc: 'gRPC server/client. Protocol Buffers based RPC.',
  graphql: 'GraphQL server/client with schema support.',
  tcp: 'Raw TCP socket server.',
  file: 'Local file system connector. Supports JSON, CSV, Excel, Text.',
  s3: 'AWS S3 compatible object storage.',
  exec: 'Execute shell commands and scripts.',
  websocket: 'WebSocket server for real-time bidirectional communication.',
  sse: 'Server-Sent Events for real-time one-way streaming.',
  cdc: 'Change Data Capture. Streams database changes in real-time.',
  elasticsearch: 'Elasticsearch search and analytics engine.',
  oauth: 'OAuth 2.0 authentication provider.',
  mqtt: 'MQTT messaging protocol for IoT.',
  ftp: 'FTP/SFTP file transfer protocol.',
  soap: 'SOAP web service (client or server).',
  email: 'Email sending via SMTP, SendGrid, or SES.',
  slack: 'Slack messaging via webhook or Bot API.',
  discord: 'Discord messaging via webhook.',
  sms: 'SMS via Twilio.',
  push: 'Push notifications via FCM or APNs.',
  webhook: 'Outbound webhook calls.',
}
