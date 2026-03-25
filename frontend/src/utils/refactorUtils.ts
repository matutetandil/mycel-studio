// Refactoring utilities — execute SOLID hints and extract transforms

import { useProjectStore } from '../stores/useProjectStore'
import { useStudioStore } from '../stores/useStudioStore'
import { useEditorPanelStore } from '../stores/useEditorPanelStore'
import {
  ideRemoveBlock, ideUpdateFile, ideExtractTransform,
  isWailsRuntime, apiConfirm,
  type IDEHint, type IDEExtractTransformResult,
} from '../lib/api'
import { useDiagnosticsStore } from '../stores/useDiagnosticsStore'
import { toIdentifier } from './hclGenerator'

// Execute a SOLID hint — move a block to the suggested file
export async function executeHint(hint: IDEHint): Promise<boolean> {
  if (!hint.suggestedFile || !isWailsRuntime()) return false

  const projectPath = useProjectStore.getState().projectPath
  if (!projectPath) return false

  const confirmed = await apiConfirm(
    'Move Block',
    `Move "${hint.blockName}" ${hint.blockType} to ${hint.suggestedFile}?`
  )
  if (!confirmed) return false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).go?.main?.App
  if (!app?.WriteFile || !app?.ReadFile) return false

  const absSource = projectPath + '/' + hint.file
  const absDest = projectPath + '/' + hint.suggestedFile

  try {
    // 1. Extract the block from the source file
    const edit = await ideRemoveBlock(absSource, hint.blockType, hint.blockName)
    if (!edit) return false

    // 2. Read the source file and extract the block content
    const sourceContent = await app.ReadFile(absSource)
    const lines = sourceContent.split('\n')
    const blockLines = lines.slice(edit.range.start.line - 1, edit.range.end.line)
    const blockContent = blockLines.join('\n').trim()

    // 3. Remove the block from the source file
    const newSourceLines = [...lines]
    newSourceLines.splice(edit.range.start.line - 1, edit.range.end.line - edit.range.start.line + 1)
    const newSourceContent = newSourceLines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'

    // 4. Write the block to the destination file (append if exists, create if not)
    let destContent = ''
    try {
      destContent = await app.ReadFile(absDest)
    } catch {
      // File doesn't exist — will create
    }
    const newDestContent = destContent
      ? destContent.trim() + '\n\n' + blockContent + '\n'
      : blockContent + '\n'

    // 5. Write both files
    await app.WriteFile(absSource, newSourceContent)
    await app.WriteFile(absDest, newDestContent)

    // 6. Update IDE engine
    await ideUpdateFile(absSource, newSourceContent)
    await ideUpdateFile(absDest, newDestContent)

    // 7. Update project store files
    const projectStore = useProjectStore.getState()
    projectStore.updateFile(hint.file, newSourceContent)

    // Add destination file if new
    const destRelPath = hint.suggestedFile
    if (!projectStore.files.some(f => f.relativePath === destRelPath)) {
      projectStore.addFile({
        name: destRelPath.split('/').pop() || destRelPath,
        path: destRelPath,
        relativePath: destRelPath,
        content: newDestContent,
        isDirty: false,
      })
    } else {
      projectStore.updateFile(destRelPath, newDestContent)
    }

    // 8. Update canvas node's hclFile
    const studioStore = useStudioStore.getState()
    const node = studioStore.nodes.find(n => {
      const data = n.data as { label?: string }
      return data.label && toIdentifier(data.label) === hint.blockName
    })
    if (node) {
      studioStore.updateNode(node.id, { hclFile: destRelPath })
    }

    // 9. Open the destination file in the editor
    const fileName = destRelPath.split('/').pop() || destRelPath
    useEditorPanelStore.getState().openFile(destRelPath, fileName, undefined, projectPath)

    // 10. Refresh diagnostics
    useDiagnosticsStore.getState().refreshAll()

    return true
  } catch (err) {
    console.error('Failed to execute hint:', err)
    return false
  }
}

// Extract an inline transform from a flow into a named reusable transform
export async function extractTransform(flowName: string, transformName?: string): Promise<boolean> {
  if (!isWailsRuntime()) return false

  const projectPath = useProjectStore.getState().projectPath
  if (!projectPath) return false

  const name = transformName || `${flowName}_transform`

  const confirmed = await apiConfirm(
    'Extract Transform',
    `Extract inline transform from flow "${flowName}" into a named transform "${name}"?`
  )
  if (!confirmed) return false

  const result: IDEExtractTransformResult | null = await ideExtractTransform(flowName, name)
  if (!result) return false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).go?.main?.App
  if (!app?.WriteFile || !app?.ReadFile) return false

  try {
    // 1. Apply the flow edit (replace inline transform with `use = "name"`)
    const absFlowFile = projectPath + '/' + result.flowEdit.file
    const flowContent = await app.ReadFile(absFlowFile)
    const flowLines = flowContent.split('\n')
    const startLine = result.flowEdit.range.start.line - 1
    const endLine = result.flowEdit.range.end.line
    flowLines.splice(startLine, endLine - startLine, result.flowEdit.newText)
    const newFlowContent = flowLines.join('\n')

    await app.WriteFile(absFlowFile, newFlowContent)
    await ideUpdateFile(absFlowFile, newFlowContent)

    // Update in store
    const relFlowFile = result.flowEdit.file.startsWith(projectPath + '/')
      ? result.flowEdit.file.slice(projectPath.length + 1)
      : result.flowEdit.file
    useProjectStore.getState().updateFile(relFlowFile, newFlowContent)

    // 2. Write the new named transform file
    const absTransformFile = projectPath + '/' + result.suggestedFile
    let existingContent = ''
    try {
      existingContent = await app.ReadFile(absTransformFile)
    } catch { /* doesn't exist */ }

    const newTransformContent = existingContent
      ? existingContent.trim() + '\n\n' + result.newTransform + '\n'
      : result.newTransform + '\n'

    await app.WriteFile(absTransformFile, newTransformContent)
    await ideUpdateFile(absTransformFile, newTransformContent)

    // Add/update in store
    const projectStore = useProjectStore.getState()
    if (!projectStore.files.some(f => f.relativePath === result.suggestedFile)) {
      projectStore.addFile({
        name: result.suggestedFile.split('/').pop() || result.suggestedFile,
        path: result.suggestedFile,
        relativePath: result.suggestedFile,
        content: newTransformContent,
        isDirty: false,
      })
    } else {
      projectStore.updateFile(result.suggestedFile, newTransformContent)
    }

    // 3. Refresh diagnostics
    useDiagnosticsStore.getState().refreshAll()

    return true
  } catch (err) {
    console.error('Failed to extract transform:', err)
    return false
  }
}
