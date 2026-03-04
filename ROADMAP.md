# Mycel Studio - Roadmap

Cross-referenced against Mycel runtime v1.1.0 documentation (CONCEPTS.md, CONFIGURATION.md, ERROR_HANDLING.md, examples/).

Last updated: 2026-03-04

---

## Current State (v0.3.5)

### What Works
- 10 connector types: REST, Database, Queue, Cache, gRPC, GraphQL, TCP, File, S3, Exec
- Direction system (input/output/bidirectional)
- Flow blocks: transform, cache, lock, semaphore, enrich, error_handling, schedule (when)
- Multi-file HCL generation (config.hcl, connectors/, flows/)
- Bi-directional HCL ↔ Canvas sync
- Git integration (branch, file status)
- Dark mode IDE layout

### Inconsistencies with Mycel Runtime

These need fixing regardless of new features:

| Issue | Studio (current) | Mycel (correct) | Fix |
|-------|-----------------|-----------------|-----|
| File/S3 connector type | CLAUDE.md says `file` with `driver (local/s3)` | `file` and `s3` are separate connector types | Already correct in UI, update CLAUDE.md |
| `enrich` vs `step` | Uses `enrich` block with `enriched.*` prefix | Phase 7 uses `step` blocks with `step.*` prefix. Enrich is a legacy alias | Support both, prioritize `step` syntax |
| `foreach` block | Listed in TODO.md as planned feature | Mycel does NOT have a `foreach` block. Array processing is done with CEL functions (`map`, `filter`, etc.) | Remove from roadmap |
| `after` block | Listed in TODO.md for cache invalidation | Mycel uses `aspects` for post-processing, not an `after` block | Remove from roadmap, replace with Aspects |
| Error handling `dlq` | Uses `dlq` sub-block | Mycel uses `fallback` sub-block (connector + target + include_error) | Rename to `fallback` |
| Missing connector types | Only 10 types | Mycel has 16+ connector types (see Phase 6) | Add missing connectors |
| Named operations | Partial — operations on connectors exist | Full named operations with params and reusable queries | Align with Mycel syntax |
| Service version | Not shown/configurable | `service { name, version }` exposed in health, metrics, logs | Already in config.hcl generation, verify |

### Missing Mycel Features (by runtime phase)

| Runtime Phase | Feature | Status in Studio |
|---------------|---------|-----------------|
| Phase 7 | Step blocks, filter, multi-to, dedupe | Not implemented |
| Phase 7 | on_error (step-level: fail/skip/default) | Not implemented |
| Phase 9 | GraphQL Subscriptions + Federation v2 | Not implemented |
| Phase 10 | WebSocket, CDC, SSE connectors | Not implemented |
| Phase 11 | Elasticsearch, OAuth, Batch Processing | Not implemented |
| Phase 12 | Sagas, State Machines | Not implemented |
| v1.1.0 | On-error aspects, custom error responses | Not implemented |
| v1.1.0 | Error handling guide (docs/ERROR_HANDLING.md) | Not referenced |

---

## Phase 3 — Fix Foundations

Fix inconsistencies and complete the basics before adding new features.

### 3.1 — Step Blocks (replaces enrich)
**Priority: High** — This is Mycel's primary orchestration mechanism (Phase 7).

Steps are the correct way to call intermediate connectors. The current `enrich` block maps to the old syntax; `step` is the standard.

```hcl
step "customer" {
  connector = "customers_db"
  operation = "query"
  query     = "SELECT * FROM customers WHERE id = ?"
  params    = [input.customer_id]
  on_error  = "default"
  default   = { name = "Unknown" }
}

step "prices" {
  when      = "input.include_prices == true"
  connector = "prices_api"
  operation = "POST /calculate"
  timeout   = "5s"
  on_error  = "skip"
}
```

**UI:** List of step blocks in flow config (similar to current enrich editor). Each step has: name, connector, operation, params, optional `when` condition, `on_error` (fail/skip/default), `timeout`. Results shown as `step.<name>.*` in transform autocomplete.

