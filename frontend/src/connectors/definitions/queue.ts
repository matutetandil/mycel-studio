import { MessageSquare } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const queue: ConnectorDefinition = {
  type: 'mq',
  label: 'Message Queue',
  icon: MessageSquare,
  color: 'bg-orange-500',
  category: 'Messaging',
  defaultDirection: 'input',
  fields: [],
  drivers: [
    {
      value: 'rabbitmq',
      label: 'RabbitMQ',
      fields: [
        // Connection
        { key: 'host', label: 'Host', type: 'string', placeholder: 'localhost' },
        { key: 'port', label: 'Port', type: 'number', placeholder: '5672' },
        { key: 'username', label: 'Username', type: 'string', placeholder: 'guest' },
        { key: 'password', label: 'Password', type: 'password', placeholder: 'guest' },
        { key: 'vhost', label: 'Virtual Host', type: 'string', placeholder: '/' },
        { key: 'url', label: 'URL (overrides above)', type: 'string', placeholder: 'amqp://guest:guest@localhost:5672/', helpText: 'If set, host/port/username/password/vhost are ignored' },
        { key: 'heartbeat', label: 'Heartbeat', type: 'string', placeholder: '10s' },
        { key: 'connection_name', label: 'Connection Name', type: 'string', helpText: 'Visible in RabbitMQ management UI' },
        { key: 'reconnect_delay', label: 'Reconnect Delay', type: 'string', placeholder: '5s' },
        { key: 'max_reconnects', label: 'Max Reconnects', type: 'number', placeholder: '10' },
        // TLS
        { key: 'tls_enabled', label: 'Enable TLS', type: 'boolean' },
        { key: 'tls_cert', label: 'TLS Client Certificate', type: 'string', visibleWhen: { field: 'tls_enabled', value: 'true' } },
        { key: 'tls_key', label: 'TLS Client Key', type: 'string', visibleWhen: { field: 'tls_enabled', value: 'true' } },
        { key: 'tls_ca_cert', label: 'TLS CA Certificate', type: 'string', visibleWhen: { field: 'tls_enabled', value: 'true' } },
        // Consumer (input mode)
        { key: 'consumer_queue', label: 'Queue', type: 'string', helpText: 'Queue to consume from' },
        { key: 'consumer_prefetch', label: 'Prefetch', type: 'number', placeholder: '10', helpText: 'QoS prefetch count' },
        { key: 'consumer_auto_ack', label: 'Auto Ack', type: 'boolean' },
        { key: 'consumer_workers', label: 'Workers', type: 'number', placeholder: '1', helpText: 'Concurrent consumer workers' },
        { key: 'consumer_tag', label: 'Consumer Tag', type: 'string' },
        { key: 'consumer_exclusive', label: 'Exclusive', type: 'boolean' },
        // DLQ
        { key: 'dlq_enabled', label: 'Enable Dead Letter Queue', type: 'boolean' },
        { key: 'dlq_exchange', label: 'DLQ Exchange', type: 'string', visibleWhen: { field: 'dlq_enabled', value: 'true' } },
        { key: 'dlq_queue', label: 'DLQ Queue', type: 'string', visibleWhen: { field: 'dlq_enabled', value: 'true' } },
        { key: 'dlq_max_retries', label: 'DLQ Max Retries', type: 'number', placeholder: '3', visibleWhen: { field: 'dlq_enabled', value: 'true' } },
        { key: 'dlq_retry_delay', label: 'DLQ Retry Delay', type: 'string', placeholder: '0', visibleWhen: { field: 'dlq_enabled', value: 'true' } },
        // Publisher (output mode)
        { key: 'publisher_exchange', label: 'Exchange', type: 'string', helpText: 'Target exchange for publishing' },
        { key: 'publisher_routing_key', label: 'Routing Key', type: 'string' },
        { key: 'publisher_mandatory', label: 'Mandatory', type: 'boolean' },
        { key: 'publisher_persistent', label: 'Persistent', type: 'boolean' },
        { key: 'publisher_content_type', label: 'Content Type', type: 'string', placeholder: 'application/json' },
        { key: 'publisher_confirms', label: 'Publisher Confirms', type: 'boolean' },
        // Exchange declaration
        { key: 'exchange_name', label: 'Exchange Name', type: 'string', helpText: 'Declare exchange on connect' },
        { key: 'exchange_type', label: 'Exchange Type', type: 'select', options: [
          { value: 'direct', label: 'Direct' },
          { value: 'fanout', label: 'Fanout' },
          { value: 'topic', label: 'Topic' },
          { value: 'headers', label: 'Headers' },
        ], visibleWhen: { field: 'exchange_name', value: '*' } },
        { key: 'exchange_durable', label: 'Exchange Durable', type: 'boolean', visibleWhen: { field: 'exchange_name', value: '*' } },
      ],
    },
    {
      value: 'kafka',
      label: 'Kafka',
      fields: [
        // Connection
        { key: 'brokers', label: 'Brokers', type: 'string', placeholder: 'kafka1:9092,kafka2:9092', helpText: 'Comma-separated broker addresses' },
        { key: 'client_id', label: 'Client ID', type: 'string', helpText: 'Defaults to connector name' },
        // TLS
        { key: 'tls_enabled', label: 'Enable TLS', type: 'boolean' },
        { key: 'tls_cert', label: 'TLS Client Certificate', type: 'string', visibleWhen: { field: 'tls_enabled', value: 'true' } },
        { key: 'tls_key', label: 'TLS Client Key', type: 'string', visibleWhen: { field: 'tls_enabled', value: 'true' } },
        { key: 'tls_ca_cert', label: 'TLS CA Certificate', type: 'string', visibleWhen: { field: 'tls_enabled', value: 'true' } },
        // SASL
        { key: 'sasl_mechanism', label: 'SASL Mechanism', type: 'select', options: [
          { value: '', label: 'None' },
          { value: 'PLAIN', label: 'PLAIN' },
          { value: 'SCRAM-SHA-256', label: 'SCRAM-SHA-256' },
          { value: 'SCRAM-SHA-512', label: 'SCRAM-SHA-512' },
        ] },
        { key: 'sasl_username', label: 'SASL Username', type: 'string', visibleWhen: { field: 'sasl_mechanism', value: ['PLAIN', 'SCRAM-SHA-256', 'SCRAM-SHA-512'] } },
        { key: 'sasl_password', label: 'SASL Password', type: 'password', visibleWhen: { field: 'sasl_mechanism', value: ['PLAIN', 'SCRAM-SHA-256', 'SCRAM-SHA-512'] } },
        // Consumer (input mode)
        { key: 'consumer_group_id', label: 'Group ID', type: 'string', helpText: 'Consumer group ID' },
        { key: 'consumer_topics', label: 'Topics', type: 'string', helpText: 'Comma-separated topic names' },
        { key: 'consumer_auto_offset_reset', label: 'Auto Offset Reset', type: 'select', options: [
          { value: 'earliest', label: 'Earliest' },
          { value: 'latest', label: 'Latest' },
        ] },
        { key: 'consumer_auto_commit', label: 'Auto Commit', type: 'boolean' },
        { key: 'consumer_concurrency', label: 'Concurrency', type: 'number', placeholder: '1' },
        { key: 'consumer_max_bytes', label: 'Max Fetch Bytes', type: 'number', placeholder: '10485760' },
        { key: 'consumer_max_wait_time', label: 'Max Wait Time', type: 'string', placeholder: '500ms' },
        // Producer (output mode)
        { key: 'producer_topic', label: 'Target Topic', type: 'string' },
        { key: 'producer_acks', label: 'Acks', type: 'select', options: [
          { value: 'none', label: 'None' },
          { value: 'one', label: 'One' },
          { value: 'all', label: 'All' },
        ] },
        { key: 'producer_retries', label: 'Retries', type: 'number', placeholder: '3' },
        { key: 'producer_batch_size', label: 'Batch Size (bytes)', type: 'number', placeholder: '16384' },
        { key: 'producer_linger_ms', label: 'Linger (ms)', type: 'number', placeholder: '5' },
        { key: 'producer_compression', label: 'Compression', type: 'select', options: [
          { value: 'none', label: 'None' },
          { value: 'gzip', label: 'gzip' },
          { value: 'snappy', label: 'Snappy' },
          { value: 'lz4', label: 'LZ4' },
          { value: 'zstd', label: 'Zstandard' },
        ] },
        // Schema Registry
        { key: 'schema_registry_url', label: 'Schema Registry URL', type: 'string', placeholder: 'http://localhost:8081' },
        { key: 'schema_registry_username', label: 'Schema Registry Username', type: 'string', visibleWhen: { field: 'schema_registry_url', value: '*' } },
        { key: 'schema_registry_password', label: 'Schema Registry Password', type: 'password', visibleWhen: { field: 'schema_registry_url', value: '*' } },
        { key: 'schema_registry_format', label: 'Schema Format', type: 'select', options: [
          { value: 'avro', label: 'Avro' },
          { value: 'json', label: 'JSON' },
          { value: 'protobuf', label: 'Protobuf' },
        ], visibleWhen: { field: 'schema_registry_url', value: '*' } },
      ],
    },
    {
      value: 'redis',
      label: 'Redis Pub/Sub',
      fields: [
        { key: 'host', label: 'Host', type: 'string', placeholder: 'localhost' },
        { key: 'port', label: 'Port', type: 'number', placeholder: '6379' },
        { key: 'password', label: 'Password', type: 'password' },
        { key: 'db', label: 'DB', type: 'number', placeholder: '0' },
        { key: 'channels', label: 'Channels', type: 'string', placeholder: 'channel1,channel2', helpText: 'Comma-separated exact channel names' },
        { key: 'patterns', label: 'Patterns', type: 'string', placeholder: 'events.*', helpText: 'Comma-separated glob patterns for PSUBSCRIBE' },
      ],
    },
  ],
}
