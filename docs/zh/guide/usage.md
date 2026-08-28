# 组件用法

<div class="doc-kicker">API At A Glance</div>

<p class="doc-lead">
  `file-viewer` 的 API 非常克制，目前真正需要记住的是两条输入路径：`url` 和 `file`，以及一个可选的 `options`。
  但要把它接进真实业务里，光知道“有这两个参数”还不够，你还得知道渲染器是怎么识别文件类型的、什么时候该传 URL、什么时候应该先把结果包装成带扩展名的 `File`。
</p>

这套 API 在多个 npm 包中保持一致: Vanilla JS / Pure Web 使用 `@file-viewer/web`，Vue3 使用 `@file-viewer/vue3`，Vue2.7 使用 `@file-viewer/vue2.7`，Vue2.6 使用 `@file-viewer/vue2.6`，React 18/19 使用 `@file-viewer/react`，React 16.8/17 使用 `@file-viewer/react-legacy`，jQuery 使用 `@file-viewer/jquery`，Svelte 使用 `@file-viewer/svelte`。历史 `@flyfish-group/*` 包名继续同步维护。各标准组件包都使用原生挂载方式，保持一致的 options、事件和类型语义，完整选型见 [生态组件总览](/zh/guide/ecosystem)。

Vue3 和 Vue2 的安装器都会自动带上组件样式，不需要额外引入 CSS。

## 先记住这 4 条规则

- 渲染器靠文件扩展名选择处理链路，所以文件名本身非常重要。
- 当 `file` 和 `url` 同时存在时，组件会优先渲染 `file`。
- 如果你拿到的是 `Blob` 或 `ArrayBuffer`，推荐先包装成带扩展名的 `File` 再传入。
- 组件会默认撑满父容器，所以父容器必须有明确高度。
- 同源 PDF URL 默认交给 PDF.js 渐进读取，首屏不再等待外层预览器整包 Blob 下载；文件服务支持 Range 时会自动分片加载，跨域 URL 默认仍走兼容下载链路。
- Vanilla JS / Pure Web、React、jQuery 和 Svelte 标准组件包也使用同一套 `url` / `file` / `name` 输入语义。

## 输入方式怎么选

| 输入方式 | 推荐程度 | 适合场景 | 说明 |
| --- | --- | --- | --- |
| `url` | 推荐 | 文件地址可直接访问、链路简单 | 同源 PDF 会直接交给 PDF.js 渐进读取；其他格式会在浏览器内下载文件，再按扩展名选择渲染器 |
| `file: File` | 强烈推荐 | 本地上传、鉴权下载后预览、宿主系统已拿到文件对象 | 最稳妥的二进制接入方式 |
| `Blob` / `ArrayBuffer` | 先包装再用 | SDK 返回二进制、接口已返回文件流 | 建议先包装成 `new File([...], 'demo.pdf')`，把文件名和扩展名补全 |

Vanilla JS / Pure Web、React、jQuery 和 Svelte 标准组件包允许直接传 `Blob` 或 `ArrayBuffer`，但仍然需要同时提供 `name`，例如 `contract.pdf`。共享 core 会按文件名扩展名选择渲染链路。

## 渲染前预检

上传完成后若要先判断文件能否进入预览流程，可以直接调用 core 的 `precheckFileViewerSource()`，不需要创建或隐藏一个 viewer。它会核对扩展名能力，并对 PDF、DOCX/XLSX/PPTX、OpenDocument、旧版 OLE Office 和 RTF 做轻量签名/包结构检查。

```ts
import { precheckFileViewerSource } from '@file-viewer/core/headless'

const result = await precheckFileViewerSource(file, {
  // 推荐传当前业务实际装配的格式，避免把未安装 preset 的格式报成可用
  supportedExtensions: ['pdf', 'docx', 'xlsx', 'pptx']
})

if (!result.previewable) {
  console.warn(result.status, result.reason, result.missingParts)
}
```

`supported` 表示当前能力列表是否包含该扩展名，`valid` 表示内容结构检查结论。`valid: null` 不是验证通过，而是该格式没有轻量结构校验或当前只有 URL、尚未读取内容；真正的 renderer 仍负责最终解析。对 Blob 形式的 ZIP/Office 文件，预检只读取 ZIP 尾部和 central directory 元数据，不会为了找包内文件名复制整份大文件。

## 行为规则

- 预览器会根据文件名扩展名自动选择渲染器
- 当 `file` 和 `url` 同时存在时，优先渲染 `file`
- 当 `file` 被清空后，如果 `url` 仍然存在，会自动回退到 `url`
- 组件默认撑满父容器，因此父容器必须有稳定高度
- 扩展名匹配会自动转成小写，所以 `PDF`、`DocX` 这类大小写差异不会影响命中
- OFD、Typst、XMind、压缩包、邮件、OLB/DRA/GDS/OASIS、CAD、地理数据、3D 模型、绘图、EPUB、UMD、PDF、Office、Markdown、音视频、HLS、HEIC、字体/数据资产和代码高亮等渲染器均按需异步加载，只有命中文件类型时才拉取对应代码块
- PPTX 属于浏览器端近似渲染链路，当前由独立开源的 `@file-viewer/pptx` 原生引擎承接，已增强组合图形、主题背景、图片裁剪和 EMF 矢量图片；如果业务材料大量使用复杂动画或专有 Office 特效，建议把真实样本加入上线前回归。
- `options` 可以配置内置操作栏、水印、压缩包 Worker、缓存和体积上限。

## URL 预览

```vue
<script setup lang="ts">
import { ref } from 'vue'

const url = ref('https://example.com/demo.pdf')
</script>

<template>
  <div style="height: 100vh">
    <file-viewer :url="url" />
  </div>
</template>
```

适合场景:

- 文件地址可直接访问
- 文件服务已正确配置 CORS
- 业务无需先进行额外下载或鉴权处理

<div class="doc-note">
  如果你的 URL 形如 <code>/download?id=123</code>，路径里没有明确扩展名，预览器就很难准确判断该走哪条渲染链路。遇到这种带签名、带鉴权或通过接口中转的地址，建议直接先把结果取回来，再包装成 <code>File</code> 传入。
</div>

## 文件对象预览

```vue
<script setup lang="ts">
import { ref } from 'vue'

const file = ref<File | undefined>()

function onChange(event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.files?.item(0)
  if (value) file.value = value
}
</script>

<template>
  <div style="height: 100vh">
    <input type="file" @change="onChange" />
    <div style="height: calc(100vh - 40px)">
      <file-viewer :file="file" />
    </div>
  </div>
</template>
```

适合场景:

- 用户本地上传后立即预览
- 宿主系统已经拿到了最终文件对象
- 文件访问链路涉及鉴权，不方便直接暴露 URL

## 鉴权接口返回 Blob 时怎么接

很多业务系统真正拿到的不是公开 URL，而是一个需要携带登录态的下载接口。这种情况下，推荐你先把 `Blob` 包成 `File`:

```ts
const response = await fetch('/api/preview/contract/123', {
  credentials: 'include'
})

const blob = await response.blob()

file.value = new File([blob], 'contract.pdf', {
  type: blob.type
})
```

这样做的好处是:

- 文件内容已经在宿主系统的权限链路里拿到了
- 预览器可以通过 `contract.pdf` 正确识别扩展名
- 业务侧可以自己决定缓存、重试和错误提示策略

## SDK 返回 ArrayBuffer 时怎么接

如果你的下载 SDK 返回的是 `ArrayBuffer`，思路也一样，先补一个正确的文件名:

```ts
const buffer = await sdk.downloadAttachment(id)

file.value = new File([buffer], 'report.xlsx')
```

