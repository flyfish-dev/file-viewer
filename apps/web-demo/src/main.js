import { mountViewer } from '@file-viewer/web'
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
import './style.css'

const copy = {
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
  'zh-CN': '/example/word.docx',
  'en-US': '/example/en/calibre-demo.docx',
  'ja-JP': '/example/en/calibre-demo.docx',
  'de-DE': '/example/en/calibre-demo.docx'
}

const sampleGroups = [
  {
    title: { zh: '文档', en: 'Documents', ja: '文書' },
    description: 'Word / PDF / OFD / Typst',
    family: 'word',
    items: [
      ['DOC', '/example/test.doc'],
      ['DOCX 中文长文档', '/example/word.docx', 'DOCX rich English document', '/example/en/calibre-demo.docx'],
      ['DOT 模板', '/example/template.dot'],
      ['RTF', '/example/sample.rtf'],
      ['ODT', '/example/document.odt'],
      ['PDF 技术说明', '/example/pdf.pdf', 'PDF technical sample', '/example/en/prince-sample.pdf'],
      ['OFD', '/example/ofd.ofd'],
      ['Typst', '/example/report.typ']
    ]
  },
  {
    title: { zh: '表格', en: 'Spreadsheets', ja: 'スプレッドシート' },
    description: 'Excel / CSV / ODS',
    family: 'sheet',
    items: [
      ['XLSX', '/example/excel.xlsx', 'XLSX financial workbook', '/example/en/financial-sample.xlsx'],
      ['XLSM', '/example/excel.xlsm'],
      ['XLSB', '/example/excel.xlsb'],
      ['XLS', '/example/excel.xls'],
      ['CSV', '/example/table.csv', 'CSV revenue table', '/example/en/table.csv'],
      ['ODS', '/example/excel.ods'],
      ['FODS', '/example/excel.fods'],
      ['Numbers', '/example/excel.numbers']
    ]
  },
  {
    title: { zh: '演示与图纸', en: 'Slides & CAD', ja: 'プレゼンテーションと CAD' },
    description: 'PPTX / CAD',
    family: 'slide',
    items: [
      ['NASA 月球战略 PPTX', '/example/ppt.pptx', 'NASA lunar strategy PPTX', '/example/en/sample-presentation.pptx'],
      ['ODP', '/example/slides.odp'],
      ['DXF', '/example/drawing.dxf'],
      ['DWG', '/example/sample.dwg'],
      ['DWF Blocks/Tables', '/example/samples/apache/blocks_and_tables.dwf'],
      ['DWFx House', '/example/samples/autodesk/house.dwfx'],
      ['DWFx RobotArm', '/example/samples/autodesk/robot-arm.dwfx']
    ]
  },
  {
    title: { zh: '脑图与绘图', en: 'Mindmaps & Diagrams', ja: 'マインドマップと図表' },
    description: 'XMind / Mermaid / PlantUML / draw.io',
    family: 'drawing',
    items: [
      ['XMind 脑图', '/example/mindmap.xmind', 'XMind mind map'],
      ['Mermaid 架构图', '/example/architecture.mermaid', 'Mermaid architecture'],
      ['PlantUML 时序图', '/example/sequence.plantuml', 'PlantUML sequence'],
      ['Excalidraw', '/example/flow.excalidraw'],
      ['draw.io', '/example/process.drawio']
    ]
  },
  {
    title: { zh: '3D 模型和地理数据', en: '3D Models & Geospatial Data', ja: '3D モデルと地理空間データ' },
    description: 'GLTF / OBJ / STL / GeoJSON / KML / GPX',
    family: 'model',
    items: [
      ['GLTF', '/example/model.gltf', 'glTF embedded model', '/example/en/model.gltf'],
      ['OBJ', '/example/model.obj'],
      ['STL', '/example/model.stl'],
      ['PLY', '/example/model.ply'],
      ['STEP', '/example/model.step'],
      ['GeoJSON', '/example/map.geojson', 'GeoJSON Bay route', '/example/en/map.geojson'],
      ['KML', '/example/route.kml'],
      ['GPX', '/example/track.gpx']
    ]
  },
  {
    title: { zh: '电子书', en: 'Ebooks', ja: '電子書籍' },
    description: 'EPUB / UMD',
    family: 'ebook',
    items: [
      ['EPUB', '/example/book.epub'],
      ['UMD', '/example/book.umd']
    ]
  },
  {
    title: { zh: '压缩包', en: 'Archives', ja: '圧縮ファイル' },
    description: 'ZIP / TAR.GZ / Encrypted',
    family: 'archive',
    items: [
      ['ZIP', '/example/archive.zip', 'ZIP archive', '/example/en/archive.zip'],
      ['TAR.GZ', '/example/archive.tar.gz', 'TAR.GZ archive', '/example/en/archive.tar.gz'],
      ['加密 ZIP（密码 flyfish）', '/example/encrypted.zip', 'Encrypted ZIP (password: flyfish)']
    ]
  },
  {
    title: { zh: '邮件与 EDA', en: 'Email & EDA', ja: 'メールと EDA' },
    description: 'EML / MSG / OLB / DRA / GDS / OASIS',
    family: 'email',
    items: [
      ['EML', '/example/sample.eml'],
      ['MSG', '/example/sample.msg'],
      ['MBOX', '/example/sample.mbox'],
      ['OLB', '/example/sample.olb'],
      ['DRA', '/example/sample.dra'],
      ['GDSII', '/example/layout.gds'],
      ['OAS', '/example/layout.oas'],
      ['OASIS', '/example/layout.oasis']
    ]
  },
  {
    title: { zh: '文本', en: 'Text', ja: 'テキスト' },
    description: 'Markdown / TXT / Log',
    family: 'text',
    items: [
      ['MD', '/example/markdown.md', 'Markdown guide', '/example/en/markdown.md'],
      ['MARKDOWN', '/example/notes.markdown', 'Markdown notes', '/example/en/notes.markdown'],
      ['TXT', '/example/text.txt', 'Plain text overview', '/example/en/text.txt'],
      ['Log', '/example/app.log', 'Application log', '/example/en/app.log']
    ]
  },
  {
    title: { zh: '前端与数据', en: 'Frontend & Data', ja: 'フロントエンドとデータ' },
    description: 'JS / TS / Vue / Data',
    family: 'code',
    items: [
      ['JSON', '/example/data.json', 'JSON capability data', '/example/en/data.json'],
      ['JSONC', '/example/data.jsonc', 'JSONC config sample', '/example/en/data.jsonc'],
      ['JSON5', '/example/data.json5', 'JSON5 config sample', '/example/en/data.json5'],
      ['IPYNB', '/example/notebook.ipynb'],
      ['JS', '/example/code.js', 'JavaScript integration sample', '/example/en/code.js'],
      ['MJS', '/example/code.mjs'],
      ['CJS', '/example/code.cjs'],
      ['TS', '/example/code.ts', 'TypeScript integration sample', '/example/en/code.ts'],
      ['TSX', '/example/code.tsx'],
      ['JSX', '/example/code.jsx'],
      ['CSS', '/example/code.css'],
      ['HTML', '/example/page.html'],
      ['XML', '/example/data.xml'],
      ['VUE', '/example/component.vue'],
      ['React', '/example/component.react'],
      ['YAML', '/example/config.yaml'],
      ['TOML', '/example/config.toml'],
      ['Graphviz', '/example/graph.gv'],
      ['HTTP', '/example/request.http'],
      ['DIFF', '/example/change.diff'],
      ['PATCH 左右比对', '/example/change.patch', 'Patch side-by-side diff'],
      ['Git Bundle', '/example/repository.bundle', 'Git bundle history']
    ]
  },
  {
    title: { zh: '后端与系统', en: 'Backend & System', ja: 'バックエンドとシステム' },
    description: 'Shell / SQL / C / Go',
    family: 'code',
    items: [
      ['SH', '/example/script.sh'],
      ['BASH', '/example/script.bash'],
      ['SQL', '/example/query.sql'],
      ['GO', '/example/main.go'],
      ['RS', '/example/main.rs'],
      ['PHP', '/example/index.php'],
      ['C', '/example/main.c'],
      ['CPP', '/example/main.cpp'],
      ['CS', '/example/program.cs'],
      ['Java', '/example/code.java'],
      ['Python', '/example/code.py'],
      ['Ruby', '/example/code.rb'],
      ['Swift', '/example/code.swift'],
      ['Kotlin', '/example/Main.kt']
    ]
  },
  {
    title: { zh: '资产与数据', en: 'Assets & Data', ja: 'アセットとデータ' },
    description: 'SQLite / WASM / PSD / ICO',
    family: 'data',
    items: [
      ['SQLite', '/example/sample.sqlite'],
      ['WASM', '/example/module.wasm'],
      ['PSD 图层', '/example/design.psd', 'PSD layers'],
      ['ICO', '/example/icon.ico']
    ]
  },
  {
    title: { zh: '媒体', en: 'Media', ja: 'メディア' },
    description: 'Image / Audio / Video',
    family: 'image',
    items: [
      ['PNG', '/example/pic.png'],
      ['JPG', '/example/pic.jpg'],
      ['GIF', '/example/pic.gif'],
      ['SVG', '/example/vector.svg'],
      ['WEBP', '/example/pic.webp'],
      ['MP3', '/example/audio.mp3'],
      ['OGG', '/example/audio.ogg'],
      ['MIDI', '/example/melody.mid'],
      ['MP4', '/example/video.mp4']
    ]
  }
]

