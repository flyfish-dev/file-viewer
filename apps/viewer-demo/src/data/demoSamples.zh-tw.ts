import type { DemoSampleGroup } from './demoSamples'

export const sampleGroupsZhTW: DemoSampleGroup[] = [
  {
    title: '文件',
    description: 'Word / Apple Pages / Hangul / PDF / OFD / Typst',
    family: 'word',
    items: [
      { name: 'DOC', url: '/example/test.doc' },
      { name: 'DOC 文字修訂', url: '/example/word-revisions.doc' },
      { name: 'WPS 銷售合同 DOC', url: '/example/word-wps-contract.doc' },
      { name: 'Word 原生修訂 DOC', url: '/example/word-native-revisions.doc' },
      { name: 'Word 原生修訂 DOCX', url: '/example/word-native-revisions.docx' },
      { name: 'OFD 巢狀資源', url: '/example/ofd-resource-paths.ofd' },
      { name: 'DOCX 封面邊框', url: '/example/word-cover.docx' },
      { name: 'DOCX 中文長篇文件', url: '/example/word.docx' },
      { name: 'DOCX 英文格式參考', url: '/example/en/calibre-demo.docx' },
      { name: 'DOT 模板', url: '/example/template.dot' },
      { name: 'RTF', url: '/example/sample.rtf' },
      { name: 'ODT', url: '/example/document.odt' },
      { name: 'Pages（Apple 15.3.1 原生高保真樣例）', url: '/example/apple-pages-experimental.pages' },
      { name: 'WordPerfect 5.0 文件', url: '/example/wordperfect-wp50.wp' },
      { name: 'WordPerfect 6.x 文件', url: '/example/wordperfect-wp6.wpd' },
      { name: 'HWP v5 表格', url: '/example/hwplib-table.hwp' },
      { name: 'HWP v5 圖片', url: '/example/hwplib-image.hwp' },
      { name: 'HWPX 樣式文件', url: '/example/hwpxlib-sample1.hwpx' },
      { name: 'HWPX 合併表格', url: '/example/hwpxlib-simple-table.hwpx' },
      { name: 'HWPX 圖片', url: '/example/hwpxlib-simple-picture.hwpx' },
      { name: 'PDF 技術說明', url: '/example/pdf.pdf' },
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
      { name: 'Numbers（Apple 15.3.1 原生高保真樣例）', url: '/example/excel.numbers' }
    ]
  },
  {
    title: '簡報與圖面',
    description: 'PPT / PPTX / CAD',
    family: 'cad',
    items: [
      { name: 'PowerPoint 97–2003', url: '/example/office-demo.ppt' },
      { name: 'POT 二進位制模板', url: '/example/format-matrix-template.pot' },
      { name: 'NASA 月球戰略 PPTX', url: '/example/ppt.pptx' },
      { name: 'Keynote（Apple 15.3.1 原生高保真樣例）', url: '/example/apple-keynote-experimental.key' },
      { name: 'ODP', url: '/example/slides.odp' },
      { name: 'DXF', url: '/example/drawing.dxf' },
      { name: 'DWG', url: '/example/sample.dwg' },
      { name: 'DWF Blocks/Tables', url: '/example/samples/apache/blocks_and_tables.dwf' },
      { name: 'DWFx House', url: '/example/samples/autodesk/house.dwfx' },
      { name: 'DWFx RobotArm', url: '/example/samples/autodesk/robot-arm.dwfx' }
    ]
  },
  {
    title: '腦圖與繪圖',
    description: 'XMind / Mermaid / PlantUML / draw.io / BPMN',
    family: 'drawing',
    items: [
      { name: 'XMind 腦圖', url: '/example/mindmap.xmind' },
      { name: 'Mermaid 架構圖', url: '/example/architecture.mermaid' },
      { name: 'PlantUML 時序圖', url: '/example/sequence.plantuml' },
      { name: 'Excalidraw', url: '/example/flow.excalidraw' },
      { name: 'draw.io', url: '/example/process.drawio' },
      { name: 'BPMN 流程圖與原始碼', url: '/example/simple-process.bpmn' }
    ]
  },
  {
    title: '3D 模型和地理資料',
    description: 'GLTF / STEP / IFC / LAS / OBJ / STL / GeoJSON / KML / GPX',
    family: 'model',
    items: [
      { name: '低模狐狸（Khronos）', url: '/example/fox.glb' },
      { name: 'GLTF', url: '/example/model.gltf' },
      { name: 'STEP 工程模型', url: '/example/model.step' },
      { name: 'IFC4 建築模型（buildingSMART）', url: '/example/buildingSMART-ifc4-building.ifc' },
      { name: 'IFC4.3 建築模型（buildingSMART）', url: '/example/buildingSMART-ifc43-building.ifc' },
      { name: 'LAS 點雲（自動識別座標系）', url: '/example/point-cloud-citation.las' },
      { name: 'OBJ', url: '/example/model.obj' },
      { name: 'STL', url: '/example/model.stl' },
      { name: 'PLY', url: '/example/model.ply' },
      { name: 'GeoJSON', url: '/example/map.geojson' },
      { name: 'KML', url: '/example/route.kml' },
      { name: 'GPX', url: '/example/track.gpx' }
    ]
  },
  {
    title: '電子書',
    description: 'EPUB / FB2 / UMD / CHM',
    family: 'ebook',
    items: [
      { name: 'EPUB', url: '/example/book.epub' },
      { name: 'FB2', url: '/example/format-matrix.fb2' },
      { name: 'UMD', url: '/example/book.umd' },
      { name: 'CHM（PuTTY 官方手冊）', url: '/example/putty-0.85.chm' }
    ]
  },
  {
    title: '壓縮包',
    description: 'ZIP / TAR.GZ / 加密',
    family: 'archive',
    items: [
      { name: 'ZIP', url: '/example/archive.zip' },
      { name: 'TAR.GZ', url: '/example/archive.tar.gz' },
      { name: '加密 ZIP（密碼 flyfish）', url: '/example/encrypted.zip' }
    ]
  },
  {
    title: '郵件與 EDA',
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
    title: '文字',
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
    title: '前端與資料',
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
      { name: 'XML 發票（校驗與轉換）', url: '/example/xml-profiles/invoice-valid.xml' },
      { name: 'XML 發票（校驗失敗回退）', url: '/example/xml-profiles/invoice-invalid.xml' },
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
      { name: 'PATCH 左右比對', url: '/example/change.patch' },
      { name: 'Git Bundle', url: '/example/repository.bundle' }
    ]
  },
  {
    title: '後端與系統',
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
    title: '資產與資料',
    description: 'SQLite / WASM / ICO',
    family: 'data',
    items: [
      { name: 'SQLite', url: '/example/sample.sqlite' },
      { name: 'WASM', url: '/example/module.wasm' },
      { name: 'ICO', url: '/example/icon.ico' }
    ]
  },
  {
    title: '二進位制檢查器',
    description: 'HEX / PE / ELF / Mach-O / Java / 檔案簽名',
    family: 'binary',
    items: [
      { name: '原始位元組（128 KiB）', url: '/example/binary-raw.bin' },
      { name: 'PNG 檔案簽名結構', url: '/example/binary-png-signature.hex' },
      { name: 'WebAssembly 檔案簽名結構', url: '/example/binary-wasm-signature.hex' },
      { name: 'ELF 可執行結構', url: '/example/binary-elf.elf' },
      { name: 'PE 可執行結構（EXE）', url: '/example/binary-pe.exe' },
      { name: 'PE 動態庫結構（DLL）', url: '/example/binary-pe.dll' },
      { name: 'Mach-O 可執行結構', url: '/example/binary-macho.macho' },
      { name: 'ZIP 檔案簽名結構', url: '/example/binary-zip-signature.hex' },
      { name: 'Java Class 結構', url: '/example/binary-java.class' }
    ]
  },
  {
    title: 'Adobe 設計',
    description: 'PSD / PSB / AI / IDML / ICML / IDMS / INX / FLA / XFL / XD / INDD / Adobe 資源',
    family: 'design',
    items: [
      { name: 'PSD 圖層與合併圖', url: '/example/design.psd' },
      { name: 'PSB 4 畫素合併圖與只讀層樹（專案生成）', url: '/example/photoshop-grayscale.psb' },
      { name: 'PSDT 模板的 PSD v1 容器（專案生成）', url: '/example/photoshop-template.psdt' },
      { name: 'PDD PhotoDeluxe 的 PSD v1 容器（專案生成）', url: '/example/photodeluxe-document.pdd' },
      { name: 'AI 四畫板 PDF + 原生 PGF 圖層（CC0）', url: '/example/illustrator-grid.ai' },
      { name: 'AIT 模板 PDF + 原生 PGF 圖層（CC0）', url: '/example/illustrator-template.ait' },
      { name: 'EPS 向量與替代字型（專案生成）', url: '/example/postscript-vector.eps' },
      { name: 'PostScript 雙頁程式（專案生成）', url: '/example/postscript-pages.ps' },
      { name: 'IDML 雙頁 CPU WASM 渲染', url: '/example/indesign-layout.idml' },
      { name: 'ICML 真實 InCopy 樣式故事（Pandoc，GPL）', url: '/example/indesign-story.icml' },
      { name: 'IDMS 版面片段與故事（專案生成）', url: '/example/indesign-layout-fragment.idms' },
      { name: 'INX 960 柵格舊版交換檔案', url: '/example/indesign-grid-legacy.inx' },
      { name: 'FLA 現代壓縮 XFL 首幀與時間軸（專案生成）', url: '/example/animate-modern-xfl.fla' },
      { name: 'XD 多畫板嵌入預覽與結構', url: '/example/adobe-xd-grids.xd' },
      { name: 'INDD 2025 嚴格 XMP 預覽', url: '/example/indesign-2025.indd' },
      { name: 'INDT 2025 嚴格 XMP 預覽', url: '/example/indesign-template-2025.indt' },
      { name: 'ASE 分組色板（CC0）', url: '/example/adobe-palette.ase' },
      { name: 'ACO 多語言色板', url: '/example/adobe-colors.aco' },
      { name: 'ABR 148 個真實筆刷筆尖（CC0）', url: '/example/photoshop-brushes.abr' },
      { name: 'CSH 三個 Bezier 自定形狀（CC0）', url: '/example/photoshop-shapes.csh' },
      { name: 'PAT 圖案庫與畫素紋理（專案生成）', url: '/example/photoshop-patterns.pat' },
      { name: 'GRD 漸變預設與色標（專案生成）', url: '/example/photoshop-gradients.grd' },
      { name: 'ASL 圖層樣式描述符（專案生成）', url: '/example/photoshop-layer-styles.asl' }
    ]
  },
  {
    title: '醫療影像與數字簽名',
    description: 'DICOM / CMS / CAdES',
    family: 'signature',
    items: [
      { name: 'DICOM 真實 CT 影像（pydicom 公開樣例）', url: '/example/ct-small.dcm' },
      { name: 'CAdES-BES 數字簽名 P7M', url: '/example/signature-invoice-cades-bes.pdf.p7m' }
    ]
  },
  {
    title: '媒體',
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
      { name: 'TIFF（2 頁 CCITT G4）', url: '/example/multipage-ccitt-g4.tif' },
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