这里最重要的不是 `ArrayBuffer` 本身，而是你给它补上的 `report.xlsx` 这个文件名。没有扩展名，渲染器就不知道该走哪条链路。

## 预览器 options

`options` 用于配置通用交互、搜索定位和重型格式的运行参数。Vanilla JS / Pure Web helper、Vue2 / Vue3 组件、React 组件、jQuery 和 Svelte 标准组件包都使用同一套语义。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import officePreset from '@file-viewer/preset-office'

const url = ref('/example/archive.zip')
const options = {
  theme: 'light',
  styleIsolation: 'shadow',
  ui: {
    density: 'compact'
  },
  preset: officePreset,
  rendererMode: 'replace',
  toolbar: {
    position: 'bottom-right',
    download: true,
    print: true,
    exportHtml: true
  },
  watermark: {
    text: '内部资料',
    opacity: 0.16,
    rotate: -24,
    color: '#1f7a58'
  },
  archive: {
    cache: true,
    workerTimeoutMs: 30000,
    maxArchiveSize: 320 * 1024 * 1024,
    maxEntryPreviewSize: 64 * 1024 * 1024,
    entryActions: {
      download(entry) {
        return entry.path.startsWith('public/')
      }
    }
  },
  search: {
    maxMatches: 1000,
    caseSensitive: false
  },
  fit: {
    mode: 'width',
    resize: 'until-interaction',
    padding: 16
  },
  ai: {
    collectText: true,
    chunkSize: 1200,
    chunkOverlap: 160
  },
  pdf: {
    toolbar: true,
    streaming: 'same-origin',
    rangeChunkSize: 64 * 1024
  }
}
</script>

<template>
  <div style="height: 100vh">
    <file-viewer :url="url" :options="options" />
  </div>
