# 文档导览

<div class="doc-kicker">Start From The Right Door</div>

<p class="doc-lead">
  File Viewer by Flyfish 官方文档同时承担组件主页、接入手册和开源分发说明。
  文档围绕真实交付路径组织: 先确认支持格式和 Demo 表现，再选择 Vanilla JS / Pure Web、Vue3、Vue2.7、Vue2.6、React、React Legacy、jQuery 或 Svelte 原生接入，最后了解安装、私有化部署和开源分发。
</p>

<div class="doc-link-row">
  <a href="https://doc.file-viewer.app" target="_blank" rel="noreferrer">官方文档</a>
  <a href="https://demo.file-viewer.app" target="_blank" rel="noreferrer">在线 Demo</a>
  <a href="https://github.com/flyfish-dev/file-viewer" target="_blank" rel="noreferrer">GitHub 开源总仓库</a>
  <a href="https://gitee.com/flyfish-dev/file-viewer" target="_blank" rel="noreferrer">Gitee 开源总仓库</a>
  <a href="/zh/guide/quickstart">快速开始</a>
  <a href="/zh/guide/ecosystem">生态接入</a>
  <a href="/zh/guide/formats">支持格式</a>
  <a href="/zh/guide/format-fidelity">格式完整度</a>
  <a href="/zh/guide/on-demand-renderers">按需渲染架构</a>
  <a href="/zh/guide/usage">组件用法</a>
  <a href="/zh/guide/style-isolation">样式隔离</a>
  <a href="/zh/guide/distribution">发布分发</a>
</div>

## 优秀之处

<div class="doc-grid">
  <div class="doc-card">
    <h3>纯前端 Serverless</h3>
    <p>主要解析和渲染工作在浏览器完成，减少后端转码服务、临时文件和任务队列带来的维护成本。</p>
  </div>
  <div class="doc-card">
    <h3>覆盖真实附件场景</h3>
    <p>唯一目录注册 245 个扩展名和 35 条预览链路，其中 222 个稳定、23 个实验；覆盖 Office、Apple 文稿、PDF/OFD、工程、归档、媒体、代码、数据、可选 DICOM 与数字签名格式。</p>
  </div>
  <div class="doc-card">
    <h3>模块化架构更专业</h3>
    <p>core、renderer、preset 和生态组件分层清晰，既能最小化只装单个 renderer，也能用 preset 按产品形态组合完整能力；Vite 插件会自动发现已安装 preset 并注入能力。</p>
  </div>
  <div class="doc-card">
    <h3>按需加载更轻</h3>
    <p>OFD、Typst、XMind、压缩包、邮件、OLB/DRA/GDS/OASIS、CAD、地理数据、3D 模型、绘图、PDF、Office、Markdown、HLS、HEIC、字体/数据资产和代码高亮链路按格式异步加载，避免所有解析器一次性进入首屏。</p>
  </div>
  <div class="doc-card">
    <h3>阅读体验更完整</h3>
    <p>Word 会按主题显示纸张或深色文档面，PDF 支持缩放、导航窗格和宽度自适应，打开后默认就是可读状态。</p>
  </div>
</div>

## 推荐阅读顺序

<div class="doc-grid">
  <div class="doc-card">
    <h3>先看 Demo</h3>
    <p>在线 Demo 和私有化 Demo 都提供按文件类型分组的样例文件盒子，点击样例即可打开并自动收起选择器，适合快速验收全部格式。</p>
  </div>
  <div class="doc-card">
    <h3>确认格式边界</h3>
    <p>支持格式页列出 245 个已注册扩展名、35 条渲染链路、稳定/实验等级和真实业务边界。</p>
  </div>
  <div class="doc-card">
    <h3>选择接入方式</h3>
    <p>Vanilla JS / Pure Web、Vue3、Vue2.7、Vue2.6、React、React Legacy、jQuery 和 Svelte 都有独立标准包；各包只依赖 core 和自身生态依赖，适合私有化部署和多系统复用。</p>
  </div>
  <div class="doc-card">
    <h3>选择模块化装配方式</h3>
    <p>最小化接入只安装命中格式的 renderer；组合接入优先使用 preset-lite、preset-office、preset-engineering 或 preset-all，通过 options.preset 稳定注入；Vite 项目可再用 @file-viewer/vite-plugin 自动发现 preset。</p>
  </div>
  <div class="doc-card">
    <h3>确认样式隔离策略</h3>
    <p>所有标准组件默认使用 Shadow DOM；主题定制使用 CSS tokens 与 ::part，仅旧版深层覆盖场景使用 options.styleIsolation:'none'。</p>
  </div>
  <div class="doc-card">
    <h3>准备发布分发</h3>
    <p>开源分发说明了 npm 包、私有化 Worker/WASM viewer assets、文档静态产物和开源总仓库之间的交付关系。</p>
  </div>
