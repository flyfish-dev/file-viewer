# Example

当前目录用于演示文件预览样例和格式兼容性。主示例页会从这里读取内置样本，覆盖当前已注册的主要格式入口。

PDF、DOCX、PPT、PPTX、CAD、OpenDocument、3D 模型、绘图、音视频、EPUB、MSG 等样例使用项目方提供的真实资料、可追溯的公开样本或项目内最小夹具；RTF、FODS、地理数据、MIDI、SQLite、WASM、UMD、EML、MBOX、OLB、DRA 和压缩包样例由项目内生成，来源和许可见下方“公开样例来源”。这样既能避免手写占位文件过于理想化，也方便后续升级依赖时复现真实文件的兼容性问题。

`en/` 目录是英文 Demo 专用样例体系。它包含公开英文 DOCX / PDF / PPTX / XLSX，以及项目内英文 Markdown、文本、日志、CSV、JSON、TypeScript、JavaScript、GeoJSON、glTF 和英文压缩包；二进制 PPT 复用语言中立的 `/example/office-demo.ppt` 上游回归样例。浏览器语言为非中文时会直接展示英文或语言中立内容，而不是只替换界面标签。

代码/配置/日志类样本刻意保留了更接近真实业务的结构，例如异步加载计划、文件类型识别、错误处理、配置嵌套、SQL CTE、Shell 参数处理和多语言类型定义。这样可以更充分地验证 `highlight.js` 对注释、字符串、泛型、对象嵌套、缩进、diff 和长行滚动的展示效果。

## 当前内置样本

