import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { copyFile, cp, lstat, mkdir, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { Alias, AliasOptions, Plugin, ResolvedConfig, UserConfig } from 'vite'

export type FileViewerVitePreset = 'all' | 'lite' | 'standard' | 'office' | 'engineering'
export type FileViewerVitePresetMode = FileViewerVitePreset | 'auto'
export type FileViewerMissingRendererMode = 'error' | 'warn' | 'ignore'
export type FileViewerChunkStrategy = 'renderer' | 'none'

export interface FileViewerRendererScanOptions {
  /**
   * Disable a shared scan object without branching user config.
   */
  enabled?: boolean
  /**
   * Source roots, relative to Vite root, that should be inspected for format hints.
   * Defaults to common application source folders.
   */
  roots?: readonly string[]
  /**
   * Text-like source extensions to inspect. Values may include or omit the dot.
   */
  extensions?: readonly string[]
  /**
   * Large generated files are ignored by default to keep config/startup fast.
   */
  maxFileSize?: number
}

export interface FileViewerCopyAssetsOptions {
  /**
   * Directory used by Vite dev. Defaults to config.publicDir.
   */
  publicDir?: string
  /**
   * Directory used after production build. Defaults to build.outDir.
   */
  outDir?: string
  /**
   * Directory below publicDir/outDir where assets are published. When omitted,
   * projects with an installed @file-viewer/*-full package use `file-viewer`;
   * other projects keep the existing output-root layout. Use an empty string
   * to explicitly publish at the output root. The injected runtime module
   * keeps every renderer's default asset base aligned with this directory.
   */
  baseDir?: string
  /**
   * Copy during dev server startup, build closeBundle, or both.
   */
  mode?: 'dev' | 'build' | 'both'
}

export interface FileViewerRenderersPluginOptions {
  /**
   * File extensions or renderer ids. Examples: pdf, .dwg, typst, zip, xmind.
   */
  formats?: readonly string[]
  /**
   * Explicit renderer ids. Useful when several extensions share one renderer.
   */
  renderers?: readonly string[]
  /**
   * Presets import their dedicated @file-viewer/preset-* package. Use `auto`
   * to discover installed preset packages, and add `formats` / `renderers`
   * when you need to extend a preset with extra lines.
   */
  preset?: FileViewerVitePresetMode
  /**
   * Auto-discovers installed `@file-viewer/preset-*` packages and registers
   * them globally for framework components. Defaults to true only when no
   * explicit preset/formats/renderers are configured, or when `preset: 'auto'`.
   */
  autoPresets?: boolean | readonly FileViewerVitePreset[]
  /**
   * Injects the virtual renderer module into Vite HTML entrypoints so
   * framework components can consume auto-registered renderers without
   * application code importing `virtual:file-viewer-renderers`.
   */
  inject?: boolean
  /**
   * Virtual module id consumed by application code.
   */
  moduleId?: string
  /**
   * Controls how planned-but-not-yet-extracted renderer lines are reported.
   */
  missingRenderer?: FileViewerMissingRendererMode
  /**
   * Adds renderer-oriented manualChunks when the user did not define one.
   */
  chunkStrategy?: FileViewerChunkStrategy
  /**
   * Wraps existing manualChunks functions with known circular-dependency-safe
   * vendor groups. This keeps CodeMirror/Lezer/Sandpack in one chunk when host
   * apps split node_modules by package name, avoiding production TDZ errors.
   */
  stabilizeInteropChunks?: boolean
  /**
   * Copies known worker/WASM/vendor assets for selected renderer lines.
   */
  copyAssets?: boolean | FileViewerCopyAssetsOptions
  /**
   * Opt-in source scan. The plugin reads lightweight hints such as
   * `fileViewerFormats = ['pdf', 'docx']`, `data-file-viewer-formats="pdf,docx"`,
   * and upload `accept=".pdf,.docx"` declarations, then merges them with
   * `formats` / `renderers` before generating the virtual module.
   */
  scan?: boolean | FileViewerRendererScanOptions
}

interface RendererModuleDescriptor {
  id: string
  packageName: string
  exportName: string
  formats: readonly string[]
  rendererIds: readonly string[]
  chunkName: string
  includeInPresetAll?: boolean
}

interface PresetModuleDescriptor {
  id: FileViewerVitePreset
  packageName: string
  exportName: string
  rendererIds: readonly string[]
  chunkName: string
}

interface MissingRendererNotice {
  format: string
  targetPackage?: string
  note: string
}

interface RendererSelection {
  preset: FileViewerVitePreset | null
  descriptors: RendererModuleDescriptor[]
  missing: MissingRendererNotice[]
}

interface AssetCopyResult {
  rendererId: string
  id: string
  to: string
  copied: boolean
  required?: boolean
  reason?: string
  sourcePackage?: string
  sourceVersion?: string
}

const virtualModuleId = 'virtual:file-viewer-renderers'
const resolvedVirtualModuleId = `\0${virtualModuleId}`
const packagedPptFallbackModuleId = 'virtual:file-viewer-packaged-ppt-fallback'
const resolvedPackagedPptFallbackModuleId = `\0${packagedPptFallbackModuleId}`

const isPresentationRendererImporter = (importer?: string) => {
  if (!importer) return false
  const normalized = importer.replace(/\\/g, '/')
  return (
    normalized.includes('/@file-viewer/renderer-presentation/') ||
    normalized.includes('/@file-viewer+renderer-presentation@') ||
    normalized.includes('/packages/renderers/presentation/') ||
    normalized.includes('/@file-viewer/renderer-ppt/') ||
    normalized.includes('/@file-viewer+renderer-ppt@') ||
    normalized.includes('/packages/renderers/presentation-ppt/')
  )
}
const pluginRequire = createRequire(import.meta.url)
let workspacePackageJsonCache: { root: string; packages: Map<string, string> } | null = null

const rendererModules: readonly RendererModuleDescriptor[] = [
  {
    id: 'pdf',
    packageName: '@file-viewer/renderer-pdf',
    exportName: 'pdfRenderer',
    formats: ['pdf'],
    rendererIds: ['pdf'],
    chunkName: 'file-viewer-pdf'
  },
  {
    id: 'ofd',
    packageName: '@file-viewer/renderer-ofd',
    exportName: 'ofdRenderer',
    formats: ['ofd'],
    rendererIds: ['ofd'],
    chunkName: 'file-viewer-ofd'
  },
  {
    id: 'cad',
    packageName: '@file-viewer/renderer-cad',
    exportName: 'cadRenderer',
    formats: ['cad', 'dwg', 'dxf', 'dwf', 'dwfx', 'xps'],
    rendererIds: ['cad'],
    chunkName: 'file-viewer-cad'
  },
  {
    id: 'typst',
    packageName: '@file-viewer/renderer-typst',
    exportName: 'typstRenderer',
    formats: ['typ', 'typst'],
    rendererIds: ['typst'],
    chunkName: 'file-viewer-typst'
  },
  {
    id: 'presentation',
    packageName: '@file-viewer/renderer-presentation',
    exportName: 'presentationRenderer',
    formats: ['presentation'],
    rendererIds: ['office-presentation-binary', 'office-presentation'],
    chunkName: 'file-viewer-presentation'
  },
  {
    id: 'presentation-binary',
    packageName: '@file-viewer/renderer-ppt',
    exportName: 'pptRenderer',
    formats: ['ppt', 'pot'],
    rendererIds: ['office-presentation-binary'],
    chunkName: 'file-viewer-presentation-ppt'
  },
  {
    id: 'presentation-openxml',
    packageName: '@file-viewer/renderer-pptx',
    exportName: 'pptxRenderer',
    formats: ['pptx', 'pptm', 'potx', 'potm', 'ppsx', 'ppsm'],
    rendererIds: ['office-presentation'],
    chunkName: 'file-viewer-presentation-pptx'
  },
  {
    id: 'word',
    packageName: '@file-viewer/renderer-word',
    exportName: 'wordRenderer',
    formats: ['word', 'doc', 'docx', 'docm', 'dot', 'dotx', 'dotm', 'odt', 'odp', 'rtf'],
    rendererIds: ['office-word-openxml', 'office-word-binary', 'open-document'],
    chunkName: 'file-viewer-word'
  },
  {
    id: 'spreadsheet',
    packageName: '@file-viewer/renderer-spreadsheet',
    exportName: 'spreadsheetRenderer',
    formats: ['spreadsheet', 'excel', 'xls', 'xlsx', 'xltx', 'xlsm', 'xlsb', 'xlt', 'xla', 'xlam', 'xltm', 'csv', 'tsv', 'ods', 'fods', 'dbf'],
    rendererIds: ['spreadsheet-openxml', 'spreadsheet-dbf'],
    chunkName: 'file-viewer-spreadsheet'
  },
  {
    id: 'iwork',
    packageName: '@file-viewer/renderer-iwork',
    exportName: 'iworkRenderer',
    formats: ['iwork', 'pages', 'numbers', 'key', 'keynote'],
    rendererIds: ['apple-pages', 'apple-numbers', 'apple-keynote'],
    chunkName: 'file-viewer-iwork'
  },
  {
    id: 'wordperfect',
    packageName: '@file-viewer/renderer-wordperfect',
    exportName: 'wordPerfectRenderer',
    formats: ['wordperfect', 'wpd', 'wp', 'wp5', 'wp6'],
    rendererIds: ['office-wordperfect'],
    chunkName: 'file-viewer-wordperfect'
  },
  {
    id: 'hangul',
    packageName: '@file-viewer/renderer-hangul',
    exportName: 'hangulRenderer',
    formats: ['hangul', 'hwp', 'hwpx'],
    rendererIds: ['office-hangul'],
    chunkName: 'file-viewer-hangul'
  },
  {
    id: 'drawing',
    packageName: '@file-viewer/renderer-drawing',
    exportName: 'drawingRenderer',
    formats: ['drawing', 'drawio', 'dio', 'excalidraw', 'mermaid', 'mmd', 'plantuml', 'puml'],
    rendererIds: ['drawing'],
    chunkName: 'file-viewer-drawing'
  },
  {
    id: 'model',
    packageName: '@file-viewer/renderer-3d',
    exportName: 'modelRenderer',
    formats: [
      '3d',
      'model',
      'stl',
      'obj',
      'gltf',
      'glb',
      'fbx',
      'dae',
      '3ds',
      '3mf',
      'amf',
      'ply',
      'pcd',
      'vrml',
      'wrl',
      'vtk',
      'vtp',
      'xyz',
      'usd',
      'usda',
      'usdc',
      'usdz',
      'kmz',
      'step',
      'stp',
      'iges',
      'igs',
      'ifc',
      '3dm',
      'brep'
    ],
    rendererIds: ['model'],
    chunkName: 'file-viewer-3d'
  },
  {
    id: 'archive',
    packageName: '@file-viewer/renderer-archive',
    exportName: 'archiveRenderer',
    formats: [
      'archive',
      'zip',
      'zipx',
      '7z',
      'rar',
      'tar',
      'gz',
      'gzip',
      'tgz',
      'bz2',
      'bzip2',
      'tbz',
      'tbz2',
      'xz',
      'txz',
      'lzma',
      'zst',
      'tzst',
      'cab',
      'ar',
      'cpio',
      'iso',
      'xar',
      'lha',
      'lzh',
      'jar',
      'war',
      'ear',
      'apk',
      'cbz',
      'cbr'
    ],
    rendererIds: ['archive'],
    chunkName: 'file-viewer-archive'
  },
  {
    id: 'chm',
    packageName: '@file-viewer/renderer-chm',
    exportName: 'chmRenderer',
    formats: ['chm'],
    rendererIds: ['chm'],
    chunkName: 'file-viewer-chm'
  },
  {
    id: 'email',
    packageName: '@file-viewer/renderer-email',
    exportName: 'emailRenderer',
    formats: ['email', 'eml', 'msg', 'mbox'],
    rendererIds: ['email'],
    chunkName: 'file-viewer-email'
  },
  {
    id: 'ebook',
    packageName: '@file-viewer/renderer-epub',
    exportName: 'ebookRenderer',
    formats: ['ebook', 'epub', 'fb2', 'umd'],
    rendererIds: ['epub', 'ebook-fb2', 'umd'],
    chunkName: 'file-viewer-ebook'
  },
  {
    id: 'text',
    packageName: '@file-viewer/renderer-text',
    exportName: 'textRenderer',
    formats: [
      'text',
      'txt',
      'log',
      'code',
      'md',
      'markdown',
      'js',
      'mjs',
      'cjs',
      'jsx',
      'ts',
      'tsx',
      'json',
      'jsonc',
      'json5',
      'xml',
      'yaml',
      'yml',
      'toml',
      'ini',
      'htm',
      'html',
      'css',
      'vue',
      'py',
      'java',
      'go',
      'rs',
      'c',
      'cpp',
      'cc',
      'h',
      'hpp',
      'cs',
      'diff',
      'patch',
      'bundle',
      'bdl',
      'php',
      'rb',
      'swift',
      'kt',
      'sh',
      'bash',
      'sql',
      'json5',
      'proto',
      'hcl',
      'tex',
      'gv',
      'graphviz',
      'http',
      'react',
      'ipynb'
    ],
    rendererIds: ['code', 'markdown'],
    chunkName: 'file-viewer-text'
  },
  {
    id: 'image',
    packageName: '@file-viewer/renderer-image',
    exportName: 'imageRenderer',
    formats: [
      'image',
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'svg',
      'bmp',
      'tiff',
      'tif',
      'avif',
      'ico',
      'heic',
      'heif',
      'jxl'
    ],
    rendererIds: ['image'],
    chunkName: 'file-viewer-image'
  },
  {
    id: 'dicom',
    packageName: '@file-viewer/renderer-dicom',
    exportName: 'dicomRenderer',
    formats: ['dicom', 'dcm'],
    rendererIds: ['dicom'],
    chunkName: 'file-viewer-dicom',
    includeInPresetAll: false
  },
  {
    id: 'signature',
    packageName: '@file-viewer/renderer-signature',
    exportName: 'signatureRenderer',
    formats: [
      'p7m',
      'p7s',
      'p7c',
      'p7b',
      'pkcs7',
      'cms',
      'cmsc',
      'tsd',
      'tst',
      'tsq',
      'tsr',
      'asics',
      'scs',
      'asice',
      'sce',
      'ers',
      'asc',
      'sig',
      'pgp',
      'gpg',
      'jws'
    ],
    rendererIds: ['signature'],
    chunkName: 'file-viewer-signature',
    includeInPresetAll: false
  },
  {
    id: 'media',
    packageName: '@file-viewer/renderer-media',
    exportName: 'mediaRenderer',
    formats: [
      'media',
      'audio',
      'video',
      'mp3',
      'mpeg',
      'wav',
      'ogg',
      'oga',
      'opus',
      'flac',
      'aac',
      'm4a',
      'mp4',
      'webm',
      'weba',
      'mov',
      'm3u8',
      'midi',
      'mid'
    ],
    rendererIds: ['audio', 'video'],
    chunkName: 'file-viewer-media'
  },
  {
    id: 'mindmap',
    packageName: '@file-viewer/renderer-mindmap',
    exportName: 'mindmapRenderer',
    formats: ['mindmap', 'xmind'],
    rendererIds: ['mindmap'],
    chunkName: 'file-viewer-mindmap'
  },
  {
    id: 'geo',
    packageName: '@file-viewer/renderer-geo',
    exportName: 'geoRenderer',
    formats: ['geo', 'geojson', 'kml', 'gpx', 'shp'],
    rendererIds: ['geo'],
    chunkName: 'file-viewer-geo'
  },
  {
    id: 'design',
    packageName: '@file-viewer/renderer-design',
    exportName: 'designRenderer',
    includeInPresetAll: false,
    formats: [
      'design',
      'photoshop-design',
      'illustrator-pdf-design',
      'postscript-design',
      'adobe-palette-design',
      'photoshop-resource-design',
      'indesign-idml-design',
      'indesign-exchange-design',
      'adobe-animate-xfl-design',
      'adobe-xd-design',
      'indesign-native-design',
      'psd',
      'psb',
      'pdd',
      'psdt',
      'ai',
      'ait',
      'eps',
      'ps',
      'ase',
      'aco',
      'abr',
      'csh',
      'pat',
      'grd',
      'asl',
      'idml',
      'icml',
      'idms',
      'inx',
      'fla',
      'xfl',
      'xd',
      'indd',
      'indt'
    ],
    rendererIds: ['photoshop-design', 'illustrator-pdf-design', 'postscript-design', 'adobe-palette-design', 'photoshop-resource-design', 'indesign-idml-design', 'indesign-exchange-design', 'adobe-animate-xfl-design', 'adobe-xd-design', 'indesign-native-design'],
    chunkName: 'file-viewer-design'
  },
  {
    id: 'data',
    packageName: '@file-viewer/renderer-data',
    exportName: 'dataRenderer',
    formats: [
      'data',
      'data-asset',
      'sqlite',
      'db',
      'sqlite3',
      'parquet',
      'avro',
      'webarchive',
      'wasm',
      'ttf',
      'otf',
      'woff',
      'woff2'
    ],
    rendererIds: ['data-asset'],
    chunkName: 'file-viewer-data'
  },
  {
    id: 'eda',
    packageName: '@file-viewer/renderer-eda',
    exportName: 'edaRenderer',
    formats: ['eda', 'gds', 'oas', 'oasis', 'olb', 'dra', 'dsn'],
    rendererIds: ['eda'],
    chunkName: 'file-viewer-eda'
  }
]

const descriptorsById = new Map(rendererModules.map((descriptor) => [descriptor.id, descriptor]))
const descriptorsByFormat = new Map<string, RendererModuleDescriptor>()
const descriptorsByRendererId = new Map<string, RendererModuleDescriptor>()
rendererModules.forEach((descriptor) => {
  descriptor.formats.forEach((format) => descriptorsByFormat.set(format, descriptor))
  descriptor.rendererIds.forEach((rendererId) => descriptorsByRendererId.set(rendererId, descriptor))
})

const presetRendererIds: Record<FileViewerVitePreset, readonly string[]> = {
  all: rendererModules
    .filter((descriptor) => descriptor.includeInPresetAll !== false)
    .map((descriptor) => descriptor.id),
  lite: ['text', 'image', 'media'],
  standard: [
    'word',
    'pdf',
    'ofd',
    'presentation-openxml',
    'spreadsheet',
    'archive',
    'email',
    'text',
    'image',
    'media'
  ],
  office: ['pdf', 'word', 'spreadsheet', 'presentation', 'ofd', 'iwork', 'wordperfect', 'hangul'],
  engineering: [
    'cad',
    'model',
    'drawing',
    'mindmap',
    'geo',
    'typst',
    'archive',
    'data',
    'eda'
  ]
}

const presetModules: Record<FileViewerVitePreset, PresetModuleDescriptor> = {
  all: {
    id: 'all',
    packageName: '@file-viewer/preset-all',
    exportName: 'allRenderers',
    rendererIds: presetRendererIds.all,
    chunkName: 'file-viewer-preset-all'
  },
  lite: {
    id: 'lite',
    packageName: '@file-viewer/preset-lite',
    exportName: 'liteRenderers',
    rendererIds: presetRendererIds.lite,
    chunkName: 'file-viewer-preset-lite'
  },
  standard: {
    id: 'standard',
    packageName: '@file-viewer/preset-standard',
    exportName: 'standardRenderers',
    rendererIds: presetRendererIds.standard,
    chunkName: 'file-viewer-preset-standard'
  },
  office: {
    id: 'office',
    packageName: '@file-viewer/preset-office',
    exportName: 'officeRenderers',
    rendererIds: presetRendererIds.office,
    chunkName: 'file-viewer-preset-office'
  },
  engineering: {
    id: 'engineering',
    packageName: '@file-viewer/preset-engineering',
    exportName: 'engineeringRenderers',
    rendererIds: presetRendererIds.engineering,
    chunkName: 'file-viewer-preset-engineering'
  }
}

const fileViewerFullPackages = [
  '@file-viewer/react-full',
  '@file-viewer/react-legacy-full',
  '@file-viewer/vue3-full',
  '@file-viewer/vue2.7-full',
  '@file-viewer/vue2.6-full',
  '@file-viewer/web-full',
  '@file-viewer/jquery-full',
  '@file-viewer/svelte-full'
] as const

// Vite dep optimization rewrites import.meta.url into node_modules/.vite/deps
// and can trigger full-preset dev-server re-optimization reloads. Keep File
// Viewer packages out of dep optimization while still optimizing their
// CommonJS/UMD helper dependencies below.
const fileViewerOptimizationExcludedPackages = [
  '@file-viewer/core',
  '@file-viewer/ppt',
  '@file-viewer/pptx',
  ...rendererModules.map((descriptor) => descriptor.packageName),
  ...Object.values(presetModules).map((preset) => preset.packageName),
  ...fileViewerFullPackages
] as const

const cjsInteropPackages = [
  '@file-viewer/docx',
  '@xmldom/xmldom',
  'diff2html',
  'keynote-archives',
  'occt-import-js',
  'jszip',
  'pdf-lib'
] as const

const defaultScanRoots = ['src', 'app', 'pages', 'components']
const defaultScanExtensions = [
  'js',
  'jsx',
  'ts',
  'tsx',
  'vue',
  'svelte',
  'html',
  'md',
  'mdx'
] as const
const ignoredScanDirectories = new Set([
  '.git',
  '.idea',
  '.next',
  '.nuxt',
  '.output',
  '.release',
  '.svelte-kit',
  '.vite',
  'coverage',
  'dist',
  'node_modules'
])
const defaultScanMaxFileSize = 1024 * 1024
const mimeFormatHints: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'application/ofd': ['ofd'],
  'application/zip': ['zip'],
  'application/x-zip-compressed': ['zip'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/msword': ['doc'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.ms-powerpoint': ['ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'application/json': ['json'],
  'application/x-ndjson': ['json'],
  'application/xml': ['xml'],
  'application/x-tar': ['tar'],
  'application/gzip': ['gz'],
  'application/x-7z-compressed': ['7z'],
  'application/vnd.rar': ['rar'],
  'text/markdown': ['md'],
  'text/csv': ['csv'],
  'text/tab-separated-values': ['tsv'],
  'text/html': ['html'],
  'text/css': ['css'],
  'text/plain': ['txt'],
  'image/*': ['image'],
  'image/tiff': ['tiff'],
  'image/heic': ['heic'],
  'image/heif': ['heif'],
  'audio/*': ['audio'],
  'audio/mpeg': ['mp3'],
  'audio/ogg': ['ogg'],
  'audio/flac': ['flac'],
  'audio/midi': ['midi'],
  'video/*': ['video']
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/^\./, '')
}

function unique<T>(items: readonly T[]) {
  return [...new Set(items)]
}

function normalizeScanExtension(value: string) {
  return normalizeToken(value)
}

function collectQuotedTokens(value: string) {
  return [...value.matchAll(/['"`]([^'"`]+)['"`]/g)].flatMap((match) =>
    collectDelimitedTokens(match[1])
  )
}

function collectDelimitedTokens(value: string) {
  return value
    .split(/[\s,;|]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => mimeFormatHints[item.toLowerCase()] || [item])
    .map(normalizeToken)
    .filter(Boolean)
}

export function extractFileViewerRendererHintTokens(source: string) {
  const tokens: string[] = []
  const push = (items: readonly string[]) => {
    items.forEach((item) => {
      if (item) {
        tokens.push(item)
      }
    })
  }

  // Explicit JavaScript/TypeScript hints:
  //   const fileViewerFormats = ['pdf', 'docx']
  //   fileViewerRenderers: ['pdf', 'cad']
  for (const match of source.matchAll(/\bfileViewer(?:Formats?|Renderers?)\b\s*[:=]\s*\[([\s\S]*?)\]/g)) {
    push(collectQuotedTokens(match[1]))
  }

  // HTML / template hints:
  //   <div data-file-viewer-formats="pdf,docx"></div>
  //   <input accept=".pdf,.docx,application/vnd.ms-excel">
  for (const match of source.matchAll(/\bdata-file-viewer-(?:formats?|renderers?)\s*=\s*["']([^"']+)["']/g)) {
    push(collectDelimitedTokens(match[1]))
  }
  for (const match of source.matchAll(/\baccept\s*=\s*["']([^"']+)["']/g)) {
    push(collectDelimitedTokens(match[1]))
  }

  // Comment hints are useful in non-framework projects where the upload UI is
  // assembled dynamically:
  //   // file-viewer-formats: pdf,docx,dwg
  for (const match of source.matchAll(/file-viewer-(?:formats?|renderers?)\s*:\s*([^\n\r<]+)/g)) {
    push(collectDelimitedTokens(match[1]))
  }

  return unique(tokens)
}

function normalizeScanOptions(value: FileViewerRenderersPluginOptions['scan']) {
  if (!value) {
    return null
  }
  const raw = typeof value === 'object' ? value : {}
  if (raw.enabled === false) {
    return null
  }
  return {
    roots: raw.roots?.length ? [...raw.roots] : defaultScanRoots,
    extensions: new Set(
      (raw.extensions?.length ? raw.extensions : defaultScanExtensions).map(normalizeScanExtension)
    ),
    maxFileSize: raw.maxFileSize ?? defaultScanMaxFileSize
  }
}

function scanFile(filePath: string, extensions: ReadonlySet<string>, maxFileSize: number) {
  const extension = normalizeScanExtension(extname(filePath))
  if (!extensions.has(extension)) {
    return []
  }
  const info = statSyncSafe(filePath)
  if (!info?.isFile() || info.size > maxFileSize) {
    return []
  }
  return extractFileViewerRendererHintTokens(readFileSync(filePath, 'utf8'))
}

function statSyncSafe(filePath: string) {
  try {
    return existsSync(filePath) ? statSync(filePath) : null
  } catch {
    return null
  }
}

function walkScanRoot(
  directory: string,
  extensions: ReadonlySet<string>,
  maxFileSize: number,
  output: string[]
) {
  if (!existsSync(directory)) {
    return
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredScanDirectories.has(entry.name)) {
        walkScanRoot(join(directory, entry.name), extensions, maxFileSize, output)
      }
      continue
    }
    if (entry.isFile()) {
      output.push(...scanFile(join(directory, entry.name), extensions, maxFileSize))
    }
  }
}

export function collectFileViewerRendererScanTokens(
  projectRoot: string,
  scan: FileViewerRenderersPluginOptions['scan']
) {
  const normalized = normalizeScanOptions(scan)
  if (!normalized) {
    return []
  }
  const tokens: string[] = []
  normalized.roots.forEach((root) => {
    walkScanRoot(
      isAbsolute(root) ? root : resolve(projectRoot, root),
      normalized.extensions,
      normalized.maxFileSize,
      tokens
    )
  })
  return unique(tokens)
}

function resolveManualPreset(preset: FileViewerRenderersPluginOptions['preset']) {
  return preset && preset !== 'auto' ? preset : null
}

function selectRenderers(options: FileViewerRenderersPluginOptions): RendererSelection {
  const preset = resolveManualPreset(options.preset)
  const presetCoveredIds = new Set(preset ? presetRendererIds[preset] : [])
  const selected = new Map<string, RendererModuleDescriptor>()
  const missing: MissingRendererNotice[] = []

  const requestedTokens = [...(options.renderers || []), ...(options.formats || [])]
    .map(normalizeToken)
    .filter(Boolean)

  requestedTokens.forEach((token) => {
    const descriptor =
      descriptorsById.get(token) ||
      descriptorsByRendererId.get(token) ||
      descriptorsByFormat.get(token)
    if (descriptor) {
      if (!presetCoveredIds.has(descriptor.id)) {
        selected.set(descriptor.id, descriptor)
      }
      return
    }

    missing.push({
      format: token,
      note: 'No renderer mapping is registered for this format yet.'
    })
  })

  return { preset, descriptors: [...selected.values()], missing }
}

function formatMissingRendererMessage(missing: readonly MissingRendererNotice[]) {
  return [
    'Some requested File Viewer formats do not have standalone renderer packages in this workspace yet:',
    ...missing.map(
      (item) =>
        `  - ${item.format}${item.targetPackage ? ` -> ${item.targetPackage}` : ''}: ${item.note}`
    ),
    'Use @file-viewer/preset-all for full compatibility while the remaining renderer lines are extracted, or remove those formats from @file-viewer/vite-plugin.'
  ].join('\n')
}

function assertMissingRendererPolicy(
  selection: RendererSelection,
  mode: FileViewerMissingRendererMode
) {
  if (!selection.missing.length || mode === 'ignore') {
    return
  }
  const message = formatMissingRendererMessage(selection.missing)
  if (mode === 'warn') {
    console.warn(`[file-viewer:vite-plugin]\n${message}`)
    return
  }
  throw new Error(`[file-viewer:vite-plugin]\n${message}`)
}

function expandDescriptorRendererIds(ids: readonly string[]) {
  return unique(
    ids.flatMap((id) => {
      const descriptor = descriptorsById.get(id)
      return descriptor ? [...descriptor.rendererIds] : [id]
    })
  )
}

type FullAssetRuntimeBase =
  | { kind: 'literal'; url: string }
  | { kind: 'deployment'; encodedBaseDir: string }

function renderVirtualModule(
  selection: RendererSelection,
  formats: readonly string[],
  autoPresetIds: readonly FileViewerVitePreset[] = [],
  runtimeAssetBase: FullAssetRuntimeBase | null = null,
  configureFullAssetBase = false
) {
  const presetModule = selection.preset ? presetModules[selection.preset] : null
  const autoPresetModules = autoPresetIds
    .filter((id) => id !== selection.preset)
    .map((id) => presetModules[id])
  const presetImport = presetModule
    ? `import { ${presetModule.exportName} as presetRenderers } from '${presetModule.packageName}';`
    : null
  const autoPresetImports = autoPresetModules.map(
    (preset, index) =>
      `import { ${preset.exportName} as autoPresetRenderers${index} } from '${preset.packageName}';`
  )
  const rendererImports = selection.descriptors.map(
    (descriptor, index) =>
      `import { ${descriptor.exportName} as renderer${index} } from '${descriptor.packageName}';`
  )
  const rendererNames = [
    ...(presetModule ? ['presetRenderers'] : []),
    ...autoPresetModules.map((_preset, index) => `autoPresetRenderers${index}`),
    ...selection.descriptors.map((_descriptor, index) => `renderer${index}`)
  ]
  const rendererIds = unique([
    ...(presetModule ? expandDescriptorRendererIds(presetModule.rendererIds) : []),
    ...autoPresetModules.flatMap((preset) => expandDescriptorRendererIds(preset.rendererIds)),
    ...selection.descriptors.flatMap((descriptor) => descriptor.rendererIds)
  ])
  const packages = unique([
    ...(presetModule ? [presetModule.packageName] : []),
    ...autoPresetModules.map((preset) => preset.packageName),
    ...selection.descriptors.map((descriptor) => descriptor.packageName)
  ])
  const plan = {
    preset: selection.preset,
    autoPresets: autoPresetModules.map((preset) => preset.id),
    formats,
    rendererIds,
    packages,
    generatedBy: '@file-viewer/vite-plugin'
  }
  const autoRegistrationId = selection.descriptors.length
    ? '@file-viewer/vite-plugin:configured'
    : selection.preset && !autoPresetModules.length
      ? selection.preset
      : !selection.preset && autoPresetModules.length === 1
        ? autoPresetModules[0].id
        : '@file-viewer/vite-plugin:configured'

  const runtimeAssetBaseImport = runtimeAssetBase
    ? runtimeAssetBase.kind === 'deployment'
      ? `import { resolveFileViewerRuntimeAssetBaseUrl, setDefaultFileViewerAssetBaseUrl } from '@file-viewer/core/assets';`
      : `import { setDefaultFileViewerAssetBaseUrl } from '@file-viewer/core/assets';`
    : null
  const fullAssetBaseImport = runtimeAssetBase && configureFullAssetBase
    ? `import { setDefaultFullAssetBaseUrl } from '@file-viewer/preset-all';`
    : null
  const autoRegistrationImport = rendererNames.length
    ? `import { registerFileViewerAutoRendererPreset } from '@file-viewer/core';`
    : null
  const runtimeAssetBaseSetup = !runtimeAssetBase
    ? []
    : runtimeAssetBase.kind === 'literal'
      ? [
          `setDefaultFileViewerAssetBaseUrl(${JSON.stringify(runtimeAssetBase.url)});`,
          ...(configureFullAssetBase
            ? [`setDefaultFullAssetBaseUrl(${JSON.stringify(runtimeAssetBase.url)});`]
            : []),
          ''
        ]
      : [
          "const fileViewerDeploymentBaseUrl = typeof document === 'undefined'",
          "  ? '/'",
          '  : resolveFileViewerRuntimeAssetBaseUrl(document);',
          "const fileViewerRuntimeAssetBaseUrl = typeof document === 'undefined'",
          `  ? '/' + ${JSON.stringify(runtimeAssetBase.encodedBaseDir)}`,
          `  : new URL(${JSON.stringify(runtimeAssetBase.encodedBaseDir)}, fileViewerDeploymentBaseUrl.endsWith('/') ? fileViewerDeploymentBaseUrl : fileViewerDeploymentBaseUrl + '/').href;`,
          'setDefaultFileViewerAssetBaseUrl(fileViewerRuntimeAssetBaseUrl);',
          ...(configureFullAssetBase
            ? ['setDefaultFullAssetBaseUrl(fileViewerRuntimeAssetBaseUrl);']
            : []),
          ''
        ]

  return [
    ...[autoRegistrationImport, runtimeAssetBaseImport, fullAssetBaseImport].filter(Boolean),
    ...[presetImport].filter(Boolean),
    ...autoPresetImports,
    ...rendererImports,
    '',
    ...runtimeAssetBaseSetup,
    `export const configuredFileViewerRenderers = [${rendererNames.join(', ')}];`,
    `export const fileViewerRendererPlan = ${JSON.stringify(plan, null, 2)};`,
    ...(rendererNames.length
      ? [`registerFileViewerAutoRendererPreset(configuredFileViewerRenderers, { id: ${JSON.stringify(autoRegistrationId)} });`]
      : []),
    'export default configuredFileViewerRenderers;',
    ''
  ].join('\n')
}

function hasManualChunks(config: UserConfig) {
  const output = config.build?.rollupOptions?.output
  if (Array.isArray(output)) {
    return output.some((item) => Boolean(item.manualChunks))
  }
  return Boolean(output?.manualChunks)
}

type FileViewerManualChunksFunction = (id: string, meta?: unknown) => string | void

interface FileViewerCodeSplittingGroup {
  name: string | ((id: string, context?: unknown) => string | null | undefined)
  test?: string | RegExp | ((id: string) => boolean | undefined | void)
  priority?: number
  [key: string]: unknown
}

interface FileViewerCodeSplittingOptions {
  groups?: FileViewerCodeSplittingGroup[]
  [key: string]: unknown
}

interface FileViewerRolldownOutput {
  codeSplitting?: boolean | FileViewerCodeSplittingOptions
  [key: string]: unknown
}

interface FileViewerRolldownOptions {
  output?: FileViewerRolldownOutput | FileViewerRolldownOutput[]
  [key: string]: unknown
}

function resolveProjectViteMajor(projectRoot: string) {
  const requireFns = [
    createRequire(resolve(projectRoot, 'package.json')),
    pluginRequire
  ]
  for (const requireFn of requireFns) {
    try {
      const packageJsonPath = requireFn.resolve('vite/package.json')
      const version = String((JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string }).version || '')
      const major = Number.parseInt(version.split('.')[0] || '', 10)
      if (Number.isInteger(major) && major > 0) return major
    } catch {
      // Try the plugin's own Vite installation when the project does not expose one.
    }
  }
  return 7
}

function getManualChunksFunction(config: UserConfig): FileViewerManualChunksFunction | null {
  const output = config.build?.rollupOptions?.output
  if (Array.isArray(output)) {
    return null
  }
  return typeof output?.manualChunks === 'function'
    ? output.manualChunks as FileViewerManualChunksFunction
    : null
}

function getNodeModulePackageName(id: string) {
  const normalized = id.replace(/\\/g, '/')
  const marker = '/node_modules/'
  const index = normalized.lastIndexOf(marker)
  if (index === -1) {
    return null
  }
  const parts = normalized.slice(index + marker.length).split('/')
  if (!parts[0]) {
    return null
  }
  return parts[0].startsWith('@')
    ? [parts[0], parts[1]].filter(Boolean).join('/')
    : parts[0]
}

function getStableInteropChunkName(id: string) {
  const packageName = getNodeModulePackageName(id)
  if (!packageName) {
    return undefined
  }

  if (
    packageName === 'codemirror' ||
    packageName === '@replit/codemirror-vim' ||
    packageName.startsWith('@codemirror/') ||
    packageName.startsWith('@lezer/') ||
    packageName.startsWith('@codesandbox/sandpack') ||
    packageName === '@codesandbox/nodebox' ||
    packageName === '@marijn/find-cluster-break' ||
    packageName === 'crelt' ||
    packageName === 'style-mod' ||
    packageName === 'w3c-keyname'
  ) {
    return 'vendor-codemirror'
  }

  return undefined
}

function createStableInteropManualChunks(
  manualChunks: FileViewerManualChunksFunction
): FileViewerManualChunksFunction {
  return (id, meta) => getStableInteropChunkName(id) || manualChunks(id, meta)
}

function createRolldownCodeSplittingGroups(
  selection: RendererSelection,
  autoPresetIds: readonly FileViewerVitePreset[],
  options: FileViewerRenderersPluginOptions
): FileViewerCodeSplittingGroup[] {
  const groups: FileViewerCodeSplittingGroup[] = []
  if (options.stabilizeInteropChunks !== false) {
    groups.push({
      name: 'vendor-codemirror',
      test: (id: string) => getStableInteropChunkName(id) === 'vendor-codemirror',
      priority: -10
    })
  }
  if ((options.chunkStrategy || 'renderer') !== 'none') {
    const resolveChunkName = createManualChunks(selection, autoPresetIds)
    groups.push({
      name: (id: string) => resolveChunkName(id) || null,
      priority: -20
    })
  }
  return groups
}

function mergeRolldownCodeSplittingOutput(
  output: FileViewerRolldownOutput | undefined,
  pluginGroups: readonly FileViewerCodeSplittingGroup[]
): FileViewerRolldownOutput {
  const current = output || {}
  if (current.codeSplitting === false || !pluginGroups.length) return current
  const codeSplitting = current.codeSplitting && typeof current.codeSplitting === 'object'
    ? current.codeSplitting
    : {}
  const existingGroups = Array.isArray(codeSplitting.groups) ? codeSplitting.groups : []
  const existingNames = new Set(existingGroups
    .map(group => typeof group.name === 'string' ? group.name : null)
    .filter((name): name is string => Boolean(name)))
  const groups = [
    ...existingGroups,
    ...pluginGroups.filter(group => typeof group.name !== 'string' || !existingNames.has(group.name))
  ]
  return {
    ...current,
    codeSplitting: {
      ...codeSplitting,
      groups
    }
  }
}

function createVite8ChunkConfig(
  userConfig: UserConfig,
  selection: RendererSelection,
  autoPresetIds: readonly FileViewerVitePreset[],
  options: FileViewerRenderersPluginOptions
): UserConfig {
  const build = userConfig.build as (UserConfig['build'] & { rolldownOptions?: FileViewerRolldownOptions }) | undefined
  const rolldownOptions = build?.rolldownOptions || {}
  const groups = createRolldownCodeSplittingGroups(selection, autoPresetIds, options)
  const currentOutput = rolldownOptions.output as FileViewerRolldownOutput | FileViewerRolldownOutput[] | undefined
  if (
    !groups.length ||
    (!Array.isArray(currentOutput) && currentOutput?.codeSplitting === false)
  ) {
    return {}
  }
  const output = Array.isArray(currentOutput)
    ? currentOutput.map(item => mergeRolldownCodeSplittingOutput(item, groups))
    : mergeRolldownCodeSplittingOutput(currentOutput, groups)
  return {
    build: {
      rolldownOptions: {
        ...rolldownOptions,
        output
      }
    }
  } as UserConfig
}

function createOptimizeDepsExclude(config: UserConfig) {
  return unique([
    ...(config.optimizeDeps?.exclude || []),
    ...fileViewerOptimizationExcludedPackages
  ])
}

function createOptimizeDepsInclude(
  config: UserConfig,
  exclude: readonly string[],
  anchorPackages: readonly string[]
) {
  const excluded = new Set(exclude)
  return unique([
    ...(config.optimizeDeps?.include || []),
    ...cjsInteropPackages.filter((packageName) =>
      !excluded.has(packageName) && Boolean(resolvePackageJson(packageName, anchorPackages))
    )
  ])
}

function createManualChunks(
  selection: RendererSelection,
  autoPresetIds: readonly FileViewerVitePreset[] = []
) {
  const packageToChunk = new Map<string, string>()
  const presetIds = unique([
    ...(selection.preset ? [selection.preset] : []),
    ...autoPresetIds
  ])
  presetIds.forEach((presetId) => {
    const presetModule = presetModules[presetId]
    packageToChunk.set(presetModule.packageName, presetModule.chunkName)
    presetModule.rendererIds
      .map((id) => descriptorsById.get(id))
      .filter((descriptor): descriptor is RendererModuleDescriptor => Boolean(descriptor))
      .forEach((descriptor) => {
        packageToChunk.set(descriptor.packageName, descriptor.chunkName)
      })
  })
  selection.descriptors.forEach((descriptor) => {
    packageToChunk.set(descriptor.packageName, descriptor.chunkName)
  })

  return (id: string) => {
    const normalized = id.replace(/\\/g, '/')
    if (normalized.endsWith('/dist/vendor/pdfjs/legacy/build/pdf.worker.mjs')) {
      return undefined
    }
    for (const [packageName, chunkName] of packageToChunk) {
      if (
        normalized.includes(`/node_modules/${packageName}/`) ||
        normalized.includes(`/node_modules/.pnpm/${packageName.replace('/', '+')}@`)
      ) {
        return chunkName
      }
    }
    return undefined
  }
}

function projectRequire() {
  return createRequire(resolve(process.cwd(), 'package.json'))
}

function findPackageJsonFromEntry(entry: string) {
  let current = dirname(entry)
  while (current && current !== dirname(current)) {
    const candidate = join(current, 'package.json')
    if (existsSync(candidate)) {
      return candidate
    }
    current = dirname(current)
  }
  return null
}

function tryResolvePackageJson(packageName: string, requireFn: NodeJS.Require) {
  try {
    return requireFn.resolve(`${packageName}/package.json`)
  } catch {
    try {
      const entry = requireFn.resolve(packageName)
      return findPackageJsonFromEntry(entry)
    } catch {
      return null
    }
  }
}

function collectWorkspacePackageJsons(root: string) {
  const packageJsons = new Map<string, string>()
  const ignoredDirectoryNames = new Set(['node_modules', 'dist', 'vendor', '.git'])
  const scanRoots = ['packages', 'apps'].map((item) => join(root, item))

  const visit = (directory: string, depth: number) => {
    if (depth < 0 || !existsSync(directory)) {
      return
    }

    const packageJsonPath = join(directory, 'package.json')
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { name?: string }
        if (packageJson.name) {
          packageJsons.set(packageJson.name, packageJsonPath)
        }
      } catch {
        // Ignore malformed package.json files in unrelated workspace folders.
      }
    }

    for (const entry of readdirSync(directory)) {
      if (ignoredDirectoryNames.has(entry)) {
        continue
      }
      const candidate = join(directory, entry)
      if (statSync(candidate).isDirectory()) {
        visit(candidate, depth - 1)
      }
    }
  }

  scanRoots.forEach((scanRoot) => visit(scanRoot, 4))
  return packageJsons
}

function resolveWorkspacePackageJson(packageName: string) {
  const root = process.cwd()
  if (!workspacePackageJsonCache || workspacePackageJsonCache.root !== root) {
    workspacePackageJsonCache = {
      root,
      packages: collectWorkspacePackageJsons(root)
    }
  }
  return workspacePackageJsonCache.packages.get(packageName) || null
}

function resolvePackageJson(packageName: string, anchorPackages: readonly string[] = []) {
  const rootRequireFns = [projectRequire(), pluginRequire]
  const requireFns = [...rootRequireFns]
  const effectiveAnchorPackages = unique([
    ...Object.values(presetModules).map((preset) => preset.packageName),
    ...anchorPackages
  ])

  const anchorPackageJsons = new Set<string>()
  let discoveredAnchor = true
  while (discoveredAnchor) {
    discoveredAnchor = false
    for (const anchorPackage of effectiveAnchorPackages) {
      for (const requireFn of [...requireFns]) {
        const anchorPackageJson =
          tryResolvePackageJson(anchorPackage, requireFn) ||
          resolveWorkspacePackageJson(anchorPackage)
        if (anchorPackageJson && !anchorPackageJsons.has(anchorPackageJson)) {
          anchorPackageJsons.add(anchorPackageJson)
          requireFns.push(createRequire(anchorPackageJson))
          discoveredAnchor = true
        }
      }
    }
  }

  const preferredAnchorPackageJsons = unique(anchorPackages
    .map((anchorPackage) => requireFns
      .map((requireFn) => tryResolvePackageJson(anchorPackage, requireFn))
      .find(Boolean) || resolveWorkspacePackageJson(anchorPackage))
    .filter((packageJson): packageJson is string => Boolean(packageJson)))
  const targetRequireFns = [
    ...preferredAnchorPackageJsons.map((packageJson) => createRequire(packageJson)),
    ...requireFns
  ]
  for (const requireFn of targetRequireFns) {
    const packageJson = tryResolvePackageJson(packageName, requireFn)
    if (packageJson) {
      return packageJson
    }
  }
  return resolveWorkspacePackageJson(packageName)
}

function hasExplicitRendererSelection(options: FileViewerRenderersPluginOptions) {
  return Boolean(
    resolveManualPreset(options.preset) ||
      options.formats?.length ||
      options.renderers?.length ||
      options.scan
  )
}

function shouldAutoDiscoverPresets(options: FileViewerRenderersPluginOptions) {
  if (Array.isArray(options.autoPresets)) {
    return true
  }
  if (typeof options.autoPresets === 'boolean') {
    return options.autoPresets
  }
  return options.preset === 'auto' || !hasExplicitRendererSelection(options)
}

function resolveAutoPresetIds(options: FileViewerRenderersPluginOptions): FileViewerVitePreset[] {
  if (!shouldAutoDiscoverPresets(options)) {
    return []
  }
  const candidates: readonly FileViewerVitePreset[] = Array.isArray(options.autoPresets)
    ? (options.autoPresets as readonly FileViewerVitePreset[])
    : (Object.keys(presetModules) as FileViewerVitePreset[])
  const installed = unique(candidates).filter((presetId) =>
    Boolean(resolvePackageJson(presetModules[presetId].packageName))
  )
  return installed.includes('all') ? ['all'] : installed
}

function collectSelectedPackages(
  selection: RendererSelection,
  autoPresetIds: readonly FileViewerVitePreset[] = []
) {
  const presetModule = selection.preset ? presetModules[selection.preset] : null
  return unique([
    ...(presetModule ? [presetModule.packageName] : []),
    ...autoPresetIds.map((presetId) => presetModules[presetId].packageName),
    ...selection.descriptors.map((descriptor) => descriptor.packageName)
  ])
}

function collectDependencyAnchorPackages(
  selection: RendererSelection,
  autoPresetIds: readonly FileViewerVitePreset[] = []
) {
  const presetIds = unique([
    ...(selection.preset ? [selection.preset] : []),
    ...autoPresetIds
  ])
  return unique([
    ...collectSelectedPackages(selection, autoPresetIds),
    ...presetIds.flatMap((presetId) => {
      const packageJsonPath = resolvePackageJson(presetModules[presetId].packageName)
      if (!packageJsonPath) {
        return []
      }
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
          dependencies?: Record<string, string>
          optionalDependencies?: Record<string, string>
        }
        return Object.keys({
          ...(packageJson.dependencies || {}),
          ...(packageJson.optionalDependencies || {})
        }).filter(packageName => packageName.startsWith('@file-viewer/capability-'))
      } catch {
        return []
      }
    }),
    ...presetIds.flatMap((presetId) =>
      presetModules[presetId].rendererIds
        .map((rendererId) => descriptorsById.get(rendererId)?.packageName)
        .filter((packageName): packageName is string => Boolean(packageName))
    ),
    ...selection.descriptors.map((descriptor) => descriptor.packageName)
  ])
}

function resolvePackageRoot(packageName: string, anchorPackages: readonly string[] = []) {
  const packageJson = resolvePackageJson(packageName, anchorPackages)
  return packageJson ? dirname(packageJson) : null
}

function readPackageVersion(packageRoot: string | null) {
  if (!packageRoot) {
    return null
  }
  try {
    const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
      version?: string
    }
    return packageJson.version || null
  } catch {
    return null
  }
}

function assertOwnedPackageVersion(
  packageName: string,
  packageRoot: string | null,
  ownerPackageName: string,
  anchorPackages: readonly string[] = []
) {
  if (!packageRoot) {
    return null
  }
  const ownerPackageJsonPath = resolvePackageJson(ownerPackageName, anchorPackages)
  if (!ownerPackageJsonPath) {
    return readPackageVersion(packageRoot)
  }
  const ownerPackageJson = JSON.parse(readFileSync(ownerPackageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>
  }
  const configuredVersion = ownerPackageJson.dependencies?.[packageName]
  const expectedVersion = configuredVersion?.startsWith('workspace:')
    ? configuredVersion.slice('workspace:'.length)
    : configuredVersion
  const actualVersion = readPackageVersion(packageRoot)
  if (
    expectedVersion &&
    /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(expectedVersion) &&
    actualVersion !== expectedVersion
  ) {
    throw new Error(
      `[file-viewer:vite-plugin] ${ownerPackageName} requires ${packageName}@${expectedVersion}, ` +
      `but renderer assets resolved from ${packageName}@${actualVersion || 'unknown'} (${packageRoot}).`
    )
  }
  return actualVersion
}

function resolvePackageEntry(packageName: string, anchorPackages: readonly string[] = []) {
  const packageJsonPath = resolvePackageJson(packageName, anchorPackages)
  if (!packageJsonPath) {
    return null
  }
  const packageRoot = dirname(packageJsonPath)
  const anchorPackageJson = anchorPackages
    .map((anchorPackage) => resolvePackageJson(anchorPackage))
    .find(Boolean)
  const requireFns = [
    projectRequire(),
    pluginRequire,
    ...(anchorPackageJson ? [createRequire(anchorPackageJson)] : [])
  ]
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      name?: string
      main?: string
      module?: string
      exports?: Record<string, unknown>
    }
    const exportSubpath = packageJson.name && packageName.startsWith(`${packageJson.name}/`)
      ? `.${packageName.slice(packageJson.name.length)}`
      : null
    if (exportSubpath) {
      const exportedEntry = readPackageExportEntry(packageJson.exports?.[exportSubpath])
      if (exportedEntry) {
        const entry = resolve(packageRoot, exportedEntry)
        if (existsSync(entry) && statSync(entry).isFile()) {
          return entry
        }
      }
      for (const requireFn of requireFns) {
        try {
          return requireFn.resolve(packageName)
        } catch {
          // Continue probing alternate anchors.
        }
      }
      return null
    }
    const candidates = unique([
      packageJson.module,
      packageJson.main,
      'index.js'
    ].filter((value): value is string => Boolean(value)))
    for (const candidate of candidates) {
      const entry = resolve(packageRoot, candidate)
      if (existsSync(entry) && statSync(entry).isFile()) {
        return entry
      }
    }
  } catch {
    // Fall back to Node resolution below.
  }

  for (const requireFn of requireFns) {
    try {
      return requireFn.resolve(packageName)
    } catch {
      // Continue probing alternate anchors.
    }
  }
  return null
}

function resolvePackageFile(
  packageName: string,
  relativePath: string,
  anchorPackages: readonly string[] = []
) {
  const packageRoot = resolvePackageRoot(packageName, anchorPackages)
  if (!packageRoot) {
    return null
  }
  const entry = resolve(packageRoot, relativePath)
  return existsSync(entry) && statSync(entry).isFile() ? entry : null
}

function readPackageExportEntry(value: unknown): string | null {
  if (typeof value === 'string') {
    return value
  }
  if (!value || typeof value !== 'object') {
    return null
  }
  const record = value as Record<string, unknown>
  return readPackageExportEntry(record.import) ||
    readPackageExportEntry(record.default) ||
    readPackageExportEntry(record.require)
}

function resolvePackageExportEntry(
  packageName: string,
  exportPath: string,
  anchorPackages: readonly string[] = []
) {
  const packageJsonPath = resolvePackageJson(packageName, anchorPackages)
  if (!packageJsonPath) {
    return null
  }
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      exports?: Record<string, unknown>
    }
    const exportEntry = readPackageExportEntry(packageJson.exports?.[exportPath])
    if (!exportEntry) {
      return null
    }
    const entry = resolve(dirname(packageJsonPath), exportEntry)
    return existsSync(entry) && statSync(entry).isFile() ? entry : null
  } catch {
    return null
  }
}

function normalizeViteAlias(alias: AliasOptions | undefined): Alias[] {
  if (!alias) {
    return []
  }
  if (Array.isArray(alias)) {
    return [...alias]
  }
  return Object.entries(alias).map(([find, replacement]) => ({ find, replacement }))
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function createExactImportAlias(find: string, replacement: string): Alias {
  return {
    find: new RegExp(`^${escapeRegExp(find)}$`),
    replacement
  }
}

function createFileViewerResolveAliases(anchorPackages: readonly string[]) {
  const packageNames = unique([
    '@file-viewer/core',
    ...anchorPackages,
    ...cjsInteropPackages
  ])
  const aliases: Alias[] = []
  const coreAssetsEntry = resolvePackageExportEntry('@file-viewer/core', './assets', anchorPackages)
  if (coreAssetsEntry) {
    aliases.push(createExactImportAlias('@file-viewer/core/assets', coreAssetsEntry))
  }
  const jszipBrowserEntry = resolvePackageFile('jszip', 'dist/jszip.js', anchorPackages)
  if (jszipBrowserEntry) {
    aliases.push(createExactImportAlias('jszip/dist/jszip', jszipBrowserEntry))
  }
  aliases.push(...packageNames
    .map((packageName) => {
      const entry = resolvePackageEntry(packageName, anchorPackages)
      return entry ? createExactImportAlias(packageName, entry) : null
    })
    .filter((alias): alias is Alias => Boolean(alias)))
  return aliases
}

async function copyFileIfPresent(
  from: string | null,
  to: string
): Promise<AssetCopyResult['copied']> {
  if (!from || !existsSync(from)) {
    return false
  }
  const info = await stat(from)
  if (!info.isFile()) {
    return false
  }
  await mkdir(dirname(to), { recursive: true })
  await copyFile(from, to)
  return true
}

async function copyDirectoryIfPresent(
  from: string | null,
  to: string
): Promise<AssetCopyResult['copied']> {
  if (!from || !existsSync(from)) {
    return false
  }
  const info = await stat(from)
  if (!info.isDirectory()) {
    return false
  }
  await rm(to, { recursive: true, force: true })
  await mkdir(dirname(to), { recursive: true })
  await cp(from, to, { recursive: true, force: true })
  return true
}

async function copyVersionedCadRuntimeDirectoryIfPresent(
  from: string | null,
  to: string,
  runtimeVersion: string | null
): Promise<AssetCopyResult['copied']> {
  if (!from || !existsSync(from)) {
    return false
  }
  if (!runtimeVersion || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(runtimeVersion)) {
    throw new Error(
      `[file-viewer:vite-plugin] Cannot publish CAD runtime assets with invalid version ${JSON.stringify(runtimeVersion)}.`
    )
  }
  const copied = await copyDirectoryIfPresent(from, to)
  if (!copied) {
    return false
  }
  const versionedTarget = join(to, runtimeVersion)
  return copyDirectoryIfPresent(from, versionedTarget)
}

async function copyPdfCjkFontAssets(
  from: string | null,
  to: string
): Promise<AssetCopyResult['copied']> {
  if (!from) {
    return false
  }
  const files = join(from, 'files')
  const stylesheet = join(from, 'wght.css')
  const license = join(from, 'LICENSE')
  if (![files, stylesheet, license].every(existsSync) || !statSync(files).isDirectory()) {
    return false
  }
  await rm(to, { recursive: true, force: true })
  await mkdir(to, { recursive: true })
  await cp(files, join(to, 'files'), { recursive: true, force: true })
  await copyFile(stylesheet, join(to, 'noto-sans-sc.css'))
  await copyFile(license, join(to, 'OFL-1.1.txt'))
  return true
}

async function copyKnownRendererAssets(targetRoot: string, rendererIds: readonly string[]) {
  const selected = new Set(rendererIds)
  const results: AssetCopyResult[] = []
  const push = async (
    rendererId: string,
    id: string,
    to: string,
    copyAction: () => Promise<boolean>,
    reason?: string,
    source?: Pick<AssetCopyResult, 'sourcePackage' | 'sourceVersion'>,
    required?: boolean
  ) => {
    if (!selected.has(rendererId)) {
      return
    }
    const copied = await copyAction()
    results.push({
      rendererId,
      id,
      to,
     copied,
     reason: copied ? undefined : reason || 'source asset not found',
      required,
     ...source,
   })
  }

  const rendererPdfRoot = resolvePackageRoot('@file-viewer/renderer-pdf')
  const stagedPdfRoot = rendererPdfRoot
    ? join(rendererPdfRoot, 'dist/vendor/pdfjs')
    : null
  const stagedPdfProvenancePath = stagedPdfRoot
    ? join(stagedPdfRoot, 'provenance.json')
    : null
  let stagedPdfVersion: string | null = null
  if (stagedPdfProvenancePath && existsSync(stagedPdfProvenancePath)) {
    try {
      const provenance = JSON.parse(readFileSync(stagedPdfProvenancePath, 'utf8')) as {
        packageName?: string
        version?: string
      }
      if (provenance.packageName === 'pdfjs-dist' && provenance.version) {
        stagedPdfVersion = provenance.version
      }
    } catch {
      stagedPdfVersion = null
    }
  }
  const hasStagedPdfAssets = Boolean(
    stagedPdfRoot &&
    stagedPdfVersion &&
    existsSync(join(stagedPdfRoot, 'legacy/build/pdf.worker.mjs')) &&
    existsSync(join(stagedPdfRoot, 'cmaps')) &&
    existsSync(join(stagedPdfRoot, 'wasm')) &&
    existsSync(join(stagedPdfRoot, 'standard_fonts'))
  )
  const dependencyPdfRoot = hasStagedPdfAssets
    ? null
    : resolvePackageRoot('pdfjs-dist', ['@file-viewer/renderer-pdf'])
  const pdfRoot = hasStagedPdfAssets ? stagedPdfRoot : dependencyPdfRoot
  const pdfVersion = hasStagedPdfAssets
    ? stagedPdfVersion
    : assertOwnedPackageVersion(
        'pdfjs-dist',
        dependencyPdfRoot,
        '@file-viewer/renderer-pdf'
      )
  const pdfSource = pdfRoot
    ? { sourcePackage: 'pdfjs-dist', sourceVersion: pdfVersion || undefined }
    : undefined
  await push(
    'pdf',
    'pdf-worker',
    join(targetRoot, 'vendor/pdf/pdf.worker.mjs'),
    () => copyFileIfPresent(
      pdfRoot ? join(pdfRoot, 'legacy/build/pdf.worker.mjs') : null,
      join(targetRoot, 'vendor/pdf/pdf.worker.mjs')
    ),
    undefined,
    pdfSource
  )
  await push(
    'pdf',
    'pdf-cmaps',
    join(targetRoot, 'vendor/pdf/cmaps'),
    () => copyDirectoryIfPresent(
      pdfRoot ? join(pdfRoot, 'cmaps') : null,
      join(targetRoot, 'vendor/pdf/cmaps')
    ),
    undefined,
    pdfSource
  )
  await push(
    'pdf',
    'pdf-wasm',
    join(targetRoot, 'vendor/pdf/wasm'),
    () => copyDirectoryIfPresent(
      pdfRoot ? join(pdfRoot, 'wasm') : null,
      join(targetRoot, 'vendor/pdf/wasm')
    ),
    undefined,
    pdfSource
  )
  await push(
    'pdf',
    'pdf-standard-fonts',
    join(targetRoot, 'vendor/pdf/standard_fonts'),
    () => copyDirectoryIfPresent(
      pdfRoot ? join(pdfRoot, 'standard_fonts') : null,
      join(targetRoot, 'vendor/pdf/standard_fonts')
    ),
    undefined,
    pdfSource
  )
  const stagedPdfCjkFontRoot = rendererPdfRoot
    ? join(rendererPdfRoot, 'dist/vendor/noto-sans-sc')
    : null
  const standardAssetsRoot = resolvePackageRoot('@file-viewer/assets-standard')
  const standardPdfCjkFontRoot = standardAssetsRoot
    ? join(standardAssetsRoot, 'viewer/vendor/pdf/fonts')
    : null
  const dependencyPdfCjkFontRoot = resolvePackageRoot('@fontsource-variable/noto-sans-sc', [
    '@file-viewer/renderer-pdf'
  ])
 const pdfCjkFontTarget = join(targetRoot, 'vendor/pdf/fonts')
  // The CJK fallback font ships only in independently owned asset packs; when no
  // source is installed, skip it with an actionable hint instead of failing builds.
  const pdfCjkFontSourceAvailable =
    Boolean(
      standardPdfCjkFontRoot && existsSync(join(standardPdfCjkFontRoot, 'noto-sans-sc.css'))
    ) ||
    Boolean(stagedPdfCjkFontRoot && existsSync(join(stagedPdfCjkFontRoot, 'wght.css'))) ||
    Boolean(dependencyPdfCjkFontRoot)
  await push(
    'pdf',
    'pdf-cjk-font-fallback',
    pdfCjkFontTarget,
    async () => {
   if (
     standardPdfCjkFontRoot &&
     existsSync(join(standardPdfCjkFontRoot, 'noto-sans-sc.css'))
   ) {
     return copyDirectoryIfPresent(standardPdfCjkFontRoot, pdfCjkFontTarget)
   }
   if (stagedPdfCjkFontRoot && existsSync(join(stagedPdfCjkFontRoot, 'wght.css'))) {
     return copyPdfCjkFontAssets(stagedPdfCjkFontRoot, pdfCjkFontTarget)
   }
   return copyPdfCjkFontAssets(dependencyPdfCjkFontRoot, pdfCjkFontTarget)
    },
    pdfCjkFontSourceAvailable
      ? undefined
      : `install ${independentlyOwnedAssetRendererIds.get('pdf')} for this capability`,
    undefined,
    pdfCjkFontSourceAvailable ? undefined : false
  )

  const pptxRoot = resolvePackageRoot('@file-viewer/pptx', [
    '@file-viewer/renderer-pptx',
    '@file-viewer/renderer-presentation'
  ])
  await push(
    'office-presentation',
    'pptx-worker',
    join(targetRoot, 'vendor/pptx/pptx.worker.js'),
    () =>
      copyFileIfPresent(
        pptxRoot ? join(pptxRoot, 'dist/worker/pptx.worker.js') : null,
        join(targetRoot, 'vendor/pptx/pptx.worker.js')
      )
  )

  const pptRoot = resolvePackageRoot('@file-viewer/ppt', [
    '@file-viewer/renderer-ppt',
    '@file-viewer/renderer-presentation'
  ])
  const pptVersion = readPackageVersion(pptRoot)
  const pptSource = pptRoot
    ? { sourcePackage: '@file-viewer/ppt', sourceVersion: pptVersion || undefined }
    : undefined
  for (const [id, filename] of [
    ['ppt-module', 'index.mjs'],
    ['ppt-worker', 'worker.mjs'],
    ['ppt-frame-cache', 'frame-cache.mjs'],
    ['ppt-wasm', 'ppt-native.wasm'],
    ['ppt-cjk-font', 'ppt-font-cjk.otf'],
    ['ppt-manifest', 'manifest.json'],
    ['ppt-package', 'package.json'],
    ['ppt-license', 'LICENSE'],
    ['ppt-notice', 'NOTICE']
  ] as const) {
    await push(
      'office-presentation-binary',
      id,
      join(targetRoot, `vendor/ppt/${filename}`),
      () => copyFileIfPresent(
        pptRoot ? join(pptRoot, filename) : null,
        join(targetRoot, `vendor/ppt/${filename}`)
      ),
      undefined,
      pptSource
    )
  }

  const docxRoot = resolvePackageRoot('@file-viewer/docx', ['@file-viewer/renderer-word'])
  await push(
    'office-word-openxml',
    'docx-worker',
    join(targetRoot, 'vendor/docx/docx.worker.js'),
    () =>
      copyFileIfPresent(
        docxRoot ? join(docxRoot, 'dist/docx-preview.worker.js') : null,
        join(targetRoot, 'vendor/docx/docx.worker.js')
      )
  )
  await push(
    'office-word-openxml',
    'docx-worker-jszip',
    join(targetRoot, 'vendor/docx/jszip.min.js'),
    () =>
      copyFileIfPresent(
        docxRoot ? join(docxRoot, 'dist/jszip.min.js') : null,
        join(targetRoot, 'vendor/docx/jszip.min.js')
      )
  )

  const spreadsheetRoot = resolvePackageRoot('@file-viewer/renderer-spreadsheet', [
    '@file-viewer/renderer-spreadsheet',
    '@file-viewer/preset-office',
    '@file-viewer/preset-all'
  ])
  const spreadsheetVersion = readPackageVersion(spreadsheetRoot)
  await push(
    'spreadsheet-openxml',
    'spreadsheet-worker',
    join(targetRoot, 'vendor/xlsx/sheet.worker.js'),
    () =>
      copyFileIfPresent(
        spreadsheetRoot ? join(spreadsheetRoot, 'dist/worker/sheet.worker.js') : null,
        join(targetRoot, 'vendor/xlsx/sheet.worker.js')
      ),
    undefined,
    spreadsheetRoot
      ? {
          sourcePackage: '@file-viewer/renderer-spreadsheet',
          sourceVersion: spreadsheetVersion || undefined
        }
      : undefined
  )

  const cadDependencyAnchors = ['@file-viewer/renderer-cad'] as const
  const cadRoot = resolvePackageRoot('@flyfish-dev/cad-viewer', cadDependencyAnchors)
  const cadRuntimeVersion = assertOwnedPackageVersion(
    '@flyfish-dev/cad-viewer',
    cadRoot,
    '@file-viewer/renderer-cad',
    cadDependencyAnchors
  )
  await push('cad', 'cad-wasm-directory', join(targetRoot, 'wasm/cad'), () =>
    copyVersionedCadRuntimeDirectoryIfPresent(
      cadRoot ? join(cadRoot, 'dist/wasm') : null,
      join(targetRoot, 'wasm/cad'),
      cadRuntimeVersion
    ),
    undefined,
    cadRoot
      ? {
          sourcePackage: '@flyfish-dev/cad-viewer',
          sourceVersion: cadRuntimeVersion || undefined
        }
      : undefined
  )

  const modelDependencyAnchors = [
    '@file-viewer/renderer-3d',
    '@file-viewer/geometry-engine'
  ] as const
  const occtRoot = resolvePackageRoot('occt-import-js', modelDependencyAnchors)
  const geometryEngineRoot = resolvePackageRoot('@file-viewer/geometry-engine', [
    '@file-viewer/renderer-3d'
  ])
  const occtVersion = assertOwnedPackageVersion(
    'occt-import-js',
    occtRoot,
    '@file-viewer/geometry-engine',
    modelDependencyAnchors
  )
  const occtSource = occtRoot
    ? { sourcePackage: 'occt-import-js', sourceVersion: occtVersion || undefined }
    : undefined
  await push('model', 'model-occt-worker', join(targetRoot, 'wasm/model/occt-worker.js'), () =>
    copyFileIfPresent(
      geometryEngineRoot ? join(geometryEngineRoot, 'assets/occt-worker.js') : null,
      join(targetRoot, 'wasm/model/occt-worker.js')
    )
  )
  for (const [id, filename] of [
    ['model-occt-runtime', 'occt-import-js.js'],
    ['model-occt-wasm', 'occt-import-js.wasm'],
    ['model-occt-license', 'license.occt.txt'],
    ['model-occt-import-license', 'license.occt-import-js.txt']
  ] as const) {
    const targetFilename = filename.startsWith('license.')
      ? filename.replace(/^license\./, 'LICENSE.')
      : filename
    await push(
      'model',
      id,
      join(targetRoot, `wasm/model/${targetFilename}`),
      () => copyFileIfPresent(
        occtRoot ? join(occtRoot, `dist/${filename}`) : null,
        join(targetRoot, `wasm/model/${targetFilename}`)
      ),
      undefined,
      occtSource
    )
  }

  const typstCompilerRoot = resolvePackageRoot('@myriaddreamin/typst-ts-web-compiler', [
    '@file-viewer/renderer-typst'
  ])
  const typstRendererRoot = resolvePackageRoot('@myriaddreamin/typst-ts-renderer', [
    '@file-viewer/renderer-typst'
  ])
  const typstRendererPackageRoot = resolvePackageRoot('@file-viewer/renderer-typst', [
    '@file-viewer/renderer-typst'
  ])
  await push(
    'typst',
    'typst-compiler-wasm',
    join(targetRoot, 'wasm/typst/typst_ts_web_compiler_bg.wasm'),
    () =>
      copyFileIfPresent(
        typstCompilerRoot ? join(typstCompilerRoot, 'pkg/typst_ts_web_compiler_bg.wasm') : null,
        join(targetRoot, 'wasm/typst/typst_ts_web_compiler_bg.wasm')
      )
  )
  await push(
    'typst',
    'typst-renderer-wasm',
    join(targetRoot, 'wasm/typst/typst_ts_renderer_bg.wasm'),
    () =>
      copyFileIfPresent(
        typstRendererRoot ? join(typstRendererRoot, 'pkg/typst_ts_renderer_bg.wasm') : null,
        join(targetRoot, 'wasm/typst/typst_ts_renderer_bg.wasm')
      )
  )
  await push(
    'typst',
    'typst-font-assets',
    join(targetRoot, 'wasm/typst/fonts'),
    () =>
      copyDirectoryIfPresent(
        typstRendererPackageRoot ? join(typstRendererPackageRoot, 'assets/fonts') : null,
        join(targetRoot, 'wasm/typst/fonts')
      )
  )

  const archiveRoot = resolvePackageRoot('libarchive.js', ['@file-viewer/renderer-archive'])
  await push(
    'archive',
    'libarchive-worker',
    join(targetRoot, 'vendor/libarchive/worker-bundle.js'),
    () =>
      copyFileIfPresent(
        archiveRoot ? join(archiveRoot, 'dist/worker-bundle.js') : null,
        join(targetRoot, 'vendor/libarchive/worker-bundle.js')
      )
  )
  await push(
    'archive',
    'libarchive-wasm',
    join(targetRoot, 'vendor/libarchive/libarchive.wasm'),
    () =>
      copyFileIfPresent(
        archiveRoot ? join(archiveRoot, 'dist/libarchive.wasm') : null,
        join(targetRoot, 'vendor/libarchive/libarchive.wasm')
      )
  )

  const chmRoot = resolvePackageRoot('@file-viewer/renderer-chm', ['@file-viewer/renderer-chm'])
  const chmSource = chmRoot
    ? { sourcePackage: '@file-viewer/renderer-chm', sourceVersion: readPackageVersion(chmRoot) || undefined }
    : undefined
  for (const [id, sourceName, targetName] of [
    ['chm-worker', 'dist/chm.worker.js', 'chm.worker.js'],
    ['chm-wasm-module', 'dist/chm_wasm.js', 'chm_wasm.js'],
    ['chm-wasm', 'dist/chm_wasm_bg.wasm', 'chm_wasm_bg.wasm'],
    ['chm-license', 'LICENSE', 'LICENSE'],
    ['chm-third-party-notices', 'THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.md'],
    ['chm-rust-notice', 'rust/NOTICE.md', 'RUST_NOTICE.md'],
    ['chm-rust-third-party-licenses', 'rust/THIRD_PARTY_LICENSES.md', 'RUST_THIRD_PARTY_LICENSES.md']
  ] as const) {
    await push(
      'chm',
      id,
      join(targetRoot, `vendor/chm/${targetName}`),
      () => copyFileIfPresent(
        chmRoot ? join(chmRoot, sourceName) : null,
        join(targetRoot, `vendor/chm/${targetName}`)
      ),
      undefined,
      chmSource
    )
  }

  const sqlJsRoot = resolvePackageRoot('sql.js', ['@file-viewer/renderer-data'])
  const designRendererRoot = resolvePackageRoot('@file-viewer/renderer-design')
  const introspectWasmRoot = resolvePackageRoot('@paged-media/introspect-wasm', [
    '@file-viewer/renderer-design'
  ])
  const introspectWasmVersion = assertOwnedPackageVersion(
    '@paged-media/introspect-wasm',
    introspectWasmRoot,
    '@file-viewer/renderer-design'
  )
  const introspectWasmSource = introspectWasmRoot
    ? {
        sourcePackage: '@paged-media/introspect-wasm',
        sourceVersion: introspectWasmVersion || undefined
      }
    : undefined
  await push(
    'illustrator-pdf-design',
    'illustrator-pgf-worker',
    join(targetRoot, 'vendor/design/illustrator-pgf.worker.js'),
    () =>
      copyFileIfPresent(
        designRendererRoot ? join(designRendererRoot, 'dist/illustrator-pgf.worker.js') : null,
        join(targetRoot, 'vendor/design/illustrator-pgf.worker.js')
      )
  )
  await push(
    'photoshop-design',
    'photoshop-design-worker',
    join(targetRoot, 'vendor/design/photoshop.worker.js'),
    () =>
      copyFileIfPresent(
        designRendererRoot ? join(designRendererRoot, 'dist/photoshop.worker.js') : null,
        join(targetRoot, 'vendor/design/photoshop.worker.js')
      )
  )
  await push(
    'photoshop-resource-design',
    'photoshop-resource-worker',
    join(targetRoot, 'vendor/design/adobe-resource.worker.js'),
    () =>
      copyFileIfPresent(
        designRendererRoot ? join(designRendererRoot, 'dist/adobe-resource.worker.js') : null,
        join(targetRoot, 'vendor/design/adobe-resource.worker.js')
      )
  )
  await push(
    'adobe-palette-design',
    'adobe-palette-container-worker',
    join(targetRoot, 'vendor/design/adobe-container.worker.js'),
    () =>
      copyFileIfPresent(
        designRendererRoot ? join(designRendererRoot, 'dist/adobe-container.worker.js') : null,
        join(targetRoot, 'vendor/design/adobe-container.worker.js')
      )
  )
  await push(
    'indesign-exchange-design',
    'indesign-exchange-container-worker',
    join(targetRoot, 'vendor/design/adobe-container.worker.js'),
    () =>
      copyFileIfPresent(
        designRendererRoot ? join(designRendererRoot, 'dist/adobe-container.worker.js') : null,
        join(targetRoot, 'vendor/design/adobe-container.worker.js')
      )
  )
  await push(
    'adobe-animate-xfl-design',
    'adobe-animate-xfl-container-worker',
    join(targetRoot, 'vendor/design/adobe-container.worker.js'),
    () =>
      copyFileIfPresent(
        designRendererRoot ? join(designRendererRoot, 'dist/adobe-container.worker.js') : null,
        join(targetRoot, 'vendor/design/adobe-container.worker.js')
      )
  )
  await push(
    'adobe-xd-design',
    'adobe-xd-container-worker',
    join(targetRoot, 'vendor/design/adobe-container.worker.js'),
    () =>
      copyFileIfPresent(
        designRendererRoot ? join(designRendererRoot, 'dist/adobe-container.worker.js') : null,
        join(targetRoot, 'vendor/design/adobe-container.worker.js')
      )
  )
  await push(
    'indesign-native-design',
    'indesign-native-container-worker',
    join(targetRoot, 'vendor/design/adobe-container.worker.js'),
    () =>
      copyFileIfPresent(
        designRendererRoot ? join(designRendererRoot, 'dist/adobe-container.worker.js') : null,
        join(targetRoot, 'vendor/design/adobe-container.worker.js')
      )
  )
  await push(
    'postscript-design',
    'postscript-design-worker',
    join(targetRoot, 'vendor/design/postscript.worker.js'),
    () =>
      copyFileIfPresent(
        designRendererRoot ? join(designRendererRoot, 'dist/postscript.worker.js') : null,
        join(targetRoot, 'vendor/design/postscript.worker.js')
      )
  )
  await push(
    'postscript-design',
    'postscript-design-wasm',
    join(targetRoot, 'vendor/design/stet_wasm_bg.wasm'),
    () =>
      copyFileIfPresent(
        designRendererRoot ? join(designRendererRoot, 'runtime/postscript/stet_wasm_bg.wasm') : null,
        join(targetRoot, 'vendor/design/stet_wasm_bg.wasm')
      )
  )
  const postscriptLicenses = [
    ['postscript-design-license-stet-apache', 'Stet-Apache-2.0.txt', 'LICENSE.stet-Apache-2.0.txt'],
    ['postscript-design-license-stet-mit', 'Stet-MIT.txt', 'LICENSE.stet-MIT.txt'],
    ['postscript-design-license-carlito-ofl', 'Carlito-OFL-1.1.txt', 'LICENSE.Carlito-OFL-1.1.txt'],
    ['postscript-design-license-tinos-ofl', 'Tinos-OFL-1.1.txt', 'LICENSE.Tinos-OFL-1.1.txt'],
    ['postscript-design-license-cousine-ofl', 'Cousine-OFL-1.1.txt', 'LICENSE.Cousine-OFL-1.1.txt'],
    ['postscript-design-license-noto-symbols-ofl', 'NotoSansSymbols2-OFL-1.1.txt', 'LICENSE.NotoSansSymbols2-OFL-1.1.txt']
  ] as const
  for (const [assetId, sourceName, targetName] of postscriptLicenses) {
    await push(
      'postscript-design',
      assetId,
      join(targetRoot, 'vendor/design', targetName),
      () =>
        copyFileIfPresent(
          designRendererRoot ? join(designRendererRoot, 'LICENSES', sourceName) : null,
          join(targetRoot, 'vendor/design', targetName)
        )
    )
  }
  await push(
    'indesign-idml-design',
    'indesign-idml-worker',
    join(targetRoot, 'vendor/design/idml.worker.js'),
    () =>
      copyFileIfPresent(
        designRendererRoot ? join(designRendererRoot, 'dist/idml.worker.js') : null,
        join(targetRoot, 'vendor/design/idml.worker.js')
      )
  )
  await push(
    'indesign-idml-design',
    'indesign-idml-wasm',
    join(targetRoot, 'vendor/design/paged_introspect_wasm_bg.wasm'),
    () =>
      copyFileIfPresent(
        introspectWasmRoot
          ? join(introspectWasmRoot, 'paged_introspect_wasm_bg.wasm')
          : null,
        join(targetRoot, 'vendor/design/paged_introspect_wasm_bg.wasm')
      ),
    undefined,
    introspectWasmSource
  )
  await push(
    'indesign-idml-design',
    'indesign-idml-license',
    join(targetRoot, 'vendor/design/LICENSE.introspect-wasm-MPL-2.0.txt'),
    () =>
      copyFileIfPresent(
        designRendererRoot ? join(designRendererRoot, 'LICENSES/MPL-2.0.txt') : null,
        join(targetRoot, 'vendor/design/LICENSE.introspect-wasm-MPL-2.0.txt')
      )
  )
  await push(
    'data-asset',
    'data-sql-wasm',
    join(targetRoot, 'wasm/data/sql-wasm.wasm'),
    () =>
      copyFileIfPresent(
        sqlJsRoot ? join(sqlJsRoot, 'dist/sql-wasm.wasm') : null,
        join(targetRoot, 'wasm/data/sql-wasm.wasm')
      )
  )

  await mkdir(targetRoot, { recursive: true })
  await writeFile(
    join(targetRoot, 'flyfish-viewer-assets.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedBy: '@file-viewer/vite-plugin',
        rendererIds,
        copiedAt: new Date().toISOString(),
        assets: results
      },
      null,
      2
    )}\n`
  )

  return results
}

interface BundledFullAssetManifest {
  schemaVersion: number
  rendererAssetManifests?: Array<{
    rendererId: string
    assets: Array<{
      id: string
      rendererId: string
      kind: string
      target: string
      required: boolean
      defaultPath?: string
    }>
  }>
  [key: string]: unknown
}

interface InstalledCapabilityAssetSource {
  packageName: string
  packageRoot: string
  packageVersion: string
  payloadRoot: string
  manifest: BundledFullAssetManifest & {
    packageName?: string
    packageVersion?: string
  }
}

const independentlyOwnedAssetRendererIds = new Map<string, string>([
  ['archive', '@file-viewer/assets-standard'],
  ['chm', '@file-viewer/assets-chm'],
  ['pdf', '@file-viewer/assets-standard'],
  ['office-word-openxml', '@file-viewer/assets-standard'],
  ['office-presentation', '@file-viewer/assets-standard'],
  ['spreadsheet-openxml', '@file-viewer/assets-standard'],
  ['cad', '@file-viewer/assets-cad'],
  ['typst', '@file-viewer/assets-typst'],
  ['model', '@file-viewer/assets-model'],
  ['apple-pages', '@file-viewer/assets-iwork'],
  ['apple-numbers', '@file-viewer/assets-iwork'],
  ['apple-keynote', '@file-viewer/assets-iwork'],
  ['office-presentation-binary', '@file-viewer/assets-ppt'],
  ['office-hangul', '@file-viewer/assets-hangul'],
  ['office-wordperfect', '@file-viewer/assets-wordperfect'],
  ['data-asset', '@file-viewer/assets-data']
])

function resolveInstalledCapabilityAssetSources(
  installedAssetPackages: readonly string[],
  anchorPackages: readonly string[]
) {
  return installedAssetPackages.map((packageName): InstalledCapabilityAssetSource => {
    if (packageName === 'file-viewer-copy-assets') {
      throw new Error('[file-viewer:vite-plugin] The v2 aggregate asset carrier is forbidden in a v3 capability plan.')
    }
    const packageRoot = resolvePackageRoot(packageName, anchorPackages)
    if (!packageRoot) throw new Error(`[file-viewer:vite-plugin] Could not resolve installed asset owner ${packageName}.`)
    const packageVersion = readPackageVersion(packageRoot)
    if (!packageVersion) throw new Error(`[file-viewer:vite-plugin] Could not read ${packageName} version.`)
    const payloadRoot = join(packageRoot, 'viewer')
    const manifestPath = [
      join(payloadRoot, 'file-viewer-asset-pack.json'),
      join(payloadRoot, 'flyfish-viewer-assets.json')
    ].find(candidate => existsSync(candidate) && statSync(candidate).isFile())
    if (!manifestPath) throw new Error(`[file-viewer:vite-plugin] ${packageName} has no staged capability asset manifest.`)
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as InstalledCapabilityAssetSource['manifest']
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.rendererAssetManifests) ||
        manifest.packageName !== packageName || manifest.packageVersion !== packageVersion) {
      throw new Error(`[file-viewer:vite-plugin] ${packageName}@${packageVersion} has an invalid or stale asset manifest.`)
    }
    return { packageName, packageRoot, packageVersion, payloadRoot, manifest }
  })
}

async function copyAssetPathWithoutConflicts(sourceRoot: string, targetRoot: string, relativePath: string) {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  const source = resolve(sourceRoot, ...normalized.split('/'))
  const destination = resolve(targetRoot, ...normalized.split('/'))
  if (!isPathWithin(sourceRoot, source) || !isPathWithin(targetRoot, destination)) {
    throw new Error(`[file-viewer:vite-plugin] Asset path escapes its package or output root: ${relativePath}.`)
  }
  const sourceInfo = await lstat(source)
  if (sourceInfo.isSymbolicLink()) throw new Error(`[file-viewer:vite-plugin] Asset source is a symbolic link: ${source}.`)
  if (sourceInfo.isDirectory()) {
    await mkdir(destination, { recursive: true })
    for (const entry of await readdir(source, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error(`[file-viewer:vite-plugin] Asset source is a symbolic link: ${join(source, entry.name)}.`)
      await copyAssetPathWithoutConflicts(sourceRoot, targetRoot, `${normalized}/${entry.name}`)
    }
    return
  }
  if (!sourceInfo.isFile()) throw new Error(`[file-viewer:vite-plugin] Asset source is not a regular file: ${source}.`)
  await mkdir(dirname(destination), { recursive: true })
  if (existsSync(destination)) {
    const destinationInfo = await lstat(destination)
    if (destinationInfo.isSymbolicLink() || !destinationInfo.isFile()) {
      throw new Error(`[file-viewer:vite-plugin] Refusing unsafe asset destination ${destination}.`)
    }
    const [sourceContent, destinationContent] = await Promise.all([readFile(source), readFile(destination)])
    if (!sourceContent.equals(destinationContent)) {
      throw new Error(`[file-viewer:vite-plugin] Asset owners conflict at ${normalized}.`)
    }
    return
  }
  await copyFile(source, destination)
}

async function copyInstalledCapabilityAssetPacks(
  targetRoot: string,
  rendererIds: readonly string[],
  installedAssetPackages: readonly string[],
  anchorPackages: readonly string[]
) {
  const selected = new Set(rendererIds)
  const sources = resolveInstalledCapabilityAssetSources(installedAssetPackages, anchorPackages)
  const rendererOwners = new Map<string, { packageName: string; manifest: Record<string, unknown> }>()
  const results: AssetCopyResult[] = []
  await mkdir(targetRoot, { recursive: true })
  for (const source of sources) {
    for (const rendererManifest of source.manifest.rendererAssetManifests || []) {
      if (!selected.has(rendererManifest.rendererId)) continue
      const existing = rendererOwners.get(rendererManifest.rendererId)
      if (existing) {
        throw new Error(
          `[file-viewer:vite-plugin] Renderer asset group ${rendererManifest.rendererId} is owned by both ` +
          `${existing.packageName} and ${source.packageName}.`
        )
      }
      rendererOwners.set(rendererManifest.rendererId, {
        packageName: source.packageName,
        manifest: rendererManifest as unknown as Record<string, unknown>
      })
      for (const asset of rendererManifest.assets || []) {
        if (asset.target !== 'public' || !asset.defaultPath) continue
        const destination = resolve(targetRoot, ...asset.defaultPath.replace(/\\/g, '/').replace(/^\/+/, '').split('/'))
        try {
          await copyAssetPathWithoutConflicts(source.payloadRoot, targetRoot, asset.defaultPath)
          results.push({
            rendererId: asset.rendererId,
            id: asset.id,
            to: destination,
            copied: true,
            required: asset.required,
            sourcePackage: source.packageName,
            sourceVersion: source.packageVersion
          })
        } catch (error) {
          results.push({
            rendererId: asset.rendererId,
            id: asset.id,
            to: destination,
            copied: false,
            required: asset.required,
            reason: (error as Error).message,
            sourcePackage: source.packageName,
            sourceVersion: source.packageVersion
          })
        }
      }
    }
  }
  const manifests = [...rendererOwners]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value.manifest)
  await writeFile(join(targetRoot, 'flyfish-viewer-assets.json'), `${JSON.stringify({
    schemaVersion: 1,
    generatedBy: '@file-viewer/vite-plugin',
    rendererAssetManifests: manifests
  }, null, 2)}\n`)
  await writeFile(join(targetRoot, 'flyfish-viewer-manifest.json'), `${JSON.stringify({
    schemaVersion: 1,
    kind: 'file-viewer-capability-assets',
    owners: sources.map(source => ({ packageName: source.packageName, packageVersion: source.packageVersion }))
      .sort((left, right) => left.packageName.localeCompare(right.packageName))
  }, null, 2)}\n`)
  return { results, rendererIds: [...rendererOwners.keys()].sort() }
}

function matchesBundledAssetKind(kind: string, info: { isDirectory(): boolean; isFile(): boolean }) {
  return kind === 'directory' || kind === 'wasm-directory'
    ? info.isDirectory()
    : info.isFile()
}

interface BundledFullAssetSource {
  packageName: string
  packageRoot: string
  payloadRoot: string
  sourceVersion: string
}

function isBundledFullAssetPayload(payloadRoot: string | null) {
  return Boolean(
    payloadRoot &&
    existsSync(payloadRoot) &&
    statSync(payloadRoot).isDirectory() &&
    existsSync(join(payloadRoot, 'flyfish-viewer-assets.json'))
  )
}

function resolveBundledFullAssetSource(installedFullPackages: readonly string[]) {
  const copyAssetsPackageRoot = resolvePackageRoot(
    'file-viewer-copy-assets',
    installedFullPackages
  )
  const copyAssetsPayloadRoot = copyAssetsPackageRoot
    ? join(copyAssetsPackageRoot, 'viewer')
    : null
  if (copyAssetsPackageRoot && copyAssetsPayloadRoot && isBundledFullAssetPayload(copyAssetsPayloadRoot)) {
    installedFullPackages.forEach((ownerPackageName) => {
      assertOwnedPackageVersion(
        'file-viewer-copy-assets',
        copyAssetsPackageRoot,
        ownerPackageName
      )
    })
    const sourceVersion = readPackageVersion(copyAssetsPackageRoot)
    if (sourceVersion) {
      return {
        packageName: 'file-viewer-copy-assets',
        packageRoot: copyAssetsPackageRoot,
        payloadRoot: copyAssetsPayloadRoot,
        sourceVersion
      } satisfies BundledFullAssetSource
    }
  }

  if (installedFullPackages.includes('@file-viewer/web-full')) {
    const webFullPackageRoot = resolvePackageRoot(
      '@file-viewer/web-full',
      installedFullPackages
    )
    const webFullPayloadRoot = webFullPackageRoot
      ? join(webFullPackageRoot, 'dist')
      : null
    const sourceVersion = readPackageVersion(webFullPackageRoot)
    if (
      webFullPackageRoot &&
      webFullPayloadRoot &&
      sourceVersion &&
      isBundledFullAssetPayload(webFullPayloadRoot)
    ) {
      return {
        packageName: '@file-viewer/web-full',
        packageRoot: webFullPackageRoot,
        payloadRoot: webFullPayloadRoot,
        sourceVersion
      } satisfies BundledFullAssetSource
    }
  }

  // Source workspaces may not have staged file-viewer-copy-assets/viewer yet.
  // @file-viewer/web keeps the same tracked payload for local development.
  const webPackageRoot = resolvePackageRoot('@file-viewer/web', installedFullPackages)
  const webPayloadRoot = webPackageRoot ? join(webPackageRoot, 'viewer') : null
  const sourceVersion = readPackageVersion(webPackageRoot)
  if (
    webPackageRoot &&
    webPayloadRoot &&
    sourceVersion &&
    isBundledFullAssetPayload(webPayloadRoot)
  ) {
    return {
      packageName: '@file-viewer/web',
      packageRoot: webPackageRoot,
      payloadRoot: webPayloadRoot,
      sourceVersion
    } satisfies BundledFullAssetSource
  }
  return null
}

function assertBundledFullAssetSourceVersion(
  source: BundledFullAssetSource,
  installedFullPackages: readonly string[]
) {
  const payloadManifestPath = join(source.payloadRoot, 'flyfish-viewer-manifest.json')
  if (!existsSync(payloadManifestPath)) {
    throw new Error(
      `[file-viewer:vite-plugin] Missing version manifest in ${source.packageName} payload: ${payloadManifestPath}.`
    )
  }
  const payloadManifest = JSON.parse(readFileSync(payloadManifestPath, 'utf8')) as {
    version?: string
  }
  if (!payloadManifest.version || payloadManifest.version !== source.sourceVersion) {
    throw new Error(
      `[file-viewer:vite-plugin] ${source.packageName}@${source.sourceVersion} contains ` +
      `viewer assets for ${payloadManifest.version || 'an unknown version'}.`
    )
  }
  installedFullPackages.forEach((packageName) => {
    const packageRoot = resolvePackageRoot(packageName, installedFullPackages)
    const packageVersion = readPackageVersion(packageRoot)
    if (packageVersion && packageVersion !== payloadManifest.version) {
      throw new Error(
        `[file-viewer:vite-plugin] ${packageName}@${packageVersion} cannot use ` +
        `${source.packageName} viewer assets at ${payloadManifest.version}.`
      )
    }
  })
}

async function copyBundledFullRendererAssets(
  targetRoot: string,
  rendererIds: readonly string[],
  installedFullPackages: readonly string[]
): Promise<AssetCopyResult[] | null> {
  const source = resolveBundledFullAssetSource(installedFullPackages)
  if (!source) {
    return null
  }
  assertBundledFullAssetSourceVersion(source, installedFullPackages)
  const sourceManifestPath = join(source.payloadRoot, 'flyfish-viewer-assets.json')
  const manifest = JSON.parse(
    readFileSync(sourceManifestPath, 'utf8')
  ) as BundledFullAssetManifest
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.rendererAssetManifests)) {
    throw new Error(
      `[file-viewer:vite-plugin] Unsupported full asset manifest in ${sourceManifestPath}.`
    )
  }

  await mkdir(targetRoot, { recursive: true })
  await cp(source.payloadRoot, targetRoot, { recursive: true, force: true })
  const results: AssetCopyResult[] = []
  for (const asset of manifest.rendererAssetManifests.flatMap(
    (rendererManifest) => rendererManifest.assets
  )) {
    if (asset.target !== 'public' || !asset.defaultPath) {
      continue
    }
    const relativePath = asset.defaultPath.replace(/\\/g, '/').replace(/^\/+/, '')
    const destination = resolve(targetRoot, ...relativePath.split('/'))
    let copied = false
    let reason: string | undefined
    if (!isPathWithin(targetRoot, destination)) {
      reason = 'asset manifest path escapes the copy target'
    } else {
      try {
        copied = matchesBundledAssetKind(asset.kind, await stat(destination))
        if (!copied) {
          reason = `copied path does not match asset kind ${asset.kind}`
        }
      } catch {
        reason = 'bundled full asset not found after copy'
      }
    }
    results.push({
      rendererId: asset.rendererId,
      id: asset.id,
      to: destination,
      copied,
      required: asset.required,
      reason,
      sourcePackage: source.packageName,
      sourceVersion: source.sourceVersion
    })
  }

  await writeFile(
    join(targetRoot, 'flyfish-viewer-assets.json'),
    `${JSON.stringify(
      {
        ...manifest,
        generatedBy: '@file-viewer/vite-plugin',
        copiedAt: new Date().toISOString(),
        rendererIds,
        assets: results
      },
      null,
      2
    )}\n`
  )
  return results
}

