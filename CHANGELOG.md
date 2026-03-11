# Changelog

All notable changes to this project will be documented in this file.

## [0.9.0] - Phase 7: Enterprise Features

### Added

- **Batch Processing (7.1):**
  - `BatchEditor.tsx` — Custom editor for batch/ETL flows
  - Source connector, SQL query, chunk size, on_error (stop/continue)
  - Per-item transform and target connector configuration
  - HCL preview, visual indicator on flow nodes
  - `batch` flow block definition

- **Sagas (7.2) — Distributed Transactions:**
  - `SagaNode.tsx` — Top-level node with step preview (action/delay/await icons)
  - `SagaProperties` — Step editor with action/compensate pairs, delay, await
  - On_complete/on_failure callbacks, per-step timeout and on_error
  - HCL generation: `saga "name" { from, step "name" { action {}, compensate {} }, on_complete, on_failure }`
  - Output to `sagas/sagas.hcl`

- **State Machines (7.3) — Entity Lifecycle:**
  - `StateMachineNode.tsx` — Top-level node with state visualization
  - `StateMachineProperties` — State editor with transitions (event → target + guard + action)
  - Initial state selector, final state marking
  - HCL generation: `state_machine "name" { initial, state "name" { on "event" { transition_to, guard, action } } }`
  - Output to `machines/machines.hcl`

- **Long-Running Workflows (7.6):**
  - Workflow storage configuration in service block (`workflow { storage, table, auto_create }`)
  - UI appears automatically when saga nodes exist on canvas
  - Warning when sagas with delay/await lack persistent storage
  - Database connector selector for workflow state persistence
  - Auto-generated REST endpoints info (GET status, POST signal, POST cancel)
  - SagaNode now shows "WORKFLOW" label when it contains delay/await steps
  - `WorkflowStorageConfig` type, generates `workflow {}` block in `config.hcl`

- **Security (7.7) — Input Sanitization:**
  - `SecurityProperties` — Enable/disable, input limits, WASM sanitizers
  - Input limits: max_input_length, max_field_length, max_field_depth, allowed_control_chars
  - WASM sanitizer management: name, wasm path, entrypoint, apply_to (globs), fields
  - `SecurityConfig`, `SecuritySanitizer` types
  - HCL generation: `security { max_input_length, sanitizer "name" { source, wasm, apply_to, fields } }`
  - Output to `security/security.hcl`

- **WASM Plugins (7.9):**
  - `PluginProperties` — Plugin management panel
  - Plugin definition: name, source (git URL or path), version (semver), exported functions
  - `PluginConfig`, `PluginDefinition` types
  - HCL generation: `plugin "name" { source, version, functions }`
  - Output to `plugins/plugins.hcl`

- **Environment Variables (7.5):**
  - `EnvProperties` — Variables panel with two tabs (Variables / Environments)
  - Auto-scan of env() references across all nodes and auth config
  - Warning panel showing undefined references with click-to-add
  - Secret marking (hidden in `.env.example`)
  - Per-environment overlays (dev/staging/production) with variable overrides
  - Active environment selector
  - File generation: `.env`, `.env.example`, `environments/{name}.env`
  - `EnvironmentConfig`, `EnvVariable`, `EnvironmentOverlay` types

- **Auth UI (7.4) — Authentication Configuration:**
  - `AuthProperties` — Full auth configuration panel in Properties sidebar
  - Preset selector (strict/standard/relaxed/development) with auto-apply defaults
  - JWT: algorithm (HS256-RS512), secret, access/refresh TTL, issuer, rotation
  - Password policy: min length, require upper/lower/number/special, breach check
  - MFA: required/optional/off, methods (TOTP, WebAuthn, SMS, email, push), TOTP issuer
  - Sessions: max active, idle timeout, on_max_reached policy
  - Security: brute force protection (max attempts, lockout), replay protection
  - Storage: users connector reference, token driver (memory/redis)
  - Social login: Google, GitHub, Apple with client ID/secret
  - Endpoint prefix customization
  - Enable/disable toggle for the entire auth system
  - HCL generation: `auth { preset, jwt {}, password {}, mfa {}, sessions {}, security {}, social {}, storage {}, users {} }`
  - Output to `auth/auth.hcl`
  - `AuthConfig` type with full sub-type hierarchy (JWT, Password, MFA, Sessions, Security, Storage, Social)

