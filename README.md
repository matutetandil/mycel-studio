<div align="center">

<h1>Mycel Studio</h1>

<p><strong>Visual editor for <a href="https://github.com/matutetandil/mycel">Mycel</a> microservice configurations</strong></p>

<p>Design data pipelines visually, generate production-ready HCL, and debug in real time.</p>

[![Latest Release](https://img.shields.io/github/v/release/matutetandil/mycel-studio?label=release&color=blue)](https://github.com/matutetandil/mycel-studio/releases/latest)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-yellow?logo=buymeacoffee&logoColor=white)](https://buymeacoffee.com/matutetandil)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Features](#features)
- [Scope](#scope)
- [Contributing](#contributing)
- [Feedback](#feedback)
- [Documentation](#documentation)
- [License](#license)

## Overview

Mycel Studio is a desktop and web IDE for creating [Mycel](https://github.com/matutetandil/mycel) microservice configurations. Instead of writing [HCL2](https://github.com/hashicorp/hcl) by hand, you drag connectors and flows onto a canvas, wire them together, and Studio generates the configuration files.

It ships as a **cross-platform desktop app** for macOS, Windows, and Linux (via [Wails](https://wails.io/)) and as a **Docker image** for browser-based editing.

<div align="center"><img src="docs/screenshot.png" width="80%" /></div>

## Getting Started

- **macOS / Linux (one-liner)**
  ```bash
  curl -fsSL https://raw.githubusercontent.com/matutetandil/mycel-studio/main/install.sh | bash
  ```
  On macOS this installs the `.app` to `~/Applications` and removes the quarantine flag automatically.
  On Linux it installs the binary to `/usr/local/bin/mycel-studio`.

- **Windows** &mdash; Download `MycelStudio-windows-amd64.exe` (or `arm64`) from [Releases](https://github.com/matutetandil/mycel-studio/releases/latest) and run it directly. Optionally move it to a folder in your `PATH`.

- **Download binaries** &mdash; Grab the latest build for your platform from [Releases](https://github.com/matutetandil/mycel-studio/releases/latest):

  | Platform | amd64 | arm64 |
  |----------|-------|-------|
  | macOS | `MycelStudio-darwin-amd64.zip` | `MycelStudio-darwin-arm64.zip` |
  | Linux | `MycelStudio-linux-amd64` | `MycelStudio-linux-arm64` |
  | Windows | `MycelStudio-windows-amd64.exe` | `MycelStudio-windows-arm64.exe` |

- **Docker (browser)** &mdash; Run the web version in a container:
  ```bash
  docker compose up --build
  # Open http://localhost:8080
  ```

- **Build from source**
  ```bash
  # Desktop app (requires Go, Node.js, and Wails CLI)
  make build

  # Development (hot-reload)
  make dev
  ```

## Features

### IDE Engine & Code Intelligence

- **Mycel IDE engine** (`pkg/ide`) powers diagnostics, navigation, and refactoring
- **Go to Definition** and **Find Usages** across connectors, flows, types, and transforms
- **Diagnostic squiggly underlines** in the editor, tabs, and file tree with severity indicators
- **Code actions** — quick fixes suggested inline
- **SOLID hints** — lightbulb indicators with refactor dialog (extract transform, rename file, context-aware rename)
- **Conditional breakpoints** — CEL expressions with orange indicators and inline input

### Git Panel

- **Commit graph** with branch visualization and diff viewer
- **Blame annotations** in the gutter for all files
- **Staged status** indicators in tabs and file tree

### Project Management

- **New Window** — open a second project in a separate OS process (IPC-based instance reuse)
- **This Window** — replace the current project cleanly
- **Multi-project workspace** — infrastructure ready, attach coming soon
- **Explorer header** — shows `service.name` from HCL with project path and tooltip

### Visual Canvas

- Drag-and-drop **26 connector types** and **flow nodes** onto a React Flow canvas
- Auto-create flows when connecting two connectors
- Source fan-out visualization when multiple flows share a connector
- Undo/redo, copy/paste, duplicate, keyboard shortcuts

### Connectors (26 types)

| Category | Types |
|----------|-------|
| API & Web | REST, HTTP, gRPC, GraphQL, TCP, SOAP |
| Database | Database (SQLite/Postgres/MySQL/MongoDB), Cache, CDC, Elasticsearch |
| Messaging | MQ (RabbitMQ/Kafka/Redis), MQTT |
| Real-time | WebSocket, SSE |
| Storage | File, S3, FTP/SFTP, PDF |
| Execution | Exec |
| Integration | OAuth, Webhook |
| Notifications | Email, Slack, Discord, SMS, Push |

Each connector has a full configuration UI with driver-specific fields, TLS, connection pooling, retry, and CORS options.

### Flow Blocks (12 types)

| Block | Purpose |
|-------|---------|
| Transform | CEL expression field mappings |
| Step | External data enrichment from other connectors |
| Response | Output reshaping with `input.*` / `output.*` variables |
| Validate | Input/output type checking |
| Cache | Per-flow caching with TTL |
| Lock | Distributed mutex |
| Semaphore | Concurrency limiting |
| Dedupe | Event deduplication |
| Batch | ETL-style chunk processing |
| Error Handling | Retry, fallback/DLQ, error response |
| Idempotency | Storage-backed idempotency keys |
| Async | Asynchronous execution with status tracking |

### Enterprise Features

- **Sagas** &mdash; Distributed transactions with action/compensate pairs, delay, await
- **State Machines** &mdash; Entity lifecycle with states, transitions, guards, actions
- **Auth Configuration** &mdash; JWT, password policy, MFA, sessions, social login presets
- **Security** &mdash; Input sanitization limits, WASM sanitizers
- **Plugins** &mdash; Git-sourced WASM plugins with semver
- **Environment Variables** &mdash; Auto-scan `env()` references, per-environment overlays
- **Connector Profiles** &mdash; Multiple backends with CEL-based selection and fallback

### Monaco IDE

- HCL2 syntax highlighting with custom Monarch tokenizer
- Context-aware autocompletion (blocks, attributes, connector names, CEL functions)
- Hover documentation for keywords, functions, and variables
- Real-time diagnostics with squiggly underlines and code actions
- Multi-file tabbed editor with split view
- Cursor position and view state persistence per file
- Breakpoint support with JetBrains-style gutter panel and conditional CEL expressions
- IntelliJ-style gutter with blame annotations, breakpoints, and diagnostics
- Switchable keymap (IntelliJ IDEA / VS Code) with 17 IDEA-specific bindings

### HCL Generation

- Multi-file output following Mycel project structure (`config.mycel`, `connectors/`, `flows/`, `types/`, etc.)
- File-as-source-of-truth &mdash; existing `.mycel` files are never overwritten
- Backend validation via Go HCL parser (syntax, structure, semantic checks)
- Bidirectional sync between Monaco editor, canvas, and properties panel

## Scope

Mycel Studio aims to:

- Provide a visual alternative to hand-writing Mycel HCL configurations
- Support the full Mycel feature set (connectors, flows, types, validators, transforms, aspects, sagas, state machines)
- Generate valid, production-ready HCL2 that the Mycel runtime can execute
- Work as a native desktop IDE (macOS, Windows, Linux) and a browser-based editor
- Scale to multi-service repositories through multi-project workspace support

Read the [Roadmap](ROADMAP.md) for planned features and the [Changelog](CHANGELOG.md) for version history.

## Contributing

Read below how to join the project, propose new features, and improve the codebase.

- Start by reading the [Roadmap](ROADMAP.md) to understand what's planned
- Look for issues labeled [`good first issue`](https://github.com/matutetandil/mycel-studio/labels/good%20first%20issue) if you're new to the project
- PRs are welcome for bug fixes, new connector definitions, and documentation

## Feedback

- **Report bugs** via [GitHub Issues](https://github.com/matutetandil/mycel-studio/issues)
- **Propose features** by opening a [Discussion](https://github.com/matutetandil/mycel-studio/discussions)
- **Support the project** at [Buy Me a Coffee](https://buymeacoffee.com/matutetandil)

## Documentation

- [Mycel Runtime Documentation](https://github.com/matutetandil/mycel) &mdash; HCL syntax, connectors, flows
- [Architecture](docs/ARCHITECTURE.md) &mdash; Project structure and tech stack
- [Changelog](CHANGELOG.md) &mdash; Version history
- [Roadmap](ROADMAP.md) &mdash; Planned features and known gaps

## License

[MIT](LICENSE)