</template>
```

标准组件包默认保持轻量。PDF、Word、Excel、PPTX、OFD、CAD、Typst、压缩包、EDA、3D 等具体能力需要通过 `preset` 或 `renderers` 装配；`builtinRenderers` 只保留给历史兼容和极细 registry 控制，不再作为快速开始示例。

| 选项 | 说明 |
| --- | --- |
| `theme` | 预览器主题，支持 `light`、`dark`、`system`。默认 `system`，继续跟随浏览器 `prefers-color-scheme`；浅色业务系统建议显式传 `light`，避免操作系统深色模式把预览区、工具栏或支持主题切换的渲染器自动切成深色 |
| `styleIsolation` | 样式隔离策略，支持 `auto`、`shadow`、`scoped`、`none`。`auto` 下所有标准组件都使用 Shadow DOM，避免宿主 CSS 破坏预览器。主题定制使用 `--file-viewer-*` tokens 和 `::part()`，仅旧版深层覆盖场景使用 `none`。完整说明见 [样式隔离与主题定制](/zh/guide/style-isolation) |
| `ui.density` | 操作界面密度，支持 `comfortable` 和 `compact`。默认 `comfortable` 保持历史间距；`compact` 会收紧工具栏、压缩包目录、嵌套预览头部、徽标、小按钮和搜索输入等操作 chrome，不压缩文档正文渲染 |
| `preset` | 通用 preset 装配入口，支持传入 `@file-viewer/preset-lite`、`@file-viewer/preset-office`、`@file-viewer/preset-engineering`、`@file-viewer/preset-all` 的默认导出，也支持 `preset: [officePreset, engineeringPreset]` 数组组合。这个方式不依赖 Vite，适合 Webpack、Rspack、Rollup、Umi、传统多页应用、微前端和内部组件库；`presets` 仅作为早期 2.x 草案的兼容 alias 保留 |
| `renderers` / `rendererMode` | 按需单 renderer package 或自定义 renderer 装配入口。`rendererMode: 'replace'` 从空 registry 开始，适合与 `preset` / `renderers` 组成清晰的显式能力集；`extend` 会在当前内置集合上追加 |
| `builtinRenderers` | 高级内置基线开关，支持 `all`、`lite`、`none`。普通快速接入无需设置；只有需要保留历史全量基线、只启用 core 原生低成本链路，或做极细 registry 控制时再使用 |
| `toolbar` | `true`、`false` 或对象；声明是否显示下载原文件、打印完整渲染结果、导出渲染后 HTML 和统一缩放按钮。传 `false` 会隐藏内置工具栏，但 ref / controller 上的下载、打印、导出、缩放 API 仍可用于自定义业务工具栏。`toolbar.order` 可按 `search`、`zoom`、`download`、`print`、`exportHtml` 调整内置工具栏分组顺序，默认 `['search', 'zoom', 'download', 'print', 'exportHtml']`，未列出的项会按默认顺序追加；`toolbar.items` 可按 `download`、`print`、`export-html`、`zoom-in`、`zoom-out`、`zoom-reset` 精确控制内置按钮显隐；`toolbar.permissions` 使用同一套 key 做强权限控制，设为 `false` 时内置按钮和外部 API 调用都会被拦截。`toolbar.zoom` 可单独关闭缩放按钮组；真实缩放能力由各渲染器 provider 决定，Excel 等虚拟表格会通过内部列宽、行高和字体重排适配缩放，不会被外层 CSS 强行缩放。`toolbar.position` 支持 `auto`、`top`、`top-center`、`bottom-right`，默认 `auto`，PDF 会自动悬浮到右下角以避开自身导航栏，其他格式保持顶部靠右；需要顶部水平居中时传 `top-center`。打印入口保持紧凑单按钮，点击后下拉可选「直接打印」或「掩膜打印」；打印按钮还会结合当前文件类型、渲染完成状态和导出适配器动态显隐，Excel 等虚拟表格链路会隐藏打印按钮 |
| `fit` | 显式内容适配策略。未传时保持各 renderer 历史首屏行为；传字符串时支持 `'auto'`、`'contain'`、`'cover'`、`'width'`、`'height'`、`'actual'`、`'scale-down'`，传对象时可配置 `{ mode, resize, padding, minScale, maxScale }`。`resize` 默认 `'until-interaction'`：首屏和容器变化自动适配，用户手动缩放、平移或调用 `applyViewState()` 后停止覆盖；`'always'` 会持续跟随容器，`'initial'` 只做首屏。自定义工具栏可调用 `fitToView('width')` 主动重新适配 |
| `watermark` | `true`、文字配置或图片配置；支持 `text`、`image`、`opacity`、`rotate`、`gapX/gapY`、`width/height`、字体和颜色 |
| `search` | `true`、`false` 或对象；控制搜索能力。对象支持 `caseSensitive`、`wholeWord`、`maxMatches`、`debounce`、`className` 和 `activeClassName`。Word、Markdown、代码等文本类格式使用通用 DOM 高亮，PDF 等特殊格式可以走渲染器原生搜索提供器，避免污染文本层或 canvas |
| `text` | `toolbar: false` 可隐藏 renderer 内部的文件类型、索引状态和行数元信息栏，不影响 Viewer 全局操作工具栏。普通文本/代码用 `lineNumbers: true` 开启不干扰复制、搜索和无障碍朗读的行号栏。文本和代码超过 `virtualizeAboveBytes`（默认 512 KiB）后使用有界虚拟行；Markdown 默认保持排版阅读视图，只有显式设置 `markdownVirtualizeAboveBytes` 时才会在超限后切换为有界源码视图。`maxRenderedLineBytes` 和 `virtualOverscanLines` 控制挂载量，全文搜索仍覆盖完整源文件 |
| `ai` | AI 友好结构配置；预览器不绑定云端模型，只提供 `getDocumentTextChunks()` 所需的文本切片、行号、页码、锚点和 label 上下文，业务侧可用于向量化、溯源、来源定位、召回高亮和审计 |
| `archive.workerUrl` | 自定义 libarchive.js Worker 地址。一般不需要配置；预览器会优先尝试当前部署 base 下的 `vendor/libarchive/worker-bundle.js`，失败后自动回退到 ZIP/TAR/GZIP 兼容模式 |
| `archive.wasmUrl` | 静态 Worker 需要从非同目录加载 libarchive WASM 时使用。只有需要指向自托管目录或自定义 wasm 位置时才配置 |
| `archive.workerTimeoutMs` | Worker 初始化、加密检测和目录读取超时时间，默认 30000ms；超时后会自动尝试 ZIP/TAR/GZIP 兼容模式 |
| `archive.cache` | 是否使用 IndexedDB 缓存已解压的压缩包内文件 |
| `archive.maxArchiveSize` | 单个压缩包允许读取目录的最大体积，默认 320MB |
| `archive.maxEntryPreviewSize` | 压缩包内单文件允许预览的最大体积，默认 64MB |
| `archive.entryActions.download` | 控制压缩包内部文件预览栏的下载按钮，可传 `false` 全局隐藏，也可传 `(entry) => boolean` 按路径、扩展名、大小等元数据判断；它只影响压缩包内部条目，不会关闭顶层 viewer 下载原始压缩包的能力 |
| `docx.worker` | 是否启用 `@file-viewer/renderer-word` 内部的 `@file-viewer/docx` Worker 解析，默认自动检测：HTTP/HTTPS 启用 Worker，Electron `file://`、`about:`、`data:` 等不安全本地协议自动回退主线程；显式设为 `true` / `false` 时按业务配置执行 |
| `docx.workerUrl` | 自定义 DOCX Worker 地址，默认尝试当前部署 base 下的 `vendor/docx/docx.worker.js` |
| `docx.workerJsZipUrl` | 自定义 DOCX Worker 内加载的 JSZip 地址，默认尝试当前部署 base 下的 `vendor/docx/jszip.min.js` |
| `docx.darkMode` | 是否强制 DOCX 使用暗黑渲染。默认不传，由 `options.theme` 决定：`dark` 开启、`light` 关闭、`system` 跟随浏览器系统主题 |
| `docx.progressive` | 是否启用异步分批渲染，默认按批次让出主线程，提升大文档首屏和滚动响应 |
| `docx.visualPagination` | 是否启用页式预览和预览层兜底分页，默认 `false`。默认 DOCX 使用连续流式阅读，避免复杂目录、表格和长段落被分页拆坏；只有业务明确需要页式效果时再设为 `true` |
| `docx.workerTimeout` | DOCX Worker 超时时间，默认 5000ms，静态资源路径、MIME、CSP 或 WebView 不兼容时会更快回退 |
| `spreadsheet.worker` | 是否启用表格静态 Worker。默认 `auto`：文件体积达到 `spreadsheet.workerAutoThreshold` 时自动尝试 Worker，小文件继续主线程兼容路径；显式设为 `true` / `false` 时按业务配置执行 |
| `spreadsheet.workerAutoThreshold` | `worker: 'auto'` 时的大文件阈值，单位字节，默认 1MB。需要更激进优化可调低；WebView、CSP 或静态资源不稳定环境可调高或设 `worker: false` |
| `spreadsheet.workerUrl` | 自定义 Excel/XLSX Worker 地址，默认尝试当前部署 base 下的 `vendor/xlsx/sheet.worker.js` |
| `spreadsheet.textEncoding` | CSV / TSV 文本编码，默认 `auto`：优先 UTF-8 BOM 和严格 UTF-8，否则使用浏览器 GB18030 解码（同时覆盖 GBK）；也可显式指定 `utf-8`、`gbk` 或 `gb18030` |
| `spreadsheet.resizableColumns` | 是否允许用户在 Excel / CSV / ODS 等表格预览中拖拽表头边界调整列宽，默认 `false` 以保持历史兼容；Demo 默认开启，便于查看被截断的长文本 |
| `presentation.workerUrl` | 自定义 `@file-viewer/pptx` Worker 地址。默认由 `@file-viewer/renderer-presentation` 按需创建模块 Worker；内网静态目录、严格 CSP 或自托管 CDN 改写资源路径时可显式传入绝对 URL |
| `presentation.workerType` | PPTX Worker 类型，通常保持默认 `module`；只有旧 WebView、特殊 CSP 或构建系统要求 classic Worker 时再覆盖 |
| `presentation.pptModuleUrl` / `presentation.pptWorkerUrl` / `presentation.pptWasmUrl` / `presentation.pptFontUrl` | PowerPoint 97–2003 `.ppt` 0.3.3 的 ESM、Worker、WASM 和 CJK 字体高级路径覆盖；Demo、Vite/full、copy-assets 与 CDN/IIFE 的标准布局无需配置 |
| `presentation.pptWorker` / `presentation.pptCache` | 控制二进制 PPT 的 Worker 模式和有界 IndexedDB 帧缓存；默认均自动启用可用能力 |
| `pdf.streaming` | PDF URL 渐进读取策略，默认 `same-origin`；设为 `true` 时跨域也尝试 URL 直连读取，设为 `false` 时完全回到 Blob 下载后预览 |
| `pdf.toolbar` | 是否显示 PDF 渲染器自己的页码、缩放和旋转工具栏。独立预览建议显示；左右文档比对等紧凑场景可设为 `false`，让 PDF 与其他格式的正文区域对齐 |
| `pdf.navigation` / `pdf.defaultNavigationVisible` | 是否启用左侧导航窗格以及初始是否展开。导航窗格支持页面列表和目录树切换 |
| `pdf.thumbnails` | 页面列表是否显示真实页面缩略图，默认 `false`；开启后只对可见页懒渲染缩略图，避免大 PDF 一次性生成所有 canvas |
| `pdf.bbox` | 首次打开时框选并定位一个或多个 PDF 区域；支持比例、百分比、PDF points，以及带原图尺寸的 OCR 像素坐标 |
| `pdf.rangeChunkSize` | PDF.js Range 请求分片大小，默认 64KB；仅在文件服务支持 Range 时生效 |
| `pdf.withCredentials` | PDF.js URL 读取是否携带浏览器凭据，默认 `false` |
| `pdf.workerUrl` | 自托管 PDF.js Worker 地址。默认先从站点根路径探测 `/vendor/pdf/pdf.worker.mjs`，可用时使用真实 Worker；资源不存在、返回 HTML 或本地临时服务未复制 viewer assets 时，会懒加载包内 PDF.js worker handler 兜底，保证轻量组件 + preset 也能预览。子路径、独立静态域或严格 CSP 部署时请显式传入绝对 URL |
| `pdf.cMapUrl` | PDF.js CMap 目录，默认从站点根路径加载 `/vendor/pdf/cmaps/` |
| `pdf.wasmUrl` | PDF.js WASM 目录，默认从站点根路径加载 `/vendor/pdf/wasm/` |
| `pdf.standardFontDataUrl` | PDF.js standard fonts 目录，默认从站点根路径加载 `/vendor/pdf/standard_fonts/` |
| `cad.wasmPath` | LibreDWG WASM 资源目录，默认相对 viewer 入口加载 `wasm/cad/`。私有化部署或子路径部署时可以显式传绝对 URL |
| `cad.workerUrl` | DWG Worker 地址，默认相对 viewer 入口加载 `wasm/cad/dwg-worker.js`。如果网关或构建系统改写静态资源路径，应显式覆盖 |
| `cad.dwfWasmUrl` | DWF/DWFx/XPS native renderer 的 raster fallback WASM，默认相对 viewer 入口加载 `wasm/cad/dwfv-render.wasm` |
| `cad.renderer` | CAD 渲染后端，支持 `auto`、`webgl`、`canvas2d`，默认 `auto`，优先 retained WebGL 并自动回退 Canvas2D |
| `cad.workerTimeoutMs` | DWG Worker 解析超时，默认 120000ms。传 `0` 表示不限制 |
| `cad.dwfPreferWebgl` / `cad.dwfPreferWasm` | DWF/DWFx/XPS native renderer 的 WebGL 和 WASM backend 偏好，默认都启用 |
| `cad.dwfLineWeightMode` | DWF/XPS 线宽策略，支持 `adaptive`、`physical`、`hairline` |
| `model.workerUrl` / `model.runtimeUrl` / `model.wasmUrl` | STEP/STP、IGES/IGS、BREP 的本地 OCCT 资源地址，默认依次使用 `wasm/model/occt-worker.js`、`wasm/model/occt-import-js.js`、`wasm/model/occt-import-js.wasm`；子路径、独立资产域名或严格 CSP 部署时可传最终绝对 URL |
| `model.useWorker` / `model.workerTimeoutMs` | OCCT 默认在一次性 Worker 中解析，超时默认 120000ms。只有 Worker 确实不可用时才建议设 `useWorker: false`，否则大模型解析会占用主线程 |
| `model.linearUnit` / `model.linearDeflectionType` / `model.linearDeflection` / `model.angularDeflection` | 控制 OCCT 导入单位和三角化精度；没有明确业务要求时保留内核默认值，避免过细网格放大解析时间和内存占用 |