### Changed

- **useStudioStore:** Added `authConfig`, `envConfig`, `securityConfig`, `pluginConfig` state with update methods
- **Properties.tsx:** AuthProperties panel shown below ServiceProperties when no node selected
- **hclGenerator.ts:** `generateProject()` and `generateHCL()` accept optional `authConfig`, `envConfig`, `securityConfig`, `pluginConfig` parameters
- **FileTree.tsx:** Passes all configs to `generateProject()`, expanded dirs include `auth`, `security`, `plugins`, `environments`
- **Preview.tsx:** Passes all configs to `generateProject()`
- **SagaNode.tsx:** Shows "WORKFLOW" label for sagas with delay/await steps
- **Palette.tsx:** Saga and State Machine in Logic category
- **Nodes/index.ts:** Registered SagaNode and StateMachineNode

---

## [0.8.1] - Mycel v1.12.0 Compatibility

### Changed

- **ResponseEditor rewritten** — Now a CEL transform editor instead of HTTP status/headers/body:
  - Field mappings with `input.*` and `output.*` variables
  - CEL pattern helpers and templates (pass through, normalize, echo with metadata)
  - `http_status_code` and `grpc_status_code` override fields
  - Context-aware help text (echo flow vs normal flow)
  - HCL preview with correct v1.12.0 syntax

- **FlowResponse type** — Changed from `{status, headers, body}` to `{fields, httpStatusCode?, grpcStatusCode?}`

- **Echo flows supported** — Flows without a `to` block are now valid. The ResponseEditor detects echo flows and adjusts variable hints accordingly

- **HCL generation** — Response block now generates CEL field mappings with optional status code overrides instead of HTTP status/headers/body

- **Response flow block definition** — Updated description and isActive check for new data structure

### Fixed

- `.gitignore` — Added `backend/backend` binary

---

## [0.8.0] - Phase 5: Named Transforms & Aspects

### Added

- **Transform nodes:**
  - `TransformNode.tsx` — Visual node showing field mappings preview (up to 4 fields with overflow indicator)
  - `TransformProperties` in Properties panel — Field mappings editor with add/rename/remove
  - CEL expressions for field values
  - Generates `transform "name" { field = "expression" }` HCL

- **Aspect nodes (AOP - cross-cutting concerns):**
  - `AspectNode.tsx` — Visual node with when-based colors (before=blue, after=green, around=purple, on_error=red)
  - Shows matching patterns and action/cache/invalidate indicators
  - `AspectProperties` in Properties panel:
    - When selector (before/after/around/on_error)
    - Glob pattern matching for flow targeting
    - Optional condition and priority
    - Action block (connector + target + transform) for before/after/on_error
    - Cache block (storage + key + TTL) for around aspects
    - Invalidation block (storage + keys/patterns) for after aspects
  - Generates `aspect "name" { on, when, if, priority, action {}, cache {}, invalidate {} }` HCL

- **HCL generation:**
  - `generateNamedTransformHCL()` — Top-level named transform blocks
  - `generateAspectHCL()` — Aspect blocks with all sub-blocks (action, cache, invalidate)
  - Output to `transforms/transforms.hcl` and `aspects/aspects.hcl`

### Changed

- **Palette:** Added Transform and Aspect to Schema category with proper drag initialization
- **Nodes/index.ts:** Registered TransformNode and AspectNode in nodeTypes
- **Properties.tsx:** Added TransformProperties and AspectProperties panels (6 node types total)
- **FileTree.tsx:** Transform/aspect node selection auto-navigates to correct generated file; expanded default directories include transforms/aspects
- **hclGenerator.ts:** Extended generateProject to output transforms and aspects files

---

## [0.7.0] - Phase 4: Types & Validators

### Added

