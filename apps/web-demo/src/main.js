import { mountViewer } from '@file-viewer/web'
import { FILE_VIEWER_LOCALE_OPTIONS, normalizeFileViewerLocale, createFileViewerTranslator } from '@file-viewer/core'
import { webCopyTw, webCopyHk, webCopyRu } from './copy.extra'
import { allRenderers } from '@file-viewer/preset-all'
import {
  DEFAULT_FILE_VIEWER_ARCHIVE_WASM_PATH,
  DEFAULT_FILE_VIEWER_ARCHIVE_WORKER_PATH,
  DEFAULT_FILE_VIEWER_CAD_DWF_WASM_PATH,
  DEFAULT_FILE_VIEWER_CAD_WASM_PATH,
  DEFAULT_FILE_VIEWER_CAD_WORKER_PATH,
  DEFAULT_FILE_VIEWER_DATA_SQL_WASM_URL,
  DEFAULT_FILE_VIEWER_DOCX_WORKER_JSZIP_PATH,
  DEFAULT_FILE_VIEWER_DOCX_WORKER_PATH,
  DEFAULT_FILE_VIEWER_DRAWIO_VIEWER_SCRIPT_PATH,
  DEFAULT_FILE_VIEWER_PDF_CMAP_PATH,
  DEFAULT_FILE_VIEWER_PDF_STANDARD_FONT_PATH,
  DEFAULT_FILE_VIEWER_PDF_WASM_PATH,
  DEFAULT_FILE_VIEWER_PDF_WORKER_PATH,
  DEFAULT_FILE_VIEWER_PRESENTATION_WORKER_PATH,
  DEFAULT_FILE_VIEWER_SPREADSHEET_WORKER_PATH,
  DEFAULT_FILE_VIEWER_TYPST_COMPILER_WASM_URL,
  DEFAULT_FILE_VIEWER_TYPST_FONT_ASSETS_URL,
  DEFAULT_FILE_VIEWER_TYPST_RENDERER_WASM_URL
} from '@file-viewer/core/assets'
import { sampleGroupsByLocale } from '../../viewer-demo/src/data/demoSamples'
import './style.css'

