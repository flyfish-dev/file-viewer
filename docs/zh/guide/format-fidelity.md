# 格式完整度与渲染路线

> **Maintainer-only commands:** this page contains complete-workspace release or verification examples that are not part of the public checkout. Public contributors should use the commands in `/README.md` or `/docs/guide/development.md`.

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->

<div class="doc-kicker">Rendering Fidelity</div>

<p class="doc-lead">
  File Viewer by Flyfish 的目标不是“识别一个扩展名就算支持”，而是尽量让文件在浏览器里形成可理解、可操作、可交付的预览体验。
  本页基于当前实现和公开生态调研，说明新增复杂格式的真实完整度、WASM / 手写解析可行性，以及后续需要独立维护的 renderer 方向。
  依赖拆包和按需安装路线见 <a href="/zh/guide/on-demand-renderers">按需渲染架构计划</a>。
</p>

## 分级原则

| 级别 | 标准 | 对外说明口径 |
| --- | --- | --- |
| 完整可视预览 | 能读取主体结构并渲染接近原文件的视觉内容，支持缩放、平移、打印或 HTML 导出等核心操作 | 可以作为正式预览能力 |
| 结构可读预览 | 能安全读取目录、元数据、文本、对象候选或几何子集，但不能承诺专业工具级还原 | 明确标注为结构预览/附件初筛 |
| 需要独立内核 | 格式复杂、生态缺少稳定浏览器库、或需要 C++/Rust/WASM 才能达到完整可视 | 拆成独立包持续维护，不塞进 core |

## 2026-06-23 生态复核

| 格式线 | 复核结论 | 当前落点 |
| --- | --- | --- |
| XMind | `.xmind` 仍以 ZIP 包结构为主，现代文件常见 `content.json`，XMind 8 / Classic 常见 `content.xml`。官方 `xmind-viewer` 明确可把 `.xmind` 渲染成 SVG，但当前 npm 包同时带有 `canvas` / `jsdom` / `svgdom` 等 Node/服务端依赖，不适合作为浏览器组件的默认链路；SimpleMindMap 文档也确认可解包读取 `content.json` 后转换。浏览器端更稳的路线是“轻量解析包结构 + 成熟只读交互画布”。`@ljheee/xmind-parser` 覆盖 XMind 8 XML 与 XMind 2020+ JSON，`@panzoom/panzoom` 体积小、支持 pointer/touch/pinch，适合承接只读画布交互。 | core 已不再默认安装 XMind parser；保持 `@file-viewer/renderer-mindmap` 独立维护。当前实现使用 `@panzoom/panzoom` 处理拖拽平移、移动端双指缩放、Ctrl/Command 滚轮锚点缩放、键盘平移、双击适配视图、首次打开/容器 resize 自动适配、用户交互后视角保留和平移后的统一 toolbar 状态同步；浏览器 smoke 已把 `.xmind` Pointer 拖拽和真实鼠标拖拽写成显式验收。 |
| Typst | 官方 Typst 编译器是 Rust 开源编译器，浏览器稳定路线仍是 WASM 编译后输出 SVG/PDF；`@myriaddreamin/typst.ts` 与 compiler/renderer WASM 最新 npm 版本为 `0.7.0`。 | 保持 `@file-viewer/renderer-typst`，直接读取源 `.typ` / `.typst`，按页 SVG 预览，不做 sidecar PDF 替换。 |
| Archive | `libarchive.js` 是 libarchive 的 browser / WASM port，最新 npm 版本为 `2.0.2`，继续是多压缩包格式最稳的离线方向。 | 保持 `@file-viewer/renderer-archive` 的 Worker + WASM 优先策略，并保留 ZIP/TAR/GZIP 兼容降级。 |
| Email | `postal-mime` 最新 npm 版本为 `2.7.4`，支持 Node、browser、Web Worker 和 serverless；`@kenjiuno/msgreader` 最新 npm 版本为 `1.28.0`，适合作为 MSG 读取层。 | 保持 `@file-viewer/renderer-email` 分别处理 EML/MBOX 与 MSG，正文沙箱化，附件继续复用统一预览器。 |
| GDSII / OASIS | GDSII 有公开记录结构和 TinyTapeout/gdsii 这类 TS parser，也有 GDS2WebGL / GDSJam 等浏览器 WebGL viewer 证明路线可行；KLayout 明确覆盖 GDS 和 OASIS，但完整 OASIS 几何涉及 SEMI 二进制标准、重复结构、压缩块和层级展开，前端完整实现应拆成专业内核。 | `@file-viewer/eda-layout` 已拆出 GDSII record parser、GDSII WebGL triangle/line/point typed-array 批次、OASIS 可读文本夹具解析和真实二进制 OASIS 检测边界；`@file-viewer/renderer-eda` 小图用 SVG，大元素集自动使用 WebGL canvas。真实 SEMI 二进制 OAS/OASIS 继续做安全结构索引和诊断，后续在该 engine 包内演进 WASM/增量渲染。 |
| OLB / DRA | Cadence 文档确认 OLB 是 OrCAD Capture 的 symbol library，DRA 属于 Allegro drawing / footprint 生态；公开规格不完整，未发现可直接开箱即用的官方 Web viewer SDK。公开可持续路线仍是 OpenOrCadParser / OpenAllegroParser 这类 C++ 解析器 WASM 化，或按真实样本逐步 TS 移植；OpenAllegroParser 文档也显示部分 padstack 数据可从嵌入 ZIP/JSON 线索恢复。 | `@file-viewer/eda-orcad` 已拆出 CFB 检测、文本采样、十六进制预览和字符串抽取等底层能力；当前仍只声明结构预览，高保真符号/封装图形继续在独立 engine 包中长期维护，不塞进 core。 |
| OpenDocument | ODF 是 ZIP 包承载 XML 内容的开放格式；`odf-kit` 已提供浏览器/Node 纯 JS 读取与 HTML 转换路线，可作为后续 ODT/ODS/ODP 深化预览候选。 | 当前 Word/OpenDocument 链路优先做安全结构和正文预览；需要更高还原度时，应在 `@file-viewer/renderer-word` 内部按需引入 ODF 专用解析层，而不是进入 core。 |
| Draw.io / Excalidraw / Mermaid / PlantUML | diagrams.net 官方仓库和离线 viewer 仍是 draw.io 最佳只读预览来源；Excalidraw 官方 `restore` + `exportToSvg` 兼容性高但会引入 React peer 依赖；Mermaid 使用官方 SVG renderer；PlantUML 默认离线源码预览，可通过 `plantuml-encoder` 与自托管 SVG 服务端点输出完整图形。 | `@file-viewer/renderer-drawing` 默认用 rough.js 兜底 Excalidraw 以保护 full 包跨框架安装体验，并在运行环境提供官方 ESM 模块时优先尝试官方导出；PlantUML 端点未配置或不可用时会显示离线 SVG 源码预览。 |