async function copyRendererAssets(
  target: FileViewerCopyAssetsTarget,
  rendererIds: readonly string[]
) {
  if (target.installedFullPackages.length) {
    const bundledResults = await copyBundledFullRendererAssets(
      target.targetRoot,
      rendererIds,
      target.installedFullPackages
    )
    if (bundledResults) {
      return bundledResults
    }
  }
  if (target.installedAssetPackages.length) {
    const bundled = await copyInstalledCapabilityAssetPacks(
      target.targetRoot,
      rendererIds,
      target.installedAssetPackages,
      target.installedFullPackages
    )
    const covered = new Set(bundled.rendererIds)
    for (const rendererId of rendererIds) {
      const requiredOwner = independentlyOwnedAssetRendererIds.get(rendererId)
      if (requiredOwner && !covered.has(rendererId)) {
       bundled.results.push({
         rendererId,
         id: 'missing-independent-asset-owner',
         to: target.targetRoot,
         copied: false,
          // Specialist offline payloads stay opt-in; warn instead of failing the build.
          required: false,
         reason: `install ${requiredOwner} for this capability`
       })
      }
    }
    return bundled.results
  }
  const results = await copyKnownRendererAssets(target.targetRoot, rendererIds)
  if (target.installedFullPackages.length) {
    results.push({
      rendererId: 'full',
      id: 'full-asset-payload',
      to: target.targetRoot,
      copied: false,
      required: true,
      reason: 'no version-matched full viewer payload was found in file-viewer-copy-assets, @file-viewer/web-full, or @file-viewer/web'
    })
  }
  return results
}

