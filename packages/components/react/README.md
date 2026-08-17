# @file-viewer/react

标准 React native 组件包。组件渲染一个 React 容器，并通过本包本地 controller 调用 `@file-viewer/core` 与 core browser engine 挂载完整预览器；同时提供 ref API、受控参数、生命周期事件和完整预览 options。

```bash
npm install @file-viewer/react
```

```tsx
import FileViewer from '@file-viewer/react'

export function Preview() {
  return (
    <div style={{ height: '100vh' }}>
      <FileViewer
        url="/example/demo.docx"
        options={{
          theme: 'light',
          toolbar: { position: 'bottom-right' }
        }}
      />
    </div>
  )
}
```

历史包名 `@flyfish-group/file-viewer-react` 会继续同步维护；新项目建议优先使用自包含的标准包 `@file-viewer/react`。English README: [README.en.md](./README.en.md)。

## 能力范围

`@file-viewer/react` 与其他标准组件包共享同一套 core 接口和 renderer/preset 装配模型；完整能力可通过按需 renderer 或 `@file-viewer/preset-all` 覆盖 PDF、Word、Excel、PPT、OFD、CAD/DWG/DXF/DWF、EPUB/UMD、压缩包、邮件、Markdown、代码高亮、图片、音频、视频、3D 模型、地理数据和结构化数据资产等预览链路。完整格式矩阵和参数说明见官方文档: https://doc.file-viewer.app/guide/formats

<!-- FILE_VIEWER_GENERATED:START -->
## 生态包矩阵

所有标准组件包都只共享 `@file-viewer/core` 这个总底座，不依赖其他框架组件实现。core 负责格式矩阵、资源解析、renderer 协议、事件、操作 API、搜索、缩放、打印和导出；PDF、Word、PPT/PPTX、CAD、Typst 等重型链路通过独立 renderer 或 preset 显式装配；各框架组件包自己维护本地 controller、组件生命周期、类型出口和生态交互。

