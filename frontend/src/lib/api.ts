// API abstraction layer
// In Wails desktop mode: calls Go bindings directly via IPC
// In browser/Docker mode: calls HTTP endpoints via fetch()

// Runtime detection: Wails injects `window.go` with bound methods
function isWailsRuntime(): boolean {
  return typeof window !== 'undefined' && 'go' in window
}

// Access Wails bindings via window.go (injected by Wails runtime)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getWailsApp(): { ParseHCL: (req: string) => Promise<string>; GenerateHCL: (req: string) => Promise<string> } | null {
  if (!isWailsRuntime()) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  return w.go?.main?.App ?? null
}

export interface ParseRequest {
  content?: string
  files?: Array<{ path: string; content: string }>
  path?: string
}

export interface ParseResponse {
  success: boolean
  project?: Record<string, unknown>
  errors?: Array<{ message: string; file?: string; line?: number; column?: number }>
}

export interface GenerateRequest {
  project: Record<string, unknown>
  singleFile?: boolean
}

export interface GenerateResponse {
  success: boolean
  files?: Array<{ name: string; path: string; content: string }>
  errors?: string[]
}

// Parse HCL content or files into a studio project
export async function apiParse(req: ParseRequest): Promise<ParseResponse> {
  const app = getWailsApp()
  if (app) {
    try {
      const result = await app.ParseHCL(JSON.stringify(req))
      return JSON.parse(result)
    } catch (err) {
      console.error('Wails parse error:', err)
      return { success: false, errors: [{ message: String(err) }] }
    }
  }

  // Browser/Docker mode: HTTP fetch
  const response = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })

  if (!response.ok) {
    const error = await response.json()
    return { success: false, errors: error.errors || [{ message: 'Parse failed' }] }
  }

  return response.json()
}

// Generate HCL from a studio project
export async function apiGenerate(req: GenerateRequest): Promise<GenerateResponse> {
  const app = getWailsApp()
  if (app) {
    try {
      const result = await app.GenerateHCL(JSON.stringify(req))
      return JSON.parse(result)
    } catch (err) {
      console.error('Wails generate error:', err)
      return { success: false, errors: [String(err)] }
    }
  }

  // Browser/Docker mode: HTTP fetch
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })

  if (!response.ok) {
    const error = await response.json()
    return { success: false, errors: error.errors || ['Generate failed'] }
  }

  return response.json()
}

// Show a confirmation dialog (native on desktop, browser confirm() on web)
export async function apiConfirm(title: string, message: string): Promise<boolean> {
  const app = getWailsApp()
  if (app) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const showConfirm = w.go?.main?.App?.ShowConfirmDialog
    if (showConfirm) {
      const result = await showConfirm(title, message)
      // macOS may return "Yes", "OK", or other affirmative strings
      return result === 'Yes' || result === 'OK' || result === 'ok'
    }
  }
  return window.confirm(message)
}

// Get file content from git HEAD (for diff decorations)
export async function apiGetGitFileContent(projectPath: string, filePath: string): Promise<string> {
  const app = getWailsApp()
  if (app) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (app as any).GetGitFileContent(projectPath, filePath)
      return result || ''
    } catch {
      return ''
    }
  }

  // Browser/Docker mode: not supported (would need isomorphic-git readBlob)
  return ''
}

export { isWailsRuntime }

// --- IDE Engine API (powered by pkg/ide from Mycel runtime) ---

export interface IDEPosition { line: number; col: number; offset: number }
export interface IDERange { start: IDEPosition; end: IDEPosition }
export interface IDEDiagnostic { severity: number; message: string; file: string; range: IDERange }
export interface IDECompletionItem { label: string; kind: number; detail?: string; doc?: string; insertText?: string }
export interface IDEHoverResult { content: string; range: IDERange }
export interface IDELocation { file: string; range: IDERange }
export interface IDERenameEdit { file: string; range: IDERange; newText: string }
export interface IDETextEdit { file: string; range: IDERange; newText: string }
export interface IDECodeAction { title: string; kind: number | string; edits: IDETextEdit[] }
export interface IDESymbol { name: string; kind: number; kindName: string; detail: string; file: string; range: IDERange }
export interface IDETransformRule { index: number; field: string; expr: string; stage: string; range: IDERange }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getApp(): any {
  if (!isWailsRuntime()) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).go?.main?.App ?? null
}

export async function ideInit(projectPath: string): Promise<IDEDiagnostic[]> {
  const app = getApp()
  if (!app?.IDEInit) return []
  return JSON.parse(await app.IDEInit(projectPath))
}

export async function ideUpdateFile(path: string, content: string): Promise<IDEDiagnostic[]> {
  const app = getApp()
  if (!app?.IDEUpdateFile) return []
  return JSON.parse(await app.IDEUpdateFile(path, content))
}

export async function ideRemoveFile(path: string): Promise<IDEDiagnostic[]> {
  const app = getApp()
  if (!app?.IDERemoveFile) return []
  return JSON.parse(await app.IDERemoveFile(path))
}

