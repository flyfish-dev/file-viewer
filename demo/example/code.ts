import { computed, ref } from 'vue'

type PreviewStatus = 'idle' | 'downloading' | 'rendering' | 'ready' | 'error'
type PreviewKind = 'document' | 'sheet' | 'drawing' | 'source' | 'media' | 'unknown'

interface PreviewSource {
  id: string
  filename: string
  url: string
  size?: number
  updatedAt?: string
}

interface RenderPlan {
  kind: PreviewKind
  extension: string
  lazyChunk: string
  preferredInput: 'url' | 'file'
}

const chunkMap: Record<string, RenderPlan['kind']> = {
  doc: 'document',
  docx: 'document',
  pdf: 'document',
  ofd: 'document',
  xlsx: 'sheet',
  csv: 'sheet',
  dxf: 'drawing',
  dwg: 'drawing',
  ts: 'source',
  json: 'source',
  mp4: 'media'
}

export const activeSource = ref<PreviewSource>({
  id: 'sample-ofd',
  filename: 'invoice.ofd',
  url: '/example/ofd.ofd',
  updatedAt: '2026-05-19T10:00:00+08:00'
})

export const status = ref<PreviewStatus>('idle')
export const statusText = computed(() => `${activeSource.value.filename} / ${status.value}`)

function getExtension(filename: string) {
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex >= 0 ? filename.slice(dotIndex + 1).toLowerCase() : ''
}

export function createRenderPlan(source: PreviewSource): RenderPlan {
  const extension = getExtension(source.filename)
  const kind = chunkMap[extension] || 'unknown'

  return {
    kind,
    extension,
    lazyChunk: kind === 'unknown' ? 'fallback' : `${kind}-${extension}`,
    preferredInput: source.url.includes('/download') ? 'file' : 'url'
  }
}

export async function openPreview(source: PreviewSource) {
  activeSource.value = source
  status.value = 'downloading'

  const response = await fetch(source.url, { credentials: 'include' })
  if (!response.ok) {
    status.value = 'error'
    throw new Error(`Download failed: ${response.status}`)
  }

  status.value = 'rendering'
  const blob = await response.blob()
  status.value = 'ready'
  return new File([blob], source.filename, { type: blob.type })
}
