# 支持格式

<div class="doc-kicker">Format Truth</div>

<p class="doc-lead">
  唯一格式目录当前注册 <strong>265 个扩展名</strong>，覆盖 <strong>44 条预览链路</strong>：其中 <strong>223 个稳定</strong>、<strong>42 个实验</strong>。
  这一页不是“计划支持什么”，而是以当前代码里已经注册好的渲染器为准，告诉你项目现在到底能处理哪些格式、分别走哪条渲染链路，以及在真实业务里应该怎么选。
</p>

<div class="doc-shot">
  <img src="/_media/file-viewer-demo-v2.2.6-samples-zh.webp" alt="File Viewer by Flyfish v2.3.0 中文格式样例库，展示分组、文件名与格式专属图标" width="1440" height="900" loading="lazy" />
  <p class="doc-caption">Demo 把 44 条预览链路的代表样例按类型分组；稳定格式必须有可再分发的真实文件 fixture 与浏览器断言，合成或改后缀样例不计入证据；实验项必须持续展示限制。</p>
</div>

<div class="doc-grid">
  <div class="doc-card">
    <h3>265 个已注册扩展名</h3>
    <p>覆盖 Office、PDF、OFD、Typst、XMind、压缩包、邮件、OLB/DRA/GDS/OASIS、CAD、地理数据、3D 模型、Excalidraw、draw.io、Mermaid、PlantUML、EPUB、UMD、Markdown、图片、音视频、代码/文本、Git patch/bundle、字体、PSD 图层资产和结构化数据等常见附件类型。</p>
  </div>
  <div class="doc-card">
    <h3>按需异步加载</h3>
    <p>OFD、Typst、XMind、压缩包、邮件、OLB/DRA/GDS/OASIS、CAD、地理数据、3D 模型、绘图、PDF、Office、Markdown、图片/HEIC、音视频/HLS/MIDI、字体/数据资产和代码高亮等渲染器都会拆成独立异步块，命中格式时才加载。</p>
  </div>
  <div class="doc-card">
    <h3>两条输入路径</h3>
    <p>既可以用 <code>url</code> 直接预览，也可以在业务侧拿到文件后二次包装成 <code>File</code> 再传入。</p>
  </div>
  <div class="doc-card">
    <h3>以体验边界为准</h3>
    <p>不同格式会走不同解析链路，兼容优先的格式与高保真格式在样式还原上并不完全一样。</p>
  </div>
</div>

## Office 与 Apple 证据边界

- `xla`、`xlam`、`pot`、`dbf`、`fb2` 已具备真实容器 fixture、解析断言、SHA-256 与 Demo smoke；宏、VBA 和 Add-in 代码永不执行。
- `pages`、`numbers`、`key` 已接入 iWork ’09 XML/APXL 与现代 Snappy/IWA 两条解析链路，统一进入 Worker、安全上限和静态场景模型，并覆盖文本层、搜索、sheet/slide 导航与备注。
- `pages`、`numbers`、`key` 已升级为 **high-fidelity / stable**：门禁覆盖 iWork ’09、2013+ 与当前 Apple 15.3.1 原生容器，结构断言、真实浏览器 smoke 和固定字体视觉 golden 均通过。Pages/Keynote 像素差阈值为 3%，Numbers 为 5%；Quick Look 图片仍只用于加载占位或明确的有限预览降级。
- Apple stable 的边界是静态高保真：Keynote 不执行动画、转场和视频播放，Numbers 不重新计算公式而读取文件保存的结果，加密 `iwpv2` 只检测并明确提示，缺失字体会显示替换信息。
- `wpd/wp/wp5/wp6` 已升级为 **structured / stable**：按校验和固定的 MPL-2.0 libwpd/librevenge WASM Worker 已通过许可明确的 WP 4.2、5.0、5.1、6.x 真实 fixture，覆盖文本、样式、表格、页眉页脚与注释，并通过 Chromium、Firefox、WebKit 浏览器 smoke。`wp5/wp6` 仅为内容签名路由别名，不以改后缀文件冒充证据；宏永不执行，有界文本只在 WASM 不可用时降级。
- `hwp/hwpx` 已升级为 **structured / stable**：可再分发的 Apache-2.0 HWP v5 与 HWPX fixture 覆盖页面几何、内联样式、合并表格、页眉页脚、注释和内嵌图片，并通过 Chromium、Firefox、WebKit。加密、DRM、发行文档会明确拒绝，罕见控件与生产者私有版式仍是已知限制。

完整机器可读矩阵由 `ecosystem/format-catalog.json` 生成到 [`docs/generated/format-catalog.md`](/generated/format-catalog)。

## 当前支持矩阵

