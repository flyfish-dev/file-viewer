# 纯 JS 集成

<div class="doc-kicker">Vanilla JavaScript</div>

<p class="doc-lead">
  纯 JS 包现在提供原生 <code>&lt;flyfish-file-viewer&gt;</code> 组件和 <code>mountViewer(container, options)</code> 两种标准入口。
  推荐优先使用 Custom Element；需要完全命令式控制时再使用 controller 挂载。
</p>

## 标准安装

新项目优先使用标准包名:

```bash
npm install @file-viewer/web @file-viewer/preset-office
```

想要一步到位获得完整格式矩阵时，直接使用 full 包:

```bash
npm install @file-viewer/web-full
```

`@file-viewer/web-full` 会自动启用完整格式矩阵，仍然暴露 `<flyfish-file-viewer>`、`mountViewer` 和同一套 controller API。它的 CDN / IIFE 首包只包含组件壳和 lazy full preset，PDF、Word、Excel、CAD、Typst、压缩包等重型 renderer 会在命中文件类型时异步加载对应 `dist/renderers/*.iife.js`。

Full 已内置 `preset-all`，不要再安装或传入其它 preset。直接使用 CDN，或原样部署完整 `dist/` 目录时，renderer chunk 与 Worker/WASM/字体/vendor 资产都在目录内，无需复制。包管理器构建只输出业务入口时，Vite 使用 `copyAssets:true`；非 Vite 项目使用下文随包提供的同版本 CLI。

历史包名仍同步维护:

```bash
npm install @flyfish-group/file-viewer-web
```

```html
<flyfish-file-viewer
  id="viewer"
  src="/files/demo.pdf"
  filename="demo.pdf"
  locale="zh-CN"
  theme="light"
  toolbar-position="bottom-right"
  style="height: 720px"
></flyfish-file-viewer>
```

```ts
import { defineFileViewerElement } from '@file-viewer/web'
import officePreset from '@file-viewer/preset-office'

defineFileViewerElement()

const viewer = document.getElementById('viewer') as HTMLElement & {
  options: unknown
  zoomIn(): Promise<unknown>
  printRenderedHtml(): Promise<void>
}

viewer.options = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  toolbar: { position: 'bottom-right' }
}

viewer.addEventListener('viewer-event', event => {
  console.log((event as CustomEvent).detail.type)
})

viewer.zoomIn()
```

元素容器需要有明确高度，预览器会填满组件本身。

## 样式隔离与主题定制

`<flyfish-file-viewer>`、`@file-viewer/web-full` 和 IIFE 入口默认使用 Shadow DOM 隔离组件壳、工具栏和预览内容，适合宿主页面存在全局 reset、低代码样式、微前端样式串扰或旧后台 CSS 的场景。需要历史 light DOM 行为时，显式设置 `style-isolation="none"`：

```html
<flyfish-file-viewer
  src="/files/demo.pdf"
  style-isolation="none"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

推荐通过 CSS tokens 和 Shadow Parts 做受控定制：

```css
flyfish-file-viewer {
  --file-viewer-toolbar-bg: rgba(255, 255, 255, 0.96);
  --file-viewer-button-color: #154b83;
}

flyfish-file-viewer::part(toolbar) {
  border-radius: 999px;
}
```

完整隔离模式、tokens、parts 和 hostile CSS 验证方法见 [样式隔离与主题定制](/zh/guide/style-isolation)。

如果项目使用 Vite，可以再加入 `@file-viewer/vite-plugin`。插件会自动发现已安装的 `@file-viewer/preset-*` 并注入 renderer，Custom Element 和 `mountViewer` 都能直接获得对应格式能力，业务代码可以省去上面的 preset import。注意：只安装插件包不会让 Vite 自动运行，仍需要在 `vite.config.ts` 注册一次：

```bash
npm install -D @file-viewer/vite-plugin
```

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      copyAssets: true
    })
  ]
})
```

只安装 `@file-viewer/web` 是最轻的原生组件入口；PDF、Office、CAD、Typst、压缩包等具体格式能力请安装对应 preset 或 renderer。重度用户需要完整能力时，可以选择 full 包，也可以继续使用标准包 + `preset-all`：

```bash
npm install @file-viewer/web @file-viewer/preset-all
```

如果需要精确控制构建结果，Vite 插件再使用 `formats`、`renderers`、`scan:true`、`inject:false` 或 `chunkStrategy:'renderer'`；默认路径保持 `fileViewerRenderers({ copyAssets:true })`，插件会根据已安装 preset 自动激活能力。

## 命令式挂载

需要在非组件化脚本里动态创建、替换或销毁预览器时，可以直接使用 `mountViewer`。它返回完整 controller:

```ts
import { mountViewer } from '@file-viewer/web'
import officePreset from '@file-viewer/preset-office'

const controller = mountViewer(document.getElementById('viewer')!, {
  url: '/files/demo.pdf',
  options: {
    preset: officePreset,
    rendererMode: 'replace',
    theme: 'light',
    toolbar: { position: 'bottom-right' },
    archive: { cache: true, workerTimeoutMs: 30000 }
  },
  onEvent(event) {
    console.log(event.type, event.payload)
  }
})

controller.reload()
```

如果使用 full 包，命令式代码不需要再手动 import preset：

```ts
import { mountViewer } from '@file-viewer/web-full'

const controller = mountViewer(document.getElementById('viewer')!, {
  url: '/files/demo.dwg',
  options: {
    theme: 'light',
    toolbar: { position: 'bottom-right' }
  }
})

controller.zoomIn()
```

## 鉴权文件

业务系统可以先完成登录态、权限或签名校验，再把文件二进制交给预览器。传 `Blob` 或 `ArrayBuffer` 时请同时传 `name`:

```ts
const blob = await fetch('/api/files/contract', { credentials: 'include' }).then(res => res.blob())

const viewer = document.querySelector('flyfish-file-viewer')
viewer.file = blob
viewer.name = 'contract.pdf'
viewer.options = { theme: 'light' }
```

## 构建工具接入

Vite、Webpack、Rspack、Rollup 等构建工具可以直接使用 ESM 包入口。构建工具会负责解析 `@file-viewer/web`、Vue 和底层预览依赖:

```ts
import { defineFileViewerElement } from '@file-viewer/web'

defineFileViewerElement()
```

不要把 `dist/index.js` 复制到 public 后直接用浏览器加载。该入口保留了包依赖关系，面向构建工具和包管理器；无构建工具页面请使用下面的 IIFE 全局包。

## 通过普通 script 引入

IIFE 包会暴露 `window.FlyfishFileViewerWeb`:

```bash
cp ./node_modules/@file-viewer/web/dist/flyfish-file-viewer-web.iife.js ./public/vendor/file-viewer-web/flyfish-file-viewer-web.iife.js
```

