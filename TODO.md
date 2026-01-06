# Mycel Studio - Feature Backlog

Complete list of features needed to fully support Mycel HCL configuration visually.

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
[REST Server] → [Flow + Enrich] → [GraphQL Client]
```

### Pattern 9: GraphQL → REST Passthrough
```
[GraphQL Server] → [Flow + Enrich] → [REST Client]
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

---

## Connector Classification

### Input Connectors (Sources) - Right handle only
Trigger flows when events arrive.

| Type | Operations |
|------|------------|
| REST (server) | `GET /path`, `POST /path`, etc. |
| GraphQL (server) | `Query.field`, `Mutation.field` |
| gRPC (server) | `Service.Method` |
| TCP (server) | Connection events |
| Queue (consumer) | `queue_name`, `routing.key.*` |
| File (watcher) | `path/*.csv`, `glob` patterns |
| Scheduled | `when = "cron"`, `when = "@every"` |

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
| File (writer) | `path/file.json` |
| S3 | `key`, `bucket` |
| Exec | `command`, `args` |
| Cache | `set key` |
| Email/SMS | Notifications |

### Bidirectional Connectors
Can be either input or output depending on configuration.

| Type | As Input | As Output |
|------|----------|-----------|
| Database | SELECT queries | INSERT/UPDATE/DELETE |
| Cache | Read-through | Write-through |

---

## Flow Block Configuration

### Required Blocks
```hcl
flow "name" {
  from { connector.input = "operation" }  # REQUIRED
  to { connector.output = "target" }      # REQUIRED (usually)
}
```

### Optional Blocks

#### Transform (CEL expressions)
```hcl
transform {
  output.id = "uuid()"
  output.email = "lower(input.email)"
  output.created_at = "now()"
}
```
Visual: Badge inside flow node showing field count

#### Enrich (External data)
```hcl
enrich "pricing" {
  connector = "pricing_service"
  operation = "getPrice"
  params {
    product_id = "input.id"
  }
}
```
Visual: Dashed line to external connector

#### Cache
```hcl
cache {
  storage = "connector.cache"
  key = "'user:' + input.id"
  ttl = "5m"
}
```
Visual: Cache icon on flow node

#### Validate
```hcl
input_type = type.user
output_type = type.user
```
Visual: Validation badge

#### Lock (Mutex)
```hcl
lock {
  key = "'order:' + input.order_id"
  storage = "connector.redis"
  timeout = "30s"
  on_fail = "wait"
}
```
Visual: Lock icon

#### Semaphore (Concurrency limit)
```hcl
semaphore {
  key = "external_api"
  permits = 5
  storage = "connector.redis"
}
```
Visual: Semaphore icon

#### Response (HTTP response)
```hcl
response {
  status = 202
  body = {
    message = "Order received"
    order_id = "${output.order_id}"
  }
}
```
Visual: Response configuration in properties

#### After (Post-processing)
```hcl
after {
  invalidate {
    storage = "memory_cache"
    patterns = ["products:*"]
  }
}
```
Visual: Post-action indicator

#### Foreach (Batch processing)
```hcl
foreach "event" in "input.events" {
  transform { ... }
  to { ... }
}
```
Visual: Loop indicator on flow

