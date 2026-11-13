import type { FileViewerLocale } from '@file-viewer/core'

type ViewerPreset = 'lite' | 'office' | 'engineering' | 'all'

interface ViewerBootstrapOptions {
  container: HTMLElement
  src: string
  locale?: FileViewerLocale
  preset?: ViewerPreset
}

const presetHint: Record<ViewerPreset, string> = {
  lite: 'Small attachment previews',
  office: 'Office, PDF, OFD, and OpenDocument previews',
  engineering: 'CAD, 3D, diagrams, Typst, archive, and data previews',
  all: 'Complete demo and internal workbench capability'
}

export async function bootstrapViewer(options: ViewerBootstrapOptions) {
  const { mountViewer } = await import('@file-viewer/web')
  return mountViewer(options.container, {
    src: options.src,
    locale: options.locale ?? 'auto',
    toolbar: { download: true, print: true, exportHtml: true },
    watermark: false,
    meta: {
      presetHint: presetHint[options.preset ?? 'lite']
    }
  })
}
