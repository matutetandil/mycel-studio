# CLAUDE.local.md

## Workflow Preferences

- Me puedes hablar en español, pero todos los cambios de código y comentarios que hagas deben estar siempre en inglés
- Siempre que hagamos cambios en el código o agreguemos funcionalidades, debemos mantener el README y los archivos relacionados actualizados
- El README debe ser útil tanto para las personas, como para vos así sabés de qué se trata y qué estado tiene todo lo que estamos creando
- Cada vez que te pida hacer un commit, evita cualquier referencia a Claude o Claude Code. Incluso omití referencia a co-creators y demás. Hacelo siempre en inglés
- Mantené una sección en este archivo (editable solo por vos), como una bitácora persistente, anotando todo el progreso que vayamos haciendo así en el caso de que la sesión se pierda, se caiga la conexión, se apague la computadora o cualquier otra cosa, sepas exactamente en qué punto estábamos.
- Creá y mantené un archivo CHANGELOG.md con todas las modificaciones vayamos haciendo, versión a versión.

---

## ¿Qué es Mycel Studio?

**Mycel Studio es un editor visual para crear configuraciones de microservicios Mycel.**

En vez de escribir HCL manualmente, el usuario:
1. Arrastra componentes (connectors, flows) a un canvas
2. Los conecta visualmente con flechas
3. Configura propiedades en un panel lateral
4. Exporta el HCL generado

**Es como un Figma/Draw.io pero para configurar microservicios.**

---

## Bitácora de Desarrollo (Claude)

### 2025-01-05 - Estructura inicial completa
- **Estado:** v0.1.0 - Estructura base funcional
- **Frontend creado:**
  - Vite + React + TypeScript configurado
  - React Flow canvas con drag & drop
  - Nodos custom para Connectors y Flows
  - Palette con todos los tipos de conectores
  - Panel de propiedades para editar nodos
  - Preview con Monaco Editor para ver HCL generado
  - Zustand store para state management
  - Tailwind CSS configurado
- **Backend creado:**
  - Go HTTP server con CORS
  - Endpoints: /api/health, /api/validate, /api/templates
  - Servicio de archivos estáticos para producción
- **Infraestructura:**
  - Dockerfile multi-stage
  - docker-compose.yml
  - .gitignore
- **Documentación:**
  - README.md completo
  - CHANGELOG.md iniciado
  - CLAUDE.md actualizado
- **Testeado:** `docker compose up --build` funciona correctamente
- **Commit inicial:** Realizado

### 2025-01-05 - Análisis completo de features faltantes
- **Estado:** Backlog documentado en TODO.md
- Revisada documentación completa de Mycel:
  - CONFIGURATION.md - Todos los conectores y sus campos
  - GETTING_STARTED.md - Estructura de archivos (múltiples .hcl)
  - transformations.md - CEL y transforms
  - AUTH.md - Sistema de autenticación completo
  - OBSERVABILITY.md - Métricas y health checks
- **Problemas identificados:**
  1. Conectores de DB piden URL genérica en vez de campos específicos por driver
  2. Se genera un solo archivo HCL, pero deberían ser varios (service.hcl, connectors.hcl, flows.hcl, etc.)
  3. Faltan muchos tipos de conectores y opciones
  4. No hay soporte para: types, transforms, auth, sync, enrich, cache
  5. No hay dark mode
- **Creado:** TODO.md con backlog completo organizado por fases
- **Agregado:** Nuevos requerimientos de arquitectura:
  1. Project management (abrir/guardar proyectos, archivo `.mycel-studio.json` para posiciones)
  2. Editor HCL completo y editable (bi-direccional con canvas)
  3. Nueva UI estilo IDE (file tree + canvas + editor + properties)
- **Reorganizado:** Fases de desarrollo (ahora 7 fases)
- **Agregado:** Git integration (Fase 2):
  - File status en tree (modified, new, ignored)
  - Inline diff en editor
  - Git Blame/Annotate
  - Branch en status bar
- **Próximo paso:** Implementar Fase 1 (nueva arquitectura UI + dark mode)

### 2026-01-05 - Fase 1: Nueva arquitectura UI y Dark Mode
- **Estado:** En progreso - UI principal implementada
- **Nuevos componentes creados:**
  - `useThemeStore.ts` - Store para persistir tema (dark/light)
  - `useProjectStore.ts` - Store para estado del proyecto (archivos, metadata)
  - `MenuBar.tsx` - Barra de menú estilo IDE con File, Edit, View, Help
  - `Sidebar.tsx` - Sidebar con secciones colapsables
  - `FileTree.tsx` - Árbol de archivos con indicadores de git status
  - `Editor.tsx` - Editor con tabs para archivos HCL
- **Componentes actualizados para dark mode:**
  - `App.tsx` - Nuevo layout IDE-style
  - `Properties.tsx` - Panel de propiedades con colores neutrales
  - `Canvas.tsx` - Canvas con fondo oscuro y CSS variables
  - `ConnectorNode.tsx` - Nodos con tema oscuro
  - `FlowNode.tsx` - Nodos con tema oscuro
  - `Preview.tsx` - Preview con colores neutrales
  - `Palette.tsx` - Paleta más compacta para sidebar
- **CSS actualizado:**
  - `index.css` - Variables CSS para React Flow, scrollbars custom
- **Build:** Docker build exitoso
- **Próximo paso:** Probar nueva UI en browser, luego continuar con project management

### 2026-01-06 - Revisión documentación Mycel y actualización modelo
- **Estado:** Completado - Modelo de tipos alineado con Mycel
- **Documentación revisada:**
  - CONCEPTS.md - Conceptos core de Mycel (connector, flow, transform, type, validator, aspect, auth, sync)
  - Ejemplos: basic, sync, aspects, enrich, validators, auth
- **TODO.md reescrito completamente:**
  - Tabla de conceptos Mycel con elementos visuales
  - Estructuras de proyecto (flat y nested)
  - Todos los tipos de conectores con HCL de ejemplo
  - Flows con todos los bloques opcionales
  - Types, Validators, Transforms, Aspects, Functions, Plugins
  - Auth system completo
  - Fases de prioridad actualizadas
- **Tipos actualizados (`types/index.ts`):**
  - ConnectorType: rest, database, queue, cache, grpc, graphql, tcp, file, s3, exec
  - Configs específicos por tipo: RestServerConfig, RestClientConfig, DatabaseConfig, etc.
  - FlowNodeData completo: from, to, transform, validate, enrich, cache, lock, semaphore, coordinate, require, errorHandling, when
  - TypeNodeData, ValidatorNodeData, TransformNodeData, AspectNodeData
  - MycelProject para estructura de proyecto completa
- **Componentes actualizados:**
  - ConnectorNode: Nuevos iconos para TCP, S3, Exec
  - FlowNode: Iconos para schedule, lock, cache, require
  - Palette: 10 tipos de conectores
  - Properties: Campos específicos por tipo de conector
- **Build:** Exitoso
- **Próximo paso:** Commit y continuar con Phase 2 (project management)

### 2026-01-06 - Phase 2: Project Management & Sync (COMPLETADO)
- **Estado:** ✅ Completado - Web-only architecture
- **Decisión arquitectónica:**
  - Abandonado Electron en favor de web-only + Docker
  - Razón: Backend en Go no tiene sentido con Electron, mejor desplegar con Docker
  - Soporte multi-browser con File System Access API (Chrome/Edge) + fallback ZIP (Safari/Firefox)
