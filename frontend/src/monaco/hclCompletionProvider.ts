import type { languages, editor, Position, IRange } from 'monaco-editor'
import { BLOCK_DOCS, CEL_FUNCTION_DOCS, VARIABLE_DOCS, CONNECTOR_TYPE_DOCS } from './hclDocs'
import { getAllConnectorTypes } from '../connectors/registry'
import { getAllFlowBlocks } from '../flow-blocks/registry'
import { useStudioStore } from '../stores/useStudioStore'

// Determine the block context at a given position by scanning backwards for unclosed braces
function getBlockContext(model: editor.ITextModel, position: Position): {
  blockStack: string[]
  isValuePosition: boolean
  attributeName?: string
  wordRange?: IRange
} {
  const textUntilPosition = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  })

  // Get the current line up to cursor
  const currentLine = model.getLineContent(position.lineNumber).substring(0, position.column - 1).trim()

  // Check if we're in value position (after =)
  const eqMatch = currentLine.match(/^[\w]+\s*=\s*"?([^"]*)$/)
  const isValuePosition = !!eqMatch
  const attributeName = eqMatch ? currentLine.match(/^([\w]+)/)?.[1] : undefined

  // Build block stack by tracking braces (simplified — ignores strings)
  const blockStack: string[] = []
  const lines = textUntilPosition.split('\n')
  const braceStack: string[] = []

  for (const line of lines) {
    const stripped = line.replace(/#.*$/, '').replace(/\/\/.*$/, '').trim()
    if (!stripped) continue

    // Match block opener: keyword ["name"] {
    const blockMatch = stripped.match(/^(\w+)(?:\s+"[^"]*")?(?:\s+\w+)?\s*\{/)
    if (blockMatch) {
      braceStack.push(blockMatch[1])
    }

    // Count standalone closing braces
    if (stripped === '}') {
      braceStack.pop()
    }
  }

  blockStack.push(...braceStack)

  return { blockStack, isValuePosition, attributeName }
}

export function createCompletionProvider(monaco: typeof import('monaco-editor')): languages.CompletionItemProvider {
  return {
    triggerCharacters: ['"', '.', '=', ' '],

    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position)
      const range: IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const ctx = getBlockContext(model, position)
      const suggestions: languages.CompletionItem[] = []
      const currentBlock = ctx.blockStack[ctx.blockStack.length - 1]

      // --- Value position completions ---
      if (ctx.isValuePosition) {
        // Connector type values
        if (ctx.attributeName === 'type' && (currentBlock === 'connector' || !currentBlock)) {
          for (const type of getAllConnectorTypes()) {
            suggestions.push({
              label: type,
              kind: monaco.languages.CompletionItemKind.EnumMember,
              detail: CONNECTOR_TYPE_DOCS[type] || `${type} connector`,
              insertText: currentBlock ? type : `"${type}"`,
              range,
            })
          }
          return { suggestions }
        }

        // Driver values
        if (ctx.attributeName === 'driver' && currentBlock === 'connector') {
          const drivers = ['sqlite', 'postgres', 'mysql', 'mongodb', 'rabbitmq', 'kafka', 'redis', 'memory',
            'smtp', 'sendgrid', 'ses', 'twilio', 'fcm', 'apns', 'ftp', 'sftp']
          for (const d of drivers) {
            suggestions.push({
              label: d,
              kind: monaco.languages.CompletionItemKind.EnumMember,
              insertText: d,
              range,
            })
          }
          return { suggestions }
        }

        // Connector name references (in from/to blocks)
        if (ctx.attributeName === 'connector' && (currentBlock === 'from' || currentBlock === 'to' || currentBlock === 'step')) {
          const state = useStudioStore.getState()
          const connectorNodes = state.nodes.filter(n => n.type === 'connector')
          for (const node of connectorNodes) {
            const data = node.data as { label?: string; connectorType?: string }
            suggestions.push({
              label: data.label || node.id,
              kind: monaco.languages.CompletionItemKind.Reference,
              detail: `${data.connectorType || 'unknown'} connector`,
              insertText: data.label || node.id,
              range,
            })
          }
          return { suggestions }
        }

        // Backoff strategy
        if (ctx.attributeName === 'backoff') {
          for (const strategy of ['constant', 'linear', 'exponential']) {
            suggestions.push({
              label: strategy,
              kind: monaco.languages.CompletionItemKind.EnumMember,
              insertText: strategy,
              range,
            })
          }
          return { suggestions }
        }

        // On error strategy
        if (ctx.attributeName === 'on_error') {
          for (const strategy of ['fail', 'skip', 'default']) {
            suggestions.push({
              label: strategy,
              kind: monaco.languages.CompletionItemKind.EnumMember,
              insertText: strategy,
              range,
            })
          }
          return { suggestions }
        }

        // CEL expression context - suggest variables and functions
        const lineText = model.getLineContent(position.lineNumber)
        const beforeCursor = lineText.substring(0, position.column - 1)
        const dotMatch = beforeCursor.match(/(input|output|step|error|enriched|context|flow)\.\s*$/)
        if (dotMatch) {
          const varName = dotMatch[1]
          suggestions.push({
            label: `${varName}.*`,
            kind: monaco.languages.CompletionItemKind.Variable,
            detail: VARIABLE_DOCS[varName] || '',
            insertText: '',
            range,
          })
          return { suggestions }
        }

        // CEL functions in string values
        for (const fn of CEL_FUNCTION_DOCS) {
          suggestions.push({
            label: fn.name,
            kind: monaco.languages.CompletionItemKind.Function,
            detail: fn.signature,
            documentation: fn.description,
            insertText: fn.name + '($1)',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
        }

        return { suggestions }
      }

      // --- Block/attribute position completions ---

      // Top-level: no block context
      if (ctx.blockStack.length === 0) {
        const topBlocks = ['connector', 'flow', 'type', 'validator', 'transform', 'aspect', 'saga', 'state_machine', 'service', 'auth', 'security', 'plugin', 'workflow']
        for (const block of topBlocks) {
          const doc = BLOCK_DOCS[block]
          const needsName = !['service', 'auth', 'security', 'workflow'].includes(block)
          suggestions.push({
            label: block,
            kind: monaco.languages.CompletionItemKind.Keyword,
            detail: doc?.description,
            insertText: needsName
              ? `${block} "\${1:name}" {\n  \${0}\n}`
              : `${block} {\n  \${0}\n}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
        }
        return { suggestions }
      }

      // Inside connector block
      if (currentBlock === 'connector') {
        const attrs = ['type', 'driver', 'port', 'host', 'base_url', 'database', 'timeout', 'cors',
          'proto_path', 'schema', 'bucket', 'region', 'base_path', 'format', 'watch',
          'broker', 'client_id', 'qos', 'topic', 'queue', 'channels',
          'endpoint', 'namespace', 'version', 'wsdl', 'webhook_url', 'token', 'channel',
          'provider', 'client_id', 'scopes', 'working_dir', 'shell', 'path', 'heartbeat',
          'slot', 'tables', 'url', 'method']
        for (const attr of attrs) {
          suggestions.push({
            label: attr,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: `${attr} = "\${1}"`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
        }
        return { suggestions }
      }

      // Inside flow block
      if (currentBlock === 'flow') {
        // Flow sub-blocks from registry
        for (const block of getAllFlowBlocks()) {
          const doc = BLOCK_DOCS[block.key]
          suggestions.push({
            label: block.key,
            kind: monaco.languages.CompletionItemKind.Keyword,
            detail: doc?.description || block.menuDescription,
            insertText: block.key === 'step'
              ? `step "\${1:name}" {\n  connector = "\${2}"\n  operation = "\${3}"\n}`
              : `${block.key} {\n  \${0}\n}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
        }

        // Also add from/to which aren't in the flow block registry
        if (!suggestions.find(s => s.label === 'from')) {
          suggestions.push({
            label: 'from',
            kind: monaco.languages.CompletionItemKind.Keyword,
            detail: BLOCK_DOCS.from?.description,
            insertText: 'from {\n  connector = "${1}"\n  operation = "${2}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
        }
        if (!suggestions.find(s => s.label === 'to')) {
          suggestions.push({
            label: 'to',
            kind: monaco.languages.CompletionItemKind.Keyword,
            detail: BLOCK_DOCS.to?.description,
            insertText: 'to {\n  connector = "${1}"\n  target    = "${2}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
        }
        return { suggestions }
      }

      // Inside from/to blocks
      if (currentBlock === 'from' || currentBlock === 'to') {
        const attrs = currentBlock === 'from'
          ? ['connector', 'operation', 'filter']
          : ['connector', 'target', 'operation', 'when']
        for (const attr of attrs) {
          suggestions.push({
            label: attr,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: `${attr} = "\${1}"`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
        }
        return { suggestions }
      }

      // Inside error_handling
      if (currentBlock === 'error_handling') {
        for (const sub of ['retry', 'fallback', 'error_response']) {
          suggestions.push({
            label: sub,
            kind: monaco.languages.CompletionItemKind.Keyword,
            detail: BLOCK_DOCS[sub]?.description,
            insertText: `${sub} {\n  \${0}\n}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
        }
        return { suggestions }
      }

      // Inside retry
      if (currentBlock === 'retry') {
        for (const attr of ['attempts', 'backoff', 'delay', 'max_delay']) {
          suggestions.push({
            label: attr,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: attr === 'attempts' ? `${attr} = \${1:3}` : `${attr} = "\${1}"`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
        }
        return { suggestions }
      }

      // Inside step
      if (currentBlock === 'step') {
        for (const attr of ['connector', 'operation', 'query', 'params', 'when', 'timeout', 'on_error']) {
          suggestions.push({
            label: attr,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: `${attr} = "\${1}"`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
        }
        return { suggestions }
      }

      // Inside transform/response blocks - suggest CEL expressions
      if (currentBlock === 'transform' || currentBlock === 'response') {
        // Suggest field = "expr" pattern
        suggestions.push({
          label: 'field',
          kind: monaco.languages.CompletionItemKind.Property,
          detail: 'Add a field mapping',
          insertText: '${1:field_name} = "${2:expression}"',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })

        if (currentBlock === 'response') {
          suggestions.push({
            label: 'http_status_code',
            kind: monaco.languages.CompletionItemKind.Property,
            detail: 'Override HTTP response status code',
            insertText: 'http_status_code = "${1:201}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
          suggestions.push({
            label: 'grpc_status_code',
            kind: monaco.languages.CompletionItemKind.Property,
            detail: 'Override gRPC response status code',
            insertText: 'grpc_status_code = "${1:0}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
        }
        return { suggestions }
      }

      // Inside cache/lock/semaphore/dedupe
      if (['cache', 'lock', 'semaphore', 'dedupe'].includes(currentBlock)) {
        const attrs = currentBlock === 'semaphore'
          ? ['storage', 'key', 'limit']
          : ['storage', 'key', 'ttl']
        if (currentBlock === 'dedupe') attrs.push('on_duplicate')
        for (const attr of attrs) {
          suggestions.push({
            label: attr,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: attr === 'limit' ? `${attr} = \${1:5}` : `${attr} = "\${1}"`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
        }
        return { suggestions }
      }

      // Inside saga
      if (currentBlock === 'saga') {
        suggestions.push({
          label: 'step',
          kind: monaco.languages.CompletionItemKind.Keyword,
          detail: 'Add a saga step with action and compensation',
          insertText: 'step "${1:name}" {\n  action {\n    connector = "${2}"\n    target    = "${3}"\n  }\n  compensate {\n    connector = "${4}"\n    target    = "${5}"\n  }\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })
        for (const attr of ['on_complete', 'on_failure']) {
          suggestions.push({
            label: attr,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: `${attr} {\n  connector = "\${1}"\n  target    = "\${2}"\n}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
        }
        return { suggestions }
      }

      // Inside state_machine
      if (currentBlock === 'state_machine') {
        suggestions.push(
          {
            label: 'initial',
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: 'initial = "${1:pending}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          },
          {
            label: 'state',
            kind: monaco.languages.CompletionItemKind.Keyword,
            detail: 'Define a state with transitions',
            insertText: 'state "${1:name}" {\n  transition "${2:event}" {\n    target = "${3:next_state}"\n  }\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          },
        )
        return { suggestions }
      }

      // Inside type block - suggest field types
      if (currentBlock === 'type') {
        const types = ['string', 'number', 'integer', 'boolean', 'array', 'object', 'date', 'email']
        suggestions.push({
          label: 'field',
          kind: monaco.languages.CompletionItemKind.Property,
          detail: 'Add a typed field',
          insertText: '${1:field_name} = ${2:string}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })
        for (const t of types) {
          suggestions.push({
            label: t,
            kind: monaco.languages.CompletionItemKind.TypeParameter,
            detail: `Field type: ${t}`,
            insertText: t,
            range,
          })
        }
        return { suggestions }
      }

      // Inside validate block
      if (currentBlock === 'validate') {
        for (const attr of ['input', 'output']) {
          suggestions.push({
            label: attr,
            kind: monaco.languages.CompletionItemKind.Property,
            detail: `Type reference for ${attr} validation`,
            insertText: `${attr} = "\${1}"`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })
        }
        return { suggestions }
      }

      return { suggestions }
    },
  }
}
