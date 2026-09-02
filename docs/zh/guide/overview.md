# 概述

File Viewer by Flyfish 可以为业务系统快速补齐文件在线预览能力。它不同于依赖后端转码的方案，核心解析和渲染都在浏览器端完成，不会额外占用服务器执行 Office 转 PDF、临时文件清理或异步转换任务。

这让它特别适合静态部署、内网私有化、低运维成本和多系统复用场景。查看[快速开始](/zh/guide/quickstart)可以直接跑通第一个预览示例。

## 当前能力

<div class="doc-grid">
  <div class="doc-card">
    <h3>多格式预览</h3>
    <p>唯一目录注册 265 个扩展名和 44 条预览链路，其中 223 个稳定、42 个实验；实验项不会计入稳定支持数量。</p>
  </div>
  <div class="doc-card">
    <h3>纯前端渲染</h3>
    <p>大部分格式不需要后端转码服务。业务侧只需要提供可访问 URL、File 或二进制数据包装后的 File。</p>
  </div>
  <div class="doc-card">
    <h3>按需异步加载</h3>
    <p>PDF、OFD、Typst、XMind、压缩包、邮件、OLB/DRA/GDS/OASIS、CAD、地理数据、3D 模型、绘图、Office、EPUB、UMD、Markdown、HLS、HEIC、字体/数据资产和代码高亮都按需进入对应预览链路，减少无关格式的加载成本。</p>
  </div>
  <div class="doc-card">
    <h3>模块化装配</h3>
    <p>core 负责底层协议和统一 API，renderer 负责单一格式链路，preset 负责产品形态组合，生态组件负责 Vanilla JS、Vue、React、Svelte、jQuery 等框架的原生体验；Vite 插件会按已安装 preset 自动激活能力。</p>
  </div>
  <div class="doc-card">
    <h3>多接入路线</h3>
    <p>Vanilla JS / Pure Web、Vue3、Vue2.7、Vue2.6、React 18/19、React 16.8/17、jQuery 和 Svelte 都有对应 npm 包；标准组件包复用同一套 core 能力，并提供各自生态的组件体验。</p>
  </div>
  <div class="doc-card">
    <h3>样式强隔离</h3>
    <p>所有标准组件默认使用 Shadow DOM 抵抗宿主全局 CSS；主题定制使用 CSS tokens 与 <code>::part()</code>，仅旧版深层覆盖场景使用 <code>options.styleIsolation:'none'</code>。</p>
  </div>
</div>

## 优势

