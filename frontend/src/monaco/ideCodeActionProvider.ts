// IDE engine-backed code actions for HCL/Mycel files
// Shows quick-fix suggestions (lightbulb / Ctrl+.) like IntelliJ:
// - Create missing connector/type
// - Add required attribute
// - SOLID hints: move block to correct file, rename file, split mixed types

import type { languages, editor, IRange, CancellationToken } from 'monaco-editor'
import { ideCodeActions, ideHintsForFile, type IDEHint } from '../lib/api'

// Callback for executing hint refactors (set by EditorGroup)
let onExecuteHint: ((hint: IDEHint) => void) | null = null
export function setHintExecutor(fn: ((hint: IDEHint) => void) | null) {
  onExecuteHint = fn
}

export function createIDECodeActionProvider(
  _monaco: typeof import('monaco-editor'),
  getFilePath: () => string | null,
): languages.CodeActionProvider {
  return {
    async provideCodeActions(
      model: editor.ITextModel,
      range: IRange,
      _context: languages.CodeActionContext,
      _token: CancellationToken,
    ): Promise<languages.CodeActionList> {
      const filePath = getFilePath()
      if (!filePath) return { actions: [], dispose() {} }

      const monacoActions: languages.CodeAction[] = []

      // Quick-fix code actions from IDE engine
      const actions = await ideCodeActions(filePath, range.startLineNumber, range.startColumn)
      if (actions && actions.length > 0) {
        for (const action of actions) {
          const edits: languages.IWorkspaceTextEdit[] = (action.edits || []).map(edit => ({
            resource: model.uri,
            textEdit: {
              range: {
                startLineNumber: edit.range.start.line,
                startColumn: edit.range.start.col,
                endLineNumber: edit.range.end.line,
                endColumn: edit.range.end.col,
              },
              text: edit.newText,
            },
            versionId: undefined,
          }))

          monacoActions.push({
            title: action.title,
            kind: action.kind === 'quickfix' ? 'quickfix' : 'refactor',
            diagnostics: [],
            edit: edits.length > 0 ? { edits } : undefined,
          })
        }
      }

      // SOLID organization hints as refactoring suggestions
      // Show when cursor is on the block's declaration line
      const hints = await ideHintsForFile(filePath)
      if (hints && hints.length > 0) {
        for (const hint of hints) {
          if (hint.range && hint.range.start.line === range.startLineNumber) {
            // Normalize suggestedFile to relative path for display
            const suggestedDisplay = hint.suggestedFile
              ? hint.suggestedFile.replace(/^.*\/src\//, 'src/').split('/').pop() || hint.suggestedFile
              : ''
            const title = suggestedDisplay
              ? `Rename to ${suggestedDisplay}`
              : hint.message

            monacoActions.push({
              title,
              kind: 'refactor.move',
              diagnostics: [],
              command: hint.suggestedFile ? {
                id: 'mycel.executeHint',
                title,
                arguments: [hint],
              } : undefined,
            })
          }
        }
      }

      return { actions: monacoActions, dispose() {} }
    },
  }
}

// Register the command handler for executing hints
export function registerHintCommand(monaco: typeof import('monaco-editor')) {
  // Monaco editor commands are registered per-editor, but we use the callback pattern
  // The actual execution happens via setHintExecutor callback
  monaco.editor.registerCommand('mycel.executeHint', (_accessor, hint: IDEHint) => {
    if (onExecuteHint && hint) {
      onExecuteHint(hint)
    }
  })
}
