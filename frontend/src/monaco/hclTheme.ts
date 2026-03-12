import type { editor } from 'monaco-editor'

export const mycelDarkTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Keywords
    { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
    { token: 'keyword.sub', foreground: '569CD6' },

    // Strings
    { token: 'string', foreground: 'CE9178' },
    { token: 'string.block-name', foreground: '4EC9B0', fontStyle: 'bold' },
    { token: 'string.escape', foreground: 'D7BA7D' },
    { token: 'string.heredoc', foreground: 'CE9178' },
    { token: 'string.heredoc.delimiter', foreground: 'D7BA7D', fontStyle: 'bold' },

    // Numbers & constants
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'number.float', foreground: 'B5CEA8' },
    { token: 'constant.boolean', foreground: '569CD6', fontStyle: 'bold' },
    { token: 'constant.null', foreground: '569CD6', fontStyle: 'bold' },

    // Variables
    { token: 'variable.attribute', foreground: '9CDCFE' },
    { token: 'variable.block-name', foreground: '4EC9B0', fontStyle: 'bold' },
    { token: 'variable.context', foreground: '4FC1FF', fontStyle: 'italic' },

    // Functions
    { token: 'function.builtin', foreground: 'DCDCAA' },
    { token: 'function', foreground: 'DCDCAA' },

    // Types
    { token: 'type', foreground: '4EC9B0' },

    // Comments
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },

    // Operators & delimiters
    { token: 'operator', foreground: 'D4D4D4' },
    { token: 'delimiter.interpolation', foreground: 'FFD700' },
    { token: 'delimiter.comma', foreground: 'D4D4D4' },

    // Brackets
    { token: '@brackets', foreground: 'FFD700' },
  ],
  colors: {
    'editor.background': '#1a1a1a',
    'editor.foreground': '#D4D4D4',
    'editor.lineHighlightBackground': '#2a2a2a',
    'editorCursor.foreground': '#A78BFA',
    'editor.selectionBackground': '#3a3a5a',
    'editorIndentGuide.background': '#333333',
    'editorIndentGuide.activeBackground': '#555555',
  },
}

export const mycelLightTheme: editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: 'AF00DB', fontStyle: 'bold' },
    { token: 'keyword.sub', foreground: '0000FF' },
    { token: 'string', foreground: 'A31515' },
    { token: 'string.block-name', foreground: '267F99', fontStyle: 'bold' },
    { token: 'number', foreground: '098658' },
    { token: 'number.float', foreground: '098658' },
    { token: 'constant.boolean', foreground: '0000FF', fontStyle: 'bold' },
    { token: 'variable.attribute', foreground: '001080' },
    { token: 'variable.block-name', foreground: '267F99', fontStyle: 'bold' },
    { token: 'variable.context', foreground: '0070C1', fontStyle: 'italic' },
    { token: 'function.builtin', foreground: '795E26' },
    { token: 'function', foreground: '795E26' },
    { token: 'type', foreground: '267F99' },
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    { token: 'delimiter.interpolation', foreground: 'E36209' },
  ],
  colors: {},
}
