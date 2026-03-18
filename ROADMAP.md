# Mycel Studio - Roadmap

Cross-referenced against Mycel runtime v1.14.3 documentation (docs/reference/configuration.md, docs/core-concepts/, docs/connectors/, docs/guides/, examples/).

Last updated: 2026-03-16

---

## Current State (v0.5.0)

### What Works
- 25 connector types via data-driven registry (one file per connector, SOLID architecture)
  - API & Web: REST, HTTP, gRPC, GraphQL, TCP, SOAP
  - Database: Database, Cache, CDC, Elasticsearch
  - Messaging: Queue (RabbitMQ/Kafka/Redis Pub/Sub), MQTT
  - Real-time: WebSocket, SSE
  - Storage: File, S3, FTP/SFTP
  - Execution: Exec
  - Integration: OAuth, Webhook
  - Notifications: Email, Slack, Discord, SMS, Push
- Direction system (input/output/bidirectional)
- Flow blocks: transform, cache, lock, semaphore, step, enrich, error_handling (retry + fallback + error_response), response, dedupe, filter, multi-to, schedule (when)
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
| ~~Missing connector types~~ | ~~Only 10 types~~ | ~~Mycel has 25 connector types~~ | ~~✅ v0.5.0 — 25 connectors via registry~~ |
| HCL2 single-line blocks | Generates `from { connector = "api", operation = "..." }` | Invalid HCL2 — must be multi-line | **CRITICAL** — Fix in hclGenerator.ts |
| Queue driver `redis` | Only rabbitmq/kafka | Mycel supports `redis` as queue driver (Pub/Sub) | Add redis option |
| ~~MQTT connector~~ | ~~Not supported~~ | ~~`type = "mqtt"`~~ | ~~✅ v0.5.0~~ |
| ~~FTP/SFTP connector~~ | ~~Not supported~~ | ~~`type = "ftp"`~~ | ~~✅ v0.5.0~~ |
| ~~SOAP connector~~ | ~~Not supported~~ | ~~`type = "soap"`~~ | ~~✅ v0.5.0~~ |
| Named operations | Partial — operations on connectors exist | Full named operations with params and reusable queries | Align with Mycel syntax |
| Service version | Not shown/configurable | `service { name, version }` exposed in health, metrics, logs | Already in config.hcl generation, verify |
| **`response` block semantics** | Studio generates HTTP status/headers/body (like `error_response`) | **Mycel v1.12.0**: `response` block contains CEL expressions that transform output AFTER destination. Variables: `input.*` (original request), `output.*` (destination result). For echo flows, only `input` is available. | **CRITICAL** — Rewrite ResponseEditor to be a CEL transform editor (like TransformEditor). Move HTTP status/headers to `error_response` only |
| **Echo flows** | Studio requires `to` block on all flows | **Mycel v1.12.0**: Flows without `to` block are valid "echo flows" — they return the (optionally transformed) input directly | Allow flows without `to` connector. Valid for APIs that transform+return without external I/O |
| **Status code overrides** | Not supported | `http_status_code` (REST/SOAP) and `grpc_status_code` (gRPC) in response block override default status | Add to response block editor |

### Missing Mycel Features (by runtime version)

