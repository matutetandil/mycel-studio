import MonacoEditor from '@monaco-editor/react'
import { setupMonaco } from '../../monaco'

interface MiniEditorProps {
  value: string
  onChange: (value: string) => void
  language: 'sql' | 'json' | 'hcl' | 'plaintext'
  height?: string | number
  placeholder?: string
  readOnly?: boolean
}

export default function MiniEditor({
  value,
  onChange,
  language,
  height = '80px',
  placeholder,
  readOnly = false,
}: MiniEditorProps) {
  return (
    <div className="border border-neutral-600 rounded overflow-hidden bg-neutral-900">
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        theme="mycel-dark"
        beforeMount={language === 'hcl' ? setupMonaco : undefined}
        onChange={(v) => onChange(v || '')}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 12,
          lineNumbers: 'off',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          scrollbar: { vertical: 'auto', horizontal: 'hidden' },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          renderLineHighlight: 'none',
          folding: false,
          glyphMargin: false,
          lineDecorationsWidth: 4,
          lineNumbersMinChars: 0,
          padding: { top: 4, bottom: 4 },
          tabSize: 2,
          placeholder,
        }}
      />
    </div>
  )
}
