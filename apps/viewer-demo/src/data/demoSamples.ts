/**
 * Product-demo sample catalog.
 *
 * This module contains data only. Keeping the catalog out of the page
 * component prevents every format addition from growing the UI controller and
 * lets tests validate format coverage without depending on template markup.
 */
export type DemoPresetFile = {
  name: string
  url: string
}

export type DemoSampleGroup = {
  title: string
  description: string
  family: string
  items: DemoPresetFile[]
}

// Chinese is the canonical catalog: format additions happen once here.
export const sampleGroupsZh: DemoSampleGroup[] = [
  {
    title: '文档',
    description: 'Word / Apple Pages / Hangul / PDF / OFD / Typst',
    family: 'word',
    items: [
      { name: 'DOC', url: '/example/test.doc' },
      { name: 'DOCX 中文长文档', url: '/example/word.docx' },
      { name: 'DOT 模板', url: '/example/template.dot' },
      { name: 'RTF', url: '/example/sample.rtf' },
      { name: 'ODT', url: '/example/document.odt' },
      { name: 'Pages（Apple 15.3.1 原生高保真样例）', url: '/example/apple-pages-experimental.pages' },
      { name: 'WordPerfect 5.0 文档', url: '/example/wordperfect-wp50.wp' },
      { name: 'WordPerfect 6.x 文档', url: '/example/wordperfect-wp6.wpd' },
      { name: 'HWP v5 表格', url: '/example/hwplib-table.hwp' },
      { name: 'HWP v5 图片', url: '/example/hwplib-image.hwp' },
      { name: 'HWPX 样式文档', url: '/example/hwpxlib-sample1.hwpx' },
      { name: 'HWPX 合并表格', url: '/example/hwpxlib-simple-table.hwpx' },
      { name: 'HWPX 图片', url: '/example/hwpxlib-simple-picture.hwpx' },
      { name: 'PDF 技术说明', url: '/example/pdf.pdf' },
      { name: 'OFD', url: '/example/ofd.ofd' },
      { name: 'Typst', url: '/example/report.typ' }
    ]
  },
  {
    title: '表格',
    description: 'Excel / Numbers / DBF / CSV / ODS',
    family: 'sheet',
    items: [
      { name: 'XLSX', url: '/example/excel.xlsx' },
      { name: 'XLSM', url: '/example/excel.xlsm' },
      { name: 'XLSB', url: '/example/excel.xlsb' },
      { name: 'XLS', url: '/example/excel.xls' },
      { name: 'XLA Add-in', url: '/example/addin.xla' },
      { name: 'XLAM Add-in', url: '/example/addin.xlam' },
      { name: 'DBF', url: '/example/format-matrix.dbf' },
      { name: 'CSV', url: '/example/table.csv' },
      { name: 'ODS', url: '/example/excel.ods' },
      { name: 'FODS', url: '/example/excel.fods' },
      { name: 'Numbers（Apple 15.3.1 原生高保真样例）', url: '/example/excel.numbers' }
    ]
  },
  {
    title: '演示与图纸',
    description: 'PPT / PPTX / CAD',
    family: 'cad',
    items: [
      { name: 'PowerPoint 97–2003', url: '/example/office-demo.ppt' },
      { name: 'POT 二进制模板', url: '/example/format-matrix-template.pot' },
      { name: 'NASA 月球战略 PPTX', url: '/example/ppt.pptx' },
      { name: 'Keynote（Apple 15.3.1 原生高保真样例）', url: '/example/apple-keynote-experimental.key' },
      { name: 'ODP', url: '/example/slides.odp' },
      { name: 'DXF', url: '/example/drawing.dxf' },
      { name: 'DWG', url: '/example/sample.dwg' },
      { name: 'DWF Blocks/Tables', url: '/example/samples/apache/blocks_and_tables.dwf' },
      { name: 'DWFx House', url: '/example/samples/autodesk/house.dwfx' },
      { name: 'DWFx RobotArm', url: '/example/samples/autodesk/robot-arm.dwfx' }
    ]
  },
  {
    title: '脑图与绘图',
    description: 'XMind / Mermaid / PlantUML / draw.io',
    family: 'drawing',
    items: [
      { name: 'XMind 脑图', url: '/example/mindmap.xmind' },
      { name: 'Mermaid 架构图', url: '/example/architecture.mermaid' },
      { name: 'PlantUML 时序图', url: '/example/sequence.plantuml' },
      { name: 'Excalidraw', url: '/example/flow.excalidraw' },
      { name: 'draw.io', url: '/example/process.drawio' }
    ]
  },
  {
    title: '3D 模型和地理数据',
    description: 'GLTF / STEP / OBJ / STL / GeoJSON / KML / GPX',
    family: 'model',
    items: [
      { name: 'GLTF', url: '/example/model.gltf' },
      { name: 'STEP 工程模型', url: '/example/model.step' },
      { name: 'OBJ', url: '/example/model.obj' },
      { name: 'STL', url: '/example/model.stl' },
      { name: 'PLY', url: '/example/model.ply' },
      { name: 'GeoJSON', url: '/example/map.geojson' },
      { name: 'KML', url: '/example/route.kml' },
      { name: 'GPX', url: '/example/track.gpx' }
    ]
  },
  {
    title: '电子书',
    description: 'EPUB / FB2 / UMD',
    family: 'ebook',
    items: [
      { name: 'EPUB', url: '/example/book.epub' },
      { name: 'FB2', url: '/example/format-matrix.fb2' },
      { name: 'UMD', url: '/example/book.umd' }
    ]
  },
  {
    title: '压缩包',
    description: 'ZIP / TAR.GZ / 加密',
    family: 'archive',
    items: [
      { name: 'ZIP', url: '/example/archive.zip' },
      { name: 'TAR.GZ', url: '/example/archive.tar.gz' },
      { name: '加密 ZIP（密码 flyfish）', url: '/example/encrypted.zip' }
    ]
  },
  {
    title: '邮件与 EDA',
    description: 'EML / MSG / OLB / DRA / GDS / OASIS',
    family: 'email',
    items: [
      { name: 'EML', url: '/example/sample.eml' },
      { name: 'MSG', url: '/example/sample.msg' },
      { name: 'MBOX', url: '/example/sample.mbox' },
      { name: 'OLB', url: '/example/sample.olb' },
      { name: 'DRA', url: '/example/sample.dra' },
      { name: 'GDSII', url: '/example/layout.gds' },
      { name: 'OAS', url: '/example/layout.oas' },
      { name: 'OASIS', url: '/example/layout.oasis' }
    ]
  },
  {
    title: '文本',
    description: 'Markdown / TXT / Log',
    family: 'text',
    items: [
      { name: 'MD', url: '/example/markdown.md' },
      { name: 'MARKDOWN', url: '/example/notes.markdown' },
      { name: 'TXT', url: '/example/text.txt' },
      { name: 'Log', url: '/example/app.log' }
    ]
  },
  {
    title: '前端与数据',
    description: 'JS / TS / Vue / Data',
    family: 'code',
    items: [
      { name: 'JSON', url: '/example/data.json' },
      { name: 'JSONC', url: '/example/data.jsonc' },
      { name: 'JSON5', url: '/example/data.json5' },
      { name: 'IPYNB', url: '/example/notebook.ipynb' },
      { name: 'JS', url: '/example/code.js' },
      { name: 'MJS', url: '/example/code.mjs' },
      { name: 'CJS', url: '/example/code.cjs' },
      { name: 'TS', url: '/example/code.ts' },
      { name: 'TSX', url: '/example/code.tsx' },
      { name: 'JSX', url: '/example/code.jsx' },
      { name: 'CSS', url: '/example/code.css' },
      { name: 'HTML', url: '/example/page.html' },
      { name: 'HTM', url: '/example/page.htm' },
      { name: 'XML', url: '/example/data.xml' },
      { name: 'VUE', url: '/example/component.vue' },
      { name: 'React', url: '/example/component.react' },
      { name: 'YAML', url: '/example/config.yaml' },
      { name: 'YML', url: '/example/config.yml' },
      { name: 'TOML', url: '/example/config.toml' },
      { name: 'INI', url: '/example/settings.ini' },
      { name: 'PROTO', url: '/example/service.proto' },
      { name: 'HCL', url: '/example/infrastructure.hcl' },
      { name: 'TeX', url: '/example/formula.tex' },
      { name: 'Graphviz', url: '/example/graph.gv' },
      { name: 'HTTP', url: '/example/request.http' },
      { name: 'DIFF', url: '/example/change.diff' },
      { name: 'PATCH 左右比对', url: '/example/change.patch' },
      { name: 'Git Bundle', url: '/example/repository.bundle' }
    ]
  },
  {
    title: '后端与系统',
    description: 'Shell / SQL / C / Go',
    family: 'code',
    items: [
      { name: 'SH', url: '/example/script.sh' },
      { name: 'BASH', url: '/example/script.bash' },
      { name: 'SQL', url: '/example/query.sql' },
      { name: 'GO', url: '/example/main.go' },
      { name: 'RS', url: '/example/main.rs' },
      { name: 'PHP', url: '/example/index.php' },
      { name: 'C', url: '/example/main.c' },
      { name: 'CPP', url: '/example/main.cpp' },
      { name: 'CC', url: '/example/module.cc' },
      { name: 'H', url: '/example/main.h' },
      { name: 'HPP', url: '/example/main.hpp' },
      { name: 'CS', url: '/example/program.cs' },
      { name: 'Java', url: '/example/code.java' },
      { name: 'Python', url: '/example/code.py' },
      { name: 'Ruby', url: '/example/code.rb' },
      { name: 'Swift', url: '/example/code.swift' },
      { name: 'Kotlin', url: '/example/Main.kt' }
    ]
  },
  {
    title: '资产与数据',
    description: 'SQLite / WASM / ICO',
    family: 'data',
    items: [
      { name: 'SQLite', url: '/example/sample.sqlite' },
      { name: 'WASM', url: '/example/module.wasm' },
      { name: 'PSD 图层', url: '/example/design.psd' },
      { name: 'ICO', url: '/example/icon.ico' }
    ]
  },
  {
    title: '医疗影像与数字签名',
    description: 'DICOM / CMS / CAdES',
    family: 'signature',
    items: [
      { name: 'DICOM 真实 CT 影像（pydicom 公开样例）', url: '/example/ct-small.dcm' },
      { name: 'CAdES-BES 数字签名 P7M', url: '/example/signature-invoice-cades-bes.pdf.p7m' }
    ]
  },
  {
    title: '媒体',
    description: 'Image / Audio / Video',
    family: 'image',
    items: [
      { name: 'PNG', url: '/example/pic.png' },
      { name: 'JPG', url: '/example/pic.jpg' },
      { name: 'JPEG', url: '/example/pic.jpeg' },
      { name: 'GIF', url: '/example/pic.gif' },
      { name: 'BMP', url: '/example/pic.bmp' },
      { name: 'TIFF', url: '/example/pic.tiff' },
      { name: 'TIF', url: '/example/pic.tif' },
      { name: 'TIFF（2 页 CCITT G4）', url: '/example/multipage-ccitt-g4.tif' },
      { name: 'SVG', url: '/example/vector.svg' },
      { name: 'WEBP', url: '/example/pic.webp' },
      { name: 'MP3', url: '/example/audio.mp3' },
      { name: 'OGG', url: '/example/audio.ogg' },
      { name: 'MIDI', url: '/example/melody.mid' },
      { name: 'MP4', url: '/example/video.mp4' }
    ]
  }
]