| Runtime Version | Feature | Status in Studio |
|-----------------|---------|-----------------|
| Phase 7 | Step blocks, filter, multi-to, dedupe | Not implemented |
| Phase 7 | on_error (step-level: fail/skip/default) | Not implemented |
| Phase 9 | GraphQL Subscriptions + Federation v2 | Not implemented |
| Phase 10 | WebSocket, CDC, SSE connectors | ✅ v0.5.0 (palette + properties) |
| Phase 11 | Elasticsearch, OAuth, Batch Processing | ✅ v0.5.0 (palette + properties, batch pending) |
| Phase 12 | Sagas, State Machines, Long-Running Workflows | Not implemented |
| v1.5.0 | SOAP connector (client + server, WSDL) | ✅ v0.5.0 (palette + properties) |
| v1.5.0 | Format declarations (JSON/XML per connector/flow/step) | Not implemented |
| v1.5.0 | File watch mode (polling watcher, glob patterns) | Not implemented |
| v1.7.0 | Security system (sanitization pipeline, WASM sanitizers) | Not implemented |
| v1.7.0 | Plugin system (git sources, semver, WASM validators/sanitizers) | Not implemented |
| v1.8.0 | On-error aspects, custom error responses | Not implemented |
| v1.9.0 | CSV/TSV enhanced I/O (delimiter, skip_rows, no_header) | Not implemented |
| v1.10.0 | Long-running workflows (delay, await, signal, cancel) | Not implemented |
| v1.10.0 | Debugging (trace, breakpoints, dry-run, DAP) | Not implemented |
| v1.11.0 | MQTT connector (QoS 0/1/2, TLS, topic wildcards) | ✅ v0.5.0 |
| v1.11.0 | FTP/SFTP connector (LIST/GET/PUT/DELETE, SSH key auth) | ✅ v0.5.0 |
| v1.11.0 | Redis Pub/Sub (queue driver, channels, patterns) | ✅ v0.5.0 |
| v1.12.0 | Echo flows (no `to` block — return transformed input directly) | ⚠️ Partial — see inconsistency below |
| v1.12.0 | Response block (CEL transforms applied AFTER destination) | ⚠️ Wrong semantics — see inconsistency below |
| v1.12.0 | Status code overrides (`http_status_code`, `grpc_status_code` in response) | Not implemented |
| v1.12.3 | Flow invocation from aspects (`action { flow = "name" }`) | Not implemented |
| v1.12.3 | Internal flows (no `from` block, invocable from aspects only) | Not implemented |
| v1.13.0 | PDF connector (HTML templates → PDF, pure Go rendering) | Not implemented |
| v1.13.0 | Binary HTTP responses (`_binary` + `_content_type` fields) | Not implemented |
| v1.13.0 | Response enrichment in after aspects (headers + fields via CEL) | Not implemented |
| v1.13.0 | Idempotency keys (flow-level `idempotency` block: storage, key, ttl) | Not implemented |
| v1.13.0 | Async execution (flow-level `async` block: HTTP 202 + job polling) | Not implemented |
| v1.13.0 | Database migrations (`mycel migrate` CLI command) | Not applicable (runtime-only) |
| v1.13.0 | File upload (multipart/form-data, 32MB max, base64 with metadata) | Not implemented |
| v1.13.0 | HTML email templates (`template_file` on email connector) | Not implemented |
| v1.13.0 | Multi-tenancy via request headers (`input.headers` in transforms) | Not implemented |
| v1.13.0 | Distributed rate limiting (Redis-backed `storage` on `rate_limit`) | Not implemented |
| v1.14.0 | Studio Debug Protocol (WebSocket JSON-RPC 2.0 at `:9090/debug`) | Not implemented |
| v1.14.1 | Source fan-out (multiple flows from same connector+operation) | Not implemented |
| v1.14.2 | Bugfixes only (aspect metadata, cache hit types, MongoDB ID) | Not applicable (runtime-only) |
| v1.14.3 | Template in connector config: PDF `template` attribute, email `template` attribute (renamed from `template_file`) | ⚠️ Studio PDF connector uses `template_dir`/`default_template` — must update to `template`. Email properties need `template` field |

### HCL2 Syntax Compliance

**CRITICAL:** Studio currently generates invalid single-line block syntax. HCL2 does NOT support multiple attributes on a single line separated by commas. All generated HCL must use multi-line blocks:

```hcl
# CORRECT
from {
  connector = "api"
  operation = "GET /users"
}

# INVALID — causes parse errors in Mycel
from { connector = "api", operation = "GET /users" }
```

This must be fixed in `hclGenerator.ts` before any other work.

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
**Priority: Medium** — ~~Custom HTTP responses for REST flows.~~ **UPDATED in Mycel v1.12.0:**

The `response` block now contains CEL expressions that transform the output AFTER receiving from the destination (or after transforms for echo flows). It is NOT for HTTP status/headers — those go in `error_response`.

```hcl
# Response block = CEL transforms of output (v1.12.0)
flow "get_user" {
  from {
    connector = "api"
    operation = "GET /users/:id"
  }
  to {
    connector = "db"
    target    = "users"
  }
  response {
    id               = "output.id"
    email            = "lower(output.email)"
    display_name     = "upper(output.first_name) + ' ' + upper(output.last_name)"
    http_status_code = "200"
  }
}

# Echo flow (no "to" block) — transforms + returns input directly
flow "process" {
  from {
    connector = "api"
    operation = "POST /process"
  }
  response {
    id         = "uuid()"
    email      = "lower(input.email)"
    name       = "upper(input.name)"
    created_at = "now()"
  }
}
```