- **Backend - Standalone HCL Parser:**
  - `backend/parser/parser.go` - Parser HCL completo usando hashicorp/hcl/v2
  - Parsea: connectors, flows, types, transforms, validators, aspects, caches
  - NO depende del proyecto Mycel - parser standalone
  - `backend/handlers/parse.go` - Endpoint POST /api/parse
- **Backend - HCL Generation:**
  - `backend/handlers/generate.go` - Generador HCL completo
  - Soporta single file o multiple files
  - Genera todos los bloques: service, connectors, flows, types, etc.
  - `POST /api/generate` - Endpoint para generar HCL desde JSON
- **Frontend - File System Abstraction:**
  - `src/lib/fileSystem/types.ts` - Interfaces para providers
  - `src/lib/fileSystem/browserFS.ts` - File System Access API (Chrome/Edge)
  - `src/lib/fileSystem/fallbackFS.ts` - ZIP import/export (Safari/Firefox)
  - `src/lib/fileSystem/index.ts` - Factory pattern para providers
  - Detección automática de capabilities del browser
- **Frontend - Bi-directional Sync:**
  - `src/hooks/useSync.ts` - Hook para sincronización canvas ↔ HCL
  - `parseAndUpdateCanvas(content)` - HCL → Canvas nodes
  - `generateAndUpdateFile(path)` - Canvas → HCL file
  - Debounced (500ms) para evitar sync excesivo
  - Lock para prevenir loops infinitos
- **Componentes actualizados:**
  - `Editor.tsx` - Sync on change con indicador visual
  - `Canvas.tsx` - Sync to HCL cuando cambian nodos
  - UI muestra capabilities del browser
- **Electron removido:**
  - Eliminado directorio `frontend/electron/`
  - Eliminadas dependencias de electron en package.json
  - Eliminado `electronFS.ts` y tipos relacionados
- **Build:** ✅ Frontend y Backend compilan correctamente
- **Próximo paso:** Testing end-to-end del sync flow

### 2026-01-06 - Git Integration con isomorphic-git
- **Estado:** ✅ Completado
- **Arquitectura:**
  - isomorphic-git corre 100% en el browser
  - Usa File System Access API como backend de filesystem
  - No requiere servidor para operaciones git
- **Archivos creados:**
  - `src/lib/git/index.ts` - GitService con FSA adapter
    - `FSAAdapter` - Adapter de File System Access API para isomorphic-git
    - `GitService` - Operaciones: isGitRepo, getCurrentBranch, getStatus, getFileStatus
- **Integración:**
  - `browserFS.ts` - Inicializa GitService al abrir proyecto
  - `useProjectStore.ts` - `refreshGitStatus()` actualiza estado de archivos y branch
  - `FileTree.tsx` - Ya tenía indicadores (M, U, A, D)
  - `MenuBar.tsx` - Ya mostraba branch con icono GitBranch
- **Build:** ✅ Compilación exitosa

### 2026-01-06 - Smart Flows & REST Operations
- **Estado:** ✅ Completado
- **Problemas resueltos:**
  1. Edge deletion - ahora funciona con Delete/Backspace
  2. HCL generation sin proyecto - Preview genera HCL correctamente
  3. Smart flows - detectan conectores conectados
  4. REST operations editor - define endpoints estilo Postman
  5. Operation picker - flows muestran dropdown de operaciones
- **Archivos creados:**
  - `OperationsEditor.tsx` - Editor de endpoints REST (método + path)
    - Selector HTTP method con colores (GET verde, POST azul, etc.)
    - Campo de path editable
    - Botones add/remove
- **Tipos actualizados (`types/index.ts`):**
  - `HttpMethod` - GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
  - `RestOperation`, `GraphQLOperation`, `DatabaseOperation`, `GrpcOperation`, `QueueOperation`
  - `ConnectorOperation` - Union type de todas las operaciones
  - `ConnectorNodeData.operations` - Array opcional de operaciones
- **Archivos modificados:**
  - `Properties.tsx` - FlowProperties ahora:
    - Detecta conectores conectados vía edges
    - Muestra secciones FROM/TO con info del conector
    - Dropdown para seleccionar operación si el conector tiene operaciones definidas
    - OperationsEditor para conectores REST
  - `Canvas.tsx` - Edge deletion habilitado, edges reconectables, estilos mejorados
  - `hclGenerator.ts` - Usa estructura correcta `data.from.operation` y `data.to.target`
    - Soporta más propiedades: host, bucket, region, basePath, workingDir
- **Docker:** ✅ Build y running en http://localhost:8080
- **Próximo paso:** Testing de las nuevas features

### 2026-01-06 - Multi-File Generation & Explorer Integration (v0.3.2)
- **Estado:** ✅ Completado
- **Problemas resueltos:**
  1. HCL generaba un solo archivo grande - ahora genera múltiples archivos
  2. Archivos se mostraban en Preview - ahora están en Explorer
  3. Auto-selección de archivo al seleccionar componente en canvas
  4. Validación de nombres únicos para connectors/flows
- **Archivos modificados:**
  - `hclGenerator.ts` - Reescrito completamente:
    - `generateProject()` retorna `GeneratedProject` con array de archivos
    - Genera: `config.hcl`, `connectors/{name}.hcl`, `flows/flows.hcl`
    - `validateProject()` valida puertos Y nombres únicos
    - `toIdentifier()` exportado para naming consistente
  - `FileTree.tsx` - Reescrito completamente:
    - Muestra "Unsaved Project" cuando no hay proyecto abierto
    - Muestra archivos generados en estructura de directorios
    - Auto-selecciona archivo cuando se selecciona nodo en canvas
    - Module-level state con `getVirtualActiveFile()` y `setVirtualActiveFile()`
  - `Preview.tsx` - Simplificado:
    - Removido file tree sidebar (ahora en Explorer)
    - Sincroniza con archivo seleccionado en Explorer
    - Editor Monaco full-width
- **Validaciones agregadas:**
  - Puertos únicos entre conectores
  - Nombres de conectores únicos (identificadores)
  - Nombres de flows únicos
- **Docker:** ✅ Build exitoso, running en http://localhost:8080
- **Versión:** 0.3.2

### 2026-03-11 - Phase 7: Enterprise Features — v0.9.0
- **Estado:** ✅ Completado (7.1-7.4)
- **7.1 Batch Processing:**
  - `BatchEditor.tsx` — Source, query, chunk_size, on_error, transform, to
  - `batch` flow block definition
  - Visual indicator on flow nodes
  - HCL generation for batch block with nested transform and to
- **7.2 Sagas:**
  - `SagaNode.tsx` — Rose-colored with step preview
  - `SagaProperties` — Step editor with action/compensate, delay/await, on_complete/on_failure
  - `generateSagaHCL()` + `generateSagaActionHCL()` (shared helper)
  - Output to `sagas/sagas.hcl`
- **7.3 State Machines:**
  - `StateMachineNode.tsx` — Teal with state visualization
  - `StateMachineProperties` — States with transitions (event → target + guard + action)
  - `generateStateMachineHCL()` reuses `generateSagaActionHCL()`
  - Output to `machines/machines.hcl`