| 分类 | 扩展名 | 渲染链路 | 当前表现 | 更适合的场景 |
| --- | --- | --- | --- | --- |
| Word | `docx`、`docm`、`dotx`、`dotm` | `@file-viewer/renderer-word` + 自研 `@file-viewer/docx` | 文档阅读面跟随 viewer 主题，浅色下保留白色纸张，暗色下使用深色文档面；支持宽度自适应；默认使用 Worker 解析、真实浏览器 DOM 渲染、连续流式阅读、目录字段缓存和异步分批渲染，模板/宏格式按只读预览处理 | 新生成的 Word 文档、正式公文、Word 模板 |
| Word | `doc`、`dot` | `@file-viewer/renderer-word` + `msdoc-viewer` | 使用 Word 风格页面容器，页面居中显示在灰色工作台中，增强 CFB 容错和表格布局 | 存量老文档、Word 97-2003 模板、历史附件回溯 |
| 兼容文档 | `rtf`、`odt` | `@file-viewer/renderer-word` + `rtf.js` / OpenDocument `content.xml` | RTF 走 RTFJS 生成只读 HTML，ODT 读取 ODF 包内正文并套用纸张阅读面 | RTF 富文本、OpenDocument 文本文档 |
| Excel | `xlsx`、`xltx` | `@file-viewer/renderer-spreadsheet` + `styled-exceljs` + `e-virt-table` + 自动静态 Worker | 支持虚拟滚动、列宽/行高、合并单元格、常见样式、Office 365 / WPS 单元格内嵌图片、workbook drawing 图片、图片双击大图预览和可选表头拖拽调整列宽；默认 `worker: auto`，大文件自动启用 Worker，小文件保留主线程兼容路径；打印按钮按能力隐藏 | 大表格预览、报表、Excel 模板 |
| Excel 兼容格式 | `xlsm`、`xlsb`、`xls`、`xlt`、`xltm`、`csv`、`tsv`、`ods`、`fods`、`numbers` | `@file-viewer/renderer-spreadsheet` + `styled-exceljs` + `e-virt-table` + 可选静态 Worker | CSV / TSV 自动识别 UTF-8、GBK 和 GB18030；其余格式统一读取数据、尺寸和可用样式，默认主线程渐进还原，部署环境确认可用时再开启 Worker | 老表格、跨平台导出的表格 |
| PowerPoint 97–2003 | `ppt` | `@file-viewer/renderer-presentation` + `@file-viewer/ppt` 原生 WASM | 二进制 `.ppt` 使用独立原生引擎按页渲染 Canvas，支持统一缩放、打印和 HTML 导出，不会误走 PPTX OOXML 解析器 | 历史汇报材料、旧版培训课件 |
| PowerPoint OpenXML | `pptx`、`pptm`、`potx`、`potm`、`ppsx`、`ppsm` | `@file-viewer/renderer-presentation` + `@file-viewer/pptx` | OOXML 演示文稿通过 Worker 渐进解析并按页输出，支持统一缩放、打印和导出 HTML | 汇报材料、说明文档、培训课件、演示模板 |
| OpenDocument 演示文稿 | `odp` | OpenDocument 兼容预览 | 读取每页幻灯片的文本和页面结构 | 跨平台导出的演示文稿 |
| PDF | `pdf` | `pdfjs-dist` | 浏览器端 PDF 渲染，同源 URL 默认渐进读取，服务端支持 Range 时自动分片加载，支持缩放工具栏、页侧边栏/目录树侧边栏切换、宽度自适应、完整打印和导出 HTML | 合同、票据、版式稳定文件 |
| OFD | `ofd` | `@file-viewer/renderer-ofd` + `DLTech21/ofd.js` 源码 | 使用浏览器端 OFD 解析和页面渲染，vendor 随包离线分发，避开 npm dist 授权 wasm 分支 | 电子发票、公文、国产版式归档材料 |
| Typst | `typ`、`typst` | `@myriaddreamin/typst.ts` 浏览器 WASM 编译 | 直接读取 Typst 源文档并输出按页 SVG，支持完整预览、打印和导出 HTML；compiler / renderer WASM 与默认字体仅命中 Typst 时按需加载 | 技术报告、论文草稿、工程文档模板 |
| 压缩包 | `zip`、`zipx`、`7z`、`rar`、`tar`、`gz`、`gzip`、`tgz`、`bz2`、`bzip2`、`tbz`、`tbz2`、`xz`、`txz`、`lzma`、`zst`、`cab`、`ar`、`cpio`、`iso`、`xar`、`lha`、`lzh`、`jar`、`war`、`ear`、`apk`、`cbz`、`cbr` | `@file-viewer/renderer-archive` + `libarchive.js` WASM Worker | 先读取目录，点击文件后按需解压；内部文件继续复用统一预览器，并支持 IndexedDB 缓存、GBK/GB18030 旧 ZIP 中文文件名、体积上限和 ZIP/TAR/GZIP 兼容降级 | 归档附件、批量交付包、压缩包内文档快速查看 |
| 邮件 | `eml`、`msg`、`mbox` | `@file-viewer/renderer-email` + `postal-mime` / `@kenjiuno/msgreader` | 展示头信息、HTML/文本正文、附件列表；MBOX 会解析首封邮件并标注识别数量；附件可下载，也可继续在线预览 | 邮件归档、客服工单、客户来信附件 |
| 医疗影像（显式按需） | `dcm`、`dicom` | `@file-viewer/renderer-dicom` + 本地 Cornerstone 解码链 | 仅处理一个有界本地 DICOM Part 10 文件，支持单帧/多帧、缩放、旋转和窗宽窗位；不包含 PACS/DICOMweb、序列组装、MPR、分割或诊断用途声明 | 非诊断性的医疗附件快速审阅 |
| 数字签名与证据容器（显式按需） | `p7m`、`p7s`、`p7b`、`p7c`、`pkcs7`、`cms`、`cmsc`、`tsq`、`tsr`、`tst`、`tsd`、`asics`、`scs`、`asice`、`sce`、`ers`、`asc`、`sig`、`pgp`、`gpg`、`jws` | `@file-viewer/renderer-signature` + 有界 Worker/WASM | 本地检查 CMS/CAdES、RFC 3161/5544、ASiC、RFC 4998、JWS 与公开 OpenPGP 材料；密码学结果不等于证书信任、政策合规或法律效力，不接收私钥和自动解密 | 签名附件、时间戳与证据容器初筛 |
| EDA | `olb`、`dra`、`gds`、`oas`、`oasis` | `@file-viewer/renderer-eda` + `cfb` 容器解析 + GDSII/OASIS 版图解析 + WebGL 批次 | 独立 EDA renderer 优先解析 OrCAD / Allegro 常见 CFB 容器；标准 GDSII 会读取 structure、boundary、path、text、reference 并生成 SVG 版图预览，元素较多时自动切到 WebGL canvas；OAS/OASIS 可读文本版图夹具会生成 SVG 预览，真实 SEMI 二进制 OASIS 当前做安全结构索引、可读字符串、实体候选和诊断；完整 OLB/DRA/OASIS 可视化路线见 [格式完整度](/zh/guide/format-fidelity) | 元件库、封装图纸、芯片版图文件初筛 |
| CAD | `dwg`、`dxf`、`dwf`、`dwfx`、`xps` | `@flyfish-dev/cad-viewer` | DWG 通过 Worker + LibreDWG WASM 解析；DXF 使用 JS parser；DWF/DWFx/XPS 使用 native `dwf-viewer` 渲染 W2D/W3D/XPS 图形，并支持 WebGL / WASM fallback | 工程图纸、二维 CAD 附件、AutoCAD 归档文件 |
| 地理数据 | `geojson`、`kml`、`gpx`、`shp` | `@file-viewer/renderer-geo` + GeoJSON 标准化 + CRS 归一化 + MapLibre 矢量叠加层 | GeoJSON 直接读取，KML/GPX 使用 `@tmcw/togeojson` 转换，SHP 使用 `shpjs`；默认离线空底图，可通过 `options.geo.tileUrl` / `options.geo.basemap` 启用公网、内网或离线自托管瓦片；支持 Web Mercator 推断、`options.geo.projection` 和 SVG fallback | 地理附件、轨迹、边界、点位和轻量 GIS 数据 |
| 3D 模型 | `glb`、`gltf`、`obj`、`stl`、`ply`、`fbx`、`dae`、`3ds`、`3mf`、`amf`、`usd`、`usda`、`usdc`、`usdz`、`kmz`、`pcd`、`wrl`、`vrml`、`xyz`、`vtk`、`vtp`、`step`、`stp`、`iges`、`igs`、`brep`、`ifc`、`3dm` | `@file-viewer/renderer-3d` + Three.js loaders + `@file-viewer/geometry-engine` / `occt-import-js` | WebGL 交互预览，支持轨道控制、适配视图、网格/坐标轴、线框、自动旋转和统一缩放；STEP/STP、IGES/IGS、BREP 在本地 OCCT Worker/WASM 中解析，IFC/3DM 当前提供签名识别和接入提示 | 设计模型、点云、三维资产、工程模型 |
| XMind 脑图 | `xmind` | `@file-viewer/renderer-mindmap` + `@ljheee/xmind-parser` + `@panzoom/panzoom` | 支持 XMind 8 XML 与 XMind 2020+ JSON 包结构，展示多 sheet、节点树、标签、备注、超链接、标记、图片、目录侧栏，并通过成熟 Panzoom 画布提供拖拽平移、移动端双指缩放、Ctrl/Command 滚轮锚点缩放、键盘平移、统一 toolbar 状态同步、适配画布、搜索、打印和 HTML 导出 | 脑图、规划图、知识结构、会议纪要 |
| Excalidraw | `excalidraw` | `@file-viewer/renderer-drawing` + `roughjs` | 独立绘图 renderer 默认输出稳定只读 SVG；运行环境已提供官方 `@excalidraw/excalidraw` ESM 模块时会优先尝试 `restore` + `exportToSvg`，不可用时使用 rough.js 安全兜底 | 白板草图、产品沟通图、流程草稿 |
| draw.io | `drawio`、`dio` | `@file-viewer/renderer-drawing` 内置 SVG；官方 diagrams.net `GraphViewer` 为显式可选能力 | 默认不执行文档 HTML；设置 `options.drawing.preferOfficial = true` 后，单独分发的 `vendor/drawio/viewer-static.min.js` 在受限 iframe 中按需加载，资源固定到本地目录，失败时回退安全 SVG | 流程图、架构图、业务泳道图 |
| Mermaid | `mermaid`、`mmd` | `@file-viewer/renderer-drawing` + 官方 `mermaid` | 命中 Mermaid 时才按需加载官方渲染器，输出主题适配 SVG，并使用 `@panzoom/panzoom` 支持拖动、Ctrl/Command 滚轮缩放、统一缩放工具栏和重置 | 架构图、流程图、状态图、序列图 |
| PlantUML | `plantuml`、`puml` | `@file-viewer/renderer-drawing` + 离线 SVG 源码预览 + 可自托管 PlantUML SVG 服务 | 默认不访问外网并显示源码预览；需要完整图形时可通过 `options.drawing.plantumlServerUrl` 指向内网 PlantUML SVG 服务；预览层支持拖动、缩放和主题容器适配 | UML 时序图、组件图、部署图 |
| 电子书 | `epub` | `@file-viewer/renderer-epub` + 包内固化的 EPUB 本地引擎 | 解析 EPUB 包、目录和章节资源，使用滚动阅读避免超宽分页白板；引擎按需加载且不访问运行时 CDN | 电子书、培训手册、长篇阅读材料 |
| 电子书 | `umd` | `@file-viewer/renderer-epub` + UMD 结构解析 + `pako` | 解析老移动电子书的元数据、章节偏移、章节标题和 zlib 压缩正文 | 历史小说附件、旧移动阅读文件 |
| Markdown | `md`、`markdown` | `@file-viewer/renderer-text` | 保留 Markdown 阅读样式，支持明暗主题阅读面 | README、知识文档、开发说明 |
| 图片 | `gif`、`jpg`、`jpeg`、`bmp`、`tiff`、`tif`、`png`、`svg`、`webp`、`avif`、`ico`、`heic`、`heif`、`jxl` | `@file-viewer/renderer-image` | 原生图片浏览；HEIC/HEIF 命中时按需使用 `heic2any` 转成浏览器可展示图片，支持 lightbox 和统一缩放 | 图片附件、设计稿、截图、Logo、移动端照片 |
| 代码/文本 | `txt`、`json`、`jsonc`、`json5`、`ipynb`、`js`、`mjs`、`cjs`、`css`、`java`、`py`、`html`、`htm`、`jsx`、`ts`、`tsx`、`xml`、`log`、`vue`、`yaml`、`yml`、`toml`、`ini`、`proto`、`hcl`、`tex`、`gv`、`http`、`sh`、`bash`、`sql`、`go`、`rs`、`rb`、`swift`、`kt`、`react`、`php`、`c`、`cpp`、`cc`、`h`、`hpp`、`cs`、`diff`、`patch`、`bundle`、`bdl` | `@file-viewer/renderer-text` + `highlight.js` / `diff2html` / Git bundle parser | 普通源码按需高亮；patch 使用左右比对视图；git bundle 解析 bundle header、refs、commit 历史、文件树、可读 blob 和常规 OFS_DELTA / REF_DELTA；超大包或依赖外部 prerequisite 的包会给出边界提示 | 配置文件、日志、代码片段、代码评审、Git 交付包 |
| 音频 | `mp3`、`mpeg`、`wav`、`ogg`、`oga`、`opus`、`m4a`、`aac`、`flac`、`weba`、`midi`、`mid` | `@file-viewer/renderer-media` + 浏览器原生 `<audio>` / `@tonejs/midi` | 常见音频使用原生控件播放，MIDI 命中时按需展示轨道、时长、PPQ 和音符摘要 | 录音、播客、语音附件、音效素材、MIDI 文件 |
| 视频 | `mp4`、`webm`、`m3u8` | `@file-viewer/renderer-media` + 浏览器原生 `<video>` / `hls.js` | MP4/WEBM 原生播放，HLS 清单优先用浏览器能力，必要时按需加载 `hls.js` | 演示视频、录屏材料、HLS 流 |
| Adobe 设计文件（显式按需） | `psd`、`psb`、`pdd`、`psdt`、`ai`、`ait`、`eps`、`ps`、`idml`、`icml`、`idms`、`inx`、`xd`、`indd`、`indt`、`fla`、`xfl`、`ase`、`aco`、`abr`、`csh`、`pat`、`grd`、`asl` | `@file-viewer/renderer-design` + 本地 Worker/WASM | PSD/PSB 保存像素与可安全解码图层；Illustrator 默认使用高还原 PDF-compatible 表面，并可切换 `illustrator-pgf` 原生 PGF 画板、图层与路径 Canvas；IDML 页面、InDesign exchange/XD/INDD/现代 XFL 有界结构和预览、色板、Photoshop 资源与 PostScript；未知原生操作符和降级边界会明确展示 | 设计审阅、素材库、离线创意文件收件 |
| 字体/结构化数据 | `ttf`、`otf`、`woff`、`woff2`、`sqlite`、`wasm`、`parquet`、`avro`、`webarchive` | `@file-viewer/renderer-data` | FontFace 样张、SQLite 表结构和少量行、Parquet/Avro 元数据与样例、WASM 导入导出和 WebArchive 安全摘要；SQLite WASM 可通过 `options.data.sqlWasmUrl` 指向私有化地址 | 字体、本地数据库、列式数据、二进制包和 Web 归档 |