- **Type nodes:**
  - `TypeNode.tsx` — Visual node showing type name and field preview (names, types, required markers)
  - `TypeProperties` in Properties panel — Full type field editor with add/remove/rename
  - Per-field constraints: string (format, min_length, max_length, pattern, enum, validate), number (min, max), boolean
  - Format presets: email, url, uuid, date, datetime, phone, ip
  - Validator reference dropdown (populated from validator nodes on canvas)

- **Validator nodes with registry pattern (`src/validators/`):**
  - `ValidatorNode.tsx` — Visual node with type-specific icon and color
  - `ValidatorProperties` — Type selector (regex/cel/wasm) with registry-driven fields
  - `validators/definitions/regex.ts` — Pattern field
  - `validators/definitions/cel.ts` — CEL expression field
  - `validators/definitions/wasm.ts` — WASM path + entrypoint fields
  - `validators/registry.ts` — Central Map with `getValidatorType()`, `getAllValidatorTypes()`

- **Validate flow block (`flow-blocks/definitions/validate.ts`):**
  - Simple block (data-driven via GenericBlockEditor)
  - Input/output type references
  - Appears in flow context menu under "Data" group
  - Node indicator icon on flow nodes

- **HCL generation:**
  - `generateTypeHCL()` — Generates `type "name" { field = base_type { constraints } }` with proper HCL2 multi-line syntax
  - `generateValidatorHCL()` — Generates `validator "name" { type, pattern/expr/wasm, message }`
  - Types output to `types/types.hcl`, validators to `validators/validators.hcl`

### Changed

- **Palette:** Added Type and Validator to Schema category (replaced Transform placeholder)
- **Nodes/index.ts:** Registered TypeNode and ValidatorNode in nodeTypes
- **Properties.tsx:** Added TypeProperties and ValidatorProperties panels
- **FileTree.tsx:** Type/validator node selection auto-navigates to correct generated file
- **hclGenerator.ts:** Extended generateProject to output types and validators files

---

## [0.6.0] - Flow Block Registry (SOLID)

### Added

- **Data-driven flow block registry (`src/flow-blocks/`):**
  - `types.ts` — Core interfaces: `FlowBlockDefinition`, `FlowBlockField`, `HclFieldMapping`
  - `registry.ts` — Central Map with helpers: `getFlowBlock()`, `getAllFlowBlocks()`, `getFlowBlocksByGroup()`, `getSimpleFlowBlocks()`, `getCustomFlowBlocks()`
  - `GenericBlockEditor.tsx` — Generic modal editor that renders any simple block from its definition (supports field types: storage_select, cel_expression, duration, number, select, boolean, string)
  - `index.ts` — Public API barrel export

- **One definition file per flow block (`src/flow-blocks/definitions/`):**
  - Simple blocks (fully data-driven): `cache`, `lock`, `semaphore`, `dedupe`
  - Complex blocks (definition + custom editor): `transform`, `step`, `response`, `errorHandling`

### Changed

- **`FlowContextMenu.tsx`:** Replaced 8 hardcoded menu items with registry-driven menu via `getFlowBlocksByGroup()`. Props simplified from 8 individual `onAdd*` callbacks to single `onSelectBlock(key)`
- **`Canvas.tsx`:** Replaced 9 individual `useState` booleans + 16 handler functions with unified `activeEditor` state. Simple blocks render via `GenericBlockEditor`, complex blocks use their existing custom editors
- **`hclGenerator.ts`:** Replaced hardcoded cache/lock/semaphore/dedupe HCL blocks with generic loop using `getSimpleFlowBlocks()` + `hclFields` mappings
- **`FlowConfig/index.ts`:** Removed exports for `CacheEditor`, `LockEditor`, `SemaphoreEditor`, `EnrichEditor` (replaced by GenericBlockEditor)

### Architecture

- Adding a new simple flow block now requires only creating a definition file in `src/flow-blocks/definitions/` — no changes needed to FlowContextMenu, Canvas, or hclGenerator
- Field-driven HCL generation: each definition declares `hclFields` with key→hclKey mapping, type, and optional `omitDefault`
- Block groups (data, concurrency, output) control menu organization