- **7.4 Auth UI:**
  - `AuthProperties` in Properties panel — Full auth configuration
  - Preset selector (strict/standard/relaxed/development) con auto-apply
  - JWT: algorithm, secret, access/refresh TTL, issuer, rotation
  - Password: min length, require upper/lower/number/special, breach check
  - MFA: required/optional/off, 5 methods (TOTP, WebAuthn, SMS, email, push)
  - Sessions: max active, idle timeout, on_max_reached
  - Security: brute force protection, replay protection
  - Storage: users connector ref, token driver (memory/redis)
  - Social login: Google, GitHub, Apple
  - Endpoint prefix
  - `AuthConfig` type hierarchy en `types/index.ts`
  - `authConfig` en `useStudioStore` con `updateAuthConfig()`
  - `generateAuthHCL()` → `auth/auth.hcl`
- **7.5 Environment Variables:**
  - `EnvProperties` en Properties — Tabs (Variables / Environments)
  - Auto-scan de `env()` references en todos los nodos + auth config
  - Warning panel para refs no definidas con click-to-add
  - Soporte para secrets (ocultos en `.env.example`)
  - Overlays por entorno (dev/staging/prod) con overrides
  - Active environment selector
  - Genera: `.env`, `.env.example`, `environments/{name}.env`
  - `EnvironmentConfig`, `EnvVariable`, `EnvironmentOverlay` types
  - `envConfig` en `useStudioStore` con `updateEnvConfig()`
- **7.6 Long-Running Workflows:**
  - `WorkflowStorageConfig` type en ServiceConfig
  - UI en ServiceProperties — aparece cuando hay sagas, warning cuando sagas con delay/await no tienen storage
  - DB connector selector, table name, auto_create
  - Info de endpoints auto-generados (GET status, POST signal, POST cancel)
  - SagaNode muestra "WORKFLOW" cuando tiene delay/await
  - Genera `workflow {}` block en `config.hcl`
- **7.7 Security:**
  - `SecurityProperties` — Input limits + WASM sanitizers
  - max_input_length, max_field_length, max_field_depth, allowed_control_chars
  - Sanitizer management (name, wasm path, apply_to, fields)
  - Genera `security/security.hcl`
- **7.9 WASM Plugins:**
  - `PluginProperties` — Plugin management (name, source, version, functions)
  - Genera `plugins/plugins.hcl`
- **Build:** ✅ TypeScript + Vite build exitosos
- **Próximo paso:** Phase 7 COMPLETADO. Continuar con Phase 8 (UX Polish) o commit

---

## Próximos pasos (pendientes para siguiente sesión)

### Todas las fases principales COMPLETADAS (3-9)

### Pendientes menores:
- Phase 8.5: Auto-save (File System Access API)
- Phase 8.6: Validation against Mycel Runtime (backend parser)
- Phase 9.5: Full LSP via Backend (monaco-languageclient + WebSocket)
- Phase 6.6: Connector profiles (multiple backends with fallback)

### 2026-01-06 - Revisión de documentación Mycel actualizada
- **Estado:** ✅ Completado
- **Documentación revisada:**
  - `integration-patterns.md` - 11 patrones de integración comunes
  - `CONCEPTS.md` - Conceptos actualizados con modos input/output
  - Ejemplos: `integration/`, `cache/`, `enrich/`
- **Patrones clave identificados:**
  1. REST → Database (CRUD básico)
  2. GraphQL → Database
  3. REST → RabbitMQ (event publishing)
  4. RabbitMQ → REST (event processing)
  5. RabbitMQ → Database
  6. RabbitMQ → GraphQL
  7. RabbitMQ → Exec (scripts)
  8. REST ↔ GraphQL passthrough
  9. Scheduled jobs (cron, intervals)
  10. File processing (import/export)
- **Clasificación de conectores:**
  - **Input (Source):** REST server, GraphQL server, gRPC server, Queue consumer, File watcher
  - **Output (Target):** Database, REST client, GraphQL client, Queue publisher, Exec, S3, Cache
  - **Bidirectional:** Database (SELECT vs INSERT), Cache
- **Bloques de flow identificados:**
  - `from`, `to` (requeridos)
  - `transform` (CEL expressions con prefijo `output.`)
  - `enrich` (datos externos con prefijo `enriched.`)
  - `cache` (storage, key, ttl)
  - `lock`, `semaphore` (sincronización)
  - `response` (respuesta HTTP)
  - `after` (invalidación de cache)
  - `foreach` (procesamiento batch)
  - `error_handling` (retry, DLQ)
- **Sintaxis importante:**
  - `connector.name = "operation"` (shorthand)
  - `connector.name = { ... }` (full config)
  - Variables: `input`, `output`, `enriched`, `context`, `flow`
- **TODO.md reescrito** con todos los patrones y prioridades

### 2026-02-26 - Service Configuration UI & Roadmap (desde sesión Mycel)
- **Estado:** ✅ Completado
- **Contexto:** Cambios hechos desde el proyecto Mycel al detectar que `config.hcl` con el bloque `service` no se documentaba ni era configurable en Studio.
- **ROADMAP.md creado:**
  - Roadmap completo cruzado contra documentación actual de Mycel runtime
  - Inconsistencias identificadas: `enrich` vs `step`, `foreach` (no existe en Mycel), `after` (no existe, usar Aspects), faltan 6 notification connectors
  - 8 fases propuestas (3-8), desde fix foundations hasta UX polish
- **Service Configuration UI:**
  - `useStudioStore.ts` — Agregado `serviceConfig: { name, version }` al state + `updateServiceConfig()` method
  - `Properties.tsx` — Nuevo componente `ServiceProperties` que se muestra cuando no hay nodo seleccionado (panel derecho). Campos: name, version con descripción "Shown in /health, metrics, and logs"
  - `hclGenerator.ts` — `generateProject()` y `generateHCL()` ahora reciben `serviceConfig?` opcional. El `config.hcl` usa estos valores en vez de hardcodear `"my-service"` / `"1.0.0"`
  - `Preview.tsx` — Pasa `serviceConfig` del store a `generateProject()`
  - `FileTree.tsx` — Pasa `serviceConfig` del store a `generateProject()`
- **Build:** ✅ TypeScript + Vite build exitosos
- **Commit:** `e1b0d96` (local, sin push)
- **Cambios en Mycel relacionados (ya pusheados):**
  - README: `config.hcl` es primer archivo en Quick Start
  - CONCEPTS.md: Sección "Service" movida al top (después de The Mycel Model)
  - GETTING_STARTED.md: Corregido `service.hcl` → `config.hcl`, eliminado `port` del service block, corregida sintaxis de flows
  - CONFIGURATION.md: Nota sobre importancia del service block
- **Próximo paso:** Continuar con Phase 3 del ROADMAP (Step blocks, filter, multi-to)

### 2026-03-10 - Phase 3: Fix Foundations (COMPLETADO)
- **Estado:** ✅ Completado - v0.4.0
- **Step Editor (`StepEditor.tsx`):**
  - Reemplaza `enrich` como mecanismo principal de orquestación
  - Nombre, conector, operación, query, params
  - Opciones avanzadas: `when` (condicional), timeout, on_error (fail/skip/default)
  - Editor de valor default para on_error="default"
  - Resultados disponibles como `step.name.field`
- **Response Editor (`ResponseEditor.tsx`):**
  - Status code con presets (200, 201, 202, 204, 4xx, 5xx)
  - Headers custom, body con CEL expressions
  - Templates predefinidos, preview de HCL
- **Deduplication (inline en Canvas):**
  - Storage (cache connector), key (CEL), TTL, on_duplicate
  - Indicador visual en flow nodes