## 按类型看体验和边界

### Word 文档

- `docx`、`docm`、`dotx`、`dotm` 由 `@file-viewer/renderer-word` 按需装配，并在命中格式时加载自研 `@file-viewer/docx`，适合正文、表格、图片、目录字段和常规版式较多的现代 Word 文档与模板。当前预览层会根据 viewer 主题选择浅色纸张或深色文档面，并根据可用宽度自动缩放；宏内容只作为只读文档结构预览，不执行宏。
- 如果你只安装 `@file-viewer/core` 或轻量组件包，Word 能力不会被默认拉进依赖树；生产项目可显式装配 `@file-viewer/renderer-word`，办公文档平台优先使用 `@file-viewer/preset-office`，完整 Demo 和全格式场景可直接使用 `@file-viewer/preset-all`。
- DOCX 默认自动选择 `@file-viewer/docx` Worker 或主线程解析：HTTP/HTTPS 部署启用 Worker，Electron `file://` 等本地不安全协议自动回退；真实浏览器 DOM 渲染、连续流式阅读、目录字段缓存和异步分批渲染会继续优先保证复杂目录、长表格、制表符、页眉页脚、字段和样式继承稳定；私有静态资源路径特殊时可配置 `options.docx.workerUrl` 和 `options.docx.workerJsZipUrl`。
- `doc`、`dot` 使用 `msdoc-viewer`，并额外套用 Word 风格页面容器。构建前会通过包管理器无关的补丁脚本增强 CFB 局部 sector 容错，它不只是“把内容吐出来”，而是尽量保留文档阅读时的页面感。
- `rtf` 使用 RTFJS 读取富文本结构并生成安全的只读 HTML；`odt` 读取 OpenDocument 包内 `content.xml`，提取正文块并套用纸张阅读面。它们适合跨平台导出文档的快速查看，但复杂页眉页脚、域代码或宏能力仍建议转换为 DOCX/PDF 后验收。
- Word 打印和导出 HTML 使用独立导出适配器，只带文档内容和必要 Word 样式，不带 Demo 布局、滚动容器和缩放状态，长文档会完整输出。
- DOCX 默认不分页；只有业务明确需要页式预览时再设置 `options.docx.visualPagination: true`，这会启用 Word 保存分页和预览层兜底分页。
- 如果你的业务能控制导出格式，优先推荐 `docx`；如果你面对的是存量老文档，当前 `.doc` 已经可以作为正式能力对外说明。

