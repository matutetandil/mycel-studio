# Mycel Studio - Feature Backlog

Complete list of features needed to fully support Mycel HCL configuration visually.

---

## Mycel Core Concepts

Based on [CONCEPTS.md](/Users/matute/Documents/Personal/MYCEL/docs/CONCEPTS.md):

| Concept | Description | Visual Element |
|---------|-------------|----------------|
| **Service** | Main service config (name, version) | Settings panel |
| **Connector** | Adapter to external systems (REST, DB, MQ, etc.) | Node with icon |
| **Flow** | Unit of work: from → transform → to | Rectangle with handles |
| **Transform** | CEL expressions to map data | Badge inside flow |
| **Type** | Schema validation (fields, types, formats) | Schema node |
| **Validator** | Custom validation rules (regex, CEL, WASM) | Inside type definition |
| **Aspect** | AOP cross-cutting concerns (before/after/around) | Special node or global config |
| **Auth** | Complete authentication system | Settings panel |
| **Sync** | Lock, Semaphore, Coordinate primitives | Icon on flow |
| **Functions** | WASM functions for CEL expressions | Library panel |
| **Plugin** | Extensions for new connector types | Plugin manager |

---

## Project Structure

Mycel projects can be organized in two ways:

### Flat Structure
```
my-project/
├── config.hcl          # service { name, version }
├── connectors.hcl      # connector "api" { ... }, connector "db" { ... }
├── flows.hcl           # flow "get_users" { ... }, flow "create_user" { ... }
├── types.hcl           # type "user" { ... }
├── transforms.hcl      # transform "normalize_user" { ... }
├── validators.hcl      # validator "email" { ... }
├── aspects.hcl         # aspect "audit_log" { ... }
└── .mycel-studio.json  # Studio metadata (positions, zoom, UI state)
```

### Nested Structure
```
my-project/
├── config.hcl
├── connectors/
│   ├── api.hcl
│   ├── database.hcl
│   └── cache.hcl
├── flows/
│   ├── users.hcl
│   └── products.hcl
├── types/
│   └── user.hcl
├── transforms/
├── validators/
├── aspects/
└── .mycel-studio.json
```

---

## Architecture Changes

### Project Management
- [ ] **Open Project**: Select a folder containing HCL files
- [ ] **Parse HCL → Canvas**: Read existing `.hcl` files and render as nodes
- [ ] **Project metadata file**: `.mycel-studio.json` storing:
  - Node positions (x, y)
  - Canvas zoom/pan state
  - UI preferences (expanded panels, etc.)
  - Last opened file
- [ ] **Save Project**: Write changes back to HCL files + update metadata
- [ ] **Auto-save**: Optional, configurable interval
- [ ] **Recent Projects**: Quick access list
- [ ] **Support both structures**: Flat and nested file organization

### New UI Layout (IDE-style) ✅ DONE
```
┌─────────────────────────────────────────────────────────────┐
│  Menu Bar (File, Edit, View, Help)                     [✅] │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│  File Tree   │      Canvas (React Flow)    │  Properties   │
│  [✅]        │      [✅]                    │  Panel [✅]   │
│              │                              │               │
│ ──────────── │                              │               │
│              │                              │               │
│  Components  │                              │               │
│  (Palette)   │                              │               │
│  [✅]        │                              │               │
│              ├──────────────────────────────┤               │
│              │   HCL Editor (Monaco) [✅]   │               │
│              │   - Tabs per file            │               │
│              │   - Syntax highlighting      │               │
└──────────────┴──────────────────────────────┴───────────────┘
```

### HCL Editor (Full)
- [x] Monaco editor with tabs
- [x] Line numbers
- [ ] **Bi-directional sync**: Edit in canvas → updates HCL, edit HCL → updates canvas
- [ ] Error highlighting with line markers
- [ ] Auto-completion for Mycel keywords
- [ ] Format/beautify button
- [ ] Find & replace
- [ ] Go to definition (click connector name → jump to definition)

### Git Integration (Basic)
- [ ] **File status indicators** in file tree:
  - 🟢 Unmodified (clean)
  - 🟡 Modified (M)
  - 🟢+ New/Untracked (U)
  - 🔴 Deleted (D)
  - ⚫ Ignored
- [ ] **Inline diff in editor**: Gutter markers
- [ ] **Git Blame / Annotate**
- [ ] **Status bar**: Current branch name

---

## Service Configuration

```hcl
service {
  name    = "my-service"
  version = "1.0.0"
}
```

- [ ] Service block: `name`, `version`
- [ ] Rate limiting configuration (when applicable)

---

## Connectors (Complete Support)

