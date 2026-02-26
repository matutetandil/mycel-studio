import { useState, useCallback } from 'react'
import { GripVertical } from 'lucide-react'
import { useStudioStore } from '../../stores/useStudioStore'
import type { ConnectorNodeData, FlowNodeData, ConnectorType, ConnectorDirection, RestOperation, GraphQLOperation, ConnectorOperation } from '../../types'
import OperationsEditor from './OperationsEditor'
import GraphQLOperationsEditor from './GraphQLOperationsEditor'

const directionOptions: { value: ConnectorDirection; label: string; description: string }[] = [
  { value: 'input', label: 'Source', description: 'Triggers flows (e.g., API server, queue consumer)' },
  { value: 'output', label: 'Target', description: 'Receives data (e.g., database, queue publisher)' },
  { value: 'bidirectional', label: 'Both', description: 'Can be source or target' },
]

const driverOptions: Partial<Record<ConnectorType, string[]>> = {
  database: ['sqlite', 'postgres', 'mysql', 'mongodb'],
  queue: ['rabbitmq', 'kafka'],
  cache: ['memory', 'redis'],
  file: ['local'],
  grpc: ['server', 'client'],
  graphql: ['server', 'client'],
}

function ConnectorProperties({
  data,
  onChange,
}: {
  data: ConnectorNodeData
  onChange: (data: Partial<ConnectorNodeData>) => void
}) {
  const drivers = driverOptions[data.connectorType] || []
  const config = data.config || {}

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Name</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
        />
      </div>

      {/* Direction (input/output/bidirectional) */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Direction</label>
        <select
          value={data.direction || 'bidirectional'}
          onChange={(e) => onChange({ direction: e.target.value as ConnectorDirection })}
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
        >
          {directionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-500 mt-1">
          {directionOptions.find((o) => o.value === (data.direction || 'bidirectional'))?.description}
        </p>
      </div>

      {/* Port for server connectors */}
      {(data.connectorType === 'rest' || data.connectorType === 'grpc' || data.connectorType === 'graphql' || data.connectorType === 'tcp') && (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Port</label>
          <input
            type="number"
            value={(config.port as number) || ''}
            onChange={(e) =>
              onChange({ config: { ...config, port: parseInt(e.target.value) || undefined } })
            }
            placeholder="3000"
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
          />
        </div>
      )}

      {/* Driver selector */}
      {drivers.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Driver</label>
          <select
            value={(config.driver as string) || ''}
            onChange={(e) => onChange({ config: { ...config, driver: e.target.value } })}
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
          >
            <option value="">Select driver...</option>
            {drivers.map((driver) => (
              <option key={driver} value={driver}>
                {driver}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Database connector - SQLite */}
      {data.connectorType === 'database' && config.driver === 'sqlite' && (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Database Path</label>
          <input
            type="text"
            value={(config.database as string) || ''}
            onChange={(e) => onChange({ config: { ...config, database: e.target.value } })}
            placeholder="./data/app.db"
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
          />
        </div>
      )}

      {/* Database connector - PostgreSQL/MySQL */}
      {data.connectorType === 'database' && (config.driver === 'postgres' || config.driver === 'mysql') && (
        <>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Host</label>
            <input
              type="text"
              value={(config.host as string) || ''}
              onChange={(e) => onChange({ config: { ...config, host: e.target.value } })}
              placeholder="localhost"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Port</label>
            <input
              type="number"
              value={(config.port as number) || ''}
              onChange={(e) => onChange({ config: { ...config, port: parseInt(e.target.value) || undefined } })}
              placeholder={config.driver === 'postgres' ? '5432' : '3306'}
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Database</label>
            <input
              type="text"
              value={(config.database as string) || ''}
              onChange={(e) => onChange({ config: { ...config, database: e.target.value } })}
              placeholder="myapp"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">User</label>
            <input
              type="text"
              value={(config.user as string) || ''}
              onChange={(e) => onChange({ config: { ...config, user: e.target.value } })}
              placeholder="postgres"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Password</label>
            <input
              type="password"
              value={(config.password as string) || ''}
              onChange={(e) => onChange({ config: { ...config, password: e.target.value } })}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
          {config.driver === 'postgres' && (
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">SSL Mode</label>
              <select
                value={(config.ssl_mode as string) || ''}
                onChange={(e) => onChange({ config: { ...config, ssl_mode: e.target.value } })}
                className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
              >
                <option value="">Default</option>
                <option value="disable">Disable</option>
                <option value="require">Require</option>
                <option value="verify-full">Verify Full</option>
              </select>
            </div>
          )}
          {config.driver === 'mysql' && (
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Charset</label>
              <input
                type="text"
                value={(config.charset as string) || ''}
                onChange={(e) => onChange({ config: { ...config, charset: e.target.value } })}
                placeholder="utf8mb4"
                className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
              />
            </div>
          )}
        </>
      )}

      {/* Database connector - MongoDB */}
      {data.connectorType === 'database' && config.driver === 'mongodb' && (
        <>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">URI</label>
            <input
              type="text"
              value={(config.uri as string) || ''}
              onChange={(e) => onChange({ config: { ...config, uri: e.target.value } })}
              placeholder="mongodb://localhost:27017"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Database</label>
            <input
              type="text"
              value={(config.database as string) || ''}
              onChange={(e) => onChange({ config: { ...config, database: e.target.value } })}
              placeholder="myapp"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
        </>
      )}

      {/* Queue connector */}
      {data.connectorType === 'queue' && (
        <>
          {config.driver === 'rabbitmq' && (
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">URL</label>
              <input
                type="text"
                value={(config.url as string) || ''}
                onChange={(e) => onChange({ config: { ...config, url: e.target.value } })}
                placeholder="amqp://guest:guest@localhost:5672/"
                className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
              />
            </div>
          )}
          {config.driver === 'kafka' && (
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Brokers</label>
              <input
                type="text"
                value={(config.brokers as string) || ''}
                onChange={(e) => onChange({ config: { ...config, brokers: e.target.value } })}
                placeholder="kafka1:9092,kafka2:9092"
                className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
              />
            </div>
          )}
        </>
      )}

      {/* Cache connector */}
      {data.connectorType === 'cache' && (
        <>
          {config.driver === 'memory' && (
            <>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Max Items</label>
                <input
                  type="number"
                  value={(config.max_items as number) || ''}
                  onChange={(e) => onChange({ config: { ...config, max_items: parseInt(e.target.value) || undefined } })}
                  placeholder="10000"
                  className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Default TTL</label>
                <input
                  type="text"
                  value={(config.default_ttl as string) || ''}
                  onChange={(e) => onChange({ config: { ...config, default_ttl: e.target.value } })}
                  placeholder="5m"
                  className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
                />
              </div>
            </>
          )}
          {config.driver === 'redis' && (
            <>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Address</label>
                <input
                  type="text"
                  value={(config.address as string) || ''}
                  onChange={(e) => onChange({ config: { ...config, address: e.target.value } })}
                  placeholder="localhost:6379"
                  className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Password</label>
                <input
                  type="password"
                  value={(config.password as string) || ''}
                  onChange={(e) => onChange({ config: { ...config, password: e.target.value } })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">DB</label>
                <input
                  type="number"
                  value={(config.db as number) || ''}
                  onChange={(e) => onChange({ config: { ...config, db: parseInt(e.target.value) || 0 } })}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Key Prefix</label>
                <input
                  type="text"
                  value={(config.key_prefix as string) || ''}
                  onChange={(e) => onChange({ config: { ...config, key_prefix: e.target.value } })}
                  placeholder="myapp:"
                  className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
                />
              </div>
            </>
          )}
        </>
      )}

      {/* REST connector */}
      {data.connectorType === 'rest' && (
        <>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cors"
              checked={Boolean(config.cors)}
              onChange={(e) => onChange({ config: { ...config, cors: e.target.checked ? { origins: ['*'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] } : undefined } })}
              className="w-4 h-4 text-indigo-600 bg-neutral-800 border-neutral-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="cors" className="text-sm text-neutral-300">
              Enable CORS
            </label>
          </div>

          <OperationsEditor
            connectorType={data.connectorType}
            operations={(data.operations || []) as RestOperation[]}
            onChange={(operations) => onChange({ operations })}
          />
        </>
      )}

      {/* GraphQL connector */}
      {data.connectorType === 'graphql' && (
        <>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Endpoint</label>
            <input
              type="text"
              value={(config.endpoint as string) || ''}
              onChange={(e) => onChange({ config: { ...config, endpoint: e.target.value } })}
              placeholder="/graphql"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
          {config.driver === 'server' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="playground"
                checked={Boolean(config.playground)}
                onChange={(e) => onChange({ config: { ...config, playground: e.target.checked } })}
                className="w-4 h-4 text-indigo-600 bg-neutral-800 border-neutral-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="playground" className="text-sm text-neutral-300">
                Enable Playground
              </label>
            </div>
          )}

          <GraphQLOperationsEditor
            operations={(data.operations || []) as GraphQLOperation[]}
            onChange={(operations) => onChange({ operations })}
          />
        </>
      )}

      {/* S3 connector */}
      {data.connectorType === 's3' && (
        <>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Bucket</label>
            <input
              type="text"
              value={(config.bucket as string) || ''}
              onChange={(e) => onChange({ config: { ...config, bucket: e.target.value } })}
              placeholder="my-bucket"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Region</label>
            <input
              type="text"
              value={(config.region as string) || ''}
              onChange={(e) => onChange({ config: { ...config, region: e.target.value } })}
              placeholder="us-east-1"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Access Key</label>
            <input
              type="text"
              value={(config.access_key as string) || ''}
              onChange={(e) => onChange({ config: { ...config, access_key: e.target.value } })}
              placeholder="AKIAIOSFODNN7EXAMPLE"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Secret Key</label>
            <input
              type="password"
              value={(config.secret_key as string) || ''}
              onChange={(e) => onChange({ config: { ...config, secret_key: e.target.value } })}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Endpoint (optional)</label>
            <input
              type="text"
              value={(config.endpoint as string) || ''}
              onChange={(e) => onChange({ config: { ...config, endpoint: e.target.value } })}
              placeholder="http://localhost:9000 (for MinIO)"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
        </>
      )}

      {/* Exec connector */}
      {data.connectorType === 'exec' && (
        <>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Command</label>
            <input
              type="text"
              value={(config.command as string) || ''}
              onChange={(e) => onChange({ config: { ...config, command: e.target.value } })}
              placeholder="/usr/bin/python3"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Working Directory</label>
            <input
              type="text"
              value={(config.working_dir as string) || ''}
              onChange={(e) => onChange({ config: { ...config, working_dir: e.target.value } })}
              placeholder="/app/scripts"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Timeout</label>
            <input
              type="text"
              value={(config.timeout as string) || ''}
              onChange={(e) => onChange({ config: { ...config, timeout: e.target.value } })}
              placeholder="30s"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
        </>
      )}

      {/* File connector */}
      {data.connectorType === 'file' && (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Base Path</label>
          <input
            type="text"
            value={(config.base_path as string) || ''}
            onChange={(e) => onChange({ config: { ...config, base_path: e.target.value } })}
            placeholder="/data/files"
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
          />
        </div>
      )}
    </div>
  )
}

function FlowProperties({
  data,
  nodeId,
  onChange,
}: {
  data: FlowNodeData
  nodeId: string
  onChange: (data: Partial<FlowNodeData>) => void
}) {
  const { nodes, edges } = useStudioStore()

  // Find connected connectors
  const incomingEdge = edges.find((e) => e.target === nodeId)
  const outgoingEdge = edges.find((e) => e.source === nodeId)

  const sourceConnector = incomingEdge
    ? nodes.find((n) => n.id === incomingEdge.source && n.type === 'connector')
    : null
  const targetConnector = outgoingEdge
    ? nodes.find((n) => n.id === outgoingEdge.target && n.type === 'connector')
    : null

  const sourceData = sourceConnector?.data as ConnectorNodeData | undefined
  const targetData = targetConnector?.data as ConnectorNodeData | undefined

  // Get operations from source connector
  const sourceOperations = (sourceData?.operations as ConnectorOperation[]) || []

  // Get current values
  const fromOperation = data.from?.operation || ''
  const toTarget = data.to?.target || ''

  // Format operation display based on type
  const formatOperation = (op: ConnectorOperation): string => {
    if ('method' in op && 'path' in op) {
      // REST operation
      return `${op.method} ${op.path}`
    } else if ('type' in op && 'name' in op) {
      // GraphQL operation
      return `${op.type}.${op.name}`
    }
    return op.id
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Name</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
        />
      </div>

      {/* Source (From) */}
      <div className="p-3 bg-neutral-800/50 rounded-md space-y-3">
        <div className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
          <span className="font-medium">FROM</span>
          {sourceData ? (
            <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs">
              {sourceData.label} ({sourceData.connectorType})
            </span>
          ) : (
            <span className="text-amber-500 italic">Not connected</span>
          )}
        </div>

        {sourceOperations.length > 0 ? (
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Operation</label>
            <select
              value={fromOperation}
              onChange={(e) => onChange({ from: { connector: sourceData?.label.toLowerCase().replace(/\s+/g, '_') || '', operation: e.target.value } })}
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
            >
              <option value="">Select operation...</option>
              {sourceOperations.map((op) => (
                <option key={op.id} value={formatOperation(op)}>
                  {formatOperation(op)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Operation</label>
            <input
              type="text"
              value={fromOperation}
              onChange={(e) => onChange({ from: { connector: sourceData?.label.toLowerCase().replace(/\s+/g, '_') || '', operation: e.target.value } })}
              placeholder={
                sourceData?.connectorType === 'rest'
                  ? 'GET /users (define on connector)'
                  : sourceData?.connectorType === 'graphql'
                  ? 'Query.users (define on connector)'
                  : sourceData?.connectorType === 'grpc'
                  ? 'GetUser'
                  : 'operation'
              }
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
            />
          </div>
        )}
      </div>

      {/* Target (To) */}
      <div className="p-3 bg-neutral-800/50 rounded-md space-y-3">
        <div className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
          <span className="font-medium">TO</span>
          {targetData ? (
            <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs">
              {targetData.label} ({targetData.connectorType})
            </span>
          ) : (
            <span className="text-amber-500 italic">Not connected</span>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            {targetData?.connectorType === 'database' ? 'Table/Collection' : 'Target'}
          </label>
          <input
            type="text"
            value={toTarget}
            onChange={(e) => onChange({ to: { connector: targetData?.label.toLowerCase().replace(/\s+/g, '_') || '', target: e.target.value } })}
            placeholder={targetData?.connectorType === 'database' ? 'users' : 'target'}
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
          />
        </div>
      </div>

      {/* Schedule */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Schedule (cron)</label>
        <input
          type="text"
          value={data.when || ''}
          onChange={(e) => onChange({ when: e.target.value || undefined })}
          placeholder="0 * * * * or @every 5m"
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
        />
      </div>
    </div>
  )
}

function ServiceProperties() {
  const { serviceConfig, updateServiceConfig } = useStudioStore()

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
        Service
      </h2>
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Name</label>
        <input
          type="text"
          value={serviceConfig.name}
          onChange={(e) => updateServiceConfig({ name: e.target.value })}
          placeholder="my-service"
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
        />
        <p className="text-xs text-neutral-500 mt-1">Shown in /health, metrics, and logs</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Version</label>
        <input
          type="text"
          value={serviceConfig.version}
          onChange={(e) => updateServiceConfig({ version: e.target.value })}
          placeholder="1.0.0"
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
        />
      </div>
      <div className="pt-2 border-t border-neutral-800">
        <p className="text-xs text-neutral-500">Select a node to edit its properties</p>
      </div>
    </div>
  )
}

export default function Properties() {
  const { nodes, selectedNodeId, updateNode, removeNode } = useStudioStore()
  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const [width, setWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const startX = e.clientX
    const startWidth = width

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth - (e.clientX - startX)
      setWidth(Math.max(200, Math.min(500, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [width])

  if (!selectedNode) {
    return (
      <div style={{ width }} className="bg-neutral-900 border-l border-neutral-800 p-4 relative">
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-indigo-500/50 transition-colors flex items-center"
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="w-3 h-3 text-neutral-600 -ml-1" />
        </div>
        <ServiceProperties />
      </div>
    )
  }

  const handleChange = (data: Partial<ConnectorNodeData | FlowNodeData>) => {
    updateNode(selectedNode.id, data)
  }

  return (
    <div
      style={{ width }}
      className={`bg-neutral-900 border-l border-neutral-800 p-4 overflow-y-auto relative ${isResizing ? 'select-none' : ''}`}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-indigo-500/50 transition-colors flex items-center"
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="w-3 h-3 text-neutral-600 -ml-1" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Properties
        </h2>
        <button
          onClick={() => removeNode(selectedNode.id)}
          className="text-xs text-red-500 hover:text-red-400"
        >
          Delete
        </button>
      </div>

      {selectedNode.type === 'connector' ? (
        <ConnectorProperties
          data={selectedNode.data as ConnectorNodeData}
          onChange={handleChange}
        />
      ) : (
        <FlowProperties
          data={selectedNode.data as FlowNodeData}
          nodeId={selectedNode.id}
          onChange={handleChange}
        />
      )}
    </div>
  )
}
