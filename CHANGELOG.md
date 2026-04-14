# Changelog

All notable changes to this project will be documented in this file.

## [2.0.1] - Terminal, Keybindings & Rename Fixes

### Fixed
- **Terminal rendering** — Increased PTY read buffer from 4KB to 64KB and pass raw bytes to xterm.js for proper UTF-8 streaming. Interactive CLI programs (Claude, htop, etc.) no longer show garbled lines or broken escape sequences.
- **File rename** — Renaming a file now updates `hclFile` references on all canvas nodes and notifies the IDE engine, preventing canvas-to-file sync from breaking after rename.
- **Cmd+Backspace** — Now deletes the entire line (IntelliJ behavior) instead of deleting from cursor to line start (VS Code default).

### Added
- **IntelliJ keybindings** — Added 6 missing bindings: Cmd+Shift+/ (block comment), F2/Shift+F2 (next/prev error), Cmd+B (go to definition), Cmd+L (go to line), Cmd+Shift+Backspace (last edit location). Total: 17 IDEA-specific bindings.

### Changed
- **Terminal font weight** — Reduced to light (300) with medium bold (500) for a softer, less heavy appearance on dark backgrounds.

## [2.0.0] - Full IDE Engine Integration & Multi-Project Infrastructure

### Added

**IDE Engine (Mycel pkg/ide integration)**
- Integrated Mycel IDE engine (`pkg/ide`) for HCL intelligence — replaces manual HCL parsing for all editor features
- Go backend now maintains a `map[string]*ide.Engine` keyed by project path; `engineForFile()` routes each request to the correct engine using longest-prefix matching
- IDE engine powers breakpoint valid locations, diagnostics, Go to Definition, and Find Usages
- Updated Mycel dependency to v1.17.2 for IDE engine bugfixes
- Skip IDE validation for non-HCL files to avoid spurious diagnostics

**Diagnostics & Code Intelligence**
- Diagnostic squiggly underlines rendered in the Monaco editor
- Diagnostic indicators on editor tabs, the file tree, and directory nodes (bubble up from children)
- Code actions surfaced from the IDE engine (quick-fix lightbulb)
- Go to Definition and Find Usages commands wired through IDE engine
- Gutter decorations for referenced lines and git blame (IntelliJ-style pixel-aligned gutter panel)

**SOLID Hints & Refactoring**
- SOLID hints panel: IDE engine emits refactoring hints (single-responsibility, extract transform, etc.)
- Hint lightbulb appears on block declaration lines with relative path display
- Refactor dialog with context-aware rename
- Extract transform refactoring action
- Rename file support with reference updates

**Git Panel**
- Full Git panel with commit graph, diff viewer, and resizable details pane
- Git blame annotations in editor gutter
- Commit highlighting and staged-status indicators
- Git staged status displayed per file in the file tree and editor tabs

**Conditional Breakpoints**
- Breakpoints support optional CEL conditions — orange indicator distinguishes conditional from unconditional breakpoints
- Inline CEL input renders below the breakpoint line in the editor
- Breakpoint valid locations resolved via IDE engine instead of manual HCL parsing

**Editor UX**
- Cursor position persisted per file; Ln/Col displayed in status bar
- Full editor view state persisted per file: scroll position, folded regions, and selections
- File preview system: hovering a file in the tree opens a transient preview tab; confirmed on edit
- Cursor-aware HCL property selection: clicking inside a block in Monaco highlights the corresponding node in the canvas and selects its properties
- Auto-focus terminal on tab switch and panel activation
- Split panels in debug view with persistent layout

**File Extension Migration**
- Project files migrated from `.hcl` to `.mycel` extension throughout the editor, file tree, and generator
- Connector registry updated to use `.mycel` as the default file extension
- Backend parser updated to handle the new extension; fallback connector path corrected

**Multi-Project Infrastructure (foundation only — Attach disabled)**
- `useMultiProjectStore` manages multiple projects in a single workspace; each project has isolated canvas state, HCL files, and git status
- Per-project debug tabs (`DebugProjectTabs`) replace the project selector dropdown
- Multi-root file tree: each attached project appears as a separate root with git branch badge
- Scoped editor tab IDs (`{projectPath}::{relativePath}`) prevent same-name files from different projects sharing a tab
- `WailsFileSystem` singleton fixed: `getCurrentPath()` now reads from the active store on every operation, preventing cross-project file writes
- Parent-child workspace architecture: `.mycel-studio.json` schema v1.1 stores `workspace.attachments` and `workspace.parent`; opening either side auto-loads the other
- Go bindings: `WriteFileAtPath()` / `ReadFileAtPath()` for cross-project file operations
- RAM usage indicator in status bar
- Attach menu item present but disabled; multi-project switching stabilized for future enablement

**Project Open Modes**
- "This Window" option in the project open dialog replaces the current project in place
- New Window option opens a project in a separate OS process (replaces the earlier instance-tab approach)
- IPC instance reuse: a second launch detects a running instance and forwards the open request to it
- Cross-platform support for New Window and IPC paths

**File & Canvas Operations**
- Delete file with confirmation dialog
- Auto-create `.mycel` files when a component is dropped onto the canvas with no file selected
- Aspect-to-flow edges fixed: HCL list values extracted correctly from source blocks

### Changed

- **Bidirectional file-canvas sync rewritten:** Uses a focus-based `editSource` state (`'monaco' | 'properties' | 'canvas' | null`) as the authoritative source of truth. Each editor surface sets/clears `editSource` on focus/blur; sync updates are gated to prevent feedback loops. Node IDs stabilized to `${type}-${sourceFile}-${name}` for reliable position and selection preservation across renames
- **Instance tabs removed:** replaced by New Window (separate OS process); workspace tabs no longer exist
- **`useProjectStore` / `useStudioStore` / `useDebugStore`:** internal architecture prepared for per-project store instances (per-project store factory and context helpers added as foundation for next phase)
- CLI install menu item removed (deferred; channel to frontend not yet implemented)

### Fixed

- Empty canvas on project open: `FullReindex` call restored after project switch
- Project switch leaving stale files from previous session in "This Window" mode
- External file refresh not propagating to editor and canvas
- Duplicate tabs on tab click and stale breakpoint click handler
- Fix breakpoint placement offset in HCL editor

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