function copyOptions(
  value: FileViewerRenderersPluginOptions['copyAssets']
): FileViewerCopyAssetsOptions {
  return typeof value === 'object' ? value : {}
}

export interface FileViewerCopyAssetsTargetConfig {
  /** Vite project root. Defaults to process.cwd(). */
  projectRoot?: string
  /** Resolved Vite publicDir. Defaults to `public`. */
  publicDir?: string
  /** Resolved Vite build.outDir. Defaults to `dist`. */
  outDir?: string
}

export interface FileViewerCopyAssetsTarget {
  mode: 'dev' | 'build'
  outputRoot: string
  targetRoot: string
  baseDir: string
  installedFullPackages: string[]
  installedAssetPackages: string[]
}

function findNearestProjectPackageJson(projectRoot: string) {
  let current = resolve(projectRoot)
  while (true) {
    const packageJsonPath = join(current, 'package.json')
    if (existsSync(packageJsonPath) && statSyncSafe(packageJsonPath)?.isFile()) {
      return packageJsonPath
    }
    const parent = dirname(current)
    if (parent === current) {
      return null
    }
    current = parent
  }
}

function resolveInstalledFullPackages(projectRoot: string) {
  const packageJsonPath = findNearestProjectPackageJson(projectRoot)
  if (!packageJsonPath) {
    return []
  }
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      optionalDependencies?: Record<string, string>
      peerDependencies?: Record<string, string>
    }
    const declaredPackages = new Set([
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.devDependencies || {}),
      ...Object.keys(packageJson.optionalDependencies || {}),
      ...Object.keys(packageJson.peerDependencies || {})
    ])
    const projectPackageRequire = createRequire(packageJsonPath)
    return fileViewerFullPackages.filter(
      (packageName) =>
        declaredPackages.has(packageName) &&
        Boolean(tryResolvePackageJson(packageName, projectPackageRequire))
    )
  } catch {
    return []
  }
}

