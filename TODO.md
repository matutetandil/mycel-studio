# Mycel Studio - Feature Backlog

Complete list of features needed to fully support Mycel HCL configuration visually.

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

### Multi-file HCL Structure
- [ ] Generate/edit separate files: `service.hcl`, `connectors.hcl`, `flows.hcl`, `types.hcl`, `transforms.hcl`
- [ ] Sync between visual canvas and file content
- [ ] Handle file creation/deletion

### New UI Layout (IDE-style)
```
┌─────────────────────────────────────────────────────────────┐
│  Menu Bar (File, Edit, View, Help)                          │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│  File Tree   │      Canvas (React Flow)     │  Properties   │
│  - service   │                              │    Panel      │
│  - connectors│                              │               │
│  - flows     │                              │               │
│  - types     │                              │               │
│  - transforms│                              │               │
│              │                              │               │
│ ──────────── │                              │               │
│              │                              │               │
│  Components  │                              │               │
│  (Palette)   │                              │               │
│  - Connectors│                              │               │
│  - Flows     │                              │               │
│  - Types     │                              │               │
│  - etc.      │                              │               │
│              ├──────────────────────────────┤               │
│              │   HCL Editor (Monaco)        │               │
│              │   - Tabs per file            │               │
│              │   - Syntax highlighting      │               │
│              │   - Editable                 │               │
└──────────────┴──────────────────────────────┴───────────────┘
```

### HCL Editor (Full)
- [ ] Monaco editor with HCL syntax highlighting
- [ ] **Line numbers** (always visible)
- [ ] Tabs for each file in project
- [ ] **Bi-directional sync**: Edit in canvas → updates HCL, edit HCL → updates canvas
- [ ] Error highlighting with line markers
- [ ] Auto-completion for Mycel keywords
- [ ] Format/beautify button
- [ ] Find & replace
- [ ] Go to definition (click connector name → jump to definition)

### Git Integration (Basic, read-only)
- [ ] **File status indicators** in file tree:
  - 🟢 Unmodified (clean)
  - 🟡 Modified (has changes)
  - 🟢+ New/Untracked
  - 🔴 Deleted
  - ⚫ Ignored (.gitignore)
- [ ] **Inline diff in editor**: Gutter markers showing added/modified/deleted lines
- [ ] **Diff view**: Side-by-side or inline diff against HEAD
- [ ] **Git Blame / Annotate**:
  - Show commit hash, author, date per line in gutter
  - Click to see full commit message
  - Toggle on/off
- [ ] **File history**: List of commits that touched the file
- [ ] **Status bar**: Current branch name, dirty indicator

---

## Service Configuration (`service.hcl`)

- [ ] Service block: `name`, `version`
- [ ] Rate limiting configuration:
  - [ ] `requests_per_second`, `burst`
  - [ ] `key_extractor` (ip, header, query)
  - [ ] `exclude_paths`
  - [ ] `enable_headers`

---

## Connectors (Full Support)

### REST Connector
- [ ] Server mode: `port`, `cors` block (origins, methods, headers)
- [ ] Client mode (HTTP): `base_url`, `timeout`, `auth` block, `retry` block

### Database Connectors
- [ ] **SQLite**: `database` (path only)
- [ ] **PostgreSQL**: `host`, `port`, `database`, `user`, `password`, `ssl_mode`, `pool` block
- [ ] **MySQL**: `host`, `port`, `database`, `user`, `password`, `charset`, `pool` block
- [ ] **MongoDB**: `uri`, `database`, `pool` block

### GraphQL Connector
- [ ] Server mode: `port`, `endpoint`, `playground`, `schema` block, `federation` block, `cors`
- [ ] Client mode: `endpoint`, `timeout`, `retry_count`, `auth` block

### gRPC Connector
- [ ] Server mode: `port`, `proto` block (path, service), `tls` block
- [ ] Client mode: `address`, `proto` block

### Message Queue Connectors
- [ ] **RabbitMQ**: `url`, `consumer` block (queue, prefetch, auto_ack, workers), `publisher` block (exchange, routing_key)
- [ ] **Kafka**: `brokers`, `consumer` block (group_id, topics, offset), `producer` block (topic, acks, compression), `sasl` block

### TCP Connector
- [ ] Server mode: `host`, `port`, `codec`
- [ ] Client mode: `address`, `codec`, `timeout`

### Cache Connector
- [ ] **Memory**: `max_items`, `eviction`, `default_ttl`
- [ ] **Redis**: `address`, `password`, `db`, `key_prefix`, `pool` block

### File Connector
- [ ] **Local**: `base_path`, `permissions` block
- [ ] **S3**: `bucket`, `region`, `access_key`, `secret_key`, `endpoint`, `force_path_style`

### Exec Connector
- [ ] **Local**: `command`, `args`, `timeout`, `working_dir`, `input_format`, `output_format`, `env` block
- [ ] **SSH**: `command`, `ssh` block (host, port, user, key_file)

### Profiled Connector
- [ ] `select` (CEL expression)
- [ ] `default` profile
- [ ] `fallback` chain
- [ ] Multiple `profile` blocks with transforms

---

## Flows (Full Support)

### From Block
- [ ] `connector`, `operation`
- [ ] Visual operation picker based on connector type (REST methods, GraphQL operations, gRPC methods)

### To Block
- [ ] `connector`, `target`
- [ ] `query` (raw SQL)
- [ ] `query_filter` (MongoDB)
- [ ] `update` (MongoDB)

### Transform Block
- [ ] Inline transforms with CEL editor
- [ ] `use` reference to named transform
- [ ] Syntax highlighting for CEL

### Enrich Block
- [ ] `connector`, `operation`, `params`
- [ ] Multiple enrichments per flow
- [ ] Visual representation (dashed lines)