</div>

## Full 包完整交付（2.1.30）

Full 包已内置 `preset-all`，业务代码不需要再次安装或传入 preset。完整格式支持还需要同版本 Worker、WASM、字体和 vendor 资产可访问：Vite 注册 `fileViewerRenderers({ copyAssets:true })` 后会在开发和构建阶段自动发布；Webpack、Vue CLI、Rspack、Rollup、Umi 等运行 Full 包自带的 `npx --no-install file-viewer-copy-assets ./public/file-viewer`。完整部署 `@file-viewer/web-full/dist/` 时资产已经在目录内，无需复制。

## 当前重点能力

- Word 视图会跟随主题显示浅色纸张或深色文档面，`.docx` 会按当前可用宽度自适应缩放，并默认使用真实浏览器 DOM 连续流式渲染以保护目录、制表符、长表格和复杂样式；确实需要页式效果时可按需开启视觉分页。
- 二进制 PPT 使用独立的 `@file-viewer/ppt` 原生 WASM 引擎；PPTX 使用 `@file-viewer/pptx` Worker 引擎，增强组合图形坐标映射、旋转/翻转、主题背景、图片裁剪和 EMF 矢量图预览。
- PDF 视图支持宽度自适应、缩放工具栏、页码状态和可显隐导航窗格；Word / PDF 打印使用专属完整页适配器，打印可附带水印并支持掩膜遮盖，其他格式按能力动态显隐打印按钮。
- OFD 使用 `DLTech21/ofd.js` 的浏览器端解析和渲染能力，并保持按需异步加载。
- 压缩包使用 `libarchive.js` Worker 读取目录，点击内部文件后按需解压、缓存并继续复用统一预览器。
- EML / MSG / MBOX 邮件支持头信息、HTML/文本正文、附件下载和附件继续预览。
- OLB / DRA / GDSII / OASIS 由 `@file-viewer/renderer-eda` 独立承接；GDSII 可生成 SVG / WebGL 快速版图，OASIS 文本夹具可生成 SVG，真实二进制 OASIS / Cadence 高保真几何保留独立 WASM 内核路线。
- CAD 使用 `@flyfish-dev/cad-viewer`，支持 DWG / DXF / DWF / DWFx / XPS；DWG 通过 Worker + LibreDWG WASM 按需解析，DWF/DWFx/XPS 通过 native renderer 渲染，避免阻塞主线程。
- 地理数据支持 GeoJSON、KML、GPX 和 SHP，按需转为 GeoJSON 后做 CRS 归一化，并用离线 MapLibre 矢量地图叠加边界、轨迹和点位。
- 3D 模型走 `@file-viewer/renderer-3d` + Three.js loaders，支持 GLTF/GLB、OBJ、STL、PLY、FBX、DAE、3DS、3MF、AMF、USD/USDZ、KMZ、PCD、VRML/WRL、XYZ、VTK/VTP 等常见浏览器渲染格式。
- Excalidraw 默认使用 `roughjs` 只读 SVG，运行环境提供官方 ESM 模块时会优先尝试官方导出；draw.io 默认走不执行文档 HTML 的内置 SVG 预览，显式设置 `options.drawing.preferOfficial = true` 才在受限沙箱中加载单独分发的 diagrams.net 离线 viewer；Mermaid 走官方 `mermaid` SVG 渲染，PlantUML 默认离线源码预览，也可配置自托管 SVG 服务；这些绘图链路都支持拖拽平移和统一缩放。
- EPUB 按需加载包内固化的本地引擎并提供目录和滚动阅读，UMD 解析目录和压缩正文，音频使用浏览器原生播放器打开，MIDI 展示轨道和时长信息，HLS 视频按需加载 `hls.js`。
- 代码和文本由 `@file-viewer/renderer-text` 使用 `highlight.js` 轻量高亮，覆盖 JSONC、JSON5、Notebook、TOML、Proto、HCL、TeX、Graphviz、HTTP、Ruby、Swift、Kotlin 等常见工程文本；patch 会进入左右比对视图，git bundle 会展示 refs、历史记录、文件树和可读文件内容；HTML 会按源码展示。
- 字体、PSD、AI/EPS、SQLite、WASM、Parquet、Avro 和 WebArchive 走 `@file-viewer/renderer-data` 独立资产/数据预览链路，优先展示结构摘要、字体样张、图层或数据预览，不执行不可信内容。
- 独立文档比对入口 `/compare.html` 支持两侧示例、URL、本地上传、交换、重置、同步滚动、聚焦搜索和行级定位，并可把两侧提取文字做逐行对齐与字符级增删标记；DOCX / 文本为稳定主路径，PDF 文字层对比仍为实验能力。