export async function ideComplete(path: string, line: number, col: number): Promise<IDECompletionItem[]> {
  const app = getApp()
  if (!app?.IDEComplete) return []
  return JSON.parse(await app.IDEComplete(path, line, col))
}

export async function ideHover(path: string, line: number, col: number): Promise<IDEHoverResult | null> {
  const app = getApp()
  if (!app?.IDEHover) return null
  const result = await app.IDEHover(path, line, col)
  return result === 'null' ? null : JSON.parse(result)
}

export async function ideDefinition(path: string, line: number, col: number): Promise<IDELocation | null> {
  const app = getApp()
  if (!app?.IDEDefinition) return null
  const result = await app.IDEDefinition(path, line, col)
  return result === 'null' ? null : JSON.parse(result)
}

export async function ideDiagnose(path: string): Promise<IDEDiagnostic[]> {
  const app = getApp()
  if (!app?.IDEDiagnose) return []
  return JSON.parse(await app.IDEDiagnose(path))
}

export async function ideDiagnoseAll(): Promise<IDEDiagnostic[]> {
  const app = getApp()
  if (!app?.IDEDiagnoseAll) return []
  return JSON.parse(await app.IDEDiagnoseAll())
}

export async function ideRename(path: string, line: number, col: number, newName: string): Promise<IDERenameEdit[]> {
  const app = getApp()
  if (!app?.IDERename) return []
  return JSON.parse(await app.IDERename(path, line, col, newName))
}

export async function ideCodeActions(path: string, line: number, col: number): Promise<IDECodeAction[]> {
  const app = getApp()
  if (!app?.IDECodeActions) return []
  return JSON.parse(await app.IDECodeActions(path, line, col))
}

export async function ideSymbols(): Promise<IDESymbol[]> {
  const app = getApp()
  if (!app?.IDESymbols) return []
  return JSON.parse(await app.IDESymbols())
}

export async function ideSymbolsForFile(path: string): Promise<IDESymbol[]> {
  const app = getApp()
  if (!app?.IDESymbolsForFile) return []
  return JSON.parse(await app.IDESymbolsForFile(path))
}

export async function ideTransformRules(flowName: string): Promise<IDETransformRule[]> {
  const app = getApp()
  if (!app?.IDETransformRules) return []
  return JSON.parse(await app.IDETransformRules(flowName))
}

export async function ideFlowStages(flowName: string): Promise<string[]> {
  const app = getApp()
  if (!app?.IDEFlowStages) return []
  return JSON.parse(await app.IDEFlowStages(flowName))
}

export interface IDEBreakpointLocation {
  file: string
  line: number
  flow: string
  stage: string
  ruleIndex: number
  label: string
}

export async function ideAllBreakpoints(): Promise<Record<string, IDEBreakpointLocation[]>> {
  const app = getApp()
  if (!app?.IDEAllBreakpoints) return {}
  return JSON.parse(await app.IDEAllBreakpoints())
}

export async function ideFlowBreakpoints(flowName: string): Promise<IDEBreakpointLocation[]> {
  const app = getApp()
  if (!app?.IDEFlowBreakpoints) return []
  return JSON.parse(await app.IDEFlowBreakpoints(flowName))
}

export async function ideRemoveBlock(path: string, blockType: string, name: string): Promise<IDETextEdit | null> {
  const app = getApp()
  if (!app?.IDERemoveBlock) return null
  const result = await app.IDERemoveBlock(path, blockType, name)
  return result === 'null' ? null : JSON.parse(result)
}

export interface IDEHint {
  kind: number
  message: string
  file: string
  range: IDERange
  suggestedFile: string
  blockType: string
  blockName: string
}

export interface IDEExtractTransformResult {
  name: string
  flowEdit: IDETextEdit
  newTransform: string
  suggestedFile: string
}

export async function ideHints(): Promise<IDEHint[]> {
  const app = getApp()
  if (!app?.IDEHints) return []
  return JSON.parse(await app.IDEHints())
}

export async function ideHintsForFile(path: string): Promise<IDEHint[]> {
  const app = getApp()
  if (!app?.IDEHintsForFile) return []
  return JSON.parse(await app.IDEHintsForFile(path))
}

export async function ideRenameFile(oldPath: string, newPath: string): Promise<IDEDiagnostic[]> {
  const app = getApp()
  if (!app?.IDERenameFile) return []
  return JSON.parse(await app.IDERenameFile(oldPath, newPath))
}

export async function ideExtractTransform(flowName: string, transformName: string): Promise<IDEExtractTransformResult | null> {
  const app = getApp()
  if (!app?.IDEExtractTransform) return null
  const result = await app.IDEExtractTransform(flowName, transformName)
  return result === 'null' ? null : JSON.parse(result)
}

export interface IDEReference {
  file: string
  line: number
  col: number
  attrName: string
  blockType: string
  blockName: string
}