## preset 与 renderer 装配矩阵

`preset` 是产品级能力包，适合大多数项目；`renderers` 是精确装配入口，适合只要少数格式或自研 renderer 的项目。两者可以一起使用，但建议保持 `rendererMode:'replace'`，让当前 viewer 的能力集可读、可审计、可复现。

| Preset | 包含 renderer | 典型格式 | 适合场景 |
| --- | --- | --- | --- |
| `@file-viewer/preset-lite` | `renderer-text`、`renderer-image`、`renderer-media` | Markdown、代码、文本、图片、音频、视频、HLS、HEIC | 工单、IM、轻附件、移动端首屏优先 |
| `@file-viewer/preset-office` | `renderer-pdf`、`renderer-word`、`renderer-spreadsheet`、`renderer-presentation`、`renderer-ofd` | PDF、DOC/DOCX/DOT、RTF、ODT、XLS/XLSX/ODS、PPT/PPTX、OFD | OA、合同、知识库、审批、档案 |
| `@file-viewer/preset-engineering` | `renderer-cad`、`renderer-3d`、`renderer-drawing`、`renderer-mindmap`、`renderer-geo`、`renderer-typst`、`renderer-archive`、`renderer-data`、`renderer-eda` | DWG/DXF/DWF、3D、draw.io、Excalidraw、Mermaid、PlantUML、XMind、GeoJSON/KML/GPX/SHP、Typst、压缩包、PSD/SQLite/Parquet、OLB/DRA/GDS/OASIS | 工程图纸、研发附件、设计资产、压缩包归档 |
| `@file-viewer/preset-all` | 上述全部 renderer，并保留 core 原生低成本链路 | 官方 Demo 完整格式矩阵 | 全格式附件中心、验收环境、演示站 |

单 renderer 适合极小集成。每个 renderer 都可以直接传入 `options.renderers`：

| Renderer 包 | 导出 | 覆盖链路 |
| --- | --- | --- |
| `@file-viewer/renderer-pdf` | `pdfRenderer` | PDF、AI 中 PDF-backed 文件 |
| `@file-viewer/renderer-word` | `wordRenderer` | DOCX/DOC/DOT/RTF/ODT/OpenDocument |
| `@file-viewer/renderer-spreadsheet` | `spreadsheetRenderer` | XLSX/XLS/ODS/CSV 等表格 |
| `@file-viewer/renderer-presentation` | `presentationRenderer` | 二进制 PPT 按需使用 `@file-viewer/ppt`；PPTX/PPTM/POTX/POTM/PPSX/PPSM 按需使用 `@file-viewer/pptx` |
| `@file-viewer/renderer-ofd` | `ofdRenderer` | OFD |
| `@file-viewer/renderer-cad` | `cadRenderer` | DWG/DXF/DWF/DWFx/XPS 等 CAD |
| `@file-viewer/renderer-3d` | `modelRenderer` | GLB/GLTF/OBJ/STL/PLY/FBX/DAE/USD 等模型；STEP/STP、IGES/IGS、BREP 本地 OCCT 预览；IFC/3DM 几何签名与接入提示 |
| `@file-viewer/renderer-drawing` | `drawingRenderer` | draw.io、Excalidraw、Mermaid、PlantUML |
| `@file-viewer/renderer-mindmap` | `mindmapRenderer` | XMind |
| `@file-viewer/renderer-geo` | `geoRenderer` | GeoJSON、KML、GPX、SHP |
| `@file-viewer/renderer-typst` | `typstRenderer` | Typst 源文件本地 WASM 预览 |
| `@file-viewer/renderer-archive` | `archiveRenderer` | ZIP/RAR/7Z/TAR/GZ/ISO/APK/CBZ/CBR 等压缩包与内部文件预览 |
| `@file-viewer/renderer-email` | `emailRenderer` | EML、MSG、MBOX |
| `@file-viewer/renderer-epub` | `ebookRenderer` | EPUB、UMD |
| `@file-viewer/renderer-text` | `textRenderer` | Markdown、代码、日志、JSON/YAML、patch、git bundle |
| `@file-viewer/renderer-image` | `imageRenderer` | 图片、HEIC/HEIF 等图片链路 |
| `@file-viewer/renderer-media` | `mediaRenderer` | 音频、视频、HLS、MIDI 摘要 |
| `@file-viewer/renderer-data` | `dataRenderer` | PSD、字体、SQLite、Parquet、Avro、WASM、WebArchive、AI/EPS 摘要 |
| `@file-viewer/renderer-eda` | `edaRenderer` | OLB、DRA、GDS、OAS/OASIS |

`@file-viewer/eda-layout`、`@file-viewer/eda-orcad`、`@file-viewer/geometry-engine` 和 `@file-viewer/pptx` 是 renderer 内部可复用引擎包。它们可以单独用于高级二开，但常规预览集成应优先安装对应 renderer 或 preset。

### 装配决策

| 目标 | 推荐写法 |
| --- | --- |
| 非 Vite、需要稳定接入 | 显式 `import officePreset from '@file-viewer/preset-office'`，传 `options.preset` |
| Vite、希望省掉手动 import | 安装 preset + `@file-viewer/vite-plugin`，注册 `fileViewerRenderers({ copyAssets:true })` |
| 只要一个格式 | 安装单 renderer，传 `options.renderers: [pdfRenderer]` |
| 需要组合办公和工程 | `preset: [officePreset, engineeringPreset]` |
| 打开支持矩阵内但未装配的格式 | 预览器会提示应安装的 preset / renderer |
| 完全未知扩展名 | 才显示真正“不支持此格式” |

图片水印可以传相对路径、业务内网 URL 或 data URL。开启图片水印时，文字水印不会重复绘制；纯离线部署建议使用随业务静态资源发布的图片或 data URL。

