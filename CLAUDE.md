# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mycel Studio** is a visual editor for creating Mycel microservice configurations.
It generates HCL files that Mycel (the runtime) interprets.

**Related project:** `/Users/matute/Documents/Personal/MYCEL` - The Mycel runtime (Go)

## Tech Stack

- **Frontend:** React + TypeScript + React Flow + Tailwind CSS + Monaco Editor
- **Backend:** Go (imports Mycel parser for validation)

## What is Mycel?

Mycel is a declarative microservice framework. Users define:
- **Connectors** - Data sources (REST, DB, Queue, Cache, gRPC, etc.)
- **Flows** - How data moves between connectors
- **Transforms** - CEL expressions to modify data
- **Types** - Validation schemas

Example HCL that Studio should generate:

```hcl
connector "api" {
  type = "rest"
  port = 3000
}

connector "db" {
  type     = "database"
  driver   = "sqlite"
  database = "./data/app.db"
}

flow "get_users" {
  from { connector = "api", operation = "GET /users" }
  to   { connector = "db", target = "users" }
}

flow "create_user" {
  from { connector = "api", operation = "POST /users" }

  transform {
    id         = "uuid()"
    email      = "lower(input.email)"
    created_at = "now()"
  }

  to { connector = "db", target = "users" }
}
```

## Visual Concepts

| HCL Concept | Visual Element |
|-------------|----------------|
| Connector | Node with icon (DB, API, Queue, Cache, gRPC) |
| Flow | Rectangle with input/output handles |
| when (cron) | Clock icon with schedule tooltip |
| Endpoints | Lollipop notation for REST/gRPC operations |
| Transform | Badge or mini-panel inside flow node |
| Connections | Directional arrows between nodes |
| Enrich | Dashed line to external data source |

## Connector Types

| Type | Icon | Config |
|------|------|--------|
| `rest` | API icon | port, cors |
| `database` | DB cylinder | driver (sqlite/postgres/mysql/mongodb), connection |
| `mq` | Queue icon | driver (rabbitmq/kafka), queue/topic |
| `cache` | Lightning | driver (memory/redis) |
| `grpc` | gRPC logo | port, proto_path |
| `graphql` | GraphQL logo | port, schema |
| `file` | Folder | driver (local/s3) |

## Commands

```bash
# Docker (recommended)
docker compose up --build

# Development - Frontend
cd frontend && npm install && npm run dev

# Development - Backend
cd backend && go run .
```

## Project Structure

```
mycel-studio/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas/        # React Flow canvas
│   │   │   ├── Nodes/         # Custom node types
│   │   │   ├── Palette/       # Drag & drop palette
│   │   │   ├── Properties/    # Node property editor
│   │   │   └── Preview/       # HCL preview (Monaco)
│   │   ├── hooks/
│   │   ├── stores/            # Zustand state
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── main.go
│   ├── handlers/
│   └── go.mod
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## API Endpoints (Backend)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/validate` | Validate HCL configuration |
| POST | `/api/generate` | Generate HCL from visual model |
| POST | `/api/parse` | Parse HCL to visual model |
| GET | `/api/templates` | Get starter templates |

## Reference Documentation

For HCL structure and connector details, see:
- `/Users/matute/Documents/Personal/MYCEL/docs/CONFIGURATION.md`
- `/Users/matute/Documents/Personal/MYCEL/docs/GETTING_STARTED.md`
- `/Users/matute/Documents/Personal/MYCEL/internal/parser/`