### REST Connector
```hcl
# Server mode (exposes endpoints)
connector "api" {
  type = "rest"
  port = 8080
  cors { origins = ["*"], methods = ["GET", "POST"] }
  rate_limit { requests = 100, window = "1m" }
}

# Client mode (calls external APIs)
connector "external" {
  type = "rest"
  base_url = "https://api.example.com"
  timeout = "30s"
  auth { type = "bearer", token = env("API_TOKEN") }
  retry { attempts = 3, backoff = "exponential" }
  circuit_breaker { threshold = 5, timeout = "30s" }
}
```

Properties panel for REST:
- [ ] Mode toggle: Server/Client
- **Server**: port, host, cors block, tls block, rate_limit block, auth block
- **Client**: base_url, timeout, auth block, headers block, retry block, circuit_breaker block

### Database Connectors
```hcl
connector "db" {
  type     = "database"
  driver   = "postgres"  # postgres, mysql, sqlite, mongodb
  host     = env("DB_HOST")
  port     = 5432
  database = env("DB_NAME")
  username = env("DB_USER")
  password = env("DB_PASS")
  pool { max_open = 25, max_idle = 5 }
  ssl { mode = "require" }
}
```

Driver-specific fields:
- [ ] **SQLite**: `database` (path only)
- [ ] **PostgreSQL**: host, port, database, username, password, schema, pool, ssl
- [ ] **MySQL**: host, port, database, username, password, charset, pool
- [ ] **MongoDB**: uri OR (host, port, database, username, password), auth_source, replica_set, pool, tls

### Message Queue Connectors
```hcl
# RabbitMQ
connector "rabbit" {
  type = "queue"
  driver = "rabbitmq"
  host = env("RABBIT_HOST")
  port = 5672
  username = env("RABBIT_USER")
  password = env("RABBIT_PASS")
  vhost = "/"
  exchange { name = "myapp", type = "topic", durable = true }
  prefetch = 10
}

# Kafka
connector "kafka" {
  type = "queue"
  driver = "kafka"
  brokers = [env("KAFKA_BROKER")]
  auth { mechanism = "SASL_PLAIN", username = "...", password = "..." }
}
```

- [ ] **RabbitMQ**: host, port, username, password, vhost, exchange block, prefetch, reconnect block
- [ ] **Kafka**: brokers array, auth block (SASL), tls block, schema_registry block

### Cache Connectors
```hcl
# Memory
connector "cache" {
  type = "cache"
  driver = "memory"
  max_size = "100MB"
  ttl = "10m"
}

# Redis
connector "cache" {
  type = "cache"
  driver = "redis"
  host = env("REDIS_HOST")
  port = 6379
  password = env("REDIS_PASS")
  db = 0
  prefix = "mycel:"
}
```

- [ ] **Memory**: max_size, max_items, ttl, eviction
- [ ] **Redis**: host, port, password, db, prefix, cluster block, sentinel block

### gRPC Connector
```hcl
connector "grpc" {
  type = "grpc"
  mode = "server"  # or "client"
  port = 50051
  proto { path = "./protos", files = ["service.proto"] }
  tls { cert = "...", key = "..." }
  reflection = true
}
```

- [ ] **Server**: port, proto block, tls block, reflection, health_check
- [ ] **Client**: address, proto block, tls block, timeout, retry block, load_balancing

### TCP Connector
```hcl
connector "tcp" {
  type = "tcp"
  mode = "server"
  port = 9000
  protocol = "json"  # json, msgpack, line, length_prefixed
}
```

- [ ] **Server**: port, host, protocol, tls block, max_connections
- [ ] **Client**: host, port, protocol, tls block, pool block

### File Connectors
```hcl
# Local files
connector "files" {
  type = "file"
  base_path = "/data"
}

# S3
connector "s3" {
  type = "s3"
  bucket = env("S3_BUCKET")
  region = "us-east-1"
  access_key = env("AWS_ACCESS_KEY")
  secret_key = env("AWS_SECRET_KEY")
}
```

- [ ] **Local**: base_path, file_mode, dir_mode
- [ ] **S3**: bucket, region, access_key, secret_key, endpoint, force_path_style, prefix

### GraphQL Connector
```hcl
connector "graphql" {
  type = "graphql"
  mode = "server"
  port = 8080
  path = "/graphql"
  schema = "..."  # or schema_file
  playground = true
}
```

- [ ] **Server**: port, path, schema/schema_file, playground, introspection, auth block
- [ ] **Client**: endpoint, auth block, headers block, timeout

### Exec Connector
```hcl
connector "exec" {
  type = "exec"
  working_dir = "/app/scripts"
  timeout = "60s"
  shell = "/bin/bash"
}
```