- `test.doc`: 验证 `.doc` 老文档与 Word 风格页面容器
- `word.docx`: 使用 Basel Convention 公开中文正式文档验证现代 Word 长文档、标题层级、表格、图示、白色纸张和完整打印
- `template.dot`: 复用老 Word 二进制样本验证 `.dot` 模板兼容入口
- `sample.rtf`: 验证 RTF 富文本兼容预览
- `document.odt`: 使用 The Document Foundation 公开 ODT 模板验证 OpenDocument 文本文档入口
- `excel.xlsx`: 验证 `xlsx` 样式能力
- `excel.xlsm`: 验证 `xlsm` 扩展名入口
- `excel.xlsb`: 验证 `xlsb` 扩展名入口
- `excel.xls`: 验证 `xls` 扩展名入口
- `table.csv`: 验证 `csv` 表格入口
- `excel.ods`: 使用 The Document Foundation 公开 ODS 表格验证 `ods` 扩展名入口
- `excel.fods`: 使用标准 Flat ODS XML 夹具验证 `fods` 扩展名入口
- `excel.numbers`: 验证 `numbers` 扩展名入口
- `ppt.pptx`: 使用 NASA 公开月球科学战略演示稿验证 `pptx` 星云封面、深色引用页、图文混排、页眉页脚和多页专业版式
- `office-demo.ppt`: 复用 `@file-viewer/ppt` 公开浏览器回归样例，验证 PowerPoint 97–2003 二进制容器、多页 Canvas 渲染、统一缩放和打印
- `slides.odp`: 使用 The Document Foundation 公开 ODP 文件验证 OpenDocument 演示文稿入口
- `pdf.pdf`: 使用项目方提供的 13 页《PDF沉浸式翻译技术说明》验证长文档阅读、缩放工具栏、页面/目录导航、完整打印和 HTML 导出
- `ofd.ofd`: 验证 `ofd.js` 在线预览
- `report.typ`: 验证 Typst 源文件直接读取、浏览器 WASM 编译、按页预览、打印和 HTML 导出链路
- `drawing.dxf`: 使用公开 DXF CAD 样例验证图纸预览
- `sample.dwg`: 使用 Autodesk 官方 DWG 样例验证 Worker + LibreDWG WASM 几何解析
- `samples/apache/blocks_and_tables.dwf`: 使用 Apache Tika 公开 DWF 样例验证原生 DWF 容器、块和表格渲染
- `samples/autodesk/house.dwfx`: 使用 Autodesk 官方 Viewer 教程 DWFx 样例验证 native DWFx/XPS 渲染、多页结构和 CAD 视图适配
- `samples/autodesk/robot-arm.dwfx`: 使用 Autodesk 官方 Viewer 教程 DWFx 样例验证 W2D/W3D native renderer 和复杂装配图形
- `map.geojson`: 验证 GeoJSON 点线面离线地图预览
- `route.kml`: 验证 KML 转 GeoJSON 后预览
- `track.gpx`: 验证 GPX 轨迹转 GeoJSON 后预览
- `model.gltf`: 使用项目内最小 glTF 验证 Web 3D 预览
- `model.obj`: 使用项目内 OBJ 四面体验证 OBJ 几何预览
- `model.stl`: 使用项目内 STL 四面体验证 STL 几何预览
- `model.ply`: 使用项目内 PLY 四面体验证 PLY 几何预览
- `model.step`: 使用 `occt-import-js` 上游基础立方体 STEP 样例验证离线 OCCT Worker/WASM、网格生成与统一缩放
- `flow.excalidraw`: 使用公开 Excalidraw 图纸验证只读 SVG 预览
- `process.drawio`: 使用官方 draw.io 示例验证 diagrams.net 图纸预览
- `book.epub`: 使用 Project Gutenberg 公开 EPUB 验证电子书目录和滚动阅读
- `book.umd`: 验证 UMD 电子书元数据、目录和 zlib 正文解析
- `archive.zip`: 验证 ZIP 目录读取、按需解压、缓存和压缩包内文件预览
- `archive.tar.gz`: 验证 TAR.GZ 压缩包兼容入口和内部文件预览
- `sample.eml`: 验证 EML 头信息、HTML/文本正文、附件下载和附件预览
- `sample.msg`: 使用 msgreader 上游公开样例验证 Outlook MSG 解析
- `ct-small.dcm`: 使用 pydicom 公开的真实 CT DICOM 文件验证医疗影像解码、缩放、旋转和窗宽/窗位
- `signature-invoice-cades-bes.pdf.p7m`: 使用 Issue #206 贡献的 CC0-1.0 CAdES-BES 样例验证数字签名结构预览
- `sample.mbox`: 验证 MBOX 归档识别和首封邮件预览
- `sample.olb`: 使用项目内生成的 CFB 元件库夹具验证 OLB 结构树、元件属性和字符串预览
- `sample.dra`: 使用项目内生成的 CFB 封装图纸夹具验证 DRA 图纸、封装、Padstack 和属性预览
- `markdown.md`: 验证 Markdown 阅读样式
- `notes.markdown`: 验证 Markdown 长扩展名
- `text.txt`: 验证纯文本预览
- `data.json`: 验证 JSON 高亮
- `data.jsonc`: 验证 JSONC 配置高亮
- `data.json5`: 验证 JSON5 宽松对象语法高亮
- `notebook.ipynb`: 验证 Jupyter Notebook JSON 结构预览
- `code.js`: 验证 JavaScript 高亮
- `code.mjs`: 验证 ES Module JavaScript 高亮
- `code.cjs`: 验证 CommonJS JavaScript 高亮
- `code.ts`: 验证 TypeScript 高亮
- `code.tsx`: 验证 TSX 高亮
- `code.jsx`: 验证 JSX 高亮
- `code.css`: 验证 CSS 高亮
- `page.html`: 验证 HTML 源码高亮，不执行页面脚本
- `page.htm`: 验证 HTM 源码高亮，不执行页面脚本
- `data.xml`: 验证 XML 高亮
- `component.vue`: 验证 Vue 单文件组件高亮
- `config.yaml`: 验证 YAML 高亮
- `config.yml`: 验证 YML 高亮
- `config.toml`: 验证 TOML 高亮
- `settings.ini`: 验证 INI 高亮
- `service.proto`: 验证 Protocol Buffers IDL 展示
- `infrastructure.hcl`: 验证 HCL 配置展示
- `formula.tex`: 验证 TeX / LaTeX 源码展示
- `graph.gv`: 验证 Graphviz DOT 源码展示
- `request.http`: 验证 HTTP 请求片段展示
- `script.sh`: 验证 Shell 脚本高亮
- `script.bash`: 验证 Bash 脚本高亮
- `query.sql`: 验证 SQL 高亮
- `main.go`: 验证 Go 高亮
- `main.rs`: 验证 Rust 高亮
- `code.rb`: 验证 Ruby 高亮
- `code.swift`: 验证 Swift 高亮
- `Main.kt`: 验证 Kotlin 高亮
- `component.react`: 验证 React 片段入口
- `index.php`: 验证 PHP 高亮
- `main.c`: 验证 C 高亮
- `main.cpp`: 验证 C++ 高亮
- `module.cc`: 验证 C++ 兼容扩展名高亮
- `main.h`: 验证 C/C++ 头文件高亮
- `main.hpp`: 验证 C++ 头文件高亮
- `program.cs`: 验证 C# 高亮
- `change.diff`: 验证 diff 高亮
- `code.java`: 验证 Java 高亮
- `code.py`: 验证 Python 高亮
- `app.log`: 验证日志文件预览
- `pic.png`: 验证 PNG 图片预览
- `pic.jpg`: 验证 JPG 图片预览
- `pic.jpeg`: 验证 JPEG 图片预览
- `pic.gif`: 验证 GIF 图片预览
- `pic.bmp`: 验证 BMP 图片预览
- `pic.tiff`: 验证 TIFF 图片预览
- `pic.tif`: 验证 TIF 图片预览
- `multipage-ccitt-g4.tif`: GitHub #208 的两页 CCITT Group 4 TIFF 回归样例
- `vector.svg`: 验证 SVG 图片预览
- `pic.webp`: 验证 WEBP 图片预览
- `audio.mp3`: 使用 MDN CC0 音频验证 MP3 原生播放
- `audio.ogg`: 使用 Wikimedia Commons 音频验证 OGG 原生播放
- `melody.mid`: 验证 MIDI 轨道、时长和音符摘要
- `video.mp4`: 验证视频播放
- `icon.ico`: 验证 ICO 图标预览
- `sample.sqlite`: 验证 SQLite 表结构和少量行预览
- `module.wasm`: 验证 WASM 模块导入导出摘要