---

## [0.5.0] - Connector Registry Refactor (SOLID)

### Added

- **Data-driven connector registry (`src/connectors/`):**
  - `types.ts` — Core interfaces: `ConnectorDefinition`, `FieldDefinition`, `DriverDefinition`
  - `registry.ts` — Central Map with helper functions: `getConnector()`, `getAllConnectors()`, `getConnectorsByCategory()`, `getConnectorMode()`, `getDefaultDirection()`
  - `index.ts` — Public API barrel export

- **One definition file per connector (`src/connectors/definitions/`):**
  - 10 existing connectors migrated: `rest`, `database`, `queue`, `cache`, `grpc`, `graphql`, `tcp`, `file`, `s3`, `exec`
  - 15 new connectors added: `http`, `websocket`, `sse`, `cdc`, `elasticsearch`, `oauth`, `mqtt`, `ftp`, `soap`, `email`, `slack`, `discord`, `sms`, `push`, `webhook`
  - Each file defines: type, label, icon, color, category, defaultDirection, fields, drivers, modeMapping

- **25 connector types total** (was 10), matching Mycel runtime v1.11.0

### Changed

- **`ConnectorNode.tsx`:** Replaced hardcoded `iconMap`/`colorMap` with `getConnector()` registry lookup
- **`Palette.tsx`:** Replaced hardcoded categories array with `getConnectorsByCategory()`, auto-generates palette from registry
- **`Properties.tsx`:** Replaced ~460 lines of hardcoded switch/case with generic `FieldRenderer` component (~100 lines) that renders any connector's fields from its definition
- **`hclGenerator.ts`:** Replaced hardcoded `switch` in `generateConnectorHCL()` with generic field-driven algorithm that reads fields from the registry
- **`types/index.ts`:** Extended `ConnectorType` union from 10 to 25 types; updated `DEFAULT_CONNECTOR_DIRECTIONS` to include all 25

### Architecture

- Adding a new connector now requires only creating a single file in `src/connectors/definitions/` — no changes needed to Palette, Properties, ConnectorNode, or hclGenerator
- Connector categories: API & Web, Database, Messaging, Real-time, Storage, Execution, Integration, Notifications

---

## [0.4.0] - Phase 3: Fix Foundations (Complete)

### Added

- **Step Editor (`StepEditor.tsx`):**
  - Replaces `enrich` as the primary orchestration mechanism
  - Configure multiple steps with: name, connector, operation, query, params
  - Advanced options: conditional execution (`when`), timeout, on_error (fail/skip/default)
  - Default value editor for on_error="default" steps
  - Results available as `step.name.field` in transforms

- **Response Editor (`ResponseEditor.tsx`):**
  - Configure HTTP response status code with presets (200, 201, 202, 204, 4xx, 5xx)
  - Custom response headers
  - Response body with CEL expressions
  - Body templates: "Success with data", "Created with ID", "Accepted"
  - Live HCL preview

- **Deduplication (inline in Canvas):**
  - Prevent processing duplicate events
  - Configure: storage (cache connector), key (CEL), TTL, on_duplicate (skip/error)
  - Visual indicator on flow nodes

- **Filter in `from` block:**
  - CEL expression field in flow Properties panel
  - Skip events where condition evaluates to false
  - Visual "(filtered)" indicator on flow nodes

- **Multi-to (fan-out):**
  - "Add Target" button in flow Properties
  - Each `to` block: connector, target, optional condition (`when`)
  - Per-destination transforms
  - Visual "+N more" indicator on flow nodes

### Changed

- **ErrorHandlingEditor:** Complete rewrite with three collapsible sections:
  - **Retry:** attempts, initial delay, max delay (NEW), backoff strategy, preview
  - **Fallback (NEW):** dead letter queue — connector, target, include_error, transform
  - **Error Response (NEW):** custom HTTP error — status, headers, body with CEL expressions
  - Now receives `availableConnectors` prop for fallback connector selection

- **FlowContextMenu:** Added Steps and Dedupe entries, removed legacy Enrich from menu

