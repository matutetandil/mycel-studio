import { hclLanguageConfig, hclMonarchTokens } from './hclLanguage'
import { mycelDarkTheme, mycelLightTheme } from './hclTheme'
import { createIDECompletionProvider } from './ideCompletionProvider'
import { createIDEHoverProvider } from './ideHoverProvider'
import { createIDEDefinitionProvider, setDefinitionNavigator } from './ideDefinitionProvider'
import { createIDECodeActionProvider, registerHintCommand } from './ideCodeActionProvider'
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

  // Register Mycel language (also as 'hcl' for backward compat with .hcl files)
  monaco.languages.register({ id: 'mycel', extensions: ['.mycel'], aliases: ['Mycel', 'mycel'] })
  monaco.languages.setMonarchTokensProvider('mycel', hclMonarchTokens)
  monaco.languages.setLanguageConfiguration('mycel', hclLanguageConfig)
  // Also register 'hcl' as alias for existing .hcl files
  monaco.languages.register({ id: 'hcl', extensions: ['.hcl'], aliases: ['HCL'] })
  monaco.languages.setMonarchTokensProvider('hcl', hclMonarchTokens)
  monaco.languages.setLanguageConfiguration('hcl', hclLanguageConfig)
  monaco.editor.defineTheme('mycel-dark', mycelDarkTheme)
  monaco.editor.defineTheme('mycel-light', mycelLightTheme)

  // Register refactoring command handler
  registerHintCommand(monaco)

  // Use IDE engine providers (powered by Mycel pkg/ide)
  if (isWailsRuntime()) {
    // Register IDE providers for both mycel and hcl languages
    for (const langId of ['mycel', 'hcl']) {
      monaco.languages.registerCompletionItemProvider(langId, createIDECompletionProvider(monaco, getFilePath))
      monaco.languages.registerHoverProvider(langId, createIDEHoverProvider(getFilePath))
      monaco.languages.registerDefinitionProvider(langId, createIDEDefinitionProvider(getFilePath))
      monaco.languages.registerCodeActionProvider(langId, createIDECodeActionProvider(monaco, getFilePath))
    }
  } else {
    // Docker/browser fallback: use static providers (legacy)
    import('./hclCompletionProvider').then(m => {
      monaco.languages.registerCompletionItemProvider('mycel', m.createCompletionProvider(monaco))
      monaco.languages.registerCompletionItemProvider('hcl', m.createCompletionProvider(monaco))
    })
    import('./hclHoverProvider').then(m => {
      monaco.languages.registerHoverProvider('mycel', m.createHoverProvider())
      monaco.languages.registerHoverProvider('hcl', m.createHoverProvider())
    })
  }
}

export { createIDEValidator } from './ideValidator'
export { setDefinitionNavigator }
// Legacy export for Editor.tsx (Docker/browser mode)
export { createValidationRunner } from './hclValidator'