function resolveInstalledAssetPackages(projectRoot: string) {
  const packageJsonPath = findNearestProjectPackageJson(projectRoot)
  if (!packageJsonPath) return []
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      optionalDependencies?: Record<string, string>
    }
    const declared = unique([
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.devDependencies || {}),
      ...Object.keys(packageJson.optionalDependencies || {})
    ]).filter(packageName => packageName.startsWith('@file-viewer/assets-'))
    const require = createRequire(packageJsonPath)
    const resolved = declared.filter(packageName => Boolean(tryResolvePackageJson(packageName, require)))
    return unique(resolved).sort()
  } catch {
    return []
  }
}

function normalizeCopyAssetsBaseDir(value: string) {
  const normalized = value.trim().replace(/\\/g, '/')
  if (!normalized) {
    return ''
  }
  if (
    normalized.startsWith('/') ||
    isAbsolute(value) ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.includes('\0')
  ) {
    throw new Error(
      `[file-viewer:vite-plugin] copyAssets.baseDir must be a relative directory, received ${JSON.stringify(value)}.`
    )
  }
  const segments = normalized.split('/').filter(Boolean)
  const decodedSegments: string[] = []
  for (const segment of segments) {
    let decodedSegment = segment
    try {
      decodedSegment = decodeURIComponent(segment)
    } catch {
      throw new Error(
        `[file-viewer:vite-plugin] copyAssets.baseDir contains invalid URL encoding: ${JSON.stringify(value)}.`
      )
    }
    if (
      decodedSegment === '.' ||
      decodedSegment === '..' ||
      decodedSegment.includes('/') ||
      decodedSegment.includes('\\') ||
      decodedSegment.includes('\0')
    ) {
      throw new Error(
        `[file-viewer:vite-plugin] copyAssets.baseDir cannot escape its output directory: ${JSON.stringify(value)}.`
      )
    }
    decodedSegments.push(decodedSegment)
  }
  return decodedSegments.join('/')
}

