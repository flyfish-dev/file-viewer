import { DEFAULT_SUPPORTED_EXTENSIONS } from '@file-viewer/core'
import type { DemoBrandIconName } from '@/data/demoFileBrandIcons'

/**
 * Demo-only file identity and icon presentation.
 *
 * Renderer support remains authoritative in core. This module maps those
 * extensions to compact visual families/brands and supplies a professional
 * generic fallback for newly supported formats.
 */
export type DemoFileIconFamily =
  | 'word'
  | 'sheet'
  | 'slide'
  | 'pdf'
  | 'layout'
  | 'cad'
  | 'drawing'
  | 'model'
  | 'ebook'
  | 'archive'
  | 'email'
  | 'eda'
  | 'medical'
  | 'signature'
  | 'text'
  | 'code'
  | 'image'
  | 'audio'
  | 'video'
  | 'data'
  | 'generic'

export interface DemoFileIconMeta {
  readonly icon: string
  readonly family: DemoFileIconFamily
  readonly brand?: DemoBrandIconName
}

export interface DemoFileTypesApi {
  readonly fileIconMeta: Readonly<Record<string, DemoFileIconMeta>>
  extensionOf: (target: string) => string
  fileNameOf: (target: string) => string
  safeDecodeURIComponent: (value: string) => string
  getFileIconMeta: (target: string) => DemoFileIconMeta
}

export const COMPOUND_ARCHIVE_EXTENSIONS = ['tar.gz', 'tar.bz2', 'tar.xz', 'tar.zst'] as const

