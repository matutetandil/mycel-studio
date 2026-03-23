// IDE engine-backed code actions for HCL files
// Shows quick-fix suggestions (lightbulb / Ctrl+.) like IntelliJ:
// - Create missing connector
// - Create missing type
// - Add required attribute

import type { languages, editor, IRange, CancellationToken } from 'monaco-editor'
import { ideCodeActions } from '../lib/api'

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

      const actions = await ideCodeActions(filePath, range.startLineNumber, range.startColumn)
      if (!actions || actions.length === 0) return { actions: [], dispose() {} }

      const monacoActions: languages.CodeAction[] = actions.map(action => {
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

        return {
          title: action.title,
          kind: action.kind === 'quickfix' ? 'quickfix' : 'refactor',
          diagnostics: [],
          edit: edits.length > 0 ? { edits } : undefined,
        }
      })

      return { actions: monacoActions, dispose() {} }
    },
  }
}
