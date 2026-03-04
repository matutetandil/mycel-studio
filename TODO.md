# Mycel Studio - Feature Backlog

Complete list of features needed to fully support Mycel HCL configuration visually.
Cross-referenced against Mycel runtime v1.1.0.

---

## Core Integration Patterns (MUST SUPPORT)

Based on `integration-patterns.md` and real-world examples, these are the patterns Mycel Studio MUST visualize and generate:

### Pattern 1: REST API → Database (CRUD)
```
[REST Server] → [Flow: GET /users] → [Database]
[REST Server] → [Flow: POST /users] → [Database]
[REST Server] → [Flow: PUT /users/:id] → [Database]
[REST Server] → [Flow: DELETE /users/:id] → [Database]
```

### Pattern 2: GraphQL API → Database
```
[GraphQL Server] → [Flow: Query.users] → [Database]
[GraphQL Server] → [Flow: Mutation.createUser] → [Database]
[GraphQL Server] → [Flow: Subscription.orderCreated] → [Client push]
```

### Pattern 3: REST → Message Queue (Event Publishing)
```
[REST Server] → [Flow: POST /orders] → [RabbitMQ Publisher]
```
- Fire-and-forget pattern
- Returns 202 Accepted immediately
- Message queued for async processing

### Pattern 4: Message Queue → REST (Event Processing)
```
[RabbitMQ Consumer] → [Flow: process_order] → [External REST API]
```
- Consume from queue
- Call external API
- With retry, DLQ, circuit breaker

### Pattern 5: Message Queue → Database
```
[RabbitMQ Consumer] → [Flow: store_event] → [Database]
```

### Pattern 6: Message Queue → GraphQL
```
[RabbitMQ Consumer] → [Flow: update_inventory] → [GraphQL Client]
```

### Pattern 7: Message Queue → Exec (Scripts)
```
[RabbitMQ Consumer] → [Flow: process_image] → [Exec]
```
- Run scripts/commands based on queue messages
- PDF generation, image processing, etc.

### Pattern 8: REST → GraphQL Passthrough
```
[REST Server] → [Flow + Steps] → [GraphQL Client]
```

### Pattern 9: GraphQL → REST Passthrough
```
[GraphQL Server] → [Flow + Steps] → [REST Client]
```

### Pattern 10: Scheduled Jobs
```
[Cron: "0 3 * * *"] → [Flow: daily_cleanup] → [Database]
[Interval: "@every 5m"] → [Flow: health_check] → [External API]
```

### Pattern 11: File Processing
```
[File Watcher] → [Flow: import_csv] → [RabbitMQ Publisher]
[S3] → [Flow: process_upload] → [Database]
```

### Pattern 12: Real-time Push
```
[Database CDC] → [Flow: stream_changes] → [WebSocket/SSE]
[REST Server] → [Flow: POST /message] → [WebSocket room]
```

### Pattern 13: Batch Processing
```
[Database (source)] → [Batch: chunk_size=100] → [Database (target)]
[Database (source)] → [Batch: chunk_size=50] → [Elasticsearch]
```

### Pattern 14: Distributed Transactions (Saga)
```
[REST Server] → [Saga: create_order] → [Inventory API] → [Payment API] → [Shipping API]
                                         ↓ (on failure, reverse compensation)
```

### Pattern 15: Entity Lifecycle (State Machine)
```
[REST Server] → [State Machine: order_status] → [Database]
                  pending → approved → shipped (final)
                  pending → cancelled (final)
```

---

## Connector Classification

### Input Connectors (Sources) - Right handle only
Trigger flows when events arrive.

| Type | Operations |
|------|------------|
| REST (server) | `GET /path`, `POST /path`, etc. |
| GraphQL (server) | `Query.field`, `Mutation.field`, `Subscription.field` |
| gRPC (server) | `Service.Method` |
| TCP (server) | Connection events |
| Queue (consumer) | `queue_name`, `routing.key.*` |
| File (watcher) | `path/*.csv`, `glob` patterns |
| CDC | `table_name`, `schema.table`, `*` wildcard |
| Scheduled | `when = "cron"`, `when = "@every"` |
| OAuth | Social login callback (google, github, apple, oidc, custom) |
| GraphQL Subscription (client) | Subscribe to external GraphQL events |

### Output Connectors (Targets) - Left handle only
Destinations where flows write data.

