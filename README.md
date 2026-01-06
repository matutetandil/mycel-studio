# Mycel Studio

Visual editor for creating [Mycel](https://github.com/your-org/mycel) microservice configurations.

Instead of writing HCL manually, you can:
1. Drag components (connectors, flows) onto a visual canvas
2. Connect them with arrows to define data flows
3. Configure properties in a side panel
4. Export the generated HCL configuration

## Quick Start (Docker)

```bash
docker compose up --build
```

Open http://localhost:8080 in your browser.

## Browser Compatibility

Mycel Studio uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) for native folder access.

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | Full | Works out of the box |
| Edge | Full | Works out of the box |
| Brave | Full* | Requires enabling flag (see below) |
| Firefox | ZIP mode | Uses import/export ZIP fallback |
| Safari | ZIP mode | Uses import/export ZIP fallback |

### Enabling File System Access in Brave

1. Open `brave://flags`
2. Search for "File System Access API"
3. Set to **Enabled**
4. Restart Brave

Without this flag, Mycel Studio will work in ZIP mode (import/export projects as ZIP files).

## Development Setup

### Prerequisites

- Node.js 20+
- Go 1.21+

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173

### Backend

```bash
cd backend
go run .
```

Backend runs at http://localhost:8080

## Architecture

```
mycel-studio/
├── frontend/          # React + TypeScript + React Flow
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas/      # React Flow canvas
│   │   │   ├── Nodes/       # Custom connector & flow nodes
│   │   │   ├── Palette/     # Drag & drop component palette
│   │   │   ├── Properties/  # Node property editor
│   │   │   └── Preview/     # HCL preview (Monaco Editor)
│   │   ├── stores/          # Zustand state management
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # HCL generator
│   └── ...
├── backend/           # Go HTTP server
│   └── main.go        # API handlers + static file server
├── Dockerfile         # Multi-stage build
└── docker-compose.yml
```

## Supported Connectors

| Type | Description |
|------|-------------|
| `rest` | REST API endpoint |
| `database` | Database (SQLite, PostgreSQL, MySQL, MongoDB) |
| `mq` | Message Queue (RabbitMQ, Kafka) |
| `cache` | Cache (Memory, Redis) |
| `grpc` | gRPC service |
| `graphql` | GraphQL endpoint |
| `file` | File storage (Local, S3) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/validate` | Validate HCL configuration |
| GET | `/api/templates` | Get starter templates |

## Tech Stack

- **Frontend:** React, TypeScript, React Flow, Tailwind CSS, Monaco Editor, Zustand
- **Backend:** Go
- **Deployment:** Docker
