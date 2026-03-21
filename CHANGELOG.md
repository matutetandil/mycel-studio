# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - Multi-Project Parent-Child Architecture

### Fixed

- **Canvas empty/disordered on reopen:** Each project's `.mycel-studio.json` is now saved independently from its own snapshot. Previously, the active project's store state was written to all project files, causing incorrect node positions.
- **Same-name files both selected across projects:** Editor tab IDs are now scoped with the project path (`{projectPath}::{relativePath}`), so `config.hcl` from project A and project B are distinct tabs.
- **Git status not showing for attached projects:** Added `refreshAllProjectsGitStatus()` that polls git for all inactive projects alongside the active project refresh.

### Added

- **Persistent parent-child workspace architecture:**
  - `.mycel-studio.json` schema v1.1 with `workspace` field
  - Parent projects store `attachments` array with absolute paths to children
  - Child projects store `parent` reference to the parent project path
  - Opening a child auto-loads the parent and all siblings
  - Opening a parent auto-loads all attached children
  - Detaching removes references from both parent and child workspace files

- **Per-project workspace save (`saveAllProjectWorkspaces`):**
  - Snapshots each project independently before saving
  - Parent gets shared UI state (sidebar, terminals, breakpoints, view mode)
  - Children get only their own canvas, nodes, and editor tabs

- **Scoped editor tab IDs:**
  - `scopedPath()` / `unscopePath()` helpers in `useEditorPanelStore`
  - EditorGroup resolves content from the correct project via scoped path
  - TabBar shows project name in tooltip, switches project on tab click

- **Go bindings:** `WriteFileAtPath()`, `ReadFileAtPath()` for cross-project file operations

## [2.0.0] - Multi-Project Support

### Added

- **Multi-project store (`useMultiProjectStore.ts`):**
  - Manages multiple attached projects within a single workspace
  - Each project maintains isolated canvas state, HCL files, configuration, and git status
  - Projects can be attached and detached at runtime without losing canvas state
  - Active project switching propagates to canvas, file tree, and debug panel

- **Instance tabs (`useInstanceStore.ts`, `InstanceTabBar.tsx`):**
  - Chrome-style workspace tabs at the top of the IDE window
  - Each instance is a fully independent workspace with its own set of attached projects, layout, and editor state
  - New instances open in a clean state; existing instances persist across switches

- **Canvas as editor tab:**
  - `EditorTab` type extended with `type: 'file' | 'canvas'` and `projectId` fields
  - Canvas tabs render a React Flow instance embedded alongside Monaco editor tabs in the same tab bar
  - `openCanvas(projectId)` method in `useEditorPanelStore` opens a canvas tab for any attached project
  - `CanvasTab.tsx` — canvas-in-tab component for text-first view mode

- **CanvasPanel (`CanvasPanel.tsx`):**
  - Tab-based canvas area used in visual-first mode
  - Shows one tab per attached project when multiple projects are open
  - Switching tabs activates the corresponding project in all panels

- **Multi-root file tree:**
  - Each attached project appears as a separate root in the file explorer
  - Git branch badge displayed next to each project root
  - Click a root to switch the active project; X button to detach the project from the workspace

- **Attach/New Tab dialog (`AttachDialog.tsx`, `useProjectOpen.ts`):**
  - When opening a project while another project is already open, a dialog offers two choices:
    - "Attach to Workspace" — adds the project to the current workspace; both projects share the IDE sidebar and bottom panel with separate canvases
    - "Open in New Tab" — opens the project in a new independent instance tab
  - `useProjectOpen.ts` — hook that centralizes open-project logic and drives the dialog

- **Multi-project debug support:**
  - Project selector dropdown in `DebugToolbar` when multiple projects are attached
  - Each project stores its own Mycel runtime URL for the debug connection
  - Switching projects in the toolbar reconnects to the corresponding runtime

- **"Attach Project..." menu item:**
  - Added to the File menu in both the native macOS menu (`menu.go`) and the browser menu bar (`MenuBar.tsx`)
  - `useNativeMenu.ts` — `onAttachProject` callback wired to the native menu event

### Changed

- **`useEditorPanelStore.ts`:** `EditorTab` interface extended with optional `type`, `projectId` fields; workspace serialization skips canvas-type tabs (they are restored from project state, not serialized position)
- **`useWorkspaceStore.ts`:** Tab serialization now handles the new `type` field and omits canvas tabs from persisted state to avoid stale references on reload
- **`FileTree.tsx`:** Rewritten to support multi-root display; each project root is rendered independently with its own git status and expand/collapse state
- **`EditorGroup.tsx`:** Renders `CanvasTab` when the active tab has `type === 'canvas'`, falling back to Monaco for file tabs
- **`TabBar.tsx`:** Shows a `LayoutGrid` icon for canvas-type tabs; clicking a canvas tab activates the corresponding project in the multi-project store
- **`DebugToolbar.tsx`:** Added project selector dropdown; only visible when more than one project is attached
- **`MenuBar.tsx`:** Accepts `onNewProject` and `onOpenProject` override props so `App.tsx` can inject the attach-aware open handler
- **`App.tsx`:** Integrates `CanvasPanel`, `InstanceTabBar`, `AttachDialog`, and the `useProjectOpen` hook; routes all open-project actions through the centralized hook