### Cache Block
- [ ] `storage`, `ttl`, `key`
- [ ] `use` reference to named cache

### After Block
- [ ] `invalidate` with `storage`, `keys`, `patterns`

### When (Triggers)
- [ ] `"always"` (default)
- [ ] Cron expressions (`"0 3 * * *"`)
- [ ] Intervals (`"@every 5m"`)
- [ ] Shortcuts (`@hourly`, `@daily`, `@weekly`, `@monthly`)
- [ ] Visual cron builder

---

## Synchronization

### Lock (Mutex)
- [ ] `storage`, `key`, `timeout`, `wait`, `retry`
- [ ] Visual lock icon on flows

### Semaphore
- [ ] `storage`, `key`, `max_permits`, `timeout`, `lease`
- [ ] Visual representation

### Coordinate
- [ ] `storage`, `timeout`, `on_timeout`, `max_retries`, `max_concurrent_waits`
- [ ] `wait` block: `when`, `for`
- [ ] `signal` block: `when`, `emit`, `ttl`
- [ ] `preflight` block: `connector`, `query`, `params`, `if_exists`

---

## Types (Validation Schemas)

- [ ] Type node on canvas
- [ ] Field definitions:
  - [ ] `string`: `required`, `format`, `pattern`, `min_length`, `max_length`, `enum`, `default`
  - [ ] `number`: `required`, `min`, `max`, `integer`
  - [ ] `bool`: `required`, `default`
  - [ ] `object`: nested fields
  - [ ] `array`: `items`, `min_items`, `max_items`
- [ ] String formats: `email`, `uuid`, `url`, `date`, `datetime`, `phone`
- [ ] Reference types in flows (`input_type`)

---

## Named Transforms

- [ ] Transform node on canvas
- [ ] CEL expression editor for each field
- [ ] Embedded `enrich` blocks in transforms
- [ ] Reusable across flows

---

## Named Caches

- [ ] Cache definition node
- [ ] `storage`, `ttl`, `prefix`
- [ ] Reference in flows

---

## Authentication System

### Auth Block
- [ ] `preset` selector (strict, standard, relaxed, development)
- [ ] `jwt` block: `secret`, `algorithm`, `access_lifetime`, `refresh_lifetime`, `issuer`, `audience`, `rotation`
- [ ] `password` block: policy options
- [ ] `security` block: brute_force, replay_protection, impossible_travel, device_binding
- [ ] `sessions` block: max_active, timeouts
- [ ] `mfa` block: methods, totp config, webauthn config, recovery_codes
- [ ] `sso` block: linking options
- [ ] `social` block: google, github, apple providers
- [ ] `oidc` blocks: okta, azure, auth0
- [ ] `users` block: connector, table, field mappings
- [ ] `storage` block: driver (memory, redis)
- [ ] `audit` block: enabled, connector, table, events
- [ ] `endpoints` block: custom paths

---

## UI/UX Improvements

### Theme
- [ ] Dark mode support
- [ ] Theme toggle in header
- [ ] Persist preference

### Canvas
- [ ] Better connection routing (bezier curves)
- [ ] Connection labels
- [ ] Grouping/containers for organization
- [ ] Snap to grid
- [ ] Alignment guides
- [ ] Copy/paste nodes
- [ ] Undo/redo

### Properties Panel
- [ ] Dynamic forms based on connector/node type
- [ ] Nested block editors (collapsible sections)
- [ ] CEL expression editor with autocomplete
- [ ] Validation feedback
- [ ] env() helper for environment variables

### Preview Panel
- [ ] Tabs for multiple files
- [ ] Syntax validation indicators
- [ ] Line highlighting on errors
- [ ] Format/beautify button

### Palette
- [ ] Search/filter
- [ ] Categories (Connectors, Logic, Auth, etc.)
- [ ] Recently used
- [ ] Favorites

### Templates
- [ ] Load from backend
- [ ] Preview before applying
- [ ] Categories (REST+DB, MQ, GraphQL, etc.)

---

## Backend Improvements

- [ ] Integrate Mycel parser for real validation
- [ ] Parse HCL to visual model (import)
- [ ] Project save/load (file or localStorage)
- [ ] Export as ZIP

---

## Priority Order

### Phase 1 - New Architecture & UI
1. **New IDE-style layout**: File tree + Canvas + Editor + Properties
2. **Project management**: Open/save project, metadata file (`.mycel-studio.json`)
3. **Multi-file structure**: Separate HCL files per concern
4. **Dark mode**: Theme toggle, persist preference

### Phase 2 - Core Editor & Git
5. **HCL Editor**: Full Monaco editor with tabs, line numbers, editable, bi-directional sync
6. **Git integration**: File status in tree, inline diff, blame/annotate, branch indicator
7. **Parse HCL → Canvas**: Import existing projects
8. **Fix connector properties**: Proper fields per driver type

### Phase 3 - Full Connector Support
9. All database drivers with correct fields (SQLite, PostgreSQL, MySQL, MongoDB)
10. All connector types (REST client, MQ, Cache, gRPC, GraphQL, File, Exec)
11. Profiled connectors with fallback

### Phase 4 - Flow Enhancements
12. Complete flow blocks (enrich, cache, after)
13. Synchronization (lock, semaphore, coordinate)
14. When/triggers with visual cron builder

### Phase 5 - Schema & Transforms
15. Types (validation schemas) as visual nodes
16. Named transforms with CEL editor
17. Named caches

### Phase 6 - Auth & Service Config
18. Full auth system configuration
19. Service configuration (rate limiting, etc.)

### Phase 7 - Polish & UX
20. Undo/redo, copy/paste nodes
21. Templates gallery
22. Auto-save, recent projects
23. Keyboard shortcuts
24. Auto-completion in HCL editor