### Office 模板格式

- 当前前端已接入可直接复用的模板格式：`dot`、`dotx`、`dotm`、`docm`、`xlt`、`xltx`、`xltm`、`pptm`、`potx`、`potm`、`ppsx`、`ppsm`。
- 这些模板格式仍然走对应的 Word、Excel 或 PowerPoint 渲染链路，按只读预览处理，不执行宏，也不把模板写回文件。
- 如果业务系统允许控制附件出口，建议优先沉淀为 `docx`、`xlsx`、`pptx`、`pdf` 或 `ofd` 这类更稳定的浏览器预览格式。

### 表格类文件

- 表格类文件统一走 `styled-exceljs` 解析和 `e-virt-table` 虚拟渲染，适合需要保留表格结构、合并单元格、Office 365 / WPS 单元格内嵌图片、workbook drawing 图片和视觉层级的场景；渲染出的图片可双击进入大图预览，并通过 Escape、遮罩或关闭按钮退出。
- 表格解析默认使用 `options.spreadsheet.worker: 'auto'`：小文件走同一套 `styled-exceljs` 主线程解析以保持本地服务器、手机 WebView、MIME 和 CSP 兼容；大文件达到 `options.spreadsheet.workerAutoThreshold`（默认 1MB）时自动尝试 `vendor/xlsx/sheet.worker.js`，避免百万单元格解析阻塞 UI。静态资源路径特殊时可配置 `options.spreadsheet.workerUrl`，不希望自动启用时设为 `worker: false`。
- CSV / TSV 默认按 UTF-8 BOM、严格 UTF-8、GB18030 的固定顺序识别文本编码，GB18030 同时覆盖常见 GBK 文件。来源编码已知或字节序列存在歧义时，可用 `options.spreadsheet.textEncoding` 显式选择 `utf-8`、`gbk` 或 `gb18030`；XLS / XLSX 等二进制表格不会进入文本解码路径。
- 如果业务用户经常查看被截断的长文本，可以开启 `options.spreadsheet.resizableColumns: true`，用户即可拖拽表头右侧边界调整列宽。该能力默认关闭以保持历史交互兼容，官方 Demo 默认开启用于体验。
- `xlsm`、`xlsb`、`xls`、`xlt`、`xltm`、`csv`、`tsv`、`ods`、`fods`、`numbers` 会读取格式中能表达的数据、尺寸和样式；部分格式本身不包含完整样式时，会按可用信息渐进还原。
- Excel 预览为了兼顾大表格性能采用虚拟表格，DOM 中不会一次性持有完整工作表，因此当前会主动隐藏打印按钮，避免浏览器只打印当前视口或截断内容。
- 如果你正在设计业务导出格式，优先选 `xlsx`；如果你只是需要把历史附件打开看内容，兼容链路已经足够实用。

