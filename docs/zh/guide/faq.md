---

> **Maintainer-only commands:** this page contains complete-workspace release or verification examples that are not part of the public checkout. Public contributors should use the commands in `/README.md` or `/docs/guide/development.md`.

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->
description: "快速排查 File Viewer 组件选型、Full 包资源、Worker/WASM 路径、格式支持、移动端布局、授权与部署问题。"
---

# 常见问题

## 不同生态应该安装哪个包

新项目优先选择 `@file-viewer/*` 标准包名:

| 项目生态 | 推荐包 |
| --- | --- |
| Vue3 | `@file-viewer/vue3` |
| Vue2.7 | `@file-viewer/vue2.7` |
| Vue2.6 | `@file-viewer/vue2.6` |
| React 18/19 | `@file-viewer/react` |
| React 16.8/17 | `@file-viewer/react-legacy` |
| Vanilla JS / Pure Web / script 标签 | `@file-viewer/web` |
| jQuery | `@file-viewer/jquery` |
| Svelte / SvelteKit | `@file-viewer/svelte` |
| 自研组件或深度二开 | `@file-viewer/core` |

历史包名 `@flyfish-group/file-viewer3`、`file-viewer3`、`@flyfish-group/file-viewer`、`@flyfish-group/file-viewer-react`、`@flyfish-group/file-viewer-web` 仍会同步维护，主要用于旧项目不改包名升级。

所有包线的格式能力、示例文件、`file` / `url` 参数行为、options、事件和类型语义保持一致。Vanilla JS / Pure Web、Vue3、Vue2、React、jQuery 和 Svelte 都是各自生态的原生接入，不需要借用其他框架组件。

`*-full` 已内置 `preset-all`，但 Worker、WASM、字体和 vendor 文件仍必须发布到静态目录。Vite 项目使用 `@file-viewer/vite-plugin` 的 `copyAssets: true`；其他构建工具运行 full 包自带的同版本 `npx --no-install file-viewer-copy-assets ./public/file-viewer`。默认访问路径为 `<部署基址>/file-viewer/`，根部署即 `/file-viewer/`。

## full 包安装后还需要复制 assets 吗

不一定需要手动复制。Full 不会把 PDF Worker、CAD/Typst/Archive WASM、字体等二进制资源内联进业务 JavaScript，因此完整格式支持必须发布这些同版本资产；但从 `2.1.30` 起，Vite 自动处理，完整 `web-full/dist/` 也已自带资产，只有非 Vite 入口构建需要执行一次 CLI。

- Vite：启用 `fileViewerRenderers({ copyAssets: true })`，开发和构建都会把匹配当前 full 包的资源发布到 `<部署基址>/file-viewer/`。
- Webpack、Vue CLI 等：直接运行 full 包自带的 `npx --no-install file-viewer-copy-assets ./public/file-viewer`。
- 自定义静态前缀：启动时调用 full 包导出的 `setDefaultFullAssetBaseUrl()`。
- CDN / IIFE：完整部署 `@file-viewer/web-full/dist/` 时 assets 已在目录内，无需再复制；只复制入口 IIFE 文件不完整，可运行随包 CLI。

不要单独安装另一个版本的 `preset-all` 或复制工具，否则容易出现 API、Worker 和 WASM 版本不一致。

## 如何确认 DOCX 0.3.27 修复已经生效

当前 Word renderer 的主线程和离线 Worker 均使用 `@file-viewer/docx@0.3.27`。它包含 0.3.26 的日文文字、VML 文本框、Apache POI `w:hMerge` 与多分节浮动图形修复，并补充了 #202 复杂文档所需的框架、分节和定位页面修复。

升级后需要重新发布同版本 viewer assets，并在浏览器网络面板确认 `vendor/docx/docx.worker.js?file-viewer-docx=0.3.27`（可能位于自定义 `file-viewer/` 基址下）真实返回 JavaScript。不要混用旧版本 Worker；如果仍看到旧布局，请清理 CDN 或 Service Worker 缓存后重新加载文档。

## npm 11 安装时报 `Cannot read properties of null (reading 'matches')`

这通常不是 `@file-viewer/*` 包版本不匹配。我们已经用 npm 11.17.0 在干净临时目录验证过 registry 安装和本地 tgz 依赖闭包安装，`@file-viewer/vue3 + @file-viewer/preset-office` 均可正常安装和导入。