## 已确认的完整链路

| 格式 | 当前策略 | 结论 |
| --- | --- | --- |
| Typst | 使用 `@myriaddreamin/typst.ts` 浏览器 WASM 编译和 SVG 渲染，直接读取 `.typ` / `.typst` 源文件 | 保持现有链路，重点补齐资源包、字体、依赖文件错误提示和回归样本 |
| Draw.io | 使用官方 diagrams.net `viewer-static.min.js`，并把 styles、shapes、stencils、img、mxgraph、math 全部自托管 | 保持离线 viewer 优先，内置 SVG 仅作为失败兜底 |
| Excalidraw | 默认使用 rough.js 输出只读 SVG；运行环境提供官方 ESM 模块时尝试 `restore` + `exportToSvg` | 优先保证 full 包不污染 Vue/Svelte/Web 安装；官方模块不可用时稳定兜底 |
| CAD | Autodesk 官方 viewer 路线也把 DWG / DXF / DWF / DWFx 作为独立查看格式处理；前端离线链路委托 `@flyfish-dev/cad-viewer`，DWG 使用 Worker + LibreDWG WASM，DWF/DWFx/XPS 使用 native DWF renderer | 继续跟随 cad-viewer 升级，viewer 只负责资源路径、生命周期和统一 toolbar |
| XMind | `@file-viewer/renderer-mindmap` 解析 XMind 8 XML / XMind 2020+ JSON 包结构，使用 SVG/DOM 脑图阅读器 | 继续增强只读预览体验，当前已使用 `@panzoom/panzoom` 提供拖拽平移、从节点卡片起手拖拽、移动端双指缩放、滚轮锚点缩放、键盘平移、统一工具栏状态同步、容器 resize 自动适配和用户交互后的视角保留 |
| GeoJSON / KML / GPX / SHP | 独立 `@file-viewer/renderer-geo`，GeoJSON 直接读，KML/GPX 转 GeoJSON，SHP 走 Shapefile 到 GeoJSON；core 默认安装不再携带 `@tmcw/togeojson` / `shpjs` / `maplibre-gl` / `proj4` | 默认使用离线 MapLibre 空底图渲染点线面叠加层，可通过 `options.geo.tileUrl` / `options.geo.basemap` 接公网、内网或离线自托管底图；支持 GeoJSON `crs`、`options.geo.projection`、Web Mercator 推断、GCJ-02 / BD-09 转换和 SVG fallback；空间分析仍交给业务 GIS |
| Image / HEIC | core 继续保留 PNG/JPEG/SVG/WebP 等浏览器原生图片预览；HEIC/HEIF 转换依赖体积和兼容性更重，适合独立 renderer 承接 | `heic2any` 已从 core 直接依赖中移除，HEIC/HEIF 和完整图片链路由 `@file-viewer/renderer-image` 或 preset 装配 |
| GDSII | `@file-viewer/eda-layout` 提供 GDSII record parser 和 WebGL draw batch，`@file-viewer/renderer-eda` 读取 library、structure、boundary、path、text、sref/aref 和坐标边界，小图输出 SVG，大元素集输出 WebGL canvas | 当前可作为 GDSII 版图快速预览；层控制、层级实例展开和 tile 增量加载继续在 `@file-viewer/eda-layout` 中演进 |
| STEP / STP、IGES / IGS、BREP | `@file-viewer/geometry-engine` 在一次性 Worker 中加载本地 `occt-import-js` runtime 与 OpenCascade WASM，完成三角化后由 `@file-viewer/renderer-3d` 构建 Three.js 装配层级和网格 | 已具备浏览器本地完整网格预览、轨道控制、适配视图和统一缩放；Worker、runtime、WASM 与许可证文件随 viewer assets 离线分发 |

