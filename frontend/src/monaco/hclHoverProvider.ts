import type { languages, editor, Position, IMarkdownString } from 'monaco-editor'
import { BLOCK_DOCS, CEL_FUNCTION_DOCS, VARIABLE_DOCS, CONNECTOR_TYPE_DOCS } from './hclDocs'

export function createHoverProvider(): languages.HoverProvider {
  return {
    provideHover(model: editor.ITextModel, position: Position) {
      const word = model.getWordAtPosition(position)
      if (!word) return null

      const token = word.word
      const line = model.getLineContent(position.lineNumber)

      const contents: IMarkdownString[] = []

      // 1. Check if it's a block keyword
      if (BLOCK_DOCS[token]) {
        const doc = BLOCK_DOCS[token]
        contents.push({ value: `**${token}** block` })
        contents.push({ value: doc.description })
        if (doc.example) {
          contents.push({ value: '```hcl\n' + doc.example + '\n```' })
        }
      }

      // 2. Check if it's a connector type value (inside type = "...")
      if (CONNECTOR_TYPE_DOCS[token]) {
        const typeMatch = line.match(/type\s*=\s*"([^"]*)"/)
        const isInTypeAttr = typeMatch && typeMatch[1] === token
        // Also match if cursor is on the word regardless of surrounding quotes
        const isConnectorTypeContext = isInTypeAttr || line.includes(`"${token}"`)
        if (isConnectorTypeContext) {
          contents.push({ value: `**${token}** connector` })
          contents.push({ value: CONNECTOR_TYPE_DOCS[token] })
        }
      }

      // 3. Check if it's a CEL function
      const fnDoc = CEL_FUNCTION_DOCS.find(f => f.name === token)
      if (fnDoc) {
        // Check if it looks like a function call context
        const afterWord = line.substring(word.endColumn - 1)
        if (afterWord.startsWith('(') || line.includes(`${token}(`)) {
          contents.push({ value: `**${fnDoc.name}** — ${fnDoc.category}` })
          contents.push({ value: `\`${fnDoc.signature}\`` })
          contents.push({ value: fnDoc.description })
        }
      }

      // 4. Check if it's a context variable prefix
      if (VARIABLE_DOCS[token]) {
        const afterWord = line.substring(word.endColumn - 1)
        if (afterWord.startsWith('.')) {
          contents.push({ value: `**${token}** context variable` })
          contents.push({ value: VARIABLE_DOCS[token] })
        }
      }

      // 5. Check for common attributes
      const attrDocs: Record<string, string> = {
        connector: 'Reference to a connector defined in the project.',
        operation: 'The operation to perform (e.g., "GET /users", "INSERT").',
        target: 'The destination table, topic, or resource.',
        port: 'The port number to listen on or connect to.',
        driver: 'The driver/provider to use (e.g., sqlite, postgres, rabbitmq).',
        host: 'The hostname or IP address to connect to.',
        base_url: 'The base URL for HTTP requests.',
        timeout: 'Maximum time to wait for a response.',
        ttl: 'Time to live — how long to cache or hold a resource.',
        attempts: 'Number of retry attempts on failure.',
        backoff: 'Retry backoff strategy: constant, linear, or exponential.',
        chunk_size: 'Number of items to process per batch.',
        http_status_code: 'Override the HTTP response status code.',
        grpc_status_code: 'Override the gRPC response status code.',
        initial: 'The initial state of a state machine.',
      }

      // Only show attribute docs if we're at attribute position (before =)
      if (attrDocs[token] && line.match(new RegExp(`^\\s*${token}\\s*=`))) {
        if (contents.length === 0) {
          contents.push({ value: `**${token}**` })
          contents.push({ value: attrDocs[token] })
        }
      }

      if (contents.length === 0) return null

      return {
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        },
        contents,
      }
    },
  }
}