## 说明

部分兼容扩展名样本复用了同一份可解析文件内容来确认渲染入口，例如表格兼容格式和图片兼容格式。生产上线前，仍建议用业务真实文件补一轮回归。

## 公开样例来源

| 文件 | 公开来源 | 许可 |
| --- | --- | --- |
| `drawing.dxf` | `mozman/ezdxf` 的 `examples_dxf/wipeout_door.dxf` | MIT |
| `word.docx` | Basel Convention 的公开中文正式文档 `UNEP-CHW.15-6-Add.5-Rev.1.Chinese.docx` | 公开下载，需保留来源归属 |
| `template.dot` | 复用项目内 `test.doc` fixture 并以 Word 97-2003 模板扩展名保存 | Apache-2.0 |
| `ppt.pptx` | NASA Science 的 `day2-1630-pac-lunarstrategy-noble-nov2023.pptx` 月球科学战略演示稿 | NASA public media usage guidelines, acknowledge NASA and do not imply endorsement |
| `office-demo.ppt` | `@file-viewer/ppt` 上游公开浏览器样例 `office-render-demo/public/samples/office-demo.ppt` | 项目方授权用于 Demo 分发与渲染回归；仅作预览验收文件 |
| `pdf.pdf` | 项目方提供的《PDF沉浸式翻译技术说明》真实示例文档 | 项目 Demo 授权 |
| `sample.dwg` | Autodesk 官方 AutoCAD sample files 的 `blocks_and_tables_-_imperial.dwg` | Autodesk public AutoCAD sample file |
| `samples/apache/blocks_and_tables.dwf` | Apache Tika `TIKA-1823` 的 `blocks_and_tables.dwf` Jira 附件 | Apache Software Foundation Jira attachment |
| `samples/autodesk/house.dwfx` | Autodesk `viewer-javascript-tutorial` 的 `Sample files/House.dwfx` 官方样例 | MIT |
| `samples/autodesk/robot-arm.dwfx` | Autodesk `viewer-javascript-tutorial` 的 `Sample files/RobotArm1.dwfx` 官方样例 | MIT |
| `model.gltf` / `model.obj` / `model.stl` / `model.ply` | 项目内生成的最小 3D fixture | Apache-2.0 |
| `model.step` | `occt-import-js` 上游 `simple-basic-cube/cube.stp`（上游记录原始来源为 GrabCAD simple-basic-cube） | 保留上游来源归属；仅用于解析回归 |
| `flow.excalidraw` | `neo4j-labs/agent-memory` 的 `poleo-model.excalidraw` | Apache-2.0 |
| `process.drawio` | `jgraph/drawio-diagrams` 的 `blog/data-flow.drawio` | Apache-2.0 |
| `book.umd` | 项目内生成的最小 UMD 文本电子书 fixture | Apache-2.0 |
| `document.odt` | The Document Foundation Wiki 的 `Book-template-0-2.odt` | CC-BY-SA-3.0 / LGPL-3.0+ / MPL-1.1 |
| `excel.ods` | The Document Foundation Wiki 的 `Fixture_Copa_del_Mundo_2014.ods` | CC-BY-SA-3.0 |
| `slides.odp` | The Document Foundation Wiki 的 `QA_Impress_Example_01_ODP_File.odp` | CC-BY-SA-3.0 |
| `excel.fods` | 项目内编写的标准 Flat ODS XML fixture | Apache-2.0 |
| `sample.rtf` | 项目内生成的兼容文档 fixture | Apache-2.0 |
| `map.geojson` / `route.kml` / `track.gpx` | 项目内生成的轻量地理数据 fixture | Apache-2.0 |
| `sample.mbox` | 项目内生成的 MBOX 邮件归档 fixture | Apache-2.0 |
| `data.jsonc` / `data.json5` / `notebook.ipynb` / `config.toml` / `service.proto` / `infrastructure.hcl` / `formula.tex` / `graph.gv` / `request.http` / `component.react` / `code.rb` / `code.swift` / `Main.kt` | 项目内编写的工程文本和代码 fixture | Apache-2.0 |
| `melody.mid` / `sample.sqlite` / `module.wasm` / `icon.ico` | 项目内生成或复用 favicon 的资产/数据 fixture | Apache-2.0 |
| `archive.zip` / `archive.tar.gz` | 项目内打包的 PDF、公开 DOCX、Markdown、TypeScript 和 JSON 示例集合 | 随内部文件来源 |
| `en/archive.zip` / `en/archive.tar.gz` | 项目内打包的英文 DOCX、PDF、PPTX、XLSX、Markdown、文本、日志、CSV、JSON、代码、GeoJSON 和 glTF 示例集合；语言中立的二进制 PPT 保持为归档外共享样例 | 随内部文件来源 |
| `sample.eml` | 项目内生成的标准 MIME 邮件 fixture | Apache-2.0 |
| `sample.msg` | `HiraokaHyperTools/msgreader` 的 `test/A memo.msg` | MIT |
| `ct-small.dcm` | pydicom `CT_small.dcm` pinned at `f5eeee05a99cd296350dd87fa6267cc5fa8a81fb` | MIT |
| `signature-invoice-cades-bes.pdf.p7m` | Issue #206 贡献的公开合成身份 CAdES-BES fixture | CC0-1.0 |
| `sample.olb` / `sample.dra` | 项目内生成的 CFB EDA fixture | Apache-2.0 |
| `report.typ` | 项目内编写的 Typst 多页文档 fixture | Apache-2.0 |
| `audio.mp3` | MDN interactive examples 的 `t-rex-roar.mp3` | CC0 |
| `audio.ogg` | Wikimedia Commons 的 `Example.ogg` | CC BY-SA 3.0 |
| `book.epub` | Project Gutenberg 的 `Alice's Adventures in Wonderland` EPUB | Public domain in the USA |