Typst 文件通过 `.typ` / `.typst` 扩展名识别。组件会直接读取 Typst 源文件，并在命中格式时按需加载浏览器 WASM 编译器、SVG 渲染链路和默认字体资产；不会自动探测、替换或优先使用同名 PDF。默认 compiler / renderer WASM 随 viewer assets 分发到 `wasm/typst/`，默认字体分发到 `wasm/typst/fonts/`，也可以按私有化部署要求指定自己的地址；运行时不会访问公共 CDN，也不会用源码视图冒充预览成功。若本地 WASM 或字体目录不可用，或浏览器端编译超出预期时间，组件会显示明确的部署或超时错误，便于第一时间修正静态资源路径。

```ts
const options = {
  typst: {
    compilerWasmUrl: '/file-viewer/wasm/typst/typst_ts_web_compiler_bg.wasm',
    rendererWasmUrl: '/file-viewer/wasm/typst/typst_ts_renderer_bg.wasm',
    fontAssetsUrl: '/file-viewer/wasm/typst/fonts/',
    renderTimeoutMs: 180000
  }
}
```

当前浏览器端编译更适合单文件 Typst 源文档；如果文档依赖同目录图片、字体或拆分源码，建议在业务侧先打包成压缩包预览，保留完整项目结构后再选择内部 `.typ` 文件。部署到 Cloudflare Pages 这类有单文件大小限制的平台时，可以对 `typst_ts_web_compiler_bg.wasm` 做 Brotli 预压缩并通过静态响应头设置 `Content-Encoding: br`，示例发布脚本已经内置该处理。

<div class="doc-note">
  性能敏感的 PDF 建议使用同源静态地址，并让文件服务支持 Range 请求。这样 PDF.js 可以先建立页面结构，再按需渲染当前页和附近页面；不支持 Range 时仍会走 PDF.js URL 渐进读取，避免外层预览器重复整包缓冲。鉴权接口、无后缀下载接口或跨域签名 URL 则建议继续由业务侧取回 Blob 后包装为 File，稳定性更高。
</div>

## 生命周期钩子和按钮前置校验

Vue2 / Vue3 组件可以直接通过 `options.hooks` 接收文档生命周期。每个回调都会拿到同一套上下文: `type`、`filename`、`source`、`url`、`file`、`size`、`version`、`timestamp`，加载完成时还会带上 `duration`。

```ts
const options = {
  hooks: {
    onLoadStart(context) {
      console.log('开始加载', context.type, context.filename)
    },
    onLoadComplete(context) {
      console.log('加载完成', context.duration)
    },
    onUnloadStart(context) {
      console.log('开始卸载', context.reason)
    },
    onUnloadComplete(context) {
      console.log('卸载完成', context.filename)
    }
  },
  async beforeOperation(context) {
    if (context.operation === 'print') {
      return await checkCanPrint(context.filename)
    }
    return true
  },
  toolbar: {
    position: 'bottom-right',
    order: ['zoom', 'search', 'download', 'print'],
    download: true,
    print: true,
    exportHtml: true,
    items: {
      'zoom-reset': false
    },
    permissions: {
      print: canPrint
    },
    beforeDownload(context) {
      return confirm(`下载 ${context.filename}?`)
    }
  }
}
```

内置工具栏分组当前包括 `search`、`zoom`、`download`、`print` 和 `exportHtml`，可通过 `toolbar.order` 调整显示顺序；它只负责排序，不负责隐藏。内置操作当前包括 `download`、`print`、`export-html`、`zoom-in`、`zoom-out` 和 `zoom-reset`。`toolbar.items` 只控制内置工具栏展示，适合把默认按钮交给业务 UI 接管；`toolbar.permissions` 是强权限门禁，会在 `options.beforeOperation` 之前执行，外部自定义按钮调用 controller API 时同样生效。`options.beforeOperation` 是全局前置钩子，`toolbar.beforeOperation` 会在工具栏层统一执行，`toolbar.beforeDownload` / `toolbar.beforePrint` / `toolbar.beforeExportHtml` 可以对单个按钮做精确控制。任意权限项为 `false` 或任意钩子返回 `false` 都会取消本次操作。预览器还会在文件切换、渲染完成和能力变化时抛出 `operation-availability-change`，宿主可以用它同步外部下载、打印、HTML 和缩放按钮；缩放后的最终比例会通过 `zoom-change` 回传，适合 DOCX / PPTX 这类下一帧重排后才拿到有效比例的格式。

组件生命周期会和所属框架保持一致。Vue3 / Vue2 组件销毁、React 组件卸载、Web Component `disconnectedCallback`、Svelte action `destroy`、jQuery 插件 `destroy` 都会进入同一套 controller 销毁流程：取消当前加载请求，销毁 renderer session，清空预览 DOM，停止缩放、搜索和视图状态监听，并触发 `unload-start` / `unload-complete`，`reason` 为 `component-unmount`。因此在 Element Plus `el-dialog destroy-on-close`、路由切换、页签关闭或 `v-if` 条件移除时，不需要业务侧再手动清空预览容器。

如果外层只是隐藏组件，例如 `v-show`、未开启 `destroy-on-close` 的弹窗或 KeepAlive 场景，组件不会自动释放当前文档，这通常用于保留阅读状态。确实需要主动释放时，可以调用组件 ref 或 controller 上的 `destroy()`；销毁后再继续预览，建议重新创建组件实例或重新挂载 controller。

未显式传 `options.fit` 时，首屏继续沿用各 renderer 的历史默认策略，因此 PDF 仍默认适配宽度，图片仍默认 scale-down，表格和代码保持可读优先。传入 `fit` 后，core 会统一编排 renderer 自己的 zoom / view provider，不在宿主外层套 CSS `transform`。PDF、Word/DOCX、图片等 renderer 会在页面加载、显式 fit、图片 natural size 读取、容器 resize 或内部重排完成后重新上报真实 `scale` / `label`；内置工具栏和 `getOperationAvailability()` 会同步更新 `zoomIn`、`zoomOut`、`zoomReset` 是否可用。自定义工具栏不要把首屏状态写死成 `100%`，应以 `zoom-change`、`fit-change` 或 `getZoomState()` 的值为准。

自定义工具栏不要在预览器外层套 `transform: scale()`。这会破坏虚拟表格、canvas、PDF 文本层或 CAD 交互坐标。请通过组件 ref 调用标准缩放 API：

```ts
const state = viewerRef.value?.getZoomState()

await viewerRef.value?.zoomIn()
await viewerRef.value?.zoomOut()
await viewerRef.value?.resetZoom()
await viewerRef.value?.fitToView('width')
```