- **Filter en `from`:**
  - Campo CEL en Properties, indicador "(filtered)" en nodo
- **Multi-to (fan-out):**
  - Botón "Add Target", cada `to` con connector/target/when
  - Indicador "+N more" en nodo
- **ErrorHandlingEditor reescrito:**
  - Retry (con max_delay nuevo)
  - Fallback/DLQ (conector, target, include_error, transform)
  - Error Response (status, headers, body con CEL)
- **FlowContextMenu:** Agregados Step y Dedupe
- **FlowNode:** Indicadores visuales nuevos (step, dedupe, response, filter)
- **hclGenerator.ts:** Generación completa de HCL para todos los bloques nuevos
- **Types:** FlowStep, FlowFilter, FlowDedupe, FlowResponse, FlowFallback, FlowErrorResponse
- **ROADMAP.md actualizado:**
  - Phase 3 marcada como completa
  - Phase 9 agregada: Monaco IDE Enhancement (syntax highlighting, autocompletion, validation, hover, LSP)
- **Build:** ✅ TypeScript + Vite build exitosos
- **Próximo paso:** Phase 4 (Types & Validation) o Phase 6 (Missing Connectors)

### 2026-03-10 - Connector Registry Refactor (SOLID) — v0.5.0
- **Estado:** ✅ Completado
- **Decisión arquitectónica:**
  - Un archivo por conector en `src/connectors/definitions/`
  - Interfaz `ConnectorDefinition` con: type, label, icon, color, category, defaultDirection, fields, drivers, modeMapping
  - `FieldDefinition` soporta: string, number, boolean, password, select, text + visibleWhen + helpText
  - `DriverDefinition` para campos específicos por driver (e.g., SQLite vs Postgres)
- **Archivos creados (30):**
  - `src/connectors/types.ts` — Interfaces core
  - `src/connectors/registry.ts` — Map + helpers (getConnector, getAllConnectors, getConnectorsByCategory, etc.)
  - `src/connectors/index.ts` — Barrel export
  - `src/connectors/definitions/index.ts` — Barrel de todas las definiciones
  - 25 archivos de definición: rest, http, database, queue, cache, grpc, graphql, tcp, file, s3, exec, websocket, sse, cdc, elasticsearch, oauth, mqtt, ftp, soap, email, slack, discord, sms, push, webhook
- **Refactors a consumidores:**
  - `ConnectorNode.tsx` — Icon/color vía `getConnector()` en vez de hardcoded maps
  - `Palette.tsx` — Categorías auto-generadas desde `getConnectorsByCategory()`
  - `Properties.tsx` — `FieldRenderer` genérico (~100 líneas) reemplaza ~460 líneas de switch/case
  - `hclGenerator.ts` — `generateConnectorHCL()` ahora lee campos del registry, algoritmo genérico
- **Types actualizados:**
  - `ConnectorType` extendido de 10 a 25 tipos
  - `DEFAULT_CONNECTOR_DIRECTIONS` actualizado con los 25 tipos
- **Categorías del Palette:**
  - API & Web: REST, HTTP, gRPC, GraphQL, TCP, SOAP
  - Database: Database, Cache, CDC, Elasticsearch
  - Messaging: Queue, MQTT
  - Real-time: WebSocket, SSE
  - Storage: File, S3, FTP
  - Execution: Exec
  - Integration: OAuth, Webhook
  - Notifications: Email, Slack, Discord, SMS, Push
- **Build:** ✅ TypeScript + Vite build exitosos
- **Próximo paso:** Phase 4 (Types & Validation) o continuar con roadmap

### 2026-03-10 - Flow Block Registry (SOLID) — v0.6.0
- **Estado:** ✅ Completado
- **Mismo patrón que connectors aplicado a flow blocks:**
  - `src/flow-blocks/types.ts` — `FlowBlockDefinition`, `FlowBlockField`, `HclFieldMapping`
  - `src/flow-blocks/registry.ts` — Map + helpers (getFlowBlock, getAllFlowBlocks, getFlowBlocksByGroup, getSimpleFlowBlocks, getCustomFlowBlocks)
  - `src/flow-blocks/GenericBlockEditor.tsx` — Modal genérico que renderiza cualquier bloque simple desde su definición
  - `src/flow-blocks/index.ts` — Barrel export
- **8 definiciones de bloques (`src/flow-blocks/definitions/`):**
  - Simple (100% data-driven): `cache`, `lock`, `semaphore`, `dedupe`
  - Complex (definición para menú/HCL + custom editor): `transform`, `step`, `response`, `errorHandling`
- **Refactors a consumidores:**
  - `FlowContextMenu.tsx` — 8 `onAdd*` callbacks → single `onSelectBlock(key)`, menú auto-generado
  - `Canvas.tsx` — 9 useState + 16 handlers → unified `activeEditor` state, GenericBlockEditor para simples
  - `hclGenerator.ts` — Cache/lock/semaphore/dedupe hardcoded → `getSimpleFlowBlocks()` + `hclFields` loop genérico
  - `FlowConfig/index.ts` — Removidos exports de CacheEditor, LockEditor, SemaphoreEditor, EnrichEditor
- **GenericBlockEditor soporta field types:**
  - `storage_select` — Dropdown de cache connectors con empty state
  - `cel_expression` — Input mono + dropdown de patterns
  - `duration` — Input + preset buttons
  - `number` — Input + preset buttons
  - `select` — Standard dropdown
  - `boolean` — Checkbox
  - `string` — Text input
  - `visibleWhen` — Conditional field visibility
- **Build:** ✅ TypeScript + Vite build exitosos
- **Próximo paso:** Aplicar patrón a top-level blocks (Type, Validator, Aspect) o Phase 4

### 2026-03-11 - Phase 4: Types & Validators — v0.7.0
- **Estado:** ✅ Completado
- **Validator Registry (`src/validators/`):**
  - 3 tipos: regex (pattern), cel (expr), wasm (wasm+entrypoint)
  - Registry con `getValidatorType()`, `getAllValidatorTypes()`
  - Selector visual con íconos por tipo
- **Type Node:**
  - `TypeNode.tsx` — Preview de campos con nombre, tipo, y marcador required
  - `TypeProperties` — Editor completo de campos con constraints por base type
  - String: format, min_length, max_length, pattern, enum, validate
  - Number: min, max
  - Dropdown de validators del canvas
- **Validator Node:**
  - `ValidatorNode.tsx` — Ícono y color del registry
  - `ValidatorProperties` — Type selector + campos auto-generados del registry
- **Validate Flow Block:**
  - `flow-blocks/definitions/validate.ts` — input/output type references
  - Simple block vía GenericBlockEditor
  - Indicador en flow nodes
- **HCL Generation:**
  - `generateTypeHCL()` — `type "name" { field = type { constraints } }`
  - `generateValidatorHCL()` — `validator "name" { type, pattern/expr/wasm, message }`
  - Output a `types/types.hcl` y `validators/validators.hcl`
- **Build:** ✅ TypeScript + Vite build exitosos
- **Próximo paso:** Phase 5 (Named Transforms, Aspects) o seguir completando v1.11.0

### 2026-03-11 - Phase 5: Named Transforms & Aspects — v0.8.0
- **Estado:** ✅ Completado
- **Transform Node:**
  - `TransformNode.tsx` — Preview de field mappings (hasta 4 con overflow)
  - `TransformProperties` — Editor de mappings con add/rename/remove
  - HCL: `transform "name" { field = "CEL" }`