const japaneseSampleNames = {
  '/example/test.doc': 'DOC 旧形式文書',
  '/example/en/calibre-demo.docx': 'DOCX リッチ文書',
  '/example/template.dot': 'DOT テンプレート',
  '/example/sample.rtf': 'RTF 文書',
  '/example/document.odt': 'ODT 文書',
  '/example/en/prince-sample.pdf': 'PDF 技術サンプル',
  '/example/ofd.ofd': 'OFD レイアウト文書',
  '/example/report.typ': 'Typst レポート',
  '/example/en/financial-sample.xlsx': 'XLSX 財務ワークブック',
  '/example/excel.xlsm': 'XLSM マクロワークブック',
  '/example/excel.xlsb': 'XLSB バイナリワークブック',
  '/example/excel.xls': 'XLS 旧形式ワークブック',
  '/example/en/table.csv': 'CSV 売上テーブル',
  '/example/excel.ods': 'ODS スプレッドシート',
  '/example/excel.fods': 'FODS スプレッドシート',
  '/example/excel.numbers': 'Numbers スプレッドシート',
  '/example/en/sample-presentation.pptx': 'NASA 月面戦略 PPTX',
  '/example/slides.odp': 'ODP プレゼンテーション',
  '/example/drawing.dxf': 'DXF 図面',
  '/example/sample.dwg': 'DWG 図面',
  '/example/samples/apache/blocks_and_tables.dwf': 'DWF ブロック / テーブル',
  '/example/samples/autodesk/house.dwfx': 'DWFx 住宅モデル',
  '/example/samples/autodesk/robot-arm.dwfx': 'DWFx ロボットアーム',
  '/example/mindmap.xmind': 'XMind マインドマップ',
  '/example/architecture.mermaid': 'Mermaid アーキテクチャ図',
  '/example/sequence.plantuml': 'PlantUML シーケンス図',
  '/example/flow.excalidraw': 'Excalidraw フロー図',
  '/example/process.drawio': 'draw.io プロセス図',
  '/example/en/model.gltf': 'glTF 埋め込みモデル',
  '/example/model.obj': 'OBJ 3D モデル',
  '/example/model.stl': 'STL 3D モデル',
  '/example/model.ply': 'PLY 3D モデル',
  '/example/model.step': 'STEP 工学モデル',
  '/example/en/map.geojson': 'GeoJSON 湾岸ルート',
  '/example/route.kml': 'KML ルート',
  '/example/track.gpx': 'GPX トラック',
  '/example/book.epub': 'EPUB 電子書籍',
  '/example/book.umd': 'UMD 電子書籍',
  '/example/en/archive.zip': 'ZIP 圧縮ファイル',
  '/example/en/archive.tar.gz': 'TAR.GZ 圧縮ファイル',
  '/example/encrypted.zip': '暗号化 ZIP（パスワード：flyfish）',
  '/example/sample.eml': 'EML メッセージ',
  '/example/sample.msg': 'MSG Outlook メッセージ',
  '/example/sample.mbox': 'MBOX メールボックス',
  '/example/sample.olb': 'OLB シンボルライブラリ',
  '/example/sample.dra': 'DRA 図面',
  '/example/layout.gds': 'GDSII レイアウト',
  '/example/layout.oas': 'OAS レイアウト',
  '/example/layout.oasis': 'OASIS レイアウト',
  '/example/en/markdown.md': 'Markdown 製品ガイド',
  '/example/en/notes.markdown': 'Markdown サポートノート',
  '/example/en/text.txt': 'プレーンテキスト概要',
  '/example/en/app.log': 'アプリケーションログ',
  '/example/en/data.json': 'JSON 機能データ',
  '/example/en/data.jsonc': 'JSONC 設定サンプル',
  '/example/en/data.json5': 'JSON5 設定サンプル',
  '/example/notebook.ipynb': 'Jupyter Notebook',
  '/example/en/code.js': 'JavaScript 組み込みサンプル',
  '/example/en/code.ts': 'TypeScript 組み込みサンプル',
  '/example/change.diff': 'Diff 差分',
  '/example/change.patch': 'Patch 左右比較',
  '/example/repository.bundle': 'Git bundle 履歴',
  '/example/sample.sqlite': 'SQLite データベース',
  '/example/module.wasm': 'WASM モジュール',
  '/example/design.psd': 'PSD レイヤー',
  '/example/icon.ico': 'ICO 画像'
}