export interface IDERenameFieldResult {
  flowName: string
  oldName: string
  newName: string
  edits: IDETextEdit[]
  affectedLocations: string[]
}

export async function ideFindReferences(kind: string, name: string): Promise<IDEReference[]> {
  const app = getApp()
  if (!app?.IDEFindReferences) return []
  return JSON.parse(await app.IDEFindReferences(kind, name))
}

export async function ideRenameCursor(path: string, line: number, col: number, newName: string): Promise<IDETextEdit[]> {
  const app = getApp()
  if (!app?.IDERename) return []
  const result = await app.IDERename(path, line, col, newName)
  return JSON.parse(result) || []
}

export async function ideRenameEntity(kind: string, oldName: string, newName: string): Promise<IDETextEdit[]> {
  const app = getApp()
  if (!app?.IDERenameEntity) return []
  return JSON.parse(await app.IDERenameEntity(kind, oldName, newName))
}

export async function ideRenameField(flowName: string, oldFieldName: string, newFieldName: string): Promise<IDERenameFieldResult | null> {
  const app = getApp()
  if (!app?.IDERenameField) return null
  const result = await app.IDERenameField(flowName, oldFieldName, newFieldName)
  return result === 'null' ? null : JSON.parse(result)
}

// --- Git API ---

export interface GitCommit { hash: string; abbrev: string; author: string; date: string; message: string; parents: string[]; refs: string[] }
export interface GitBranch { name: string; current: boolean; remote: string }
export interface GitCommitFile { status: string; path: string; oldPath?: string; newPath?: string }

export async function apiGetGitLog(limit = 100): Promise<GitCommit[]> {
  const app = getApp()
  if (!app?.GetGitLog) { app?.DebugLog?.('apiGetGitLog: GetGitLog not found'); return [] }
  const pp = (await import('../stores/useProjectStore')).useProjectStore.getState().projectPath
  if (!pp) { app?.DebugLog?.('apiGetGitLog: no projectPath'); return [] }
  try {
    app?.DebugLog?.(`apiGetGitLog: calling GetGitLog(${pp}, ${limit})`)
    const result = await app.GetGitLog(pp, limit)
    app?.DebugLog?.(`apiGetGitLog: result length=${result?.length}, type=${typeof result}`)
    const parsed = JSON.parse(result)
    app?.DebugLog?.(`apiGetGitLog: parsed ${parsed?.length} commits`)
    return parsed || []
  } catch (err) {
    app?.DebugLog?.(`apiGetGitLog error: ${err}`)
    return []
  }
}

export async function apiGetGitFileLog(filePath: string, limit = 50): Promise<GitCommit[]> {
  const app = getApp()
  if (!app?.GetGitFileLog) return []
  const pp = (await import('../stores/useProjectStore')).useProjectStore.getState().projectPath
  if (!pp) return []
  try {
    return JSON.parse(await app.GetGitFileLog(pp, filePath, limit)) || []
  } catch { return [] }
}

export async function apiGetGitBranches(): Promise<GitBranch[]> {
  const app = getApp()
  if (!app?.GetGitBranches) return []
  const pp = (await import('../stores/useProjectStore')).useProjectStore.getState().projectPath
  if (!pp) return []
  return JSON.parse(await app.GetGitBranches(pp))
}

export async function apiGetGitCommitFiles(hash: string): Promise<GitCommitFile[]> {
  const app = getApp()
  if (!app?.GetGitCommitFiles) return []
  const pp = (await import('../stores/useProjectStore')).useProjectStore.getState().projectPath
  if (!pp) return []
  return JSON.parse(await app.GetGitCommitFiles(pp, hash))
}

export async function apiGetGitFileAtCommit(hash: string, filePath: string): Promise<string> {
  const app = getApp()
  if (!app?.GetGitFileAtCommit) return ''
  const pp = (await import('../stores/useProjectStore')).useProjectStore.getState().projectPath
  if (!pp) return ''
  return app.GetGitFileAtCommit(pp, hash, filePath)
}

export async function apiGetGitMergeConflicts(): Promise<string[]> {
  const app = getApp()
  if (!app?.GetGitMergeConflicts) return []
  const pp = (await import('../stores/useProjectStore')).useProjectStore.getState().projectPath
  if (!pp) return []
  return JSON.parse(await app.GetGitMergeConflicts(pp))
}

export async function apiGitStageFile(filePath: string): Promise<void> {
  const app = getApp()
  if (!app?.GitStageFile) return
  const pp = (await import('../stores/useProjectStore')).useProjectStore.getState().projectPath
  if (!pp) return
  await app.GitStageFile(pp, filePath)
}

export async function ideGetIndex(): Promise<Record<string, unknown>> {
  const app = getApp()
  if (!app?.IDEGetIndex) return {}
  return JSON.parse(await app.IDEGetIndex())
}

export async function ideParseProject(projectPath: string): Promise<ParseResponse> {
  const app = getApp()
  if (!app?.IDEParseProject) return { success: false }
  return JSON.parse(await app.IDEParseProject(projectPath))
}