### New Files

- `frontend/src/stores/useMultiProjectStore.ts`
- `frontend/src/stores/useInstanceStore.ts`
- `frontend/src/components/Canvas/CanvasPanel.tsx`
- `frontend/src/components/EditorPanel/CanvasTab.tsx`
- `frontend/src/components/InstanceTabs/InstanceTabBar.tsx`
- `frontend/src/components/AttachDialog.tsx`
- `frontend/src/hooks/useProjectOpen.ts`

---

## [1.8.4] - Aspect Connections, Git Colors & App Name

### Added

- **Bidirectional aspect↔flow connections:** Aspects and flows now have connection handles on both top and bottom edges. Edges auto-route based on relative vertical position, allowing aspects to be placed above or below flows freely
- **App name:** Renamed app bundle from `mycel-studio.app` to `Mycel Studio.app` — Dock and taskbar now show "Mycel Studio"

### Fixed

- **Git status badge color in editor tabs:** The M/U/A/D letter badge now uses the same color as the filename (e.g., sky for modified) instead of a separate amber color
- **Git ignored files color:** Changed from amber/red to gray (`text-neutral-600`) in both the file explorer and editor tabs, matching Visual Studio behavior

## [1.8.2] - Breakpoint Persistence, Debug UX & Aspect Indicators

### Added

- **Breakpoint persistence:** Breakpoints are now saved per-project in `.mycel-studio.json` and restored when reopening a project. Setting or removing breakpoints triggers auto-save
- **Breakpoints tab in debug panel:** New tab listing all active breakpoints with flow name, stage, rule index, and remove button. Tab label shows breakpoint count
- **Aspect node transform indicator:** Aspect nodes now show a Shuffle badge and "Transform (N fields)" detail when the action has a transform block
- **Aspect node condition indicator:** Filter badge shown when aspect has a conditional (`if`) expression
- **Debug connection status indicator:** Green/gray dot with "Connected"/"Disconnected" label on the right side of the debug toolbar, separated from action buttons
- **Debug Stop button:** Explicit red "Stop" button when connected (replaces the ambiguous green "Connected" toggle)

### Fixed

- **Breakpoints not sent to runtime on connect:** Fixed empty `condition: ""` being serialized in breakpoint specs which could cause runtime to reject them. Conditions are now omitted when empty
- **Silent breakpoint send failures:** Added error handling and console logging when sending breakpoints to runtime, preventing silent failures

## [1.8.1] - View Mode Fixes, Terminal CWD Persistence & Window Size

### Added

- **Window size persistence:** Desktop app saves and restores window dimensions across sessions (stored in app settings, not per-project)
- **Terminal CWD persistence:** Terminal working directories are now saved when closing the app — if you `cd` somewhere, it will restore to that directory on reopen
- **Copy file path shortcut:** `Cmd/Ctrl+Shift+V` copies the active editor tab's file path to clipboard (IntelliJ-style)
- **Workspace save on close:** App now saves workspace state (terminal CWDs, layout, etc.) immediately before closing instead of relying on debounced auto-save

### Fixed

- **View mode toggle architecture:** Fixed fundamental issue where toggling view modes swapped entire panels. Now only the Monaco editor and Canvas swap positions — the bottom panel (terminals, debug) always stays in place. In Text First mode, the bottom panel's first tab becomes "Visual Editor" (with Eye icon) showing the canvas
- **View menu structure:** View → Mode now shows "Visual First Mode" and "Text First Mode" as separate items with a checkmark on the active one (both browser and native macOS menu)
- **Terminal restore order:** Terminals now restore in the correct order (previously could swap positions due to parallel creation)
- **Cmd+Shift+V conflict:** Removed view mode toggle from this shortcut — now used for Copy Path only. View mode is accessible via View menu

## [1.8.0] - View Modes, Notification System & UX Improvements

### Added

