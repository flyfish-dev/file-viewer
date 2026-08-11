# Public Sample Sources

本目录中的 PDF、DOCX、PPT、PPTX、CAD、OpenDocument、3D 模型、绘图、音视频、EPUB 和 MSG 示例文件使用项目方提供的真实资料、可追溯的公开样本或项目内最小夹具；RTF、FODS、地理数据、MIDI、SQLite、WASM、UMD、EML、MBOX、XMind、Mermaid、PlantUML、PSD、Git patch、Git bundle、OLB、DRA、GDS、OAS/OASIS 和压缩包示例文件由项目内生成，用于固定回归对应结构。后续替换这些文件时，请优先选择许可清楚、可直接访问 raw 文件的公开仓库、国际组织公开文档或项目方明确授权的资料，并同步更新本文件与 `README.md`。

| Local file | Source | License | Purpose |
| --- | --- | --- | --- |
| `drawing.dxf` | `https://github.com/mozman/ezdxf/blob/master/examples_dxf/wipeout_door.dxf` | MIT | Real DXF CAD drawing for pan, zoom and layer smoke tests |
| `word.docx` | `https://www.basel.int/Portals/4/download.aspx?d=UNEP-CHW.15-6-Add.5-Rev.1.Chinese.docx` | Public Basel Convention document, source attribution required | Rich Chinese DOCX preview with headings, long-form text, tables, drawings, responsive white paper and print/export smoke tests |
| `en/calibre-demo.docx` | `https://calibre-ebook.com/downloads/demos/demo.docx` | calibre public demo document by Kovid Goyal / calibre project | Rich English DOCX preview with typography, headings, lists, tables and conversion-oriented Word features |
| `template.dot` | Copied from project `test.doc` fixture and saved with the Word 97-2003 template extension | Apache-2.0 | DOT extension routing smoke test for legacy Word template preview |
| `ppt.pptx` | `https://science.nasa.gov/wp-content/uploads/2023/11/day2-1630-pac-lunarstrategy-noble-nov2023.pptx` | NASA public media usage guidelines; acknowledge NASA and do not imply endorsement | Professional NASA lunar science strategy deck for rich backgrounds, imagery, section pages, dense text, comparison layouts and multi-page PPTX rendering |
| `office-demo.ppt` | `@file-viewer/ppt` upstream public browser fixture at `office-render-demo/public/samples/office-demo.ppt` | Project-owner authorized Demo distribution and renderer regression use | Real PowerPoint 97–2003 binary deck for native WASM parsing, multi-slide Canvas output, unified zoom, print and PPT/PPTX route isolation |
| `en/sample-presentation.pptx` | Same NASA public deck as `ppt.pptx` | NASA public media usage guidelines; acknowledge NASA and do not imply endorsement | English PPTX smoke test with the same professional 20-slide deck used by the default presentation entry |
| `en/financial-sample.xlsx` | `https://learn.microsoft.com/en-us/power-bi/create-reports/sample-financial-download` direct download `https://go.microsoft.com/fwlink/?LinkID=521962` | Microsoft public sample workbook | English XLSX workbook with multiple business fields for spreadsheet tabs, styles, column sizing and print smoke tests |
| `pdf.pdf` | Project-owner provided `PDF沉浸式翻译技术说明.pdf` | Demo distribution authorized by project owner | 13-page PDF toolbar, scale, page/tree sidebar, print, export and dark-shell isolation smoke tests |
| `en/prince-sample.pdf` | `https://www.princexml.com/samples/magic6/magic.pdf` | Prince / YesLogic public sample PDF | English PDF sample covering CSS print features, tables, columns, bookmarks, math and multi-page layout |
| `en/markdown.md` / `en/notes.markdown` / `en/text.txt` / `en/app.log` / `en/table.csv` / `en/data.json` / `en/data.jsonc` / `en/data.json5` / `en/code.ts` / `en/code.js` | Project-authored English fixtures based on common integration, support, config and log scenarios | Apache-2.0 | Lightweight English demo set for Markdown, text, log, CSV, JSON/JSONC/JSON5 and source-code preview without adding heavy network assets |
| `en/map.geojson` | Project-authored GeoJSON fixture inspired by common OpenLayers / GeoJSON demo structures | Apache-2.0 | English geospatial route and point sample for offline GeoJSON rendering, search and zoom smoke tests |
| `en/model.gltf` | Project-authored embedded glTF 2.0 triangle fixture after reviewing Khronos glTF sample conventions | Apache-2.0 | Lightweight English 3D sample with embedded buffer so the demo stays fully offline and needs no sidecar asset |
| `sample.dwg` | `https://download.autodesk.com/us/samplefiles/acad/blocks_and_tables_-_imperial.dwg` | Autodesk public AutoCAD sample file | Official Autodesk DWG sample for Worker + LibreDWG WASM geometry, blocks and table smoke tests |
| `samples/apache/blocks_and_tables.dwf` | `https://issues.apache.org/jira/browse/TIKA-1823` attachment `blocks_and_tables.dwf` | Apache Software Foundation Jira attachment | Native DWF 6 container smoke test for blocks, tables, W2D graphics and MIME/header handling |
| `samples/autodesk/house.dwfx` | `https://github.com/Developer-Autodesk/viewer-javascript-tutorial/blob/master/Sample%20files/House.dwfx` | MIT | Official Autodesk Viewer tutorial DWFx sample for native DWFx/XPS rendering, multi-page structure and CAD viewport smoke tests |
| `samples/autodesk/robot-arm.dwfx` | `https://github.com/Developer-Autodesk/viewer-javascript-tutorial/blob/master/Sample%20files/RobotArm1.dwfx` | MIT | Official Autodesk Viewer tutorial DWFx sample for W2D/W3D native rendering and assembly drawing smoke tests |
| `model.gltf` / `model.obj` / `model.stl` / `model.ply` | Project-generated minimal fixtures | Apache-2.0 | Lightweight Three.js model rendering smoke tests |
| `model.step` | `occt-import-js` upstream `test/testfiles/simple-basic-cube/cube.stp` (upstream records the original as `https://grabcad.com/library/simple-basic-cube`) | occt-import-js upstream fixture; redistributed with upstream attribution | Browser-native OpenCascade/WASM STEP tessellation, hierarchy, material, fit and unified zoom regression |
| `mindmap.xmind` | Project-generated with `@ljheee/xmind-parser` | Apache-2.0 | XMind 2020+ package fixture for sheet tabs, tree layout, labels, notes, links, search, zoom, print and HTML export smoke tests |
| `architecture.mermaid` | Project-authored Mermaid fixture | Apache-2.0 | Mermaid architecture and flowchart route for official renderer, theme and Panzoom smoke tests |
| `sequence.plantuml` | Project-authored PlantUML fixture | Apache-2.0 | PlantUML sequence route for encoder, configurable SVG endpoint, theme shell and Panzoom smoke tests |
| `flow.excalidraw` | `https://github.com/neo4j-labs/agent-memory/blob/main/docs/assets/images/diagrams/excalidraw/poleo-model.excalidraw` | Apache-2.0 | Real Excalidraw scene for read-only SVG smoke tests |
| `process.drawio` | `https://github.com/jgraph/drawio-diagrams/blob/dev/blog/data-flow.drawio` | Apache-2.0 | Official draw.io sample for diagrams.net viewer smoke tests |
| `book.umd` | 项目内生成的最小 UMD 文本电子书 fixture | Apache-2.0 | UMD ebook metadata, table-of-contents and zlib text smoke tests |
| `document.odt` | `https://wiki.documentfoundation.org/File:Book-template-0-2.odt` | CC-BY-SA-3.0 / LGPL-3.0+ / MPL-1.1 | Real The Document Foundation ODT template for OpenDocument text route smoke tests |
| `excel.ods` | `https://wiki.documentfoundation.org/File:Fixture_Copa_del_Mundo_2014.ods` | CC-BY-SA-3.0 | Real The Document Foundation ODS spreadsheet for OpenDocument sheet tabs, data and style smoke tests |
| `slides.odp` | `https://wiki.documentfoundation.org/File:QA_Impress_Example_01_ODP_File.odp` | CC-BY-SA-3.0 via The Document Foundation Wiki default contribution license | Real The Document Foundation ODP presentation for OpenDocument slide outline smoke tests |
| `excel.fods` | Project-authored Flat ODS XML fixture | Apache-2.0 | Standards-conforming Flat OpenDocument spreadsheet route smoke test |
| `sample.rtf` | Project-generated compatible document fixture | Apache-2.0 | RTF route smoke test |
| `map.geojson` / `route.kml` / `track.gpx` | Project-generated lightweight geospatial fixtures | Apache-2.0 | GeoJSON, KML and GPX normalization plus offline SVG map smoke tests |
| `report.typ` | Project-generated Typst multi-page fixture | Apache-2.0 | Direct Typst browser WASM rendering and smoke tests |
| `archive.zip` / `archive.tar.gz` | Project-packaged PDF, public DOCX, Markdown, TypeScript and JSON sample set | See bundled file sources | Archive directory, lazy extraction, cache and nested preview smoke tests |
| `en/archive.zip` / `en/archive.tar.gz` | Project-packaged English DOCX, PDF, PPTX, XLSX, Markdown, text, log, CSV, JSON, TypeScript, JavaScript, GeoJSON and glTF sample set; the language-neutral binary PPT remains a shared fixture outside the archives | See bundled file sources | English archive directory, lazy extraction, cache and nested preview smoke tests |
| `sample.eml` | Project-generated MIME email fixture | Apache-2.0 | EML headers, text/html body, attachment download and attachment preview smoke tests |
| `sample.msg` | `https://github.com/HiraokaHyperTools/msgreader/blob/master/test/A%20memo.msg` | MIT | Outlook MSG parsing smoke test through @kenjiuno/msgreader |
| `sample.mbox` | Project-generated MBOX email archive fixture | Apache-2.0 | MBOX message detection and first-message preview smoke tests |
| `sample.olb` / `sample.dra` / `layout.gds` / `layout.oas` / `layout.oasis` | Project-generated EDA / layout fixtures | Apache-2.0 | OLB/DRA structure tree plus GDSII/OASIS readable-string, layer, cell, entity and diagnostic smoke tests |
| `design.psd` | Project-generated layered PSD fixture using `ag-psd` | Apache-2.0 | PSD layer list, visibility toggles, canvas redraw and zoom smoke tests |
| `change.patch` | Project-authored git patch fixture | Apache-2.0 | Side-by-side diff view, file list, syntax color and zoom smoke tests |
| `repository.bundle` | Project-generated git bundle fixture from a tiny local repository | Apache-2.0 | Git bundle refs, commit history, tree and readable blob preview smoke tests |
| `data.jsonc` / `data.json5` / `notebook.ipynb` / `config.toml` / `service.proto` / `infrastructure.hcl` / `formula.tex` / `graph.gv` / `request.http` / `component.react` / `code.rb` / `code.swift` / `Main.kt` | Project-authored source/config fixtures | Apache-2.0 | Expanded highlight.js language mapping smoke tests |
| `melody.mid` / `sample.sqlite` / `module.wasm` / `icon.ico` | Project-generated or favicon-derived fixtures | Apache-2.0 | MIDI, SQLite, WASM and ICO smoke tests |
| `audio.mp3` | `https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3` | CC0 | Small MP3 sample for native audio playback smoke tests |
| `audio.ogg` | `https://commons.wikimedia.org/wiki/File:Example.ogg` | CC BY-SA 3.0 | OGG Vorbis sample for native audio playback smoke tests |
| `book.epub` | `https://www.gutenberg.org/ebooks/928.epub3.images` | Public domain in the USA | EPUB sample for epubjs table-of-contents and paginated reading smoke tests |

