import type { Node, Edge } from '@xyflow/react'
import type { ConnectorNodeData, FlowNodeData, SagaNodeData } from '../types'

type StudioNode = Node<ConnectorNodeData | FlowNodeData | SagaNodeData>

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  category: 'basic' | 'messaging' | 'realtime' | 'enterprise'
  nodes: StudioNode[]
  edges: Edge[]
}

const restDbCrud: ProjectTemplate = {
  id: 'rest-db-crud',
  name: 'REST + Database CRUD',
  description: 'REST API server with database backend for basic CRUD operations',
  category: 'basic',
  nodes: [
    {
      id: 'connector-api',
      type: 'connector',
      position: { x: 100, y: 200 },
      data: {
        label: 'API',
        connectorType: 'rest',
        direction: 'input',
        config: { port: 3000 },
        operations: [
          { id: '1', method: 'GET', path: '/users' },
          { id: '2', method: 'POST', path: '/users' },
          { id: '3', method: 'GET', path: '/users/:id' },
          { id: '4', method: 'PUT', path: '/users/:id' },
          { id: '5', method: 'DELETE', path: '/users/:id' },
        ],
      },
    },
    {
      id: 'connector-db',
      type: 'connector',
      position: { x: 700, y: 200 },
      data: {
        label: 'Database',
        connectorType: 'database',
        direction: 'output',
        config: { driver: 'sqlite', database: './data/app.db' },
      },
    },
    {
      id: 'flow-list',
      type: 'flow',
      position: { x: 370, y: 100 },
      data: {
        label: 'List Users',
        from: { connector: 'api', operation: 'GET /users' },
        to: { connector: 'database', target: 'users' },
      },
    },
    {
      id: 'flow-create',
      type: 'flow',
      position: { x: 370, y: 220 },
      data: {
        label: 'Create User',
        from: { connector: 'api', operation: 'POST /users' },
        to: { connector: 'database', target: 'users' },
        transform: {
          fields: {
            id: 'uuid()',
            email: 'lower(input.email)',
            created_at: 'now()',
          },
        },
      },
    },
    {
      id: 'flow-get',
      type: 'flow',
      position: { x: 370, y: 340 },
      data: {
        label: 'Get User',
        from: { connector: 'api', operation: 'GET /users/:id' },
        to: { connector: 'database', target: 'users' },
      },
    },
  ],
  edges: [
    { id: 'e-api-list', source: 'connector-api', target: 'flow-list' },
    { id: 'e-list-db', source: 'flow-list', target: 'connector-db' },
    { id: 'e-api-create', source: 'connector-api', target: 'flow-create' },
    { id: 'e-create-db', source: 'flow-create', target: 'connector-db' },
    { id: 'e-api-get', source: 'connector-api', target: 'flow-get' },
    { id: 'e-get-db', source: 'flow-get', target: 'connector-db' },
  ],
}

const eventProcessing: ProjectTemplate = {
  id: 'event-processing',
  name: 'Event Processing',
  description: 'REST API publishes events to a queue, a worker processes them into a database',
  category: 'messaging',
  nodes: [
    {
      id: 'connector-api',
      type: 'connector',
      position: { x: 100, y: 150 },
      data: {
        label: 'API',
        connectorType: 'rest',
        direction: 'input',
        config: { port: 3000 },
        operations: [
          { id: '1', method: 'POST', path: '/orders' },
        ],
      },
    },
    {
      id: 'connector-queue',
      type: 'connector',
      position: { x: 400, y: 150 },
      data: {
        label: 'Queue',
        connectorType: 'queue',
        direction: 'input',
        config: { driver: 'rabbitmq', host: 'localhost', port: 5672, username: 'guest', password: 'guest' },
      },
    },
    {
      id: 'connector-db',
      type: 'connector',
      position: { x: 700, y: 150 },
      data: {
        label: 'Database',
        connectorType: 'database',
        direction: 'output',
        config: { driver: 'postgres', host: 'localhost', port: 5432, username: 'postgres', database: 'orders' },
      },
    },
    {
      id: 'flow-publish',
      type: 'flow',
      position: { x: 220, y: 50 },
      data: {
        label: 'Publish Order',
        from: { connector: 'api', operation: 'POST /orders' },
        to: { connector: 'queue', target: 'orders.new' },
        transform: {
          fields: {
            order_id: 'uuid()',
            created_at: 'now()',
          },
        },
      },
    },
    {
      id: 'flow-process',
      type: 'flow',
      position: { x: 520, y: 50 },
      data: {
        label: 'Process Order',
        from: { connector: 'queue', operation: 'orders.new' },
        to: { connector: 'database', target: 'orders' },
        errorHandling: {
          retry: { attempts: 3, delay: '1s', backoff: 'exponential' },
        },
      },
    },
  ],
  edges: [
    { id: 'e-api-pub', source: 'connector-api', target: 'flow-publish' },
    { id: 'e-pub-queue', source: 'flow-publish', target: 'connector-queue' },
    { id: 'e-queue-proc', source: 'connector-queue', target: 'flow-process' },
    { id: 'e-proc-db', source: 'flow-process', target: 'connector-db' },
  ],
}