- **交付边界清楚。** 组件、Demo、文档站、开源总仓库、npm tarball 和构建脚本都围绕开源分发维护，接入方可以先验收效果再决定集成方式。
- **视觉体验更接近真实阅读。** Word 文档会按主题显示浅色纸张或深色文档面；PDF 提供缩放、页码、导航窗格和可视宽度自适应，避免打开后内容被挤压或不可读。
- **格式策略务实。** 二进制 PPT 使用独立版本的 `@file-viewer/ppt@0.3.3` 原生 WASM 引擎；Demo、Full、copy-assets 和 CDN/IIFE 会在 `vendor/ppt/` 交付匹配的公开运行时，默认无需配置 URL，公开渲染保留可见水印。PPTX 使用 `@file-viewer/pptx` Worker 引擎并增强组合图形、主题背景、图片裁剪和 EMF 矢量图片；OFD 通过 `@file-viewer/renderer-ofd` 基于 `DLTech21/ofd.js` 源码链路预览；Typst 直接读取 `.typ` / `.typst` 源文件，命中格式时才加载浏览器 WASM 编译与 SVG 渲染链路；XMind 使用 `@file-viewer/renderer-mindmap` + `@ljheee/xmind-parser` 解析 XMind 8 / 2020+ 文件包并离线渲染多 sheet 脑图，画布交互由 `@panzoom/panzoom` 提供拖拽平移、移动端双指缩放和适配画布；压缩包用 `libarchive.js` Worker 按需解压内部文件；邮件用 `postal-mime` / `@kenjiuno/msgreader` 解析正文和附件，并兼容 MBOX 归档；EDA 由 `@file-viewer/renderer-eda` 独立承接，OLB/DRA 做结构树、对象候选、属性、可读字符串和诊断预览，GDSII 读取标准记录并生成 SVG / WebGL 版图预览，OASIS 文本夹具可生成 SVG，真实二进制 OASIS 先做安全结构索引；CAD 使用 `@flyfish-dev/cad-viewer` 支持 DWG / DXF / DWF / DWFx / XPS，DWG 通过 Worker + LibreDWG WASM 按需解析，DWF/DWFx/XPS 通过 native `dwf-viewer` 渲染 W2D/W3D/XPS 图形；地理数据通过独立 `@file-viewer/renderer-geo` 标准化 GeoJSON/KML/GPX/SHP、归一化常见坐标系，并用离线 MapLibre 矢量地图叠加点线面，WebGL 不可用时回退 SVG；3D 模型通过 `@file-viewer/renderer-3d` + Three.js loaders 支持常见浏览器可渲染格式，其中 STEP / STP、IGES / IGS、BREP 已由 `@file-viewer/geometry-engine` 接入本地 OCCT Worker/WASM并生成 Three.js 网格，支持适配视图和统一缩放；IFC / 3DM 当前仍由 `@file-viewer/geometry-engine` 维护签名识别与 `web-ifc` / `rhino3dm` 独立内核接入说明；Excalidraw 默认使用 rough.js 只读 SVG，并在运行环境提供官方 ESM 模块时优先尝试官方导出；draw.io 默认使用不执行文档 HTML 的内置 SVG，显式启用 `preferOfficial` 时才在受限 iframe 中按需加载 diagrams.net 离线 viewer；EPUB 在命中格式时加载包内固化并完成许可归档的本地引擎，不走运行时 CDN；UMD 电子书按文件结构解析元数据、目录和 zlib 正文段；音视频使用原生媒体能力并按需补 HLS/MIDI 解析；代码/日志由 `@file-viewer/renderer-text` 使用 `highlight.js` 轻量高亮，HTML 按源码展示；字体、PSD、SQLite、WASM、Parquet、Avro 和 WebArchive 由独立 `@file-viewer/renderer-data` 做安全摘要或结构预览。内置 CAD、3D、绘图、脑图、压缩包、邮件、EDA、Typst、EPUB、UMD、音视频、地理数据和结构化数据回归样例来源清楚，方便复现实文件兼容问题。
- **适合平台复用。** 多个系统可以共用同一套 core 能力和 组件语义，只要升级对应 npm 包即可统一更新预览能力。
- **隔离与定制兼顾。** 低代码、OA、微前端和传统后台里常见的全局 reset 不应破坏预览器；默认 Shadow DOM、`styleIsolation`、`--file-viewer-*` tokens 和 `::part()` 共同提供稳定隔离与主题定制边界。
- **模块化成本可控。** 简单附件系统可以只装 `@file-viewer/core`、目标组件包和少量 renderer；办公套件可以使用 `@file-viewer/preset-office` 并通过 `options.preset` 注入；全格式平台再使用 `@file-viewer/preset-all`。Vite 项目可额外接入 `@file-viewer/vite-plugin`，默认 `fileViewerRenderers({ copyAssets:true })` 就会自动发现已安装 preset，避免所有项目被迫承担同一份依赖体积。
- **全生态同步维护。** Vanilla JS / Pure Web 使用 `@file-viewer/web`，Vue3 使用 `@file-viewer/vue3`，Vue2.7 使用 `@file-viewer/vue2.7`，Vue2.6 使用 `@file-viewer/vue2.6`，React 18/19 使用 `@file-viewer/react`，React 16.8/17 使用 `@file-viewer/react-legacy`，jQuery 使用 `@file-viewer/jquery`，Svelte 使用 `@file-viewer/svelte`。历史 `@flyfish-group/*` 包继续同步维护，但新项目优先选择标准包名。
- **二开路径明确。** 开源总仓库提供 core、标准组件包、Demo、文档和 release 下载物；官方打赏入口作为打赏和优先技术支持入口，避免把源码分发和服务支持混在一起。

## 关键特性