function isPathWithin(parent: string, candidate: string) {
  const relativePath = relative(parent, candidate)
  return relativePath === '' || (
    relativePath !== '..' &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  )
}

function resolveOutputRoot(value: string | undefined, fallback: string, projectRoot: string) {
  const output = value || fallback
  return isAbsolute(output) ? resolve(output) : resolve(projectRoot, output)
}

/**
 * Resolves the exact directory used by copyAssets without running a Vite build.
 * This is exported so integrations can validate their deployment contract.
 */
export function resolveFileViewerCopyAssetsTarget(
  mode: 'dev' | 'build',
  value: true | FileViewerCopyAssetsOptions = true,
  config: FileViewerCopyAssetsTargetConfig = {}
): FileViewerCopyAssetsTarget {
  const projectRoot = resolve(config.projectRoot || process.cwd())
  const options = copyOptions(value)
  const installedFullPackages = resolveInstalledFullPackages(projectRoot)
  const installedAssetPackages = resolveInstalledAssetPackages(projectRoot)
  const baseDir = normalizeCopyAssetsBaseDir(
    typeof options.baseDir === 'string'
      ? options.baseDir
      : installedFullPackages.length
        ? 'file-viewer'
        : ''
  )
  const outputRoot = resolveOutputRoot(
    mode === 'dev' ? options.publicDir : options.outDir,
    mode === 'dev' ? config.publicDir || 'public' : config.outDir || 'dist',
    projectRoot
  )
  const targetRoot = baseDir
    ? resolve(outputRoot, ...baseDir.split('/'))
    : outputRoot
  if (!isPathWithin(outputRoot, targetRoot)) {
    throw new Error(
      `[file-viewer:vite-plugin] Refusing to copy assets outside ${outputRoot}: ${targetRoot}.`
    )
  }
  return {
    mode,
    outputRoot,
    targetRoot,
    baseDir,
    installedFullPackages: [...installedFullPackages],
    installedAssetPackages
  }
}