| Type | Targets |
|------|---------|
| Database | `table_name`, `INSERT`, `UPDATE`, `DELETE`, raw SQL |
| REST (client) | `GET /path`, `POST /path`, etc. |
| GraphQL (client) | GraphQL query/mutation |
| gRPC (client) | `Service.Method` |
| TCP (client) | Send data |
| Queue (publisher) | `exchange`, `routing_key`, `topic` |
| File (writer) | `path/file.json`, `path/file.xlsx` |
| S3 | `key`, `bucket` |
| Exec | `command`, `args` |
| Cache | `set key` |
| WebSocket | Push to room, broadcast, per-user |
| SSE | Push to room, broadcast, per-user |
| Elasticsearch | `index`, `update`, `delete`, `bulk` |
| Email | SMTP, SendGrid, SES |
| Slack | Webhook or API |
| Discord | Webhook |
| SMS | Twilio |
| Push | FCM, APNS |
| Webhook | HTTP callback |

### Bidirectional Connectors
Can be either input or output depending on configuration.

| Type | As Input | As Output |
|------|----------|-----------|
| Database | SELECT queries | INSERT/UPDATE/DELETE |
| Cache | Read-through | Write-through |
| WebSocket | Receive messages | Push to clients |
| Elasticsearch | Search/aggregate | Index/update |

---

## Flow Block Configuration

### Required Blocks
```hcl
flow "name" {
  from { connector = "input", operation = "..." }  # REQUIRED
  to   { connector = "output", target = "..." }    # REQUIRED (usually)
}
```

### Optional Blocks

#### Step (Intermediate data fetching — replaces legacy `enrich`)
```hcl
step "customer" {
  connector = "customers_db"
  query     = "SELECT * FROM customers WHERE id = ?"
  params    = { id = "input.customer_id" }
  timeout   = "5s"
  on_error  = "default"
  default   = { name = "Unknown" }
}
```
Visual: Dashed line to external connector, badge showing step count

#### Transform (CEL expressions)
```hcl
transform {
  id         = "uuid()"
  email      = "lower(input.email)"
  created_at = "now()"
}
```
Visual: Badge inside flow node showing field count

#### Cache
```hcl
cache {
  storage = "connector.cache"
  key     = "'user:' + input.id"
  ttl     = "5m"
}
```
Visual: Cache icon on flow node

#### Validate
```hcl
input_type  = type.user
output_type = type.user
```
Visual: Validation badge

#### Lock (Mutex)
```hcl
lock {
  key     = "'order:' + input.order_id"
  storage = "connector.redis"
  timeout = "30s"
  on_fail = "wait"
}
```
Visual: Lock icon

#### Semaphore (Concurrency limit)
```hcl
semaphore {
  key     = "external_api"
  permits = 5
  storage = "connector.redis"
}
```
Visual: Semaphore icon

#### Response (HTTP response)
```hcl
response {
  status = 202
  body   = { message = "Order received", order_id = "${output.id}" }
}
```
Visual: Response configuration in properties

#### Error Handling
```hcl
error_handling {
  retry {
    attempts  = 3
    delay     = "1s"
    max_delay = "30s"
    backoff   = "exponential"
  }

  fallback {
    connector     = "rabbit_dlq"
    target        = "orders.failed"
    include_error = true
  }

  error_response {
    status = 422
    body {
      code    = "'VALIDATION_ERROR'"
      message = "error.message"
    }
  }
}
```
Visual: Error config indicator (retry badge, DLQ indicator)

#### Dedupe (Deduplication)
```hcl
dedupe {
  key          = "input.message_id"
  storage      = "connector.redis"
  ttl          = "1h"
  on_duplicate = "skip"
}
```
Visual: Dedupe badge

#### Batch Processing
```hcl
batch {
  source     = "old_db"
  query      = "SELECT * FROM users"
  chunk_size = 100
  on_error   = "continue"

  to {
    connector = "new_db"
    target    = "users"
  }
}
```
Visual: Batch icon with chunk size indicator

---

## Visual Elements Mapping

