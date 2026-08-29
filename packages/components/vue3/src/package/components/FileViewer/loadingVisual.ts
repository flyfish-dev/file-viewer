import { DEFAULT_RENDERER_DEFINITIONS } from '@file-viewer/core'

export type FileViewerLoadingVisualFamily =
  | 'word'
  | 'sheet'
  | 'slide'
  | 'pdf'
  | 'layout'
  | 'archive'
  | 'email'
  | 'eda'
  | 'cad'
  | 'model'
  | 'geo'
  | 'drawing'
  | 'mindmap'
  | 'ebook'
  | 'image'
  | 'medical'
  | 'security'
  | 'text'
  | 'code'
  | 'repository'
  | 'notebook'
  | 'web'
  | 'video'
  | 'audio'
  | 'font'
  | 'design'
  | 'data'
  | 'binary'
  | 'generic'

export interface FileViewerLoadingVisual {
  family: FileViewerLoadingVisualFamily;
  extensionLabel: string;
  rendererId: string;
  accent: string;
  accentSecondary: string;
  soft: string;
  glow: string;
}

interface LoadingVisualPalette {
  accent: string;
  accentSecondary: string;
  soft: string;
  glow: string;
}

const PALETTES: Readonly<Record<FileViewerLoadingVisualFamily, LoadingVisualPalette>> = Object.freeze({
  word: { accent: '#2563EB', accentSecondary: '#60A5FA', soft: 'rgba(37, 99, 235, 0.12)', glow: 'rgba(37, 99, 235, 0.28)' },
  sheet: { accent: '#15803D', accentSecondary: '#4ADE80', soft: 'rgba(21, 128, 61, 0.12)', glow: 'rgba(21, 128, 61, 0.27)' },
  slide: { accent: '#C2410C', accentSecondary: '#FB923C', soft: 'rgba(194, 65, 12, 0.12)', glow: 'rgba(234, 88, 12, 0.27)' },
  pdf: { accent: '#DC2626', accentSecondary: '#FB7185', soft: 'rgba(220, 38, 38, 0.11)', glow: 'rgba(220, 38, 38, 0.26)' },
  layout: { accent: '#7C3AED', accentSecondary: '#C084FC', soft: 'rgba(124, 58, 237, 0.11)', glow: 'rgba(124, 58, 237, 0.25)' },
  archive: { accent: '#A16207', accentSecondary: '#FACC15', soft: 'rgba(161, 98, 7, 0.12)', glow: 'rgba(202, 138, 4, 0.24)' },
  email: { accent: '#0369A1', accentSecondary: '#38BDF8', soft: 'rgba(3, 105, 161, 0.11)', glow: 'rgba(2, 132, 199, 0.25)' },
  eda: { accent: '#0F766E', accentSecondary: '#2DD4BF', soft: 'rgba(15, 118, 110, 0.11)', glow: 'rgba(13, 148, 136, 0.25)' },
  cad: { accent: '#0E7490', accentSecondary: '#22D3EE', soft: 'rgba(14, 116, 144, 0.11)', glow: 'rgba(8, 145, 178, 0.26)' },
  model: { accent: '#4D7C0F', accentSecondary: '#A3E635', soft: 'rgba(77, 124, 15, 0.11)', glow: 'rgba(101, 163, 13, 0.24)' },
  geo: { accent: '#047857', accentSecondary: '#34D399', soft: 'rgba(4, 120, 87, 0.11)', glow: 'rgba(5, 150, 105, 0.24)' },
  drawing: { accent: '#6D28D9', accentSecondary: '#A78BFA', soft: 'rgba(109, 40, 217, 0.11)', glow: 'rgba(124, 58, 237, 0.25)' },
  mindmap: { accent: '#9333EA', accentSecondary: '#E879F9', soft: 'rgba(147, 51, 234, 0.11)', glow: 'rgba(168, 85, 247, 0.25)' },
  ebook: { accent: '#7E22CE', accentSecondary: '#D8B4FE', soft: 'rgba(126, 34, 206, 0.11)', glow: 'rgba(147, 51, 234, 0.24)' },
  image: { accent: '#BE185D', accentSecondary: '#F472B6', soft: 'rgba(190, 24, 93, 0.11)', glow: 'rgba(219, 39, 119, 0.24)' },
  medical: { accent: '#0891B2', accentSecondary: '#67E8F9', soft: 'rgba(8, 145, 178, 0.11)', glow: 'rgba(6, 182, 212, 0.25)' },
  security: { accent: '#4F46E5', accentSecondary: '#A5B4FC', soft: 'rgba(79, 70, 229, 0.11)', glow: 'rgba(99, 102, 241, 0.25)' },
  text: { accent: '#4D7C0F', accentSecondary: '#84CC16', soft: 'rgba(77, 124, 15, 0.1)', glow: 'rgba(101, 163, 13, 0.22)' },
  code: { accent: '#334155', accentSecondary: '#94A3B8', soft: 'rgba(51, 65, 85, 0.11)', glow: 'rgba(71, 85, 105, 0.24)' },
  repository: { accent: '#C2410C', accentSecondary: '#FB7185', soft: 'rgba(194, 65, 12, 0.1)', glow: 'rgba(234, 88, 12, 0.23)' },
  notebook: { accent: '#B45309', accentSecondary: '#FBBF24', soft: 'rgba(180, 83, 9, 0.1)', glow: 'rgba(217, 119, 6, 0.23)' },
  web: { accent: '#0369A1', accentSecondary: '#22D3EE', soft: 'rgba(3, 105, 161, 0.1)', glow: 'rgba(2, 132, 199, 0.23)' },
  video: { accent: '#4338CA', accentSecondary: '#818CF8', soft: 'rgba(67, 56, 202, 0.11)', glow: 'rgba(79, 70, 229, 0.25)' },
  audio: { accent: '#0F766E', accentSecondary: '#5EEAD4', soft: 'rgba(15, 118, 110, 0.11)', glow: 'rgba(13, 148, 136, 0.24)' },
  font: { accent: '#9F1239', accentSecondary: '#FDA4AF', soft: 'rgba(159, 18, 57, 0.1)', glow: 'rgba(190, 24, 93, 0.23)' },
  design: { accent: '#C026D3', accentSecondary: '#F0ABFC', soft: 'rgba(192, 38, 211, 0.1)', glow: 'rgba(217, 70, 239, 0.23)' },
  data: { accent: '#5B21B6', accentSecondary: '#A78BFA', soft: 'rgba(91, 33, 182, 0.1)', glow: 'rgba(109, 40, 217, 0.23)' },
  binary: { accent: '#475569', accentSecondary: '#CBD5E1', soft: 'rgba(71, 85, 105, 0.1)', glow: 'rgba(100, 116, 139, 0.22)' },
  generic: { accent: '#475569', accentSecondary: '#94A3B8', soft: 'rgba(71, 85, 105, 0.1)', glow: 'rgba(100, 116, 139, 0.2)' }
})

