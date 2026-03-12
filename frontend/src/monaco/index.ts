import { hclLanguageConfig, hclMonarchTokens } from './hclLanguage'
import { mycelDarkTheme, mycelLightTheme } from './hclTheme'
import { createCompletionProvider } from './hclCompletionProvider'
import { createHoverProvider } from './hclHoverProvider'

let registered = false

export function setupMonaco(monaco: typeof import('monaco-editor')): void {
  if (registered) return
  registered = true

  // Register HCL language
  monaco.languages.register({ id: 'hcl' })
  monaco.languages.setMonarchTokensProvider('hcl', hclMonarchTokens)
  monaco.languages.setLanguageConfiguration('hcl', hclLanguageConfig)

  // Register themes
  monaco.editor.defineTheme('mycel-dark', mycelDarkTheme)
  monaco.editor.defineTheme('mycel-light', mycelLightTheme)

  // Register completion provider
  monaco.languages.registerCompletionItemProvider('hcl', createCompletionProvider(monaco))

  // Register hover provider
  monaco.languages.registerHoverProvider('hcl', createHoverProvider())
}

export { createValidationRunner } from './hclValidator'