- **Aspect Node (AOP):**
  - `AspectNode.tsx` — Colores por when (before=blue, after=green, around=purple, on_error=red)
  - Muestra patterns, action/cache/invalidate indicators
  - `AspectProperties` — Selector when, glob patterns, condition, priority
    - Action (before/after/on_error): connector + target + transform
    - Cache (around): storage + key + TTL
    - Invalidation (after): storage + keys/patterns
  - HCL: `aspect "name" { on, when, if, priority, action {}, cache {}, invalidate {} }`
- **Integración completa:**
  - `Palette.tsx` — Transform y Aspect en categoría Schema
  - `Nodes/index.ts` — 6 tipos de nodos registrados
  - `Properties.tsx` — 6 paneles de propiedades
  - `FileTree.tsx` — Auto-navegación a `transforms/transforms.hcl` y `aspects/aspects.hcl`
  - `hclGenerator.ts` — `generateProject()` genera archivos de transforms y aspects
- **Build:** ✅ TypeScript + Vite build exitosos
- **Próximo paso:** Phase 6 (Sagas, State Machines) o continuar con roadmap

### 2026-03-11 - Mycel v1.12.0 Compatibility — v0.8.1
- **Estado:** ✅ Completado
- **3 breaking changes de v1.12.0 resueltos:**
  1. **ResponseEditor reescrito** — De HTTP status/headers/body a CEL transform editor
     - Fields con `input.*`/`output.*` variables
     - Templates: pass through, normalize, echo with metadata
     - Status code overrides: `http_status_code`, `grpc_status_code`
  2. **Echo flows** — Flows sin `to` block son válidos. ResponseEditor detecta echo y ajusta hints
  3. **Status code overrides** — Campos en response block editor
- **FlowResponse type** cambiado: `{status, headers, body}` → `{fields, httpStatusCode?, grpcStatusCode?}`
- **HCL generation** actualizado para nueva semántica
- **Build:** ✅ TypeScript + Vite build exitosos
- **Próximo paso:** Continuar con roadmap (Phase 7 enterprise features o Phase 8/9 polish)

### 2026-03-11 - Docs update for Mycel v1.12.0
- **Estado:** ✅ Completado (docs only, no code changes)
- **Mycel v1.12.0 features that affect Studio:**
  1. **Echo flows** — Flows without `to` block are now valid. Return transformed input directly. Studio currently requires `to`.
  2. **Response block redesign** — `response {}` in Mycel is now CEL transforms applied AFTER destination (variables: `input.*`, `output.*`). Studio's ResponseEditor (v0.4.0) generates HTTP status/headers/body which is the WRONG semantics — that's `error_response`.
  3. **Status code overrides** — `http_status_code` (REST/SOAP) and `grpc_status_code` (gRPC) in response block.
- **Files updated:**
  - `ROADMAP.md` — Version bumped to v1.12.0. Added 3 new entries to missing features table. Added 3 new inconsistencies (response semantics, echo flows, status code overrides). Phase 3.4 rewritten with correct response block examples and semantics.
  - `CLAUDE.md` — Version bumped to v1.12.0. Added echo flow example, response block example with `output.*` variables, Key Concepts section explaining transform vs response vs echo flows. Updated gaps list.
  - `CLAUDE.local.md` — Bitácora updated.
- **Action items for next code session:**
  - Rewrite `ResponseEditor.tsx` as CEL transform editor (like TransformEditor) with `input.*`/`output.*` variables
  - Allow flows without `to` connector in canvas (echo flows)
  - Add `http_status_code` field to response editor
  - Move current HTTP status/headers/body logic to `error_response` only

### 2026-03-11 - Phase 7: Enterprise Features (COMPLETADO) — v0.9.0
- **Estado:** ✅ Completado
- **7.1 Batch Processing:** BatchEditor, source/query/chunk_size, per-item transform
- **7.2 Sagas:** SagaNode, SagaProperties, action/compensate pairs, delay/await
- **7.3 State Machines:** StateMachineNode, state editor, transitions with guards/actions
- **7.4 Auth UI:** AuthProperties, preset selector (strict/standard/relaxed/dev), JWT/password/MFA/sessions/security/social
- **7.5 Environment Variables:** EnvProperties, variable management, secret marking, env() scanning, per-environment overlays
- **7.6 Long-Running Workflows:** Workflow storage config in ServiceProperties, auto-generated API endpoints
- **7.7 Security:** SecurityProperties, input limits, WASM sanitizers
- **7.8 Mocks:** Skipped (low priority)
- **7.9 Plugins:** PluginProperties, git sources, semver, WASM functions
- **Commits:** `a1c009b` (Auth+Env), `f8779ec` (Security+Plugins+Workflow)

### 2026-03-11 - Phase 8: UX Polish (COMPLETADO) — v0.10.0
- **Estado:** ✅ Completado
- **8.1 Undo/Redo:**
  - `useHistoryStore.ts` — Snapshot-based (nodes+edges), 50 depth max
  - Tracks: addNode, removeNode, updateNode, connect, edge remove, node drag
  - Ctrl+Z / Ctrl+Shift+Z, menu bar shows enabled/disabled
- **8.2 Copy/Paste:**
  - `clipboard` state in useStudioStore
  - `copyNode()`, `pasteNode()` (+50px offset), `duplicateNode()`
  - Ctrl+C / Ctrl+V / Ctrl+D
- **8.3 Keyboard Shortcuts:**
  - `useKeyboardShortcuts.ts` — Global handler, skips input/textarea/Monaco
  - `ShortcutsDialog.tsx` — Modal with all shortcuts (Ctrl+/)
  - Platform-aware labels (Cmd vs Ctrl)
- **8.4 Template Gallery:**
  - `templates.ts` — 6 templates: REST+DB CRUD, GraphQL+DB, Scheduled Job, Event Processing, Real-time WebSocket, Order Saga
  - `TemplateGallery.tsx` — Categorized browser (Basic, Messaging, Real-time, Enterprise)
  - `loadTemplate()` method in store, Ctrl+N or File menu
- **8.5 Auto-save:** Pendiente (bajo prioridad)
- **8.6 Validation against Mycel Runtime:** Pendiente
- **Build:** ✅ TypeScript + Vite build exitosos
- **Próximo paso:** Phase 9 (Monaco IDE Enhancement) — HCL syntax highlighting, autocompletion, validation

### 2026-03-11 - Phase 9: Monaco IDE Enhancement (COMPLETADO) — v0.11.0
- **Estado:** ✅ Completado
- **9.1 HCL Syntax Highlighting:**
  - `hclLanguage.ts` — Monarch tokenizer con clasificación completa de tokens HCL2
  - Top-level blocks, sub-blocks, built-in functions, context variables
  - String interpolation (`${...}`) y heredoc support
  - `hclTheme.ts` — Temas `mycel-dark` y `mycel-light` con colores semánticos
- **9.2 Autocompletion:**
  - `hclCompletionProvider.ts` — Context-aware completion
  - Top-level snippets, connector attributes, flow sub-blocks
  - Connector type values desde registry (25 tipos)
  - CEL functions con signatures, context variables
  - Connector names dinámicos desde canvas state (Zustand getState())
  - Nested block awareness (retry, cache, lock, semaphore, etc.)
- **9.3 Client-Side Validation:**
  - `hclValidator.ts` — Validación sintáctica en tiempo real
  - Unclosed strings, unmatched braces, unclosed block comments
  - Malformed attributes (warnings)
  - Debounced (500ms), markers via `monaco.editor.setModelMarkers()`