- **Visual First / Text First view modes:** Toggle between canvas-primary (default) and editor-primary layouts. In Text First mode, Monaco editor takes the main area and canvas becomes a resizable preview panel. Toggle via View menu, `Cmd/Ctrl+Shift+V`, or native macOS menu
- **Auto-switch to Text First on debug breakpoint:** When the debugger stops at a breakpoint, the view automatically switches to Text First for a better code debugging experience
- **IDE-style notification system:** Toast notifications (bottom-right) with type indicators (info, warning, error, success), action buttons, auto-hide timers, and click-to-expand popup
- **Notification popup:** IntelliJ-style notification list with 1/N navigation, time-ago timestamps, clear all, and dismiss individual notifications
- **Update notifications via toast:** "Update available" and "Update installed" now appear as toast notifications with "Update Now", "What's New", and "Later" action buttons
- **What's New dialog:** Shows release notes for new versions with Update Now / Update Later buttons
- **Update progress in status bar:** Download progress (percentage + progress bar) appears in the status bar instead of a banner
- **Notification bell in status bar:** Shows notification count badge, click to open notification popup
- **View mode persisted in workspace:** `.mycel-studio.json` saves/restores view mode with the project

### Fixed

- **Terminal name persistence:** Terminal names are now restored when reopening a project (previously always reset to "Terminal 1", "Terminal 2", etc.)
- **Git status in editor tabs:** File tabs now show git status with colored filenames (sky for modified, green for new/added, red for deleted) and badge letters (M, U, A, D) matching the file explorer

## [1.7.2] - Terminal Padding & Update Restart Fix

### Fixed

- **Terminal text clipped at bottom:** added 6px bottom padding so descender letters (g, j, p, q, y) are no longer cut off on the last visible line
- **Quit confirmation on update restart:** "Are you sure you want to quit?" dialog no longer appears when restarting after an auto-update

## [1.7.1] - Context-Aware Source Properties & From Block Fixes

### Added

- **Context-aware `from` block properties:** The flow source panel now shows contextual fields depending on the source connector type:
  - REST: label "HTTP Method + Path", placeholder `GET /users/:id`
  - GraphQL: "GraphQL Operation", placeholder `Query.users or Mutation.createUser`
  - gRPC: "RPC Method", placeholder `UserService/CreateUser`
  - SOAP/TCP: contextual labels and placeholders
  - RabbitMQ: "Routing Key" with AMQP wildcard hints (`*`/`#`)
  - Kafka: "Topic"
  - Redis Pub/Sub: "Channel Pattern" with glob hint
  - MQTT: "Topic Pattern" with MQTT wildcard hints (`+`/`#`)
  - WebSocket: dropdown with connect/disconnect/message events
  - SSE: dropdown with connect/disconnect events
  - CDC: "Trigger:Table", placeholder `INSERT:users`
  - File watch: "File Pattern", placeholder `*.csv`

- **Input variables reference tooltip:** collapsible "Available input variables" section in `from` block shows all `input.*` variables available for each connector type (helps writing transforms and CEL)

- **Format selector in `from` block:** json/xml/csv input format override

- **MQ filter block fields:** when source is a message queue and filter is set, shows On Reject (ack/reject/requeue), ID Field (dedup key), Max Requeue options

### Fixed

- **`from` block not loading filter and format from HCL files:** backend handler now passes `filter` and `format` fields from parsed `from` blocks
- **"Raw SQL (optional)" label:** renamed to "Query" with clearer help text

## [1.7.0] - Context-Aware Destination Properties & App Lifecycle

### Added

- **Context-aware `to` block properties:** The flow destination panel now shows different fields depending on the target connector type:
  - Database (SQL): table, operation (INSERT/UPDATE/DELETE), raw SQL query with named parameters
  - MongoDB: collection, operation (INSERT_ONE/UPDATE_ONE/etc.), query_filter, update document, upsert
  - RabbitMQ: routing key, exchange
  - Kafka: topic
  - Redis Pub/Sub: channel
  - MQTT: topic, QoS level, retain flag
  - HTTP Client: endpoint path, HTTP method override
  - GraphQL Client: full query/mutation string
  - gRPC/SOAP: method/operation name
  - File: file path, operation (WRITE/DELETE/COPY/MOVE), format, append, Excel sheet name
  - S3: object key, operation (PUT/DELETE/COPY), content type, storage class, ACL
  - Exec: command, arguments, stdin
  - Elasticsearch: index, operation (index/update/delete/bulk)
  - PDF: template fallback, operation (generate/save)
  - WebSocket/SSE: room, operation (broadcast/send_to_room/send_to_user)
  - Notification connectors (Email, Slack, Discord, SMS, Push): info note about transform block
  - Cache: key, operation (SET/DELETE)

- **Confirm before closing (desktop):** native dialog asks "Are you sure you want to quit?" with option to disable in Settings
- **Auto-reopen last project on startup:** remembers and reopens the last opened project
- **Settings persistence to Go backend:** `confirmOnClose` setting syncs to native dialog on startup and on change

### Changed