- **FlowNode:** New visual indicators for steps, dedupe, response, filter, multi-to count

- **Properties/FlowProperties:** Filter field in FROM section, multi-to support with add/remove targets

- **hclGenerator.ts:** Complete rewrite of flow generation:
  - Step blocks with on_error, when, timeout, params, default
  - Filter in from (string and block syntax)
  - Multi-to with per-destination when, parallel, transform
  - Dedupe block
  - Response block with headers and body
  - Fallback block in error_handling
  - Error response block in error_handling
  - Max delay in retry config
  - Redis Pub/Sub queue driver support (channels, patterns)

- **Types (`types/index.ts`):** Added FlowStep, FlowFilter, FlowDedupe, FlowResponse, FlowFallback, FlowErrorResponse; FlowTo now supports when/parallel/transform; FlowNodeData.to supports array for multi-to

### New Files

- `src/components/FlowConfig/ResponseEditor.tsx`
- `src/components/FlowConfig/StepEditor.tsx`

---

## [0.3.5] - Complete Flow Configuration (Phase 2)

### Added

- **EnrichEditor modal:**
  - Add multiple enrichment sources
  - Select connector and operation
  - Configure parameters with CEL expressions
  - Collapsible entries for complex configurations

- **LockEditor modal:**
  - Configure mutex locks for exclusive execution
  - Select storage (cache/redis connector)
  - Lock key with CEL expression patterns
  - Wait option and retry interval configuration

- **SemaphoreEditor modal:**
  - Configure concurrent execution limits
  - Preset permit counts (1, 2, 3, 5, 10, 20, 50, 100)
  - Acquire timeout and lease time configuration

- **ErrorHandlingEditor modal:**
  - Enable/disable retry with visual toggle
  - Configure max attempts (1-10)
  - Initial delay with presets
  - Backoff strategy (exponential, linear, constant)
  - Live preview of retry sequence

### Changed

- **Canvas.tsx:** Integrated all new editors with proper state management
- **TODO.md:** Phase 2 marked as complete

### New Files

- `src/components/FlowConfig/EnrichEditor.tsx`
- `src/components/FlowConfig/LockEditor.tsx`
- `src/components/FlowConfig/SemaphoreEditor.tsx`
- `src/components/FlowConfig/ErrorHandlingEditor.tsx`

---

## [0.3.4] - Flow Configuration UI (Transform, Cache)

### Added

- **Flow Context Menu (right-click on flows):**
  - Right-click on any flow node to access configuration options
  - Quick access to: Transform, Cache, Enrich, Lock, Semaphore, Response, Error Handling
  - Shows "configured" indicator for active features
  - Dark theme consistent with rest of UI

- **Transform Editor modal:**
  - Add/edit/remove field mappings (CEL expressions)
  - CEL expression templates for common patterns (uuid(), now(), lower(), etc.)
  - Support for referencing named transforms via `use`
  - Clear transform option

- **Cache Editor modal:**
  - Select cache storage from available cache connectors
  - Configure cache key (CEL expression) with pattern templates
  - TTL presets (1m, 5m, 15m, 30m, 1h, 6h, 12h, 1d, 7d)
  - Remove cache option

- **Enhanced FlowNode visual indicators:**
  - Transform badge showing field count
  - Cache badge showing TTL
  - Enrich badge showing source count
  - Icons for: Schedule, Lock/Semaphore, Cache, Enrich, Error Handling, Auth

- **HCL generation for flow blocks:**
  - Transform block with `use` and field mappings
  - Cache block with storage, key, ttl
  - Lock block with all properties
  - Semaphore block with all properties
  - Enrich blocks with params
  - Error handling block with retry config

### Changed

- **Canvas.tsx:** Added context menu handling and editor modals
- **FlowNode.tsx:** Enhanced visual feedback for configured features
- **hclGenerator.ts:** Complete flow block generation

### New Files

- `src/components/FlowConfig/FlowContextMenu.tsx`
- `src/components/FlowConfig/TransformEditor.tsx`
- `src/components/FlowConfig/CacheEditor.tsx`
- `src/components/FlowConfig/index.ts`