这个错误来自 npm 内部 Arborist 构建依赖树时访问了空的 link target，常见触发原因是同一个项目目录里先用 pnpm、bun、vlt 等包管理器生成过 `node_modules`，之后又执行 `npm install`。npm 看到 store-style symlink 时可能直接抛出 `matches` 的 TypeError，而不是给出清晰提示。

建议按以下顺序处理:

```bash
# 如果项目决定使用 npm
rm -rf node_modules package-lock.json npm-shrinkwrap.json
npm cache verify
npm install
```

```bash
# 如果项目原本使用 pnpm，请保持同一个包管理器
rm -rf node_modules package-lock.json
pnpm install
```

离线 tgz 场景也要注意：只安装一个顶层 tgz 时，它的依赖仍需要能从 npm registry、私有 registry 或同目录依赖 tarball 中解析到。企业内网建议把 `@file-viewer/vue3`、所选 preset、preset 内部 renderer、`@file-viewer/core` 等同版本 tarball 一起放入私有 npm 源，或在安装命令/业务 package.json 中同时声明这些本地 tgz。

项目内置了安装烟测命令，发布前可复核 npm 最新版兼容性:

```bash
pnpm verify:npm-install-smoke
```

## URL 预览为什么失败或空白

组件在浏览器里通过 `axios` 请求目标文件，所以最常见的失败原因是:

- 文件地址本身不可访问
- 服务端没有正确配置 CORS
- 鉴权信息只能在宿主系统内使用，浏览器直接请求拿不到文件

如果你的场景带有登录态、签名 URL 或内部权限体系，优先由业务侧先完成鉴权下载，再使用 `file` + `name` 参数预览。

## React 或纯 JS 集成后为什么页面空白

最常见原因是父容器没有稳定高度，或者传入的二进制缺少 `name`，导致无法判断格式。请先检查:

- 容器是否有明确高度，例如 `height: 100vh`
- `file` 是 `Blob` / `ArrayBuffer` 时是否同时传入 `name`
- `url` 是否能被浏览器直接访问，且服务端正确返回 CORS
- 控制台是否有 worker/WASM 的 MIME 或 CSP 报错

如果报错来自 archive、CAD、Typst 等重型资源路径，请发布并自托管资源:

```bash
npx --yes file-viewer-copy-assets ./public/file-viewer
```

## 为什么带查询参数的下载地址有时识别不到格式

当前预览器会根据文件名扩展名判断该走哪条渲染链路。如果 URL 形如 `/download?id=123`，路径里没有明确的 `.pdf`、`.docx`、`.xlsx` 这类后缀，渲染器就很难准确识别文件类型。

这类地址最稳妥的做法是:

- 先在业务侧请求文件
- 拿到 `Blob` 或 `ArrayBuffer`
- 再包装成带正确文件名的 `File`

## 为什么一定要给父容器设置高度

预览器默认使用 `width: 100%` 和 `height: 100%` 填满父容器。如果父容器没有稳定高度，渲染区域就会塌陷，看起来像“没有内容”。

## `file` 和 `url` 同时传时，谁优先

当前行为是 `file` 优先。如果后续把 `file` 清空，而 `url` 仍然存在，组件会回退到 `url` 再次加载。

## `.doc` 和 `.docx` 的渲染实现一样吗

不一样。

- `docx` 由 `@file-viewer/renderer-word` 调用自研 `@file-viewer/docx`
- `doc` 由 `@file-viewer/renderer-word` 调用 `msdoc-viewer`

另外，`.doc` 还额外套了一层 Word 风格页面容器，让页面在灰色背景中居中展示。

## `Blob` 或 `ArrayBuffer` 能直接传给 `file` 吗

从接入经验上看，不建议直接把裸 `Blob` 或 `ArrayBuffer` 塞进去。

原因很简单: 预览器要靠文件名扩展名来选择渲染器，而裸二进制本身通常不带可靠的文件名。更稳妥的方式是:

```ts
const file = new File([blobOrBuffer], 'report.xlsx')
```

这样既保留了二进制链路，也把渲染器最依赖的扩展名补齐了。

## `xls` 和 `xlsx` 的样式能力有什么差异

当前表格预览由 `@file-viewer/renderer-spreadsheet` 承接，内部统一走 `styled-exceljs`，会读取文件里能表达的列宽、行高、合并单元格、边框、填充和对齐等信息。差异主要来自格式本身: `xlsx` 通常保存的样式信息更完整，而 `xls/csv/ods` 等格式可能缺少部分现代样式描述。