function normalizeViteDevBasePath(base: string) {
  let pathname = base
  if (/^[A-Za-z][A-Za-z\d+.-]*:\/\//.test(base)) {
    try {
      pathname = new URL(base).pathname
    } catch {
      return '/'
    }
  }
  if (!pathname.startsWith('/')) {
    return '/'
  }
  return pathname.endsWith('/') ? pathname : `${pathname}/`
}

function resolveViteFullAssetBase(base: string | undefined, baseDir: string): FullAssetRuntimeBase {
  const encodedBaseDir = baseDir
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  const encodedBaseDirWithSlash = encodedBaseDir ? `${encodedBaseDir}/` : ''
  const resolvedBase = base === undefined ? '/' : base.trim()
  const isAbsoluteBase =
    resolvedBase.startsWith('/') || /^[A-Za-z][A-Za-z\d+.-]*:\/\//.test(resolvedBase)
  if (!isAbsoluteBase) {
    return { kind: 'deployment', encodedBaseDir: encodedBaseDirWithSlash }
  }
  const normalizedBase = resolvedBase.endsWith('/') ? resolvedBase : `${resolvedBase}/`
  return { kind: 'literal', url: `${normalizedBase}${encodedBaseDirWithSlash}` }
}

function resolveDevAssetRequestPath(
  targetRoot: string,
  baseDir: string,
  requestPathname: string,
  viteBasePath: string
) {
  let requestRelativePath: string
  try {
    // Depending on the Vite major and middleware ordering, configureServer can
    // observe either the original base-prefixed URL or the pathname after
    // Vite's base middleware has stripped it. Accept both shapes, then keep the
    // strict viewer-asset allowlist and target-root boundary checks below.
    const encodedRelativePath = viteBasePath === '/' || requestPathname.startsWith(viteBasePath)
      ? requestPathname.slice(viteBasePath === '/' ? 1 : viteBasePath.length)
      : requestPathname.replace(/^\/+/, '')
    requestRelativePath = decodeURIComponent(encodedRelativePath)
  } catch {
    return null
  }
  requestRelativePath = requestRelativePath.replace(/\\/g, '/')
  if (requestRelativePath.includes('\0')) {
    return null
  }
  const basePrefix = baseDir ? `${baseDir}/` : ''
  if (basePrefix && !requestRelativePath.startsWith(basePrefix)) {
    return null
  }
  const assetRelativePath = requestRelativePath.slice(basePrefix.length)
  const isViewerManifest =
    assetRelativePath === 'flyfish-viewer-assets.json' ||
    assetRelativePath === 'flyfish-viewer-manifest.json'
  if (
    !isViewerManifest &&
    !assetRelativePath.startsWith('vendor/') &&
    !assetRelativePath.startsWith('wasm/')
  ) {
    return null
  }
  const assetPath = resolve(targetRoot, ...assetRelativePath.split('/'))
  return isPathWithin(targetRoot, assetPath) ? assetPath : null
}

