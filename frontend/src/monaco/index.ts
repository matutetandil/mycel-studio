import { hclLanguageConfig, hclMonarchTokens } from './hclLanguage'
import { mycelDarkTheme, mycelLightTheme } from './hclTheme'
import { createIDECompletionProvider } from './ideCompletionProvider'
import { createIDEHoverProvider } from './ideHoverProvider'
import { createIDEDefinitionProvider, setDefinitionNavigator } from './ideDefinitionProvider'
import { createIDECodeActionProvider } from './ideCodeActionProvider'
import { isWailsRuntime } from '../lib/api'

// Shared file path getter — returns the absolute path of the active HCL file
// Set by EditorGroup when mounting/switching files
let activeFilePath: string | null = null
export function setActiveIDEFilePath(path: string | null) { activeFilePath = path }
function getFilePath() { return activeFilePath }

let registered = false

export function setupMonaco(monaco: typeof import('monaco-editor')): void {
  if (registered) return
  registered = true

  // Register HCL language + themes (always needed for syntax coloring)
  monaco.languages.register({ id: 'hcl' })
  monaco.languages.setMonarchTokensProvider('hcl', hclMonarchTokens)
  monaco.languages.setLanguageConfiguration('hcl', hclLanguageConfig)
  monaco.editor.defineTheme('mycel-dark', mycelDarkTheme)
  monaco.editor.defineTheme('mycel-light', mycelLightTheme)

  // Use IDE engine providers (powered by Mycel pkg/ide)
  if (isWailsRuntime()) {
    monaco.languages.registerCompletionItemProvider('hcl', createIDECompletionProvider(monaco, getFilePath))
    monaco.languages.registerHoverProvider('hcl', createIDEHoverProvider(getFilePath))
    monaco.languages.registerDefinitionProvider('hcl', createIDEDefinitionProvider(getFilePath))
    monaco.languages.registerCodeActionProvider('hcl', createIDECodeActionProvider(monaco, getFilePath))
  } else {
    // Docker/browser fallback: use static providers (legacy)
    import('./hclCompletionProvider').then(m => {
      monaco.languages.registerCompletionItemProvider('hcl', m.createCompletionProvider(monaco))
    })
    import('./hclHoverProvider').then(m => {
      monaco.languages.registerHoverProvider('hcl', m.createHoverProvider())
    })
  }
}

export { createIDEValidator } from './ideValidator'
export { setDefinitionNavigator }
// Legacy export for Editor.tsx (Docker/browser mode)
export { createValidationRunner } from './hclValidator'