- **9.4 Hover Information:**
  - `hclHoverProvider.ts` — Tooltips con documentación
  - Block keywords con ejemplos, connector types, CEL function signatures
  - Context variables, attribute descriptions
- **Shared Documentation:**
  - `hclDocs.ts` — Docs para blocks, CEL functions, variables, connector types
  - Consumido por completion y hover providers
- **Integration:**
  - `index.ts` — `setupMonaco()` idempotente, registra language + themes + providers
  - `Preview.tsx` — `beforeMount={setupMonaco}`, tema `mycel-dark`
  - `Editor.tsx` — `beforeMount={setupMonaco}`, `onMount` para validation wiring
- **Build:** ✅ TypeScript + Vite build exitosos
- **Próximo paso:** Todas las fases principales completadas (3-9). Pendientes menores: auto-save (8.5), runtime validation (8.6), LSP backend (9.5), connector profiles (6.6)

### 2026-03-12 - UX Polish: Panels, Editor Tabs & Split View — v0.12.0
- **Estado:** ✅ Completado
- **Commits:** `805942b`, `8869921`
- **Palette Search:**
  - Input de búsqueda en Palette que filtra componentes por nombre
  - `useMemo` con filter por label
- **Inline Flow Blocks:**
  - Transform, Response, Steps y Error Handling se editan inline en FlowProperties
  - `FlowBlockSection` — Componente colapsable con color-coding por tipo
  - `InlineFieldMappings` — Editor de campos reutilizable con IDs numéricos estables (fix focus)
  - Response block (v1.12.0): campos CEL con `input.*`/`output.*`, `http_status_code`, `grpc_status_code`
- **Auto-Flow Creation:**
  - `onConnect` en store intercepta conexiones conector-conector
  - Crea automáticamente un nodo Flow entre ambos conectores
  - Posiciona el flow en el punto medio, crea 2 edges
- **Flow HCL Fix:**
  - Clasificación de conectores por `direction` (input=from, output=to) en vez de dirección del edge
- **Monarch Tokenizer Fix:**
  - `@references` no funcionan en regex capture groups de Monarch — inlineadas como literales
- **Sidebars Resizables y Colapsables:**
  - Sidebar izquierdo: 280px default, resize 200-480px, colapsable
  - Properties derecho: 400px default, resize 280-600px, colapsable
  - Botón estilo Jira: círculo sobre línea divisoria (expandido), pestaña semicircular (colapsado)
  - Transición suave de 200ms, se desactiva durante resize
- **Editor Panel (reemplaza Preview):**
  - `useEditorPanelStore.ts` — Zustand store para tabs, splits, panel height, collapse
  - `EditorPanel.tsx` — Panel resizable verticalmente con botón de colapso (Ctrl+J)
  - `TabBar.tsx` — Pestañas cerrables (X), reordenables (drag & drop nativo), tooltips
  - `EditorGroup.tsx` — Monaco read-only por grupo, contenido desde `generateProject()`
  - Split view: horizontal (Columns2) o vertical (Rows2), resize entre splits
  - Drag tabs entre grupos de split
  - Copy file + Download ZIP por pestaña activa
  - Archivos del Explorer se abren como tabs automáticamente
  - `Preview.tsx` eliminado
  - `FileTree.tsx` refactorizado: `virtualActiveFile` reemplazado por store
- **Keyboard Shortcuts:**
  - Ctrl+J — Toggle editor panel
- **Transform Focus Fix:**
  - IDs numéricos estables como React keys en vez de field names mutables
- **Build:** ✅ TypeScript + Vite build exitosos
- **Docker:** ✅ Testeado en http://localhost:8080

### 2026-03-12 - Auto-save, Connector Profiles & Backend Validation — v0.12.0
- **Estado:** ✅ Completado
- **Phase 8.5 — Auto-save:**
  - `useAutoSave.ts` — Hook que subscribe a cambios del store, debounce configurable (default 2000ms)
  - Status tracking: idle → saving → saved → error
  - Solo activo cuando auto-save habilitado en project metadata y proyecto abierto
  - Toggle checkbox en ServiceProperties
- **Phase 6.6 — Connector Profiles:**
  - `ConnectorProfile`, `ConnectorProfileConfig` types en `types/index.ts`
  - `ProfilesEditor` componente en Properties: select CEL, default, fallback chain, per-profile config + transform
  - `profileConfig?: ConnectorProfileConfig` en ConnectorNodeData
  - HCL generation: `select`, `default`, `fallback`, `profile "name" { config + transform }` blocks
- **Phase 8.6 — Backend Validation:**
  - `ValidateContent()` en `parser.go` — Pipeline de 3 pasos:
    1. Syntax: parse errors con línea/columna
    2. Structure: validación contra rootSchema extendido (saga, state_machine, auth, security, plugin, workflow, batch, environment)
    3. Semantic: nombres duplicados, `type` faltante en connectors, `from` faltante en flows, referencias a conectores no definidos
  - `ValidationError` struct: Message, File, Line, Column, Severity
  - `main.go` — Multi-file validation, structured error response
  - Testeado con curl: detecta syntax errors y semantic warnings correctamente
- **Build:** ✅ TypeScript + Vite + Go build exitosos
- **Docker:** ✅ Testeado en http://localhost:8080

### 2026-03-12 - Connector Alignment & Env Panel — v0.13.0
- **Estado:** ✅ Completado
- **Fix env() escaping:**
  - `hclValue()` helper: detecta expresiones HCL (function calls, variable refs) y las emite sin comillas
  - `isHclExpression()`: regex para `func(...)` y `var.field` patterns
  - Aplicado a connector config, profile config, auth config
- **Panel de Environment Variables:**
  - `EnvProperties` movido fuera de `ServiceProperties`, siempre visible al fondo del panel Properties
  - Split resizable entre propiedades (70%) y env vars (30%)
  - Ambas secciones con scroll independiente
- **Queue → MQ rename:**
  - ConnectorType: `'queue'` → `'mq'` en types, definitions, templates, DEFAULT_CONNECTOR_DIRECTIONS
- **Connector fields alineados con Mycel runtime:**
  - REST: CORS expandido (origins, methods, headers) con generación de bloque `cors {}`
  - Database: pool fields (max, min, max_lifetime) para postgres/mysql, genera `pool {}`
  - HTTP: retry block (count, interval, backoff), oauth2 auth type
  - gRPC: `address` → `target`, proto_files, max_recv/send_mb, TLS block
  - MQTT: connect_timeout, keep_alive, clean_session, TLS block
  - GraphQL: playground_path, introspection, CORS fields
  - Cache Redis: default_ttl, pool fields
  - File: binary format, create_dirs, permissions
  - S3: force_path_style (MinIO)
  - Exec: input_format, output_format, retry fields
  - SSE: heartbeat_interval → heartbeat
- **HCL generator sub-blocks:**
  - `cors {}` — origins/methods/headers con valores default
  - `tls {}` — cert_file/key_file/cert/key/ca/ca_cert
  - `pool {}` — max/min/max_lifetime
  - `retry {}` — count/interval/delay/backoff
  - Skip logic para sub-fields que pertenecen a bloques
- **Build:** ✅ TypeScript + Go + Docker build exitosos