## `html` 文件为什么是按文本显示的

因为当前版本把 `html` 放在代码/文本类型里处理，它会展示并高亮源内容，而不会把文件当作网页直接执行。这是为了保证预览行为更安全、更可控，也更适合代码和模板查看。

## DWG 能直接预览吗

可以。CAD 预览当前使用 `@flyfish-dev/cad-viewer`，DWG 会通过独立 Worker 加载 LibreDWG WASM，在浏览器本地解析图层、块参照和常见几何实体；DXF 使用 JavaScript parser；DWF / DWFx / XPS 使用 native `dwf-viewer` 渲染 W2D/W3D/XPS 图形。

私有化部署时请确认 viewer assets 目录下的 `wasm/cad/libredwg-web.js`、`wasm/cad/libredwg-web.wasm`、`wasm/cad/dwfv-render.wasm` 和 `wasm/cad/dwg-worker.js` 能被静态服务直接访问，且 `.wasm` 不要被网关回退成 HTML。路径不同可以通过 `options.cad.wasmPath`、`options.cad.workerUrl` 和 `options.cad.dwfWasmUrl` 覆盖。

## 3D 模型支持哪些格式

3D 模型走 `@file-viewer/renderer-3d` 按需渲染，当前支持 `glb`、`gltf`、`obj`、`stl`、`ply`、`fbx`、`dae`、`3ds`、`3mf`、`amf`、`usd`、`usda`、`usdc`、`usdz`、`kmz`、`pcd`、`wrl`、`vrml`、`xyz`、`vtk`、`vtp`。如果模型依赖外部贴图、材质或 `.bin`，远程 URL 预览会按原文件目录继续加载；本地上传建议优先使用单文件 `.glb`。

`step` / `stp`、`iges` / `igs` 和 `brep` 已经可以直接预览：文件在本地 OCCT Worker/WASM 中解析，生成真实网格后支持轨道控制、适配视图和统一缩放，不需要私有服务端转换。私有化部署需保留 `wasm/model/occt-worker.js`、`wasm/model/occt-import-js.js` 和 `wasm/model/occt-import-js.wasm`；子路径可用 `options.model.workerUrl`、`options.model.runtimeUrl`、`options.model.wasmUrl` 覆盖。`ifc` 与 `3dm` 当前仍只提供签名识别和专业内核接入说明。

## Excalidraw 和 draw.io 是怎么预览的

`.excalidraw` 默认走 `roughjs` 只读 SVG 预览，运行环境已提供官方 `@excalidraw/excalidraw` ESM 模块时会优先尝试 `exportToSvg`；`.drawio` / `.dio` 默认使用随 viewer assets 分发的官方 diagrams.net `GraphViewer` 离线预览。项目会在加载 `vendor/drawio/viewer-static.min.js` 前，把 styles、shapes、stencils、img、mxgraph 和 math 路径全部指向本地 `vendor/drawio/`，不会访问 diagrams.net 公网脚本或公共 CDN。官方 viewer 加载失败、超时，或显式设置 `options.drawing.preferOfficial = false` 时，才会回退到内置 SVG 安全预览。

diagrams.net 官方仓库没有维护最新 npm viewer 包；官方文档推荐的离线集成方式就是复制仓库里的 `viewer-static.min.js` 自托管。项目内置的是官方 `v30.2.5` release 的 viewer 文件和配套资源，不使用已经滞后的第三方 `drawio-offline` 包。

## 压缩包能预览到什么程度

压缩包优先走独立的 `@file-viewer/renderer-archive`，内部使用 `libarchive.js` 的 WASM Worker，支持 ZIP、7z、RAR、TAR、GZIP、BZIP2、XZ、CAB、ISO、JAR、APK、CBZ/CBR 等入口。组件先读取目录，用户点击内部文件后才按需解压，避免一次性把大包展开到主线程。

内部文件会继续复用统一预览器，所以压缩包里的 PDF、Office、Markdown、代码、图片、邮件或嵌套压缩包都可以在体积限制内打开。私有化部署默认会先尝试当前部署 base 下的 `vendor/libarchive/worker-bundle.js`；如果手机 WebView、本地临时服务器、MIME 或 CSP 导致 Worker 初始化超时，还会切换到 ZIP/TAR/GZIP 兼容模式。旧系统生成、未声明 UTF-8 的 ZIP 中文文件名会自动按 GBK/GB18030 兼容解码，避免目录名乱码。只有静态目录或 WASM 位置特殊时，才需要通过 `options.archive.workerUrl` / `options.archive.wasmUrl` 指定路径。