- **FlowTo type extended** with `format`, `query_filter`, `update`, `params` fields
- **HCL generator** now emits `query`, `format`, `query_filter`, `update`, and `params` blocks in `to`
- **Backend parser** now parses map-type attributes (`params`, `query_filter`, `update`) and new string fields (`format`, `exchange`, `operation`) from `to` blocks

## [1.6.1] - Sync Fixes & Visual Polish

### Added

- **Settings in native macOS menu:** View > Settings... (`Cmd+,`) now works in desktop app
- **Selected edge styling:** edges glow indigo with thicker stroke when selected

### Fixed

- **Properties→File sync losing focus:** suppression flag now set before file writes (Zustand subscribers are synchronous)
- **Git ignored files not shown:** added `--ignored` flag to `git status` command
- **Git status badge color:** M/U/A/D badge now matches the file name color

## [1.6.0] - Bidirectional Sync, Settings & UX Improvements

### Added

- **Settings dialog** (`Ctrl+,` or View > Settings):
  - Keymap selection: IntelliJ IDEA (default) or Visual Studio Code
  - Persisted in localStorage, extensible for future settings

- **IntelliJ IDEA keybindings** for Monaco editor:
  - `Ctrl+D` duplicate line, `Ctrl+Y` delete line
  - `Ctrl+W` / `Ctrl+Shift+W` expand/shrink selection
  - `Alt+Shift+Up/Down` move line, `Ctrl+Shift+J` join lines
  - `Ctrl+Alt+L` reformat, `Ctrl+Shift+U` toggle case, `Alt+Enter` quick fix

- **Bidirectional sync between Properties panel and HCL files:**
  - Properties → File: editing a connector property (e.g., Slack channel) now updates the HCL file automatically
  - File → Properties: editing HCL in Monaco updates the Properties panel
  - Handles block renames, debounced writes, loop prevention via suppression flags

- **Git status colors in file tree** (IntelliJ-style):
  - Modified files: blue, New/untracked: green, Ignored: orange
  - Directories inherit status from children (all-ignored dirs shown in orange)

### Fixed

- **Auto-save not triggering on editor blur:** now fires when Monaco loses focus (clicking canvas, properties, etc.), not just on window blur
- **Editor tab jumping:** no longer switches back to the selected node's file while editing another file
- **Directory text color:** directories now use the same base color as files instead of gray

## [1.5.0] - Auto-Update System

### Added

- **In-app auto-update system:**
  - Checks GitHub Releases on startup (after 3s delay)
  - Notification banner with version info, release notes link, and "Update Now" button
  - Downloads update with progress bar and SHA-256 checksum verification
  - Platform-specific installation: replaces `.app` bundle (macOS), binary swap (Linux), rename trick (Windows)
  - "Restart Now" button to apply update immediately
  - Manual check via Help → Check for Updates...
  - Skips check in development builds (`version = "dev"`)
  - Cleans up leftover `.old` files from previous updates on startup

### Fixed

- **install.sh not upgrading:** Existing `.app` bundle is now removed before extracting (avoids `unzip` interactive prompt). Correct `.app` name (`mycel-studio.app`). Linux binary uses `mv -f` for force overwrite
- **install.sh checksum verification:** Downloads and verifies SHA-256 checksums from release assets

## [1.4.0] - Status Bar, Git Gutter & Terminal Fix

### Added

- **Status bar** at the bottom of the window (IntelliJ-style):
  - Shows current git branch (left) and project name (right)
  - Minimal 24px height, ready for additional status indicators

- **Git status auto-refresh** via polling (every 3 seconds):
  - File tree indicators (U/M/A/D) now update automatically after external git operations
  - No more stale status after `git add`, `commit`, etc.

- **Monaco git gutter decorations:**
  - Green bar for added lines, blue for modified, red triangle for deleted
  - Computes line-by-line diff against git HEAD content
  - Updates in real-time as you edit files

### Fixed

- **Terminal not showing prompt**: Shell now starts as login shell (`-l`) and inherits full system PATH instead of a hardcoded subset

## [1.3.0] - CI/CD & Installer

### Added

- **GitHub Actions release workflow** (`.github/workflows/release.yml`):
  - Triggered on `v*` tags
  - Builds for 6 platforms: macOS (amd64/arm64), Linux (amd64/arm64), Windows (amd64/arm64)
  - Uses Wails build with version injection from package.json
  - Creates GitHub Release with auto-generated release notes and all binaries

- **One-liner installer script** (`install.sh`):
  - macOS: downloads `.app` zip, extracts to `~/Applications`, removes quarantine flag (`xattr -cr`)
  - Linux: downloads binary to `/usr/local/bin/mycel-studio`
  - Auto-detects OS and architecture (amd64/arm64)
  - Fetches latest release from GitHub API

- **Updated README** with installation instructions (one-liner, releases, Docker, build from source)

## [1.2.0] - Connector Alignment, File Picker & README Rewrite