// English presentation reuses the canonical group structure. Only labels and
// selected fixtures differ, which prevents the two menus drifting over time.
const englishGroupCopy: Array<Pick<DemoSampleGroup, 'title' | 'description'>> = [
  { title: 'Documents', description: 'Word / Apple Pages / Hangul / PDF / OFD / Typst' },
  { title: 'Spreadsheets', description: 'Excel / Numbers / DBF / CSV / ODS' },
  { title: 'Slides & CAD', description: 'PPT / PPTX / CAD' },
  { title: 'Mindmaps & Diagrams', description: 'XMind / Mermaid / PlantUML / draw.io' },
  { title: '3D Models & Geospatial Data', description: 'GLTF / STEP / OBJ / STL / GeoJSON / KML / GPX' },
  { title: 'Ebooks', description: 'EPUB / FB2 / UMD' },
  { title: 'Archives', description: 'ZIP / TAR.GZ / Encrypted' },
  { title: 'Email & EDA', description: 'EML / MSG / OLB / DRA / GDS / OASIS' },
  { title: 'Text', description: 'Markdown / TXT / Log' },
  { title: 'Frontend & Data', description: 'JS / TS / Vue / Data' },
  { title: 'Backend & System', description: 'Shell / SQL / C / Go' },
  { title: 'Assets & Data', description: 'SQLite / WASM / PSD / ICO' },
  { title: 'Medical Images & Digital Signatures', description: 'DICOM / CMS / CAdES' },
  { title: 'Media', description: 'Image / Audio / Video' }
]