## full 包仍提示 libarchive Worker 未加载怎么办

所有 full 包默认会把 Archive、PDF、DOCX、Excel、二进制 PPT、PPTX、CAD、Typst、Draw.io、SQLite 等离线资产指向部署基址下的 `file-viewer/`。根部署时，请确认这两个示例 URL 真实返回 JavaScript/WASM，而不是网关 404 或 SPA HTML 回退：

- `/file-viewer/vendor/libarchive/worker-bundle.js`
- `/file-viewer/vendor/libarchive/libarchive.wasm`

如果资源不在部署基址下的 `file-viewer/`，在应用启动前调用：

```ts
import { setDefaultFullAssetBaseUrl } from '@file-viewer/react-full'

setDefaultFullAssetBaseUrl('/your-static-prefix/')
```

兼容模式提示并不代表 ZIP/TAR/GZIP 完全不可用；它表示 libarchive Worker 当前没启动成功，RAR、7z、加密压缩包等仍需要发布上述 Worker/WASM。ZIP、TAR、GZIP 会优先走兼容路径，旧 GBK/GB18030 中文 ZIP 文件名也会继续正确解码。

## 能否完全离线部署，不访问公共 CDN

可以。预览运行时默认不依赖公共 CDN 或第三方在线静态资源。full 包必须通过 Vite 插件或同版本 `file-viewer-copy-assets` 把 PDF.js worker/CMap/WASM/standard fonts、Draw.io 官方 viewer 资产、CAD WASM、Typst WASM/字体、SQLite WASM、压缩包 worker 和 Office worker 发布到业务静态目录。路径特殊时使用 full 包的 `setDefaultFullAssetBaseUrl()`，或使用 `options.pdf.*`、`options.drawing.viewerScriptUrl`、`options.cad.*`、`options.typst.*`、`options.data.sqlWasmUrl`、`options.archive.*`、`options.docx.workerUrl`、`options.docx.workerJsZipUrl`、`options.spreadsheet.workerUrl` 指向自托管资源。

Typst 本地 WASM 或默认字体目录不可用、浏览器端编译超时时会显示明确错误，不会切换源码预览，也不会为了兜底访问外部站点；Draw.io 官方离线 viewer 不可用时会切换内置 SVG 预览；地理数据默认使用离线 MapLibre 矢量地图，WebGL 不可用时回退 SVG 预览。

## 邮件和 EDA 文件怎么预览

邮件链路由 `@file-viewer/renderer-email` 独立承接。`.eml` / `.mbox` 使用 `postal-mime`，`.msg` 使用 `@kenjiuno/msgreader`。邮件预览会展示头信息、HTML/文本正文和附件列表；附件可以下载，也可以继续交给统一预览器打开。HTML 正文会放进隔离沙箱文档，不执行脚本。

`.olb` / `.dra` / `.gds` / `.oas` / `.oasis` 由 `@file-viewer/renderer-eda` 独立承接。OLB / DRA 使用 `cfb` 解析常见 OrCAD / Allegro 复合文档容器，展示结构树、元件/封装/Padstack 候选、属性、诊断、文本片段和可读字符串；标准 GDSII 会生成 SVG / WebGL 快速版图；OASIS 文本夹具可生成 SVG，真实 SEMI 二进制 OASIS 先做安全结构索引。它适合做附件初筛，不替代专业 EDA 软件里的封装编辑、电气规则校核或制造输出。

## 水印、打印和导出怎么配置

通过 `options` 配置即可。`options.watermark` 支持文字或图片水印，`options.toolbar` 可以控制下载原文件、打印完整渲染内容、导出渲染后 HTML、统一缩放按钮和操作栏位置。`toolbar.zoom` 可关闭缩放按钮；不要在宿主外层用 CSS transform 强行缩放预览器，PDF、表格、CAD、canvas 和文本层可能出现坐标偏移。`toolbar.position` 支持 `auto`、`top`、`top-center`、`bottom-right`，默认 `auto`，PDF 会自动悬浮到右下角以避开自身导航栏；需要顶部水平居中时传 `top-center`。打印按钮会按当前文件类型、渲染完成状态和导出适配器动态显隐；表格、压缩包、邮件、EPUB、音视频、3D / 模型等不适合直接打印的链路会自动隐藏。打印和 HTML 导出不会修改原始文件；Word / PDF 会通过专属导出适配器生成完整页面，避免只打印当前视口、当前页或被滚动容器裁切。

