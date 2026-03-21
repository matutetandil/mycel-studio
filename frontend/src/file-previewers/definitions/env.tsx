import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { FilePreviewerDefinition, FilePreviewerProps } from '../types'

interface EnvEntry {
  key: string
  value: string
  isComment: boolean
  isSecret: boolean
  raw: string
}

function parseEnv(content: string): EnvEntry[] {
  return content.split('\n').map(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      return { key: '', value: '', isComment: true, isSecret: false, raw: line }
    }
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) {
      return { key: trimmed, value: '', isComment: false, isSecret: false, raw: line }
    }
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    const isSecret = /secret|password|token|key|api_key|private/i.test(key)
    return { key, value, isComment: false, isSecret, raw: line }
  })
}

function EnvPreview({ content }: FilePreviewerProps) {
  const entries = parseEnv(content)
  const [showSecrets, setShowSecrets] = useState(false)
  const hasSecrets = entries.some(e => e.isSecret)

  return (
    <div>
      {hasSecrets && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setShowSecrets(!showSecrets)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200"
          >
            {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showSecrets ? 'Hide secrets' : 'Show secrets'}
          </button>
        </div>
      )}
      <table className="border-collapse w-full text-sm">
        <thead>
          <tr>
            <th className="bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-left font-semibold text-neutral-200 w-1/3">Key</th>
            <th className="bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-left font-semibold text-neutral-200">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            if (entry.isComment) {
              return entry.raw.trim() ? (
                <tr key={i}>
                  <td colSpan={2} className="border border-neutral-800 px-3 py-1 text-neutral-600 italic text-xs">
                    {entry.raw.trim()}
                  </td>
                </tr>
              ) : null
            }
            return (
              <tr key={i} className="hover:bg-neutral-800/50">
                <td className="border border-neutral-800 px-3 py-1.5 font-mono text-violet-400 text-xs">
                  {entry.key}
                </td>
                <td className="border border-neutral-800 px-3 py-1.5 font-mono text-xs">
                  {entry.isSecret && !showSecrets ? (
                    <span className="text-neutral-600">••••••••</span>
                  ) : (
                    <span className={entry.value ? 'text-sky-400' : 'text-neutral-600'}>{entry.value || '(empty)'}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="text-xs text-neutral-600 px-1 py-2">
        {entries.filter(e => !e.isComment).length} variables
        {hasSecrets && ` · ${entries.filter(e => e.isSecret).length} secrets`}
      </div>
    </div>
  )
}

export const envPreviewer: FilePreviewerDefinition = {
  extensions: ['.env'],
  label: 'Table',
  component: EnvPreview,
}