### Added

- **File picker field type** for connector properties:
  - New `file` field type in connector definition system
  - Text input + Browse button that lists project files filtered by extension
  - Open in Editor button to edit selected template files in Monaco
  - Only shows files from the open project (relative to `config.hcl` root)

- **PDF connector aligned with Mycel v1.14.3:**
  - `template` field (HTML file picker, `.html/.htm`)
  - `page_size` (A4/Letter/Legal), `font`, margins (`margin_left/top/right`), `output_dir`
  - Removed non-existent `template_dir`/`default_template` fields

- **Email connector aligned with Mycel v1.14.3:**
  - `template` field (HTML file picker, `.html/.htm`) at connector config level
  - `from_name`, `reply_to` common fields
  - SMTP: `timeout`, `pool_size`
  - SendGrid: `endpoint`, `timeout`
  - SES: `configuration_set`, `timeout`

- **File connector CSV options:**
  - `lines` format option
  - `csv_delimiter` (comma/tab/semicolon/pipe), `csv_comment`, `csv_skip_rows`, `csv_no_header`, `csv_trim_space`
  - All CSV fields conditionally visible when format is `csv`

- **README rewrite** following Eclipse Theia format:
  - Centered header with badges (PRs Welcome, Buy Me a Coffee)
  - Table of contents, screenshot, architecture diagram
  - Accurate feature tables (26 connectors, 12 flow blocks)
  - Updated project structure reflecting Wails dual-mode architecture

- **Buy Me a Coffee badge** in README header

### Changed

- Wails upgraded from v2.9.3 to v2.11.0
- Native macOS About dialog shows version and buymeacoffee URL as text
- `FieldType` union extended with `'file'`
- `FieldDefinition` extended with `fileExtensions` property
- Screenshot moved from `icons/` to `docs/`

## [1.1.0] - About Dialog, Missing Features & Breakpoint Styling

### Added

- **Custom About dialog (`AboutDialog.tsx`):**
  - Version display (v1.1.0), project description
  - Clickable Buy Me a Coffee button (amber styled with heart icon)
  - GitHub and Source Code links
  - Opens via Help → About Mycel Studio (native macOS menu) or browser menu bar

- **Native macOS menu integration for About:**
  - `menu.go` emits `menu:show-about` event from Help menu
  - `useNativeMenu.ts` listens for event and triggers React dialog
  - `App.tsx` manages dialog state for both native and browser modes

- **Idempotency flow block (`flow-blocks/definitions/idempotency.ts`):**
  - Storage selector, CEL key expression, TTL duration
  - Auto-generates HCL via simple block registry

- **Async execution flow block (`flow-blocks/definitions/async.ts`):**
  - Storage selector, TTL duration
  - Auto-generates HCL via simple block registry

- **PDF connector (`connectors/definitions/pdf.ts`):**
  - Template directory, default template, output directory
  - Category: Storage, direction: output

- **Internal flows:**
  - `isInternal` toggle in FlowProperties
  - Internal flows skip `from` block in HCL generation
  - `EyeOff` icon indicator on flow nodes

- **Source fan-out visualization:**
  - `ConnectorNode` detects when multiple flows share the same source connector
  - Shows `GitFork + count` badge when fanOutCount > 1

- **JetBrains-style breakpoints in Monaco editor:**
  - Red circle replaces line number (not in glyph margin)
  - Faded red hint on hover over line numbers
  - Yellow arrow indicator for stopped-at line
  - CSS-only implementation via `lineNumberClassName` decorations

### Changed

- `FlowNode.tsx` — Added Fingerprint, Timer, EyeOff indicators
- `ConnectorNode.tsx` — Added useStore for edge counting, fan-out badge
- `Properties.tsx` — Added isInternal toggle, conditional FROM section
- `hclGenerator.ts` — Guard for internal flows, idempotency/async via registry
- `types/index.ts` — Added FlowIdempotency, FlowAsync, isInternal, pdf connector type
- `FileTree.tsx` — Changed "Open Folder..." to "Open Project..."

## [1.0.0] - Wails Desktop App + Aspect Enhancements

### Added

- **Wails v2 desktop application:**
  - Native macOS app (10MB binary) with embedded WebView
  - Native file system access via Go `os` package (no more browser File System Access API limitations)
  - Native git integration via system `git` command
  - `OpenDirectoryDialog()` — native macOS folder picker
  - `ReadDirectoryTree()` — recursive directory scan with binary/large file filtering
  - `ReadFile()` / `WriteFile()` / `DeleteFile()` / `CreateDirectory()` — full CRUD
  - `GetGitStatus()` / `GetGitBranch()` / `GetGitFileStatuses()` — git porcelain parsing
  - `ParseHCL()` / `GenerateHCL()` / `ValidateHCL()` — Go parser exposed as IPC bindings