## 当前只能作为结构预览的格式

| 格式 | 现状 | 后续完整方案 |
| --- | --- | --- |
| OLB | `@file-viewer/eda-orcad` 提供 CFB/OLE2 检测、文本采样、字符串抽取和十六进制预览，`@file-viewer/renderer-eda` 负责结构树、属性和元件候选展示 | 参考 OpenOrCadParser 的 C++ 解析路线，后续通过 Emscripten/WASM 或逐步 TS 移植补齐符号图形 |
| DRA | `@file-viewer/eda-orcad` 提供二进制检查基础能力，`@file-viewer/renderer-eda` 展示封装/padstack/图形候选和可读属性 | DRA/PSM/PAD 属于 Allegro 私有数据库生态，应先积累真实样本，再在独立 engine 包中维护 OrCAD/Allegro parser |
| OAS/OASIS | `@file-viewer/eda-layout` 当前能解析项目内 OASIS 可读文本夹具并输出 SVG 预览；真实 SEMI 二进制 OASIS 仍做 header 检测、完整渲染边界声明、安全二进制索引、可读字符串、结构候选和诊断 | OASIS 需要低层 record parser、重复结构展开、压缩块处理和版图实例渲染，继续在 `@file-viewer/eda-layout` 内演进 |
| IFC / 3DM | `@file-viewer/renderer-3d` 保留入口，`@file-viewer/geometry-engine` 负责签名识别和明确的接入说明，当前不虚标为成功预览 | IFC 后续接入 `web-ifc` / That Open Fragments，3DM 后续接入 `rhino3dm` / Three.js loader，并继续在独立几何包内演进 |

## 当前落地策略