// Explicit metadata is reserved for formats that need a recognizable product
// family or branded icon. Core extensions absent here still receive a fallback.
const explicitFileIconMeta = {
  doc: { icon: 'W', family: 'word' },
  docx: { icon: 'W', family: 'word' },
  docm: { icon: 'W', family: 'word' },
  dot: { icon: 'DOT', family: 'word' },
  dotx: { icon: 'DOT', family: 'word' },
  dotm: { icon: 'DOT', family: 'word' },
  rtf: { icon: 'RTF', family: 'word' },
  odt: { icon: 'ODT', family: 'word' },
  xlsx: { icon: 'XL', family: 'sheet' },
  xltx: { icon: 'XLT', family: 'sheet' },
  xlsm: { icon: 'XL', family: 'sheet' },
  xlsb: { icon: 'XL', family: 'sheet' },
  xls: { icon: 'XL', family: 'sheet' },
  xlt: { icon: 'XLT', family: 'sheet' },
  xltm: { icon: 'XLT', family: 'sheet' },
  csv: { icon: 'CSV', family: 'sheet' },
  tsv: { icon: 'TSV', family: 'sheet' },
  ods: { icon: 'ODS', family: 'sheet' },
  fods: { icon: 'ODS', family: 'sheet' },
  xla: { icon: 'XLA', family: 'sheet' },
  xlam: { icon: 'XLAM', family: 'sheet' },
  dbf: { icon: 'DBF', family: 'sheet' },
  numbers: { icon: 'NO', family: 'sheet' },
  pages: { icon: 'PA', family: 'word' },
  wpd: { icon: 'WPD', family: 'word' },
  wp: { icon: 'WP', family: 'word' },
  wp5: { icon: 'WP5', family: 'word' },
  wp6: { icon: 'WP6', family: 'word' },
  hwp: { icon: 'HWP', family: 'word' },
  hwpx: { icon: 'HWPX', family: 'word' },
  ppt: { icon: 'P', family: 'slide' },
  pot: { icon: 'POT', family: 'slide' },
  key: { icon: 'KEY', family: 'slide' },
  pptx: { icon: 'P', family: 'slide' },
  pptm: { icon: 'P', family: 'slide' },
  potx: { icon: 'POT', family: 'slide' },
  potm: { icon: 'POT', family: 'slide' },
  ppsx: { icon: 'PPS', family: 'slide' },
  ppsm: { icon: 'PPS', family: 'slide' },
  odp: { icon: 'ODP', family: 'slide' },
  pdf: { icon: 'PDF', family: 'pdf' },
  ofd: { icon: 'OFD', family: 'layout' },
  typ: { icon: 'TYP', family: 'layout' },
  typst: { icon: 'TYP', family: 'layout' },
  dxf: { icon: 'CAD', family: 'cad' },
  dwg: { icon: 'CAD', family: 'cad' },
  dwf: { icon: 'DWF', family: 'cad' },
  dwfx: { icon: 'DWFx', family: 'cad' },
  xps: { icon: 'XPS', family: 'cad' },
  xmind: { icon: 'XM', family: 'drawing' },
  mermaid: { icon: 'MER', family: 'drawing' },
  mmd: { icon: 'MER', family: 'drawing' },
  plantuml: { icon: 'UML', family: 'drawing' },
  puml: { icon: 'UML', family: 'drawing' },
  glb: { icon: '3D', family: 'model' },
  gltf: { icon: '3D', family: 'model' },
  obj: { icon: 'OBJ', family: 'model' },
  stl: { icon: 'STL', family: 'model' },
  ply: { icon: 'PLY', family: 'model' },
  fbx: { icon: 'FBX', family: 'model' },
  dae: { icon: 'DAE', family: 'model' },
  '3ds': { icon: '3DS', family: 'model' },
  '3mf': { icon: '3MF', family: 'model' },
  amf: { icon: 'AMF', family: 'model' },
  usd: { icon: 'USD', family: 'model' },
  usda: { icon: 'USD', family: 'model' },
  usdc: { icon: 'USD', family: 'model' },
  usdz: { icon: 'USD', family: 'model' },
  kmz: { icon: 'KMZ', family: 'model' },
  geojson: { icon: 'GEO', family: 'model' },
  kml: { icon: 'KML', family: 'model' },
  gpx: { icon: 'GPX', family: 'model' },
  shp: { icon: 'SHP', family: 'model' },
  step: { icon: 'STEP', family: 'model' },
  stp: { icon: 'STEP', family: 'model' },
  iges: { icon: 'IGES', family: 'model' },
  igs: { icon: 'IGES', family: 'model' },
  ifc: { icon: 'IFC', family: 'model' },
  '3dm': { icon: '3DM', family: 'model' },
  brep: { icon: 'BREP', family: 'model' },
  pcd: { icon: 'PCD', family: 'model' },
  wrl: { icon: 'WRL', family: 'model' },
  vrml: { icon: 'VRML', family: 'model' },
  xyz: { icon: 'XYZ', family: 'model' },
  vtk: { icon: 'VTK', family: 'model' },
  vtp: { icon: 'VTP', family: 'model' },
  excalidraw: { icon: 'EX', family: 'drawing' },
  drawio: { icon: 'DIO', family: 'drawing' },
  dio: { icon: 'DIO', family: 'drawing' },
  epub: { icon: 'EPUB', family: 'ebook' },
  fb2: { icon: 'FB2', family: 'ebook' },
  umd: { icon: 'UMD', family: 'ebook' },
  chm: { icon: 'CHM', family: 'ebook' },
  zip: { icon: 'ZIP', family: 'archive' },
  zipx: { icon: 'ZIP', family: 'archive' },
  '7z': { icon: '7Z', family: 'archive' },
  rar: { icon: 'RAR', family: 'archive' },
  tar: { icon: 'TAR', family: 'archive' },
  gz: { icon: 'GZ', family: 'archive' },
  gzip: { icon: 'GZ', family: 'archive' },
  tgz: { icon: 'TGZ', family: 'archive' },
  bz2: { icon: 'BZ2', family: 'archive' },
  bzip2: { icon: 'BZ2', family: 'archive' },
  tbz: { icon: 'TBZ', family: 'archive' },
  tbz2: { icon: 'TBZ', family: 'archive' },
  xz: { icon: 'XZ', family: 'archive' },
  txz: { icon: 'TXZ', family: 'archive' },
  lzma: { icon: 'LZ', family: 'archive' },
  zst: { icon: 'ZST', family: 'archive' },
  tzst: { icon: 'ZST', family: 'archive' },
  cab: { icon: 'CAB', family: 'archive' },
  ar: { icon: 'AR', family: 'archive' },
  cpio: { icon: 'CPIO', family: 'archive' },
  iso: { icon: 'ISO', family: 'archive' },
  xar: { icon: 'XAR', family: 'archive' },
  lha: { icon: 'LHA', family: 'archive' },
  lzh: { icon: 'LZH', family: 'archive' },
  jar: { icon: 'JAR', family: 'archive' },
  war: { icon: 'WAR', family: 'archive' },
  ear: { icon: 'EAR', family: 'archive' },
  apk: { icon: 'APK', family: 'archive' },
  cbz: { icon: 'CBZ', family: 'archive' },
  cbr: { icon: 'CBR', family: 'archive' },
  'tar.gz': { icon: 'TGZ', family: 'archive' },
  'tar.bz2': { icon: 'TBZ', family: 'archive' },
  'tar.xz': { icon: 'TXZ', family: 'archive' },
  'tar.zst': { icon: 'TZST', family: 'archive' },
  eml: { icon: 'EML', family: 'email' },
  msg: { icon: 'MSG', family: 'email' },
  mbox: { icon: 'MBOX', family: 'email' },
  dcm: { icon: 'DCM', family: 'medical' },
  dicom: { icon: 'DICOM', family: 'medical' },
  p7m: { icon: 'P7M', family: 'signature' },
  p7s: { icon: 'P7S', family: 'signature' },
  p7c: { icon: 'P7C', family: 'signature' },
  p7b: { icon: 'P7B', family: 'signature' },
  pkcs7: { icon: 'PKCS7', family: 'signature' },
  cms: { icon: 'CMS', family: 'signature' },
  cmsc: { icon: 'CMS', family: 'signature' },
  tsd: { icon: 'TSD', family: 'signature' },
  tst: { icon: 'TST', family: 'signature' },
  tsq: { icon: 'TSQ', family: 'signature' },
  tsr: { icon: 'TSR', family: 'signature' },
  asics: { icon: 'ASiC', family: 'signature' },
  scs: { icon: 'ASiC', family: 'signature' },
  asice: { icon: 'ASiC', family: 'signature' },
  sce: { icon: 'ASiC', family: 'signature' },
  ers: { icon: 'ERS', family: 'signature' },
  asc: { icon: 'ASC', family: 'signature' },
  sig: { icon: 'SIG', family: 'signature' },
  pgp: { icon: 'PGP', family: 'signature' },
  gpg: { icon: 'GPG', family: 'signature' },
  jws: { icon: 'JWS', family: 'signature' },
  olb: { icon: 'OLB', family: 'eda' },
  dra: { icon: 'DRA', family: 'eda' },
  gds: { icon: 'GDS', family: 'eda' },
  oas: { icon: 'OAS', family: 'eda' },
  oasis: { icon: 'OAS', family: 'eda' },
  md: { icon: 'MD', family: 'text' },
  markdown: { icon: 'MD', family: 'text' },
  txt: { icon: 'TXT', family: 'text' },
  json: { icon: '{}', family: 'code' },
  jsonc: { icon: '{}', family: 'code' },
  json5: { icon: 'J5', family: 'code' },
  ipynb: { icon: 'NB', family: 'code' },
  js: { icon: 'JS', family: 'code' },
  mjs: { icon: 'JS', family: 'code' },
  cjs: { icon: 'JS', family: 'code' },
  ts: { icon: 'TS', family: 'code' },
  tsx: { icon: 'TSX', family: 'code' },
  jsx: { icon: 'JSX', family: 'code' },
  css: { icon: 'CSS', family: 'code' },
  html: { icon: 'HTML', family: 'code' },
  htm: { icon: 'HTML', family: 'code' },
  xml: { icon: 'XML', family: 'code' },
  vue: { icon: 'VUE', family: 'code' },
  react: { icon: 'RE', family: 'code' },
  yaml: { icon: 'YML', family: 'code' },
  yml: { icon: 'YML', family: 'code' },
  toml: { icon: 'TOML', family: 'code' },
  ini: { icon: 'INI', family: 'code' },
  proto: { icon: 'PB', family: 'code' },
  hcl: { icon: 'HCL', family: 'code' },
  tex: { icon: 'TEX', family: 'code' },
  gv: { icon: 'GV', family: 'code' },
  http: { icon: 'HTTP', family: 'code' },
  sh: { icon: 'SH', family: 'code' },
  bash: { icon: 'SH', family: 'code' },
  sql: { icon: 'SQL', family: 'code' },
  go: { icon: 'GO', family: 'code' },
  rs: { icon: 'RS', family: 'code' },
  php: { icon: 'PHP', family: 'code' },
  c: { icon: 'C', family: 'code' },
  cpp: { icon: 'C++', family: 'code' },
  cc: { icon: 'C++', family: 'code' },
  h: { icon: 'H', family: 'code' },
  hpp: { icon: 'H++', family: 'code' },
  cs: { icon: 'CS', family: 'code' },
  diff: { icon: 'DIFF', family: 'code' },
  patch: { icon: 'PATCH', family: 'code' },
  bundle: { icon: 'GIT', family: 'code' },
  bdl: { icon: 'GIT', family: 'code' },
  java: { icon: 'JV', family: 'code' },
  py: { icon: 'PY', family: 'code' },
  rb: { icon: 'RB', family: 'code' },
  swift: { icon: 'SW', family: 'code' },
  kt: { icon: 'KT', family: 'code' },
  log: { icon: 'LOG', family: 'text' },
  png: { icon: 'IMG', family: 'image' },
  jpg: { icon: 'IMG', family: 'image' },
  jpeg: { icon: 'IMG', family: 'image' },
  gif: { icon: 'GIF', family: 'image' },
  bmp: { icon: 'IMG', family: 'image' },
  tiff: { icon: 'IMG', family: 'image' },
  tif: { icon: 'IMG', family: 'image' },
  svg: { icon: 'SVG', family: 'image' },
  webp: { icon: 'WEBP', family: 'image' },
  avif: { icon: 'AVIF', family: 'image' },
  ico: { icon: 'ICO', family: 'image' },
  heic: { icon: 'HEIC', family: 'image' },
  heif: { icon: 'HEIF', family: 'image' },
  jxl: { icon: 'JXL', family: 'image' },
  mp3: { icon: 'MP3', family: 'audio' },
  mpeg: { icon: 'MP3', family: 'audio' },
  wav: { icon: 'WAV', family: 'audio' },
  ogg: { icon: 'OGG', family: 'audio' },
  oga: { icon: 'OGG', family: 'audio' },
  opus: { icon: 'OPUS', family: 'audio' },
  m4a: { icon: 'M4A', family: 'audio' },
  aac: { icon: 'AAC', family: 'audio' },
  flac: { icon: 'FLAC', family: 'audio' },
  weba: { icon: 'WEBA', family: 'audio' },
  midi: { icon: 'MIDI', family: 'audio' },
  mid: { icon: 'MIDI', family: 'audio' },
  mp4: { icon: 'MP4', family: 'video' },
  webm: { icon: 'WEBM', family: 'video' },
  m3u8: { icon: 'HLS', family: 'video' },
  ttf: { icon: 'FONT', family: 'data' },
  otf: { icon: 'FONT', family: 'data' },
  woff: { icon: 'FONT', family: 'data' },
  woff2: { icon: 'FONT', family: 'data' },
  psd: { icon: 'PSD', family: 'data' },
  ai: { icon: 'AI', family: 'data' },
  eps: { icon: 'EPS', family: 'data' },
  sqlite: { icon: 'SQL', family: 'data' },
  wasm: { icon: 'WASM', family: 'data' },
  parquet: { icon: 'PARQ', family: 'data' },
  avro: { icon: 'AVRO', family: 'data' },
  webarchive: { icon: 'WEB', family: 'data' }
} satisfies Readonly<Record<string, DemoFileIconMeta>>