```html
<script src="/vendor/file-viewer-web/flyfish-file-viewer-web.iife.js"></script>

<flyfish-file-viewer
  src="/files/demo.docx"
  filename="demo.docx"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

IIFE 会自动执行 `defineFileViewerElement()` 并暴露 `window.FlyfishFileViewerWeb`。如果你更喜欢命令式方式，仍然可以使用 `window.FlyfishFileViewerWeb.mountViewer(container, options)`。

### CDN full 完整能力

如果页面不使用构建工具，而且希望无需本地安装就快速接入完整格式矩阵，可以使用 `@file-viewer/web-full` 的 CDN 入口。jsDelivr / unpkg 会直接从 npm 分发完整 IIFE，它会暴露 `window.FlyfishFileViewerWebFull`。首包只加载组件壳和 lazy full preset，具体 PDF、Word、Excel、CAD、Typst、压缩包等 renderer 会在命中文件类型时异步加载 `dist/renderers/*.iife.js`，Worker、WASM、字体和 vendor 资源仍自动按脚本地址定位：

```html
<div id="viewer" style="height:720px"></div>

<script src="https://unpkg.com/@file-viewer/web-full@latest/dist/flyfish-file-viewer-web-full.iife.js"></script>
<script>
  FlyfishFileViewerWebFull.mountViewer(document.getElementById('viewer'), {
    url: '/files/demo.pdf',
    options: {
      theme: 'light',
      toolbar: { position: 'bottom-right' }
    }
  })
</script>
```

Custom Element 也可以直接使用同一个 CDN full 包：

```html
<script src="https://unpkg.com/@file-viewer/web-full@latest/dist/flyfish-file-viewer-web-full.iife.js"></script>
<flyfish-file-viewer
  src="/files/demo.xlsx"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

CDN full 适合 POC、传统后台和公网生产页面快速获得完整能力。内网、严格 CSP、完全离线或自有 Cloudflare/CDNJS 风格静态域场景，把 `@file-viewer/web-full/dist` 或 `file-viewer-copy-assets` 生成的资源整体同步到自己的 CDN。cdnjs.com 不会自动托管任意 npm 包，只有库被收录后才会有真实 cdnjs 路径。

## 自托管 Worker / WASM 资源

大多数业务只需要安装包即可。内网、CSP 严格、静态资源前缀特殊或希望固定重型资源路径时，建议把 viewer assets 复制到业务自己的静态目录:

```bash
# @file-viewer/web-full（已自带同版本 CLI）
npx --no-install file-viewer-copy-assets ./public/file-viewer

# 标准 @file-viewer/web 项目
npx --yes file-viewer-copy-assets ./public/file-viewer
```

入口构建或非 Vite npm 项目只运行与当前安装方式匹配的一条命令；完整 `web-full/dist/` 已包含同一份资产。复制命令会写入 `flyfish-viewer-assets.json`，并校验 PDF、archive、DOCX、Excel、PPTX、Draw.io、CAD、Typst、SQLite 等 worker/WASM/字体/vendor 静态资源是否齐全。预览运行时不会默认访问公共 CDN 或第三方在线资源；部署路径特殊时，可以在 `options.pdf.workerUrl`、`options.pdf.cMapUrl`、`options.pdf.wasmUrl`、`options.pdf.standardFontDataUrl`、`options.presentation.workerUrl`、`options.drawing.viewerScriptUrl`、`options.archive.workerUrl`、`options.archive.wasmUrl`、`options.docx.workerUrl`、`options.docx.workerJsZipUrl`、`options.spreadsheet.workerUrl`、`options.typst.compilerWasmUrl`、`options.typst.rendererWasmUrl`、`options.typst.fontAssetsUrl`、`options.data.sqlWasmUrl` 等参数中指定自托管地址。Draw.io 默认使用内置 SVG 安全预览；只有显式设置 `options.drawing.preferOfficial = true` 时才在受限 iframe 中加载单独分发的 diagrams.net 离线 viewer，`viewerScriptUrl` 必须是同源 HTTP(S) 地址。

## API

| API | 说明 |
| --- | --- |
| `<flyfish-file-viewer>` | 原生 Web Component，可用属性、property、事件和实例方法控制完整预览器 |
| `defineFileViewerElement(tagName?)` | 注册 Custom Element；IIFE 包会自动注册默认标签 |
| `mountViewer(container, options)` | 挂载预览器并返回 controller |
| `controller.update(options)` | 更新文件或运行参数 |
| `controller.reload()` | 重新加载当前文件 |
| `controller.destroy()` | 卸载预览器并释放资源 |
| `createViewerControllerHandle()` | 创建可复用的 controller handle，适合框架组件包封装 |

### Custom Element 属性和事件

| 类型 | 支持项 |
| --- | --- |
| HTML 属性 | `src` / `url`、`filename` / `name`、`type`、`size`、`locale`、`theme`、`toolbar`、`toolbar-position`、`watermark`、`search`、`options` |
| JS property | `url`、`file`、`buffer`、`name`、`filename`、`type`、`size`、`locale`、`options`、`coreOptions`、`source` |
| 原生事件 | `viewer-ready`、`viewer-event`、`viewer-state-change`、`viewer-error`，以及 `viewer-load-complete`、`viewer-search-change` 等按事件类型派发的细分事件 |
| 实例方法 | `load`、`update`、`reload`、`destroy`、`downloadOriginalFile`、`printRenderedHtml`、`exportRenderedHtml`、`zoomIn`、`zoomOut`、`resetZoom`、`searchDocument`、`nextSearchResult`、`previousSearchResult`、`collectDocumentAnchors`、`scrollToAnchor`、`scrollToLine`、`getDocumentTextChunks`、`getOperationAvailability`、`getZoomState`、`getSearchState`、`subscribe` |

`options` 与 Vanilla JS / Pure Web、Vue、React、jQuery、Svelte 标准组件包保持一致，支持主题、水印、搜索、统一缩放、下载、打印、导出 HTML、beforeOperation 前置校验、生命周期 hooks、压缩包缓存和格式专项参数。

### 国际化

Custom Element 可以直接使用 `locale` 属性，也可以通过 `options.locale`、`options.messages` 或 `options.i18n` 定制:

```html
<flyfish-file-viewer src="/files/report.pdf" locale="en-US"></flyfish-file-viewer>
```

```ts
viewer.locale = 'zh-CN'
viewer.options = {
  i18n: {
    locale: 'zh-CN',
    messages: {
      'toolbar.print': '打印文档'
    }
  }
}
```

## 常见问题

| 现象 | 处理方式 |
| --- | --- |
| 控制台提示裸包名无法解析 | 使用构建工具打包，或在无构建页面使用 IIFE 全局包 |
| 文件接口 401 | 由宿主页面先 `fetch` 成 `Blob`，再传 `file` + `name` |
| 压缩包或 CAD 卡在资源加载 | 运行 `file-viewer-copy-assets`，并检查 worker/WASM 的 MIME、CSP 和访问路径 |
| 页面空白 | 确认父容器有稳定高度，且传入文件带有可识别扩展名 |
