import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { FilePreviewerDefinition, FilePreviewerProps } from '../types'

function MarkdownPreview({ content }: FilePreviewerProps) {
  return (
    <div className="markdown-preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

export const markdownPreviewer: FilePreviewerDefinition = {
  extensions: ['.md', '.mdx', '.markdown'],
  label: 'Markdown',
  component: MarkdownPreview,
}
