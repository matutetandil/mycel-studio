import { useStudioStore } from '../../stores/useStudioStore'
import type { ConnectorNodeData, FlowNodeData, ConnectorType } from '../../types'

const driverOptions: Partial<Record<ConnectorType, string[]>> = {
  database: ['sqlite', 'postgres', 'mysql', 'mongodb'],
  queue: ['rabbitmq', 'kafka'],
  cache: ['memory', 'redis'],
  file: ['local'],
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

      {(data.connectorType === 'rest' || data.connectorType === 'grpc' || data.connectorType === 'graphql' || data.connectorType === 'tcp') && (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Port</label>
          <input
            type="number"
            value={(config.port as number) || ''}
            onChange={(e) =>
              onChange({ config: { ...config, port: parseInt(e.target.value) || undefined } })
            }
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
          />
        </div>
      )}

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

      {data.connectorType === 'database' && (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            {config.driver === 'sqlite' ? 'Database Path' : 'Host'}
          </label>
          <input
            type="text"
            value={(config.driver === 'sqlite' ? config.database : config.host) as string || ''}
            onChange={(e) =>
              onChange({
                config: {
                  ...config,
                  [config.driver === 'sqlite' ? 'database' : 'host']: e.target.value,
                },
              })
            }
            placeholder={config.driver === 'sqlite' ? './data/app.db' : 'localhost'}
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
          />
        </div>
      )}

      {data.connectorType === 'queue' && (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Host</label>
          <input
            type="text"
            value={(config.host as string) || ''}
            onChange={(e) =>
              onChange({
                config: { ...config, host: e.target.value },
              })
            }
            placeholder="localhost"
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
          />
        </div>
      )}

      {data.connectorType === 'rest' && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="cors"
            checked={Boolean(config.cors)}
            onChange={(e) => onChange({ config: { ...config, cors: e.target.checked ? { origins: ['*'], methods: ['GET', 'POST'] } : undefined } })}
            className="w-4 h-4 text-indigo-600 bg-neutral-800 border-neutral-600 rounded focus:ring-indigo-500"
          />
          <label htmlFor="cors" className="text-sm text-neutral-300">
            Enable CORS
          </label>
        </div>
      )}

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
        </>
      )}

      {data.connectorType === 'exec' && (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Working Directory</label>
          <input
            type="text"
            value={(config.workingDir as string) || ''}
            onChange={(e) => onChange({ config: { ...config, workingDir: e.target.value } })}
            placeholder="/app/scripts"
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
          />
        </div>
      )}

      {data.connectorType === 'file' && (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Base Path</label>
          <input
            type="text"
            value={(config.basePath as string) || ''}
            onChange={(e) => onChange({ config: { ...config, basePath: e.target.value } })}
            placeholder="/data"
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
          />
        </div>
      )}
    </div>
  )
}

function FlowProperties({
  data,
  onChange,
}: {
  data: FlowNodeData
  onChange: (data: Partial<FlowNodeData>) => void
}) {
  // Support both old and new format
  const fromOperation = data.from?.operation || (data as Record<string, unknown>).fromOperation as string || ''
  const toTarget = data.to?.target || (data as Record<string, unknown>).toTarget as string || ''

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

      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Operation (from)</label>
        <input
          type="text"
          value={fromOperation}
          onChange={(e) => onChange({ from: { connector: data.from?.connector || '', operation: e.target.value } })}
          placeholder="GET /users"
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">Target (to)</label>
        <input
          type="text"
          value={toTarget}
          onChange={(e) => onChange({ to: { connector: data.to?.connector || '', target: e.target.value } })}
          placeholder="users"
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-neutral-500"
        />
      </div>

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

export default function Properties() {
  const { nodes, selectedNodeId, updateNode, removeNode } = useStudioStore()
  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  if (!selectedNode) {
    return (
      <div className="w-64 bg-neutral-900 border-l border-neutral-800 p-4">
        <div className="text-center text-neutral-500 mt-8">
          <p className="text-sm">Select a node to edit its properties</p>
        </div>
      </div>
    )
  }

  const handleChange = (data: Partial<ConnectorNodeData | FlowNodeData>) => {
    updateNode(selectedNode.id, data)
  }

  return (
    <div className="w-64 bg-neutral-900 border-l border-neutral-800 p-4 overflow-y-auto">
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
          onChange={handleChange}
        />
      )}
    </div>
  )
}
