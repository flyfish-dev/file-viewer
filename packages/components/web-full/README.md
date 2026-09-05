# @file-viewer/web-full

Vanilla JS / Pure Web Full 一站式集成包，保持 v2.4 已发布 Full 能力矩阵和默认资产复制行为，包括 iWork、CAD、3D、EDA、Geo、Typst、Drawing、Hangul、WordPerfect 与旧版 PPT。DICOM 及以后新增的重型格式不会自动进入历史 Full 闭包，需要通过 `@file-viewer/cli` 显式添加。

```bash
npm install @file-viewer/web-full
```

<!-- FILE_VIEWER_GENERATED:START -->
## 生态包矩阵

所有标准组件包都只共享 `@file-viewer/core` 这个总底座，不依赖其他框架组件实现。core 负责格式矩阵、资源解析、renderer 协议、事件、操作 API、搜索、缩放、打印和导出；PDF、Word、PPT/PPTX、CAD、Typst 等重型链路通过独立 renderer 或 preset 显式装配；各框架组件包自己维护本地 controller、组件生命周期、类型出口和生态交互。

| 框架 | 标准 npm 包 | 入口格式 | GitHub | Gitee | 兼容历史包 |
| --- | --- | --- | --- | --- | --- |
| Vanilla JS / Pure Web | `@file-viewer/web` | ESM, 类型声明, script 标签 IIFE | [file-viewer-web](https://github.com/flyfish-dev/file-viewer-web) | [file-viewer-web](https://gitee.com/flyfish-dev/file-viewer-web) | `@flyfish-group/file-viewer-web` |
| Vanilla JS / Pure Web Full | `@file-viewer/web-full` | ESM, 类型声明, script 标签 IIFE | [file-viewer-web-full](https://github.com/flyfish-dev/file-viewer-web-full) | [file-viewer-web-full](https://gitee.com/flyfish-dev/file-viewer-web-full) | 无 |
| Vue 3 | `@file-viewer/vue3` | ESM, 类型声明 | [file-viewer-vue3](https://github.com/flyfish-dev/file-viewer-vue3) | [file-viewer-vue3](https://gitee.com/flyfish-dev/file-viewer-vue3) | `@flyfish-group/file-viewer3`, `file-viewer3` |
| Vue 3 Full | `@file-viewer/vue3-full` | ESM, 类型声明 | [file-viewer-vue3-full](https://github.com/flyfish-dev/file-viewer-vue3-full) | [file-viewer-vue3-full](https://gitee.com/flyfish-dev/file-viewer-vue3-full) | 无 |
| Vue 2.7 | `@file-viewer/vue2.7` | ESM, 类型声明 | [file-viewer-vue2.7](https://github.com/flyfish-dev/file-viewer-vue2.7) | [file-viewer-vue2.7](https://gitee.com/flyfish-dev/file-viewer-vue2.7) | `@flyfish-group/file-viewer` |
| Vue 2.7 Full | `@file-viewer/vue2.7-full` | ESM, 类型声明 | [file-viewer-vue2.7-full](https://github.com/flyfish-dev/file-viewer-vue2.7-full) | [file-viewer-vue2.7-full](https://gitee.com/flyfish-dev/file-viewer-vue2.7-full) | 无 |
| Vue 2.6 | `@file-viewer/vue2.6` | ESM, 类型声明 | [file-viewer-vue2.6](https://github.com/flyfish-dev/file-viewer-vue2.6) | [file-viewer-vue2.6](https://gitee.com/flyfish-dev/file-viewer-vue2.6) | 无 |
| Vue 2.6 Full | `@file-viewer/vue2.6-full` | ESM, 类型声明 | [file-viewer-vue2.6-full](https://github.com/flyfish-dev/file-viewer-vue2.6-full) | [file-viewer-vue2.6-full](https://gitee.com/flyfish-dev/file-viewer-vue2.6-full) | 无 |
| React 18/19 | `@file-viewer/react` | ESM, 类型声明 | [file-viewer-react](https://github.com/flyfish-dev/file-viewer-react) | [file-viewer-react](https://gitee.com/flyfish-dev/file-viewer-react) | `@flyfish-group/file-viewer-react` |
| React 18/19 Full | `@file-viewer/react-full` | ESM, 类型声明 | [file-viewer-react-full](https://github.com/flyfish-dev/file-viewer-react-full) | [file-viewer-react-full](https://gitee.com/flyfish-dev/file-viewer-react-full) | 无 |
| React 16.8/17 | `@file-viewer/react-legacy` | ESM, 类型声明 | [file-viewer-react-legacy](https://github.com/flyfish-dev/file-viewer-react-legacy) | [file-viewer-react-legacy](https://gitee.com/flyfish-dev/file-viewer-react-legacy) | 无 |
| React 16.8/17 Full | `@file-viewer/react-legacy-full` | ESM, 类型声明 | [file-viewer-react-legacy-full](https://github.com/flyfish-dev/file-viewer-react-legacy-full) | [file-viewer-react-legacy-full](https://gitee.com/flyfish-dev/file-viewer-react-legacy-full) | 无 |
| jQuery | `@file-viewer/jquery` | ESM, 类型声明 | [file-viewer-jquery](https://github.com/flyfish-dev/file-viewer-jquery) | [file-viewer-jquery](https://gitee.com/flyfish-dev/file-viewer-jquery) | 无 |
| jQuery Full | `@file-viewer/jquery-full` | ESM, 类型声明 | [file-viewer-jquery-full](https://github.com/flyfish-dev/file-viewer-jquery-full) | [file-viewer-jquery-full](https://gitee.com/flyfish-dev/file-viewer-jquery-full) | 无 |
| Svelte | `@file-viewer/svelte` | Svelte 组件, ESM, 类型声明 | [file-viewer-svelte](https://github.com/flyfish-dev/file-viewer-svelte) | [file-viewer-svelte](https://gitee.com/flyfish-dev/file-viewer-svelte) | 无 |
| Svelte Full | `@file-viewer/svelte-full` | Svelte 组件, ESM, 类型声明 | [file-viewer-svelte-full](https://github.com/flyfish-dev/file-viewer-svelte-full) | [file-viewer-svelte-full](https://gitee.com/flyfish-dev/file-viewer-svelte-full) | 无 |

## 格式支持矩阵

历史兼容 Full 默认注册 221 个扩展名（221 个稳定、0 个实验），映射到 32 条预览链路，与 v2.4 已发布能力一致。当前总目录为 266 个扩展名、45 条预览链路；DICOM 等新增重型格式必须通过 CLI 显式添加，不会自动扩张旧 Full。

| 预览链路 | 分类 | 扩展名 | 等级 / 状态 | 能力 | 加载 |
| --- | --- | --- | --- | --- | --- |
| Word OpenXML | office | `.docx`, `.docm`, `.dotx`, `.dotm` | high-fidelity / stable | 下载, 打印(适配器), HTML(适配器), 缩放(Provider), 搜索 | 按需异步 |
| Word Binary | office | `.doc`, `.dot` | structured / stable | 下载, 打印(适配器), HTML(适配器), 缩放(Provider), 搜索 | 按需异步 |
| PowerPoint 97–2003 | office | `.ppt`, `.pot` | structured / stable | 下载, 打印(适配器), HTML(适配器), 缩放(Provider) | 按需异步 |
| PowerPoint OpenXML | office | `.pptx`, `.pptm`, `.potx`, `.potm`, `.ppsx`, `.ppsm` | high-fidelity / stable | 下载, 打印, HTML, 缩放(Provider), 搜索 | 按需异步 |
| Open Document | office | `.rtf`, `.odt`, `.odp` | structured / stable | 下载, 打印, HTML, 缩放(Provider), 搜索 | 按需异步 |
| Spreadsheet | office | `.xlsx`, `.xltx`, `.xlsm`, `.xlsb`, `.xls`, `.xlt`, `.xla`, `.xlam`, `.xltm`, `.csv`, `.tsv`, `.ods`, `.fods` | structured / stable | 下载, 缩放(Provider), 搜索 | 按需异步 |
| Apple Pages | office | `.pages` | high-fidelity / stable | 下载, 打印(适配器), HTML(适配器), 缩放(Provider), 搜索 | 按需异步 |
| Apple Numbers | office | `.numbers` | high-fidelity / stable | 下载, 打印(适配器), HTML(适配器), 缩放(Provider), 搜索 | 按需异步 |
| Apple Keynote | office | `.key` | high-fidelity / stable | 下载, 打印(适配器), HTML(适配器), 缩放(Provider), 搜索 | 按需异步 |
| WordPerfect | office | `.wpd`, `.wp`, `.wp5`, `.wp6` | structured / stable | 下载, 打印(适配器), HTML(适配器), 缩放(Provider), 搜索 | 按需异步 |
| dBASE Table | office | `.dbf` | structured / stable | 下载, 缩放(Provider), 搜索 | 按需异步 |
| PDF | document | `.pdf` | high-fidelity / stable | 下载, 打印(适配器), HTML(适配器), 缩放(Provider), 搜索(Provider) | 按需异步 |
| OFD | document | `.ofd` | structured / stable | 下载, 打印, HTML, 缩放(Provider), 搜索 | 按需异步 |
| Hancom Hangul | office | `.hwp`, `.hwpx` | structured / stable | 下载, 打印(适配器), HTML(适配器), 缩放(Provider), 搜索 | 按需异步 |
| Typst | document | `.typ`, `.typst` | high-fidelity / stable | 下载, 打印(适配器), HTML(适配器), 缩放(Provider), 搜索 | 按需异步 |
| Archive | archive | `.zip`, `.zipx`, `.7z`, `.rar`, `.tar`, `.gz`, `.gzip`, `.tgz`, `.bz2`, `.bzip2`, `.tbz`, `.tbz2`, `.xz`, `.txz`, `.lzma`, `.zst`, `.tzst`, `.cab`, `.ar`, `.cpio`, `.iso`, `.xar`, `.lha`, `.lzh`, `.jar`, `.war`, `.ear`, `.apk`, `.cbz`, `.cbr` | structured / stable | 下载, 搜索 | 按需异步 |
| Email | email | `.eml`, `.msg`, `.mbox` | structured / stable | 下载, HTML, 搜索 | 按需异步 |
| EDA | eda | `.olb`, `.dra`, `.gds`, `.oas`, `.oasis` | structured / stable | 下载, 打印, HTML, 搜索 | 按需异步 |
| CAD | cad | `.dxf`, `.dwg`, `.dwf`, `.dwfx`, `.xps` | high-fidelity / stable | 下载, 打印, HTML, 缩放(Provider) | 按需异步 |
| 3D Model | model | `.glb`, `.gltf`, `.obj`, `.stl`, `.ply`, `.fbx`, `.dae`, `.3ds`, `.3mf`, `.amf`, `.usd`, `.usda`, `.usdc`, `.usdz`, `.kmz`, `.step`, `.stp`, `.iges`, `.igs`, `.ifc`, `.3dm`, `.brep`, `.pcd`, `.wrl`, `.vrml`, `.xyz`, `.vtk`, `.vtp` | structured / stable | 下载, 缩放(Provider) | 按需异步 |
| Geospatial | geo | `.geojson`, `.kml`, `.gpx`, `.shp` | structured / stable | 下载, 打印, HTML, 缩放(Provider), 搜索 | 按需异步 |
| Drawing | drawing | `.excalidraw`, `.drawio`, `.dio`, `.mermaid`, `.mmd`, `.plantuml`, `.puml` | structured / stable | 下载, 打印, HTML, 缩放(Provider), 搜索 | 按需异步 |
| Mind Map | mindmap | `.xmind` | structured / stable | 下载, 打印, HTML, 缩放(Provider), 搜索 | 按需异步 |
| EPUB | ebook | `.epub` | high-fidelity / stable | 下载, HTML, 搜索(Provider) | 按需异步 |
| FictionBook | ebook | `.fb2` | structured / stable | 下载, 打印, HTML, 搜索 | 按需异步 |
| UMD | ebook | `.umd` | structured / stable | 下载, 打印, HTML, 缩放(Provider), 搜索 | 按需异步 |
| Image | image | `.gif`, `.jpg`, `.jpeg`, `.bmp`, `.tiff`, `.tif`, `.png`, `.svg`, `.webp`, `.avif`, `.ico`, `.heic`, `.heif`, `.jxl` | high-fidelity / stable | 下载, 打印, HTML, 缩放(Provider) | 按需异步 |
| Markdown | markdown | `.md`, `.markdown` | structured / stable | 下载, 打印, HTML, 搜索 | 按需异步 |
| Code and Text | code | `.txt`, `.json`, `.js`, `.mjs`, `.cjs`, `.css`, `.java`, `.py`, `.html`, `.htm`, `.jsx`, `.ts`, `.tsx`, `.xml`, `.log`, `.vue`, `.yaml`, `.yml`, `.ini`, `.sh`, `.bash`, `.sql`, `.go`, `.rs`, `.php`, `.c`, `.cpp`, `.cc`, `.h`, `.hpp`, `.cs`, `.diff`, `.patch`, `.bundle`, `.bdl`, `.jsonc`, `.json5`, `.ipynb`, `.toml`, `.proto`, `.hcl`, `.tex`, `.gv`, `.http`, `.react`, `.rb`, `.swift`, `.kt` | structured / stable | 下载, 打印, HTML, 搜索 | 按需异步 |
| Video | media | `.mp4`, `.webm`, `.m3u8` | high-fidelity / stable | 下载 | 按需异步 |
| Audio | media | `.mp3`, `.mpeg`, `.wav`, `.ogg`, `.oga`, `.opus`, `.m4a`, `.aac`, `.flac`, `.weba`, `.midi`, `.mid` | high-fidelity / stable | 下载 | 按需异步 |
| Data Asset | asset | `.ttf`, `.otf`, `.woff`, `.woff2`, `.psd`, `.ai`, `.eps`, `.sqlite`, `.wasm`, `.parquet`, `.avro`, `.webarchive` | structured / stable | 下载, HTML, 搜索 | 按需异步 |

## 兼容 Full 包快速开始

`@file-viewer/web-full` 继续内置 `@file-viewer/preset-all`，保持 v2.4 已发布的 221 个扩展名、32 条预览链路及默认资产复制行为。现有 iWork、CAD、3D、EDA、Geo、Typst、Drawing、WordPerfect、Hangul、旧版 PPT、RTF、Mermaid、HLS/MIDI 和高级文本能力不会被移除。DICOM 及以后新增的重型格式不自动进入历史 Full。

保持同一历史 Full 契约的 8 个官方包是：`@file-viewer/web-full`、`@file-viewer/vue3-full`、`@file-viewer/vue2.7-full`、`@file-viewer/vue2.6-full`、`@file-viewer/react-full`、`@file-viewer/react-legacy-full`、`@file-viewer/jquery-full`、`@file-viewer/svelte-full`。新项目如果不需要完整矩阵，应优先通过 `@file-viewer/cli` 选择 standard、lite、office、engineering 或自定义能力；已有 Full 用户无需改变原安装方式。

Full 包继续携带并代理版本对齐的兼容 copy-assets 实现，默认复制历史完整资产集合；`--renderers <csv>` 仍可缩小复制范围。DICOM 等新能力使用独立 renderer/asset owner，所有运行时资源仍可离线、自托管。

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer
npx file-viewer-cli add dcm --write       # 示例：为既有 Full 项目显式添加 DICOM
npx file-viewer-cli install --yes         # 安装新增能力、复制资产并生成注册模块
```

### Vite：发布已安装能力的资源

```bash
npm i -D @file-viewer/vite-plugin
```

```ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default {
  plugins: [fileViewerRenderers({ copyAssets: true })]
}
```

插件会识别历史 Full 与另外安装的 capability asset owner，在开发与生产构建中发布对应资源到部署基址下的 `file-viewer/`（根部署即 `/file-viewer/`）。

### Webpack / Rspack / Rollup / Vue CLI / Umi

运行随 Full 包安装的同版本兼容 CLI，默认复制历史完整资产集合，并把输出目录作为部署基址下的 `file-viewer/` 静态发布：

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer
```

默认资源目录是 `<部署基址>/file-viewer/`，根部署时 URL 为 `/file-viewer/`。只有资源不在这个约定目录时，才需要调用 `setDefaultFullAssetBaseUrl()`；显式 `options.*Url` 仍保持最高优先级。

`@file-viewer/web-full` 的 CDN/IIFE 发行物只包含入口和按格式加载的 renderer chunks，不重复内嵌 Worker/WASM 资产。部署时使用包内置的兼容复制命令发布历史 Full 资产；DICOM 等新增能力仍需独立安装。

## 统一参数与事件

所有生态组件都围绕同一套 `ViewerMountOptions` 与 `FileViewerOptions` 工作，只是映射到各自框架的 props、事件、ref、action 或插件 API。

| 参数 | 说明 |
| --- | --- |
| `url` | 远程文件地址，适合对象存储、业务接口或内网文件服务返回的文件链接。 |
| `file` | `File`、`Blob` 或 `ArrayBuffer`，适合上传、本地选择和业务接口已取回的二进制。 |
| `buffer` | 直接传入 `ArrayBuffer`，适合解密、鉴权或自定义下载后再预览。 |
| `name` / `filename` | 显示文件名并辅助推断扩展名；当 URL 不含扩展名时建议显式传入。 |
| `type` | 显式指定扩展名或 MIME 线索，覆盖自动识别结果。 |
| `size` | 文件大小提示，用于生命周期上下文、加载状态和安全限制展示。 |
| `options` | 完整 `FileViewerOptions`，所有框架包保持同一套参数语义。 |
| `options.styleIsolation` | `auto`、`shadow`、`scoped` 或 `none`。所有标准组件的 `auto` 默认使用 Shadow DOM，阻止宿主全局样式破坏工具栏和正文；旧项目可显式使用 `none`。 |
| `onEvent` / `onStateChange` | Vanilla JS / Pure Web、React、Svelte 等命令式包装层的统一事件和状态订阅；Vue 组件会映射为原生 emit。 |

## 实际组件属性

下面列的是每个标准组件包当前真实暴露的属性、事件和控制入口。需要 `buffer`、`name`、`type`、`size` 这类命令式挂载参数时，优先选择 Vanilla JS / Pure Web、React、Svelte、jQuery 或 Vue2 组件；Vue3 声明式组件保持 `url` / `file` / `options` 的简洁入口，复杂二进制来源请包装成带文件名的 `File`。

| 组件 | 实际属性 / 入口 | 事件入口 | 定制入口 |
| --- | --- | --- | --- |
| Vanilla JS / Pure Web `@file-viewer/web` | `<flyfish-file-viewer>` 属性 `src/url`、`filename/name`、`type`、`size`、`theme`、`toolbar`、`toolbar-position`、`watermark`、`search`、`options`；也支持 `mountViewer(...)` | `viewer-ready`、`viewer-event`、`viewer-state-change`、`viewer-error`、`onEvent`、`onStateChange`、`controller.subscribe()` | Custom Element 实例暴露完整 controller handle；IIFE script 标签会自动注册元素，同时保留 `mountViewer` 命令式挂载和资源复制 CLI。 |
| Vue 3 `@file-viewer/vue3` | `url`、`file`、`options` | `load-start`、`load-complete`、`unload-start`、`unload-complete`、`operation-before`、`operation-cancel`、`operation-availability-change`、`search-change`、`location-change`、`zoom-change`、`view-state-change`、`theme-change` | 模板 `ref` 暴露 `FileViewerExpose`；适合声明式接入。`Blob` / `ArrayBuffer` 建议包装成带扩展名的 `File` 后传给 `file`。 |
| Vue 2.7 `@file-viewer/vue2.7` | `url`、`file`、`buffer`、`name`、`filename`、`type`、`size`、`options`、`containerClass`、`containerStyle` | `viewer-event` / `viewerEvent` | 组件实例暴露 controller handle 全量方法；适合 Vue 2.7 项目和历史 `@flyfish-group/file-viewer` 平滑升级。 |
| Vue 2.6 `@file-viewer/vue2.6` | 同 Vue 2.7 | `viewer-event` / `viewerEvent` | 独立 Vue 2.6 构建，不要求业务升级到 Vue 2.7。 |
| React `@file-viewer/react` | `ViewerMountOptions` + `div` 原生属性，如 `className`、`style`、`data-*`、`aria-*` | `onEvent`、`onStateChange` | `ref` 暴露 `FileViewerHandle`；`useFileViewer()` 会返回 `ref`、`props`、`state`、`handle`，便于自定义工具栏。 |
| React Legacy `@file-viewer/react-legacy` | 同 React 标准包 | `onEvent`、`onStateChange` | 面向 React 16.8 / 17；组件名和默认导出保持 legacy 生态友好。 |
| jQuery `@file-viewer/jquery` | `$(el).fileViewer(ViewerMountOptions & { replace?: boolean })` | `onEvent`、`onStateChange` 或 `getFileViewerController(el).subscribe()` | 插件方法支持 `zoomIn`、`printRenderedHtml`、`searchDocument` 等；`replace:false` 可在同一节点上原地更新。 |
| Svelte `@file-viewer/svelte` | `ViewerMountOptions` + `className`、`containerStyle` | `on:viewerEvent`、`onEvent`、`onStateChange` | `bind:this` 暴露 controller handle；也提供 `use:fileViewer` action，action 额外支持 `replace`。 |

| Options 字段 | 说明 |
| --- | --- |
| `theme` | `light`、`dark` 或 `system`，优先级高于浏览器 `prefers-color-scheme`。 |
| `styleIsolation` | `auto`、`shadow`、`scoped` 或 `none`。`auto` 下 Web Component、IIFE、Vue、React、Svelte、jQuery 和 full 包均默认使用 Shadow DOM；依赖深层 class 覆盖的旧项目可显式使用 `none`。 |
| `watermark` | 开启文字或图片水印，可设置透明度、旋转、间距、尺寸、字体和颜色。 |
| `toolbar` | 控制主题切换、下载、打印、HTML 导出、缩放、按钮顺序和工具栏位置，并支持操作级前置校验。 |
| `search` | 配置文档搜索、高亮 class、大小写、整词匹配、最大命中数和 debounce。 |
| `ai` | 控制文本结构采集、分块大小和最大文本长度，为溯源、定位、向量化和外部 AI 流程提供基础。 |
| `archive` | 配置压缩包 Worker/WASM、超时、缓存、包体限制和压缩包内单文件预览大小；旧 ZIP 中文文件名会自动按 GBK/GB18030 兼容解码。 |
| `pdf` | 配置 PDF.js Worker、导航栏、目录、缩略图、旋转、流式读取、Range chunk 和凭据。 |
| `docx` / `spreadsheet` | DOCX 由 @file-viewer/renderer-word 承接并使用自研 @file-viewer/docx，默认自动选择 Worker 或主线程解析，连续流式阅读和异步分批渲染，可按需显式开启视觉分页；表格由 @file-viewer/renderer-spreadsheet 承接，默认保真解析，大文件自动启用 Worker，表头拖拽调列宽可按需显式开启。 |
| `iwork` | 显式安装 iWork capability 后，配置 Pages / Numbers / Keynote 的模块 Worker、超时、ZIP/Snappy/IWA 安全上限与 Quick Look 降级策略；它不属于 standard/full 默认闭包。 |
| `hangul` | 显式安装 Hangul capability 后，配置 HWP/HWPX 模块 Worker、超时、ZIP 解压/压缩率/条目数与 HWP 记录数安全上限；它不属于 standard/full 默认闭包。 |
| `wordPerfect` | 显式安装 WordPerfect capability 后，配置 Worker、libwpd/librevenge WASM 地址与超时；它不属于 standard/full 默认闭包。 |
| `presentation` | standard/full 默认只装配 PPTX/OpenXML 的 `@file-viewer/pptx` Worker，可通过 `workerUrl` / `workerType` 覆盖。PowerPoint 97–2003 `.ppt` 是独立重型 capability，需用 `file-viewer add ppt --write` 显式安装其 Worker/WASM 和资产。 |
| `typst` / `data` / `cad` | 显式安装相应 capability 后，配置 Typst、SQLite、CAD/DWG/DXF/DWF 等 WASM、Worker、编码和渲染策略；这些能力不属于 standard/full 默认闭包。 |
| `hooks` / `beforeOperation` | 统一生命周期 hooks 和操作前置校验，可用于审计、权限、埋点和安全控制。 |

## 样式隔离与主题定制

所有标准组件默认使用 Shadow DOM 强隔离。宿主页面里的 `*`、`button`、`table`、`img`、`svg`、`canvas` 等全局样式不会直接侵入预览器工具栏和正文；预览器也不会把局部 reset 粗暴写到业务页面。

| 模式 | 说明 |
| --- | --- |
| `auto` | 默认值。Web Component、IIFE、Vue、React、Svelte、jQuery 和 full 包均走 Shadow DOM，保护工具栏与 renderer 内容不受宿主全局 CSS 影响。 |
| `shadow` | 显式创建 ShadowRoot 作为渲染面，适合宿主 CSS 不可控、微前端混挂、低代码平台和设计系统全局 reset 很强的页面。 |
| `scoped` | 不创建 ShadowRoot，使用稳定根选择器和局部 reset 约束影响范围，适合需要被外层 CSS 轻度继承的场景。 |
| `none` | 历史 light DOM 行为，保留给依赖深度 class 覆盖、旧主题 CSS 或自动化测试快照的项目。 |

`styleIsolation` 是挂载边界配置；运行时切换模式时请重新挂载组件。`scoped` 与 `none` 都属于 Light DOM，仍可能被宿主的高权重或 `!important` 全局规则覆盖。

定制优先级建议是：先使用 `--file-viewer-*` CSS 变量覆盖颜色、字体、间距、圆角、工具栏和按钮；需要命中内部结构时再使用稳定 Shadow Parts。当前 Web shell 暴露 `host`、`shell`、`toolbar`、`toolbar-group`、`toolbar-status`、`button`、`input` 和 `content`，后续 renderer 扩展应继续使用 `state-panel`、`watermark` 这类稳定命名。不要依赖内部 class 名，它们只服务实现细节。

```css
flyfish-file-viewer {
  --file-viewer-bg: #f7f9fc;
  --file-viewer-text: #172033;
  --file-viewer-toolbar-bg: rgba(255, 255, 255, 0.96);
  --file-viewer-button-color: #154b83;
  --file-viewer-button-radius: 6px;
}

flyfish-file-viewer::part(toolbar) {
  border: 1px solid rgba(20, 60, 100, 0.14);
}

flyfish-file-viewer::part(button) {
  font-weight: 600;
}
```

框架组件无需额外配置即可使用 Shadow DOM；也可以在 `options` 中显式声明以固定策略：

```ts
const options = {
  styleIsolation: 'shadow',
  theme: 'light',
  toolbar: { position: 'bottom-right' }
}
```

## 工具栏定制

| 配置 | 说明 |
| --- | --- |
| `toolbar: false` | 隐藏内置工具栏，但不关闭下载、打印、导出、缩放等 controller API，适合完全自定义业务工具栏。 |
| `toolbar: true` | 使用默认内置工具栏；主题切换默认显示，下载、打印、HTML 导出和缩放按钮按能力动态显隐。 |
| `download` / `print` / `exportHtml` / `zoom` | 表达业务是否允许展示对应按钮；最终仍会结合文件类型、渲染完成状态、导出适配器和缩放 provider 计算真实可用性。 |
| `theme` | 控制浅色/深色切换按钮，默认 `true`；切换后触发 `theme-change`，传 `false` 可隐藏。 |
| `order` | 设置内置分组顺序，可使用 `search`、`zoom`、`download`、`print`、`exportHtml`、`theme`；遗漏项保持默认相对顺序。 |
| `position` | `auto`、`top`、`top-center`、`bottom-right`。默认 `auto`，PDF 自动悬浮右下角，其他格式保持顶部靠右；需要顶部水平居中时传 `top-center`。 |
| `beforeOperation` | 工具栏层统一前置校验，会在 `options.beforeOperation` 后执行。返回 `false` 或抛错都会取消本次操作。 |
| `beforeDownload` / `beforePrint` / `beforeExportHtml` | 单按钮前置校验；适合下载权限、打印审计、导出水印确认等细粒度业务规则。 |

完全自定义工具栏时，推荐关闭内置工具栏并使用组件 ref / controller 暴露的标准 API。不要在预览器外层用 CSS `transform: scale()` 做缩放；PDF、Excel、CAD、canvas 和文本层格式都应通过内部缩放 provider 保持坐标正确。

缩放状态由各格式 renderer 的内部 provider 上报。首屏自适应、容器尺寸变化或 PDF / Word / 图片等异步布局完成后，内置工具栏会显示真实缩放比例，而不是固定显示 `100%`；自定义工具栏也应监听 `zoom-change` / `operation-availability-change`，或读取 `getZoomState()` / `getOperationAvailability()`。

视图状态同步用于投屏、双端协同和恢复阅读进度。所有标准 renderer loader 都会获得通用 view-state provider，至少记录 `renderer`、缩放和滚动位置；PDF、XMind、Geo、3D、CAD 等高交互路径会补充页码、导航、画布 pan、地图中心、相机视角或底层视图快照。初始化可传 `options.initialViewState`，运行中监听 `view-state-change`；Pure Web / Vue3 controller 还可直接调用 `getViewState()` 与 `applyViewState(state, { source: "api", action: "restore" })`。

| 生态 | 推荐方式 |
| --- | --- |
| Vanilla JS / Pure Web | `<flyfish-file-viewer toolbar="false">` 或 `mountViewer(container, { options:{ toolbar:false }, onStateChange })`；外部 DOM 按钮可直接调用元素实例 / controller 的 `zoomIn()`、`printRenderedHtml()`、`searchDocument()` 等方法，复杂场景用 `viewer-state-change` 或 `controller.subscribe()` 同步状态。 |
| Vue 3 | 传 `:options="{ toolbar: false }"` 隐藏内置工具栏，通过模板 `ref` 调用 `downloadOriginalFile()`、`printRenderedHtml()`、`exportRenderedHtml()`、`zoomIn()`、`zoomOut()`、`resetZoom()`；用 `@operation-availability-change` 和 `@zoom-change` 同步按钮显隐与比例。 |
| Vue 2.7 / 2.6 | 同样设置 `toolbar:false`，通过 `$refs.viewer` 调用实例方法；监听 `@viewer-event`，在 `event.type === "operation-availability-change"` 或 `event.type === "zoom-change"` 时更新外部工具栏。 |
| React / React Legacy | 推荐 `useFileViewer({ options:{ toolbar:false } })`，把 `viewer.props` 传给组件，把按钮绑定到 `viewer.handle`，并读取 `viewer.state.availability` / `viewer.state.zoom` 控制禁用状态。 |
| jQuery | `$("#viewer").fileViewer({ options:{ toolbar:false } })`；按钮调用 `$("#viewer").fileViewer("zoomIn")` 或通过 `getFileViewerController($("#viewer")).subscribe()` 获取能力状态。 |
| Svelte | `<FileViewer bind:this={viewer} options={{ toolbar:false }} />`；按钮直接调用 `viewer.zoomIn()`、`viewer.printRenderedHtml()`，并用 `on:viewerEvent` / `onStateChange` 同步状态。 |

## 生命周期与操作事件

| 事件 / hook | 说明 |
| --- | --- |
| `load-start` / `hooks.onLoadStart` | 开始解析或下载文档时触发，包含文件名、类型、来源、版本、URL、File 和 size。 |
| `load-complete` / `hooks.onLoadComplete` | 当前文档完成渲染时触发，包含耗时、来源上下文和版本号。 |
| `unload-start` / `hooks.onUnloadStart` | 替换、重置或组件卸载前触发，可用于保存状态或释放外部资源。 |
| `unload-complete` / `hooks.onUnloadComplete` | 旧文档释放完成后触发，reason 会标识 `replace`、`reset` 或 `component-unmount`。 |
| `operation-before` / `operation-cancel` | 下载、打印、HTML 导出和缩放前后触发；`beforeOperation` 返回 `false` 可取消操作。 |
| `operation-availability-change` | 当前格式是否可下载、可打印、可导出 HTML、可缩放发生变化时触发。 |
| `theme-change` | 用户通过内置按钮切换浅色或深色模式时触发，payload 为 `light` 或 `dark`。 |
| `search-change` / `location-change` / `zoom-change` / `view-state-change` | 搜索命中、定位锚点、缩放状态和完整视图快照变化时触发，用于外层同步 UI、投屏或恢复阅读进度。 |

## 公共操作 API

| API | 说明 |
| --- | --- |
| `load` / `update` / `reload` / `destroy` | 命令式控制文档加载、参数更新、重新加载和销毁。 |
| `downloadOriginalFile()` | 下载原始文件，遵循 toolbar 与 `beforeOperation` 权限校验。 |
| `printRenderedHtml(options?)` | 打印当前完整渲染内容，优先使用各格式的高保真打印适配器；开启水印时会一并输出，也可传入 `mask` 遮盖区域。 |
| `printWithMask(options?)` | 打开掩膜设计器拖拽黑色遮盖块，确认后打印；设计器由 core 异步加载，组件开箱即用。 |
| `exportRenderedHtml()` | 导出当前渲染后的 HTML，用于归档、审计和离线查看。 |
| `zoomIn()` / `zoomOut()` / `resetZoom()` | 调用当前格式自己的缩放 provider，避免外层 CSS 缩放导致坐标偏移。 |
| `searchDocument()` / `nextSearchResult()` / `previousSearchResult()` | 打开文档级搜索并在命中之间导航，保持高亮状态。 |
| `collectDocumentAnchors()` / `scrollToAnchor()` / `scrollToLine()` | 采集页面、目录、标题或代码行锚点，并执行定位跳转。 |
| `getDocumentTextChunks()` | 获取结构化文本块，便于搜索、AI 溯源、向量化和外部索引。 |
| `getOperationAvailability()` / `getZoomState()` / `getSearchState()` | 读取当前能力、缩放和搜索状态，便于自定义工具栏。 |

## Worker、WASM 与私有化部署

| 资源 | 说明 |
| --- | --- |
| Full 兼容资产 | 历史 `*-full` 包默认通过兼容 copy-assets 实现复制 v2.4 已发布的完整资源集合；DICOM 与以后新增的重型格式使用独立 owner。事务收据继续记录包版本、逐文件 SHA-256 和 owner。 |
| 专用资产 owner | CAD、Typst、iWork、3D、Data、Drawing、Hangul、WordPerfect 和旧版 PPT 各自使用独立 `@file-viewer/assets-*` 包。`@file-viewer/cli add <format> --write` 只选择该能力及其资产，不下载旁系格式。历史 `*-full` 包继续通过兼容 copy-assets 命令默认复制原有完整资产集合。 |
| PDF / DOCX / Excel / PPTX | standard 支持自托管 PDF.js Worker/字体、DOCX Worker、Spreadsheet Worker 与 PPTX Worker。PPTX 图表和 PDF Identity-font repair 属于正确性能力，已明确纳入 standard；不会静默省略图表或字体修复。 |
| Archive / Email / 原生媒体 | Archive 的 libarchive Worker/WASM 属于 standard 资产；Email、常见图片和浏览器原生音视频按需加载代码。HLS、MIDI、RTF、Mermaid、patch/git bundle 是显式 capability，不会因 npm peer 自动安装。 |
| Draw.io | 安全自研 Drawing fallback 随 renderer 提供；diagrams.net official viewer 是独立 `drawio-official` 重型 capability，不进入新项目的 standard 默认闭包。历史 `*-full` 包的已发布能力边界保持兼容。 |
| 离线部署 | 运行时不依赖公共 CDN。Vite `copyAssets:true` 按已安装 asset owner 发布；其它构建工具运行 `file-viewer install --yes` 或 `file-viewer assets --write`。所有 owner 事务性合并为稳定运行时 manifest，安装顺序不影响结果。 |
| 部署原则 | 新格式默认 opt-in，不会自动扩张已发布的 `*-full` 包。只有命中特定格式时才加载对应 Worker、WASM 或解析库；新项目优先使用 standard 或按需 capability，历史 full 集成继续保留原能力矩阵。 |

### Full 包默认资产根

`@file-viewer/web-full` 保持 v2.4 已发布 Full 能力兼容，默认把历史完整资产集合指向部署基址下的 `file-viewer/`（根部署即 `/file-viewer/`），包括旧版 PPT、CAD、Typst、Drawing、SQLite/iWork 等既有能力。本包内置同版本兼容复制实现；运行 `file-viewer-copy-assets` 并发布产物后，不需要逐项手写资源 URL。 DICOM 与以后新增的重型格式不会自动进入该闭包，需通过新 CLI 显式选择。

```ts
import { setDefaultFullAssetBaseUrl } from '@file-viewer/web-full'

setDefaultFullAssetBaseUrl('/static/file-viewer/')
```

显式传入的 `options.archive.*`、`options.pdf.*` 等仍然会覆盖默认值；`file-viewer-copy-assets --renderers <csv>` 可缩小旧 Full 的复制范围，运行 `file-viewer list` 可查看新增的 opt-in capability、许可证和资产包。

## 质量门禁

- 组件包只依赖 `@file-viewer/core` 和自身生态依赖，不嵌套引用其他框架组件包。
- 格式解析、搜索、缩放、打印、导出、水印、生命周期和 beforeOperation 语义全部来自同一个 core。
- 发布前需通过类型检查、组件 API 校验、README 生成校验、格式矩阵校验、独立仓库导出和浏览器 smoke。

完整参数、生命周期 hooks、beforeOperation、主题、水印、搜索、缩放、打印和导出说明见官方文档: https://doc.file-viewer.app/

在线 Demo: https://demo.file-viewer.app/ 。File Viewer 自身源码与本仓生成的组件包使用 Apache-2.0；发行物若包含 `@file-viewer/ppt` 运行时，该运行时保留其独立 LICENSE 与 NOTICE，不被 Apache-2.0 重新许可。二开或商用请保留 Flyfish Viewer 来源说明；如果修复了通用兼容问题，也欢迎贡献回对应组件仓库。
<!-- FILE_VIEWER_GENERATED:END -->