---

## [0.3.3] - Connector Direction (Input/Output)

### Added

- **Connector direction system:**
  - `input` (Source) - Only right handle, triggers flows (API server, queue consumer)
  - `output` (Target) - Only left handle, receives data (database, queue publisher)
  - `bidirectional` - Both handles (cache, some databases)
  - Direction selector in Properties panel
  - Visual indicator on connector nodes showing direction

- **Default directions per connector type:**
  - REST, GraphQL, gRPC, TCP, Queue → input (server/consumer)
  - Database, File, S3, Exec → output (target)
  - Cache → bidirectional

- **HCL generation with mode:**
  - Automatically adds `mode = "server/client"` based on direction
  - Queue connectors use `mode = "consumer/producer"`

### Changed

- ConnectorNode now shows/hides handles based on direction
- Colored handles: green (input), blue (output)
- Direction shown as label on connector node

---

## [0.3.2] - Multi-File Generation & Explorer Integration

### Added

- **Multi-file HCL generation:**
  - `config.hcl` - Service configuration
  - `connectors/{name}.hcl` - One file per connector
  - `flows/flows.hcl` - All flows in one file
  - Follows standard Mycel project structure

- **Validation system:**
  - Validate unique port numbers across connectors
  - Validate unique connector names (identifiers)
  - Validate unique flow names
  - Warnings displayed in Explorer and Preview panels

- **Virtual project in Explorer:**
  - Shows "Unsaved Project" when no real project is open
  - Displays generated files in proper directory structure
  - Files auto-select when component is selected on canvas
  - Directory expand/collapse functionality

### Changed

- **FileTree.tsx:** Complete rewrite to show virtual project files
  - Module-level state pattern for cross-component sync
  - `getVirtualActiveFile()` and `setVirtualActiveFile()` exports
  - Auto-selects corresponding file when canvas node is selected

- **Preview.tsx:** Simplified to sync with Explorer
  - Removed duplicate file tree sidebar
  - Now shows selected file from Explorer
  - Full-width Monaco editor

- **hclGenerator.ts:** Complete rewrite
  - `generateProject()` returns `GeneratedProject` with files array
  - `validateProject()` for port and name validation
  - `toIdentifier()` helper exported for consistent naming

---

## [0.3.1] - Git Integration

### Added

- **Git support using isomorphic-git:**
  - Pure JavaScript git implementation - runs entirely in browser
  - Works with File System Access API (Chrome/Edge)
  - `src/lib/git/index.ts` - Git service with FSA adapter
  - File status detection: modified, added, deleted, untracked
  - Current branch display in header
  - Git status indicators in FileTree (M, U, A, D)

### Changed

- **browserFS.ts:** Initializes git service when opening projects
- **useProjectStore.ts:** `refreshGitStatus()` now uses isomorphic-git
- **types.ts:** Added GitStatus and GitFileStatus exports

---

## [0.3.0] - Phase 2: Project Management & HCL Sync

### Added

- **Standalone HCL Parser (backend):**
  - `backend/parser/parser.go` - Complete HCL parser using hashicorp/hcl/v2
  - Parses all Mycel blocks: connectors, flows, types, transforms, validators, aspects, named_cache
  - Does NOT depend on Mycel codebase - fully standalone
  - `POST /api/parse` endpoint for parsing HCL content or project directories

- **HCL Generation (backend):**
  - `backend/handlers/generate.go` - Complete HCL generator
  - Generates all block types from JSON representation
  - Supports single file or multi-file output
  - `POST /api/generate` endpoint for converting canvas state to HCL

- **Browser File System Abstraction (frontend):**
  - `src/lib/fileSystem/types.ts` - Provider interfaces
  - `src/lib/fileSystem/browserFS.ts` - File System Access API (Chrome/Edge)
  - `src/lib/fileSystem/fallbackFS.ts` - ZIP import/export fallback (Safari/Firefox)
  - `src/lib/fileSystem/index.ts` - Factory pattern for provider selection
  - Automatic browser capability detection