| HCL Concept | Visual Element | Handle |
|-------------|----------------|--------|
| REST Server | Node (API icon) | Right only |
| REST Client | Node (API arrow icon) | Left only |
| GraphQL Server | Node (GraphQL icon) | Right only |
| GraphQL Client | Node (GraphQL arrow icon) | Left only |
| Database | Node (Cylinder) | Both |
| Queue Consumer | Node (Queue + Arrow in) | Right only |
| Queue Publisher | Node (Queue + Arrow out) | Left only |
| Cache | Node (Lightning) | Both |
| File Input | Node (Folder in) | Right only |
| File Output | Node (Folder out) | Left only |
| S3 | Node (Cloud) | Both |
| Exec | Node (Terminal) | Left only |
| gRPC Server | Node (gRPC icon) | Right only |
| gRPC Client | Node (gRPC arrow icon) | Left only |
| TCP Server | Node (Socket icon) | Right only |
| TCP Client | Node (Socket arrow icon) | Left only |
| WebSocket | Node (WS icon) | Both |
| SSE | Node (SSE icon) | Left only |
| CDC | Node (Stream icon) | Right only |
| Elasticsearch | Node (Search icon) | Both |
| OAuth | Node (Login icon) | Right only |
| Email | Node (Mail icon) | Left only |
| Slack | Node (Slack icon) | Left only |
| Discord | Node (Discord icon) | Left only |
| SMS | Node (Phone icon) | Left only |
| Push | Node (Bell icon) | Left only |
| Webhook | Node (Hook icon) | Left only |
| Flow | Rectangle | Input left, Output right |
| Saga | Rectangle (multi-step) | Input left, Output right |
| State Machine | Diagram (circles + arrows) | N/A |
| Scheduled Trigger | Clock icon on Flow | N/A |
| Transform | Badge inside Flow | N/A |
| Cache | Cache icon on Flow | N/A |
| Lock/Semaphore | Lock icon on Flow | N/A |
| Step | Dashed line to connector | N/A |

---

## Connector Configuration

### REST Server
```hcl
connector "api" {
  type = "rest"
  mode = "server"
  port = 8080

  cors { origins = ["*"] }
  rate_limit { requests = 100, window = "1m" }
  auth { type = "jwt", ... }
}
```
Properties panel: port, cors, rate_limit, auth, tls

### REST Client
```hcl
connector "external" {
  type     = "http"
  base_url = env("API_URL")
  timeout  = "10s"

  auth { type = "bearer", token = env("TOKEN") }
  retry { attempts = 3 }
}
```
Properties panel: base_url, timeout, auth, retry, headers

### Database
```hcl
connector "db" {
  type     = "database"
  driver   = "postgres"  # postgres, mysql, sqlite, mongodb

  host     = env("DB_HOST")
  port     = 5432
  database = env("DB_NAME")
  username = env("DB_USER")
  password = env("DB_PASS")

  pool { max_open = 25 }
  ssl  { mode = "require" }
}
```

### Queue (RabbitMQ)
```hcl
connector "rabbit" {
  type   = "queue"
  driver = "rabbitmq"

  url = env("RABBITMQ_URL")

  consumer {
    queue = "orders"
    dlq {
      enabled     = true
      max_retries = 3
      retry_delay = "5s"
    }
  }
}
```

### Queue (Kafka)
```hcl
connector "kafka" {
  type   = "queue"
  driver = "kafka"

  brokers = [env("KAFKA_BROKER")]
  auth { mechanism = "SASL_PLAIN", ... }
}
```

### Cache
```hcl
connector "cache" {
  type   = "cache"
  driver = "redis"  # or "memory"

  host   = env("REDIS_HOST")
  port   = 6379
  prefix = "mycel:"
}
```

### GraphQL
```hcl
connector "graphql" {
  type = "graphql"
  mode = "server"  # or "client"
  port = 4000
  endpoint   = "/graphql"
  playground = true
}
```

### WebSocket
```hcl
connector "ws" {
  type = "websocket"
  port = 8081
  path = "/ws"
}
```

### SSE
```hcl
connector "sse" {
  type      = "sse"
  port      = 8082
  path      = "/events"
  heartbeat = "30s"
}
```

### CDC
```hcl
connector "changes" {
  type   = "cdc"
  driver = "postgres"
  dsn    = env("DB_URL")
  tables = ["orders", "users"]
  slot   = "mycel_slot"
}
```

### Elasticsearch
```hcl
connector "search" {
  type = "elasticsearch"
  url  = env("ES_URL")
  auth {
    username = env("ES_USER")
    password = env("ES_PASS")
  }
}
```

### OAuth
```hcl
connector "social_login" {
  type          = "oauth"
  provider      = "google"
  client_id     = env("GOOGLE_CLIENT_ID")
  client_secret = env("GOOGLE_CLIENT_SECRET")
  scopes        = ["email", "profile"]
  redirect_url  = "http://localhost:3000/auth/callback"
}
```

### Exec
```hcl
connector "exec" {
  type        = "exec"
  working_dir = "/app/scripts"
  timeout     = "60s"
  shell       = "/bin/bash"
}
```

---

## Project Structure (Nested)

