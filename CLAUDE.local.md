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

---

## Próximos pasos (pendientes para siguiente sesión)

### Conectores: Input vs Output
Los conectores deben tener una propiedad `mode` que indica si son de entrada o salida:

| Modo | Handle visible | Uso |
|------|----------------|-----|
| `input` (source) | Solo derecha (→) | Origen de datos (REST server, GraphQL server, Queue consumer) |
| `output` (destination) | Solo izquierda (←) | Destino de datos (Database, REST client, Queue producer) |
| `bidirectional` | Ambos | Cache, algunos DBs |

**Cambios visuales:**
- ConnectorNode debe mostrar/ocultar handles según `mode`
- Al arrastrar desde Palette, preguntar o inferir el modo

**Cambios en Flow Properties:**
- FROM: mostrar operaciones del conector de entrada conectado
- TO: mostrar opciones del conector de salida conectado
- Configuración contextual según tipo de conector

### Flow: configuración interna pendiente
Dentro del flow falta UI para configurar:
- Cache block (storage, key, ttl)
- Transform block (CEL expressions)
- Validate block (type reference)
- Enrich block (connector, operation, params)
- Lock/Semaphore blocks
- Error handling

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