**Variables available:**
- `input.*` — Original request data (always available)
- `output.*` — Result from destination connector (only when `to` block exists)

**Status code overrides:**
- `http_status_code` — Override HTTP status (REST, SOAP)
- `grpc_status_code` — Override gRPC status code

**UI:** ⚠️ **Current ResponseEditor (v0.4.0) has wrong semantics** — it generates HTTP status/headers/body. Must be rewritten as a CEL transform editor (similar to TransformEditor) with `input.*` and `output.*` variables. Status code override field should be a simple number input.

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

### 3.6 — Idempotency Block (NEW in v1.13.0)
**Priority: Medium** — Prevent duplicate execution of flows.

```hcl
flow "create_order" {
  idempotency {
    storage = "connector.redis"
    key     = "input.idempotency_key"
    ttl     = "24h"
  }
  from { ... }
  to   { ... }
}
```

**UI:** Collapsible "Idempotency" section in flow properties. Fields: storage (connector dropdown, cache-type only), key (CEL expression), ttl (duration string).

### 3.7 — Async Execution Block (NEW in v1.13.0)
**Priority: Medium** — Asynchronous flow execution with job polling.

```hcl
flow "generate_report" {
  async {
    storage = "connector.redis"
    ttl     = "1h"
  }
  from { ... }
  to   { ... }
}
```

Returns HTTP 202 with `job_id`. Mycel auto-registers `GET /jobs/{job_id}` polling endpoint.

**UI:** Toggle "Async mode" in flow properties. Fields: storage (connector dropdown), ttl (duration). Visual indicator (async badge) on flow node.

### 3.8 — Source Fan-Out (NEW in v1.14.1)
**Priority: Medium** — Multiple flows sharing the same `from` connector+operation.

```hcl
# Both flows trigger on POST /orders
flow "save_order" {
  from { connector = "api", operation = "POST /orders" }
  to   { connector = "db",  target = "orders" }
}

flow "notify_order" {
  from { connector = "api", operation = "POST /orders" }
  to   { connector = "slack", operation = "send" }
}
```

**Behavior by connector type:**
- **Request-response** (REST, GraphQL, gRPC, SOAP): First registered flow returns the HTTP response. Additional flows execute concurrently as fire-and-forget.
- **Event-driven** (MQ, MQTT, CDC): All flows execute in parallel. Message ACKed only after all complete.

**UI:** When multiple flows share the same `from` connector+operation, show a visual "fan-out" indicator on the source connector node. No special editor needed — fan-out is implicit from the configuration.

### 3.9 — File Upload Support (NEW in v1.13.0)
**Priority: Low** — multipart/form-data handling in REST connector.

Files arrive as base64 with metadata (`filename`, `content_type`, `size`, `data`) in `input.files`. Max 32MB.

**UI:** No special editor needed — just document in flow context variables that `input.files` is available when REST receives multipart uploads.

### 3.10 — Flow Invocation from Aspects (NEW in v1.12.3)
**Priority: Medium** — Aspects can invoke flows instead of connectors.

```hcl
aspect "audit" {
  when = "after"
  on   = ["create_*"]
  action {
    flow = "log_audit"   # connector XOR flow
  }
}
```

Internal flows (no `from` block) are only invocable from aspects.

**UI:** In aspect action editor, add toggle between "Connector" and "Flow" mode. Flow mode shows a dropdown of available flows (including internal flows without `from` block).

### 3.11 — Response Enrichment in After Aspects (NEW in v1.13.0)
**Priority: Medium** — After aspects can add headers and fields to the HTTP response.

```hcl
aspect "add_headers" {
  when = "after"
  on   = ["get_*"]
  response {
    headers {
      X-Request-Id = "input.request_id"
    }
    fields {
      _metadata = "{ 'processed_at': now() }"
    }
  }
}
```

**UI:** In after-aspect editor, add optional "Response" section with headers (key-value CEL) and fields (key-value CEL).

