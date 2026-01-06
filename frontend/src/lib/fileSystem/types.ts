// File System abstraction types

export interface FSProjectFile {
  name: string
  relativePath: string
  content: string
}

export interface FSProject {
  name: string
  files: FSProjectFile[]
}

export interface FSCapabilities {
  canOpenFolder: boolean
  canWatchChanges: boolean
  canGetGitStatus: boolean
  persistsAcrossSessions: boolean
  providerName: 'browser' | 'fallback'
}

export interface FileSystemProvider {
  // Get provider capabilities
  getCapabilities(): FSCapabilities

  // Open a project (folder or ZIP)
  openProject(): Promise<FSProject | null>

  // Save project files
  saveProject(project: FSProject): Promise<boolean>

  // Create a new file
  createFile(relativePath: string, content: string): Promise<boolean>

  // Delete a file
  deleteFile(relativePath: string): Promise<boolean>

  // Read a single file
  readFile(relativePath: string): Promise<string | null>

  // Write a single file
  writeFile(relativePath: string, content: string): Promise<boolean>

  // Check if a project is currently open
  hasOpenProject(): boolean

  // Get the project root path (if applicable)
  getProjectPath(): string | null

  // Close the current project
  closeProject(): void
}