const scenarios = {
  'zh-CN': [
    ['试试 Word 合同', 'DOCX 长文档', '/example/word.docx', 'word'],
    ['试试 Excel 报表', '多 sheet 表格', '/example/excel.xlsx', 'sheet'],
    ['试试 NASA PPT', '专业演示稿', '/example/ppt.pptx', 'slide'],
    ['试试 DWG 图纸', '工程图纸', '/example/sample.dwg', 'cad'],
    ['试试压缩包', '嵌套预览', '/example/archive.zip', 'archive'],
    ['试试邮件', 'EML 附件', '/example/sample.eml', 'email']
  ],
  'en-US': [
    ['Try Word doc', 'Rich DOCX', '/example/en/calibre-demo.docx', 'word'],
    ['Try Excel report', 'Workbook', '/example/en/financial-sample.xlsx', 'sheet'],
    ['Try NASA deck', 'Professional PPTX', '/example/en/sample-presentation.pptx', 'slide'],
    ['Try DWG drawing', 'CAD sample', '/example/sample.dwg', 'cad'],
    ['Try archive', 'Nested files', '/example/en/archive.zip', 'archive'],
    ['Try email', 'EML message', '/example/sample.eml', 'email']
  ],
  'ja-JP': [
    ['Word 文書を試す', 'リッチ DOCX', '/example/en/calibre-demo.docx', 'word'],
    ['Excel レポートを試す', 'ワークブック', '/example/en/financial-sample.xlsx', 'sheet'],
    ['NASA スライドを試す', '専門 PPTX', '/example/en/sample-presentation.pptx', 'slide'],
    ['DWG 図面を試す', 'CAD サンプル', '/example/sample.dwg', 'cad'],
    ['圧縮ファイルを試す', '入れ子ファイル', '/example/en/archive.zip', 'archive'],
    ['メールを試す', 'EML メッセージ', '/example/sample.eml', 'email']
  ]
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
  localeZh: $('locale-zh'),
  localeEn: $('locale-en'),
  localeJa: $('locale-ja'),
  localeDe: $('locale-de'),
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

const normalizeLocale = value => {
  const normalized = String(value || '').trim().replaceAll('_', '-').toLowerCase()
  if (normalized === 'zh' || normalized.startsWith('zh-')) return 'zh-CN'
  if (normalized === 'ja' || normalized.startsWith('ja-')) return 'ja-JP'
  if (normalized === 'de' || normalized.startsWith('de-')) return 'de-DE'
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en-US'
  return null
}
const resolveAutomaticLocale = () => {
  const candidates = [...(navigator.languages || []), navigator.language]
  for (const candidate of candidates) {
    const resolved = normalizeLocale(candidate)
    if (resolved) return resolved
  }
  return 'en-US'
}
const params = new URLSearchParams(window.location.search)
const explicitLocale = params.get('locale') || localStorage.getItem('file-viewer-web-demo-locale')
const initialLocale = normalizeLocale(explicitLocale) || resolveAutomaticLocale()

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
  const [zhName, zhUrl, enName, enUrl, jaName, jaUrl] = item
  if (state.locale === 'ja-JP') {
    const url = jaUrl || enUrl || zhUrl
    return { name: jaName || japaneseSampleNames[url] || enName || zhName, url }
  }
  if (state.locale === 'en-US' || state.locale === 'de-DE') {
    return { name: enName || zhName, url: enUrl || zhUrl }
  }
  return { name: zhName, url: zhUrl }
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
          text: state.locale === 'zh-CN' ? '内部资料' : state.locale === 'ja-JP' ? '社内資料' : state.locale === 'de-DE' ? 'Intern' : 'Internal',
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
      text: '${state.locale === 'zh-CN' ? '内部资料' : state.locale === 'ja-JP' ? '社内資料' : state.locale === 'de-DE' ? 'Intern' : 'Internal'}',
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
  document.documentElement.lang = state.locale
  document.title = state.locale === 'zh-CN'
    ? 'File Viewer Web 原生 Demo'
    : state.locale === 'ja-JP'
      ? 'File Viewer Web ネイティブ Demo'
      : state.locale === 'de-DE'
        ? 'File Viewer Web – native Demo'
      : 'File Viewer Web Demo'
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
  els.localeZh.classList.toggle('active', state.locale === 'zh-CN')
  els.localeEn.classList.toggle('active', state.locale === 'en-US')
  els.localeJa.classList.toggle('active', state.locale === 'ja-JP')
  els.localeDe.classList.toggle('active', state.locale === 'de-DE')
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
    header.innerHTML = `<span><strong>${group.title[state.locale === 'zh-CN' ? 'zh' : state.locale === 'ja-JP' ? 'ja' : 'en']}</strong><em>${group.description}</em></span><b>${state.openGroup === groupIndex ? '-' : '+'}</b>`
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
  els.localeZh.addEventListener('click', () => setLocale('zh-CN'))
  els.localeEn.addEventListener('click', () => setLocale('en-US'))
  els.localeJa.addEventListener('click', () => setLocale('ja-JP'))
  els.localeDe.addEventListener('click', () => setLocale('de-DE'))
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

function setLocale(locale) {
  if (state.locale === locale) {
    return
  }
  const previousDefault = defaultUrlByLocale[state.locale]
  state.locale = locale
  localStorage.setItem('file-viewer-web-demo-locale', locale)
  if (!state.file && isSameUrl(state.url, previousDefault)) {
    state.url = defaultUrlByLocale[locale]
    void openUrl(state.url)
    return
  }
  renderAll()
  updateViewerOptionsOnly()
}

wireEvents()
renderAll()
void updateViewerSource()
