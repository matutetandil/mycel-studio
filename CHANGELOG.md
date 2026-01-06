# Changelog

All notable changes to this project will be documented in this file.

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