function collectAssetRendererIds(
  selection: RendererSelection,
  autoPresetIds: readonly FileViewerVitePreset[] = [],
  includeFullPreset = false
) {
  if (includeFullPreset) {
    return expandDescriptorRendererIds(presetModules.all.rendererIds)
  }
  const presetIds = [
    ...(selection.preset ? expandDescriptorRendererIds(presetModules[selection.preset].rendererIds) : []),
    ...autoPresetIds.flatMap((presetId) =>
      expandDescriptorRendererIds(presetModules[presetId].rendererIds)
    )
  ]
  return unique([
    ...presetIds,
    ...selection.descriptors.flatMap((descriptor) => descriptor.rendererIds)
  ])
}

const defaultRequiredAssetRendererIds: readonly string[] = [
  'pdf',
  'office-word-openxml',
  'office-presentation-binary',
  'office-presentation',
  'archive',
  'cad',
  'typst'
]

function isRequiredAssetResult(result: AssetCopyResult): boolean {
  return result.required ?? defaultRequiredAssetRendererIds.includes(result.rendererId)
}

function reportAssetCopy(
  results: readonly AssetCopyResult[],
  targetRoot: string,
  mode: FileViewerMissingRendererMode
) {
  const failedRequired = results.filter((result) => !result.copied && isRequiredAssetResult(result))
  const missingOptional = results.filter((result) => !result.copied && !isRequiredAssetResult(result))
  if (!results.length) {
    return
  }
  const summary = `[file-viewer:vite-plugin] Copied ${results.filter((result) => result.copied).length}/${results.length} renderer assets to ${targetRoot}`
  console.log(summary)
  if (missingOptional.length) {
    const optionalDetails = missingOptional
      .map((result) => `  - ${result.rendererId}:${result.id} -> ${result.to} (${result.reason || 'source asset not found'})`)
      .join('\n')
    console.warn(
      `[file-viewer:vite-plugin] Skipped optional offline assets; install the owning package to self-host them:\n${optionalDetails}`
    )
  }
  if (!failedRequired.length || mode === 'ignore') {
    return
  }
  const details = failedRequired
    .map((result) => `  - ${result.rendererId}:${result.id} -> ${result.to} (${result.reason})`)
    .join('\n')
  if (mode === 'warn') {
    console.warn(`${summary}\nMissing required assets:\n${details}`)
    return
  }
  throw new Error(`${summary}\nMissing required assets:\n${details}`)
}