运行时说明:

- `sample.dwg` 来自 Autodesk 官方 AutoCAD sample files 的 `blocks_and_tables_-_imperial.dwg`；运行时通过 `@flyfish-dev/cad-viewer` 按需加载 DWG Worker 和 LibreDWG WASM，验证浏览器本地 DWG 几何、块和表格预览链路。
- `samples/apache/blocks_and_tables.dwf` 来自 Apache Tika `TIKA-1823` 的公开 Jira 附件，保留 `(DWF V06.00)PK` 文件头，用于验证原生 DWF 6 ZIP 容器、块、表格、W2D 图形和 MIME/header 识别。
- `samples/autodesk/house.dwfx` 来自 Autodesk 官方 Viewer 教程仓库，用于验证 DWFx / XPS native renderer、图形、多页结构和视图适配；该文件约 17MB，但只在用户选择样例时按需加载。
- `samples/autodesk/robot-arm.dwfx` 同样来自 Autodesk 官方 Viewer 教程仓库，用于验证 W2D/W3D native renderer 和复杂装配图形。
- `word.docx` 来自 Basel Convention 公开中文正式文档，覆盖标题层级、长正文、表格、图示、白色纸张和完整打印回归；该样本保留真实文档复杂度，但避免默认 Demo 首屏触发超大 DOCX 保护。
- `en/calibre-demo.docx` 来自 calibre 官方 DOCX demo，用于英文浏览器默认 Demo，覆盖英文排版、标题、列表、表格和富文本结构。
- `template.dot` 复用 `test.doc` 的二进制内容，仅用于验证 Word 97-2003 模板扩展名能正确进入老 Word 渲染链路。
- `ppt.pptx` 与 `en/sample-presentation.pptx` 均来自 NASA Science 公开的 `Implementation Plan for a NASA Integrated Lunar Science Strategy in the Artemis Era` 演示稿，覆盖星云封面、深色引用页、分栏信息页、图文混排、正式页眉页脚和 20 页真实演示稿结构；使用时按 NASA 媒体使用说明注明来源，不暗示 NASA 对项目背书。
- `office-demo.ppt` 来自 `@file-viewer/ppt` 上游公开浏览器的固定回归样例，按项目方授权用于 Demo 分发和预览验收；它是中英文 Demo 共用的语言中立 PPT fixture，仅用于验证 `@file-viewer/ppt@0.3.3` Worker/OffscreenCanvas/WASM 链路与 PPTX Worker 链路彼此隔离。
- `en/financial-sample.xlsx` 来自 Microsoft Power BI Financial Sample Workbook，用于英文 Excel 多业务字段、sheet 标签、列宽和打印回归。
- `pdf.pdf` 是项目方提供的 13 页真实技术说明 PDF，覆盖缩放、页侧边栏、树形导航、打印、导出和暗色外壳隔离回归。
- `en/prince-sample.pdf` 来自 Prince 官方 Sample Documents，用于英文 PDF 默认样例，覆盖打印 CSS、分栏、目录、表格和多页布局。
- `en/markdown.md`、`en/notes.markdown`、`en/text.txt`、`en/app.log`、`en/table.csv`、`en/data.json`、`en/data.jsonc`、`en/data.json5`、`en/code.ts` 和 `en/code.js` 是项目内英文轻量夹具，用于保证英文 demo 在文本、代码、配置、日志和数据类格式下不只换标签，也能打开英文内容。
- `en/map.geojson` 是项目内英文 GeoJSON 夹具，覆盖点、线路和属性表；`en/model.gltf` 是嵌入 buffer 的 glTF 2.0 夹具，避免英文 3D demo 依赖额外 `.bin` sidecar 或公网资源。
- `model.gltf`、`model.obj`、`model.stl` 和 `model.ply` 是项目内最小 3D fixture；`model.step` 来自 `occt-import-js` 上游基础立方体回归样例，用于强制验证离线 OCCT Worker/WASM 真正生成网格，而不是落入转换提示。
- `mindmap.xmind` 由项目内使用 `@ljheee/xmind-parser` 生成，覆盖 XMind 2020+ 多 sheet、节点、标签、备注、链接、标记、目录、缩放、搜索、打印和 HTML 导出链路。
- `architecture.mermaid` 和 `sequence.plantuml` 是项目内绘制的最小但完整的架构图/时序图样例，用于验证 Mermaid 官方 renderer、PlantUML SVG 服务、主题容器、拖拽平移和统一缩放。
- `design.psd` 由项目内使用 `ag-psd` 生成，覆盖多图层、图层显隐、重绘、透明背景和缩放链路。
- `change.patch` 用于验证 `diff2html` 左右比对视图；`repository.bundle` 用于验证浏览器端 Git bundle header、refs、commit/tree/blob 解析和 delta pack 边界提示。
- `flow.excalidraw` 默认使用 rough.js 输出只读 SVG；运行环境提供官方 Excalidraw ESM 模块时会优先尝试 `restore` + `exportToSvg`。
- `process.drawio` 由 diagrams.net 官方 `GraphViewer` 解析，组件不自行实现 draw.io 方言解析。
- `audio.mp3` 与 `audio.ogg` 只用于验证浏览器原生音频播放能力；不同浏览器对编码的支持存在差异。
- `melody.mid` 是最小 MIDI fixture，用于验证 `@tonejs/midi` 只在 MIDI 命中时按需加载并展示轨道、时长和音符摘要。
- `book.epub` 来自 Project Gutenberg，运行时由 `epubjs` 解析 EPUB 包、目录和章节资源。
- `book.umd` 由项目内生成，覆盖 UMD 文件头、元数据、章节偏移、章节标题和 zlib 压缩正文段。
- `report.typ` 由项目内编写，覆盖 Typst 标题、表格、公式、代码块、多页输出、页面尺寸和打印/HTML 导出，线上 Demo 会直接读取源文件并通过浏览器端 WASM 编译预览。
- `archive.zip` 与 `archive.tar.gz` 由本目录中的 PDF、DOCX、Markdown、TypeScript 和 JSON 示例打包，用于验证 `libarchive.js` Worker、按需解压、IndexedDB 缓存和内部文件继续预览；其中 DOCX 同步使用当前公开中文 Word 样例。
- `en/archive.zip` 与 `en/archive.tar.gz` 由英文 DOCX、PDF、PPTX、XLSX、Markdown、文本、日志、CSV、JSON、TypeScript、JavaScript、GeoJSON 和 glTF 示例打包，用于英文环境下验证压缩包目录、按需解压、缓存和内部文件继续预览。
- `sample.eml` 是标准 MIME fixture，用于验证 EML 头信息、HTML/文本正文和附件链路。
- `sample.msg` 来自 `HiraokaHyperTools/msgreader` 测试样例，用于验证 Outlook MSG 解析。
- `sample.mbox` 是项目内生成的邮件归档 fixture，用于验证 MBOX 归档识别和首封邮件预览。
- `sample.olb` 与 `sample.dra` 是项目内生成的 CFB 夹具，用于验证 OLB / DRA 结构树、对象候选、属性和可读字符串索引；`layout.gds`、`layout.oas` 和 `layout.oasis` 用于验证 GDSII / OASIS 版图结构退化预览、实体候选和诊断信息。
- `document.odt`、`excel.ods` 和 `slides.odp` 均来自 The Document Foundation Wiki 的真实公开 OpenDocument 文件，用于验证 ODT 正文、ODS 工作表和 ODP 幻灯片包结构读取；`excel.fods` 是标准 Flat ODS XML 夹具，用于验证平面 OpenDocument 表格入口。
- `sample.rtf` 是项目内生成的兼容文档 fixture，用于验证 RTFJS 读取。
- `map.geojson`、`route.kml` 和 `track.gpx` 是项目内生成的轻量地理数据 fixture，用于验证 GeoJSON/KML/GPX 标准化和离线 SVG 地图预览。
- `sample.sqlite`、`module.wasm` 和 `icon.ico` 用于验证结构化数据、WASM 模块摘要和 ICO 图标预览；`data.jsonc` 等工程文本 fixture 用于验证新增 highlight.js 扩展名映射。
