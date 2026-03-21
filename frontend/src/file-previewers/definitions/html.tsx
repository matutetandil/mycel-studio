import { useRef, useEffect } from 'react'
import type { FilePreviewerDefinition, FilePreviewerProps } from '../types'

function HtmlPreview({ content }: FilePreviewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return
    doc.open()
    doc.write(content)
    doc.close()
  }, [content])

  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full border-0 bg-white rounded"
      sandbox="allow-same-origin"
      title="HTML Preview"
    />
  )
}

export const htmlPreviewer: FilePreviewerDefinition = {
  extensions: ['.html', '.htm'],
  label: 'Render',
  component: HtmlPreview,
}
