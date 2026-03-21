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

### Resumen de fases iniciales (v0.1.0 — v0.8.1)

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| v0.1.0 | 2025-01-05 | Estructura base: Vite+React+TS, React Flow canvas, Go backend, Docker |
| v0.2.0 | 2026-01-05 | Dark mode, IDE layout (file tree + canvas + editor + properties) |
| v0.3.0 | 2026-01-06 | Tipos alineados con Mycel, 10 connector types, backlog en TODO.md |
| v0.3.1 | 2026-01-06 | Project management: File System Access API, bi-directional HCL↔Canvas sync, isomorphic-git |
| v0.3.2 | 2026-01-06 | Multi-file HCL generation, Explorer integration, unique name validation |
| v0.4.0 | 2026-03-10 | Phase 3: Step editor, response editor, dedupe, filter, multi-to, error handling rewrite |
| v0.5.0 | 2026-03-10 | Connector Registry (SOLID): 25 connectors, data-driven definitions, FieldRenderer genérico |
| v0.6.0 | 2026-03-10 | Flow Block Registry (SOLID): 8 blocks, GenericBlockEditor, unified context menu |
| v0.7.0 | 2026-03-11 | Types & Validators: TypeNode, ValidatorNode, validate flow block, HCL generation |
| v0.8.0 | 2026-03-11 | Named Transforms & Aspects: TransformNode, AspectNode (AOP), 6 node types completos |
| v0.8.1 | 2026-03-11 | Mycel v1.12.0 compat: ResponseEditor→CEL, echo flows, status code overrides |

### 2026-03-11 — Enterprise Features (v0.9.0)
- ✅ Batch, Sagas, State Machines, Auth UI (presets), Env Vars (scan+overlays), Workflows, Security, Plugins

### 2026-03-11 — UX Polish (v0.10.0)
- ✅ Undo/Redo (50-depth snapshots), Copy/Paste/Duplicate, Keyboard shortcuts + dialog, Template Gallery (6 templates)

### 2026-03-11 — Monaco IDE (v0.11.0)
- ✅ HCL syntax highlighting (Monarch), context-aware autocompletion, client-side validation, hover docs

### 2026-03-12 — Panels & Editor Tabs (v0.12.0)
- ✅ Palette search, inline flow blocks, auto-flow creation, resizable sidebars, editor panel with tabs/splits
- ✅ Auto-save, connector profiles, backend validation (3-step pipeline)

### 2026-03-12 — Connector Alignment (v0.13.0)
- ✅ HCL expression escaping, env panel always visible, queue→mq rename, all connectors aligned with Mycel runtime
- ✅ Sub-block generation: cors, tls, pool, retry

### 2026-03-12 — UX Improvements (v0.14.0)
- ✅ Tab-to-canvas sync, per-flow HCL file selector, env toggle, MQ rewrite (RabbitMQ/Kafka/Redis sub-blocks), mode field removed

### Mycel v1.12.1 Breaking Changes (upstream) — ⚠️ Pendiente
- Aspects target flow names (not file paths): `on = ["create_*"]` instead of `on = ["flows/**/create_*.hcl"]`
- Unique name validation per type (connectors, flows, types, transforms, aspects, validators)
- Action items: update AspectProperties patterns, extend unique name validation

### 2026-03-13 — Popup Modal Editors (v0.15.0)
- ✅ Flow block editors → centered popup modals with summary buttons
- ✅ StepEditor: context-aware (DB→query, HTTP→body), MiniEditor (Monaco)
- ✅ TransformEditor/ResponseEditor: single Monaco HCL editor with CEL templates
- ✅ Canvas drop positioning fix, palette tooltips for all 32 components

### 2026-03-13 — File as Source of Truth (v0.15.1)
- ✅ Generator only generates for NEW nodes (without `hclFile`). File on disk is the source of truth.
- ✅ `hclFile` tracking on all node types, backend SourceFile for types/transforms/validators/aspects

### 2026-03-15 — Wails Desktop App (v1.0.0)
- ✅ Migración a Wails v2 desktop app + Docker dual-mode
- Go: `app.go` (bindings), `fs.go` (native FS), `git.go` (native git via os/exec)
- Frontend: runtime detection (Wails IPC vs HTTP), `wailsFS.ts` provider
- Aspect v1.12.3/v1.13.0: flow invocation, response enrichment, virtual edges
- Build: `wails build` → `build/bin/mycel-studio.app`, Docker funcional en :8080