#### Error Handling
```hcl
error_handling {
  retry {
    attempts = 3
    backoff = "exponential"
  }
  dlq {
    queue = "failed_orders"
  }
}
```
Visual: Error config indicator

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
| Flow | Rectangle | Input left, Output right |
| Scheduled Trigger | Clock icon on Flow | N/A |
| Transform | Badge inside Flow | N/A |
| Cache | Cache icon on Flow | N/A |
| Lock/Semaphore | Lock icon on Flow | N/A |
| Enrich | Dashed line to connector | N/A |

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
  type = "rest"
  mode = "client"
  base_url = env("API_URL")

  auth { type = "bearer", token = env("TOKEN") }
  retry { attempts = 3, backoff = "exponential" }
  circuit_breaker { threshold = 5, timeout = "30s" }
}
```
Properties panel: base_url, auth, retry, circuit_breaker, headers

### Database
```hcl
connector "db" {
  type = "database"
  driver = "postgres"  # postgres, mysql, sqlite, mongodb

  host = env("DB_HOST")
  port = 5432
  database = env("DB_NAME")
  username = env("DB_USER")
  password = env("DB_PASS")

  pool { max_open = 25 }
  ssl { mode = "require" }
}
```

### Queue (RabbitMQ)
```hcl
connector "rabbit" {
  type = "queue"
  driver = "rabbitmq"

  host = env("RABBIT_HOST")
  port = 5672
  username = env("RABBIT_USER")
  password = env("RABBIT_PASS")

  exchange { name = "events", type = "topic", durable = true }
}
```

### Queue (Kafka)
```hcl
connector "kafka" {
  type = "queue"
  driver = "kafka"

  brokers = [env("KAFKA_BROKER")]
  auth { mechanism = "SASL_PLAIN", ... }
}
```

### Cache
```hcl
connector "cache" {
  type = "cache"
  driver = "redis"  # or "memory"

  host = env("REDIS_HOST")
  port = 6379
  prefix = "mycel:"
}
```

### GraphQL
```hcl
connector "graphql" {
  type = "graphql"
  mode = "server"  # or "client"

  # Server
  port = 4000
  endpoint = "/graphql"
  playground = true
  schema { path = "./schema.graphql" }

  # Client
  endpoint = env("GRAPHQL_URL")
  auth { type = "bearer", ... }
}
```

### Exec
```hcl
connector "exec" {
  type = "exec"
  working_dir = "/app/scripts"
  timeout = "60s"
  shell = "/bin/bash"
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
│   └── cache.hcl           # Cache
├── flows/
│   ├── users.hcl           # User flows
│   ├── orders.hcl          # Order flows
│   └── events.hcl          # Event processing flows
├── types/
│   └── schemas.hcl         # Type definitions
├── transforms/
│   └── common.hcl          # Reusable transforms
├── caches/
│   └── named.hcl           # Named cache configs
└── .mycel-studio.json      # Studio metadata
```

---

## Implementation Priority

### Phase 1: Connector Input/Output ✅ (Current Focus)
1. [x] Add `mode` property to connectors (input/output/bidirectional)
2. [ ] Update ConnectorNode to show/hide handles based on mode
3. [ ] Update Palette to set default mode per connector type
4. [ ] Update Flow Properties to show context-aware options

### Phase 2: Complete Flow Configuration
5. [ ] Transform editor (CEL expressions)
6. [ ] Cache configuration UI
7. [ ] Enrich block UI (connect to external service)
8. [ ] Lock/Semaphore configuration
9. [ ] Response block for REST flows
10. [ ] Error handling configuration

### Phase 3: Advanced Patterns
11. [ ] Scheduled flows (when = cron/interval)
12. [ ] Foreach loops for batch processing
13. [ ] After blocks (cache invalidation)
14. [ ] DLQ configuration for queues

### Phase 4: Types & Validation
15. [ ] Type nodes on canvas
16. [ ] Validator definitions
17. [ ] input_type/output_type on flows

### Phase 5: Reusability
18. [ ] Named transforms
19. [ ] Named cache configurations
20. [ ] Aspects (AOP)

### Phase 6: Advanced
21. [ ] WASM functions
22. [ ] Plugins
23. [ ] Full auth system configuration

### Phase 7: Polish
24. [ ] Templates gallery (common patterns)
25. [ ] Undo/redo
26. [ ] Copy/paste
27. [ ] Keyboard shortcuts
28. [ ] Auto-save

---

## Key Insights from Examples

1. **Connector syntax in flows uses dot notation:**
   ```hcl
   from { connector.api = "GET /users" }
   to { connector.db = "users" }
   ```

2. **Complex connector configs use block syntax:**
   ```hcl
   from {
     connector.rabbit = {
       queue = "orders"
       durable = true
       dlq { enabled = true }
     }
   }
   ```

3. **Environment-specific configs:**
   ```hcl
   environment "development" { variables { ... } }
   environment "production" { variables { ... } }
   ```

4. **Transform uses output. prefix:**
   ```hcl
   transform {
     output.id = "uuid()"
     output.email = "lower(input.email)"
   }
   ```

5. **Enrich data is accessed via enriched. prefix:**
   ```hcl
   transform {
     price = "enriched.pricing.price"
   }
   ```

6. **Context variables available:**
   - `input` - Request/message data
   - `output` - Transform output
   - `enriched` - Enriched data
   - `context` - Request context (user, request_id, etc.)
   - `flow` - Flow metadata (name, operation)