const englishSampleUrlMap: Record<string, string> = {
  '/example/word.docx': '/example/en/calibre-demo.docx',
  '/example/excel.xlsx': '/example/en/financial-sample.xlsx',
  '/example/pdf.pdf': '/example/en/prince-sample.pdf',
  '/example/ppt.pptx': '/example/en/sample-presentation.pptx',
  '/example/archive.zip': '/example/en/archive.zip',
  '/example/archive.tar.gz': '/example/en/archive.tar.gz',
  '/example/encrypted.zip': '/example/encrypted.zip',
  '/example/model.gltf': '/example/en/model.gltf',
  '/example/map.geojson': '/example/en/map.geojson',
  '/example/markdown.md': '/example/en/markdown.md',
  '/example/notes.markdown': '/example/en/notes.markdown',
  '/example/text.txt': '/example/en/text.txt',
  '/example/app.log': '/example/en/app.log',
  '/example/table.csv': '/example/en/table.csv',
  '/example/data.json': '/example/en/data.json',
  '/example/data.jsonc': '/example/en/data.jsonc',
  '/example/data.json5': '/example/en/data.json5',
  '/example/code.ts': '/example/en/code.ts',
  '/example/code.js': '/example/en/code.js'
}

// Names are keyed by the final localized URL first, then by canonical URL.
const englishSampleNameMap: Record<string, string> = {
  '/example/test.doc': 'DOC legacy document',
  '/example/en/calibre-demo.docx': 'DOCX rich English document',
  '/example/template.dot': 'DOT template',
  '/example/sample.rtf': 'RTF document',
  '/example/document.odt': 'ODT document',
  '/example/en/prince-sample.pdf': 'PDF technical sample',
  '/example/ofd.ofd': 'OFD layout document',
  '/example/report.typ': 'Typst report',
  '/example/en/financial-sample.xlsx': 'XLSX financial workbook',
  '/example/excel.xlsm': 'XLSM macro workbook',
  '/example/excel.xlsb': 'XLSB binary workbook',
  '/example/excel.xls': 'XLS legacy workbook',
  '/example/table.csv': 'CSV table',
  '/example/excel.ods': 'ODS spreadsheet',
  '/example/excel.fods': 'Flat ODS spreadsheet',
  '/example/apple-pages-experimental.pages': 'Apple Pages 15.3.1 native high-fidelity fixture',
  '/example/wordperfect-wp50.wp': 'WordPerfect 5.0 document',
  '/example/wordperfect-wp6.wpd': 'WordPerfect 6.x document',
  '/example/hwplib-table.hwp': 'HWP v5 table document',
  '/example/hwplib-image.hwp': 'HWP v5 picture document',
  '/example/hwpxlib-sample1.hwpx': 'HWPX styled document',
  '/example/hwpxlib-simple-table.hwpx': 'HWPX merged table',
  '/example/hwpxlib-simple-picture.hwpx': 'HWPX picture document',
  '/example/addin.xla': 'XLA add-in workbook',
  '/example/addin.xlam': 'XLAM add-in workbook',
  '/example/format-matrix.dbf': 'dBASE table',
  '/example/excel.numbers': 'Apple Numbers 15.3.1 native high-fidelity fixture',
  '/example/office-demo.ppt': 'PowerPoint 97–2003 sample',
  '/example/format-matrix-template.pot': 'PowerPoint 97–2003 template',
  '/example/apple-keynote-experimental.key': 'Apple Keynote 15.3.1 native high-fidelity fixture',
  '/example/en/sample-presentation.pptx': 'NASA lunar strategy PPTX',
  '/example/slides.odp': 'ODP presentation',
  '/example/drawing.dxf': 'DXF drawing',
  '/example/sample.dwg': 'DWG Autodesk sample',
  '/example/samples/apache/blocks_and_tables.dwf': 'DWF blocks and tables',
  '/example/samples/autodesk/house.dwfx': 'DWFx house drawing',
  '/example/samples/autodesk/robot-arm.dwfx': 'DWFx robot arm',
  '/example/mindmap.xmind': 'XMind mind map',
  '/example/architecture.mermaid': 'Mermaid architecture',
  '/example/sequence.plantuml': 'PlantUML sequence',
  '/example/flow.excalidraw': 'Excalidraw scene',
  '/example/process.drawio': 'draw.io process',
  '/example/book.epub': 'EPUB ebook',
  '/example/format-matrix.fb2': 'FictionBook 2 ebook',
  '/example/book.umd': 'UMD ebook',
  '/example/en/archive.zip': 'ZIP archive with English samples',
  '/example/en/archive.tar.gz': 'TAR.GZ archive with English samples',
  '/example/encrypted.zip': 'Encrypted ZIP (password: flyfish)',
  '/example/sample.eml': 'EML message',
  '/example/sample.msg': 'MSG Outlook message',
  '/example/sample.mbox': 'MBOX mailbox',
  '/example/sample.olb': 'OLB library',
  '/example/sample.dra': 'DRA design archive',
  '/example/layout.gds': 'GDSII layout',
  '/example/layout.oas': 'OAS layout',
  '/example/layout.oasis': 'OASIS layout',
  '/example/markdown.md': 'Markdown document',
  '/example/notes.markdown': 'Markdown notes',
  '/example/text.txt': 'Plain text',
  '/example/app.log': 'Application log',
  '/example/en/markdown.md': 'Markdown product guide',
  '/example/en/notes.markdown': 'Markdown support notes',
  '/example/en/text.txt': 'Plain text overview',
  '/example/en/app.log': 'Application log stream',
  '/example/en/table.csv': 'CSV revenue table',
  '/example/en/data.json': 'JSON capability data',
  '/example/en/data.jsonc': 'JSONC config sample',
  '/example/en/data.json5': 'JSON5 config sample',
  '/example/en/code.ts': 'TypeScript integration sample',
  '/example/en/code.js': 'JavaScript integration sample',
  '/example/en/model.gltf': 'glTF embedded model',
  '/example/model.step': 'STEP engineering model',
  '/example/en/map.geojson': 'GeoJSON Bay route',
  '/example/change.patch': 'Patch side-by-side diff',
  '/example/repository.bundle': 'Git bundle history',
  '/example/sample.sqlite': 'SQLite database',
  '/example/module.wasm': 'WASM module',
  '/example/design.psd': 'PSD layers',
  '/example/icon.ico': 'ICO image',
  '/example/ct-small.dcm': 'DICOM real CT image (public pydicom sample)',
  '/example/signature-invoice-cades-bes.pdf.p7m': 'CAdES-BES digital signature P7M'
}

