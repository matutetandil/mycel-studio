import type { FilePreviewerDefinition, FilePreviewerProps } from '../types'

function SvgPreview({ content }: FilePreviewerProps) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div
        className="max-w-full max-h-full bg-neutral-800 rounded-lg p-6 border border-neutral-700 [&>svg]:max-w-full [&>svg]:max-h-[70vh] [&>svg]:mx-auto"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  )
}

export const svgPreviewer: FilePreviewerDefinition = {
  extensions: ['.svg'],
  label: 'Image',
  component: SvgPreview,
}
