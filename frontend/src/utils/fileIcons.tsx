import {
  FileCode, FileJson, FileText, FileType, FileImage,
  Database, Terminal, Lock, Settings, GitBranch,
  Globe, Braces, Hash, Coffee, Gem, Cog,
  Package, FileSpreadsheet, Shield, Key,
  type LucideIcon,
} from 'lucide-react'

export interface FileTypeInfo {
  icon: LucideIcon
  color: string       // Tailwind text color
  language: string    // Monaco language ID
  label: string       // Human-readable label
}

// Known languages for "Open as..." menu
export const KNOWN_LANGUAGES: { id: string; label: string }[] = [
  { id: 'hcl', label: 'HCL' },
  { id: 'json', label: 'JSON' },
  { id: 'yaml', label: 'YAML' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'go', label: 'Go' },
  { id: 'python', label: 'Python' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'rust', label: 'Rust' },
  { id: 'java', label: 'Java' },
  { id: 'php', label: 'PHP' },
  { id: 'sql', label: 'SQL' },
  { id: 'css', label: 'CSS' },
  { id: 'scss', label: 'SCSS' },
  { id: 'html', label: 'HTML' },
  { id: 'xml', label: 'XML' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'shell', label: 'Shell' },
  { id: 'dockerfile', label: 'Dockerfile' },
  { id: 'graphql', label: 'GraphQL' },
  { id: 'ini', label: 'INI / Config' },
  { id: 'c', label: 'C' },
  { id: 'cpp', label: 'C++' },
  { id: 'swift', label: 'Swift' },
  { id: 'kotlin', label: 'Kotlin' },
  { id: 'lua', label: 'Lua' },
  { id: 'r', label: 'R' },
  { id: 'protobuf', label: 'Protobuf' },
  { id: 'plaintext', label: 'Plain Text' },
]