const realtimeChat: ProjectTemplate = {
  id: 'realtime-chat',
  name: 'Real-time WebSocket',
  description: 'REST API with WebSocket for real-time messaging and database persistence',
  category: 'realtime',
  nodes: [
    {
      id: 'connector-api',
      type: 'connector',
      position: { x: 100, y: 100 },
      data: {
        label: 'API',
        connectorType: 'rest',
        direction: 'input',
        config: { port: 3000 },
        operations: [
          { id: '1', method: 'POST', path: '/messages' },
          { id: '2', method: 'GET', path: '/messages' },
        ],
      },
    },
    {
      id: 'connector-ws',
      type: 'connector',
      position: { x: 700, y: 100 },
      data: {
        label: 'WebSocket',
        connectorType: 'websocket',
        direction: 'bidirectional',
        config: { port: 3001, path: '/ws' },
      },
    },
    {
      id: 'connector-db',
      type: 'connector',
      position: { x: 400, y: 300 },
      data: {
        label: 'Database',
        connectorType: 'database',
        direction: 'output',
        config: { driver: 'postgres', host: 'localhost', port: 5432, database: 'chat' },
      },
    },
    {
      id: 'flow-send',
      type: 'flow',
      position: { x: 350, y: 50 },
      data: {
        label: 'Send Message',
        from: { connector: 'api', operation: 'POST /messages' },
        to: [
          { connector: 'database', target: 'messages' },
          { connector: 'websocket', target: 'broadcast' },
        ],
        transform: {
          fields: {
            id: 'uuid()',
            timestamp: 'now()',
          },
        },
      },
    },
    {
      id: 'flow-history',
      type: 'flow',
      position: { x: 200, y: 200 },
      data: {
        label: 'Message History',
        from: { connector: 'api', operation: 'GET /messages' },
        to: { connector: 'database', target: 'messages' },
      },
    },
  ],
  edges: [
    { id: 'e-api-send', source: 'connector-api', target: 'flow-send' },
    { id: 'e-send-db', source: 'flow-send', target: 'connector-db' },
    { id: 'e-send-ws', source: 'flow-send', target: 'connector-ws' },
    { id: 'e-api-hist', source: 'connector-api', target: 'flow-history' },
    { id: 'e-hist-db', source: 'flow-history', target: 'connector-db' },
  ],
}

const scheduledJob: ProjectTemplate = {
  id: 'scheduled-job',
  name: 'Scheduled Job',
  description: 'Cron-triggered flow that reads from a database and sends notifications',
  category: 'basic',
  nodes: [
    {
      id: 'connector-db',
      type: 'connector',
      position: { x: 100, y: 150 },
      data: {
        label: 'Database',
        connectorType: 'database',
        direction: 'output',
        config: { driver: 'postgres', host: 'localhost', port: 5432, database: 'app' },
      },
    },
    {
      id: 'connector-email',
      type: 'connector',
      position: { x: 600, y: 150 },
      data: {
        label: 'Email',
        connectorType: 'email',
        direction: 'output',
        config: { driver: 'smtp', host: 'smtp.example.com', port: 587 },
      },
    },
    {
      id: 'flow-report',
      type: 'flow',
      position: { x: 320, y: 120 },
      data: {
        label: 'Daily Report',
        from: { connector: 'database', operation: 'SELECT * FROM reports WHERE date = today()' },
        to: { connector: 'email', target: 'send' },
        when: '0 9 * * *',
        transform: {
          fields: {
            subject: '"Daily Report - " + now()',
            body: '"Report data: " + string(output)',
          },
        },
      },
    },
  ],
  edges: [
    { id: 'e-db-report', source: 'connector-db', target: 'flow-report' },
    { id: 'e-report-email', source: 'flow-report', target: 'connector-email' },
  ],
}