### 3.12 — Remove `foreach` and `after` from TODO
**Priority: Low** — These don't exist in Mycel. Remove references from TODO.md.
- `foreach` → Replaced by CEL array functions (`map`, `filter`, `sort_by`, etc.)
- `after` → Replaced by Aspects (Phase 5)

### 3.13 — Context-Aware Destination Properties (NEW)
**Priority: High** — The `to` block properties panel must show different fields depending on the destination connector type.

**Reference:** `/Users/matute/Documents/Personal/MYCEL/docs/reference/destination-properties.md`

Currently the `to` block editor shows the same generic fields (`connector`, `target`, `operation`) for all connectors. But each connector type gives different meaning to these fields, and some support extra properties via `params`:

| Connector type | `target` means | `operation` values | Extra `params` |
|---|---|---|---|
| Database (SQL) | Table name | `INSERT`, `UPDATE`, `DELETE` | — (uses `query` for raw SQL with `:named` params) |
| MongoDB | Collection name | `INSERT_ONE`, `UPDATE_ONE`, `DELETE_ONE`, etc. | `upsert`, `documents` |
| RabbitMQ | Routing key | `PUBLISH` | `exchange` |
| Kafka | Topic name | `PUBLISH` | — |
| Redis Pub/Sub | Channel name | `PUBLISH` | — |
| MQTT | Topic | `PUBLISH` | `qos`, `retain` |
| HTTP Client | Endpoint path (e.g., `/api/notify`) | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | — |
| GraphQL Client | Full mutation/query string | — | — |
| gRPC Client | RPC method name | — | — |
| SOAP Client | SOAP operation name | — | — |
| File | File path | `WRITE`, `DELETE`, `COPY`, `MOVE` | `format`, `append`, `sheet` (Excel) |
| S3 | Object key | `PUT`, `DELETE`, `COPY` | `content_type`, `storage_class`, `acl`, `metadata` |
| Exec | Command | — | `args`, `stdin` |
| Elasticsearch | Index name | `index`, `update`, `delete`, `bulk` | — |
| PDF | Template fallback | `generate`, `save` | — |
| WebSocket | Room name | `broadcast`, `send_to_room`, `send_to_user` | — |
| SSE | Room name | `broadcast`, `send_to_room` | — |
| Email | — | `send` | — (fields in payload) |
| Slack | — | `send` | — (fields in payload) |
| Discord | — | `send` | — (fields in payload) |
| SMS | — | `send` | — (fields in payload) |
| Push | — | `send` | — (fields in payload) |
| Webhook | — | — | — (URL in connector config) |

**UI implementation:**
1. When user selects a connector in the `to` block, detect its type from the canvas
2. Show `target` with a contextual label and placeholder (e.g., "Table name" for DB, "Routing key" for RabbitMQ, "Endpoint" for HTTP)
3. Show `operation` as a dropdown with valid values for that connector type
4. Show `query` field only for SQL databases
5. Show `query_filter` and `update` fields only for MongoDB
6. Show connector-specific `params` fields (e.g., `exchange` for RabbitMQ, `qos`/`retain` for MQTT, `format`/`append` for File)
7. For notification connectors, show a note that message fields come from the flow's `transform` block (not from `to` properties)

**Data source:** Add the connector-specific properties to the connector registry (`connectorTypes.ts`), so each connector definition includes its destination properties alongside its existing config properties.

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

## Phase 6 — Missing Connectors ✅ (v0.5.0)

### 6.1 — Notification Connectors
**Priority: Medium** — Mycel supports 6 notification types (already implemented in runtime).

Add to palette:

| Connector | Type | Key Config |
|-----------|------|-----------|
| Email | `email` | driver (smtp/sendgrid/ses), host, port, from, auth |
| Slack | `slack` | webhook_url or token + channel, api_url (configurable) |
| Discord | `discord` | webhook_url, api_url (configurable) |
| SMS | `sms` | provider (twilio), account_sid, auth_token, from, api_url |
| Push | `push` | provider (fcm/apns), credentials, api_url |
| Webhook | `webhook` | url, method, headers, auth |

**UI:** 6 new entries in palette (grouped under "Notifications" category). Output-only direction.

### 6.2 — Real-time Connectors
**Priority: Medium** — Mycel supports 3 real-time connector types.