### 演示文稿、PDF、OFD 与 Typst

- `ppt` 使用 `@file-viewer/renderer-presentation` 按需加载独立的 `@file-viewer/ppt` 原生 WASM 引擎，按页渲染二进制 PowerPoint 97–2003 文件；它与 PPTX 解析器保持严格路由边界。
- `pptx` 等 OOXML 演示文稿使用独立的 `@file-viewer/pptx` 原生渲染引擎，各标准组件包共享同一条 renderer 链路，core-only 安装不会拉取任何演示文稿引擎。
- 二进制 PPT 0.3.3 默认使用 Worker/OffscreenCanvas/WASM 和有界帧缓存；Demo、Vite/full、copy-assets 与 CDN/IIFE 的标准布局会自动发布并解析 `vendor/ppt/`，非标准资源布局才需要通过 `options.presentation.pptModuleUrl` / `pptWorkerUrl` / `pptWasmUrl` / `pptFontUrl` 覆盖。PPTX 继续使用 `workerUrl` / `workerType` 配置另一条 Worker。
- PPTX 默认通过 renderer 内部的模块 Worker 渐进解析；私有静态资源路径、旧 WebView、严格 CSP 或自托管 CDN 场景可以用 `options.presentation.workerUrl` / `options.presentation.workerType` 固定 Worker 地址和类型，避免运行时从错误路径加载。
- PPTX 渲染器现在会按 DrawingML 的组合图形坐标系处理 `chOff/chExt`，组合内元素在缩放、旋转、翻转时会更接近 PowerPoint 中的位置关系。
- 主题背景支持从 `fillStyleLst` / `bgFillStyleLst` 解析纯色、渐变、图片和平铺图案；PPTX 内嵌的 EMF 图片会尽量转换为 SVG 数据图，避免只显示空白占位。
- 图片填充会处理 `srcRect` 裁剪信息，复杂模板里的裁切图、背景图和组合形状更适合作为真实业务样本回归。
- `odp` 作为 OpenDocument 演示文稿兼容入口，会读取每页幻灯片文本和页面结构，用于快速确认内容和页数。需要完整动画、母版和复杂形状高保真时，仍建议导出为 PPTX 或 PDF。

#### 二进制 PPT 引擎许可边界

`@file-viewer/ppt` 公开包由 npm 独立发布并保留自身许可证，不属于 File Viewer Apache-2.0 许可范围。Demo、Full、copy-assets 与 CDN/IIFE 会交付匹配的公开运行时；公开版渲染结果保留可见水印，移除 PPT 水印需要商业授权。该引擎会通过 Web Crypto SHA-256 校验 WASM，请部署在浏览器安全上下文中（通常为 HTTPS 或 localhost）。
- `pdf` 走 `pdfjs-dist`，通常是版式最稳定的一类文件，适合合同、流程单、正式成品材料。当前 PDF 视图提供顶部缩放工具栏、页码状态、旋转页兼容、可显隐导航窗格、页面/目录树切换、可选懒加载页面缩略图和宽度自适应。同源 URL 会默认使用 PDF.js 的 URL 渐进读取；文件服务支持 Range 时会自动分片加载，避免大文件必须整包下载后才出现首屏。
- PDF.js worker、CMap、WASM 和 standard fonts 默认随 viewer assets 分发到 `vendor/pdf/`，不会访问公共 CDN。轻量组件 + preset 没有复制 assets 时，PDF renderer 会在默认 worker 不可用或返回 HTML 时懒加载包内 worker handler 兜底，保证先能预览；静态目录特殊、需要最佳性能或严格离线时可通过 `options.pdf.workerUrl`、`options.pdf.cMapUrl`、`options.pdf.wasmUrl` 和 `options.pdf.standardFontDataUrl` 指向自托管地址。
- PDF 的打印与导出 HTML 会通过专属导出适配器逐页生成完整页面，不依赖当前滚动位置、当前可见页或已经渲染的 canvas，也不会被导航窗格、预览容器或全局样式截断，适合正式归档和审批留痕。
- `ofd` 走 `@file-viewer/renderer-ofd` 独立 renderer，按需加载 `DLTech21/ofd.js` 仓库源码，用于国产版式文档在线预览。npm dist 当前会在 wasm 解析层返回授权错误，组件改用同仓库的纯 JS 解析/渲染链路，并保留解析缓存、resize 重排、缩放、打印和 HTML 导出。
- `typ` / `typst` 始终按源文件直接预览，不会自动探测或替换为同名 PDF。组件会在命中 Typst 时按需加载 `@myriaddreamin/typst.ts` 的浏览器 WASM 编译与 SVG 渲染链路。
- 组件会读取 Typst 输出里的页面尺寸元数据，把整文档拆成按页 SVG 预览，打印和导出 HTML 时只输出文档页面，不带 Demo 外壳。compiler / renderer WASM 默认随 viewer assets 分发到 `wasm/typst/`，默认字体资产分发到 `wasm/typst/fonts/`，也可以通过 `options.typst.compilerWasmUrl`、`options.typst.rendererWasmUrl` 和 `options.typst.fontAssetsUrl` 指向私有化部署地址；运行时不会访问官方 npm CDN，也不会切换为源码预览。WASM、字体目录缺失或 `options.typst.renderTimeoutMs` 超时时会给出明确错误，避免误判为预览成功。
- Typst 适合技术报告、论文草稿、工程文档模板和需要保留排版语言源文件的场景。如果文档引用本地图片或拆分文件，建议在业务侧先把资源打包进压缩包，保留完整项目结构。
- 如果你更在意“上传 Typst 源文件后直接看到排版结果”，请确保随包发布 `wasm/typst/` 和 `wasm/typst/fonts/` 静态资源；如果文档依赖外部资源，建议用压缩包保留项目结构后再选择内部 `.typ` 文件。

### 压缩包、邮件与 EDA

