// Creates .mycel files on disk when a new component is added to the canvas.
// Each node type generates its own HCL content and writes it to the correct path.

import { useProjectStore } from '../stores/useProjectStore'
import { useStudioStore } from '../stores/useStudioStore'
import { generateProject } from './hclGenerator'
import { toIdentifier } from './hclGenerator'
import type { StudioNode } from '../types'

export async function createFileForNode(node: StudioNode) {
  const projectStore = useProjectStore.getState()
  const { projectPath, projectName, mycelRoot, files } = projectStore

  if (!projectPath || !projectName) return

  const studioStore = useStudioStore.getState()

  // Generate the project to get the file content for this node
  const existingPaths = new Set(files.map(f => f.relativePath))
  const generated = generateProject(
    studioStore.nodes, studioStore.edges,
    studioStore.serviceConfig, studioStore.authConfig,
    studioStore.envConfig, studioStore.securityConfig,
    studioStore.pluginConfig, mycelRoot, existingPaths
  )

  // Find the generated file(s) for this node
  const data = node.data as { label?: string }
  const name = data.label ? toIdentifier(data.label) : ''

  // Determine which generated file belongs to this node
  let targetFile: { path: string; content: string } | undefined

  const nodeType = node.type || ''
  if (nodeType === 'connector') {
    targetFile = generated.files.find(f => f.path === `${mycelRoot}connectors/${name}.mycel`)
  } else {
    const fileMap: Record<string, string> = {
      flow: `${mycelRoot}flows/flows.mycel`,
      type: `${mycelRoot}types/types.mycel`,
      validator: `${mycelRoot}validators/validators.mycel`,
      transform: `${mycelRoot}transforms/transforms.mycel`,
      aspect: `${mycelRoot}aspects/aspects.mycel`,
      saga: `${mycelRoot}sagas/sagas.mycel`,
      state_machine: `${mycelRoot}machines/machines.mycel`,
    }
    const path = fileMap[nodeType]
    if (path) {
      targetFile = generated.files.find(f => f.path === path)
    }
  }

  if (!targetFile) return

  // Write to disk
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).go?.main?.App
    if (app?.WriteFile) {
      await app.WriteFile(projectPath + '/' + targetFile.path, targetFile.content)
    }

    // Add to project store if not already there
    if (!files.some(f => f.relativePath === targetFile!.path)) {
      projectStore.addFile({
        name: targetFile.path.split('/').pop() || targetFile.path,
        path: targetFile.path,
        relativePath: targetFile.path,
        content: targetFile.content,
        isDirty: false,
      })
    } else {
      // File exists — update with new content (appended block)
      projectStore.updateFile(targetFile.path, targetFile.content)
      // Also write updated content to disk
      if (app?.WriteFile) {
        await app.WriteFile(projectPath + '/' + targetFile.path, targetFile.content)
      }
    }

    // Update IDE engine
    const { ideUpdateFile } = await import('../lib/api')
    await ideUpdateFile(projectPath + '/' + targetFile.path, targetFile.content)
  } catch (err) {
    console.error('Failed to create file for node:', err)
  }
}