```
my-project/
├── config.hcl              # service { name, version }
├── connectors/
│   ├── api.hcl             # REST server
│   ├── database.hcl        # Database
│   ├── rabbit.hcl          # Message queue
│   ├── cache.hcl           # Cache
│   ├── websocket.hcl       # WebSocket
│   └── search.hcl          # Elasticsearch
├── flows/
│   ├── users.hcl           # User flows
│   ├── orders.hcl          # Order flows
│   └── events.hcl          # Event processing flows
├── types/
│   └── schemas.hcl         # Type definitions
├── transforms/
│   └── common.hcl          # Reusable transforms
├── aspects/
│   └── logging.hcl         # Cross-cutting concerns
├── sagas/
│   └── create_order.hcl    # Distributed transactions
├── state_machines/
│   └── order_status.hcl    # Entity lifecycle
└── .mycel-studio.json      # Studio metadata
```

---

## Implementation Priority

### Phase 1: Connector Input/Output ✅
1. [x] Add `mode` property to connectors (input/output/bidirectional)
2. [x] Update ConnectorNode to show/hide handles based on mode
3. [x] Update Palette to set default mode per connector type
4. [ ] Update Flow Properties to show context-aware options

### Phase 2: Complete Flow Configuration ✅
5. [x] Transform editor (CEL expressions)
6. [x] Cache configuration UI
7. [x] Enrich block UI (connect to external service)
8. [x] Lock/Semaphore configuration
9. [ ] Response block for REST flows
10. [x] Error handling configuration

### Phase 3: Fix Foundations
11. [ ] Step blocks (replace enrich, with on_error/timeout/when)
12. [ ] Filter in `from`
13. [ ] Multi-connector `to`
14. [ ] Error handling: fallback + error_response blocks
15. [ ] Dedupe configuration
16. [ ] Remove phantom features (foreach, after)

### Phase 4: Types & Validation
17. [ ] Type editor
18. [ ] Validator definitions
19. [ ] input_type/output_type on flows

### Phase 5: Reusability
20. [ ] Named transforms
21. [ ] Aspects (before/after/around/on_error)
22. [ ] Named operations

### Phase 6: Missing Connectors
23. [ ] Notifications (email, slack, discord, sms, push, webhook)
24. [ ] Real-time (websocket, cdc, sse)
25. [ ] Specialized (elasticsearch, oauth)
26. [ ] Connector profiles

### Phase 7: Enterprise Features
27. [ ] Batch processing
28. [ ] Sagas (distributed transactions)
29. [ ] State machines (entity lifecycle)
30. [ ] Auth system configuration
31. [ ] Environment variables
32. [ ] Mocks

### Phase 8: Polish
33. [ ] Templates gallery (common patterns)
34. [ ] Undo/redo
35. [ ] Copy/paste
36. [ ] Keyboard shortcuts
37. [ ] Auto-save

---

## Key Insights from Mycel Runtime

1. **Flow syntax uses attribute-based from/to:**
   ```hcl
   from { connector = "api", operation = "GET /users" }
   to   { connector = "db", target = "users" }
   ```

2. **Steps replace enrich (Phase 7+):**
   ```hcl
   step "pricing" {
     connector = "pricing_api"
     operation = "GET /prices/${input.product_id}"
     timeout   = "5s"
     on_error  = "skip"
   }
   ```
   Results accessed as `step.pricing.*` (not `enriched.pricing.*`)

3. **Error handling has three blocks (v1.1.0):**
   ```hcl
   error_handling {
     retry { ... }            # Automatic retries with backoff
     fallback { ... }         # DLQ when retries exhausted
     error_response { ... }   # Custom HTTP error format
   }
   ```

4. **Aspects handle cross-cutting concerns:**
   ```hcl
   aspect "name" {
     when = "on_error"        # before | after | around | on_error
     on   = ["flows/**/*.hcl"]
     action { ... }
   }
   ```

5. **Context variables available in transforms:**
   - `input` — Request/message data
   - `step.<name>` — Step results (Phase 7+)
   - `error.message` — Error message (in on_error aspects and error_response)
   - `_flow`, `_operation`, `_target` — Flow metadata

6. **Array processing uses CEL functions (no foreach):**
   `map`, `filter`, `sort_by`, `first`, `last`, `unique`, `pluck`, `sum`, `avg`

7. **File connector supports Excel (.xlsx):**
   Auto-detect format from extension. Sheet selection via `params = { sheet = "Name" }`.

8. **Full error handling reference:** See `docs/ERROR_HANDLING.md` in the Mycel runtime.