| Connector | Type | Key Config |
|-----------|------|-----------|
| WebSocket | `websocket` | port, path, rooms, per-user targeting |
| CDC | `cdc` | driver (postgres), tables (wildcard matching), slot |
| SSE | `sse` | port, path, rooms, heartbeat, CORS |

**UI:** Add to palette. WebSocket and SSE are bidirectional (source: receive messages, target: push to clients). CDC is input-only (database change stream).

### 6.3 — Specialized Connectors
**Priority: Medium**

| Connector | Type | Key Config |
|-----------|------|-----------|
| Elasticsearch | `elasticsearch` | addresses, username, password, operations (search/get/count/aggregate/index/update/delete/bulk) |
| OAuth | `oauth` | provider (google/github/apple/oidc/custom), client_id, client_secret, scopes |
| SOAP | `soap` | driver (client/server), endpoint, namespace, version (1.1/1.2), wsdl_path, auth |

**UI:** Elasticsearch is bidirectional (read: search, write: index). OAuth is input-only (handles social login flow). SOAP is bidirectional (client calls external SOAP, server exposes SOAP endpoints with auto-generated WSDL).

### 6.4 — IoT & File Transfer Connectors (NEW in v1.11.0)
**Priority: Medium**

| Connector | Type | Key Config |
|-----------|------|-----------|
| MQTT | `mqtt` | broker (tcp/ssl/ws URL), client_id, qos (0/1/2), topic, clean_session, keep_alive, connect_timeout, auto_reconnect, max_reconnect_interval, tls block |
| FTP/SFTP | `ftp` | protocol (ftp/sftp), host, port, username, password, base_path, key_file (SFTP), passive (FTP), timeout, tls |

**UI:** MQTT is bidirectional (source: subscribe to topics with wildcards `+`/`#`, target: publish messages). FTP/SFTP is bidirectional (read: LIST/GET, write: PUT/MKDIR/DELETE). MQTT source provides metadata fields: `_topic`, `_message_id`, `_qos`, `_retained`.

### 6.5 — Redis Pub/Sub (NEW in v1.11.0)
**Priority: Medium** — Redis as a message queue driver (in addition to RabbitMQ and Kafka).

```hcl
connector "redis_events" {
  type     = "queue"
  driver   = "redis"
  address  = env("REDIS_ADDRESS")
  password = env("REDIS_PASSWORD")
  db       = 0
  channels = ["orders", "payments"]
  patterns = ["events.*"]
}
```

**UI:** Add `redis` as a third driver option in the queue connector properties (alongside `rabbitmq` and `kafka`). Show `channels` and `patterns` fields when `redis` driver is selected. Message metadata: `_channel`, `_pattern`.

### 6.6 — PDF Connector (NEW in v1.13.0, updated v1.14.3)
**Priority: Medium** — HTML-to-PDF generation via templates.

```hcl
connector "invoice_pdf" {
  type      = "pdf"
  template  = "./templates/invoice.html"
  page_size = "A4"
  font      = "Helvetica"
  output_dir = "./pdfs"
}
```

| Config | Type | Description |
|--------|------|-------------|
| `template` | string | Default HTML template file path (can be overridden per-request via payload) |
| `page_size` | string | `A4`, `Letter`, `Legal` (default: A4) |
| `font` | string | Default font family (default: Helvetica) |
| `margin_left/top/right` | number | Margins in mm (default: 15) |
| `output_dir` | string | Default output directory for `save` operation |

Operations: `generate` (returns binary bytes for HTTP response) and `save` (writes to file). Templates use Go `text/template` syntax with HTML. Supports h1-h6, p, table, strong/em, ul/ol, hr, img, basic CSS.

**Template resolution order:** payload `template` field > connector config `template` > flow `to.target` fallback.

**UI:** Add `pdf` to connector palette (output-only direction). Properties panel should include `template` field (file path). Binary response handling flows should show the `_binary` + `_content_type` pattern in transform editor.

⚠️ **Studio v1.1.0 uses `template_dir`/`default_template`** — must update to single `template` field per Mycel v1.14.3.

### 6.7 — Connector Profiles
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

### 7.6 — Long-Running Workflows (NEW in v1.10.0)
**Priority: Medium** — Persistent workflows with delay timers, await/signal events, timeout enforcement.