## 常用入口

| 你要做什么 | 推荐页面 |
| --- | --- |
| 想最快跑起来 | [快速开始](/zh/guide/quickstart) |
| 想确认所有格式 | [支持格式](/zh/guide/formats) |
| 想确认复杂格式能否完整预览 | [格式完整度](/zh/guide/format-fidelity) |
| 想降低安装依赖和首屏体积 | [按需渲染架构](/zh/guide/on-demand-renderers) |
| 想了解最小化引入和组合引入 | [按需渲染架构: 2.1.0 推荐接入步骤](/zh/guide/on-demand-renderers#_2-1-0-推荐接入步骤) |
| 想看示例文件和回归建议 | [Demo 说明](/zh/guide/demo) |
| 想零依赖 iframe 嵌入官方 Demo | [快速开始: 零依赖集成](/zh/guide/quickstart#零依赖集成官方-demo-iframe) |
| 想并排比对两份文件 | [Demo 说明: 文档比对页](/zh/guide/demo#文档比对页) |
| 想在非框架页面中接入 | [纯 JS / Pure Web 集成](/zh/guide/quickstart-web) |
| 想在 Vue 3 中接入 | [Vue3 集成](/zh/guide/quickstart-vue3) |
| 想在 Vue2.7 中接入 | [Vue2 集成](/zh/guide/quickstart-vue2) |
| 想在 React 中接入 | [React 集成](/zh/guide/quickstart-react) |
| 想在 Svelte 中接入 | [Svelte 集成](/zh/guide/ecosystem#svelte) |
| 想在 jQuery 老后台中接入 | [jQuery 集成](/zh/guide/ecosystem#jquery) |
| 想基于 core 自研组件 | [Core 自定义接入](/zh/guide/ecosystem#core) |
| 想单独使用 PPT / PPTX 渲染引擎 | [PPT 与 PPTX 引擎接入](/zh/guide/ecosystem#ppt-与-pptx-引擎接入) |
| 想了解统一 options 和事件 | [组件用法](/zh/guide/usage) |
| 想了解参数和事件 | [组件用法](/zh/guide/usage) |
| 想解决宿主 CSS 样式侵入 | [样式隔离与主题定制](/zh/guide/style-isolation) |
| 想下载源码、release 或了解支持 | [发布与开源分发](/zh/guide/distribution) |

<div class="doc-note">
  如果你只是想快速判断项目是否适合业务，建议先打开 <a href="https://demo.file-viewer.app" target="_blank" rel="noreferrer">demo.file-viewer.app</a> 或运行仓库内置 Demo，再用自己的真实附件补一轮回归。Vanilla JS / Pure Web、React、jQuery 和 Svelte 组件会在业务页面中原生挂载，不依赖官网 Demo。
</div>