const copy = {
  'zh-TW': webCopyTw,
  'zh-HK': webCopyHk,
  'ru-RU': webCopyRu,
  'zh-CN': {
    subtitle: '基于 @file-viewer/web 的完整原生接入 Demo',
    urlMode: '链接',
    fileMode: '本地',
    urlLabel: '文件地址',
    open: '预览',
    chooseFile: '选择本地文件',
    dropHint: '支持拖拽或点击上传',
    quick: '快速试用',
    samples: '示例文件',
    collapse: '收起',
    expand: '展开',
    snippet: '接入代码',
    copyCode: '复制',
    copied: '已复制',
    search: '搜索',
    searchPlaceholder: '搜索当前文档',
    watermark: '水印',
    download: '下载',
    print: '打印',
    html: 'HTML',
    ready: '就绪',
    loading: '加载中',
    localFile: '本地文件',
    noFile: '未选择文件'
  },
  'en-US': {
    subtitle: 'Complete native demo powered by @file-viewer/web',
    urlMode: 'URL',
    fileMode: 'Local',
    urlLabel: 'File URL',
    open: 'Preview',
    chooseFile: 'Choose a local file',
    dropHint: 'Drag a file here or click to upload',
    quick: 'Quick samples',
    samples: 'Sample files',
    collapse: 'Collapse',
    expand: 'Expand',
    snippet: 'Integration code',
    copyCode: 'Copy',
    copied: 'Copied',
    search: 'Search',
    searchPlaceholder: 'Search this document',
    watermark: 'Watermark',
    download: 'Download',
    print: 'Print',
    html: 'HTML',
    ready: 'Ready',
    loading: 'Loading',
    localFile: 'Local file',
    noFile: 'No file selected'
  },
  'ja-JP': {
    subtitle: '@file-viewer/web による完全なネイティブ組み込み Demo',
    urlMode: 'リンク',
    fileMode: 'ローカル',
    urlLabel: 'ファイル URL',
    open: 'プレビュー',
    chooseFile: 'ローカルファイルを選択',
    dropHint: 'ドラッグ＆ドロップまたはクリックしてアップロード',
    quick: 'クイックサンプル',
    samples: 'サンプルファイル',
    collapse: '折りたたむ',
    expand: '展開',
    snippet: '組み込みコード',
    copyCode: 'コピー',
    copied: 'コピーしました',
    search: '検索',
    searchPlaceholder: '現在の文書を検索',
    watermark: '透かし',
    download: 'ダウンロード',
    print: '印刷',
    html: 'HTML',
    ready: '準備完了',
    loading: '読み込み中',
    localFile: 'ローカルファイル',
    noFile: 'ファイルが選択されていません'
  },
  'de-DE': {
    subtitle: 'Vollständige native Demo mit @file-viewer/web',
    urlMode: 'URL',
    fileMode: 'Lokal',
    urlLabel: 'Datei-URL',
    open: 'Vorschau',
    chooseFile: 'Lokale Datei auswählen',
    dropHint: 'Datei hierher ziehen oder zum Hochladen klicken',
    quick: 'Schnellbeispiele',
    samples: 'Beispieldateien',
    collapse: 'Einklappen',
    expand: 'Ausklappen',
    snippet: 'Integrationscode',
    copyCode: 'Kopieren',
    copied: 'Kopiert',
    search: 'Suchen',
    searchPlaceholder: 'Dieses Dokument durchsuchen',
    watermark: 'Wasserzeichen',
    download: 'Herunterladen',
    print: 'Drucken',
    html: 'HTML',
    ready: 'Bereit',
    loading: 'Wird geladen',
    localFile: 'Lokale Datei',
    noFile: 'Keine Datei ausgewählt'
  }
}

const defaultUrlByLocale = {
  'zh-TW': '/example/word.docx',
  'zh-HK': '/example/word.docx',
  'ru-RU': '/example/en/calibre-demo.docx',
  'zh-CN': '/example/word.docx',
  'en-US': '/example/en/calibre-demo.docx',
  'ja-JP': '/example/en/calibre-demo.docx',
  'de-DE': '/example/en/calibre-demo.docx'
}

const sampleGroups = sampleGroupsByLocale['zh-CN']
const quickFamilies = ['word', 'sheet', 'slide', 'cad', 'archive', 'email']
const scenarios = Object.fromEntries(FILE_VIEWER_LOCALE_OPTIONS.map(({ value }) => [
  value, quickFamilies.flatMap(family => {
    const group = sampleGroupsByLocale[value].find(group => group.family === family)
    const item = group?.items[0]
    return item ? [[item.name, group.description, item.url, family]] : []
  })
]))
const watermarkText = {
  'zh-CN': '内部资料', 'en-US': 'Internal', 'ja-JP': '社内資料',
  'zh-TW': '內部資料', 'zh-HK': '內部資料', 'de-DE': 'Intern', 'ru-RU': 'Для внутреннего использования'
}