| 格式线 | 浏览器端可行方案 | File Viewer by Flyfish 当前动作 |
| --- | --- | --- |
| XMind | `.xmind` 本质是 ZIP，现代 XMind 使用 `content.json`，经典 XMind 8 使用 `content.xml`；成熟 viewer 都以“解析包结构 + 可拖拽缩放画布”为体验基线 | `@ljheee/xmind-parser` 只保留在独立 `@file-viewer/renderer-mindmap` 内，core 默认安装不再携带脑图解析依赖；当前画布式平移和缩放由 `@panzoom/panzoom` 承接，并保留从空白画布或节点卡片起手拖拽、移动端双指缩放、键盘方向键、Ctrl/Command 滚轮锚点缩放、双击适配视图、容器 resize 自动适配和统一 toolbar 状态同步 |
| OLB / DRA / PSM | Cadence 格式没有稳定官方 Web SDK；公开可用路线主要是 OpenOrCadParser / OpenAllegroParser 这类 C++ 解析器，后续可以 Emscripten/WASM 化或按样本逐步 TS 移植 | 当前只声明为结构预览，不虚标完整图形；底层能力已拆到 `@file-viewer/eda-orcad`，后续像 PPTX 一样长期维护 |
| GDSII / OASIS | GDSII 已可按 record parser 生成 SVG/WebGL；OASIS 是 SEMI 二进制版图格式，支持压缩块、重复结构和更复杂索引，完整渲染更适合参考 KLayout/KWeb 或自研 WebGL/WASM pipeline | GDSII 当前提供 SVG 快速预览和大元素集 WebGL canvas；OASIS 可读文本夹具已可生成 SVG，真实二进制 OASIS 继续结构索引，底层能力已拆到 `@file-viewer/eda-layout`，后续做 WASM/增量渲染 |
| STEP / STP、IGES / IGS、BREP | OpenCascade / OCCT WASM 在浏览器内解析 B-Rep 并输出 Three.js 可用网格 | `@file-viewer/geometry-engine` 已接入本地 OCCT Worker、runtime 和 WASM；`@file-viewer/renderer-3d` 保留装配层级、实例、法线和面颜色，并注册统一缩放 provider；重型内核不进入 core 默认路径 |
| IFC / 3DM | IFC 走 `web-ifc` / That Open 生态，3DM 走 `rhino3dm` + Three.js Rhino3dmLoader | 当前只维护格式签名和接入提示，后续在独立几何包中实现，不影响已经落地的 OCCT 预览链路 |
| Draw.io / Excalidraw / Mermaid / PlantUML | Draw.io 最佳链路是自托管 diagrams.net offline viewer；Excalidraw 默认使用 rough.js 只读 SVG，运行环境提供官方 ESM 模块时尝试官方 restore/export；Mermaid 使用官方 SVG renderer；PlantUML 默认离线预览源码，可选接入自托管 SVG 服务 | 已拆成 `@file-viewer/renderer-drawing` 独立维护，继续离线 vendor 分发；PlantUML 完整图形渲染推荐企业内网自托管服务端点 |
| Presentation / PPT / PPTX | 二进制 PPT 与 OOXML 演示文稿都适合独立 engine + renderer 双层维护，避免 core 被解析器、主题和媒体链路拖重 | `@file-viewer/renderer-presentation` 暴露标准 renderer 插件，`.ppt` 使用独立版本且保留包内许可证的 `@file-viewer/ppt@0.3.3`，OpenXML 文件使用 `@file-viewer/pptx` Worker；Full/CDN 分别交付两条链路的匹配资产 |
| GeoJSON / KML / GPX / SHP | KML/GPX 有稳定 toGeoJSON 转换路线，Shapefile 可用纯 JS 解析到 GeoJSON，MapLibre 可承接离线矢量叠加层 | 已拆 `@file-viewer/renderer-geo` 并从 core 直接依赖中移除转换和地图库；当前补齐 CRS 归一化、MapLibre 叠加层、SVG fallback 和解析 harness，后续继续补海量要素抽稀和真实公开样本 |
| Typst | 官方 Rust 编译器生态已可通过 `typst.ts` 在浏览器 WASM 编译并渲染为 SVG/PDF | 保持 `@file-viewer/renderer-typst` 独立维护 compiler/renderer WASM、超时和资源错误提示 |

## 外部调研依据