- 压缩包优先走 `@file-viewer/renderer-archive`；目录读取优先在 `libarchive.js` Worker 中完成，只有用户点击内部文件时才按需解压对应条目，避免一次性把大包全量展开到主线程。私有化部署时一般不需要写死 Worker 路径；组件会先尝试当前 viewer base 下的 `vendor/libarchive/worker-bundle.js`。
- 旧系统生成的 ZIP 可能没有 UTF-8 标记，中文文件名实际使用 GBK/GB18030 编码。预览器会自动识别并解码这类目录名，避免在 ZIP/TAR/GZIP 兼容路径下出现文件名乱码。
- 如果手机 WebView、本地临时服务器、MIME 或 CSP 导致 Worker 初始化超时，组件会继续降级到 ZIP/TAR/GZIP 兼容模式，优先保证常见压缩包能打开目录和内部文档。只有静态目录或 WASM 路径特殊时，才需要通过 `options.archive.workerUrl` / `options.archive.wasmUrl` 指定路径。
- 压缩包内文件会继续复用同一套文件预览器，所以包里的 PDF、Word、Markdown、代码、图片、邮件、地理数据、字体/数据资产或嵌套压缩包都能在体积限制内继续打开。
- `options.archive.cache` 默认启用 IndexedDB 缓存，已解压的内部文件再次打开会更快；`maxArchiveSize` 和 `maxEntryPreviewSize` 用于限制压缩包和单个条目的内存风险。
- EML 使用 `postal-mime` 解析 MIME、正文和附件；MSG 使用 `@kenjiuno/msgreader` 解析 Outlook MSG，附件同样支持下载和在线预览。
- 邮件链路已拆为 `@file-viewer/renderer-email` 独立包；MBOX 会按 `From ` 分隔线识别邮件条目，并使用同一套 MIME 解析器读取首封邮件，适合邮件归档包的快速审阅。超大归档建议先在业务层拆分或提供索引，避免一次性把全部历史邮件拉入浏览器内存。
- 邮件 HTML 正文渲染在隔离沙箱文档中，不执行脚本；如果你接收外部邮件，仍建议在业务层保留病毒扫描和附件白名单策略。
- OLB / DRA 由 `@file-viewer/renderer-eda` 使用 `cfb` 读取常见复合文档容器，并按 OrCAD Capture 元件库、Allegro drawing / footprint / padstack 的内容习惯做结构树、对象候选、属性和诊断展示。标准 GDSII 会在浏览器内读取记录流，提取 library、structure、boundary、path、text、sref/aref 和坐标边界；小文件生成可滚动 SVG 版图预览，大元素集会使用 `@file-viewer/eda-layout` 生成 typed-array 批次并交给 WebGL canvas 渲染；复杂电气规则、版图几何校核、DRC/LVS 和专业编辑仍应交给 OrCAD / Allegro / KLayout 等专业工具。
- OAS / OASIS 的二进制压缩和重复结构更复杂。当前内置能力已经能把项目内可读 OASIS 文本夹具渲染成 SVG 版图，真实 SEMI 二进制 OASIS 仍定位为安全结构索引和字符串/诊断预览，不会虚标为完整几何渲染。完整 OASIS 图形预览后续更适合像 `@file-viewer/pptx` 一样在独立 `@file-viewer/eda-layout` 包中持续维护，避免把专业版图内核塞进 core 首屏链路；详细路线见 [格式完整度与渲染路线](/zh/guide/format-fidelity)。

### XMind 脑图

- `xmind` 使用 `@ljheee/xmind-parser` 解析 XMind 8 的 `content.xml` 与 XMind 2020+ 的 `content.json`，不依赖在线服务，也不访问公共 CDN。
- 预览器会展示多 sheet 标签、主题节点、子节点、标签、备注、超链接、优先级、进度、标记、概要/标注等结构，并提供目录侧栏、Panzoom 拖拽平移、移动端双指缩放、Ctrl/Command 滚轮锚点缩放、键盘方向键平移、适配画布、搜索、缩放、打印和 HTML 导出；首次打开和容器尺寸变化会自动适配视图，用户拖拽/缩放后保留当前画布视角；平移、目录定位和键盘移动都会同步统一 toolbar 状态，浏览器 smoke 会覆盖 Pointer 拖拽和真实鼠标拖拽，避免“能打开但拖不动”。
- 大型脑图会限制单次渲染节点数量，避免浏览器一次性挂载过多 DOM。需要更深层编辑、重新排版或协同批注时，仍建议回到专业脑图工具。

### CAD 图纸

- `dwg` / `dxf` / `dwf` / `dwfx` / `xps` 走 `@flyfish-dev/cad-viewer`，DWG/DXF 归一化为 CAD document 后使用 retained WebGL 渲染，浏览器不支持 WebGL 时回退 Canvas2D。
- DWG 通过独立 Worker 加载 LibreDWG WASM，避免初始化和二进制解析阻塞主线程。项目构建会把 `libredwg-web.js`、`libredwg-web.wasm`、`dwfv-render.wasm` 和 `dwg-worker.js` 复制到 viewer assets 的 `wasm/cad/` 下，也可以通过 `options.cad.wasmPath` / `options.cad.workerUrl` / `options.cad.dwfWasmUrl` 指向自托管静态资源。
- DWF / DWFx / XPS 使用 `dwf-viewer` native renderer，支持 DWF 6+ ZIP 容器、WHIP/W2D 2D sheet、W3D/HSF eModel、DWFx/OPC/XPS 页面、嵌入字体、CAD 线宽适配和 WASM raster fallback。

### 地理数据

