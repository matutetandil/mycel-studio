import type { editor } from 'monaco-editor'

interface ValidationError {
  line: number
  startColumn: number
  endColumn: number
  message: string
  severity: 'error' | 'warning'
}

// Client-side lightweight validation for instant feedback
export function validateHclContent(content: string): ValidationError[] {
  const errors: ValidationError[] = []
  const lines = content.split('\n')

  let braceDepth = 0
  let inBlockComment = false
  const braceStack: { line: number; keyword?: string }[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1
    const trimmed = line.trimStart()

    // Handle block comments
    if (inBlockComment) {
      if (trimmed.includes('*/')) {
        inBlockComment = false
      }
      continue
    }

    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) {
        inBlockComment = true
      }
      continue
    }

    // Skip line comments and empty lines
    if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed === '') {
      continue
    }

    // Check for unclosed strings on a single line (simplified)
    const withoutEscaped = trimmed.replace(/\\"/g, '')
    const quoteCount = (withoutEscaped.match(/"/g) || []).length
    if (quoteCount % 2 !== 0 && !trimmed.includes('<<')) {
      errors.push({
        line: lineNum,
        startColumn: 1,
        endColumn: line.length + 1,
        message: 'Unclosed string literal',
        severity: 'error',
      })
    }

    // Track braces
    for (let j = 0; j < line.length; j++) {
      const ch = line[j]
      if (ch === '"') {
        // Skip string contents
        j++
        while (j < line.length && line[j] !== '"') {
          if (line[j] === '\\') j++ // skip escaped char
          j++
        }
        continue
      }
      if (ch === '#') break // rest is comment
      if (ch === '{') {
        // Try to find the keyword before this brace
        const before = line.substring(0, j).trim()
        const kwMatch = before.match(/(\w+)(?:\s+"[^"]*")?\s*$/)
        braceStack.push({ line: lineNum, keyword: kwMatch?.[1] })
        braceDepth++
      } else if (ch === '}') {
        if (braceDepth <= 0) {
          errors.push({
            line: lineNum,
            startColumn: j + 1,
            endColumn: j + 2,
            message: 'Unexpected closing brace — no matching opening brace',
            severity: 'error',
          })
        } else {
          braceStack.pop()
          braceDepth--
        }
      }
    }

    // Check for attribute syntax: key = value (at non-zero depth)
    if (braceDepth > 0 && !trimmed.endsWith('{') && trimmed !== '}') {
      // Lines inside blocks should either be attribute assignments or sub-blocks
      const isAttribute = /^\w[\w]*\s*=/.test(trimmed)
      const isBlock = /^\w[\w]*(?:\s+"[^"]*")?\s*\{/.test(trimmed)
      const isCloseBrace = trimmed === '}'

      if (!isAttribute && !isBlock && !isCloseBrace) {
        // Could be a bare value or malformed line — warning only
        // Don't warn for lines that look like they could be valid (e.g., multi-line strings)
        if (/^[a-zA-Z]/.test(trimmed) && !trimmed.includes('(') && !trimmed.includes('"')) {
          errors.push({
            line: lineNum,
            startColumn: 1,
            endColumn: line.length + 1,
            message: 'Expected attribute assignment (key = value) or block declaration',
            severity: 'warning',
          })
        }
      }
    }
  }

  // Unclosed block comment
  if (inBlockComment) {
    errors.push({
      line: lines.length,
      startColumn: 1,
      endColumn: lines[lines.length - 1].length + 1,
      message: 'Unclosed block comment',
      severity: 'error',
    })
  }

  // Unmatched opening braces
  for (const brace of braceStack) {
    errors.push({
      line: brace.line,
      startColumn: 1,
      endColumn: lines[brace.line - 1].length + 1,
      message: `Unclosed block${brace.keyword ? ` "${brace.keyword}"` : ''} — missing closing brace`,
      severity: 'error',
    })
  }

  return errors
}

// Set Monaco markers from validation errors
export function setValidationMarkers(
  monaco: typeof import('monaco-editor'),
  model: editor.ITextModel,
  errors: ValidationError[],
  owner: string = 'hcl-validator'
): void {
  const markers = errors.map(err => ({
    severity: err.severity === 'error'
      ? monaco.MarkerSeverity.Error
      : monaco.MarkerSeverity.Warning,
    message: err.message,
    startLineNumber: err.line,
    startColumn: err.startColumn,
    endLineNumber: err.line,
    endColumn: err.endColumn,
  }))

  monaco.editor.setModelMarkers(model, owner, markers)
}

// Debounced validation runner for use in editor onMount
export function createValidationRunner(
  monaco: typeof import('monaco-editor'),
  debounceMs: number = 500
) {
  let timer: ReturnType<typeof setTimeout> | null = null

  return function runValidation(model: editor.ITextModel) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const content = model.getValue()
      const errors = validateHclContent(content)
      setValidationMarkers(monaco, model, errors)
    }, debounceMs)
  }
}
