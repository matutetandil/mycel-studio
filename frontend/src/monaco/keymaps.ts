// IntelliJ IDEA keybindings for Monaco Editor
// Remaps VS Code defaults to match IDEA behavior

import type { editor } from 'monaco-editor'
import type { KeymapType } from '../stores/useSettingsStore'

type Monaco = typeof import('monaco-editor')

export function applyKeymap(monaco: Monaco, monacoEditor: editor.IStandaloneCodeEditor, keymap: KeymapType) {
  if (keymap !== 'idea') return

  const KM = monaco.KeyMod
  const KC = monaco.KeyCode

  // Ctrl+D → Duplicate line (IDEA) instead of "add selection to next find match" (VS Code)
  monacoEditor.addAction({
    id: 'idea.duplicateLine',
    label: 'Duplicate Line',
    keybindings: [KM.CtrlCmd | KC.KeyD],
    run: (ed) => {
      ed.getAction('editor.action.copyLinesDownAction')?.run()
    },
  })

  // Ctrl+Y → Delete line (IDEA) instead of "redo" (VS Code)
  monacoEditor.addAction({
    id: 'idea.deleteLine',
    label: 'Delete Line',
    keybindings: [KM.CtrlCmd | KC.KeyY],
    run: (ed) => {
      ed.getAction('editor.action.deleteLines')?.run()
    },
  })

  // Alt+Shift+Up → Move line up (IDEA uses both Alt+Shift+Up and Ctrl+Shift+Up)
  monacoEditor.addAction({
    id: 'idea.moveLineUp',
    label: 'Move Line Up',
    keybindings: [
      KM.Alt | KM.Shift | KC.UpArrow,
      KM.CtrlCmd | KM.Shift | KC.UpArrow,
    ],
    run: (ed) => {
      ed.getAction('editor.action.moveLinesUpAction')?.run()
    },
  })

  // Alt+Shift+Down → Move line down
  monacoEditor.addAction({
    id: 'idea.moveLineDown',
    label: 'Move Line Down',
    keybindings: [
      KM.Alt | KM.Shift | KC.DownArrow,
      KM.CtrlCmd | KM.Shift | KC.DownArrow,
    ],
    run: (ed) => {
      ed.getAction('editor.action.moveLinesDownAction')?.run()
    },
  })

  // Ctrl+Shift+J → Join lines
  monacoEditor.addAction({
    id: 'idea.joinLines',
    label: 'Join Lines',
    keybindings: [KM.CtrlCmd | KM.Shift | KC.KeyJ],
    run: (ed) => {
      ed.getAction('editor.action.joinLines')?.run()
    },
  })

  // Ctrl+W → Extend selection (IDEA) instead of close tab
  monacoEditor.addAction({
    id: 'idea.expandSelection',
    label: 'Extend Selection',
    keybindings: [KM.CtrlCmd | KC.KeyW],
    run: (ed) => {
      ed.getAction('editor.action.smartSelect.expand')?.run()
    },
  })

  // Ctrl+Shift+W → Shrink selection
  monacoEditor.addAction({
    id: 'idea.shrinkSelection',
    label: 'Shrink Selection',
    keybindings: [KM.CtrlCmd | KM.Shift | KC.KeyW],
    run: (ed) => {
      ed.getAction('editor.action.smartSelect.shrink')?.run()
    },
  })

  // Ctrl+Alt+L → Reformat code (IDEA) instead of VS Code's Shift+Alt+F
  monacoEditor.addAction({
    id: 'idea.reformatCode',
    label: 'Reformat Code',
    keybindings: [KM.CtrlCmd | KM.Alt | KC.KeyL],
    run: (ed) => {
      ed.getAction('editor.action.formatDocument')?.run()
    },
  })

  // Ctrl+Shift+U → Toggle case
  monacoEditor.addAction({
    id: 'idea.toggleCase',
    label: 'Toggle Case',
    keybindings: [KM.CtrlCmd | KM.Shift | KC.KeyU],
    run: (ed) => {
      ed.getAction('editor.action.transformToUppercase')?.run()
    },
  })

  // Alt+Enter → Quick fix (IDEA) instead of VS Code's Ctrl+.
  monacoEditor.addAction({
    id: 'idea.quickFix',
    label: 'Quick Fix',
    keybindings: [KM.Alt | KC.Enter],
    run: (ed) => {
      ed.getAction('editor.action.quickFix')?.run()
    },
  })

  // Ctrl+Shift+Enter → Complete statement (add newline after closing brace)
  monacoEditor.addAction({
    id: 'idea.completeStatement',
    label: 'Complete Statement',
    keybindings: [KM.CtrlCmd | KM.Shift | KC.Enter],
    run: (ed) => {
      // Move to end of line, add newline
      ed.getAction('editor.action.insertLineAfter')?.run()
    },
  })

  // Cmd+Backspace → Delete entire line (IDEA behavior)
  // Monaco default: deletes from cursor to beginning of line (VS Code behavior)
  monacoEditor.addAction({
    id: 'idea.deleteLineBackspace',
    label: 'Delete Line',
    keybindings: [KM.CtrlCmd | KC.Backspace],
    run: (ed) => {
      ed.getAction('editor.action.deleteLines')?.run()
    },
  })

  // Cmd+Shift+/ → Toggle block comment (IDEA) instead of Shift+Alt+A (VS Code)
  monacoEditor.addAction({
    id: 'idea.blockComment',
    label: 'Toggle Block Comment',
    keybindings: [KM.CtrlCmd | KM.Shift | KC.Slash],
    run: (ed) => {
      ed.getAction('editor.action.blockComment')?.run()
    },
  })

  // F2 → Next error/warning (IDEA) instead of F8 (VS Code)
  monacoEditor.addAction({
    id: 'idea.nextError',
    label: 'Next Error',
    keybindings: [KC.F2],
    run: (ed) => {
      ed.getAction('editor.action.marker.nextInFiles')?.run()
    },
  })

  // Shift+F2 → Previous error/warning (IDEA) instead of Shift+F8 (VS Code)
  monacoEditor.addAction({
    id: 'idea.prevError',
    label: 'Previous Error',
    keybindings: [KM.Shift | KC.F2],
    run: (ed) => {
      ed.getAction('editor.action.marker.prevInFiles')?.run()
    },
  })

  // Cmd+B → Go to definition (IDEA) instead of F12 (VS Code)
  monacoEditor.addAction({
    id: 'idea.goToDefinition',
    label: 'Go to Definition',
    keybindings: [KM.CtrlCmd | KC.KeyB],
    run: (ed) => {
      ed.getAction('editor.action.revealDefinition')?.run()
    },
  })

  // Cmd+L → Go to line (IDEA macOS) instead of Ctrl+G (VS Code)
  monacoEditor.addAction({
    id: 'idea.goToLine',
    label: 'Go to Line',
    keybindings: [KM.CtrlCmd | KC.KeyL],
    run: (ed) => {
      ed.getAction('editor.action.gotoLine')?.run()
    },
  })

  // Cmd+Shift+Backspace → Last edit location (IDEA)
  monacoEditor.addAction({
    id: 'idea.lastEditLocation',
    label: 'Last Edit Location',
    keybindings: [KM.CtrlCmd | KM.Shift | KC.Backspace],
    run: (ed) => {
      // Navigate back to last cursor position (closest approximation)
      ed.trigger('idea', 'cursorUndo', null)
    },
  })
}