这些样例只作为预览器验收文件使用。更新样例时请继续保留公开来源、固定路径和许可信息，避免重新引入无法追溯的本地占位文件。

`ofd.ofd` 示例来自 Apache-2.0 授权的 `DLTech21/ofd.js` 项目公开样本，用于确认 OFD 在浏览器端的基础解析和渲染链路。运行时使用同仓库纯 JS 解析/渲染源码，避开 npm dist 的授权 wasm 分支。

`office-demo.ppt` 是 `@file-viewer/ppt` 上游公开浏览器自用的真实回归样例，File Viewer 按项目方授权复制到固定路径，用于验证 `.ppt` 与 `.pptx` 两条引擎不会串路。样例文件授权不会改变 `@file-viewer/ppt` 运行时自身的许可边界。

CAD 预览使用 `@flyfish-dev/cad-viewer`。`sample.dwg` 已换成 Autodesk 官方 AutoCAD sample files 中的 `blocks_and_tables_-_imperial.dwg`，运行时会按需加载 viewer 静态目录下 `wasm/cad/` 中的 DWG Worker 和 LibreDWG WASM；`drawing.dxf` 继续验证 DXF parser、图层和视图适配；`samples/apache/blocks_and_tables.dwf` 来自 Apache Tika 公开 Jira 附件，用于验证 DWF 容器、块和表格渲染；`samples/autodesk/house.dwfx` 与 `samples/autodesk/robot-arm.dwfx` 来自 Autodesk 官方 Viewer 教程，用于验证 DWFx/XPS native renderer、W2D/W3D 图形和 `dwfv-render.wasm` fallback。