- [ ] command, args, timeout, working_dir, env block
- [ ] SSH mode: ssh block (host, port, user, key_file)

---

## Flows

Flow is the core unit of work in Mycel:

```hcl
flow "create_user" {
  # Trigger
  from {
    connector = "api"
    operation = "POST /users"
  }

  # Optional: Validate input
  validate {
    input = "type.user"
  }

  # Optional: Enrich with external data
  enrich "pricing" {
    connector = "pricing_service"
    operation = "getPrice"
    params { product_id = "input.id" }
  }

  # Optional: Transform data
  transform {
    id = "uuid()"
    email = "lower(input.email)"
    price = "enriched.pricing.price"
    created_at = "now()"
  }

  # Optional: Cache
  cache {
    storage = "connector.cache"
    key = "'user:' + input.id"
    ttl = "5m"
  }

  # Optional: Synchronization
  lock {
    storage = "connector.redis"
    key = "'user:' + input.id"
    timeout = "30s"
  }

  # Optional: Authorization
  require {
    roles = ["admin"]
  }

  # Destination
  to {
    connector = "db"
    target = "users"
  }

  # Optional: Error handling
  error_handling {
    retry { attempts = 3, delay = "1s", backoff = "exponential" }
  }
}

# Scheduled flow
flow "daily_cleanup" {
  when = "0 3 * * *"  # Cron expression

  from { connector = "db", query = "SELECT * FROM old_data" }
  to { connector = "db", query = "DELETE FROM old_data WHERE ..." }
}
```

### Flow Visual Elements
- [ ] **From block**: Input handle, operation picker
- [ ] **To block**: Output handle, target picker
- [ ] **Transform badge**: Shows field count, click to edit
- [ ] **Enrich indicator**: Dashed line to external connector
- [ ] **Cache icon**: When cache block present
- [ ] **Lock/Semaphore icon**: When sync primitives present
- [ ] **Clock icon**: When `when` trigger is set
- [ ] **Shield icon**: When `require` block present

### Flow Blocks
- [ ] `from { connector, operation }`
- [ ] `to { connector, target }` OR `to { connector, query }`
- [ ] `validate { input = "type.name" }`
- [ ] `transform { field = "CEL expression" }`
- [ ] `enrich "name" { connector, operation, params }`
- [ ] `cache { storage, key, ttl }`
- [ ] `lock { storage, key, timeout, wait, retry }`
- [ ] `semaphore { storage, key, max_permits, timeout, lease }`
- [ ] `coordinate { storage, wait {...}, signal {...}, preflight {...} }`
- [ ] `require { roles = [...] }`
- [ ] `error_handling { retry {...} }`
- [ ] `when = "cron expression"` or `when = "@every 5m"`

---

## Types (Validation Schemas)

```hcl
type "user" {
  id       = number
  email    = string { format = "email", required = true }
  age      = number { min = 0, max = 150 }
  role     = string { enum = ["admin", "user", "guest"] }
  metadata = object { optional = true }
}
```

- [ ] Type node on canvas
- [ ] Field definitions:
  - `string`: required, format, pattern, min_length, max_length, enum, default
  - `number`: required, min, max, integer
  - `bool`: required, default
  - `object`: nested fields
  - `array`: items, min_items, max_items
- [ ] Built-in formats: email, uuid, url, date, datetime, phone
- [ ] Reference validators: `validate = "validator.custom_rule"`

---

## Validators

```hcl
# Regex validator
validator "email" {
  type = "regex"
  pattern = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
  message = "Invalid email format"
}

# CEL validator
validator "adult" {
  type = "cel"
  expr = "value >= 18"
  message = "Must be 18 or older"
}

# WASM validator (for complex logic)
validator "custom" {
  type = "wasm"
  module = "./validators/custom.wasm"
  function = "validate"
}
```

- [ ] Validator node/panel
- [ ] Types: regex, cel, wasm
- [ ] Reference in type definitions

---

## Named Transforms

```hcl
transform "normalize_user" {
  id = "uuid()"
  email = "lower(trim(input.email))"
  created_at = "now()"
}

# Usage in flow
flow "create_user" {
  transform {
    use = [transform.normalize_user, transform.add_timestamps]
    source = "'api'"  # Override/add fields
  }
}
```

- [ ] Transform node on canvas
- [ ] CEL expression editor for each field
- [ ] Composition with `use` array
- [ ] Reusable across flows

---

## Aspects (AOP)