| 框架 | 标准 npm 包 | 入口格式 | GitHub | Gitee | 兼容历史包 |
| --- | --- | --- | --- | --- | --- |
| Vanilla JS / Pure Web | `@file-viewer/web` | ESM, 类型声明, script 标签 IIFE, Worker/WASM viewer 资源, 复制静态资源 CLI | [file-viewer-web](https://github.com/flyfish-dev/file-viewer-web) | [file-viewer-web](https://gitee.com/flyfish-dev/file-viewer-web) | `@flyfish-group/file-viewer-web` |
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

共享格式目录当前注册 221 个扩展名（221 个稳定、0 个实验），映射到 32 条预览链路。实验格式不计入稳定支持数量；完整能力通过 renderer / preset 按需装配。

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

## 工程级按需 renderer 装配

快速开始的核心是先跑通组件，再明确格式能力边界。推荐先安装当前生态组件包，再按产品形态选择 `@file-viewer/preset-lite`、`@file-viewer/preset-office`、`@file-viewer/preset-engineering` 或 `@file-viewer/preset-all`。Webpack、Rspack、Rollup、Umi、传统多页应用等非 Vite 项目，优先通过 `options.preset` 或 `options.renderers` 显式注入能力；Vite 插件只是进一步省掉手动 import 并复制离线资产。

```bash
npm i @file-viewer/react @file-viewer/preset-office
```

```ts
import officePreset from '@file-viewer/preset-office'

const options = {
  preset: officePreset,
  rendererMode: 'replace'
}
```

需要组合办公文档与工程图纸等能力时，继续使用同一个 `preset` 字段传数组即可：

```ts
import officePreset from '@file-viewer/preset-office'
import engineeringPreset from '@file-viewer/preset-engineering'

const options = {
  preset: [officePreset, engineeringPreset],
  rendererMode: 'replace'
}
```

如果只需要少数格式，也可以安装单 renderer 并传给 `options.renderers`：

```ts
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  renderers: [pdfRenderer],
  rendererMode: 'replace'
}
```

Vite 项目可以再加插件，插件会免配置发现已安装 preset、注入 virtual module，并按命中格式复制 Worker / WASM / 字体 / vendor 资源：

```bash
npm i -D @file-viewer/vite-plugin
```

```ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default {
  plugins: [
    fileViewerRenderers({
      copyAssets: true
      // 无需 preset 配置：插件会自动发现已安装的 @file-viewer/preset-office。
    })
  ]
}
```

重度用户需要一次拥有官方 Demo 的完整能力时，直接把 preset 换成全量包；非 Vite 项目继续传 `options.preset`，Vite 配置也保持不变：

```bash
npm i @file-viewer/react @file-viewer/preset-all
```

需要自定义装配时，再显式配置插件：

```ts
fileViewerRenderers({
  preset: 'auto',        // 同时开启源码扫描时，仍自动发现已安装 preset
  scan: true,            // 识别 fileViewerFormats、data-file-viewer-formats、accept
  formats: ['pdf'],      // 在已安装 preset 之外额外补充精确 renderer
  copyAssets: true,
  chunkStrategy: 'renderer'
})
```

严格裁剪或组件库内部测试时，可以关闭自动注入并显式传入 virtual module：

```ts
// vite.config.ts
fileViewerRenderers({ formats: ['pdf'], inject: false, copyAssets: true })
```

```ts
// 业务组件入口
import { configuredFileViewerRenderers } from 'virtual:file-viewer-renderers'

const options = {
  renderers: configuredFileViewerRenderers,
  rendererMode: 'replace'
}
```

- Vue、React、Svelte、jQuery、Vanilla JS / Pure Web 都传同一份 `options`，只是在各自生态中映射为 props、hook、action、plugin 或 `mountViewer(...)` 参数。
- `preset-lite` 面向文本、Markdown、代码、图片和音视频；`preset-office` 面向 PDF / Word / Excel / PowerPoint / OFD；`preset-engineering` 面向 CAD / 3D / 绘图 / XMind / Geo / Typst / EDA / Data。
- 想要最小包体时，可以不用 preset，直接安装 `@file-viewer/renderer-pdf`、`@file-viewer/renderer-word` 等单个 renderer，并通过 `options.renderers` 手动注入。
- `fileViewerRenderers()` 或 `fileViewerRenderers({ copyAssets:true })` 会免配置自动发现已安装 preset；如果同时开启 `scan:true`，请使用 `preset:'auto'` 或 `autoPresets:true` 保留 preset 自动发现。
- `scan:true` 会识别 `fileViewerFormats`、`data-file-viewer-formats` 和上传控件 `accept`，调试与打包时自动选择 renderer。
- `copyAssets:true` 会复制 PDF/CAD/Typst/Archive/Data 等 worker、WASM 和 vendor 资源，满足离线和企业内网部署；压缩包目录会优先使用 `vendor/libarchive/worker-bundle.js` / `libarchive.wasm`，Worker 不可用时只对 ZIP/TAR/GZIP 进入兼容路径。
- `builtinRenderers` 仍可用于高级基线控制或历史兼容；普通快速接入只需要 `preset` / `renderers` 与 `rendererMode`。
- 如果打开的是支持矩阵内但未装配的格式，预览器会提示应安装的 preset / renderer；只有真正不在矩阵中的扩展名才提示不支持。
- `@file-viewer/preset-all` 提供完整 renderer 矩阵；Worker、WASM、字体和 vendor 资源仍需通过 Vite 插件或 `file-viewer-copy-assets` 发布。`*-full` 包已内置该 preset，不要重复安装。

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
| `iwork` | 配置 Pages / Numbers / Keynote 的模块 Worker、超时、ZIP/Snappy/IWA 安全上限与 Quick Look 降级策略；Apple 三类已通过 iWork ’09、2013+ 与当前版本真实样例的结构、浏览器和视觉 golden 门禁，按静态高保真 stable 提供。 |
| `hangul` | 配置 HWP/HWPX 模块 Worker、超时、ZIP 解压/压缩率/条目数与 HWP 记录数安全上限；稳定能力为经过真实样例验证的静态结构化预览。 |
| `wordPerfect` | 配置 WordPerfect Worker、内置 libwpd/librevenge WASM 地址与超时；WASM 失败时才降级为有界文本预览，正常路径使用真实样例验证的结构化引擎。 |
| `presentation` | 演示文稿 renderer 保持两条隔离引擎：PowerPoint 97–2003 `.ppt` 使用包内 `@file-viewer/ppt@0.3.3` Worker/OffscreenCanvas/WASM，标准资产布局无需配置 URL；`pptModuleUrl` / `pptWorkerUrl` / `pptWasmUrl` / `pptFontUrl` 仅用于自定义路径；`pptWorker` 与 `pptCache` 控制 Worker 和有界帧缓存。PPTX/OpenXML 使用 `@file-viewer/pptx` Worker，并可通过 `workerUrl` / `workerType` 覆盖。 |
| `typst` / `data` / `cad` | 配置 Typst、SQLite、CAD/DWG/DXF/DWF 等 WASM、Worker、编码和渲染策略。 |
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

下面的 `file-viewer-host` 是实际 Shadow host 的 class：Vue 3 通过 `class`，Vue 2 通过 `containerClass`，React / Svelte 通过 `className` 传入，jQuery 则直接加在初始化节点上。

```css
.file-viewer-host {
  --file-viewer-bg: #f7f9fc;
  --file-viewer-text: #172033;
  --file-viewer-toolbar-bg: rgba(255, 255, 255, 0.96);
  --file-viewer-button-color: #154b83;
  --file-viewer-button-radius: 6px;
}

.file-viewer-host::part(toolbar) {
  border: 1px solid rgba(20, 60, 100, 0.14);
}

.file-viewer-host::part(button) {
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
| 通用 viewer assets | 所有 `*-full` 包都提供与自身同版本的 `file-viewer-copy-assets` CLI，用于把 Worker、WASM、字体和 vendor 资源复制到业务静态目录并生成完整性清单；`web-full` 的完整 `dist/` 还会直接携带这些资源。 |
| CAD / DWG / DXF / DWF | 按需配置 `options.cad.wasmPath`、`workerUrl`、`dwfWasmUrl`、`dxfEncoding`，支持自托管和内网部署。 |
| PDF / DOCX / Excel / PPT / PPTX | 按需配置 `options.pdf.workerUrl`、`options.pdf.cMapUrl`、`options.pdf.wasmUrl`、`options.pdf.standardFontDataUrl`、`options.pdf.cjkFontFallbackPath`、`options.pdf.identityFontRepair`、`options.docx.workerUrl`、`options.docx.workerJsZipUrl`、`options.spreadsheet.workerUrl`、`options.presentation.workerUrl` / `workerType`；PDF 默认探测真实静态 Worker，不可用时懒加载包内 handler 兜底，未嵌入的中文字体默认按页加载本地 Noto Sans SC 分片回退，缺失 ToUnicode 的异常 Identity CJK 字体会在检测到乱码后尝试内存修复；DOCX 默认自动选择 Worker 或主线程解析，Electron `file://` 等本地不安全协议会自动回退；Excel 默认 `worker: auto`，大文件达到 `workerAutoThreshold` 自动启用 Worker，CSV / TSV 自动识别 UTF-8、GBK 与 GB18030，也可用 `options.spreadsheet.textEncoding` 显式覆盖，列宽拖拽可通过 `options.spreadsheet.resizableColumns` 显式开启；`.ppt` 从 `vendor/ppt/` 按需加载 `@file-viewer/ppt@0.3.3` Worker/OffscreenCanvas/WASM 和有界帧缓存，标准布局无需配置，`pptModuleUrl` / `pptWorkerUrl` / `pptWasmUrl` / `pptFontUrl` 仅覆盖自定义路径；PPTX 按需创建另一条模块 Worker，两条引擎严格隔离。 |
| Typst / SQLite / Archive | 按需配置 Typst compiler/renderer WASM、`data.sqlWasmUrl`、`archive.workerUrl` / `archive.wasmUrl`；Typst 仅使用本地 WASM 真实渲染，不访问公共 CDN；Archive 兼容 GBK/GB18030 旧 ZIP 中文文件名，RAR、7z 和加密压缩包仍需要 libarchive Worker/WASM。 |
| Drawing | Draw.io 默认使用随 viewer assets 分发的官方 diagrams.net 离线 viewer；路径特殊时可通过 `options.drawing.viewerScriptUrl` 覆盖，`preferOfficial:false` 才切到内置 SVG 兜底。 |
| 离线部署 | 运行时不依赖公共 CDN 或第三方在线资源；所有 `*-full` 包默认使用部署基址下的 `file-viewer/`（根部署即 `/file-viewer/`）。Vite 使用 `copyAssets:true` 自动发布，其他构建工具运行 `npx --no-install file-viewer-copy-assets ./public/file-viewer`；资源放在其它位置时调用 `setDefaultFullAssetBaseUrl()`。 |
| 部署原则 | 默认只在命中特定格式时异步加载对应依赖；没有命中的格式不会拉取重型 Worker、WASM 或解析库。 |


## 质量门禁

- 组件包只依赖 `@file-viewer/core` 和自身生态依赖，不嵌套引用其他框架组件包。
- 格式解析、搜索、缩放、打印、导出、水印、生命周期和 beforeOperation 语义全部来自同一个 core。
- 发布前需通过类型检查、组件 API 校验、README 生成校验、格式矩阵校验、独立仓库导出和浏览器 smoke。

完整参数、生命周期 hooks、beforeOperation、主题、水印、搜索、缩放、打印和导出说明见官方文档: https://doc.file-viewer.app/

在线 Demo: https://demo.file-viewer.app/ 。File Viewer 自身源码与本仓生成的组件包使用 Apache-2.0；发行物若包含 `@file-viewer/ppt` 运行时，该运行时保留其独立 LICENSE 与 NOTICE，不被 Apache-2.0 重新许可。二开或商用请保留 Flyfish Viewer 来源说明；如果修复了通用兼容问题，也欢迎贡献回对应组件仓库。
<!-- FILE_VIEWER_GENERATED:END -->