各框架的自定义方式略有不同：Vanilla JS / Pure Web 优先使用 `<flyfish-file-viewer>` 元素实例或 controller，Vue3 使用模板 `ref` 和独立 emit，Vue2 使用 `$refs` 与 `viewer-event`，React 推荐 `useFileViewer()`，Svelte 使用 `bind:this` 或 action，jQuery 使用插件方法 / controller。完整属性矩阵和每种框架的自定义工具栏示例见 [生态组件总览](/zh/guide/ecosystem#工具栏定制)。

Vanilla JS / Pure Web、React、jQuery 和 Svelte 集成可以直接接收同样的生命周期和操作上下文。标准事件入口使用 `onEvent`；Svelte 组件同时会派发 `viewerEvent`。

```ts
mountViewer(container, {
  url: '/files/demo.pdf',
  onEvent(event) {
    if (event.type === 'load-complete') {
      console.log(event.payload.filename, event.payload.duration)
    }
  }
})
```

## 视图状态同步

`initialViewState`、`view-state-change`、`getViewState()` 和 `applyViewState()` 面向投屏系统、远端协同、双栏对比和阅读进度恢复。所有标准 renderer 路径都会注册 view-state provider：没有专属实现的格式会使用通用 DOM provider，记录 renderer、缩放和滚动比例；PDF 会额外记录页码、页数、旋转和目录/缩略图导航；XMind 会记录 sheet、panX、panY 和 zoom；Geo 会记录地图中心、zoom、bearing 和 pitch；3D 会记录相机位置、target 和显示选项；CAD 会上报底层 viewer 暴露的视图快照。

```ts
const lastState = ref(null)

const options = {
  initialViewState: {
    page: 3,
    scale: 1.25,
    scroll: { topRatio: 0.18 }
  }
}

function onViewerEvent(event) {
  if (event.type === 'view-state-change') {
    lastState.value = event.payload.state
    syncToDisplay(event.payload)
  }
}

await displayViewer.applyViewState(lastState.value, {
  source: 'api',
  action: 'restore'
})
```

自定义 PDF 工具栏可直接读取页码快照，并用部分状态完成上一页、下一页或页码输入跳转：

```ts
const state = viewerRef.value?.getViewState()
const page = Number(pageInput.value)

await viewerRef.value?.applyViewState(
  { page },
  { source: 'api', action: 'page-change' }
)

await viewerRef.value?.applyViewState(
  { page: Math.min((state?.page || 1) + 1, state?.pageCount || 1) },
  { source: 'api', action: 'page-step' }
)
```

业务侧同步时建议发送完整 `state` 快照，而不是只发送单个按钮事件。PDF 页码点击、缩放、滚动，XMind 拖动画布，Geo 地图移动和 3D 相机变化都会归并成同一种事件结构，展示端只需要调用 `applyViewState()`。滚动投屏可以按动画帧合并高频快照，但不要使用“停止滚动后才发送”的尾触发防抖，否则大屏无法实时跟随。

PDF 可通过 `pdf.bbox` 在首次打开时直接框选并定位区域，也可通过 `applyViewState()` 动态替换或清除框选。页码从 1 开始；OCR 像素坐标使用 `pixel` 并提供原图宽高，PDF 原生坐标使用 `pdf-point`（默认左下原点），`ratio` / `percent` 默认使用左上原点。单个对象和数组都支持，旋转与缩放后高亮会继续贴合页面。

```ts
const options = {
  pdf: {
    bbox: {
      page: 3,
      x: 120,
      y: 240,
      width: 360,
      height: 64,
      unit: 'pixel',
      sourceWidth: 1440,
      sourceHeight: 2036,
      label: '合同金额'
    }
  }
}

await viewer.applyViewState({
  page: 5,
  extra: {
    bbox: { page: 5, x: 72, y: 640, width: 220, height: 36, unit: 'pdf-point' }
  }
}, { source: 'api', action: 'bbox-focus' })

await viewer.applyViewState(
  { extra: { bbox: null } },
  { source: 'api', action: 'bbox-clear' }
)
```

## 搜索、定位与 AI 友好结构

`FileViewer` 会在渲染完成后把文档 DOM 抽象成通用锚点，并在组件 ref 上暴露搜索和定位方法。搜索会在预览区内高亮命中结果，`nextSearchResult()` / `previousSearchResult()` 会滚动到当前命中；`scrollToLine()` 和 `scrollToAnchor()` 会按照当前格式可用的锚点定位。Word、Markdown、代码等文本类文档通常能定位到段落/行块，PDF 会优先使用 PDF.js 原生查找控制器和页面锚点，避免直接改写 PDF 文本层导致文字定位异常。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { FileViewer } from '@file-viewer/vue3'

const viewerRef = ref<InstanceType<typeof FileViewer> | null>(null)

async function searchKeyword() {
  const state = await viewerRef.value?.searchDocument('合同')
  console.log(state?.current?.line, state?.current?.page)
}

async function locateLine() {
  await viewerRef.value?.scrollToLine(12)
}

function buildAiPayload() {
  const chunks = viewerRef.value?.getDocumentTextChunks() || []
  return chunks.map(chunk => ({
    text: chunk.text,
    source: {
      line: chunk.startLine,
      page: chunk.anchor.page,
      label: chunk.anchor.label
    }
  }))
}
</script>

<template>
  <file-viewer
    ref="viewerRef"
    url="/example/word.docx"
    :options="{ search: true, ai: { collectText: true } }"
  />
</template>
```

Vanilla JS / Pure Web、React、jQuery 和 Svelte 接入时，搜索和定位仍建议由宿主 UI 调用组件或 controller 暴露的标准能力；`onEvent` / `viewerEvent` 会同步搜索状态、页码、行号和溯源信息。需要 AI 摘要、问答、相似段落召回或证据链展示时，业务侧可把 `getDocumentTextChunks()` 返回的文本切片写入自己的向量库或审计系统，再通过 `scrollToAnchor()` / `searchDocument()` 回到原文位置。

## DOCX 流式阅读

`.docx`、`.docm`、`.dotx`、`.dotm` 由 `@file-viewer/renderer-word` 按需装配，并在命中格式时加载自研 `@file-viewer/docx` 做高可读流式渲染。默认链路会用 Worker 完成 ZIP/XML 解析，再在真实浏览器 DOM 中连续输出正文、目录字段缓存、页眉页脚、段落样式和制表符规则，最后执行宽度自适应、暗黑主题、打印和导出适配。默认不分页，优先保证复杂目录、长表格、中文公文和正式文档的连续阅读稳定性。

```vue
<FileViewer
  url="/files/report.docx"
  :options="{
    docx: {
      // 默认自动检测：HTTP/HTTPS 使用 Worker，Electron file:// 等不安全本地协议自动回退。
      // 只有明确要覆盖自动策略时才显式设置 true / false。
      // worker: true,
      // 默认尝试当前部署 base 下的 vendor/docx/docx.worker.js；自托管子路径部署可显式覆盖。
      workerUrl: '/file-viewer/vendor/docx/docx.worker.js',
      // Worker 内部加载 JSZip 的离线地址。
      workerJsZipUrl: '/file-viewer/vendor/docx/jszip.min.js',
      // 默认启用异步分批渲染，提升大文档可读性和响应速度。
      progressive: true,
      // 默认跟随 options.theme；业务需要固定效果时可显式传 true / false。
      // darkMode: true,
      // 默认 false，使用连续流式阅读；只有明确需要页式预览时再开启。
      visualPagination: false,
      // 默认 5000。Worker 超时后自动回退，避免永久 loading。
      workerTimeout: 5000,
      strictWordCompatibility: true,
      preserveComplexFieldResults: true,
      ignoreLastRenderedPageBreak: true
    }
  }"