**Keep `enrich` as an alias** for backward compatibility, but default new flows to `step`.

### 3.2 — Filter in `from`
**Priority: High** — Allows flows to skip events based on a CEL condition.

```hcl
from {
  connector = "rabbit"
  operation = "orders.new"
  filter    = "input.metadata.origin != 'internal'"
}
```

**UI:** Optional CEL expression field in the `from` section of flow properties.

### 3.3 — Multi-connector `to`
**Priority: Medium** — A flow can write to multiple targets (parallel or sequential).

```hcl
to {
  connector = "db"
  target    = "INSERT orders"
}

to {
  connector = "rabbit"
  operation = "PUBLISH"
  exchange  = "orders.processed"
}
```

**UI:** "Add target" button in flow properties. Each `to` block is collapsible.

### 3.4 — Response Block Editor
**Priority: Medium** — Custom HTTP responses for REST flows.

```hcl
response {
  status = 202
  body   = { message = "Order received", order_id = "${output.id}" }
}
```

**UI:** Modal editor (already has a TODO in Canvas.tsx).

### 3.5 — Error Handling Updates
**Priority: Medium** — Align with Mycel's error handling model.

Update the error handling editor to support all three sub-blocks:

```hcl
error_handling {
  retry {
    attempts  = 3
    delay     = "1s"
    max_delay = "30s"
    backoff   = "exponential"   # constant | linear | exponential
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

**UI:** Three collapsible sections: Retry (attempts, delay, max_delay, backoff), Fallback (connector, target, include_error, transform), Error Response (status, headers, body with CEL expressions).

### 3.6 — Remove `foreach` and `after` from TODO
**Priority: Low** — These don't exist in Mycel. Remove references from TODO.md.
- `foreach` → Replaced by CEL array functions (`map`, `filter`, `sort_by`, etc.)
- `after` → Replaced by Aspects (Phase 5)

---

## Phase 4 — Types & Validation

### 4.1 — Type Editor
**Priority: High** — Types are fundamental for data validation.

```hcl
type "user" {
  email = string { format = "email", required = true }
  age   = number { min = 0, max = 150 }
  role  = string { enum = ["admin", "user", "guest"] }
}
```

**UI options:**
- Dedicated tab in the left sidebar, similar to file tree. Types are referenced by flows, not connected with edges.

**Fields:** name, list of fields. Each field: name, base type (string/number/boolean/object/array), constraints (required, format, min, max, enum, optional).

### 4.2 — Validator Editor
**Priority: Medium** — Custom validation rules for type fields.

```hcl
validator "email_domain" {
  type    = "cel"
  expr    = "value.endsWith('@company.com')"
  message = "Must be a company email"
}
```

**UI:** Tab alongside types. Three validator kinds: regex (pattern field), cel (expression field), wasm (file path).

### 4.3 — Type References in Flows
**Priority: Medium** — Connect types to flows.

```hcl
flow "create_user" {
  input_type  = type.user
  output_type = type.user_response
}
```

**UI:** Dropdown selectors in flow properties for `input_type` and `output_type`, populated from defined types.

---

## Phase 5 — Reusability & Cross-cutting

### 5.1 — Named Transforms
**Priority: Medium** — Reusable transform blocks.

```hcl
transform "normalize_user" {
  output.email      = "lower(input.email)"
  output.created_at = "now()"
}
```

**UI:** Tab in sidebar. Transform editor similar to inline, but standalone. Flows can reference with `use = [transform.normalize_user]`.

### 5.2 — Aspects (AOP)
**Priority: Medium** — Cross-cutting concerns applied to multiple flows by pattern.

```hcl
aspect "audit_log" {
  when = "after"
  on   = ["flows/**/create_*.hcl", "flows/**/update_*.hcl"]
  action { ... }
}