const iconMeta = {
  doc: ['W', 'word'],
  docx: ['W', 'word'],
  dot: ['DOT', 'word'],
  rtf: ['RTF', 'word'],
  odt: ['ODT', 'word'],
  xlsx: ['XL', 'sheet'],
  xlsm: ['XL', 'sheet'],
  xlsb: ['XL', 'sheet'],
  xls: ['XL', 'sheet'],
  csv: ['CSV', 'sheet'],
  ods: ['ODS', 'sheet'],
  fods: ['ODS', 'sheet'],
  numbers: ['NO', 'sheet'],
  pptx: ['P', 'slide'],
  odp: ['ODP', 'slide'],
  pdf: ['PDF', 'pdf'],
  ofd: ['OFD', 'layout'],
  typ: ['TYP', 'layout'],
  dxf: ['CAD', 'cad'],
  dwg: ['CAD', 'cad'],
  dwf: ['DWF', 'cad'],
  dwfx: ['DWFx', 'cad'],
  xmind: ['XM', 'drawing'],
  mermaid: ['MER', 'drawing'],
  plantuml: ['UML', 'drawing'],
  excalidraw: ['EX', 'drawing'],
  drawio: ['DIO', 'drawing'],
  gltf: ['3D', 'model'],
  obj: ['OBJ', 'model'],
  stl: ['STL', 'model'],
  ply: ['PLY', 'model'],
  step: ['STEP', 'model'],
  geojson: ['GEO', 'model'],
  kml: ['KML', 'model'],
  gpx: ['GPX', 'model'],
  epub: ['EPUB', 'ebook'],
  umd: ['UMD', 'ebook'],
  zip: ['ZIP', 'archive'],
  gz: ['GZ', 'archive'],
  eml: ['EML', 'email'],
  msg: ['MSG', 'email'],
  mbox: ['MBOX', 'email'],
  olb: ['OLB', 'eda'],
  dra: ['DRA', 'eda'],
  gds: ['GDS', 'eda'],
  oas: ['OAS', 'eda'],
  oasis: ['OAS', 'eda'],
  md: ['MD', 'text'],
  markdown: ['MD', 'text'],
  txt: ['TXT', 'text'],
  log: ['LOG', 'text'],
  patch: ['PATCH', 'code'],
  diff: ['DIFF', 'code'],
  bundle: ['GIT', 'code'],
  png: ['IMG', 'image'],
  jpg: ['IMG', 'image'],
  jpeg: ['IMG', 'image'],
  gif: ['GIF', 'image'],
  svg: ['SVG', 'image'],
  webp: ['WEBP', 'image'],
  mp3: ['MP3', 'audio'],
  ogg: ['OGG', 'audio'],
  mid: ['MIDI', 'audio'],
  mp4: ['MP4', 'video'],
  psd: ['PSD', 'data'],
  sqlite: ['SQL', 'data'],
  wasm: ['WASM', 'data'],
  ico: ['ICO', 'image']
}

const $ = id => document.getElementById(id)

const els = {
  subtitle: $('subtitle'),
  localeSelect: $('locale-select'),
  snippetToggle: $('snippet-toggle'),
  modeUrl: $('mode-url'),
  modeFile: $('mode-file'),
  urlForm: $('url-form'),
  urlInput: $('url-input'),
  openUrl: $('open-url'),
  fileDrop: $('file-drop'),
  fileInput: $('file-input'),
  fileDropTitle: $('file-drop-title'),
  fileDropSubtitle: $('file-drop-subtitle'),
  quickTitle: $('quick-title'),
  scenarioGrid: $('scenario-grid'),
  sampleTitle: $('sample-title'),
  collapseSamples: $('collapse-samples'),
  sampleGroups: $('sample-groups'),
  activeType: $('active-type'),
  snippetPanel: $('snippet-panel'),
  snippetTitle: $('snippet-title'),
  snippetCopy: $('snippet-copy'),
  snippetCode: $('snippet-code'),
  displayName: $('display-name'),
  displayPath: $('display-path'),
  fileBadge: $('file-badge'),
  viewer: $('viewer'),
  zoomOut: $('zoom-out'),
  zoomLabel: $('zoom-label'),
  zoomIn: $('zoom-in'),
  searchToggle: $('search-toggle'),
  watermarkToggle: $('watermark-toggle'),
  download: $('download-action'),
  print: $('print-action'),
  html: $('html-action'),
  searchPopover: $('search-popover'),
  searchInput: $('search-input'),
  searchSubmit: $('search-submit'),
  searchPrev: $('search-prev'),
  searchNext: $('search-next'),
  searchClear: $('search-clear'),
  searchCount: $('search-count')
}

