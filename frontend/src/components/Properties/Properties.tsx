import { useStudioStore } from '../../stores/useStudioStore'
import type { ConnectorNodeData, FlowNodeData } from '../../types'

const driverOptions: Record<string, string[]> = {
  database: ['sqlite', 'postgres', 'mysql', 'mongodb'],
  mq: ['rabbitmq', 'kafka'],
  cache: ['memory', 'redis'],
  file: ['local', 's3'],
}

function ConnectorProperties({
  data,
  onChange,
}: {
  data: ConnectorNodeData
  onChange: (data: Partial<ConnectorNodeData>) => void
}) {
  const drivers = driverOptions[data.connectorType] || []

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {(data.connectorType === 'rest' || data.connectorType === 'grpc' || data.connectorType === 'graphql') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
          <input
            type="number"
            value={data.config.port || ''}
            onChange={(e) =>
              onChange({ config: { ...data.config, port: parseInt(e.target.value) || undefined } })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {drivers.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
          <select
            value={data.config.driver || ''}
            onChange={(e) => onChange({ config: { ...data.config, driver: e.target.value } })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {data.config.driver === 'sqlite' ? 'Database Path' : 'Connection String'}
          </label>
          <input
            type="text"
            value={data.config.database || data.config.connection || ''}
            onChange={(e) =>
              onChange({
                config: {
                  ...data.config,
                  [data.config.driver === 'sqlite' ? 'database' : 'connection']: e.target.value,
                },
              })
            }
            placeholder={data.config.driver === 'sqlite' ? './data/app.db' : 'postgres://...'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {data.connectorType === 'mq' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {data.config.driver === 'kafka' ? 'Topic' : 'Queue'}
          </label>
          <input
            type="text"
            value={data.config.topic || data.config.queue || ''}
            onChange={(e) =>
              onChange({
                config: {
                  ...data.config,
                  [data.config.driver === 'kafka' ? 'topic' : 'queue']: e.target.value,
                },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {data.connectorType === 'rest' && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="cors"
            checked={data.config.cors || false}
            onChange={(e) => onChange({ config: { ...data.config, cors: e.target.checked } })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="cors" className="text-sm text-gray-700">
            Enable CORS
          </label>
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
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation (from)</label>
        <input
          type="text"
          value={data.fromOperation || ''}
          onChange={(e) => onChange({ fromOperation: e.target.value })}
          placeholder="GET /users"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Target (to)</label>
        <input
          type="text"
          value={data.toTarget || ''}
          onChange={(e) => onChange({ toTarget: e.target.value })}
          placeholder="users"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Schedule (cron)</label>
        <input
          type="text"
          value={data.when || ''}
          onChange={(e) => onChange({ when: e.target.value })}
          placeholder="0 * * * *"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      <div className="w-72 bg-gray-50 border-l border-gray-200 p-4">
        <div className="text-center text-gray-500 mt-8">
          <p className="text-sm">Select a node to edit its properties</p>
        </div>
      </div>
    )
  }

  const handleChange = (data: Partial<ConnectorNodeData | FlowNodeData>) => {
    updateNode(selectedNode.id, data)
  }

  return (
    <div className="w-72 bg-gray-50 border-l border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Properties
        </h2>
        <button
          onClick={() => removeNode(selectedNode.id)}
          className="text-xs text-red-600 hover:text-red-700"
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