- `geojson` 会直接读取标准 GeoJSON；`kml` / `gpx` 使用 `@file-viewer/renderer-geo` 内部按需加载的 `@tmcw/togeojson` 转换为 GeoJSON；`shp` 使用同包内按需加载的 `shpjs` 解析 Shapefile 压缩包或二进制内容。
- 默认通过离线 MapLibre 空底图渲染点、线、面叠加层，支持平移、缩放、适配范围和统一工具栏缩放；不依赖在线地图底图或公网 CDN。
- 需要真实底图时可显式配置 `options.geo.tileUrl`，例如 `/tiles/world/{z}/{x}/{y}.png`，也可以通过 `options.geo.basemap` 使用 `openfreemap-liberty` 等 OpenFreeMap 国际化开源底图 preset，或传入 `{ type: 'vector-style', styleUrl: '/maps/styles/liberty/style.json' }` 指向内网 / 国内 CDN / 离线静态目录。
- 天地图可使用 `tianditu-vector`、`tianditu-imagery`、`tianditu-terrain` preset，并通过 `options.geo.tiandituToken` 传入调用方为部署域名申请的 token。底图与注记图层会成对加载；viewer 不内置或保存 token，缺少 token 时回退离线空底图。
- `osm-raster` 作为显式 opt-in preset 仅适合 demo 或低频访问；生产环境应遵守 OpenStreetMap 官方 tile policy，保留可替换 URL、缓存和 attribution。中国大陆生产环境更推荐把 OpenFreeMap / OpenMapTiles 栈自托管或镜像后再接入。
- 坐标系会归一化到 WGS84：标准 GeoJSON 默认按 `EPSG:4326`，也会读取 GeoJSON `crs`、自动推断 Web Mercator，并支持通过 `options.geo.projection` 声明 `EPSG:3857`、`EPSG:4490`、`GCJ02`、`BD09` 或 proj4 字符串。
- WebGL 或 MapLibre 初始化不可用时会回退 SVG 矢量预览，仍会展示要素数量、坐标范围和点线面结构。
- 如果业务需要空间分析、编辑、拓扑校验或大量要素抽稀，仍建议在业务系统中接入专业 GIS 组件，并把 File Viewer by Flyfish 作为附件快速预览入口。

### 3D 模型

- 3D 模型由 `@file-viewer/renderer-3d` 承接，组件会根据扩展名按需加载对应 Three.js loader，避免普通文档预览被 3D 依赖拖慢。
- `glb` / `gltf` 是最推荐的 Web 3D 交换格式；`obj`、`stl`、`ply` 适合轻量几何和打印模型；`fbx`、`dae`、`3ds`、`3mf`、`amf`、`usd` / `usdz`、`kmz` 适合兼容设计工具导出的历史或工程资产。
- `pcd`、`xyz`、`vtk`、`vtp` 会按点云或几何模型展示，适合扫描、仿真和工程数据的快速浏览。
- `step` / `stp`、`iges` / `igs`、`brep` 已通过 `@file-viewer/geometry-engine` 接入本地 `occt-import-js` / OpenCascade Worker/WASM，能够解析装配层级、实例、法线和面颜色并生成 Three.js 网格，不需要服务端转换。
- OCCT Worker、runtime、WASM 和许可证文件随 viewer assets 离线分发；子路径或独立资产域名可用 `options.model.workerUrl`、`options.model.runtimeUrl`、`options.model.wasmUrl` 覆盖。`ifc` 与 `3dm` 当前仍只展示签名识别和明确接入说明，后续分别沿 `web-ifc` / That Open 与 `rhino3dm` 路线独立维护。
- 如果 `.gltf`、`.dae`、`.fbx` 依赖同目录贴图、材质或 `.bin` 文件，使用 `url` 远程预览时会以原始 URL 的目录作为资源基准继续加载；使用本地单文件上传时，请优先选择 `.glb` 或把资源内联。

### 绘图文件

- `excalidraw` 使用 `@file-viewer/renderer-drawing` 输出只读 SVG；默认走 `roughjs` 稳定兜底，运行环境已提供官方 `@excalidraw/excalidraw` ESM 模块时会优先尝试 `restore` 与 `exportToSvg`。
- `drawio` 和 `dio` 默认使用内置 SVG 安全预览，不执行图文件生成的 HTML，也不会加载 diagrams.net 重型资源。
- 只有显式设置 `options.drawing.preferOfficial = true` 时才在无 same-origin 权限、带严格 CSP 的 iframe 中启用单独分发的 diagrams.net `GraphViewer`；静态目录前缀特殊时可通过 `viewerScriptUrl` 指定同源 HTTP(S) 自托管脚本。官方 viewer 加载失败或超时时仍会回退到本地 SVG。

### 电子书

- EPUB 链路已拆为 `@file-viewer/renderer-epub` 独立包。v2.3.0 将阅读引擎构建为确定性的包内 vendor 资产，连同依赖许可 NOTICE 一起分发；只有命中 `.epub` 时才加载，不需要公网脚本，也不会把旧版 XML 解析依赖带进业务生产依赖树。
- EPUB 预览提供目录窗格、上一章/下一章式导航和阅读进度。正文区域使用滚动文档模式，避免部分浏览器在超宽分页布局下出现白板。为了安全，阅读器不会允许书内脚本执行。
- `umd` 是早期移动阅读器常见的电子书封装。当前没有可靠维护的前端 UMD 阅读库，组件按公开文件结构解析文件头、元数据、章节偏移、章节标题和正文数据块，正文 zlib 解压交给 `pako`。
- UMD 文本正文按 UTF-16LE 解码，保留章节目录和换行；图片/漫画类 UMD 会尽量按图像数据块展示，但复杂混排文件建议用真实样本补充回归。
- Kindle 专有格式、DRM 电子书或业务加密包不在当前内置范围内，建议在接入侧转换为 EPUB、UMD 文本电子书或 PDF 后预览。

### Markdown、代码与文本

- `md` 和 `markdown` 由 `@file-viewer/renderer-text` 按 Markdown 阅读样式展示，适合项目说明、知识文档和内部手册。Markdown 属于预览器自有阅读面，会跟随系统明暗模式切换；PDF、Word、Excel 这类带原始版式的文件则保持独立纸张或表格背景，避免全局主题破坏源文件视觉。
- 代码和文本文件由 `@file-viewer/renderer-text` 使用 `highlight.js` 做轻量高亮，按扩展名匹配语言，不命中时会自动退回纯文本。新增的 JSONC、JSON5、Notebook、TOML、Proto、HCL、TeX、Graphviz、HTTP、Ruby、Swift、Kotlin 和 React 片段都走同一条轻量链路，不引入编辑器级大依赖。
- 这里有一个很重要的边界：`html` 文件会被当作源码看，而不是在预览器里当网页执行。这是更安全、也更可控的默认策略。

### 图片、音频与视频