export const sampleGroupsEn: DemoSampleGroup[] = sampleGroupsZh.map((group, index) => ({
  ...group,
  ...(englishGroupCopy[index] || {}),
  items: group.items.map(item => {
    const nextUrl = englishSampleUrlMap[item.url] || item.url
    return {
      url: nextUrl,
      name: englishSampleNameMap[nextUrl] || englishSampleNameMap[item.url] || item.name
    }
  })
}))


const japaneseGroupCopy: Array<Pick<DemoSampleGroup, 'title' | 'description'>> = [
  { title: '文書', description: 'Word、PDF、OFD、Typst' },
  { title: 'スプレッドシート', description: 'Excel、CSV、ODS' },
  { title: 'プレゼンテーションと CAD', description: 'PowerPoint と工学図面' },
  { title: 'マインドマップと図表', description: 'XMind、Mermaid、PlantUML、draw.io' },
  { title: '3D モデルと地理空間データ', description: 'メッシュ、CAD カーネル、GeoJSON' },
  { title: '電子書籍', description: 'EPUB と UMD' },
  { title: '圧縮ファイル', description: 'ZIP、TAR.GZ、暗号化ファイル' },
  { title: 'メールと EDA', description: 'メール、OrCAD、IC レイアウト' },
  { title: 'テキスト', description: 'Markdown、テキスト、ログ' },
  { title: 'フロントエンドとデータ', description: 'Web ソース、設定、Notebook' },
  { title: 'バックエンドとシステム', description: 'Shell、SQL、コンパイル言語' },
  { title: 'アセットとデータ', description: 'データベース、WASM、デザインアセット' },
  { title: '医療画像と電子署名', description: 'DICOM / CMS / CAdES' },
  { title: 'メディア', description: '画像、音声、動画' }
]

