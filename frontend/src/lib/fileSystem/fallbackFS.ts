// Fallback File System Provider - Uses ZIP import/export for all browsers

import type { FileSystemProvider, FSProject, FSProjectFile, FSCapabilities } from './types'

// We'll use JSZip for ZIP handling - need to install it
// For now, implement with dynamic import

export class FallbackFileSystem implements FileSystemProvider {
  private project: FSProject | null = null

  getCapabilities(): FSCapabilities {
    return {
      canOpenFolder: false, // Uses ZIP import instead
      canWatchChanges: false,
      canGetGitStatus: false,
      persistsAcrossSessions: false,
      providerName: 'fallback',
    }
  }

  async openProject(): Promise<FSProject | null> {
    try {
      // Create file input for ZIP upload
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.zip'

      return new Promise((resolve) => {
        input.onchange = async () => {
          const file = input.files?.[0]
          if (!file) {
            resolve(null)
            return
          }

          try {
            const project = await this.extractZip(file)
            this.project = project
            resolve(project)
          } catch (error) {
            console.error('Failed to extract ZIP:', error)
            resolve(null)
          }
        }

        input.oncancel = () => resolve(null)
        input.click()
      })
    } catch (error) {
      console.error('Failed to open project:', error)
      return null
    }
  }

  private async extractZip(file: File): Promise<FSProject> {
    // Dynamic import of JSZip
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(file)

    const files: FSProjectFile[] = []
    const projectName = file.name.replace('.zip', '')

    // Find the root directory (some ZIPs have a wrapper folder)
    let rootPrefix = ''
    const entries = Object.keys(zip.files)
    if (entries.length > 0) {
      const firstEntry = entries[0]
      if (firstEntry.endsWith('/') && entries.every((e) => e.startsWith(firstEntry))) {
        rootPrefix = firstEntry
      }
    }

    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue

      // Get relative path (remove root prefix if any)
      let relativePath = path
      if (rootPrefix && path.startsWith(rootPrefix)) {
        relativePath = path.slice(rootPrefix.length)
      }

      // Skip hidden files (except .mycel-studio.json)
      const fileName = relativePath.split('/').pop() || ''
      if (fileName.startsWith('.') && fileName !== '.mycel-studio.json') continue

      // Only include HCL files and studio metadata
      if (!fileName.endsWith('.hcl') && fileName !== '.mycel-studio.json') continue

      try {
        const content = await zipEntry.async('string')
        files.push({
          name: fileName,
          relativePath,
          content,
        })
      } catch (error) {
        console.error(`Failed to read ${path}:`, error)
      }
    }

    return { name: projectName, files }
  }

  async saveProject(project: FSProject): Promise<boolean> {
    try {
      // Dynamic import of JSZip
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      // Add all files to ZIP
      for (const file of project.files) {
        zip.file(file.relativePath, file.content)
      }

      // Generate and download
      const blob = await zip.generateAsync({ type: 'blob' })
      this.downloadBlob(blob, `${project.name}.zip`)

      // Update internal state
      this.project = project

      return true
    } catch (error) {
      console.error('Failed to save project:', error)
      return false
    }
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async createFile(relativePath: string, content: string): Promise<boolean> {
    if (!this.project) return false

    const name = relativePath.split('/').pop() || relativePath
    this.project.files.push({ name, relativePath, content })
    return true
  }

  async deleteFile(relativePath: string): Promise<boolean> {
    if (!this.project) return false

    this.project.files = this.project.files.filter((f) => f.relativePath !== relativePath)
    return true
  }

  async readFile(relativePath: string): Promise<string | null> {
    if (!this.project) return null

    const file = this.project.files.find((f) => f.relativePath === relativePath)
    return file?.content ?? null
  }

  async writeFile(relativePath: string, content: string): Promise<boolean> {
    if (!this.project) return false

    const existing = this.project.files.find((f) => f.relativePath === relativePath)
    if (existing) {
      existing.content = content
    } else {
      const name = relativePath.split('/').pop() || relativePath
      this.project.files.push({ name, relativePath, content })
    }
    return true
  }

  hasOpenProject(): boolean {
    return this.project !== null
  }

  getProjectPath(): string | null {
    return this.project?.name ?? null
  }

  closeProject(): void {
    this.project = null
  }

  // Export individual file (for quick export without full ZIP)
  exportFile(file: FSProjectFile): void {
    const blob = new Blob([file.content], { type: 'text/plain' })
    this.downloadBlob(blob, file.name)
  }
}