### 2026-03-16 — About Dialog & Missing Features (v1.1.0)
- ✅ About dialog, JetBrains-style breakpoints, idempotency/async flow blocks, pdf connector, internal flows

### 2026-03-19 — View Modes & Notifications (v1.8.0)
- ✅ Visual-first / text-first toggle (Cmd+Shift+V), IDE notification system (toasts + popup + status bar)
- ✅ Terminal name persistence fix, auto-switch to text-first on debug breakpoint

### 2026-03-20 — Multi-Project Support (v2.0.0)
- ✅ `useMultiProjectStore.ts`: snapshot/restore per project, `registerCurrentAsProject()`
- ✅ Canvas as editor tab, CanvasPanel with project tabs, FileTree multi-root
- ✅ Attach dialog (shared workspace vs new tab), instance tabs (Chrome-style)
- ✅ Debug multi-project: project selector, per-project runtimeUrl

### 2026-03-20 — Debug fixes & Multi-project iteration
- ✅ Debug: fix double JSON.parse, cleanup listeners, reconnect support
- ✅ Debug panel split, variables expand persistence, git staged status, file polling (5s)
- ✅ Multi-project: expandable trees, silent project switch, drag reorder, preserveEditor mode
- ⚠️ Bugs identificados: (1) canvas empty on reopen, (2) same-name files both selected, (3) git status missing for attached

### 2026-03-21 — Parent-Child Architecture + Bug Fixes (v2.1.0)
- **Estado:** ✅ Completado
- **3 bugs corregidos:**
  1. **Canvas empty on reopen:** Per-project workspace save via `saveAllProjectWorkspaces()`. Each project gets own `.mycel-studio.json` from its snapshot.
  2. **Same-name files both selected:** Scoped editor tab IDs (`{projectPath}::{relativePath}`). `scopedPath()`/`unscopePath()` helpers.
  3. **Git status missing for attached:** `refreshAllProjectsGitStatus()` polls all inactive projects every 5s.
- **Persistent parent-child architecture:**
  - `.mycel-studio.json` v1.1: parent has `workspace.attachments[]`, child has `workspace.parent`
  - Open flow: auto-loads parent+children or siblings
  - Save flow: `saveWorkspace()` auto-detects multi-project → `saveAllProjectWorkspaces()`
  - Detach: cleans up workspace references in both files
- **Go bindings:** `WriteFileAtPath()`, `ReadFileAtPath()` for cross-project writes
- **EditorGroup:** resolves content per project via scoped path (snapshot for inactive, live store for active)
- **Files modified:** `useEditorPanelStore`, `useWorkspaceStore`, `useMultiProjectStore`, `useProjectStore`, `useProjectOpen`, `FileTree`, `EditorGroup`, `TabBar`, `useFilePolling`, `useDebugSync`, `useSync`, `fs.go`
- **Build:** ✅ TypeScript + Vite + Go + Wails build exitosos

---

## Próximos pasos (pendientes para siguiente sesión)

### Todas las fases principales COMPLETADAS (3-9) + UX Polish + Desktop App + Multi-Project v2.1.0

### Pendientes (por prioridad):
- **Multi-project testing:** Testear end-to-end: open → attach → close → reopen, verify all 3 bugs fixed
- **Homebrew Cask:** Crear fórmula para distribución macOS
- **Mycel v1.12.1 compatibility:** Aspect patterns → flow names, unique name validation para todos los tipos
- **Mycel v1.12.2 compatibility:** Structured error object in on_error aspects
- **Mycel v1.14.3 compatibility:** PDF connector `template` field, email connector `template` field
- **Mycel debug reconnect:** Bug en Mycel — consumer no reactiva debug gate después de detach/re-attach
- **Mycel LSP:** Cuando esté listo, integrar via monaco-languageclient + WebSocket (Phase 9.5)
- **Cleanup:** Remover directorio `backend/` (código migrado a raíz)
- **Low priority:** Rate limiting UI, HTML email templates, file upload docs, binary responses
- CDC: tables field