const brandIconByExtension = {
  doc: 'microsoft-word',
  docx: 'microsoft-word',
  docm: 'microsoft-word',
  dot: 'microsoft-word',
  dotx: 'microsoft-word',
  dotm: 'microsoft-word',
  xls: 'microsoft-excel',
  xlsx: 'microsoft-excel',
  xlsm: 'microsoft-excel',
  xlsb: 'microsoft-excel',
  xlt: 'microsoft-excel',
  xltx: 'microsoft-excel',
  xltm: 'microsoft-excel',
  ppt: 'microsoft-powerpoint',
  pptx: 'microsoft-powerpoint',
  pptm: 'microsoft-powerpoint',
  potx: 'microsoft-powerpoint',
  potm: 'microsoft-powerpoint',
  ppsx: 'microsoft-powerpoint',
  ppsm: 'microsoft-powerpoint',
  pdf: 'adobe-acrobat',
  odt: 'libreoffice-writer',
  ods: 'libreoffice-calc',
  fods: 'libreoffice-calc',
  odp: 'libreoffice-impress',
  dxf: 'autocad',
  dwg: 'autocad',
  dwf: 'autocad',
  dwfx: 'autocad',
  typ: 'typst',
  typst: 'typst',
  mermaid: 'mermaid',
  mmd: 'mermaid',
  excalidraw: 'excalidraw',
  drawio: 'diagrams-dot-net',
  dio: 'diagrams-dot-net',
  md: 'markdown',
  markdown: 'markdown',
  html: 'html5',
  htm: 'html5',
  css: 'css3',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  jsx: 'react',
  react: 'react',
  vue: 'vue',
  py: 'python',
  go: 'go',
  rs: 'rust',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  bundle: 'git',
  bdl: 'git',
  wasm: 'webassembly',
  psd: 'adobe-photoshop',
  ai: 'adobe-illustrator',
  apk: 'android',
  '3dm': 'rhinoceros'
} as const satisfies Readonly<Record<string, DemoBrandIconName>>

