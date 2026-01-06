# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - Phase 1: New UI Architecture

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