| 能力 | 说明 |
| --- | --- |
| Word | `@file-viewer/renderer-word` 承接 DOCX/DOC/RTF/ODT；`docx` 使用自研 `@file-viewer/docx`，支持 Worker 解析、连续流式阅读、目录字段缓存和异步分批渲染；`.doc` 使用 `msdoc-viewer`，保留文档页面感 |
| Excel | 多种表格格式统一进入表格预览链路，保留常见尺寸、合并和样式 |
| PowerPoint | PPTX 由 `@file-viewer/pptx` 引擎预览；二进制 `.ppt` 由独立版本的 `@file-viewer/ppt@0.3.3` 承接，Demo/Full/CDN 会交付其公开运行时并默认正确配置 |
| PDF | 基于 `pdfjs-dist`，同源 URL 默认渐进读取，服务端支持 Range 时自动分片加载，支持缩放工具栏、页码状态、导航窗格、宽度适配、完整打印和导出 HTML |
| 操作栏 | 支持下载原文件、打印完整渲染结果、导出渲染后 HTML、统一缩放，以及文字或图片水印；打印按钮为紧凑下拉（直接打印 / 掩膜打印），打印会附带当前水印；打印和缩放按钮会按当前格式和渲染链路动态显隐 |
| OFD | 使用 `@file-viewer/renderer-ofd` + `DLTech21/ofd.js` 源码链路，重型能力按需加载 |
| Typst | 直接读取 `.typ` / `.typst` 源文件，按需加载浏览器 WASM 编译与 SVG 渲染链路，支持按页预览、打印和 HTML 导出 |
| 压缩包 | 使用 `libarchive.js` Worker 读取目录，内部文件按需解压、缓存并继续在线预览 |
| 邮件 | EML / MSG / MBOX 支持头信息、HTML/文本正文、附件下载和附件继续预览 |
| EDA | `@file-viewer/renderer-eda` 承接 OLB / DRA / GDSII / OASIS；GDSII 可生成 SVG / WebGL 快速版图，OASIS 文本夹具可生成 SVG，真实二进制 OASIS / Cadence 高保真几何保留独立 WASM 内核路线 |
| CAD | 使用 `@flyfish-dev/cad-viewer`，支持 DWG / DXF / DWF / DWFx / XPS 预览；DWG 通过 Worker + LibreDWG WASM 按需解析，DWF/DWFx/XPS 通过 native renderer 渲染 |
| 地理数据 | GeoJSON / KML / GPX / SHP 转为统一 GeoJSON 后归一化 CRS，并用离线 MapLibre 矢量地图预览轨迹、边界和点位附件 |
| 3D 模型 | 使用 `@file-viewer/renderer-3d` + Three.js loaders 交互渲染 GLTF/GLB、OBJ、STL、PLY、FBX、DAE、3DS、3MF、AMF、USD/USDZ、KMZ、点云和 VTK 等格式 |
| 绘图 | Excalidraw 默认使用 rough.js 只读 SVG，并在运行环境提供官方 ESM 模块时优先尝试 `restore` + `exportToSvg`；draw.io 默认使用不执行文档 HTML 的内置 SVG，显式设置 `preferOfficial = true` 才在受限 iframe 中按需加载 diagrams.net 离线 `GraphViewer`；Mermaid 使用官方 SVG 渲染，PlantUML 默认离线源码预览并支持自托管 SVG 服务，绘图画布支持拖动和统一缩放 |
| 电子书 | EPUB 按需加载包内固化的本地阅读引擎，UMD 解析移动电子书封装、目录和压缩正文 |
| 代码/文本 | `@file-viewer/renderer-text` 使用 `highlight.js` 高亮多语言源码、日志、配置、Notebook、HTTP、Graphviz、Proto、HCL、TeX 和 diff；patch 提供左右比对，git bundle 展示 refs、历史、树和文件 |
| 图片/音视频 | 图片使用浏览器原生能力和轻量查看器，HEIC/HEIF 按需转换，音频、MIDI、MP4、WEBM 和 HLS 按类型选择原生能力或轻量解析器 |
| 字体/设计/数据 | `@file-viewer/renderer-data` 承接字体、PSD、AI/EPS、SQLite、WASM、Parquet、Avro 和 WebArchive；PSD 支持图层显隐、重绘和统一缩放 |

## 开源总仓库与支持

开源总仓库用于分发 core、标准组件包、兼容包、主 Demo、组件 Demo、文档源码、构建产物、示例和 release tarball。私有 Gitea 继续作为完整聚合仓，提供统一发布脚本和内部集成历史。需要支持开源维护时，可使用 [GitHub Sponsors](https://github.com/sponsors/wybaby168) 或 [微信 / 支付宝](https://dev.flyfish.group/sponsor?source=github)；需要私有化、定制或明确响应时间时，请使用 [企业技术支持](https://dev.flyfish.group/shop)。

File Viewer 自有代码遵循 `Apache-2.0` 许可证。二开或商用时，请保留许可证、版权和来源说明，并注明项目来源为 File Viewer by Flyfish / `@flyfish-group/file-viewer3` 或 `@flyfish-group/file-viewer`。第三方与独立版本依赖继续适用各自许可证；`@file-viewer/ppt` 不属于 Apache-2.0 范围，公开运行时保留可见水印，移除 PPT 水印需要商业授权。如果你基于项目修复了通用问题或增强了通用能力，也欢迎一起贡献。

<div class="doc-shot">
  <img src="/_media/file-viewer-demo-v2.2.6-formats-zh.gif" alt="File Viewer by Flyfish v2.3.0 中文特色 DOCX、PPTX、DWG 与可交互三维 STEP 预览动图" width="1200" height="750" loading="lazy" />
  <p class="doc-caption">最新中文 Demo 展示固定工具栏、文件胶囊融合、按格式分组的样例选择器，以及 DOCX、PPTX、XMind、工程文件和压缩包共享的统一交互。</p>
</div>