/>
```

私有化部署时，`file-viewer-copy-assets` 会复制 `vendor/docx/docx.worker.js` 和 `vendor/docx/jszip.min.js`。如果静态目录前缀特殊，请同时配置 `docx.workerUrl` 和 `docx.workerJsZipUrl`。DOCX 默认跟随 viewer 主题：暗色 viewer 下使用深色文档阅读面，浅色 viewer 下保留传统浅色文档面；打印仍会回到适合纸张输出的浅色内容。结构复杂的 Word 文件建议保持 `strictWordCompatibility: true`、`preserveComplexFieldResults: true` 和默认流式布局，这样目录、制表符、页眉页脚、长表格和连续正文更稳定；确实需要页式效果时再设置 `visualPagination: true`。

## 打印、导出和水印的交付行为

- 下载原文件会保留用户传入的原始二进制内容，不会把渲染后的页面反向写回文件。
- 打印会生成只包含预览内容和水印的独立打印窗口，不带 Demo 侧边栏、示例选择器或操作工具条；开启 `options.watermark` 后，打印输出会附带同一套水印样式（`print-color-adjust: exact`）。
- 内置工具栏的「打印」保持紧凑单按钮：点击后下拉可选「直接打印」或「遮罩/盖章打印」。后者会打开页级设计器，可以拖拽绘制黑色遮盖块，也可以上传 PNG、JPEG、WebP、GIF 或 SVG 印章图片；图片只在本地读取为 data URL，并可在当前页拖动、缩放或删除，确认后叠在内容之上、水印之下再打印。设计器由 core 内部异步加载，安装组件即可开箱使用，无需额外配置子路径 alias。
- 自定义工具栏可调用 `printRenderedHtml()` 直接打印，或 `printWithMask()` 进入遮罩/盖章设计后再打印；也可向 `printRenderedHtml({ mask })` 传入已有 `regions` 与 `stamps`。`stamps` 使用百分比 `left`、`top`、`width`、`height`，并支持 `pageIndex`、`opacity`、`rotate`、`alt` 与 `src`。
- PDF 打印和导出 HTML 使用 PDF 专属导出适配器逐页生成完整页面，和当前滚动位置、当前可见页、导航窗格显隐状态都解耦，避免只输出当前页或被滚动容器截断。
- Word 打印和导出会清理预览阶段的缩放、绝对定位、滚动容器和 Demo 全局布局样式，把 `.docx` / `.doc` 还原成完整白色文档内容，避免只打印当前视口或第一页。
- 图片、Markdown、代码、PPTX、OFD、CAD、绘图、XMind、UMD、OLB/DRA/GDS/OASIS 等可以稳定克隆当前渲染结果的格式会保留打印按钮；Excel 当前使用 `styled-exceljs` + `e-virt-table` 虚拟渲染，完整工作表不会一次性存在于 DOM 中，因此表格、压缩包、邮件、EPUB、音视频、3D / 模型等更适合交互查看或原文件下载的格式会隐藏打印按钮。
- 导出 HTML 会尽量克隆当前渲染结果，并把 canvas 转成图片，保证图纸、绘图、文档和代码在离线 HTML 中仍有可读内容。
- DOCX 等预览链路若使用会话级 `blob:` 图片地址，导出/打印时会自动内联为 `data:` URL，避免下载后的 HTML 或打印窗口出现图片空白。
- 水印会同时参与预览、打印和 HTML 导出。文字水印适合内部资料、审批流和归档场景；图片水印适合品牌 Logo 或业务系统标识。

## 典型切换方式

```vue
<script setup lang="ts">
import { ref } from 'vue'

const url = ref('https://example.com/demo.docx')
const file = ref<File | undefined>()

function useRemote() {
  file.value = undefined
  url.value = 'https://example.com/demo.docx'
}