- **Dual-mode architecture:**
  - `main.go` — Wails desktop entry point (embeds frontend via `//go:embed`)
  - `cmd/server/main.go` — Docker HTTP server entry point (no embed, separate binary)
  - Both share the same `parser/`, `handlers/`, `models/` packages

- **API abstraction layer (`lib/api.ts`):**
  - Detects runtime (Wails IPC vs HTTP) via `window.go` presence
  - `apiParse()` / `apiGenerate()` — transparent routing to Go bindings or HTTP endpoints
  - No static imports of Wails bindings (avoids build failures in browser mode)

- **Wails filesystem provider (`lib/fileSystem/wailsFS.ts`):**
  - Implements `FileSystemProvider` interface using Wails Go bindings
  - Auto-detected by factory when running as desktop app
  - Full git status support via native git

- **Aspect flow actions (Mycel v1.12.3):**
  - Aspects can now invoke flows: `action { flow = "name" }` (mutually exclusive with `connector`)
  - Flow selector dropdown in AspectProperties (populated from canvas flow nodes)
  - Operation field for connector-based actions
  - Virtual edges from aspect to targeted flow (green dashed lines)
  - AspectNode shows "Flow → name" (green) vs "Action → connector" (blue)

- **Aspect response enrichment (Mycel v1.13.0):**
  - `response {}` block for `after` aspects with headers and CEL field expressions
  - Response enrichment section in AspectProperties (only shown for `after` aspects)
  - HCL generation: `response { headers { ... } field = "expr" }`

### Changed

- **Go module restructured:** `github.com/mycel-studio/backend` → `mycel-studio` at project root
- `useSync.ts` — Uses `apiParse`/`apiGenerate` instead of direct `fetch()` calls
- `useProjectStore.ts` — Uses `apiParse` instead of direct `fetch()` calls
- `fileSystem/index.ts` — Factory now checks for Wails runtime before browser/fallback
- `tsconfig.app.json` — `erasableSyntaxOnly: false` to support Wails-generated namespace syntax
- `.gitignore` — Added `build/bin/`, `frontend/src/wailsjs/`

### Removed

- `server.go` at root level (redundant with `cmd/server/main.go`)
- `MYCEL_MODE` environment variable check in `main.go`

## [0.15.0] - File-as-Source-of-Truth Architecture

### Added

- **Mycel root detection** — Detects `config.hcl` location to determine the root directory for all Mycel files (e.g., `src/`). All generated paths are relative to this root
- **Source file tracking** — Backend parser now tracks which file each block was parsed from (`sourceFile`), carried through to canvas nodes via `hclFile` property
- **Full project parsing** — Types, transforms, validators, and aspects are now parsed from HCL and rendered as canvas nodes (previously only connectors and flows)
- **`.env` file loading** — Parses `.env` files on project open and populates the environment variables panel. Detects secrets via `.env.example`
- **Resizable sidebar sections** — Explorer and Components sections have a draggable divider to adjust relative heights
- **Layout persistence stores** — `useLayoutStore` for panel widths/collapse state, `useWorkspaceStore` for canvas viewport persistence
- **Aspect edge visualization** — Virtual edges from aspect nodes to matched flows (glob pattern) and action connectors
- **Workspace persistence hook** — `useWorkspacePersistence` auto-saves canvas viewport and node positions

### Fixed

- **Files no longer overwritten by generator** — Existing HCL files on disk are never regenerated or modified. The canvas reads from files; only new nodes generate new files
- **`syncToHCL` disabled for open projects** — Canvas-to-HCL sync via backend was corrupting files with Go's `map[]` format. Disabled when a project is open (files on disk are source of truth)
- **Hyphen preservation in identifiers** — `toIdentifier()` now preserves hyphens (`sales-consultant-queue` stays as-is instead of becoming `salesconsultantqueue`)
- **Generated paths match real paths** — Generator prefixes all paths with `mycelRoot` so `connectors/x.hcl` becomes `src/connectors/x.hcl` when config.hcl is in `src/`
- **Save now persists new files** — `saveProject()` merges generated files for new canvas nodes with existing project files before writing to disk
- **`config.hcl` no longer regenerated** — `existingPaths` check prevents overwriting existing config

### Changed

- **`generateProject()` signature** — Now accepts `mycelRoot` and `existingPaths` parameters to support the file-as-source-of-truth architecture
- **Node types extended with `hclFile`** — `TypeNodeData`, `TransformNodeData`, `ValidatorNodeData`, `AspectNodeData`, `SagaNodeData`, `StateMachineNodeData` all track their source file

## [0.14.0] - UX Improvements & Connector Cleanup

### Added