aspect "error_logger" {
  when = "on_error"
  on   = ["flows/**/*.hcl"]
  action {
    connector = "db"
    target    = "error_logs"
    transform {
      error_message = "error.message"
      timestamp     = "now()"
    }
  }
}
```

**UI:** Dedicated panel. Fields: name, when (before/after/around/on_error), on (glob pattern list), action (connector + operation + transform). Visual indicator on affected flows.

Aspect types supported by Mycel:
- **before** — Execute before flow (rate limiting, validation)
- **after** — Execute after flow (audit log, cache invalidation)
- **around** — Wrap flow (caching, circuit breaker)
- **on_error** — Execute only when flow fails (error logging, alerts)

### 5.3 — Named Operations
**Priority: Low** — Reusable parameterized operations on connectors.

```hcl
connector "db" {
  operation "find_by_email" {
    query  = "SELECT * FROM users WHERE email = $1"
    params = [{ name = "email", type = "string", required = true }]
  }
}
```

**UI:** Sub-section in connector properties. Operations appear in flow dropdown.

---

## Phase 6 — Missing Connectors

### 6.1 — Notification Connectors
**Priority: Medium** — Mycel supports 6 notification types (Phase 6, already implemented in runtime).

Add to palette:

| Connector | Type | Key Config |
|-----------|------|-----------|
| Email | `email` | driver (smtp/sendgrid/ses), host, port, from, auth |
| Slack | `slack` | webhook_url or token + channel |
| Discord | `discord` | webhook_url |
| SMS | `sms` | provider (twilio), account_sid, auth_token, from |
| Push | `push` | provider (fcm/apns), credentials |
| Webhook | `webhook` | url, method, headers, auth |

**UI:** 6 new entries in palette (grouped under "Notifications" category). Output-only direction.

### 6.2 — Real-time Connectors
**Priority: Medium** — Mycel supports 3 real-time connector types (Phase 10).

| Connector | Type | Key Config |
|-----------|------|-----------|
| WebSocket | `websocket` | port, path, rooms, per-user targeting |
| CDC | `cdc` | driver (postgres), tables (wildcard matching), slot |
| SSE | `sse` | port, path, rooms, heartbeat, CORS |

**UI:** Add to palette. WebSocket and SSE are bidirectional (source: receive messages, target: push to clients). CDC is input-only (database change stream).

### 6.3 — Specialized Connectors
**Priority: Medium** — Mycel supports these since Phase 11.

| Connector | Type | Key Config |
|-----------|------|-----------|
| Elasticsearch | `elasticsearch` | url, index, auth, operations (search/get/count/aggregate/index/update/delete/bulk) |
| OAuth | `oauth` | provider (google/github/apple/oidc/custom), client_id, client_secret, scopes |

**UI:** Elasticsearch is bidirectional (read: search, write: index). OAuth is input-only (handles social login flow).

### 6.4 — Connector Profiles
**Priority: Low** — Multiple backends with fallback chain.

```hcl
connector "database" {
  type   = "database"
  driver = "postgres"

  profile "primary" {
    dsn     = env("PRIMARY_DB_URL")
    default = true
  }

  profile "fallback" {
    dsn = env("FALLBACK_DB_URL")
  }
}
```

**UI:** "Add profile" button in connector properties. Each profile is collapsible with its own connection config.

---

## Phase 7 — Enterprise Features

### 7.1 — Batch Processing
**Priority: Medium** — Chunked data processing for migrations, ETL, reindexing (Phase 11).

```hcl
flow "migrate_users" {
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
}
```

**UI:** Toggle "Batch mode" in flow properties. Fields: source connector, query, chunk_size, on_error (stop/continue).

### 7.2 — Sagas (Distributed Transactions)
**Priority: Medium** — Forward steps with automatic compensation on failure (Phase 12).

```hcl
saga "create_order" {
  step "reserve_inventory" {
    action      { connector = "inventory_api", operation = "POST /reserve" }
    compensate  { connector = "inventory_api", operation = "POST /release" }
  }

  step "charge_payment" {
    action      { connector = "payment_api", operation = "POST /charge" }
    compensate  { connector = "payment_api", operation = "POST /refund" }
  }

  step "create_shipment" {
    action      { connector = "shipping_api", operation = "POST /shipments" }
    compensate  { connector = "shipping_api", operation = "DELETE /shipments/${step.id}" }
  }
}
```

**UI:** Dedicated saga editor or a new node type. Each step shows action + compensate pair. Visual flow: step1 → step2 → step3, with reverse arrows for compensation.

### 7.3 — State Machines
**Priority: Medium** — Entity lifecycle with guards, actions, and final states (Phase 12).

```hcl
state_machine "order_status" {
  initial = "pending"

  state "pending" {
    transition "approve" {
      to    = "approved"
      guard = "input.amount < 10000"
      action { connector = "notification", operation = "POST /notify" }
    }
    transition "cancel" {
      to = "cancelled"
    }
  }

  state "approved" {
    transition "ship" { to = "shipped" }
  }

  state "shipped"   { final = true }
  state "cancelled" { final = true }
}
```

**UI:** Visual state diagram editor with states as circles, transitions as arrows. Guards and actions configurable per transition.

### 7.4 — Auth System UI
**Priority: Medium** — Mycel has a full declarative auth system.

```hcl
auth {
  preset = "standard"
  jwt { secret = env("JWT_SECRET"), access_ttl = "15m" }
  storage { users = "connector.db", sessions = "connector.redis" }
}
```

**UI:** Dedicated auth configuration panel. Preset selector (strict/standard/relaxed/development), JWT config, password policy, MFA options (TOTP, WebAuthn), storage references.

### 7.5 — Environment Variables
**Priority: Medium** — Per-environment overrides.

```hcl
environment "production" {
  variables {
    DB_HOST = "prod-db.example.com"
  }
}
```

**UI:** Environment tab in sidebar. Add/edit environments, manage variables per environment. Visual indicator of `env("VAR")` references across connectors.

### 7.6 — Mocks
**Priority: Low** — Test data for development.

**UI:** File management for `mocks/` directory. JSON editor for mock data files. Toggle mocks per connector.

### 7.7 — WASM & Plugins
**Priority: Low** — Custom functions and connector types.

**UI:** Configuration panel for WASM function modules (file path, exported functions) and plugin registration (source, version). Functions appear in transform expression autocomplete.

---

## Phase 8 — UX Polish

### 8.1 — Undo/Redo
Track canvas state changes. Ctrl+Z / Ctrl+Shift+Z.

### 8.2 — Copy/Paste
Duplicate nodes and their configuration. Ctrl+C / Ctrl+V.

### 8.3 — Keyboard Shortcuts
Standard IDE shortcuts: Delete node, Select all, Zoom in/out, Save.

### 8.4 — Template Gallery
Pre-built patterns from `integration-patterns.md`: REST+DB CRUD, Event processing, Scheduled jobs, Real-time WebSocket, Saga workflow, etc. "New from template" in File menu.

### 8.5 — Auto-save
Periodic save when using File System Access API.

### 8.6 — Validation against Mycel Runtime
Use the Mycel parser (Go) in the backend to validate generated HCL against the actual runtime schema, catching incompatibilities early.

---

## Summary

| Phase | Theme | Items | Depends On |
|-------|-------|-------|------------|
| **3** | Fix Foundations | Step blocks, filter, multi-to, response editor, error handling updates, remove phantom features | — |
| **4** | Types & Validation | Type editor, validators, type refs in flows | Phase 3 |
| **5** | Reusability | Named transforms, aspects (incl. on_error), named operations | Phase 4 |
| **6** | Missing Connectors | Notifications (6), real-time (3), specialized (2), connector profiles | — |
| **7** | Enterprise Features | Batch processing, sagas, state machines, auth UI, environments, mocks, WASM | Phase 5 |
| **8** | UX Polish | Undo/redo, copy/paste, shortcuts, templates, auto-save, runtime validation | Any |

Phase 6 and 8 can be done in parallel with any other phase.
