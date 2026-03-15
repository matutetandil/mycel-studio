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
      return result === 'Yes'
    }
  }
  return window.confirm(message)
}

export { isWailsRuntime }