const withBrandIcon = (extension: string, meta: DemoFileIconMeta): DemoFileIconMeta => {
  const brand = brandIconByExtension[extension as keyof typeof brandIconByExtension]
  return brand ? { ...meta, brand } : meta
}

const explicitFileIconMetaWithBrands = Object.fromEntries(
  Object.entries(explicitFileIconMeta).map(([extension, meta]) => [
    extension,
    withBrandIcon(extension, meta)
  ])
) as Record<string, DemoFileIconMeta>

const genericIconMeta = (extension = ''): DemoFileIconMeta => ({
  icon: extension ? extension.toUpperCase().slice(0, 5) : 'FILE',
  family: 'generic'
})

const coreFileIconMeta = DEFAULT_SUPPORTED_EXTENSIONS.reduce<Record<string, DemoFileIconMeta>>(
  (result, extension) => {
    const normalizedExtension = extension.toLowerCase()
    result[normalizedExtension] =
      explicitFileIconMetaWithBrands[normalizedExtension] ?? genericIconMeta(normalizedExtension)
    return result
  },
  {}
)

// Merge core coverage first and explicit presentation last, ensuring known
// formats never regress to the generic icon when core adds new extensions.
export const fileIconMeta: Readonly<Record<string, DemoFileIconMeta>> = Object.freeze({
  ...coreFileIconMeta,
  ...explicitFileIconMetaWithBrands
})