export function fileViewerRenderers(options: FileViewerRenderersPluginOptions = {}): Plugin {
  const moduleId = options.moduleId || virtualModuleId
  const resolvedModuleId = `\0${moduleId}`
  const injectedModulePath = moduleId.startsWith('/') ? moduleId : `/${moduleId}`
  const missingMode = options.missingRenderer || 'error'
  const explicitFormats = [...(options.formats || []), ...(options.renderers || [])]
    .map(normalizeToken)
    .filter(Boolean)
  let scanFormats: string[] = []
  let requestedFormats = unique([...explicitFormats, ...scanFormats])
  let selection = selectRenderers({
    ...options,
    formats: [...(options.formats || []), ...scanFormats]
  })
  let autoPresetIds = resolveAutoPresetIds(options)
  let resolvedConfig: ResolvedConfig | null = null
  let installedFullPackages: string[] = []
  let runtimeAssetBase: FullAssetRuntimeBase | null = null
  const refreshSelection = (projectRoot?: string) => {
    if (projectRoot) {
      scanFormats = collectFileViewerRendererScanTokens(projectRoot, options.scan)
    }
    requestedFormats = unique([...explicitFormats, ...scanFormats])
    selection = selectRenderers({
      ...options,
      formats: [...(options.formats || []), ...scanFormats]
    })
    autoPresetIds = resolveAutoPresetIds(options)
  }
  const refreshFullAssetRuntime = (projectRoot: string, viteBase?: string) => {
    if (!options.copyAssets) {
      installedFullPackages = []
      runtimeAssetBase = null
      return
    }
    const target = resolveFileViewerCopyAssetsTarget('dev', options.copyAssets, {
      projectRoot
    })
    installedFullPackages = target.installedFullPackages
    runtimeAssetBase = resolveViteFullAssetBase(viteBase, target.baseDir)
  }
  const hasConfiguredRenderers = () =>
    Boolean(selection.preset || selection.descriptors.length || autoPresetIds.length)

  return {
    name: 'file-viewer-renderers',
    enforce: 'pre',
    config(userConfig) {
      const projectRoot = resolve(process.cwd(), userConfig.root || '.')
      refreshSelection(projectRoot)
      refreshFullAssetRuntime(projectRoot, userConfig.base)
      const dependencyAnchorPackages = collectDependencyAnchorPackages(selection, autoPresetIds)
      const resolvedDependencyAnchorPackages = runtimeAssetBase
        ? unique([
            ...dependencyAnchorPackages,
            '@file-viewer/core',
            ...installedFullPackages,
            ...(installedFullPackages.length ? ['@file-viewer/preset-all'] : [])
          ])
        : dependencyAnchorPackages
      const optimizeDepsExclude = createOptimizeDepsExclude(userConfig)
      const manualChunksFunction = getManualChunksFunction(userConfig)
      const nextConfig: UserConfig = {
        optimizeDeps: {
          exclude: optimizeDepsExclude,
          include: createOptimizeDepsInclude(
            userConfig,
            optimizeDepsExclude,
            resolvedDependencyAnchorPackages
          )
        },
        resolve: {
          alias: [
            ...normalizeViteAlias(userConfig.resolve?.alias),
            ...createFileViewerResolveAliases(resolvedDependencyAnchorPackages)
          ]
        }
      }
      if (resolveProjectViteMajor(projectRoot) >= 8) {
        return {
          ...nextConfig,
          ...createVite8ChunkConfig(userConfig, selection, autoPresetIds, options)
        }
      }
      if (manualChunksFunction && options.stabilizeInteropChunks !== false) {
        return {
          ...nextConfig,
          build: {
            rollupOptions: {
              output: {
                manualChunks: createStableInteropManualChunks(manualChunksFunction)
              }
            }
          }
        }
      }
      if ((options.chunkStrategy || 'renderer') === 'none' || hasManualChunks(userConfig)) {
        return nextConfig
      }
      return {
        ...nextConfig,
        build: {
          rollupOptions: {
            output: {
              manualChunks: createManualChunks(selection, autoPresetIds)
            }
          }
        }
      }
    },
    configResolved(config) {
      resolvedConfig = config
      refreshSelection(config.root)
      refreshFullAssetRuntime(config.root, config.base)
    },
    buildStart() {
      assertMissingRendererPolicy(selection, missingMode)
      const packages = collectSelectedPackages(selection, autoPresetIds)
      const missingPackages = packages.filter((packageName) => !resolvePackageJson(packageName))
      if (missingPackages.length && missingMode !== 'ignore') {
        const message = `Missing File Viewer preset/renderer package(s): ${missingPackages.join(', ')}. Install them or remove the matching preset/formats from @file-viewer/vite-plugin.`
        if (missingMode === 'warn') {
          console.warn(`[file-viewer:vite-plugin] ${message}`)
        } else {
          throw new Error(`[file-viewer:vite-plugin] ${message}`)
        }
      }
    },
    async configureServer(server) {
      if (!options.copyAssets || copyOptions(options.copyAssets).mode === 'build') {
        return
      }
      const copyTarget = resolveFileViewerCopyAssetsTarget('dev', options.copyAssets, {
        projectRoot: resolvedConfig?.root,
        publicDir: resolvedConfig?.publicDir || 'public',
        outDir: resolvedConfig?.build.outDir || 'dist'
      })
      const { targetRoot } = copyTarget
      const results = await copyRendererAssets(
        copyTarget,
        collectAssetRendererIds(
          selection,
          autoPresetIds,
          copyTarget.installedFullPackages.length > 0
        )
      )
      reportAssetCopy(results, targetRoot, missingMode)

      const viteBasePath = normalizeViteDevBasePath(resolvedConfig?.base || '/')
      if (server?.middlewares?.use) {
        const realTargetRoot = await realpath(targetRoot).catch(() => targetRoot)
        server.middlewares.use(async function fileViewerAssetMiddleware(request, response, next) {
          const requestUrl = request.url || ''
          const queryIndex = requestUrl.indexOf('?')
          const pathname = queryIndex >= 0 ? requestUrl.slice(0, queryIndex) : requestUrl
          const assetPath = resolveDevAssetRequestPath(
            targetRoot,
            copyTarget.baseDir,
            pathname,
            viteBasePath
          )
          if (assetPath) {
            try {
              const resolvedAssetPath = await realpath(assetPath)
              if (isPathWithin(realTargetRoot, resolvedAssetPath)) {
                const info = await stat(resolvedAssetPath)
                if (info.isFile()) {
                  const contentTypes: Record<string, string> = {
                    '.avif': 'image/avif',
                    '.bcmap': 'application/octet-stream',
                    '.css': 'text/css; charset=utf-8',
                    '.gif': 'image/gif',
                    '.ico': 'image/x-icon',
                    '.jpeg': 'image/jpeg',
                    '.jpg': 'image/jpeg',
                    '.js': 'text/javascript; charset=utf-8',
                    '.json': 'application/json; charset=utf-8',
                    '.map': 'application/json; charset=utf-8',
                    '.md': 'text/markdown; charset=utf-8',
                    '.mjs': 'text/javascript; charset=utf-8',
                    '.otf': 'font/otf',
                    '.pfb': 'application/x-font-type1',
                    '.png': 'image/png',
                    '.svg': 'image/svg+xml',
                    '.ttf': 'font/ttf',
                    '.txt': 'text/plain; charset=utf-8',
                    '.wasm': 'application/wasm',
                    '.webp': 'image/webp',
                    '.woff': 'font/woff',
                    '.woff2': 'font/woff2',
                    '.xml': 'application/xml; charset=utf-8'
                  }
                  response.statusCode = 200
                  response.setHeader(
                    'Content-Type',
                    contentTypes[extname(resolvedAssetPath).toLowerCase()] || 'application/octet-stream'
                  )
                  if (request.method === 'HEAD') {
                    response.end()
                  } else {
                    response.end(await readFile(resolvedAssetPath))
                  }
                  return
                }
              }
            } catch {
              // Let Vite return its normal 404/fallback response.
            }
          }
          next()
        })
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler() {
        if (options.inject === false || (!hasConfiguredRenderers() && !runtimeAssetBase)) {
          return undefined
        }
        return [
          {
            tag: 'script',
            attrs: { type: 'module', src: injectedModulePath },
            injectTo: 'head'
          }
        ]
      }
    },
    handleHotUpdate(context) {
      if (!options.scan || !resolvedConfig) {
        return undefined
      }
      const previous = requestedFormats.join(',')
      refreshSelection(resolvedConfig.root)
      if (requestedFormats.join(',') === previous) {
        return undefined
      }
      const modules = [
        context.server.moduleGraph.getModuleById(resolvedModuleId),
        context.server.moduleGraph.getModuleById(resolvedVirtualModuleId)
      ].filter(Boolean)
      modules.forEach((module) => {
        if (module) {
          context.server.moduleGraph.invalidateModule(module)
        }
      })
      context.server.ws.send({
        type: 'full-reload'
      })
      return []
    },
    async closeBundle() {
      if (!options.copyAssets || copyOptions(options.copyAssets).mode === 'dev') {
        return
      }
      const copyTarget = resolveFileViewerCopyAssetsTarget('build', options.copyAssets, {
        projectRoot: resolvedConfig?.root,
        publicDir: resolvedConfig?.publicDir || 'public',
        outDir: resolvedConfig?.build.outDir || 'dist'
      })
      const { targetRoot } = copyTarget
      const results = await copyRendererAssets(
        copyTarget,
        collectAssetRendererIds(
          selection,
          autoPresetIds,
          copyTarget.installedFullPackages.length > 0
        )
      )
      reportAssetCopy(results, targetRoot, missingMode)
    },
    resolveId(id, importer) {
      if (
        id === '@file-viewer/ppt' &&
        options.copyAssets &&
        installedFullPackages.length > 0 &&
        isPresentationRendererImporter(importer)
      ) {
        return resolvedPackagedPptFallbackModuleId
      }
      if (id === moduleId || id === virtualModuleId || id === injectedModulePath) {
        return id === virtualModuleId ? resolvedVirtualModuleId : resolvedModuleId
      }
      return undefined
    },
    load(id) {
      if (id === resolvedPackagedPptFallbackModuleId) {
        return `
export async function createPptViewer() {
  throw new Error('Packaged PPT runtime URL was not initialized.')
}
`
      }
      if (id === resolvedModuleId || id === resolvedVirtualModuleId) {
        return renderVirtualModule(
          selection,
          requestedFormats,
          autoPresetIds,
          runtimeAssetBase,
          installedFullPackages.length > 0
        )
      }
      return undefined
    }
  }
}

export function createFileViewerManualChunks(options: FileViewerRenderersPluginOptions = {}) {
  return createManualChunks(selectRenderers(options), resolveAutoPresetIds(options))
}

export function resolveFileViewerRendererSelection(
  options: FileViewerRenderersPluginOptions = {},
  projectRoot = process.cwd()
) {
  const scanFormats = collectFileViewerRendererScanTokens(projectRoot, options.scan)
  const requestedFormats = unique(
    [
      ...(options.formats || []),
      ...(options.renderers || []),
      ...scanFormats
    ].map(normalizeToken).filter(Boolean)
  )
  const selection = selectRenderers({
    ...options,
    formats: [...(options.formats || []), ...scanFormats]
  })
  const presetModule = selection.preset ? presetModules[selection.preset] : null
  const autoPresetIds = resolveAutoPresetIds(options)
  const autoPresetModules = autoPresetIds.map((presetId) => presetModules[presetId])
  const packages = collectSelectedPackages(selection, autoPresetIds)
  return {
    preset: selection.preset,
    presetPackage: presetModule?.packageName ?? null,
    autoPresets: autoPresetModules.map((preset) => preset.id),
    autoPresetPackages: autoPresetModules.map((preset) => preset.packageName),
    formats: requestedFormats,
    packages,
    rendererIds: unique([
      ...(presetModule ? expandDescriptorRendererIds(presetModule.rendererIds) : []),
      ...autoPresetModules.flatMap((preset) => expandDescriptorRendererIds(preset.rendererIds)),
      ...selection.descriptors.flatMap((descriptor) => descriptor.rendererIds)
    ]),
    renderers: selection.descriptors.map((descriptor) => ({
      id: descriptor.id,
      packageName: descriptor.packageName,
      formats: [...descriptor.formats],
      rendererIds: [...descriptor.rendererIds],
      chunkName: descriptor.chunkName
    })),
    missing: selection.missing
  }
}

export default fileViewerRenderers