- Typst 官方生态中，`typst.ts` 明确定位为把 Typst 编译/渲染带到 JavaScript 和浏览器 WASM 环境: <https://github.com/myriad-dreamin/typst.ts>
- diagrams.net 官方文档推荐把 `viewer-static.min.js` 从仓库复制到企业可访问位置自托管，适合内网离线场景: <https://www.drawio.com/docs/integrations/atlassian/confluence/customise/configure-javascript-viewer-drawio-confluence-server/>
- diagrams.net 官方集成文档说明 embed/viewer 模式通过 iframe/window 和 HTML5 Messaging API 控制，企业离线部署应自托管官方静态资源: <https://jgraph.github.io/drawio-integration/>
- Autodesk 官方在线 Viewer 明确提供 2D / 3D 设计文件查看路线，可作为 CAD 预览能力和真实样例来源的外部口径: <https://viewer.autodesk.com/>
- XMind 官方 `xmind-viewer` 能解析 `.xmind` 并输出 SVG，但其 npm 依赖不适合成为浏览器预览器默认安装链路，因此 viewer 继续使用轻量解析器 + 自有只读交互画布: <https://github.com/xmindltd/xmind-viewer>
- XMind 官方 SDK 主要面向创建/读写 XMind 文件，可作为格式结构参考: <https://github.com/xmindltd/xmind-sdk-js>
- SimpleMindMap 文档也确认 `.xmind` 可以按 ZIP 解包并读取 `content.json` 转换为脑图数据: <https://wanglin2.github.io/mind-map-docs/en/api/xmind.html>
- Mind Elixir 是成熟的交互式脑图内核，适合作为未来“更强交互/编辑级阅读”的候选，但不直接替代当前 XMind 文件解析链路: <https://www.npmjs.com/package/mind-elixir>
- Panzoom 是轻量成熟的 DOM/SVG 平移缩放库，当前已经用于 XMind 只读画布平移、触摸缩放和真实鼠标拖拽回归，避免继续维护脆弱的手写手势状态机: <https://github.com/timmywil/panzoom>
- OASIS ODF 包规范确认 OpenDocument 以 ZIP 包承载 XML 内容和二进制条目，适合先做浏览器端包结构解析: <https://docs.oasis-open.org/office/OpenDocument/v1.3/OpenDocument-v1.3-part2-packages.html>
- toGeoJSON 生态明确用于 KML / GPX 转 GeoJSON，适合作为地理数据按需 renderer 的转换层: <https://www.npmjs.com/package/@tmcw/togeojson>
- Shapefile.js 是纯 JavaScript Shapefile 到 GeoJSON 解析库，适合浏览器端 SHP 快速预览: <https://github.com/calvinmetcalf/shapefile-js>
- libarchive.js 是 libarchive 的 WebAssembly/browser 封装，支持 ZIP、7z、RAR、TAR 等多种归档和压缩格式: <https://github.com/nika-begiashvili/libarchivejs>
- archive-wasm 也是 libarchive 的浏览器/Node WASM 路线，但许可证为 GPL-3.0，当前不作为默认集成方案: <https://github.com/HeavenVolkoff/archive-wasm>
- postal-mime 明确支持 Node.js、浏览器、Web Worker 和 serverless 环境，适合 EML/MBOX 邮件预览: <https://github.com/postalsys/postal-mime>
- GDS2WebGL 证明 GDSII 可以在浏览器里做 WebGL pan/zoom 查看，适合成为后续 GDS/OASIS 独立 renderer 的参考: <https://github.com/s-holst/GDS2WebGL>
- GDSJam 证明 GDSII/DXF 可以做客户端 WebGL viewer，适合为大版图交互性能设定基线: <https://github.com/jwt625/gdsjam>
- TinyTapeout/gdsii 提供 TypeScript GDSII parser，说明标准 GDSII 记录层适合继续在独立 renderer 中深化: <https://github.com/TinyTapeout/gdsii>
- KLayout 明确是 GDS 和 OASIS viewer/editor，可作为后续 OASIS 完整几何内核的行为对照: <https://www.klayout.de/intro.html>
- LayoutEditor 对 OASIS 的说明确认它是用于光罩生产和层级 IC mask layout 的二进制格式，完整预览不应只靠字符串索引虚标: <https://layouteditor.org/layout/file-formats/oasis>
- OASIS 公开生态里存在低层解析器，但不是完整 Web viewer，需要在解析层之上自行构建几何模型和渲染层: <https://github.com/EDDRSoftware/oasFileParser>
- Cadence 对 OLB 的说明确认它是 OrCAD Capture symbol library，包含元件符号、pin 定义和属性等结构: <https://resources.pcb.cadence.com/blog/2024-pcb-schematic-file-formats>
- OpenOrCadParser 是 OrCAD DSN/OLB 二进制解析的 C++ 开源实现，说明 OLB 完整解析可行，但工程量和样本覆盖都应独立维护: <https://github.com/Werni2A/OpenOrCadParser>
- OpenAllegroParser 是 Allegro 二进制解析的 C++ 开源路线，适合作为 DRA / PSM / PAD 后续 WASM 内核参考: <https://github.com/Werni2A/OpenAllegroParser>
- OpenAllegroParser 的 padstack 研究说明部分新格式数据可能包含嵌入 ZIP/JSON 结构，后续可以作为 Allegro parser 的样本恢复线索: <https://github.com/Werni2A/OpenAllegroParser/blob/main/doc/pad.md>
- odf-kit 提供浏览器/Node 纯 JS 的 OpenDocument 读取和 HTML 转换路线，适合后续深化 ODT/ODS/ODP 预览: <https://github.com/GitHubNewbie0/odf-kit>
- Cadence Allegro X Free Viewer 是官方只读查看路径，可以打开并检查 Allegro X PCB / APD / System Capture 数据库；浏览器离线预览仍需自研解析内核承接: <https://www.cadence.com/en_US/home/tools/pcb-design-and-analysis/allegro-downloads-start.html>
- OpenCascade.js 是 Open CASCADE Technology 官方列出的 JavaScript/WebAssembly 绑定路线，可作为后续精确 CAD 几何内核的长期参考: <https://dev.opencascade.org/project/opencascadejs>
- `occt-import-js` 已作为当前 STEP / IGES / BREP 浏览器 WASM 导入实现，并把网格交给 Three.js 渲染: <https://github.com/kovacsv/occt-import-js>
- That Open `web-ifc` 生态提供 IFC 的 WASM 读取能力；That Open 的 IFC Loader 文档还建议把 IFC 转换成可复用 Fragments 资产，适合大 BIM 文件的二次加载优化: <https://github.com/thatopen/engine_web-ifc>
- McNeel `rhino3dm.js` 基于 openNURBS 并随 `rhino3dm.wasm` 运行在浏览器和 Node.js，Three.js 也提供 Rhino3dmLoader，适合后续 3DM 独立几何 renderer: <https://github.com/mcneel/rhino3dm>
- KLayout 明确定位为 GDS 和 OASIS viewer/editor；KWeb / KLayout Web Viewer 说明 GDS 在线浏览更适合按专业版图 viewer 路线独立演进: <https://www.klayout.de/intro.html>
- KLayout 生态还有 `dump_oas_gds2` 这类低层 GDS2 / OASIS dump 工具，适合作为后续 WASM 化或测试对照样本路线: <https://github.com/klayoutmatthias/dump_oas_gds2>

