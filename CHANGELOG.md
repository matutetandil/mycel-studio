# Changelog

All notable changes to this project will be documented in this file.

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