const normalizeLocale = value => normalizeFileViewerLocale(value || 'auto')
const readLocalePreference = () => {
  try { return localStorage.getItem('file-viewer-web-demo-locale') } catch { return null }
}
const params = new URLSearchParams(window.location.search)
const explicitLocale = params.get('locale') || params.get('lang') || readLocalePreference()
let automaticLocale = !explicitLocale || explicitLocale === 'auto'
const initialLocale = normalizeLocale(explicitLocale)

const state = {
  locale: initialLocale,
  mode: 'url',
  url: params.get('url') || defaultUrlByLocale[initialLocale],
  file: null,
  fileName: '',
  loading: false,
  watermark: params.get('watermark') === '1',
  sampleCollapsed: false,
  openGroup: 0,
  searchOpen: false,
  snippetOpen: false,
  availability: {
    download: false,
    print: false,
    exportHtml: false,
    zoom: false,
    zoomIn: false,
    zoomOut: false,
    zoomReset: false
  },
  zoom: {
    label: '100%',
    canZoomIn: false,
    canZoomOut: false,
    canReset: false
  },
  search: {
    query: '',
    total: 0,
    currentIndex: -1
  }
}

let controller = null
let copyResetTimer = 0

function text(key) {
  return copy[state.locale][key]
}

function extensionOf(target) {
  const clean = String(target || '').split(/[?#]/)[0]
  const name = clean.split('/').pop() || clean
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

function fileNameOf(target) {
  const clean = String(target || '').split(/[?#]/)[0]
  return decodeURIComponent(clean.split('/').pop() || clean)
}

function itemForLocale(item) {
  for (const group of sampleGroupsByLocale[state.locale]) {
    const translated = group.items.find(candidate => candidate.url === item.url)
    if (translated) return translated
  }
  return item
}

function sampleKey(url) {
  try {
    return decodeURIComponent(new URL(url, window.location.origin).pathname)
  } catch {
    return url
  }
}

function isSameUrl(left, right) {
  return sampleKey(left) === sampleKey(right)
}

function getIcon(target) {
  const [label, family] = iconMeta[extensionOf(target)] || ['FILE', 'generic']
  return { label, family }
}

function activeSample() {
  const current = state.file ? '' : state.url
  for (const group of sampleGroups) {
    for (const raw of group.items) {
      const item = itemForLocale(raw)
      if (isSameUrl(item.url, current)) {
        return item
      }
    }
  }
  return null
}

function activeGroupIndex() {
  const current = state.file ? '' : state.url
  const index = sampleGroups.findIndex(group =>
    group.items.some(raw => isSameUrl(itemForLocale(raw).url, current))
  )
  return index === -1 ? 0 : index
}

function asset(path) {
  return `/file-viewer/${path}`
}

function viewerOptions() {
  return {
    preset: allRenderers,
    rendererMode: 'replace',
    theme: 'light',
    toolbar: false,
    locale: state.locale,
    watermark: state.watermark
      ? {
          text: watermarkText[state.locale],
          opacity: 0.16,
          rotate: -24,
          color: '#1f7a58'
        }
      : false,
    search: {
      maxMatches: 1000,
      caseSensitive: false
    },
    ai: {
      collectText: true,
      chunkSize: 1200,
      chunkOverlap: 160
    },
    archive: {
      cache: true,
      workerTimeoutMs: 60000,
      maxArchiveSize: 320 * 1024 * 1024,
      maxEntryPreviewSize: 64 * 1024 * 1024,
      workerUrl: asset(DEFAULT_FILE_VIEWER_ARCHIVE_WORKER_PATH),
      wasmUrl: asset(DEFAULT_FILE_VIEWER_ARCHIVE_WASM_PATH)
    },
    cad: {
      wasmPath: asset(DEFAULT_FILE_VIEWER_CAD_WASM_PATH),
      workerUrl: asset(DEFAULT_FILE_VIEWER_CAD_WORKER_PATH),
      dwfWasmUrl: asset(DEFAULT_FILE_VIEWER_CAD_DWF_WASM_PATH)
    },
    data: {
      sqlWasmUrl: asset(DEFAULT_FILE_VIEWER_DATA_SQL_WASM_URL)
    },
    docx: {
      workerUrl: asset(DEFAULT_FILE_VIEWER_DOCX_WORKER_PATH),
      workerJsZipUrl: asset(DEFAULT_FILE_VIEWER_DOCX_WORKER_JSZIP_PATH)
    },
    drawing: {
      viewerScriptUrl: asset(DEFAULT_FILE_VIEWER_DRAWIO_VIEWER_SCRIPT_PATH)
    },
    pdf: {
      toolbar: true,
      streaming: 'same-origin',
      rangeChunkSize: 64 * 1024,
      workerUrl: asset(DEFAULT_FILE_VIEWER_PDF_WORKER_PATH),
      cMapUrl: asset(DEFAULT_FILE_VIEWER_PDF_CMAP_PATH),
      wasmUrl: asset(DEFAULT_FILE_VIEWER_PDF_WASM_PATH),
      standardFontDataUrl: asset(DEFAULT_FILE_VIEWER_PDF_STANDARD_FONT_PATH)
    },
    presentation: {
      workerUrl: asset(DEFAULT_FILE_VIEWER_PRESENTATION_WORKER_PATH)
    },
    spreadsheet: {
      worker: 'auto',
      workerUrl: asset(DEFAULT_FILE_VIEWER_SPREADSHEET_WORKER_PATH),
      resizableColumns: true,
      resizableRows: true
    },
    typst: {
      compilerWasmUrl: asset(DEFAULT_FILE_VIEWER_TYPST_COMPILER_WASM_URL),
      rendererWasmUrl: asset(DEFAULT_FILE_VIEWER_TYPST_RENDERER_WASM_URL),
      fontAssetsUrl: asset(DEFAULT_FILE_VIEWER_TYPST_FONT_ASSETS_URL)
    }
  }
}

function mountOptions() {
  const options = {
    name: state.file ? state.fileName : fileNameOf(state.url),
    options: viewerOptions(),
    onEvent: handleViewerEvent,
    onStateChange: handleViewerState
  }
  if (state.file) {
    options.file = state.file
  } else {
    options.url = state.url
  }
  return options
}

function updateSnippet() {
  const sourceLine = state.file
    ? `file: selectedFile,\n  name: selectedFile.name,`
    : `url: '${state.url}',\n  name: '${fileNameOf(state.url)}',`
  els.snippetCode.textContent = `import { mountViewer } from '@file-viewer/web'
import { allRenderers } from '@file-viewer/preset-all'

const controller = mountViewer(document.getElementById('viewer'), {
  ${sourceLine}
  options: {
    preset: allRenderers,
    toolbar: false,
    theme: 'light',
    locale: '${state.locale}',
    watermark: {
      text: '${watermarkText[state.locale]}',
      opacity: 0.16,
      rotate: -24,
      color: '#1f7a58'
    },
    search: {
      maxMatches: 1000,
      caseSensitive: false
    }
  }
})`
}

function updateLabels() {
  const t = createFileViewerTranslator({ locale: state.locale })
  for (const [id, key] of [
    ['zoom-out', 'toolbar.zoomOut'], ['zoom-in', 'toolbar.zoomIn'], ['zoom-label', 'toolbar.zoomReset'],
    ['search-prev', 'toolbar.searchPrevious'], ['search-next', 'toolbar.searchNext'], ['search-clear', 'toolbar.searchClear']
  ]) {
    const button = document.getElementById(id)
    button.title = t(key)
    button.setAttribute('aria-label', t(key))
  }
  document.querySelector('.mode-tabs').setAttribute('aria-label', `${text('urlMode')} / ${text('fileMode')}`)
  document.documentElement.lang = state.locale
  document.title = `File Viewer · ${text('subtitle')}`
  els.subtitle.textContent = text('subtitle')
  els.modeUrl.textContent = text('urlMode')
  els.modeFile.textContent = text('fileMode')
  document.querySelector('label[for="url-input"]').textContent = text('urlLabel')
  els.openUrl.textContent = text('open')
  els.fileDropTitle.textContent = text('chooseFile')
  els.fileDropSubtitle.textContent = text('dropHint')
  els.quickTitle.textContent = text('quick')
  els.sampleTitle.textContent = text('samples')
  els.collapseSamples.textContent = state.sampleCollapsed ? text('expand') : text('collapse')
  els.snippetToggle.textContent = text('snippet')
  els.snippetTitle.textContent = text('snippet')
  els.snippetCopy.textContent = text('copyCode')
  els.searchToggle.textContent = text('search')
  els.searchInput.placeholder = text('searchPlaceholder')
  els.searchSubmit.textContent = text('search')
  els.watermarkToggle.textContent = text('watermark')
  els.download.textContent = text('download')
  els.print.textContent = text('print')
  els.html.textContent = text('html')
  els.localeSelect.value = state.locale
  els.localeSelect.setAttribute('aria-label', FILE_VIEWER_LOCALE_OPTIONS.find(option => option.value === state.locale).label)
}

function updateSummary() {
  const sample = activeSample()
  const displayName = state.file ? state.fileName : sample?.name || fileNameOf(state.url)
  const displayPath = state.file ? text('localFile') : state.url
  const icon = getIcon(state.file ? state.fileName : state.url)
  els.displayName.textContent = displayName || text('noFile')
  els.displayPath.textContent = displayPath || ''
  els.fileBadge.textContent = icon.label
  els.fileBadge.dataset.family = icon.family
  els.activeType.textContent = extensionOf(state.file ? state.fileName : state.url).toUpperCase() || 'AUTO'
  els.urlInput.value = state.url
}

function renderScenarios() {
  els.scenarioGrid.replaceChildren()
  for (const [title, description, url, family] of scenarios[state.locale]) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'scenario-card'
    button.dataset.family = family
    button.innerHTML = `<strong>${title}</strong><span>${description}</span>`
    button.addEventListener('click', () => openUrl(url))
    els.scenarioGrid.append(button)
  }
}

function renderSamples() {
  els.sampleGroups.replaceChildren()
  if (state.sampleCollapsed) {
    return
  }
  state.openGroup = activeGroupIndex()
  sampleGroups.forEach((group, groupIndex) => {
    const section = document.createElement('section')
    section.className = 'sample-group'
    const header = document.createElement('button')
    header.type = 'button'
    header.className = 'sample-group-header'
    header.innerHTML = `<span><strong>${sampleGroupsByLocale[state.locale][groupIndex].title}</strong><em>${sampleGroupsByLocale[state.locale][groupIndex].description}</em></span><b>${state.openGroup === groupIndex ? '-' : '+'}</b>`
    header.addEventListener('click', () => {
      state.openGroup = state.openGroup === groupIndex ? -1 : groupIndex
      renderSampleGroupsOnly()
    })
    section.append(header)

    const grid = document.createElement('div')
    grid.className = 'sample-grid'
    grid.hidden = state.openGroup !== groupIndex
    for (const raw of group.items) {
      const item = itemForLocale(raw)
      const icon = getIcon(item.url)
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'sample-button'
      button.classList.toggle('active', !state.file && isSameUrl(item.url, state.url))
      button.innerHTML = `<span data-family="${icon.family}">${icon.label}</span><strong>${item.name}</strong>`
      button.addEventListener('click', () => openUrl(item.url))
      grid.append(button)
    }
    section.append(grid)
    els.sampleGroups.append(section)
  })
}

function renderSampleGroupsOnly() {
  const sections = Array.from(els.sampleGroups.querySelectorAll('.sample-group'))
  sections.forEach((section, index) => {
    const header = section.querySelector('.sample-group-header b')
    const grid = section.querySelector('.sample-grid')
    if (header) {
      header.textContent = state.openGroup === index ? '-' : '+'
    }
    if (grid) {
      grid.hidden = state.openGroup !== index
    }
  })
}

function updateActions() {
  els.modeUrl.classList.toggle('active', state.mode === 'url')
  els.modeFile.classList.toggle('active', state.mode === 'file')
  els.urlForm.hidden = state.mode !== 'url'
  els.fileDrop.hidden = state.mode !== 'file'
  els.snippetPanel.hidden = !state.snippetOpen
  els.searchPopover.hidden = !state.searchOpen
  els.watermarkToggle.classList.toggle('active', state.watermark)
  els.download.disabled = !state.availability.download
  els.print.disabled = !state.availability.print
  els.html.disabled = !state.availability.exportHtml
  els.zoomOut.disabled = !state.availability.zoomOut || !state.zoom.canZoomOut
  els.zoomIn.disabled = !state.availability.zoomIn || !state.zoom.canZoomIn
  els.zoomLabel.disabled = !state.availability.zoomReset || !state.zoom.canReset
  els.zoomLabel.textContent = state.zoom.label || '100%'
  const total = state.search.total || 0
  const current = total ? state.search.currentIndex + 1 : 0
  els.searchCount.textContent = `${current}/${total}`
  els.searchPrev.disabled = total < 1
  els.searchNext.disabled = total < 1
}

function renderAll() {
  updateLabels()
  updateSummary()
  updateSnippet()
  renderScenarios()
  renderSamples()
  updateActions()
}

function handleViewerEvent(event) {
  if (event.type === 'load-start') {
    state.loading = true
  }
  if (event.type === 'load-complete') {
    state.loading = false
  }
  if (event.type === 'operation-availability-change') {
    state.availability = event.payload
  }
  if (event.type === 'search-change') {
    state.search = event.payload
  }
  if (event.type === 'zoom-change') {
    state.zoom = event.payload
  }
  updateActions()
}

function handleViewerState(nextState) {
  state.availability = nextState.availability || state.availability
  state.search = nextState.search || state.search
  state.zoom = nextState.zoom || state.zoom
  updateActions()
}

async function updateViewerSource() {
  updateSummary()
  updateSnippet()
  state.search = { query: '', total: 0, currentIndex: -1 }
  els.searchInput.value = ''
  if (!controller) {
    controller = mountViewer(els.viewer, mountOptions())
    return
  }
  await controller.update(mountOptions())
}

async function openUrl(nextUrl) {
  state.mode = 'url'
  state.file = null
  state.fileName = ''
  state.url = nextUrl || els.urlInput.value.trim() || defaultUrlByLocale[state.locale]
  history.replaceState(null, '', `?url=${encodeURIComponent(state.url)}&locale=${state.locale}${state.watermark ? '&watermark=1' : ''}`)
  renderAll()
  await updateViewerSource()
}

async function openFile(file) {
  if (!file) {
    return
  }
  state.mode = 'file'
  state.file = file
  state.fileName = file.name
  renderAll()
  await updateViewerSource()
}

function updateViewerOptionsOnly() {
  controller?.getApi()?.updateOptions(viewerOptions())
  updateActions()
  updateSnippet()
}

async function runSearch() {
  const query = els.searchInput.value.trim()
  if (!query) {
    state.search = await controller?.clearDocumentSearch() || state.search
    updateActions()
    return
  }
  state.search = await controller?.searchDocument(query) || state.search
  updateActions()
}

function wireEvents() {
  for (const option of FILE_VIEWER_LOCALE_OPTIONS) {
    const node = document.createElement('option')
    node.value = option.value
    node.textContent = option.label
    els.localeSelect.append(node)
  }
  els.localeSelect.addEventListener('change', () => setLocale(els.localeSelect.value))
  els.snippetToggle.addEventListener('click', () => {
    state.snippetOpen = !state.snippetOpen
    renderAll()
  })
  els.modeUrl.addEventListener('click', () => {
    state.mode = 'url'
    renderAll()
  })
  els.modeFile.addEventListener('click', () => {
    state.mode = 'file'
    renderAll()
  })
  els.urlForm.addEventListener('submit', event => {
    event.preventDefault()
    void openUrl(els.urlInput.value.trim())
  })
  els.fileInput.addEventListener('change', event => {
    void openFile(event.target.files?.[0])
  })
  for (const name of ['dragenter', 'dragover']) {
    els.fileDrop.addEventListener(name, event => {
      event.preventDefault()
      els.fileDrop.classList.add('dragging')
    })
  }
  for (const name of ['dragleave', 'drop']) {
    els.fileDrop.addEventListener(name, event => {
      event.preventDefault()
      els.fileDrop.classList.remove('dragging')
    })
  }
  els.fileDrop.addEventListener('drop', event => {
    void openFile(event.dataTransfer?.files?.[0])
  })
  els.collapseSamples.addEventListener('click', () => {
    state.sampleCollapsed = !state.sampleCollapsed
    renderAll()
  })
  els.watermarkToggle.addEventListener('click', () => {
    state.watermark = !state.watermark
    els.watermarkToggle.classList.toggle('active', state.watermark)
    updateViewerOptionsOnly()
  })
  els.download.addEventListener('click', () => void controller?.downloadOriginalFile())
  els.print.addEventListener('click', () => void controller?.printRenderedHtml())
  els.html.addEventListener('click', () => void controller?.exportRenderedHtml())
  els.zoomOut.addEventListener('click', async () => {
    state.zoom = await controller?.zoomOut() || state.zoom
    updateActions()
  })
  els.zoomIn.addEventListener('click', async () => {
    state.zoom = await controller?.zoomIn() || state.zoom
    updateActions()
  })
  els.zoomLabel.addEventListener('click', async () => {
    state.zoom = await controller?.resetZoom() || state.zoom
    updateActions()
  })
  els.searchToggle.addEventListener('click', () => {
    state.searchOpen = !state.searchOpen
    updateActions()
    if (state.searchOpen) {
      window.requestAnimationFrame(() => els.searchInput.focus())
    }
  })
  els.searchPopover.addEventListener('submit', event => {
    event.preventDefault()
    void runSearch()
  })
  els.searchPrev.addEventListener('click', async () => {
    state.search = await controller?.previousSearchResult() || state.search
    updateActions()
  })
  els.searchNext.addEventListener('click', async () => {
    state.search = await controller?.nextSearchResult() || state.search
    updateActions()
  })
  els.searchClear.addEventListener('click', async () => {
    els.searchInput.value = ''
    state.search = await controller?.clearDocumentSearch() || state.search
    updateActions()
  })
  els.snippetCopy.addEventListener('click', async () => {
    await navigator.clipboard.writeText(els.snippetCode.textContent)
    els.snippetCopy.textContent = text('copied')
    window.clearTimeout(copyResetTimer)
    copyResetTimer = window.setTimeout(() => {
      els.snippetCopy.textContent = text('copyCode')
    }, 1500)
  })
}

function setLocale(locale, save = true) {
  if (state.locale === locale) {
    return
  }
  state.locale = locale
  if (save) {
    automaticLocale = false
    try { localStorage.setItem('file-viewer-web-demo-locale', locale) } catch { /* Optional storage. */ }
    const url = new URL(location.href)
    url.searchParams.set('locale', locale)
    history.replaceState(null, '', url)
  }
  renderAll()
  updateViewerOptionsOnly()
}

window.addEventListener('languagechange', () => {
  if (automaticLocale) {
    setLocale(normalizeFileViewerLocale('auto'), false)
  }
})
wireEvents()
renderAll()
void updateViewerSource()