## 为什么 PDF 打印不是当前屏幕截图

从 `1.0.19` 起，PDF 的打印和导出 HTML 不再克隆当前可见 canvas，而是重新按页生成完整 PDF 页面。这样即使用户只滚动到第一页、开启了导航窗格，或当前视口里只渲染了部分页面，打印窗口和导出的 HTML 仍然会包含完整页序。Word / DOC 现在也会走独立导出页面，避免 Demo 容器样式、滚动高度或缩放状态导致只打印第一页。

## EPUB、UMD 和音频是怎么预览的

`.epub` 由 `@file-viewer/renderer-epub` 独立承接。v2.3.0 的阅读引擎是包内固化、按需加载并附带 NOTICE 的本地 vendor 资产，不会从公网加载，也不会把旧版 XML 解析依赖带进业务生产依赖树。阅读区默认使用滚动文档模式，兼容性比超宽分页布局更稳，避免部分浏览器出现正文白板。当前不内置 Kindle 专有格式或 DRM 电子书解析，建议在业务侧转换为 EPUB / PDF。

`.umd` 走独立 UMD 电子书解析器。前端生态里没有可靠维护的 UMD 阅读整库，所以组件按文件结构解析元数据、章节偏移、章节标题和 zlib 正文段，并用 `pako` 解压正文后按 UTF-16LE 展示。

音频文件走浏览器原生 `<audio>`，支持 `mp3`、`mpeg`、`wav`、`ogg`、`oga`、`opus`、`m4a`、`aac`、`flac`、`weba` 等扩展名入口。实际能否播放取决于浏览器对具体编码的支持，跨端最稳妥的是 MP3 或 OGG。

## PPTX 复杂模板能还原到什么程度

PPTX 是浏览器端近似渲染，不依赖 Office 本体。当前已经增强组合图形坐标、旋转/翻转、主题背景、图片裁剪和 EMF 矢量图片转换，适合汇报材料、课件和方案回看。动画、宏、嵌入式对象和极复杂的专有 Office 特效仍建议导出 PDF，或把真实业务样本加入上线前回归。

## 代码文件会执行吗

不会。代码/文本链路由 `@file-viewer/renderer-text` 使用 `highlight.js` 做源码高亮，只展示内容，不执行 `html`、`js` 或模板里的脚本。

## 大小写扩展名会影响识别吗

不会。扩展名匹配时会统一转成小写，所以 `PDF`、`DocX`、`SVG` 这类大小写差异不会影响命中。

## 为什么 `ppt` 不能像 `pptx` 一样直接打开

当前内置的是 `pptx` 渲染链路，老的二进制 `ppt` 并没有注册对应处理器。如果你的业务里大量存在 `ppt`，建议在接入侧先做格式转换，或者统一导出为 `pptx` / `pdf`。

## 大文件会不会慢

会，尤其是复杂的 Office 文档、大体积 PDF 和大型压缩包。因为解析发生在浏览器里，最终体验取决于:

- 文件体积和复杂度
- 当前设备的 CPU 和内存
- 浏览器本身的性能

如果你的业务里经常处理超大文件，建议优先用真实样本做联调测试，并为压缩包配置 `options.archive.maxArchiveSize` 和 `options.archive.maxEntryPreviewSize`。

## 开源总仓库包含哪些源码

GitHub / Gitee 的 `flyfish-dev/file-viewer` 是开源总仓库，包含可直接运行的主 Demo 源码、组件 Demo 源码、`@file-viewer/core`、Vue / React / Pure Web / jQuery / Svelte 标准组件包、历史兼容 alias、文档源码、示例文件和 release tarball。分散的 core 与组件仓库也会同步开源，方便按单个 npm 包查看源码。

私有 Gitea 仓库继续作为完整聚合仓，保留统一发布自动化、内部集成历史和优先支持上下文。官方打赏入口不再是源码付费墙，而是打赏和优先技术支持入口。

## 二开或商用需要注意什么

项目使用 `Apache-2.0` 许可证。二开或商用时，请保留许可证、版权和来源说明，并注明项目来源为 File Viewer by Flyfish / `@flyfish-group/file-viewer3` 或 `@flyfish-group/file-viewer`。如果修复了通用问题或增强了通用能力，建议通过 issue / PR 贡献回来。