async function useLocal(blob: Blob) {
  file.value = new File([blob], 'local-preview.pdf', { type: blob.type })
}
</script>
```

这一组行为在组件里是稳定的:

- `file` 一旦有值，就优先走 `file`
- `file` 清空后，如果 `url` 还在，就会自动回退到 `url`

## 常见注意事项

### 父容器高度

这类问题最容易被忽略。如果父容器没有高度，预览器会跟着塌陷，最终看起来像“没有渲染”。

### URL 请求失败

如果控制台里能看到 403、404 或 CORS 报错，问题一般不在预览器本身，而是在目标文件地址的可访问性上。

### 文件名要尽量准确

预览器依赖文件扩展名选择渲染器，所以无论你传入的是 URL 还是二进制结果，文件名都应该尽量带上正确扩展名。

### OFD、Typst、XMind、压缩包、邮件、EDA、CAD、3D 模型、绘图和电子书怎么接

`.ofd` 会使用 `DLTech21/ofd.js` 仓库源码在浏览器端解析，避开 npm dist 的授权 wasm 分支。CAD 文件会使用 `@flyfish-dev/cad-viewer`：`dwg` 通过 Worker + LibreDWG WASM 解析，`dxf` 使用 JavaScript parser，`dwf` / `dwfx` / `xps` 通过 native `dwf-viewer` 渲染 W2D/W3D/XPS 图形。私有化部署时请确认 viewer assets 目录下的 `wasm/cad/libredwg-web.js`、`wasm/cad/libredwg-web.wasm`、`wasm/cad/dwfv-render.wasm` 和 `wasm/cad/dwg-worker.js` 可访问；路径不同可通过 `options.cad.wasmPath` / `options.cad.workerUrl` / `options.cad.dwfWasmUrl` 覆盖。

`.typ` / `.typst` 会直接读取源文件并加载 Typst WASM 编译、SVG 渲染和本地字体链路，组件会按 Typst 输出的页面元数据拆页显示。当前更适合单文件 Typst 文档；如果文档依赖外部图片、字体或拆分源码，建议用压缩包保留项目结构。

`.xmind` 会使用 `@file-viewer/renderer-mindmap` + `@ljheee/xmind-parser` 解析 XMind 8 XML 和 XMind 2020+ JSON 文件包，并展示多 sheet、节点、标签、备注、链接、标记、目录侧栏。画布交互由轻量 `@panzoom/panzoom` 承接，支持拖拽平移、移动端双指缩放、适配画布、搜索和缩放。它是只读预览能力，不会修改脑图文件；需要编辑、协作批注或复杂布局重排时仍建议回到专业脑图软件。

`.zip`、`.7z`、`.rar`、`.tar`、`.gz`、`.xz`、`.cab`、`.iso`、`.jar`、`.apk`、`.cbz`、`.cbr` 等压缩包会使用 `libarchive.js` Worker 读取目录。内部文件在点击后按需解压，并继续交给对应格式预览器。`archive.entryActions.download` 可以隐藏内部文件预览栏里的单文件下载按钮，或用回调按 `entry.path`、`entry.extension`、`entry.size` 等信息做权限判断；顶层 viewer 工具栏里的原始压缩包下载仍由 `toolbar` / `beforeOperation` 控制。私有化部署一般不需要手动配置 `archive.workerUrl`；如果静态目录或资源前缀特殊，可把 `worker-bundle.js` 与同目录的 `libarchive.wasm` 发布出来后配置 `options.archive.workerUrl`。当手机 WebView、本地临时服务器、MIME 或 CSP 导致 Worker 初始化失败时，组件会自动切换到 ZIP/TAR/GZIP 兼容模式，避免停留在 loading。

`.eml` 使用 `postal-mime`，`.msg` 使用 `@kenjiuno/msgreader`。邮件正文会在隔离沙箱文档中展示，附件可以下载，也可以继续在线预览。React、React Legacy、Vanilla JS 和 Web Component 会复用父预览器已经解析好的 renderer registry，不需要再写框架专用的嵌套预览桥接。使用轻量组件时，需要为希望在线预览的附件类型安装并注入相应 preset 或 renderer（例如 PDF 附件需要 PDF renderer）；Full 包已包含完整的标准 registry，无需额外配置。附件文件名始终按文本显示，不作为 HTML 解析。

`.olb` 与 `.dra` 使用 `@file-viewer/renderer-eda` + `cfb` 做 OrCAD / Allegro 常见复合文档结构预览。标准 `.gds` 会读取 GDSII 记录流，提取库名、structure、boundary、path、文本和引用，并生成可滚动 SVG 版图预览；项目内可读 `.oas` / `.oasis` 文本夹具会输出 SVG 版图，真实 SEMI 二进制 OASIS 当前做安全结构索引、可读字符串和诊断信息。EDA 链路适合附件初筛和内容确认，不替代专业 EDA 软件里的封装编辑、版图编辑、DRC/LVS、规则校核和电气验证；完整 OASIS / Cadence 几何预览后续更适合拆成独立 WASM 按需包持续维护。

3D 模型使用 `@file-viewer/renderer-3d` + Three.js loaders，支持 `glb/gltf/obj/stl/ply/fbx/dae/3ds/3mf/amf/usd/usda/usdc/usdz/kmz/pcd/wrl/vrml/xyz/vtk/vtp`。如果模型有外部贴图、材质或 `.bin`，远程 `url` 预览会按原始文件目录继续加载；本地上传时更推荐使用单文件 `.glb`。`step/stp`、`iges/igs` 和 `brep` 已通过 `@file-viewer/geometry-engine` 接入浏览器本地 OpenCascade Worker/WASM，解析后直接构建 Three.js 装配层级和网格，并复用全局统一缩放。默认离线资产位于 `wasm/model/`；子路径或独立资产域名可通过 `options.model.workerUrl`、`options.model.runtimeUrl`、`options.model.wasmUrl` 覆盖。`ifc` 与 `3dm` 当前仍做签名识别和接入提示，后续分别沿 `web-ifc` / That Open 与 `rhino3dm` 路线实现。

### 地理数据怎么接

`geojson` 会直接按 GeoJSON 读取；`kml` 和 `gpx` 会由 `@file-viewer/renderer-geo` 按需加载 `@tmcw/togeojson` 转换；`shp` 会由同一个 renderer 包按需加载 `shpjs`。内置预览默认使用离线 MapLibre 空底图渲染点线面叠加层，不依赖在线瓦片服务，适合内网附件中心快速确认点位、轨迹和边界。

如果需要真实地图底图，可以显式启用公开或自托管瓦片：

```ts
const options = {
  renderers: [geoRenderer],
  geo: {
    basemap: 'openfreemap-liberty',
  },
}
```

也可以直接配置 raster 瓦片 URL，支持公网、内网网关、国内 CDN、对象存储或离线静态目录：

```ts
const options = {
  renderers: [geoRenderer],
  geo: {
    tileUrl: '/tiles/world/{z}/{x}/{y}.png',
  },
}
```

中国大陆生产环境推荐把 OpenFreeMap / OpenMapTiles 这类国际化开源底图栈自托管或镜像后，通过 `geo.basemap.styleUrl` 或 `geo.tileUrl` 接入；OpenStreetMap 官方 raster 瓦片只作为 `osm-raster` 显式 opt-in preset 提供，适合 demo 或低频访问，不应当作为高并发生产默认底图。

也可以使用天地图矢量、影像或地形底图。调用方需要自行申请与部署域名匹配的 token；viewer 会同时加载对应的底图和注记图层，且不会内置或保存 token：

```ts
const options = {
  renderers: [geoRenderer],
  geo: {
    basemap: 'tianditu-vector',
    tiandituToken: import.meta.env.VITE_TIANDITU_TOKEN,
  },
}
```

另外两个 preset 是 `tianditu-imagery` 和 `tianditu-terrain`。需要隐藏注记时使用 `{ type: 'tianditu', token, mapStyle: 'imagery', labels: false }`；缺少 token 时会回退到离线空底图。

坐标系默认归一化到 WGS84。标准 GeoJSON 按 `EPSG:4326` 读取；带 `crs` 的 GeoJSON 会按声明转换；未声明但坐标超出经纬度范围时会自动推断 Web Mercator；业务系统也可以通过 `options.geo.projection` 显式指定 `EPSG:3857`、`EPSG:4490`、`GCJ02`、`BD09` 或 proj4 字符串。WebGL 不可用时会回退 SVG 矢量预览。海量要素抽稀或空间分析仍建议在业务 GIS 模块中处理。

`.excalidraw` 默认使用 `roughjs` 生成只读 SVG 预览，运行环境提供官方 `@excalidraw/excalidraw` ESM 模块时会优先尝试 `exportToSvg`；`.drawio` / `.dio` 默认使用不执行文档 HTML 的内置 SVG 预览。显式设置 `options.drawing.preferOfficial = true` 后，组件才在受限 iframe 中加载单独分发的 diagrams.net `GraphViewer`；静态路径特殊时可通过 `options.drawing.viewerScriptUrl` 指定同源自托管 `viewer-static.min.js`，同目录下的 styles、shapes、stencils、img、mxgraph 和 math 用于离线渲染，异常时回退内置 SVG。

`.epub` 会按需加载包内固化的本地阅读引擎，解析电子书包、目录和章节资源，并在浏览器内提供只读滚动阅读；运行时不访问第三方 CDN。阅读器会默认打开第一个正文章节，避免停留在封面或空白包装页。

`.umd` 会按早期移动电子书结构在浏览器端解析文件头、元数据、章节偏移、章节标题和压缩正文。正文数据块使用 `pako` 解压并按 UTF-16LE 解码，适合历史小说附件和旧移动阅读文件。Kindle 专有格式或 DRM 电子书建议先转换为 EPUB / UMD 文本电子书 / PDF 后再传入预览器。

### 音频怎么接

`.mp3`、`.mpeg`、`.wav`、`.ogg`、`.oga`、`.opus`、`.m4a`、`.aac`、`.flac`、`.weba` 由 `@file-viewer/renderer-media` 走浏览器原生 `<audio>` 播放器。不同浏览器对音频编码支持不完全一致，如果要保证最稳的跨端体验，建议优先输出 MP3 或 OGG。`.midi` / `.mid` 命中时才按需加载 `@tonejs/midi`，展示轨道、时长、PPQ 和音符摘要。

### 视频和 HLS 怎么接

`.mp4` 和 `.webm` 由 `@file-viewer/renderer-media` 优先使用浏览器原生 `<video>` 播放器。扩展名和容器名不等于视频编码：MP4 里的 MPEG-4 Part 2（`mp4v`）视频轨通常不能被 Chromium 原生解码，即使 AAC 音频仍能播放。遇到 MP4V Simple Profile 时，renderer 会按需加载一个独立 Worker 和 111,379 字节（gzip 34,410 字节）的 WASM 解码器，用 AAC 音轨校时并把 I420 画面绘制到 Canvas。解码器来自 AOSP PacketVideo，许可证为 Apache-2.0，不包含 FFmpeg、libav 或 LGPL/GPL/AGPL 源码。浏览器缺少 Worker、OffscreenCanvas 或 VideoFrame，或者文件超出当前解码范围时，会显示明确的兼容提示。`.m3u8` 优先使用浏览器原生 HLS 能力，不支持时再按需加载 `hls.js`。如果传入本地上传的 M3U8 文件，清单里引用的 TS/MP4 分片必须是浏览器可访问的绝对或相对 URL，否则只能展示清单加载失败。

### 字体、设计资产和数据文件怎么接

字体文件 `ttf/otf/woff/woff2` 会用 FontFace 临时注册到预览容器并展示样张。`psd` 会按需加载 `ag-psd` 展示尺寸、图层和预览图；`ai` 如果是 PDF-backed 文件会进入 PDF 预览，否则展示安全摘要；`eps` 不执行 PostScript，仅展示文本摘要。`sqlite`、`parquet`、`avro`、`wasm` 和 `webarchive` 都走 `@file-viewer/renderer-data` 独立结构预览链路，目标是快速判断文件内容，不替代数据库客户端或专业分析工具。SQLite 默认从 viewer assets 加载 `wasm/data/sql-wasm.wasm`；私有化部署路径特殊时，可以通过 `options.data.sqlWasmUrl` 或 `window.__FLYFISH_DATA_SQL_WASM_URL__` 指定自托管地址。

### `html` 会被当网页渲染吗

不会。`html` 在当前版本属于代码/文本类型，会按源码内容高亮显示，而不是作为真正网页执行。这一层策略更安全，也更适合做代码、模板和片段查看。
