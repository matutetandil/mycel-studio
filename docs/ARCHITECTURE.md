# Architecture

Mycel Studio is a **dual-mode application**:

| Mode | Entry Point | Frontend | Backend |
|------|-------------|----------|---------|
| Desktop (Wails) | `main.go` | Embedded via `//go:embed` | Go bindings over IPC |
| Docker (HTTP) | `cmd/server/main.go` | Static files | Go HTTP server |

Both modes share the same Go packages (`parser/`, `handlers/`, `models/`) and the same React frontend.

## Project Structure

```
mycel-studio/
├── main.go                  # Wails desktop entry point
├── app.go                   # Wails bindings (parse, generate, validate)
├── fs.go                    # Native filesystem operations
├── git.go                   # Native git integration
├── menu.go                  # Application menu
├── debug.go                 # Debug/DAP support
├── cmd/server/              # Docker HTTP server entry point
├── parser/                  # HCL parser (hashicorp/hcl/v2)
├── handlers/                # HTTP/IPC handlers
├── models/                  # Data models
├── frontend/
│   └── src/
│       ├── components/      # React components (Canvas, Nodes, Properties, etc.)
│       ├── connectors/      # Connector registry (26 definitions)
│       ├── flow-blocks/     # Flow block registry (12 definitions)
│       ├── validators/      # Validator registry (3 definitions)
│       ├── monaco/          # HCL language support for Monaco
│       ├── stores/          # Zustand state management
│       ├── hooks/           # React hooks
│       └── lib/             # File system abstraction, git, API layer
├── Dockerfile
└── docker-compose.yml
```

## Tech Stack

- **Frontend:** React 19, TypeScript, React Flow, Tailwind CSS, Monaco Editor, Zustand
- **Backend:** Go, Wails v2
- **Build:** Vite
- **Deployment:** Wails (macOS/Windows/Linux), Docker (web)
