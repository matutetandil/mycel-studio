# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mycel Studio** is a visual editor for creating Mycel microservice configurations.
It generates HCL2 files that Mycel (the runtime) interprets.

**Related project:** `/Users/matute/Documents/Personal/MYCEL` - The Mycel runtime (Go), currently at v1.11.0

## Tech Stack

- **Frontend:** React + TypeScript + React Flow + Tailwind CSS + Monaco Editor
- **Backend:** Go (imports Mycel parser for validation)

## What is Mycel?

Mycel is a declarative microservice framework using [HCL2](https://github.com/hashicorp/hcl) (HashiCorp Configuration Language v2). Users define:
- **Connectors** - Data sources and targets (REST, DB, Queue, Cache, gRPC, GraphQL, WebSocket, SSE, CDC, Elasticsearch, OAuth, File, S3, TCP, Exec, Notifications, MQTT, FTP/SFTP)
- **Flows** - How data moves between connectors (with steps, transforms, error handling)
- **Types** - Validation schemas
- **Aspects** - Cross-cutting concerns (AOP: before/after/around/on_error)
- **Sagas** - Distributed transactions with automatic compensation
- **State Machines** - Entity lifecycle with guards and actions
- **Long-Running Workflows** - Persistent workflows with delay/await/signal/cancel

**IMPORTANT — HCL2 Syntax Rule:** HCL2 does NOT support multiple attributes on a single line. Each attribute must be on its own line. Studio must generate multi-line blocks:

```hcl
# CORRECT — one attribute per line
from {
  connector = "api"
  operation = "GET /users"
}

# INVALID — will cause parse errors
from { connector = "api", operation = "GET /users" }
```

Example HCL2 that Studio should generate:

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
  from {
    connector = "api"
    operation = "GET /users"
  }
  to {
    connector = "db"
    target    = "users"
  }
}

flow "create_user" {
  from {
    connector = "api"
    operation = "POST /users"
  }

  transform {
    id         = "uuid()"
    email      = "lower(input.email)"
    created_at = "now()"
  }

  to {
    connector = "db"
    target    = "users"
  }

  error_handling {
    retry {
      attempts = 3
      backoff  = "exponential"
    }
    error_response {
      status = 422
      body {
        message = "error.message"
      }
    }
  }
}
```

## Visual Concepts

| HCL Concept | Visual Element |
|-------------|----------------|
| Connector | Node with icon (DB, API, Queue, Cache, gRPC, WS, etc.) |
| Flow | Rectangle with input/output handles |
| when (cron) | Clock icon with schedule tooltip |
| Endpoints | Lollipop notation for REST/gRPC operations |
| Transform | Badge or mini-panel inside flow node |
| Connections | Directional arrows between nodes |
| Step | Dashed line to external data source |
| Saga | Multi-step rectangle with compensation arrows |
| State Machine | Circle diagram with transitions |

## Connector Types (25)

| Type | Icon | Config |
|------|------|--------|
| `rest` | API icon | port, cors |
| `http` | API arrow | base_url, timeout, retry, auth |
| `database` | DB cylinder | driver (sqlite/postgres/mysql/mongodb), connection |
| `queue` | Queue icon | driver (rabbitmq/kafka/redis), queue/topic/channels |
| `mqtt` | IoT icon | broker (tcp/ssl/ws), client_id, qos (0/1/2), topic, tls, auto_reconnect |
| `ftp` | Transfer icon | protocol (ftp/sftp), host, port, base_path, key_file, passive |
| `cache` | Lightning | driver (memory/redis) |
| `grpc` | gRPC logo | port, proto_path |
| `graphql` | GraphQL logo | port, schema, federation |
| `tcp` | Socket | port, protocol |
| `file` | Folder | base_path, format (json/csv/excel/text), watch, watch_interval |
| `s3` | Cloud | bucket, region |
| `exec` | Terminal | working_dir, shell |
| `websocket` | WS icon | port, path, rooms |
| `sse` | SSE icon | port, path, heartbeat |
| `cdc` | Stream icon | driver (postgres), tables, slot |
| `elasticsearch` | Search icon | url, auth |
| `oauth` | Login icon | provider, client_id, scopes |
| `soap` | SOAP icon | driver (client/server), endpoint, namespace, version (1.1/1.2), wsdl |
| `email` | Mail icon | driver (smtp/sendgrid/ses) |
| `slack` | Slack icon | webhook_url or token + channel |
| `discord` | Discord icon | webhook_url |
| `sms` | Phone icon | provider (twilio) |
| `push` | Bell icon | provider (fcm/apns) |
| `webhook` | Hook icon | url, method |

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

For HCL2 structure and connector details, see:
- `/Users/matute/Documents/Personal/MYCEL/docs/core-concepts/` - Core concepts (connectors, flows, transforms, types, environments)
- `/Users/matute/Documents/Personal/MYCEL/docs/reference/configuration.md` - Complete HCL2 syntax reference
- `/Users/matute/Documents/Personal/MYCEL/docs/guides/error-handling.md` - Error handling guide
- `/Users/matute/Documents/Personal/MYCEL/docs/connectors/` - Individual connector docs (25 connectors)
- `/Users/matute/Documents/Personal/MYCEL/docs/guides/` - Feature guides (caching, sync, sagas, real-time, etc.)
- `/Users/matute/Documents/Personal/MYCEL/docs/advanced/` - Federation, WASM, plugins, integration patterns
- `/Users/matute/Documents/Personal/MYCEL/internal/parser/` - Parser implementation
- `/Users/matute/Documents/Personal/MYCEL/examples/` - Example configurations

## Studio Roadmap

See `ROADMAP.md` for the full implementation plan (8 phases) and `TODO.md` for the detailed feature backlog.

Key gaps vs Mycel runtime (v1.11.0):
- Steps (replaces enrich), filter, multi-to, dedupe
- Custom error responses, on-error aspects
- WebSocket, CDC, SSE, Elasticsearch, OAuth connectors
- MQTT, FTP/SFTP, SOAP connectors
- Redis Pub/Sub as queue driver
- Notification connectors (email, slack, discord, sms, push, webhook)
- Batch processing, sagas, state machines, long-running workflows
- Types, validators, auth UI, environment variables
- Security system (sanitization, WASM sanitizers)
- Plugin system (git sources, semver, WASM validators/sanitizers)
- Format declarations (JSON/XML at connector/flow/step level)
- File watch mode, CSV/TSV enhanced I/O
- Debugging (trace, breakpoints, dry-run, DAP)