### 2026-03-12 - UX Improvements & Connector Cleanup — v0.14.0
- **Estado:** ✅ Completado
- **UX Mejoras:**
  - Tab-to-canvas sync: clicking editor tab selects corresponding canvas node
  - Canvas visual selection sync via React Flow `onNodesChange` with select-type changes
  - Per-flow HCL file selector in FlowProperties
  - Tab rename on connector label change (no more tab proliferation)
  - Scroll to specific flow/block line when selecting in shared file (Monaco `revealLineInCenter`)
  - Generic block line finder works for all types: flow, type, validator, transform, aspect, saga, state_machine
- **Env Variables UX:**
  - `env()` expression detection with `isHclExpression()` regex
  - EnvToggle on string/number/password fields (free text ↔ env var)
  - Centered modal popup via `createPortal` for editing variables
  - IntelliJ watch-style inline add input (always visible at top)
- **MQ Connector Rewrite:**
  - RabbitMQ: full config with consumer/publisher/exchange/DLQ sub-blocks
  - Kafka: full config with consumer/producer/SASL/schema_registry sub-blocks
  - Redis: fixed field names (port instead of address)
  - HCL generator: proper sub-block generation for all MQ types
- **Mode field removed:**
  - Deleted `modeMapping` from ConnectorDefinition interface
  - Removed `getConnectorMode()` from registry
  - Removed `mode` line from HCL generation
  - Cleaned 8 connector definitions
- **Build:** ✅ TypeScript + Vite build exitosos

### 2026-03-12 - Mycel v1.12.1 Breaking Changes (upstream)
- **Estado:** ⚠️ Pendiente de aplicar en Studio
- **Cambios en Mycel runtime que afectan Studio:**
  1. **Aspects target flow names (not file paths):**
     - `on` patterns en aspects ahora matchean contra nombres de flows usando `filepath.Match` glob
     - Antes: `on = ["flows/**/create_*.hcl"]` (file paths)
     - Ahora: `on = ["create_*", "*_user"]` (flow names)
     - Studio's `AspectProperties` genera patterns `on` — debe generar flow name globs, no file paths
     - `AspectNode.tsx` muestra patterns — actualizar labels/hints
  2. **Unique name validation per type:**
     - Parser enforce nombres únicos dentro de cada tipo (connector, flow, type, transform, aspect, validator)
     - Error: `duplicate flow name "create_user": defined in flows/api.hcl and flows/users.hcl`
     - Studio ya valida nombres únicos para connectors y flows (v0.3.2), pero falta validar: types, transforms, aspects, validators
     - Backend `ValidateContent()` ya detecta duplicados semánticos — ampliar a todos los tipos
  3. **`FlowPath` removed from runtime:**
     - `FlowHandler` ya no tiene `FlowPath` field — aspects reciben `flowName` directamente
     - No afecta Studio directamente (Studio no interactúa con el runtime handler)
- **Benchmark actualizado (Mycel v1.12.0):**
  - Arquitectura paralela: 5 VPS (3 targets + 1 DB + 1 attacker 4vCPU)
  - Calibración adaptiva auto-descubre límites del hardware
  - Standard: 8,437 RPS (15x MuleSoft), Realistic: 204 RPS (2ms median), Stress: UNBREAKABLE
  - 3.2M requests en 12 min, 0 crashes, $5/server
- **Action items para siguiente sesión de código:**
  - Actualizar `AspectProperties` para generar patterns de flow names en vez de file paths
  - Actualizar hints/placeholders en AspectNode (ej: `"create_*"` en vez de `"flows/**/create_*.hcl"`)
  - Extender validación de nombres únicos a types, transforms, aspects, validators en frontend
  - Verificar que backend `ValidateContent()` cubra duplicados en todos los tipos

### 2026-03-13 - Popup Modal Editors & UX Fixes — v0.15.0
- **Estado:** ✅ Completado
- **Flow Block Editors → Centered Popup Modals:**
  - Replaced inline editors in Properties panel with `FlowBlockButton` components
  - Buttons show summary (field counts, step names, retry config) and open modals via shared Zustand state
  - `activeFlowEditor` / `openFlowEditor()` in `useStudioStore` — shared between Canvas and Properties
  - Removed unused `FlowBlockSection` and `InlineFieldMappings` from Properties
- **StepEditor Rewrite (context-aware):**
  - MiniEditor (Monaco) for query (SQL), params (JSON), body (JSON), default (JSON)
  - Connector categories: DB shows query+params, HTTP shows body, MQ shows relevant fields
  - Connector selector with operations dropdown
  - `on_error` simplified to match Mycel runtime (skip only, not fail/default)
- **TransformEditor Rewrite:**
  - Single Monaco HCL editor replacing individual key-value inputs
  - Format: `field_name = CEL expression` — one per line
  - CEL templates insert at bottom, live HCL preview with aligned `=`
- **ResponseEditor Rewrite:**
  - Same pattern as Transform — single Monaco HCL editor
  - Templates: pass through, normalize, echo with metadata, from steps
  - Status code presets, aligned HCL preview
- **ErrorHandlingEditor Update:**
  - Fallback transform and error body use MiniEditor (HCL)
- **MiniEditor Component (`FlowConfig/MiniEditor.tsx`):**
  - Reusable Monaco wrapper for modals (sql, json, hcl, plaintext)
- **Bug Fixes:**
  - `onKeyDown stopPropagation` on all modal overlays — fixes React Flow intercepting space key
  - Canvas drop positioning: `screenToFlowPosition()` replaces hardcoded offsets
- **Palette Tooltips:**
  - Documentation-based tooltips for all 32 components (25 connectors + 7 logic/schema)
- **HCL Generation:**
  - Step: added `body {}` sub-block, `format` attribute
  - Params: array-style for numeric keys, map-style for named keys
- **Commits:** `6e40691`, `c862da7`
- **Build:** ✅ TypeScript + Vite + Docker build exitosos

### 2026-03-13 - File as Source of Truth (Generator Fix) — v0.15.1
- **Estado:** ✅ Completado
- **Problema:** El generador HCL regeneraba archivos que ya existían en disco, sobreescribiendo contenido real (sub-blocks como `consumer {}`, formato original, etc.)
- **Principio:** El archivo es la fuente de verdad, no el canvas. El canvas actualiza el archivo, y se dibuja según el archivo.
- **Fix — Generator filters by `hclFile`:**
  - Connectors: ya estaba filtrado (sesión anterior)
  - **Flows:** ahora solo genera para flows NUEVOS (sin `hclFile`)
  - **Types:** solo genera para types nuevos
  - **Validators:** solo genera para validators nuevos
  - **Transforms:** solo genera para transforms nuevos
  - **Aspects:** solo genera para aspects nuevos
  - **Sagas:** solo genera para sagas nuevos
  - **State Machines:** solo genera para state machines nuevos
- **`hclFile` added to all node types:**
  - `TypeNodeData`, `TransformNodeData`, `ValidatorNodeData`, `AspectNodeData`, `SagaNodeData`, `StateMachineNodeData`
- **Backend SourceFile tracking for all block types:**
  - Parser: `TypeConfig`, `TransformConfig`, `ValidatorConfig`, `AspectConfig` ahora tienen `SourceFile` con `block.DefRange.Filename`
  - Models: `sourceFile` JSON field agregado a los 4 tipos
  - Handler: `makeRelativePath()` aplicado a los 4 tipos en la respuesta
- **Frontend useSync.ts:**
  - `convertProjectToNodes()` ahora crea nodos para types, transforms, validators y aspects (antes solo connectors y flows)
  - Todos pasan `sourceFile` → `hclFile` correctamente