```hcl
saga "onboarding" {
  timeout = "7d"

  from {
    connector = "api"
    operation = "POST /onboard"
  }

  step "create_account" {
    action {
      connector = "db"
      operation = "INSERT"
      target    = "accounts"
    }
    compensate {
      connector = "db"
      operation = "DELETE"
      target    = "accounts"
    }
  }

  step "wait_verification" {
    await = "email_verified"
  }

  step "activate" {
    delay = "24h"
    action {
      connector = "db"
      operation = "UPDATE"
      target    = "accounts"
    }
  }
}
```

**UI:** Extended saga editor with delay timers (visual clock icon), await/signal steps (visual pause icon), timeout configuration. REST API endpoints shown: GET status, POST signal, POST cancel.

### 7.7 — Security System (NEW in v1.7.0)
**Priority: Low** — Input sanitization configuration.

```hcl
security {
  max_input_size = 2097152
  max_depth      = 20
  max_string_len = 100000

  sanitizer "custom" {
    wasm       = "./wasm/sanitizer.wasm"
    entrypoint = "sanitize"
    apply_to   = ["flows/api/*"]
    fields     = ["email", "phone"]
  }
}
```

**UI:** Dedicated security configuration panel. Fields: max_input_size, max_depth, max_string_len. WASM sanitizer management.

### 7.8 — Mocks
**Priority: Low** — Test data for development.

**UI:** File management for `mocks/` directory. JSON editor for mock data files. Toggle mocks per connector.

### 7.9 — Studio Debug Protocol (NEW in v1.14.0)
**Priority: High** — Real-time debugging and pipeline inspection via WebSocket.

Mycel runtime exposes a WebSocket JSON-RPC 2.0 endpoint at `:9090/debug` with:

**Methods (IDE → Runtime):**
- `debug.attach` / `debug.detach` — Session management
- `debug.setBreakpoints` — Stage-level + per-CEL-rule breakpoints + conditional
- `debug.continue` / `debug.next` / `debug.stepInto` — Execution control
- `debug.evaluate` — Evaluate arbitrary CEL in current context
- `debug.variables` / `debug.threads` — Inspect state
- `inspect.flows` / `inspect.flow` / `inspect.connectors` / `inspect.types` / `inspect.transforms` — Read-only inspection

**Events (Runtime → IDE):**
- `event.stopped` / `event.continued` — Breakpoint hits
- `event.stageEnter` / `event.stageExit` — Pipeline stage lifecycle
- `event.ruleEval` — Individual CEL rule evaluation
- `event.flowStart` / `event.flowEnd` — Request lifecycle

**UI:** This is THE core feature for Mycel Studio — live pipeline visualization, breakpoints on HCL lines, variable inspection, watch expressions. Should power the entire debugging experience (IntelliJ-level quality).

### 7.10 — Distributed Rate Limiting UI (NEW in v1.13.0)
**Priority: Low** — Redis-backed rate limiting configuration.

```hcl
rate_limit {
  requests = 100
  window   = "1m"
  burst    = 200
  storage  = "connector.redis"  # NEW — Redis backend for multi-instance
}
```

**UI:** In global config editor, add optional `storage` field (connector dropdown, Redis-type only) to rate_limit section.

### 7.11 — HTML Email Templates (NEW in v1.13.0, updated v1.14.3)
**Priority: Low** — Go template rendering for email connector.

```hcl
connector "order_email" {
  type     = "email"
  driver   = "smtp"
  host     = "${SMTP_HOST}"
  port     = 587
  template = "./templates/order_confirmation.html"
}

# Flow only sends business data — template is in connector config
flow "send_confirmation" {
  from { ... }
  transform {
    to      = "[{'email': input.email}]"
    subject = "'Order confirmed'"
    Name    = "input.customer_name"
    Total   = "string(input.total)"
  }
  to {
    connector = "order_email"
    operation = "send"
  }
}
```

**v1.14.3 change:** Template path moved from flow payload to connector config (`template` attribute). Field renamed from `template_file` to `template` for consistency with PDF connector. Per-email override still supported via `template` in payload.

**UI:** Add `template` field to email connector properties panel (file path input). Remove `template_file` from flow transform context — template is now infrastructure config, not business data.

### 7.12 — WASM & Plugins
**Priority: Low** — Custom functions and connector types.