// Extension → FileTypeInfo
const EXT_MAP: Record<string, FileTypeInfo> = {
  // HCL / Terraform
  '.hcl':        { icon: Braces,      color: 'text-purple-400',  language: 'hcl',        label: 'HCL' },
  '.tf':         { icon: Braces,      color: 'text-purple-400',  language: 'hcl',        label: 'Terraform' },
  '.tfvars':     { icon: Braces,      color: 'text-purple-400',  language: 'hcl',        label: 'Terraform Vars' },

  // JSON / YAML / TOML
  '.json':       { icon: FileJson,    color: 'text-yellow-400',  language: 'json',       label: 'JSON' },
  '.jsonc':      { icon: FileJson,    color: 'text-yellow-400',  language: 'json',       label: 'JSON with Comments' },
  '.yaml':       { icon: FileCode,    color: 'text-red-400',     language: 'yaml',       label: 'YAML' },
  '.yml':        { icon: FileCode,    color: 'text-red-400',     language: 'yaml',       label: 'YAML' },
  '.toml':       { icon: Settings,    color: 'text-neutral-400', language: 'plaintext',  label: 'TOML' },

  // JavaScript / TypeScript
  '.js':         { icon: FileCode,    color: 'text-yellow-300',  language: 'javascript',   label: 'JavaScript' },
  '.jsx':        { icon: FileCode,    color: 'text-cyan-400',    language: 'javascript',   label: 'JSX' },
  '.ts':         { icon: FileCode,    color: 'text-blue-400',    language: 'typescript',   label: 'TypeScript' },
  '.tsx':        { icon: FileCode,    color: 'text-blue-300',    language: 'typescript',   label: 'TSX' },
  '.mjs':        { icon: FileCode,    color: 'text-yellow-300',  language: 'javascript',   label: 'ES Module' },
  '.cjs':        { icon: FileCode,    color: 'text-yellow-300',  language: 'javascript',   label: 'CommonJS' },

  // Go
  '.go':         { icon: FileCode,    color: 'text-cyan-400',    language: 'go',           label: 'Go' },
  '.mod':        { icon: FileCode,    color: 'text-cyan-400',    language: 'go',           label: 'Go Module' },
  '.sum':        { icon: Lock,        color: 'text-cyan-600',    language: 'plaintext',    label: 'Go Checksum' },

  // Python
  '.py':         { icon: FileCode,    color: 'text-green-400',   language: 'python',       label: 'Python' },
  '.pyi':        { icon: FileCode,    color: 'text-green-400',   language: 'python',       label: 'Python Stub' },

  // Ruby
  '.rb':         { icon: Gem,         color: 'text-red-400',     language: 'ruby',         label: 'Ruby' },
  '.erb':        { icon: Gem,         color: 'text-red-400',     language: 'html',         label: 'ERB' },

  // Rust
  '.rs':         { icon: Cog,         color: 'text-orange-400',  language: 'rust',         label: 'Rust' },

  // Java / Kotlin
  '.java':       { icon: Coffee,      color: 'text-orange-300',  language: 'java',         label: 'Java' },
  '.kt':         { icon: FileCode,    color: 'text-purple-300',  language: 'kotlin',       label: 'Kotlin' },

  // PHP
  '.php':        { icon: FileCode,    color: 'text-indigo-300',  language: 'php',          label: 'PHP' },

  // C / C++
  '.c':          { icon: FileCode,    color: 'text-blue-500',    language: 'c',            label: 'C' },
  '.h':          { icon: FileCode,    color: 'text-blue-500',    language: 'c',            label: 'C Header' },
  '.cpp':        { icon: FileCode,    color: 'text-blue-400',    language: 'cpp',          label: 'C++' },
  '.hpp':        { icon: FileCode,    color: 'text-blue-400',    language: 'cpp',          label: 'C++ Header' },

  // Swift
  '.swift':      { icon: FileCode,    color: 'text-orange-400',  language: 'swift',        label: 'Swift' },

  // SQL
  '.sql':        { icon: Database,    color: 'text-blue-300',    language: 'sql',          label: 'SQL' },

  // Web
  '.html':       { icon: Globe,       color: 'text-orange-400',  language: 'html',         label: 'HTML' },
  '.htm':        { icon: Globe,       color: 'text-orange-400',  language: 'html',         label: 'HTML' },
  '.css':        { icon: Hash,        color: 'text-blue-400',    language: 'css',          label: 'CSS' },
  '.scss':       { icon: Hash,        color: 'text-pink-400',    language: 'scss',         label: 'SCSS' },
  '.less':       { icon: Hash,        color: 'text-indigo-400',  language: 'less',         label: 'LESS' },
  '.svg':        { icon: FileImage,   color: 'text-amber-400',   language: 'xml',          label: 'SVG' },

  // Markdown / Text
  '.md':         { icon: FileText,    color: 'text-blue-300',    language: 'markdown',     label: 'Markdown' },
  '.mdx':        { icon: FileText,    color: 'text-blue-300',    language: 'markdown',     label: 'MDX' },
  '.txt':        { icon: FileText,    color: 'text-neutral-400', language: 'plaintext',    label: 'Text' },
  '.log':        { icon: FileText,    color: 'text-neutral-500', language: 'plaintext',    label: 'Log' },
  '.csv':        { icon: FileSpreadsheet, color: 'text-green-400', language: 'plaintext',  label: 'CSV' },
  '.tsv':        { icon: FileSpreadsheet, color: 'text-green-400', language: 'plaintext',  label: 'TSV' },

  // Shell
  '.sh':         { icon: Terminal,    color: 'text-green-300',   language: 'shell',        label: 'Shell' },
  '.bash':       { icon: Terminal,    color: 'text-green-300',   language: 'shell',        label: 'Bash' },
  '.zsh':        { icon: Terminal,    color: 'text-green-300',   language: 'shell',        label: 'Zsh' },
  '.fish':       { icon: Terminal,    color: 'text-green-300',   language: 'shell',        label: 'Fish' },
  '.ps1':        { icon: Terminal,    color: 'text-blue-300',    language: 'shell',        label: 'PowerShell' },
  '.bat':        { icon: Terminal,    color: 'text-green-300',   language: 'shell',        label: 'Batch' },
  '.cmd':        { icon: Terminal,    color: 'text-green-300',   language: 'shell',        label: 'Batch' },

  // Config
  '.ini':        { icon: Settings,    color: 'text-neutral-400', language: 'ini',          label: 'INI' },
  '.cfg':        { icon: Settings,    color: 'text-neutral-400', language: 'ini',          label: 'Config' },
  '.conf':       { icon: Settings,    color: 'text-neutral-400', language: 'ini',          label: 'Config' },
  '.properties': { icon: Settings,    color: 'text-neutral-400', language: 'ini',          label: 'Properties' },
  '.env':        { icon: Key,         color: 'text-yellow-500',  language: 'ini',          label: 'Environment' },

  // Docker
  '.dockerfile': { icon: Package,     color: 'text-blue-400',    language: 'dockerfile',   label: 'Dockerfile' },

  // GraphQL / Protobuf
  '.graphql':    { icon: Braces,      color: 'text-pink-400',    language: 'graphql',      label: 'GraphQL' },
  '.gql':        { icon: Braces,      color: 'text-pink-400',    language: 'graphql',      label: 'GraphQL' },
  '.proto':      { icon: FileCode,    color: 'text-teal-400',    language: 'protobuf',     label: 'Protobuf' },

  // XML
  '.xml':        { icon: FileCode,    color: 'text-orange-300',  language: 'xml',          label: 'XML' },
  '.xsl':        { icon: FileCode,    color: 'text-orange-300',  language: 'xml',          label: 'XSLT' },
  '.wsdl':       { icon: FileCode,    color: 'text-orange-300',  language: 'xml',          label: 'WSDL' },

  // Security
  '.pem':        { icon: Shield,      color: 'text-green-500',   language: 'plaintext',    label: 'PEM Certificate' },
  '.crt':        { icon: Shield,      color: 'text-green-500',   language: 'plaintext',    label: 'Certificate' },
  '.key':        { icon: Key,         color: 'text-red-400',     language: 'plaintext',    label: 'Private Key' },

  // Lua / R
  '.lua':        { icon: FileCode,    color: 'text-blue-300',    language: 'lua',          label: 'Lua' },
  '.r':          { icon: FileCode,    color: 'text-blue-400',    language: 'r',            label: 'R' },

  // Images (won't syntax highlight, but show correct icon)
  '.png':        { icon: FileImage,   color: 'text-green-400',   language: 'plaintext',    label: 'PNG Image' },
  '.jpg':        { icon: FileImage,   color: 'text-green-400',   language: 'plaintext',    label: 'JPEG Image' },
  '.jpeg':       { icon: FileImage,   color: 'text-green-400',   language: 'plaintext',    label: 'JPEG Image' },
  '.gif':        { icon: FileImage,   color: 'text-green-400',   language: 'plaintext',    label: 'GIF Image' },
  '.ico':        { icon: FileImage,   color: 'text-green-400',   language: 'plaintext',    label: 'Icon' },
  '.webp':       { icon: FileImage,   color: 'text-green-400',   language: 'plaintext',    label: 'WebP Image' },

  // Misc
  '.wasm':       { icon: Cog,         color: 'text-purple-400',  language: 'plaintext',    label: 'WebAssembly' },
  '.lock':       { icon: Lock,        color: 'text-neutral-500', language: 'plaintext',    label: 'Lock File' },
}