## 后续验收 checklist

- [x] XMind 使用 `@panzoom/panzoom` 支持 Pointer / 鼠标 / 触摸拖拽平移、从节点卡片起手拖拽、移动端双指缩放、Ctrl/Command 滚轮锚点缩放、键盘方向键平移、双击适配视图、容器 resize 自适应和用户交互后视角保留。
- [x] 继续保持 Draw.io、Typst WASM/字体、CAD、archive、PDF worker/WASM/vendor 静态资源全部自托管，不依赖公共 CDN。
- [x] 使用 `pnpm verify:format-support` 校验 221 个注册扩展名（221 个稳定、0 个实验）和 32 条 renderer pipeline 口径一致。
- [x] 在 smoke matrix 中把 XMind `pan` 和真实鼠标拖拽列为显式断言，防止只校验打开成功而漏掉画布交互。
- [ ] 为 XMind 增加真实复杂样本，覆盖多 sheet、标签、备注、图片、链接、折叠节点和大脑图拖拽回归。
- [ ] 为 GDSII 增加真实公开版图样本，验证层过滤、实例引用、文本和大文件性能。
- [x] 拆出 `@file-viewer/eda-layout`，专门维护 GDSII / OASIS record parser、WebGL/WASM 边界和后续大版图增量渲染。
- [x] 拆出 `@file-viewer/eda-orcad`，专门维护 OLB / DRA / PSM / PAD 二进制检查、后续 C++ WASM/TS 移植和 OrCAD/Allegro 样本回归。
- [x] 为 STEP / IGES / IFC / 3DM / BREP 建立独立 `@file-viewer/geometry-engine` 边界包，避免几何内核进入默认 core install path；STEP / STP、IGES / IGS、BREP 已完成离线 OCCT Worker/WASM 预览，IFC 与 3DM 继续按 `web-ifc` / `rhino3dm` 路线分层演进。
- [x] 在浏览器烟测里加入 XMind pan/zoom 的实际交互断言。
- [x] 在浏览器烟测里继续补齐 Typst WASM/字体、Draw.io offline viewer、CAD WASM / DWF native canvas、GDSII / OASIS fixture preview 的实际渲染或交互断言。

<div class="doc-note">
  复杂工程格式不要强行虚标“全量高保真”。能完整渲染的走成熟库和 WASM；目前只能安全解析的格式要明确边界，并把专业内核拆成可独立迭代的 renderer 包。
</div>