**UI:** Configuration panel for WASM function modules (file path, exported functions) and plugin registration (source, version). Functions appear in transform expression autocomplete.

---

## Phase 8 — UX Polish ✅ (v0.10.0)

### 8.1 — Undo/Redo ✅
Snapshot-based history (50 depth). Tracks node add/remove/update, edge changes, position drag. Ctrl+Z / Ctrl+Shift+Z.

### 8.2 — Copy/Paste ✅
Copy/paste/duplicate nodes with Ctrl+C/V/D. Clipboard persists across operations.

### 8.3 — Keyboard Shortcuts ✅
Global handler with platform-aware labels. Shortcuts dialog (Ctrl+/). Skips when typing in inputs/Monaco.

### 8.4 — Template Gallery ✅
6 templates across 4 categories. REST+DB CRUD, GraphQL+DB, Scheduled Job, Event Processing, Real-time WebSocket, Order Saga. Ctrl+N or File menu.

### 8.5 — Auto-save
Periodic save when using File System Access API.

### 8.6 — Validation against Mycel Runtime
Use the Mycel parser (Go) in the backend to validate generated HCL against the actual runtime schema, catching incompatibilities early.

---

## Phase 9 — Monaco IDE Enhancement ✅ (v0.11.0)

### 9.1 — HCL Syntax Highlighting ✅
Monarch tokenizer with full HCL2 token classification. Custom dark/light themes. String interpolation and heredoc support.

### 9.2 — Autocompletion ✅
Context-aware completion provider. Top-level blocks, connector fields, flow sub-blocks, CEL functions, connector names from canvas, driver values, context variables.

### 9.3 — Client-Side Validation ✅
Real-time syntax validation with Monaco markers (squiggles). Detects unclosed strings/braces/comments, malformed attributes.

### 9.4 — Hover Information ✅
Hover provider with block docs, connector type descriptions, CEL function signatures, context variable docs, attribute descriptions.

### 9.5 — Full LSP via Backend
**Priority: Low** — `monaco-languageclient` + WebSocket to Go backend.
- Backend acts as HCL language server using existing parser
- Full diagnostics, completion, hover, go-to-definition
- Only if 9.2-9.4 prove insufficient

---

## Summary

| Phase | Theme | Items | Depends On |
|-------|-------|-------|------------|
| **3** | Fix Foundations | ~~HCL2 syntax fix~~, ~~step blocks~~, ~~filter~~, ~~multi-to~~, ~~response editor~~, ~~error handling updates~~, ~~dedupe~~, ~~remove phantom features~~, idempotency, async, fan-out, file upload, flow invocation from aspects, response enrichment, **context-aware destination properties** | — |
| **4** | Types & Validation | Type editor, validators, type refs in flows | Phase 3 |
| **5** | Reusability | Named transforms, aspects (incl. on_error), named operations | Phase 4 |
| **6** | ~~Missing Connectors~~ | ~~Notifications (6), real-time (3), specialized (3 incl. SOAP), MQTT, FTP/SFTP, Redis Pub/Sub~~, PDF connector (⚠️ update `template` field per v1.14.3) + connector profiles (pending) | ~~—~~ ✅ v0.5.0 |
| **7** | Enterprise Features | Batch processing, sagas, state machines, long-running workflows, auth UI, environments, security, plugins, mocks, WASM, **debug protocol**, distributed rate limiting, HTML email templates | Phase 5 |
| **8** | ~~UX Polish~~ | ~~Undo/redo, copy/paste, shortcuts, templates~~, auto-save, runtime validation | ~~Any~~ ✅ v0.10.0 (core items) |
| **9** | ~~Monaco IDE~~ | ~~HCL syntax highlighting, autocompletion, real-time validation, hover~~ + LSP (pending) | ~~Any~~ ✅ v0.11.0 (core items) |

Phases 6, 8, and 9 can be done in parallel with any other phase.

**Phase 3 is COMPLETE** — All foundation features implemented (v0.4.0). ⚠️ **Response block needs rewrite** for v1.12.0 semantics.
**Phase 4 is COMPLETE** — Types & Validators (v0.7.0).
**Phase 5 is COMPLETE** — Named Transforms & Aspects (v0.8.0).
**Phase 6 is COMPLETE** — 25 connectors via data-driven registry (v0.5.0). Only connector profiles (6.6) remain.