```hcl
aspect "audit_writes" {
  on   = ["**/create_*.hcl", "**/update_*.hcl", "**/delete_*.hcl"]
  when = "after"  # before, after, around, on_error
  if   = "result.affected > 0"  # Optional condition

  action {
    connector = "audit_db"
    target = "audit_logs"
    transform {
      flow = "_flow"
      operation = "_operation"
      timestamp = "now()"
    }
  }
}

aspect "cache_products" {
  on   = ["**/get_product*.hcl"]
  when = "around"

  cache {
    storage = "connector.cache"
    key = "'product:' + input.id"
    ttl = "10m"
  }
}
```

- [ ] Aspect configuration panel
- [ ] Pattern matching (`on` globs)
- [ ] When selector: before, after, around, on_error
- [ ] Action block with connector/transform
- [ ] Cache/invalidate blocks
- [ ] Priority ordering

---

## WASM Functions

```hcl
functions "pricing" {
  wasm = "./wasm/pricing.wasm"
  exports = ["calculate_price", "apply_discount"]
}

# Usage in transform
transform {
  price = "calculate_price(input.items)"
  discount = "apply_discount(price, input.coupon)"
}
```

- [ ] Functions panel
- [ ] WASM file selector
- [ ] Export list
- [ ] Available in CEL autocomplete

---

## Plugins

```hcl
plugin "salesforce" {
  source = "./plugins/salesforce"
  version = "1.0.0"
}

connector "sf" {
  type = "salesforce"  # From plugin
  instance_url = env("SF_URL")
  client_id = env("SF_CLIENT_ID")
}
```

- [ ] Plugin manager panel
- [ ] Load from local or registry
- [ ] Enables custom connector types

---

## Authentication System

```hcl
auth {
  preset = "standard"  # strict, standard, relaxed, development

  jwt {
    secret = env("JWT_SECRET")
    access_ttl = "15m"
    refresh_ttl = "7d"
    algorithm = "HS256"
  }

  password {
    min_length = 8
    require_upper = true
    require_number = true
  }

  mfa {
    enabled = true
    methods = ["totp", "webauthn"]
  }

  sessions {
    max_per_user = 5
    idle_timeout = "30m"
  }

  storage {
    users = "connector.db"
    sessions = "connector.redis"
  }

  endpoints {
    login = "POST /auth/login"
    logout = "POST /auth/logout"
    register = "POST /auth/register"
  }
}
```

- [ ] Auth configuration panel
- [ ] Preset selector with explanations
- [ ] JWT config
- [ ] Password policy
- [ ] MFA settings (TOTP, WebAuthn, recovery codes)
- [ ] Session management
- [ ] SSO/Social providers (Google, GitHub, Apple)
- [ ] OIDC providers (Okta, Azure, Auth0)
- [ ] Audit logging

---

## UI/UX Improvements

### Dark Mode ✅ DONE
- [x] Dark mode as default
- [x] Theme toggle in header
- [x] Persist preference

### Canvas
- [ ] Better connection routing (bezier curves)
- [ ] Connection labels
- [ ] Grouping/containers
- [ ] Snap to grid
- [ ] Alignment guides
- [ ] Copy/paste nodes
- [ ] Undo/redo

### Properties Panel
- [ ] Dynamic forms based on node type
- [ ] Nested block editors (collapsible sections)
- [ ] CEL expression editor with autocomplete
- [ ] Validation feedback
- [ ] `env()` helper for environment variables

### Palette
- [ ] Search/filter
- [ ] Recently used
- [ ] Favorites

---

## Priority Order

### Phase 1 - New Architecture & UI ✅ DONE
1. ~~New IDE-style layout~~
2. ~~Dark mode~~

### Phase 2 - Project Management & Editor
3. Project open/save with `.mycel-studio.json`
4. Multi-file HCL parsing and generation
5. Bi-directional sync (canvas ↔ HCL)
6. Git status indicators

### Phase 3 - Full Connector Support
7. All database drivers with correct fields
8. Message queue connectors (RabbitMQ, Kafka)
9. Cache connectors (Memory, Redis)
10. gRPC, GraphQL, TCP, File, S3, Exec connectors

### Phase 4 - Flow Enhancements
11. Complete flow blocks (validate, enrich, cache)
12. Synchronization primitives (lock, semaphore, coordinate)
13. When/triggers with visual cron builder
14. Error handling configuration

### Phase 5 - Schema & Validation
15. Types as visual nodes
16. Validators (regex, CEL, WASM)
17. Named transforms with composition

### Phase 6 - Advanced Features
18. Aspects (AOP) configuration
19. WASM functions
20. Plugins
21. Full auth system

### Phase 7 - Polish & UX
22. Undo/redo, copy/paste
23. Templates gallery
24. Auto-save, recent projects
25. Keyboard shortcuts
26. Auto-completion in HCL editor