- **Per-flow HCL file selection** — Flow properties now include a file selector to choose which `.hcl` file the flow belongs to (or create a new one)
- **Scroll to flow in shared files** — When selecting a flow in the canvas, the editor scrolls to the exact line where that flow starts (works for all block types: flows, types, validators, etc.)
- **Tab-to-canvas sync** — Clicking an editor tab now selects the corresponding node in the canvas (connectors, flows, types, etc.) with visual highlighting
- **Canvas-to-editor sync** — Selecting a node in the canvas programmatically highlights it in React Flow
- **Env var toggle on fields** — String/number/password fields now have a toggle to switch between free text and env variable selection (auto-generates `env("VAR_NAME")`)
- **Env var centered popup** — Edit/add variable dialog is now a real centered modal via `createPortal`
- **IntelliJ-style add variable** — Always-visible inline input at top of env panel (no scroll needed)
- **RabbitMQ full config** — Host, port, username, password, vhost, URL override, heartbeat, reconnect, TLS, consumer block (queue, prefetch, auto_ack, workers, tag, exclusive), DLQ, publisher (exchange, routing_key, confirms), exchange declaration
- **Kafka full config** — Brokers, client_id, TLS, SASL (PLAIN/SCRAM), consumer (group_id, topics, offset, auto_commit, concurrency), producer (topic, acks, batch_size, compression), schema registry
- **MQ HCL sub-blocks** — Generates proper `consumer {}`, `publisher {}`, `producer {}`, `exchange {}`, `dlq {}`, `sasl {}`, `schema_registry {}` blocks

### Fixed

- **`env()` expression escaping** — Values like `env("DB_HOST")` now generate `host = env("DB_HOST")` unquoted
- **Queue type renamed to `mq`** — Aligns with Mycel runtime
- **Removed non-existent `mode` field** — `mode` was being generated in HCL but doesn't exist in Mycel
- **Tab proliferation on rename** — Renaming a connector no longer creates new tabs per keystroke; tabs are renamed in-place
- **gRPC client field naming** — Renamed `address` to `target`
- **SSE heartbeat naming** — Renamed `heartbeat_interval` to `heartbeat`

## [0.13.0] - Connector Alignment with Mycel Runtime

### Fixed

- **Queue type renamed to `mq`** — Aligns with Mycel runtime's `type = "mq"` (was incorrectly `"queue"`)
- **`env()` expression escaping** — Values like `env("DB_HOST")` now generate `host = env("DB_HOST")` instead of `host = "env(\"DB_HOST\")"`
- **gRPC client field naming** — Renamed `address` to `target` to match Mycel docs
- **SSE heartbeat naming** — Renamed `heartbeat_interval` to `heartbeat` to match Mycel docs

### Added

- **Environment Variables panel** — Always-visible panel at bottom ~30% of Properties sidebar with resizable split divider
- **REST CORS expansion** — Full CORS configuration: origins, methods, headers (was boolean-only)
- **Database connection pooling** — `pool_max`, `pool_min`, `pool_max_lifetime` for Postgres/MySQL
- **HTTP client retry** — Retry block with count, interval, backoff; added `oauth2` auth type
- **gRPC TLS & limits** — TLS block, `proto_files`, `max_recv_mb`, `max_send_mb`
- **MQTT TLS & timeouts** — TLS block, `connect_timeout`, `keep_alive`, `clean_session`, `max_reconnect_interval`
- **GraphQL server options** — `playground_path`, `introspection`, CORS fields
- **Cache Redis options** — `default_ttl`, connection pool fields
- **File connector** — Added `binary` format, `create_dirs`, `permissions`
- **S3 MinIO support** — `force_path_style` for MinIO compatibility
- **Exec connector** — `input_format`, `output_format`, retry fields
- **HCL block generation** — Proper `cors {}`, `tls {}`, `pool {}`, `retry {}` sub-blocks

## [0.12.0] - Auto-save, Connector Profiles & Backend Validation

### Added

- **Auto-save (Phase 8.5):**
  - `useAutoSave` hook with debounced file writes
  - Subscribes to Zustand store changes, saves when dirty files exist
  - Configurable debounce interval (default 2000ms)
  - Status tracking: idle → saving → saved → error
  - Toggle in ServiceProperties (only shown when project is open)

- **Connector Profiles (Phase 6.6):**
  - `ConnectorProfile` and `ConnectorProfileConfig` types
  - `ProfilesEditor` component in Properties panel
  - CEL-based profile selection (`select` expression)
  - Default profile and fallback chain configuration
  - Per-profile config fields matching connector type
  - Optional per-profile transform overrides
  - HCL generation: `select`, `default`, `fallback`, `profile` blocks