- **FileTree:** Usa `hclFile` para navegación en todos los tipos de nodo
- **Build:** ✅ TypeScript + Go + Docker build exitosos
- **Docker:** ✅ Running en http://localhost:8080

### 2026-03-15 - Wails Desktop App Migration — v1.0.0
- **Estado:** ✅ Completado
- **Decisión arquitectónica:**
  - Migración de web-only Docker a Wails v2 desktop app + Docker (dual-mode)
  - Wails comparte backend Go existente, sin duplicación de lógica
  - `main.go` = desktop (Wails + embed), `cmd/server/main.go` = Docker HTTP server
- **Go code restructurado:**
  - `app.go` — Wails bindings: ParseHCL, GenerateHCL, ValidateHCL (delegados a handlers)
  - `fs.go` — Native filesystem: OpenDirectoryDialog, ReadDirectoryTree, ReadFile, WriteFile, etc.
  - `git.go` — Native git via `os/exec`: IsGitRepo, GetGitBranch, GetGitFileStatuses, GetGitStatus
  - `server.go` eliminado (redundante con `cmd/server/main.go`)
  - Module renombrado a `mycel-studio` en raíz del proyecto
  - `parser/`, `handlers/`, `models/` como paquetes Go en raíz
- **Frontend integración:**
  - `lib/api.ts` — Detección runtime (`window.go`), routing transparent Wails IPC vs HTTP fetch
  - `lib/fileSystem/wailsFS.ts` — FileSystemProvider nativo via Wails bindings
  - `lib/fileSystem/index.ts` — Factory con detección Wails > BrowserFS > Fallback
  - `useSync.ts` — Migrado de fetch() directo a apiParse/apiGenerate
  - `useProjectStore.ts` — Migrado de fetch() directo a apiParse
- **Aspect v1.12.3/v1.13.0 cambios aplicados:**
  - Flow invocation: `action { flow = "name" }` (mutually exclusive con connector)
  - Response enrichment: `response { headers {...} field = "expr" }` para `after` aspects
  - Virtual edges aspect→flow (green dashed)
  - Parser actualizado con flow/operation/response en aspects
- **Build:**
  - ✅ `wails build` — 10MB binary en `build/bin/mycel-studio.app`
  - ✅ `docker compose up --build` — HTTP server funcional en :8080
  - ✅ Frontend tsc + Vite build exitosos
- **Config changes:**
  - `tsconfig.app.json` — `erasableSyntaxOnly: false` (Wails generates namespaces)
  - `wails.json` — `wailsjsdir: "frontend/src"` (corrected path)
  - `.gitignore` — Added `build/bin/`, `frontend/src/wailsjs/`
- **Próximo paso:** Commit, test desktop app, Homebrew Cask setup

### 2026-03-16 - About Dialog, Missing Features & Breakpoint Styling — v1.1.0
- **Estado:** ✅ Completado
- **About Dialog personalizado:**
  - `AboutDialog.tsx` — Diálogo React con versión, descripción, botón Buy Me a Coffee clickeable
  - `menu.go` — Custom App submenu con `menu:show-about` event (Help menu)
  - `useNativeMenu.ts` — `onShowAbout` callback
  - `App.tsx` — Estado `showAbout`, wired a menú nativo y browser
  - Wails v2.9.3 limitación: no se puede customizar el submenu nativo del App, About va en Help
- **JetBrains-style breakpoints:**
  - Pelota roja reemplaza número de línea (no en glyph margin)
  - Hover hint desvanecido, flecha amarilla para stopped-at
  - CSS via `lineNumberClassName` decorations, alineado a derecha
- **Features faltantes implementados:**
  - `idempotency` flow block (storage, key CEL, TTL)
  - `async` flow block (storage, TTL)
  - `pdf` connector (template_dir, default_template, output_dir)
  - Internal flows (`isInternal` toggle, skip `from` block)
  - Source fan-out visualization (GitFork badge en ConnectorNode)
- **Indicadores en FlowNode:** Fingerprint (idempotency), Timer (async), EyeOff (internal)
- **Build:** ✅ Wails build exitoso
- **Próximo paso:** Commit, testear About dialog en desktop app

### 2026-03-19 - View Modes, Notification System & Terminal Fix — v1.8.0
- **Estado:** ✅ Completado
- **Visual First / Text First view modes:**
  - `useLayoutStore.ts` — `viewMode: 'visual-first' | 'text-first'`, `toggleViewMode()`
  - `App.tsx` — Conditional layout: Canvas main / Editor bottom (visual) vs Editor main / Canvas bottom (text)
  - `CanvasPreview` component — Resizable canvas preview panel for text-first mode (reuses panelHeight)
  - `EditorPanel.tsx` — `isMain` prop: when true, fills available space without collapse/resize chrome
  - `menu.go` — "Toggle View Mode" in View menu with `Cmd+Shift+V`
  - `useNativeMenu.ts` — `onToggleViewMode` callback
  - `useKeyboardShortcuts.ts` — `Cmd/Ctrl+Shift+V` works from anywhere (including Monaco/xterm)
  - `MenuBar.tsx` — Dynamic label "Switch to Text First" / "Switch to Visual First"
  - `ShortcutsDialog.tsx` — New "View" section with view mode, editor panel, terminal shortcuts
  - Auto-switch to Text First on debug breakpoint (`useDebugSync.ts`)
  - View mode persisted in `.mycel-studio.json` workspace
- **IDE-style notification system (replaces UpdateNotification banner):**
  - `useNotificationStore.ts` — Zustand store: addNotification, removeNotification, clearAll, popup toggle
  - `NotificationToast.tsx` — Slide-in toast (bottom-right), type icons, action buttons, dismiss
  - `NotificationPopup.tsx` — Full notification list with 1/N navigation, time-ago, clear all
  - `WhatsNewDialog.tsx` — Release notes popup with Update Now / Later
  - `useUpdateManager.ts` — Hook: update-available → toast notification with actions, download progress → status bar state, done → restart notification
  - `StatusBar.tsx` — Bell icon with badge count, download progress bar + percentage, update ready indicator
- **Terminal name persistence fix:**
  - `useTerminalStore.ts` — `createTerminal()` accepts optional `savedName` parameter
  - `useWorkspaceStore.ts` — `applyWorkspace()` passes saved terminal names when restoring
- **Build:** ✅ TypeScript + Vite + Go build exitosos

---

## Próximos pasos (pendientes para siguiente sesión)

### Todas las fases principales COMPLETADAS (3-9) + UX Polish + Connector Alignment + Desktop App + v1.8.0

### Pendientes (por prioridad):
- **Homebrew Cask:** Crear fórmula para distribución macOS
- **Mycel v1.12.1 compatibility:** Aspect patterns → flow names, unique name validation para todos los tipos
- **Mycel v1.12.2 compatibility:** Structured error object in on_error aspects
- **Mycel v1.14.3 compatibility:** PDF connector `template` field (currently uses `template_dir`/`default_template`), email connector `template` field (renamed from `template_file`). Template is now at connector config level, not flow transform
- **Mycel LSP:** Cuando esté listo, integrar via monaco-languageclient + WebSocket (Phase 9.5)
- **Cleanup:** Remover directorio `backend/` (código migrado a raíz)
- **Low priority:** Rate limiting UI, HTML email templates, file upload docs, binary responses
- CDC: tables field