- **Bi-directional Sync:**
  - `src/hooks/useSync.ts` - Hook for canvas ↔ HCL synchronization
  - HCL → Canvas: Parse HCL and create React Flow nodes
  - Canvas → HCL: Convert nodes to HCL and update file
  - Debounced sync (500ms) to avoid excessive updates
  - Sync lock to prevent infinite loops
  - Visual sync indicator in Editor tabs

- **Project management:**
  - `openProject()` - Opens folder (Chrome/Edge) or ZIP file (Safari/Firefox)
  - `saveProject()` - Saves dirty files to disk or downloads ZIP
  - `createFile()` / `deleteFile()` - File operations
  - Browser capability indicators in UI

### Changed

- **Architecture:** Abandoned Electron in favor of web-only + Docker
  - Reason: Go backend doesn't make sense with Electron
  - Solution: File System Access API for modern browsers, ZIP fallback for others
- **Editor.tsx:** Now triggers HCL → Canvas sync on content change
- **Canvas.tsx:** Now triggers Canvas → HCL sync when nodes change
- **package.json:** Removed Electron dependencies, simplified scripts

### Removed

- **Electron integration:** Removed entirely
  - `electron/main.ts`, `electron/preload.ts`, `electron/tsconfig.json`
  - `src/lib/fileSystem/electronFS.ts`
  - `src/utils/electron.ts`, `src/types/electron.d.ts`
  - Electron dependencies from package.json

---

## [0.2.0] - Phase 1: New UI Architecture & Mycel Model

### Added

- **IDE-style layout:**
  - New MenuBar component with File, Edit, View, Help menus
  - Sidebar with collapsible sections (Explorer + Components)
  - FileTree component with project structure and file status
  - Editor component with tabbed interface for HCL files
  - Properties panel for node configuration (dark mode)
- **Theme system:**
  - Dark mode as default
  - `useThemeStore` with persistent storage
  - Theme toggle in MenuBar
  - CSS variables for React Flow theming
  - Custom scrollbar styling for dark mode
- **Stores:**
  - `useProjectStore` for project state management
  - `useThemeStore` for theme persistence
- **UI improvements:**
  - All components updated to dark neutral color scheme
  - Custom node styles (ConnectorNode, FlowNode) for dark mode
  - Monaco Editor integration with theme support
- **Comprehensive Mycel type system:**
  - All connector types: REST, Database, Queue (RabbitMQ/Kafka), Cache (Memory/Redis), gRPC, GraphQL, TCP, File, S3, Exec
  - Complete flow model with: from, to, transform, validate, enrich, cache, lock, semaphore, coordinate, require, error_handling
  - Type definitions for schemas with field validation
  - Validator support (regex, CEL, WASM)
  - Aspect (AOP) definitions
  - Project structure types

### Changed

- **Palette:** Added new connector types (TCP, S3, Exec)
- **FlowNode:** Shows icons for schedule, lock, cache, and auth requirements
- **Properties:** Updated to handle all connector types with proper fields
- **TODO.md:** Completely rewritten based on Mycel CONCEPTS.md documentation

## [0.1.0] - 2025-01-05

### Added

- Initial project setup with frontend and backend structure
- **Frontend:**
  - React + TypeScript + Vite setup
  - React Flow canvas for visual editing
  - Drag & drop palette with connector types (REST, Database, MQ, Cache, gRPC, GraphQL, File)
  - Custom node components for connectors and flows
  - Properties panel for editing node configuration
  - HCL preview panel with Monaco Editor
  - Copy and download functionality for generated HCL
  - Zustand store for state management
  - Tailwind CSS styling
- **Backend:**
  - Go HTTP server with CORS support
  - `/api/health` endpoint for health checks
  - `/api/validate` endpoint for HCL validation (placeholder)
  - `/api/templates` endpoint with starter templates
  - Static file serving for production deployment
- **Infrastructure:**
  - Multi-stage Dockerfile for optimized builds
  - docker-compose.yml for easy local deployment
  - .gitignore with common exclusions