const withoutQueryOrHash = (target: string) => target.split(/[?#]/, 1)[0] || target

export const safeDecodeURIComponent = (value: string) => {
  // Malformed customer URLs must still display and remain selectable.
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export const fileNameOf = (target: string) => {
  if (!target) {
    return ''
  }
  const clean = withoutQueryOrHash(target).replace(/\\/g, '/')
  const rawFileName = clean.slice(clean.lastIndexOf('/') + 1) || clean
  return safeDecodeURIComponent(rawFileName)
}

export const extensionOf = (target: string) => {
  // Compound archives must be checked before the ordinary last-suffix rule.
  const fileName = fileNameOf(target).toLowerCase()
  for (const compoundExtension of COMPOUND_ARCHIVE_EXTENSIONS) {
    if (fileName.endsWith(`.${compoundExtension}`)) {
      return compoundExtension
    }
  }
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex === -1 ? '' : fileName.slice(dotIndex + 1)
}

export const getFileIconMeta = (target: string): DemoFileIconMeta => {
  const extension = extensionOf(target)
  return fileIconMeta[extension] ?? genericIconMeta(extension)
}

const demoFileTypesApi: DemoFileTypesApi = Object.freeze({
  fileIconMeta,
  extensionOf,
  fileNameOf,
  safeDecodeURIComponent,
  getFileIconMeta
})

// Stateless helpers are shared as one frozen object; this composable does not
// create per-component reactive state.
export const useDemoFileTypes = (): DemoFileTypesApi => demoFileTypesApi
