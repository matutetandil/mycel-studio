# Mycel Studio - Roadmap

Cross-referenced against Mycel runtime documentation (CONCEPTS.md, CONFIGURATION.md, examples/).

Last updated: 2026-02-26

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
| Notification connectors | Not supported at all | 6 notification types: email, slack, discord, sms, push, webhook (Phase 6) | Add to connector palette |
| Connector profiles | Not supported | Multiple backends with fallback chain | Add UI for profiles |
| Named operations | Partial — operations on connectors exist | Full named operations with params and reusable queries | Align with Mycel syntax |
| Service version | Not shown/configurable | `service { name, version }` exposed in health, metrics, logs | Already in config.hcl generation, verify |

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
}

step "prices" {
  when      = "input.include_prices == true"
  connector = "prices_api"
  operation = "POST /calculate"
}
```

**UI:** List of step blocks in flow config (similar to current enrich editor). Each step has: name, connector, operation, params, optional `when` condition. Results shown as `step.<name>.*` in transform autocomplete.

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

### 3.5 — Remove `foreach` and `after` from TODO
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
- New node type on canvas (schema icon), OR
- Dedicated panel/tab (types aren't visual connectors, they're schemas)
- Recommendation: **Dedicated tab** in the left sidebar, similar to file tree. Types are referenced by flows, not connected with edges.

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
```

**UI:** Dedicated panel. Fields: name, when (before/after/around/on_error), on (glob pattern list), except (exclusion patterns), action (connector + operation). Visual indicator on affected flows.

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

| Connector | Key Config |
|-----------|-----------|
| `email` | SMTP host, port, from, auth |
| `slack` | webhook_url or token + channel |
| `discord` | webhook_url |
| `sms` | provider (twilio), account_sid, auth_token, from |
| `push` | provider (fcm/apns), credentials |
| `webhook` | url, method, headers, auth |

**UI:** 6 new entries in palette (could be grouped under a "Notifications" category). Output-only direction.

### 6.2 — Connector Profiles
**Priority: Low** — Multiple backends with fallback chain.

```hcl
profile "database" {
  primary  { connector = "postgres" }
  fallback { connector = "sqlite" }
}
```

**UI:** Profile nodes or a separate configuration panel.

---

## Phase 7 — Advanced Features

### 7.1 — Auth System UI
**Priority: Medium** — Mycel has a full declarative auth system.

```hcl
auth {
  preset = "standard"
  jwt { secret = env("JWT_SECRET"), access_ttl = "15m" }
  storage { users = "connector.db", sessions = "connector.redis" }
}
```

**UI:** Dedicated auth configuration panel. Preset selector (strict/standard/relaxed/development), JWT config, password policy, MFA options (TOTP, WebAuthn), storage references.

### 7.2 — Environment Variables
**Priority: Medium** — Per-environment overrides.

```hcl
environment "production" {
  variables {
    DB_HOST = "prod-db.example.com"
  }
}
```

**UI:** Environment tab in sidebar. Add/edit environments, manage variables per environment. Visual indicator of `env("VAR")` references across connectors.

### 7.3 — Mocks
**Priority: Low** — Test data for development.

**UI:** File management for `mocks/` directory. JSON editor for mock data files. Toggle mocks per connector.

### 7.4 — WASM & Plugins
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
Pre-built patterns from `integration-patterns.md`: REST+DB CRUD, Event processing, Scheduled jobs, etc. "New from template" in File menu.

### 8.5 — Auto-save
Periodic save when using File System Access API.

### 8.6 — Validation against Mycel Runtime
Use the Mycel parser (Go) in the backend to validate generated HCL against the actual runtime schema, catching incompatibilities early.

---

## Summary

| Phase | Theme | Items | Depends On |
|-------|-------|-------|------------|
| **3** | Fix Foundations | Step blocks, filter, multi-to, response editor, remove phantom features | — |
| **4** | Types & Validation | Type editor, validators, type refs in flows | Phase 3 |
| **5** | Reusability | Named transforms, aspects, named operations | Phase 4 |
| **6** | Missing Connectors | Notifications (6 types), connector profiles | — |
| **7** | Advanced Features | Auth UI, environments, mocks, WASM, plugins | Phase 5 |
| **8** | UX Polish | Undo/redo, copy/paste, shortcuts, templates, auto-save, runtime validation | Any |

Phase 6 and 8 can be done in parallel with any other phase.
