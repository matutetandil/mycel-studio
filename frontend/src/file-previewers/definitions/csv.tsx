import { useState, useMemo } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import type { FilePreviewerDefinition, FilePreviewerProps } from '../types'

function parseCsv(content: string, separator: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  let row: string[] = []

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (inQuotes) {
      if (ch === '"' && content[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === separator) {
        row.push(current)
        current = ''
      } else if (ch === '\n' || (ch === '\r' && content[i + 1] === '\n')) {
        row.push(current)
        current = ''
        if (row.some(c => c.trim())) rows.push(row)
        row = []
        if (ch === '\r') i++
      } else {
        current += ch
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current)
    if (row.some(c => c.trim())) rows.push(row)
  }
  return rows
}

function CsvPreview({ content, fileName }: FilePreviewerProps) {
  const separator = fileName.endsWith('.tsv') ? '\t' : ','
  const rows = useMemo(() => parseCsv(content, separator), [content, separator])
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  if (rows.length === 0) return <p className="text-neutral-500 text-sm">Empty file</p>

  const headers = rows[0]
  const data = rows.slice(1)

  const sorted = useMemo(() => {
    if (sortCol === null) return data
    return [...data].sort((a, b) => {
      const va = a[sortCol] || ''
      const vb = b[sortCol] || ''
      const na = parseFloat(va)
      const nb = parseFloat(vb)
      if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na - nb : nb - na
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [data, sortCol, sortAsc])

  const handleSort = (col: number) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc)
    } else {
      setSortCol(col)
      setSortAsc(true)
    }
  }

  return (
    <div className="overflow-auto h-full">
      <table className="border-collapse w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-neutral-500 text-xs font-normal w-10 text-right">#</th>
            {headers.map((h, i) => (
              <th
                key={i}
                onClick={() => handleSort(i)}
                className="bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-left font-semibold text-neutral-200 cursor-pointer hover:bg-neutral-750 select-none whitespace-nowrap"
              >
                <span className="flex items-center gap-1">
                  {h || `Column ${i + 1}`}
                  {sortCol === i && (sortAsc
                    ? <ArrowUp className="w-3 h-3 text-indigo-400" />
                    : <ArrowDown className="w-3 h-3 text-indigo-400" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, ri) => (
            <tr key={ri} className="hover:bg-neutral-800/50">
              <td className="border border-neutral-800 px-3 py-1 text-neutral-600 text-xs text-right">{ri + 1}</td>
              {headers.map((_, ci) => (
                <td key={ci} className="border border-neutral-800 px-3 py-1 text-neutral-300 whitespace-nowrap">
                  {row[ci] || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-neutral-600 px-3 py-2">
        {data.length} rows × {headers.length} columns
      </div>
    </div>
  )
}

export const csvPreviewer: FilePreviewerDefinition = {
  extensions: ['.csv', '.tsv'],
  label: 'Table',
  component: CsvPreview,
}