OpenDocument 样例不再使用临时生成的 ODT/ODS/ODP 占位文件。`document.odt`、`excel.ods` 和 `slides.odp` 均来自 The Document Foundation Wiki 的真实公开文件，用于覆盖 ODT 正文、ODS 工作表和 ODP 幻灯片结构；`excel.fods` 是项目内编写的标准 Flat ODS XML，用于确认平面 OpenDocument 表格入口。

`model.gltf`、`model.obj`、`model.stl` 和 `model.ply` 用于验证 Three.js 轻量模型链路；`model.step` 必须经本地 `wasm/model/` 下的 OCCT Worker、runtime 和 WASM 生成真实网格，并继续验证视图适配、线框/网格/坐标轴和全局统一缩放。运行时同时分发 OCCT 与 `occt-import-js` 的许可证文件。

`flow.excalidraw` 与 `process.drawio` 用于验证绘图类文本格式。Excalidraw 默认使用 rough.js 输出只读 SVG，并在运行环境提供官方 ESM 模块时优先尝试 `restore` 与 `exportToSvg`；draw.io 默认使用不执行文档 HTML 的内置 SVG，只有显式启用 `preferOfficial` 时才在受限 iframe 中按需加载单独分发的 diagrams.net `GraphViewer`。

`audio.mp3` 与 `audio.ogg` 用于验证浏览器原生音频播放能力；`melody.mid` 用于验证 MIDI 元数据解析；`book.epub` 用于验证 `epubjs` 的目录、章节资源和滚动阅读能力；`book.umd` 用于验证早期移动电子书的文件头、元数据、章节偏移、章节标题和 zlib 正文段。

`report.typ` 用于验证 Typst 文档入口，示例包含标题、指标块、表格、数学公式、代码块和多页输出。线上 Demo 会直接读取该源文件，通过浏览器端 WASM 编译与 SVG 渲染链路完成预览、打印和 HTML 导出。

`archive.zip` 与 `archive.tar.gz` 用于验证 `libarchive.js` 的 Worker 目录读取、按需解压、IndexedDB 缓存和压缩包内文件继续预览；`en/archive.zip` 与 `en/archive.tar.gz` 额外覆盖英文 demo 的嵌套文档、代码、数据、GeoJSON 和 glTF 预览。`sample.eml`、`sample.msg` 与 `sample.mbox` 用于验证邮件头信息、HTML/文本正文、附件下载和归档识别。`sample.olb` 与 `sample.dra` 是 CFB 容器夹具，用于验证 OLB / DRA 的结构树、对象候选、属性、文本片段和可读字符串预览。`map.geojson`、`route.kml` 和 `track.gpx` 用于验证地理数据离线 SVG 预览；`sample.sqlite` 和 `module.wasm` 用于验证结构化数据与二进制摘要预览。
