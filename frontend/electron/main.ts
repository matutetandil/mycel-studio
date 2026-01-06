import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'
import { spawn, ChildProcess } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Backend process reference
let backendProcess: ChildProcess | null = null

// Main window reference
let mainWindow: BrowserWindow | null = null

// Development mode check
const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'Mycel Studio',
    backgroundColor: '#171717', // neutral-900
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Start the Go backend
function startBackend() {
  if (isDev) {
    // In dev mode, backend runs separately
    console.log('Development mode: Backend should be started separately')
    return
  }

  const backendPath = path.join(__dirname, '../../backend/mycel-studio-backend')

  try {
    backendProcess = spawn(backendPath, [], {
      env: { ...process.env, PORT: '8080' },
      stdio: 'pipe',
    })

    backendProcess.stdout?.on('data', (data) => {
      console.log(`Backend: ${data}`)
    })

    backendProcess.stderr?.on('data', (data) => {
      console.error(`Backend error: ${data}`)
    })

    backendProcess.on('close', (code) => {
      console.log(`Backend exited with code ${code}`)
      backendProcess = null
    })
  } catch (error) {
    console.error('Failed to start backend:', error)
  }
}

// Stop the backend
function stopBackend() {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
}

// ============================================================================
// IPC Handlers - Project Operations
// ============================================================================

// Open project dialog
ipcMain.handle('project:open-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Open Mycel Project',
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
})

// Read project directory
ipcMain.handle('project:read', async (_event, projectPath: string) => {
  try {
    const files = await readProjectFiles(projectPath)
    const metadata = await readMetadata(projectPath)
    const name = path.basename(projectPath)

    return {
      path: projectPath,
      name,
      files,
      metadata,
    }
  } catch (error) {
    console.error('Failed to read project:', error)
    throw error
  }
})

// Save project
ipcMain.handle('project:save', async (_event, projectPath: string, files: ProjectFile[], metadata: ProjectMetadata) => {
  try {
    // Write each file
    for (const file of files) {
      if (file.isDirty) {
        const filePath = path.join(projectPath, file.relativePath)
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        await fs.writeFile(filePath, file.content, 'utf-8')
      }
    }

    // Write metadata
    await writeMetadata(projectPath, metadata)

    return { success: true }
  } catch (error) {
    console.error('Failed to save project:', error)
    throw error
  }
})

// ============================================================================
// IPC Handlers - File Operations
// ============================================================================

// Read single file
ipcMain.handle('file:read', async (_event, filePath: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return content
  } catch (error) {
    console.error('Failed to read file:', error)
    throw error
  }
})

// Write single file
ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    console.error('Failed to write file:', error)
    throw error
  }
})

// Create file
ipcMain.handle('file:create', async (_event, filePath: string, content: string = '') => {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    console.error('Failed to create file:', error)
    throw error
  }
})

// Delete file
ipcMain.handle('file:delete', async (_event, filePath: string) => {
  try {
    await fs.unlink(filePath)
    return { success: true }
  } catch (error) {
    console.error('Failed to delete file:', error)
    throw error
  }
})

// ============================================================================
// IPC Handlers - Git Operations
// ============================================================================

ipcMain.handle('git:status', async (_event, projectPath: string) => {
  try {
    const { execSync } = await import('child_process')

    // Get current branch
    let branch = 'unknown'
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectPath,
        encoding: 'utf-8',
      }).trim()
    } catch {
      // Not a git repo or no commits
      branch = ''
    }

    // Get file statuses
    const fileStatuses: Record<string, string> = {}
    try {
      const status = execSync('git status --porcelain', {
        cwd: projectPath,
        encoding: 'utf-8',
      })

      for (const line of status.split('\n')) {
        if (!line.trim()) continue
        const statusCode = line.substring(0, 2)
        const fileName = line.substring(3)

        if (statusCode.includes('M')) fileStatuses[fileName] = 'modified'
        else if (statusCode.includes('A')) fileStatuses[fileName] = 'added'
        else if (statusCode.includes('D')) fileStatuses[fileName] = 'deleted'
        else if (statusCode.includes('?')) fileStatuses[fileName] = 'untracked'
        else if (statusCode.includes('!')) fileStatuses[fileName] = 'ignored'
      }
    } catch {
      // Git status failed
    }

    return { branch, files: fileStatuses }
  } catch (error) {
    console.error('Failed to get git status:', error)
    return { branch: '', files: {} }
  }
})

// ============================================================================
// Helper Functions
// ============================================================================

interface ProjectFile {
  name: string
  relativePath: string
  content: string
  isDirty: boolean
}

interface ProjectMetadata {
  version: string
  canvas: { zoom: number; position: { x: number; y: number } }
  nodes: Record<string, { x: number; y: number }>
  ui: {
    theme: 'light' | 'dark'
    activeFile: string | null
    expandedPanels: string[]
  }
  autoSave: {
    enabled: boolean
    debounceMs: number
  }
}

async function readProjectFiles(projectPath: string): Promise<ProjectFile[]> {
  const files: ProjectFile[] = []

  async function walkDir(dir: string, relativeTo: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relativePath = path.relative(relativeTo, fullPath)

      // Skip hidden files and node_modules
      if (entry.name.startsWith('.') && entry.name !== '.mycel-studio.json') continue
      if (entry.name === 'node_modules') continue

      if (entry.isDirectory()) {
        await walkDir(fullPath, relativeTo)
      } else if (entry.name.endsWith('.hcl') || entry.name === '.mycel-studio.json') {
        const content = await fs.readFile(fullPath, 'utf-8')
        files.push({
          name: entry.name,
          relativePath,
          content,
          isDirty: false,
        })
      }
    }
  }

  await walkDir(projectPath, projectPath)
  return files
}

async function readMetadata(projectPath: string): Promise<ProjectMetadata | null> {
  const metadataPath = path.join(projectPath, '.mycel-studio.json')

  try {
    const content = await fs.readFile(metadataPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    // No metadata file exists
    return null
  }
}

async function writeMetadata(projectPath: string, metadata: ProjectMetadata): Promise<void> {
  const metadataPath = path.join(projectPath, '.mycel-studio.json')
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
}

// ============================================================================
// App Lifecycle
// ============================================================================

app.whenReady().then(() => {
  startBackend()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopBackend()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopBackend()
})