const TEXT_EXTENSIONS = new Set(['txt', 'log'])
const REPOSITORY_EXTENSIONS = new Set(['bundle', 'bdl', 'diff', 'patch'])
const NOTEBOOK_EXTENSIONS = new Set(['ipynb'])
const WEB_EXTENSIONS = new Set(['html', 'htm', 'http', 'react', 'vue'])
const FONT_EXTENSIONS = new Set(['ttf', 'otf', 'woff', 'woff2'])
const DESIGN_EXTENSIONS = new Set(['psd', 'ai', 'eps'])
const DATA_EXTENSIONS = new Set(['sqlite', 'parquet', 'avro'])

const officeFamily = (rendererId: string, extension: string): FileViewerLoadingVisualFamily => {
  if (rendererId === 'office-presentation-binary' || rendererId === 'office-presentation' || rendererId === 'apple-keynote' || extension === 'odp') {
    return 'slide'
  }
  if (rendererId === 'spreadsheet-openxml' || rendererId === 'spreadsheet-dbf' || rendererId === 'apple-numbers') {
    return 'sheet'
  }
  return 'word'
}

const resolveFamily = (rendererId: string, category: string, extension: string): FileViewerLoadingVisualFamily => {
  if (category === 'office') return officeFamily(rendererId, extension)
  if (rendererId === 'pdf') return 'pdf'
  if (category === 'document') return 'layout'
  if (category === 'archive') return 'archive'
  if (category === 'email') return 'email'
  if (category === 'eda') return 'eda'
  if (category === 'cad') return 'cad'
  if (category === 'model') return 'model'
  if (category === 'geo') return 'geo'
  if (category === 'drawing') return 'drawing'
  if (category === 'mindmap') return 'mindmap'
  if (category === 'ebook') return 'ebook'
  if (category === 'image') return 'image'
  if (category === 'medical-image') return 'medical'
  if (category === 'cryptographic-container') return 'security'
  if (category === 'markdown') return 'text'
  if (rendererId === 'video') return 'video'
  if (rendererId === 'audio') return 'audio'
  if (category === 'code') {
    if (TEXT_EXTENSIONS.has(extension)) return 'text'
    if (REPOSITORY_EXTENSIONS.has(extension)) return 'repository'
    if (NOTEBOOK_EXTENSIONS.has(extension)) return 'notebook'
    if (WEB_EXTENSIONS.has(extension)) return 'web'
    return 'code'
  }
  if (category === 'asset') {
    if (FONT_EXTENSIONS.has(extension)) return 'font'
    if (DESIGN_EXTENSIONS.has(extension)) return 'design'
    if (DATA_EXTENSIONS.has(extension)) return 'data'
    if (extension === 'webarchive') return 'web'
    return 'binary'
  }
  return 'generic'
}

export const resolveFileViewerLoadingVisual = (extension = ''): FileViewerLoadingVisual => {
  const normalized = extension.trim().toLowerCase().replace(/^\./, '')
  const definition = DEFAULT_RENDERER_DEFINITIONS.find(item =>
    (item.extensions as readonly string[]).includes(normalized)
  )
  const family = definition
    ? resolveFamily(definition.id, definition.category, normalized)
    : 'generic'
  return {
    family,
    extensionLabel: normalized ? normalized.toUpperCase() : 'FILE',
    rendererId: definition?.id || 'fallback',
    ...PALETTES[family]
  }
}
