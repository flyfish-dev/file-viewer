const RENDERER_GROUPS = {
  document: ['doc', 'docx', 'pdf', 'ofd'],
  sheet: ['xlsx', 'xls', 'csv', 'ods'],
  drawing: ['dxf', 'dwg'],
  source: ['js', 'ts', 'tsx', 'vue', 'json', 'yaml']
}

const DEFAULT_ICON = {
  label: 'FILE',
  tone: '#64748b'
}

function normalizeExtension(filename = '') {
  const cleanName = filename.split('?')[0].split('#')[0]
  const dotIndex = cleanName.lastIndexOf('.')
  return dotIndex >= 0 ? cleanName.slice(dotIndex + 1).toLowerCase() : ''
}

export function resolvePreviewMeta(filename) {
  const extension = normalizeExtension(filename)

  for (const [group, extensions] of Object.entries(RENDERER_GROUPS)) {
    if (extensions.includes(extension)) {
      return {
        group,
        extension,
        icon: extension.toUpperCase(),
        supported: true
      }
    }
  }

  return {
    group: 'unknown',
    extension,
    icon: DEFAULT_ICON.label,
    supported: false
  }
}

export async function createPreviewFile(url, fallbackName = 'download.bin') {
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) {
    throw new Error(`Download failed with ${response.status}`)
  }

  const blob = await response.blob()
  const name = decodeURIComponent(url.split('/').pop() || fallbackName)
  return new File([blob], name, { type: blob.type })
}

const samples = ['invoice.ofd', 'drawing.dxf', 'component.vue', 'archive.unknown']
const summary = samples.map(resolvePreviewMeta)

console.table(summary)