// Full filename → FileTypeInfo (for files like Dockerfile, Makefile, .gitignore)
const FILENAME_MAP: Record<string, FileTypeInfo> = {
  'dockerfile':      { icon: Package,   color: 'text-blue-400',    language: 'dockerfile',  label: 'Dockerfile' },
  'makefile':        { icon: Cog,       color: 'text-orange-400',  language: 'makefile',    label: 'Makefile' },
  'gemfile':         { icon: Gem,       color: 'text-red-400',     language: 'ruby',        label: 'Gemfile' },
  'rakefile':        { icon: Gem,       color: 'text-red-400',     language: 'ruby',        label: 'Rakefile' },
  'cmakelists.txt':  { icon: Cog,       color: 'text-blue-400',    language: 'cmake',       label: 'CMake' },
  '.gitignore':      { icon: GitBranch, color: 'text-orange-400',  language: 'ini',         label: 'Git Ignore' },
  '.gitattributes':  { icon: GitBranch, color: 'text-orange-400',  language: 'ini',         label: 'Git Attributes' },
  '.gitmodules':     { icon: GitBranch, color: 'text-orange-400',  language: 'ini',         label: 'Git Modules' },
  '.dockerignore':   { icon: Package,   color: 'text-blue-400',    language: 'ini',         label: 'Docker Ignore' },
  '.editorconfig':   { icon: Settings,  color: 'text-neutral-400', language: 'ini',         label: 'EditorConfig' },
  '.prettierrc':     { icon: Settings,  color: 'text-neutral-400', language: 'json',        label: 'Prettier Config' },
  '.eslintrc':       { icon: Settings,  color: 'text-purple-400',  language: 'json',        label: 'ESLint Config' },
  '.babelrc':        { icon: Settings,  color: 'text-yellow-400',  language: 'json',        label: 'Babel Config' },
  'license':         { icon: FileType,  color: 'text-yellow-500',  language: 'plaintext',   label: 'License' },
  'readme':          { icon: FileText,  color: 'text-blue-300',    language: 'markdown',    label: 'README' },
  'changelog':       { icon: FileText,  color: 'text-green-300',   language: 'markdown',    label: 'Changelog' },
}