const sagaWorkflow: ProjectTemplate = {
  id: 'saga-workflow',
  name: 'Order Saga',
  description: 'Distributed transaction saga with inventory reservation, payment, and shipping',
  category: 'enterprise',
  nodes: [
    {
      id: 'connector-api',
      type: 'connector',
      position: { x: 100, y: 200 },
      data: {
        label: 'API',
        connectorType: 'rest',
        direction: 'input',
        config: { port: 3000 },
        operations: [{ id: '1', method: 'POST', path: '/orders' }],
      },
    },
    {
      id: 'connector-inventory',
      type: 'connector',
      position: { x: 600, y: 50 },
      data: {
        label: 'Inventory API',
        connectorType: 'http',
        direction: 'output',
        config: { baseUrl: 'http://inventory:3001' },
      },
    },
    {
      id: 'connector-payment',
      type: 'connector',
      position: { x: 600, y: 200 },
      data: {
        label: 'Payment API',
        connectorType: 'http',
        direction: 'output',
        config: { baseUrl: 'http://payment:3002' },
      },
    },
    {
      id: 'connector-shipping',
      type: 'connector',
      position: { x: 600, y: 350 },
      data: {
        label: 'Shipping API',
        connectorType: 'http',
        direction: 'output',
        config: { baseUrl: 'http://shipping:3003' },
      },
    },
    {
      id: 'saga-order',
      type: 'saga',
      position: { x: 300, y: 130 },
      data: {
        label: 'Create Order',
        from: { connector: 'api', operation: 'POST /orders' },
        steps: [
          {
            name: 'reserve_inventory',
            action: { connector: 'inventory_api', operation: 'POST /reserve' },
            compensate: { connector: 'inventory_api', operation: 'POST /release' },
          },
          {
            name: 'charge_payment',
            action: { connector: 'payment_api', operation: 'POST /charge' },
            compensate: { connector: 'payment_api', operation: 'POST /refund' },
          },
          {
            name: 'create_shipment',
            action: { connector: 'shipping_api', operation: 'POST /shipments' },
            compensate: { connector: 'shipping_api', operation: 'DELETE /shipments/${step.id}' },
          },
        ],
        timeout: '30s',
      },
    },
  ],
  edges: [
    { id: 'e-api-saga', source: 'connector-api', target: 'saga-order' },
    { id: 'e-saga-inv', source: 'saga-order', target: 'connector-inventory' },
    { id: 'e-saga-pay', source: 'saga-order', target: 'connector-payment' },
    { id: 'e-saga-ship', source: 'saga-order', target: 'connector-shipping' },
  ],
}

const graphqlApi: ProjectTemplate = {
  id: 'graphql-api',
  name: 'GraphQL + Database',
  description: 'GraphQL API server with database backend',
  category: 'basic',
  nodes: [
    {
      id: 'connector-gql',
      type: 'connector',
      position: { x: 100, y: 150 },
      data: {
        label: 'GraphQL',
        connectorType: 'graphql',
        direction: 'input',
        config: { port: 4000, playground: true },
      },
    },
    {
      id: 'connector-db',
      type: 'connector',
      position: { x: 600, y: 150 },
      data: {
        label: 'Database',
        connectorType: 'database',
        direction: 'output',
        config: { driver: 'postgres', host: 'localhost', port: 5432, database: 'app' },
      },
    },
    {
      id: 'flow-query',
      type: 'flow',
      position: { x: 320, y: 80 },
      data: {
        label: 'Get Users',
        from: { connector: 'graphql', operation: 'query users' },
        to: { connector: 'database', target: 'users' },
      },
    },
    {
      id: 'flow-mutation',
      type: 'flow',
      position: { x: 320, y: 210 },
      data: {
        label: 'Create User',
        from: { connector: 'graphql', operation: 'mutation createUser' },
        to: { connector: 'database', target: 'users' },
        transform: {
          fields: {
            id: 'uuid()',
            created_at: 'now()',
          },
        },
      },
    },
  ],
  edges: [
    { id: 'e-gql-query', source: 'connector-gql', target: 'flow-query' },
    { id: 'e-query-db', source: 'flow-query', target: 'connector-db' },
    { id: 'e-gql-mut', source: 'connector-gql', target: 'flow-mutation' },
    { id: 'e-mut-db', source: 'flow-mutation', target: 'connector-db' },
  ],
}

export const templates: ProjectTemplate[] = [
  restDbCrud,
  graphqlApi,
  scheduledJob,
  eventProcessing,
  realtimeChat,
  sagaWorkflow,
]

export function getTemplatesByCategory(): Record<string, ProjectTemplate[]> {
  return templates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {} as Record<string, ProjectTemplate[]>)
}

export const categoryLabels: Record<string, string> = {
  basic: 'Basic',
  messaging: 'Messaging',
  realtime: 'Real-time',
  enterprise: 'Enterprise',
}
