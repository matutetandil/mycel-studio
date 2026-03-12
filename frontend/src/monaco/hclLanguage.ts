import type { languages } from 'monaco-editor'

export const hclLanguageConfig: languages.LanguageConfiguration = {
  comments: {
    lineComment: '#',
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ],
  folding: {
    markers: {
      start: /^\s*\{/,
      end: /^\s*\}/,
    },
  },
  indentationRules: {
    increaseIndentPattern: /\{\s*$/,
    decreaseIndentPattern: /^\s*\}/,
  },
}

export const hclMonarchTokens: languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.hcl',

  // Top-level block keywords
  topLevelBlocks: [
    'connector', 'flow', 'type', 'validator', 'transform', 'aspect',
    'saga', 'state_machine', 'service', 'auth', 'security', 'environment',
    'plugin', 'workflow', 'batch',
  ],

  // Flow sub-block keywords
  subBlocks: [
    'from', 'to', 'step', 'response', 'error_handling', 'retry',
    'fallback', 'error_response', 'cache', 'lock', 'semaphore', 'dedupe',
    'filter', 'validate', 'require', 'when', 'action', 'compensate',
    'transition', 'guard', 'on_complete', 'on_failure', 'body',
    'jwt', 'password', 'mfa', 'sessions', 'brute_force', 'replay_protection',
    'social', 'storage', 'input_limits', 'sanitizer',
  ],

  // Built-in functions
  builtinFunctions: [
    'env', 'uuid', 'now', 'lower', 'upper', 'len', 'map', 'filter',
    'sort_by', 'contains', 'starts_with', 'ends_with', 'int', 'float',
    'string', 'base64_encode', 'base64_decode', 'json_encode', 'json_decode',
    'trim', 'split', 'join', 'replace', 'substr', 'format', 'coalesce',
  ],

  // Built-in types for type definitions
  typeKeywords: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'date', 'email'],

  operators: ['=', '==', '!=', '>', '<', '>=', '<=', '&&', '||', '!', '+', '-', '*', '/', '%'],

  symbols: /[=><!~?:&|+\-*/^%]+/,

  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      // Whitespace
      [/\s+/, 'white'],

      // Comments
      [/#.*$/, 'comment'],
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],

      // Block declarations: `connector "name" {`
      [/(connector|flow|type|validator|transform|aspect|saga|state_machine|service|auth|security|environment|plugin|workflow|batch)(\s+)("(?:[^"\\]|\\.)*")/, ['keyword', 'white', 'string.block-name']],
      [/(connector|flow|type|validator|transform|aspect|saga|state_machine|service|auth|security|environment|plugin|workflow|batch)(\s+)([a-zA-Z_][\w]*)/, ['keyword', 'white', 'variable.block-name']],
      [/\b(connector|flow|type|validator|transform|aspect|saga|state_machine|service|auth|security|environment|plugin|workflow|batch)\b(?=\s*\{)/, 'keyword'],

      // Sub-block keywords
      [/\b(from|to|step|response|error_handling|retry|fallback|error_response|cache|lock|semaphore|dedupe|filter|validate|require|when|action|compensate|transition|guard|on_complete|on_failure|body|jwt|password|mfa|sessions|brute_force|replay_protection|social|storage|input_limits|sanitizer)\b(?=\s*[\{=])/, 'keyword.sub'],

      // Boolean literals
      [/\b(true|false)\b/, 'constant.boolean'],

      // Null
      [/\bnull\b/, 'constant.null'],

      // Numbers
      [/\b\d+\.\d+\b/, 'number.float'],
      [/\b\d+\b/, 'number'],

      // Strings with interpolation
      [/"/, 'string', '@string'],

      // Heredoc
      [/<<-?\s*(\w+)/, { token: 'string.heredoc.delimiter', next: '@heredoc.$1' }],

      // Function calls
      [/\b(env|uuid|now|lower|upper|len|map|filter|sort_by|contains|starts_with|ends_with|int|float|string|base64_encode|base64_decode|json_encode|json_decode|trim|split|join|replace|substr|format|coalesce)\b(?=\s*\()/, 'function.builtin'],
      [/[a-zA-Z_][\w]*(?=\s*\()/, 'function'],

      // Attribute name (identifier followed by =)
      [/[a-zA-Z_][\w]*(?=\s*=)/, 'variable.attribute'],

      // Context variable references
      [/\b(input|output|step|error|enriched|context|flow)\b(?=\.)/, 'variable.context'],

      // Type keywords
      [/\b(string|number|integer|boolean|array|object|date|email)\b/, 'type'],

      // Regular identifiers
      [/[a-zA-Z_][\w]*/, 'identifier'],

      // Delimiters
      [/[{}()\[\]]/, '@brackets'],

      // Operators
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': '',
        }
      }],

      // Commas
      [/,/, 'delimiter.comma'],
    ],

    comment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],

    string: [
      [/\$\{/, { token: 'delimiter.interpolation', next: '@interpolation' }],
      [/[^\\"$]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],

    interpolation: [
      [/\}/, { token: 'delimiter.interpolation', next: '@pop' }],
      { include: 'root' },
    ],

    heredoc: [
      [/^(\s*)([A-Z_]+)$/, {
        cases: {
          '$2==$S2': { token: 'string.heredoc.delimiter', next: '@pop' },
          '@default': 'string.heredoc',
        },
      }],
      [/.*$/, 'string.heredoc'],
    ],
  },
}