// Persistent user overrides: filename → language ID
// Stored in localStorage so it survives across sessions
const STORAGE_KEY = 'mycel-file-language-overrides'

function loadOverrides(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveOverrides(overrides: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}

export function setLanguageOverride(fileName: string, languageId: string) {
  const overrides = loadOverrides()
  overrides[fileName.toLowerCase()] = languageId
  saveOverrides(overrides)
}

export function removeLanguageOverride(fileName: string) {
  const overrides = loadOverrides()
  delete overrides[fileName.toLowerCase()]
  saveOverrides(overrides)
}

export function getLanguageOverride(fileName: string): string | null {
  const overrides = loadOverrides()
  return overrides[fileName.toLowerCase()] || null
}

// Core lookup: get file type info for a filename
export function getFileTypeInfo(fileName: string): FileTypeInfo {
  const lower = fileName.toLowerCase()

  // Check user override first
  const override = getLanguageOverride(lower)
  if (override) {
    const lang = KNOWN_LANGUAGES.find(l => l.id === override)
    // Find the first extension that matches this language for icon/color
    const matchingExt = Object.entries(EXT_MAP).find(([, v]) => v.language === override)
    if (matchingExt) {
      return { ...matchingExt[1], language: override, label: lang?.label || override }
    }
    return { icon: FileCode, color: 'text-neutral-400', language: override, label: lang?.label || override }
  }

  // Check full filename (Dockerfile, Makefile, .gitignore, etc.)
  if (FILENAME_MAP[lower]) return FILENAME_MAP[lower]

  // Check without extension for names like "Dockerfile.local" → match "dockerfile"
  const baseName = lower.replace(/\.[^.]+$/, '')
  if (FILENAME_MAP[baseName]) return { ...FILENAME_MAP[baseName], label: FILENAME_MAP[baseName].label }

  // Check by extension
  const dotIdx = lower.lastIndexOf('.')
  if (dotIdx >= 0) {
    const ext = lower.slice(dotIdx)
    if (EXT_MAP[ext]) return EXT_MAP[ext]

    // Compound extensions: .env.local → try .env
    const prevDot = lower.lastIndexOf('.', dotIdx - 1)
    if (prevDot >= 0) {
      const baseExt = lower.slice(prevDot, dotIdx)
      if (EXT_MAP[baseExt]) return EXT_MAP[baseExt]
    }
  }

  // Default
  return { icon: FileText, color: 'text-neutral-500', language: 'plaintext', label: 'Plain Text' }
}

// Convenience: get just the Monaco language ID
export function getLanguageForFile(fileName: string): string {
  return getFileTypeInfo(fileName).language
}