- **Backend Validation (Phase 8.6):**
  - `ValidateContent()` method with 3-step validation pipeline
  - Step 1: HCL syntax validation (parse errors with line numbers)
  - Step 2: Structure validation against extended schema
  - Step 3: Semantic validation (duplicate names, missing attributes, undefined references)
  - Extended `rootSchema` with saga, state_machine, auth, security, plugin, workflow, batch, environment
  - Structured `ValidationError` with message, file, line, column, severity
  - Multi-file validation support in `/api/validate` endpoint

## [0.11.0] - Phase 9: Monaco IDE Enhancement

### Added

- **HCL Syntax Highlighting (9.1):**
  - Monarch tokenizer for HCL2 with full token classification
  - Top-level blocks, sub-blocks, built-in functions, context variables
  - String interpolation (`${...}`) and heredoc support
  - Custom dark theme (`mycel-dark`) and light theme (`mycel-light`)
  - Color-coded: keywords (purple), sub-blocks (blue), strings (orange), numbers (green), functions (yellow), comments (green italic), context vars (cyan italic), block names (teal bold)

- **Context-Aware Autocompletion (9.2):**
  - Top-level block snippets (connector, flow, type, saga, etc.)
  - Connector attributes based on current block context
  - Flow sub-block snippets (from, to, step, transform, response, etc.)
  - Connector type values from registry (25 types)
  - Driver values, backoff strategies, on_error strategies
  - Connector name references from canvas state (dynamic)
  - CEL function completions with signatures
  - Context variable suggestions (input.*, output.*, step.*, etc.)
  - Nested block awareness (retry, cache, lock, semaphore, etc.)

- **Hover Information (9.4):**
  - Block keyword documentation with examples
  - Connector type descriptions
  - CEL function signatures and descriptions
  - Context variable documentation
  - Attribute documentation (port, driver, timeout, etc.)

- **Client-Side Validation (9.3):**
  - Real-time syntax validation with error markers (squiggles)
  - Unclosed strings, unmatched braces, unclosed block comments
  - Malformed attribute assignments (warnings)
  - Debounced validation (500ms) for performance

- **Shared Documentation Data:**
  - `hclDocs.ts` — Comprehensive docs for blocks, CEL functions, variables, connector types
  - Used by both completion and hover providers

### Changed

- `Preview.tsx` — Uses `mycel-dark` theme and `beforeMount` for language registration
- `Editor.tsx` — Uses custom themes, `beforeMount` for registration, `onMount` for validation wiring

### New Files

- `frontend/src/monaco/index.ts` — Entry point with idempotent `setupMonaco()`
- `frontend/src/monaco/hclLanguage.ts` — Monarch tokenizer and language configuration
- `frontend/src/monaco/hclTheme.ts` — Dark and light themes
- `frontend/src/monaco/hclDocs.ts` — Shared documentation data
- `frontend/src/monaco/hclCompletionProvider.ts` — Context-aware completion provider
- `frontend/src/monaco/hclHoverProvider.ts` — Hover tooltip provider
- `frontend/src/monaco/hclValidator.ts` — Client-side validation and marker management

## [0.10.0] - Phase 8: UX Polish

### Added

- **Undo/Redo (8.1):**
  - `useHistoryStore.ts` — Snapshot-based history with configurable max depth (50)
  - Tracks: node add/remove/update, edge connect/remove, node drag
  - Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z (redo)
  - Menu bar Edit menu shows enabled/disabled state

- **Copy/Paste (8.2):**
  - Copy selected node with Ctrl+C, paste with Ctrl+V (offset +50px)
  - Duplicate in-place with Ctrl+D
  - Clipboard persists across paste operations
  - Menu bar Edit menu with copy/paste/duplicate

- **Keyboard Shortcuts (8.3):**
  - `useKeyboardShortcuts.ts` — Global shortcut handler
  - `ShortcutsDialog.tsx` — Modal showing all available shortcuts (Ctrl+/)
  - Skips shortcuts when typing in inputs, textareas, or Monaco editor
  - Platform-aware key labels (Cmd on Mac, Ctrl on others)

- **Template Gallery (8.4):**
  - `templates.ts` — 6 pre-built project templates
  - `TemplateGallery.tsx` — Modal with categorized template browser
  - Templates: REST+DB CRUD, GraphQL+DB, Scheduled Job, Event Processing, Real-time WebSocket, Order Saga
  - Categories: Basic, Messaging, Real-time, Enterprise
  - Ctrl+N or File > New from Template

### Changed

- `useStudioStore.ts` — Added clipboard state, undo/redo/copy/paste/duplicate/loadTemplate methods
- `MenuBar.tsx` — Edit menu now functional (undo/redo/copy/paste/duplicate), File menu has template entry
- `Canvas.tsx` — Saves snapshot on node drag start for undo support
- `App.tsx` — Integrates keyboard shortcuts hook, shortcuts dialog, and template gallery

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