const japaneseSampleNameMap: Record<string, string> = {
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
  '/example/table.csv': 'CSV テーブル',
  '/example/excel.ods': 'ODS スプレッドシート',
  '/example/en/sample-presentation.pptx': 'NASA 月面戦略 PPTX',
  '/example/office-demo.ppt': 'PowerPoint 97–2003 サンプル',
  '/example/drawing.dxf': 'DXF 図面',
  '/example/sample.dwg': 'DWG Autodesk サンプル',
  '/example/mindmap.xmind': 'XMind マインドマップ',
  '/example/architecture.mermaid': 'Mermaid アーキテクチャ図',
  '/example/sequence.plantuml': 'PlantUML シーケンス図',
  '/example/process.drawio': 'draw.io プロセス図',
  '/example/book.epub': 'EPUB 電子書籍',
  '/example/book.umd': 'UMD 電子書籍',
  '/example/en/archive.zip': '日本語 UI 用 ZIP サンプル',
  '/example/en/archive.tar.gz': 'TAR.GZ サンプル',
  '/example/encrypted.zip': '暗号化 ZIP（パスワード：flyfish）',
  '/example/sample.eml': 'EML メッセージ',
  '/example/sample.msg': 'MSG Outlook メッセージ',
  '/example/sample.mbox': 'MBOX メールボックス',
  '/example/markdown.md': 'Markdown 文書',
  '/example/en/markdown.md': 'Markdown 製品ガイド',
  '/example/en/notes.markdown': 'Markdown サポートノート',
  '/example/en/text.txt': 'プレーンテキスト概要',
  '/example/en/app.log': 'アプリケーションログ',
  '/example/en/table.csv': 'CSV 売上テーブル',
  '/example/en/data.json': 'JSON 機能データ',
  '/example/en/data.jsonc': 'JSONC 設定サンプル',
  '/example/en/data.json5': 'JSON5 設定サンプル',
  '/example/en/code.ts': 'TypeScript 組み込みサンプル',
  '/example/en/code.js': 'JavaScript 組み込みサンプル',
  '/example/en/model.gltf': 'glTF 埋め込みモデル',
  '/example/model.step': 'STEP 工学モデル',
  '/example/en/map.geojson': 'GeoJSON 湾岸ルート',
  '/example/change.patch': 'Patch 左右比較',
  '/example/repository.bundle': 'Git bundle 履歴',
  '/example/sample.sqlite': 'SQLite データベース',
  '/example/module.wasm': 'WASM モジュール',
  '/example/design.psd': 'PSD レイヤー',
  '/example/icon.ico': 'ICO 画像',
  '/example/ct-small.dcm': 'DICOM 実 CT 画像（pydicom 公開サンプル）',
  '/example/signature-invoice-cades-bes.pdf.p7m': 'CAdES-BES 電子署名 P7M'
}

export const sampleGroupsJa: DemoSampleGroup[] = sampleGroupsZh.map((group, index) => ({
  ...group,
  ...(japaneseGroupCopy[index] || {}),
  items: group.items.map(item => {
    const nextUrl = englishSampleUrlMap[item.url] || item.url
    return {
      url: nextUrl,
      name: japaneseSampleNameMap[nextUrl] || japaneseSampleNameMap[item.url] ||
        englishSampleNameMap[nextUrl] || englishSampleNameMap[item.url] || item.name
    }
  })
}))

// This union serves URL matching and upload-extension coverage across locales.
export const allDemoPresetFiles = [...sampleGroupsZh, ...sampleGroupsEn, ...sampleGroupsJa]
  .flatMap(group => group.items)
