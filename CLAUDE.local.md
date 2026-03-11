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

### Phase 7 COMPLETADO (7.1-7.9)

### Pendientes de Phase 8-9:
- Phase 8: UX Polish (undo/redo, copy/paste, shortcuts, templates)
- Phase 9: Monaco IDE Enhancement (syntax highlighting, autocompletion, validation)

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