- 图片类支持 `gif`、`jpg`、`jpeg`、`bmp`、`tiff`、`tif`、`png`、`svg`、`webp`、`avif`、`ico`、`heic`、`heif`、`jxl`。当前由 `@file-viewer/renderer-image` 独立承接，普通图片走浏览器原生解码，HEIC / HEIF 只有命中格式时才会加载 `heic2any` 转换依赖，避免影响普通图片首屏。
- `svg` 会作为图片来展示，很适合拿来放矢量图标、流程图和品牌素材。
- 音频类由 `@file-viewer/renderer-media` 承接，支持 `mp3`、`mpeg`、`wav`、`ogg`、`oga`、`opus`、`m4a`、`aac`、`flac`、`weba`，使用浏览器原生播放器；`midi` / `mid` 命中时才加载 `@tonejs/midi`，展示轨道、时长、PPQ 和音符摘要。不同浏览器对编码格式的支持会有差异。
- 视频同样由 `@file-viewer/renderer-media` 承接，支持 `mp4`、`webm` 和 `m3u8`。MP4/WEBM 的实际解码能力取决于视频轨编码。Chromium 无法原生解码 MP4V Simple Profile 时，renderer 会按需加载 Apache-2.0 的 AOSP PacketVideo WASM，在 Worker 中解码并使用 AAC 音轨校时，不再出现有声音但画面全黑。WASM 为 111,379 字节（gzip 34,410 字节），实现不包含 FFmpeg、libav 或 LGPL/GPL/AGPL 源码。超出当前解码范围时会显示明确的兼容提示。HLS 清单优先走浏览器原生能力，不支持时再按需加载 `hls.js`；本地上传的 `.m3u8` 如果引用了外部分片，需要保证分片 URL 对浏览器可访问。

### Adobe 设计文件

- `@file-viewer/renderer-design` 是显式按需包，Worker/WASM、字体和 vendor 文件全部可在自己的网络内托管。PSD/PSB、Illustrator、IDML/ICML/IDMS/INX、XD/INDD、FLA/XFL、色板、Photoshop 资源和 PostScript 由对应子 renderer 解析；缩放、搜索、打印、HTML 导出等操作仅在该 renderer 实际注册相应 adapter 时出现，不作为全 Adobe 家族的共同承诺。
- 高还原度以文件内真实证据为准：优先保存 composite/PDF/嵌入预览，能安全解析时再叠加图层、页面、故事、时间轴和资源结构。AI/AIT 已支持原生 PGF/private-source 的画板、图层和路径预览，但未知操作符及尚未完整实现的渐变、复杂文字、图片、插件、效果、蒙版、混合、叠印和色彩管理会保留诊断，不冒充 Illustrator 完整编辑图；INDD 私有排版数据库、XD AGC 场景、旧二进制 FLA 与完整 Photoshop 图层效果栅格化同样保持明确边界。
- 现代 ZIP/XFL Animate 文件支持舞台、时间轴、图层、关键帧、符号和受限首帧；普通单 XML XFL 可读，未压缩文件夹需要目录输入能力，旧二进制 FLA 明确拒绝。

### 字体与结构化数据

- 字体类 `ttf`、`otf`、`woff`、`woff2` 使用浏览器 FontFace API 临时加载并展示样张，不把字体注册到全局业务页面。
- `sqlite` 使用 `@file-viewer/renderer-data` 按需加载 `sql.js` 打开本地数据库并展示表结构和少量行数据，默认使用 viewer assets 中的 `wasm/data/sql-wasm.wasm`，也可以通过 `options.data.sqlWasmUrl` 或全局 `window.__FLYFISH_DATA_SQL_WASM_URL__` 指向私有化资源；`parquet` 使用 `hyparquet` 读取元数据和预览行；`avro` 使用 `avsc` 读取 schema 和样例对象；`wasm` 只读取模块导入导出信息；`webarchive` 做安全文本摘要。
- 这些格式默认定位是“附件快速审阅”，不会替代数据库客户端或专业二进制分析工具。超大数据文件建议通过业务层先做分页、抽样或服务端索引。

## 真实业务里怎么选

- 你能控制导出格式：优先使用 `docx`、`xlsx`、`pptx`、`pdf`、`ofd`、`dxf`、`glb` 这类现代或稳定交换格式。
- 你要兼容历史附件：`.doc` 与 `xls/xlsm/xlsb/csv/ods` 这一组已经有正式链路，但要接受它们与现代格式在样式上的差异。
- 你要看日志、配置或代码：直接用代码/文本链路即可，重点是快速打开、检索内容和保持安全。
- 你要看地理附件：GeoJSON/KML/GPX/SHP 可以直接作为快速预览入口；需要真实底图时配置 `geo.tileUrl` 或 `geo.basemap`，需要空间计算、编辑或拓扑分析时再接入专业 GIS。
- 你要看结构化数据或二进制资产：SQLite、Parquet、Avro、WASM、PSD、字体和 WebArchive 都能做快速结构审阅，但不建议把它们当完整编辑器使用。
- 你在做品牌、示意图或视觉素材展示：`png`、`svg`、`webp` 这类图片格式会比转成文档更省心。
- 你要预览 CAD：优先提供 `dwg`、`dxf`、`dwf` 或 `dwfx`；DWG 和 DWF native renderer 会按需加载 Worker/WASM，私有化部署时请确认 viewer assets 中的 `wasm/cad/` 资源可访问。
- 你要预览 3D 模型：优先沉淀 `glb` / `gltf`，历史模型可用 OBJ、STL、PLY、FBX、DAE、3DS、3MF、AMF、USD/USDZ、KMZ 等格式接入；STEP/STP、IGES/IGS、BREP 可以直接走本地 OCCT 预览，IFC、3DM 当前建议先转换或接入对应专业内核。
- 你要预览绘图文件：Excalidraw 和 draw.io 都保留源格式入口，前者走官方恢复与导出 SVG，后者默认走内置 SVG；只有显式设置 `preferOfficial = true` 才在受限 iframe 中按需加载 diagrams.net 离线 viewer，异常时回退内置 SVG。
- 你要预览电子书或音视频：EPUB / UMD 优先保留源文件，音频优先选择浏览器兼容最稳定的 MP3 / OGG，视频优先选择 MP4 / WEBM；需要流媒体体验时可以提供 M3U8。

## 不支持的格式会怎样

如果文件扩展名没有命中已注册渲染器，组件会显示“不支持当前格式在线预览”的提示，引导用户下载后查看或转换格式。

<div class="doc-note">
  最稳妥的做法，不是只看这张表，而是把你业务里最关键的那几类真实文件各准备一份样本，走一遍本地 Demo 和接入页联调。这样你拿去对外说明时，底气会更足。
</div>
