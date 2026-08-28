# 快速开始

<div class="doc-kicker">Get Running Fast</div>

<p class="doc-lead">
  如果你现在最想做的是“尽快看到效果”，这一页会先给最短可运行路径。
  先选生态组件，再按业务文件类型选择 preset 或 renderer；跑通后再进入按需装配、离线资源和工具栏定制。
</p>

## 五步接入

| 步骤 | 做什么 | 最短答案 |
| --- | --- | --- |
| 1 | 选生态组件 | 最轻入口用 `@file-viewer/web` / `@file-viewer/vue3` / `@file-viewer/react` 等标准包；一步到位用 `@file-viewer/web-full` / `@file-viewer/vue3-full` / `@file-viewer/react-full` 等 full 包 |
| 2 | 选格式能力 | 标准包按需注入 `preset-lite`、`preset-office`、`preset-engineering` 或 `preset-all`；Full 包默认启用已发布兼容矩阵，DICOM、数字签名等后续专业 renderer 仍显式安装 |
| 3 | 发布运行时资产 | full 包在 Vite 中使用 `copyAssets:true`；其它构建工具运行 `npx --no-install file-viewer-copy-assets ./public/file-viewer`，保证 Worker / WASM 格式完整可用 |
| 4 | 传入文件和 options | `url="/files/demo.pdf"` 或 `file={file}`，标准包把 `preset` 放进 `options`，full 包可直接传主题、工具栏、水印等业务配置 |
| 5 | 确认样式隔离 | 宿主 CSS 不可控时优先 Web Component / full 默认 Shadow DOM；框架组件可传 `options.styleIsolation:'shadow'` |

本页只保留最短可运行路径。完整 options、renderer 包清单和工具栏/水印/打印/搜索等参数见 [组件用法](/zh/guide/usage)，样式隔离与主题定制见 [样式隔离与主题定制](/zh/guide/style-isolation)，按需装配和 Vite 插件细节见 [模块化与按需装配](/zh/guide/on-demand-renderers)。

## 先选接入路线

| 方案 | 适合谁 | 优点 | 你应该看哪页 |
| --- | --- | --- | --- |
| 纯 JS 集成 | 非框架页面、微前端壳、任意 Web 系统 | `<flyfish-file-viewer>` 原生组件，也可用 `mountViewer` 命令式挂载 | [纯 JS 集成](/zh/guide/quickstart-web) |
| Vue3 组件集成 | Vue 3 项目 | 主推组件体验，完整渲染能力直接进入 Vue 应用 | [Vue3 集成](/zh/guide/quickstart-vue3) |
| Vue2 组件集成 | Vue2.7 / Vue2.6 项目 | 保留旧业务栈，体验与 Vue3 一致 | [Vue2 集成](/zh/guide/quickstart-vue2) |
| React 组件集成 | React 16.8 / 17 / 18 / 19 项目 | 原生 React 组件，props、事件和 ref 都能直接调试 | [React 集成](/zh/guide/quickstart-react) |
| jQuery / Svelte | 老后台、SvelteKit 或轻量页面 | 独立标准组件包，复用同一套 core 和 options | [生态组件总览](/zh/guide/ecosystem) |
| Core / PPT / PPTX 引擎 | 自研组件、深度二开、单独验证演示文稿链路 | framework-neutral 能力与彼此隔离的二进制 PPT、PPTX renderer 包 | [生态组件总览](/zh/guide/ecosystem) |

<div class="doc-callout">
  <strong>推荐经验:</strong> 先用标准组件包和一个明确的 preset 跑通业务文件，例如 Vue3 + preset-office；确认格式范围后，再收敛到 preset-lite、单 renderer，或扩展到 preset-engineering / preset-all。core 负责底层预览能力和 API，各生态组件负责原生接入体验。
</div>

<div class="doc-callout">
  <strong>移动端提示:</strong> H5 / 手机浏览器场景请给预览容器设置明确高度，例如 <code>height:100dvh; min-height:0</code>，工具栏建议使用 <code>toolbar.position:'bottom-right'</code>。React Native 请通过 WebView 承载 H5 预览页，DOM 版组件不能直接挂在原生 RN 视图中。详细示例见 <a href="/zh/guide/quickstart-react#移动端--h5--react-native-webview">React 移动端接入</a>。
</div>

## 先理解安装边界

直接安装 `@file-viewer/vue3`、`@file-viewer/react`、`@file-viewer/web` 这类标准组件包是最轻的接入方式，它们只提供当前框架的原生组件、类型、controller 和 core 基础能力，不会默认把 PDF、Office、CAD、Typst、压缩包等重型渲染依赖全部装进业务项目。

如果你的目标是完整验收所有格式，可以使用 full 包。full 包已内置 `@file-viewer/preset-all`，不要重复安装或传入 preset。npm 项目的完整格式支持还包括同版本 Worker、WASM、字体和 vendor 资源：Vite 自动发布，其他构建工具运行每个 full 包自带的同版本复制 CLI。CDN / script 标签场景优先使用 `@file-viewer/web-full`；直接使用 jsDelivr / unpkg，或完整镜像整个 `dist/` 目录时，脚本会按自身 URL 定位所有资源，无需复制。

| 模式 | 安装示例 | 特点 |
| --- | --- | --- |
| 最轻标准包 | `npm i @file-viewer/vue3 @file-viewer/preset-office` | 按业务选择 preset / renderer，安装体积最可控 |
| 完整 full 包 | `npm i @file-viewer/vue3-full` | 内置 `preset-all`；再按构建工具把运行时资产发布到 `<部署基址>/file-viewer/` |
| CDN full | `https://unpkg.com/@file-viewer/web-full@latest/dist/flyfish-file-viewer-web-full.iife.js` | 无需本地安装，适合传统页面快速试跑完整矩阵 |

需要预览具体文件格式时，再选择一个 preset 或单独 renderer:

| 能力包 | 覆盖范围 | 推荐场景 |
| --- | --- | --- |
| `@file-viewer/preset-lite` | 文本、Markdown、代码、图片、音频、视频 | 常见轻附件、IM / 工单附件 |
| `@file-viewer/preset-office` | PDF、Word、Excel、PowerPoint、OFD、RTF、OpenDocument | OA、审批、知识库、合同归档 |
| `@file-viewer/preset-engineering` | CAD、3D、绘图、XMind、Geo、Typst、Archive、Data、EDA | 工程图纸、研发附件、设计资产 |
| `@file-viewer/preset-all` | 官方 Demo 的完整格式矩阵 | 演示站、内部全格式附件中心 |
| 单个 renderer | 例如 `@file-viewer/renderer-pdf`、`@file-viewer/renderer-word` | 只需要少数格式、追求最小依赖 |

最稳定的通用接入方式是显式 import preset 或 renderer，并通过 `options.preset` / `options.renderers` 注入给组件。这个方案不依赖 Vite，适用于 Webpack、Rspack、Rollup、Umi、传统多页应用、微前端壳和内部组件库。Vite 项目可以再使用 `@file-viewer/vite-plugin` 省去手动 import，并自动复制离线资源。

### 通用方案：options.preset 注入

安装当前生态组件包和一个 preset：

```bash
pnpm add @file-viewer/vue3 @file-viewer/preset-office
```

```ts
import officePreset from '@file-viewer/preset-office'

export const viewerOptions = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  toolbar: { position: 'bottom-right' }
}
```

组件层只需要传同一份 options：

```vue
<file-viewer url="/files/demo.docx" :options="viewerOptions" />
```

多个能力包直接组合到同一个 `preset` 字段，不需要再学习第二个 options 名称：

```ts
import officePreset from '@file-viewer/preset-office'
import engineeringPreset from '@file-viewer/preset-engineering'

export const viewerOptions = {
  preset: [officePreset, engineeringPreset],
  rendererMode: 'replace'
}
```

只需要少数格式时，跳过 preset，直接安装单 renderer：

```bash
pnpm add @file-viewer/vue3 @file-viewer/renderer-pdf
```

```ts
import { pdfRenderer } from '@file-viewer/renderer-pdf'

export const viewerOptions = {
  renderers: [pdfRenderer],
  rendererMode: 'replace'
}
```

如果打开的是支持矩阵内但未装配的格式，预览器会给出应该安装哪个 preset / renderer 的提示；只有真正不在矩阵中的扩展名才提示不支持。

### 一步到位：full 包

full 包适合希望先获得完整格式体验、再按业务优化体积的团队。它们与标准包暴露同样的 props、事件、controller 和 options，已内置并默认启用 `preset-all`，不要再安装其它 preset：

| 生态 | full 包 | 标准包 |
| --- | --- | --- |
| Vanilla JS / Web Component | `@file-viewer/web-full` | `@file-viewer/web` |
| Vue 3 | `@file-viewer/vue3-full` | `@file-viewer/vue3` |
| Vue 2.7 | `@file-viewer/vue2.7-full` | `@file-viewer/vue2.7` |
| Vue 2.6 | `@file-viewer/vue2.6-full` | `@file-viewer/vue2.6` |
| React 18 / 19 | `@file-viewer/react-full` | `@file-viewer/react` |
| React 16.8 / 17 | `@file-viewer/react-legacy-full` | `@file-viewer/react-legacy` |
| jQuery | `@file-viewer/jquery-full` | `@file-viewer/jquery` |
| Svelte | `@file-viewer/svelte-full` | `@file-viewer/svelte` |

```bash
npm install @file-viewer/vue3-full
```

```vue
<script setup lang="ts">
import { FileViewer } from '@file-viewer/vue3-full'
</script>

<template>
  <FileViewer url="/files/contract.pdf" :options="{ theme: 'light' }" />
</template>
```

各框架继续使用自己的原生接入 API，不能照搬 Vue 组件写法：

```ts
// Vue 2.7；Vue 2.6 改用 @file-viewer/vue2.6-full。
import Vue from 'vue'
import FileViewerPlugin from '@file-viewer/vue2.7-full'
Vue.use(FileViewerPlugin)
```

```tsx
import FileViewer from '@file-viewer/react-full'
export const Preview = () => <FileViewer url="/files/contract.pdf" />
```

```svelte
<script>
  import FileViewer from '@file-viewer/svelte-full'
</script>
<FileViewer url="/files/contract.pdf" />
```

```ts
import $ from 'jquery'
import installFileViewer from '@file-viewer/jquery-full'
installFileViewer($)
$('#viewer').fileViewer({ url: '/files/contract.pdf' })
```

所有 full 包默认把运行时资产根设为部署基址下的 `file-viewer/`（根部署即 `/file-viewer/`），并自动补齐 Archive、PDF、DOCX、Excel、二进制 PPT、PPTX、CAD、Typst、Draw.io 和 SQLite 等资源 URL。Vite 项目注册下面的插件即可在开发与生产构建中自动发布完整资源：

```ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default {
  plugins: [fileViewerRenderers({ copyAssets: true })]
}
```

Webpack、Rspack、Rollup、Vue CLI、Umi 和传统多页项目运行 full 包自带的同版本 CLI：

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer
```

`web-full` 的完整 `dist/` 已携带 assets，可直接部署而不运行上述命令；只提取入口模块时运行随包 CLI。

缺少部署基址下的 `file-viewer/` 时，轻量格式和少数兼容路径可能仍能使用，但 CAD、Typst、RAR/7z/加密压缩包、Draw.io、SQLite、PDF CMap/字体等不能保证完整，因此不属于 full 包的完整格式支持。

如果你的静态目录不是 `/file-viewer/`，在应用启动前改一次默认 base 即可：

```ts
import { setDefaultFullAssetBaseUrl } from '@file-viewer/vue3-full'

setDefaultFullAssetBaseUrl('/static/file-viewer/')
```

显式传入的 `options.archive.workerUrl`、`options.pdf.workerUrl` 等仍然优先级更高，方便灰度或多租户静态路径覆盖。

### CDN full：完整能力快速试跑

无构建工具或临时验证页面可以直接使用 CDN full 包。直接使用 jsDelivr / unpkg，或把整个 `dist/` 目录原样部署到同一静态前缀时，无需执行资产复制；只复制入口 IIFE 文件不属于完整部署。

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

也可以使用原生组件写法：

```html
<script src="https://unpkg.com/@file-viewer/web-full@latest/dist/flyfish-file-viewer-web-full.iife.js"></script>
<flyfish-file-viewer
  src="/files/demo.docx"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

### Vite 插件：免配置自动装配

Vite 项目可以在通用方案基础上安装并注册插件。标准组件包同时安装一个 `@file-viewer/preset-*`；full 包已内置 `preset-all`，无需再装。注册 `fileViewerRenderers({ copyAssets:true })` 后，插件会识别已安装的 full / preset；full 包资源发布到 `<部署基址>/file-viewer/`，标准包/preset 保持原有根目录行为。业务代码无需再次 import preset：

```bash
pnpm add @file-viewer/vue3 @file-viewer/preset-office
pnpm add -D @file-viewer/vite-plugin
```

```ts
// vite.config.ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default {
  plugins: [
    fileViewerRenderers({
      copyAssets: true
      // 无需 preset:'office'，插件会自动发现已安装的 @file-viewer/preset-office。
    })
  ]
}
```

需要最快拥有全部能力时，也可以直接改用 full 包，不再安装 preset：

```bash
pnpm add @file-viewer/vue3-full
pnpm add -D @file-viewer/vite-plugin
```

需要自定义时再显式配置：

| 选项 | 适合场景 |
| --- | --- |
| `copyAssets:true` | 自动识别 full / preset；full 包在开发和生产构建中发布到 `<部署基址>/file-viewer/`，标准包/preset 保持原有根目录行为；full 包必须开启 |
| `formats` / `renderers` | 不使用 preset、或在 preset 外补充少数格式时，生成精确 renderer import |
| `scan:true` | 让插件扫描 `fileViewerFormats`、`data-file-viewer-formats`、上传 `accept` 等源码 hint |
| `preset:'auto'` / `autoPresets:true` | 开启 `scan:true` 时仍保持“根据已安装 preset 自动激活能力” |
| `inject:false` | 关闭自动注入，改为手动导入 `virtual:file-viewer-renderers` 并传给 `options.renderers` |
| `chunkStrategy:'renderer'` | 按 renderer 拆分 chunk，方便缓存、排查和分析重型格式体积 |

默认推荐路径是 `fileViewerRenderers({ copyAssets:true })`。只有需要极致裁剪、源码扫描或严格 registry 管理时，才需要显式配置上面的选项。

## 运行环境

- Node.js `>= 18`
- 纯 JS、React、Vue2 / Vue3 项目都可以使用 npm、pnpm、yarn 或业务项目已有包管理器
- 浏览器需要支持现代前端能力，建议优先在最新版 Chrome 或 Edge 中联调

## 语言与文案

组件默认 `locale: 'auto'`，会根据浏览器语言在中文和英文之间自动选择。需要固定语言或覆盖文案时，直接通过同一套 `options` 传入:

```ts
const options = {
  locale: 'en-US',
  messages: {
    'toolbar.download': 'Save file'
  }
}
```

也可以使用分组写法:

```ts
const options = {
  i18n: {
    locale: 'zh-CN',
    messages(key, params, locale) {
      return key === 'state.empty.title' ? '请选择文件' : undefined
    }
  }
}
```

`locale`、`messages` 和 `i18n` 在 Vanilla JS / Pure Web、Vue、React、jQuery、Svelte 标准组件包中保持一致。

完整 `FileViewerMessageKey` 对照可以直接从 core 的内置消息表读取。这个对象和运行时使用同一份文案源，适合生成业务覆盖清单、翻译表或测试断言:

```ts
import {
  FILE_VIEWER_BUILTIN_MESSAGES,
  type FileViewerMessageKey
} from '@file-viewer/core'

const rows: Array<{
  key: FileViewerMessageKey
  zhCN: string
  enUS: string
}> = Object.keys(FILE_VIEWER_BUILTIN_MESSAGES['zh-CN']).map(key => ({
  key: key as FileViewerMessageKey,
  zhCN: FILE_VIEWER_BUILTIN_MESSAGES['zh-CN'][key as FileViewerMessageKey],
  enUS: FILE_VIEWER_BUILTIN_MESSAGES['en-US'][key as FileViewerMessageKey]
}))
```

`messages` 只需要覆盖你关心的 key；未覆盖的文案会继续使用当前 `locale` 的内置翻译。加载态、错误态、内置工具栏、PDF / Office / OFD / 压缩包等标准 renderer 的用户可见文案都走同一个 `options.locale` / `options.i18n` 链路。

## 纯 JS 最短路径

```bash
npm install @file-viewer/web @file-viewer/preset-office
```

```html
<flyfish-file-viewer
  src="/files/demo.pdf"
  locale="zh-CN"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:100vh"
></flyfish-file-viewer>

<script type="module">
  import { defineFileViewerElement } from '@file-viewer/web'
  import officePreset from '@file-viewer/preset-office'

  defineFileViewerElement()

  const viewer = document.querySelector('flyfish-file-viewer')
  viewer.options = {
    preset: officePreset,
    rendererMode: 'replace'
  }
</script>
```

传统后台页面或无构建工具项目请使用 IIFE 全局包接入；详细示例见 [纯 JS 集成](/zh/guide/quickstart-web)。

## Vue3 最短路径

```bash
pnpm add @file-viewer/vue3 @file-viewer/preset-office
```

```ts
import { createApp } from 'vue'
import App from './App.vue'
import FileViewer from '@file-viewer/vue3'

createApp(App).use(FileViewer).mount('#app')
```

```vue
<script setup lang="ts">
import officePreset from '@file-viewer/preset-office'

const options = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  toolbar: { position: 'bottom-right' },
  watermark: { text: '内部预览', opacity: 0.14 }
}
</script>

<template>
  <div style="height: 100vh">
    <file-viewer url="/files/demo.docx" :options="options" />
  </div>
</template>
```

## Vue2 最短路径

Vue2.7 项目优先使用 `@file-viewer/vue2.7`，能力与 Vue3 包保持一致，入口会自动带上样式:

```bash
pnpm add @file-viewer/vue2.7 @file-viewer/preset-office
```

```ts
import Vue from 'vue'
import App from './App.vue'
import FileViewer from '@file-viewer/vue2.7'

Vue.use(FileViewer)

new Vue({
  render: h => h(App)
}).$mount('#app')
```

Vue2.6 老项目使用 `@file-viewer/vue2.6`。完整步骤见 [Vue2 集成](/zh/guide/quickstart-vue2)。

## React 最短路径

```bash
npm install @file-viewer/react @file-viewer/preset-office
```

```tsx
import FileViewer from '@file-viewer/react'
import officePreset from '@file-viewer/preset-office'

export function Preview() {
  return (
    <div style={{ height: '100vh' }}>
      <FileViewer
        url="/files/demo.docx"
        options={{
          preset: officePreset,
          rendererMode: 'replace',
          theme: 'light',
          toolbar: { position: 'bottom-right' }
        }}
      />
    </div>
  )
}
```

完整步骤见 [React 集成](/zh/guide/quickstart-react)。

## 零依赖集成：官方 Demo iframe

如果客户系统只需要“能预览”，不希望安装 npm 包或改构建链路，可以直接使用官方 Demo 构建产物。下载 GitHub Release 中的 `file-viewer-v2-*-official-demo-iframe.tar.gz`，解压到一个静态目录，例如 `/file-viewer/`，保持 `assets/`、`vendor/`、`wasm/` 和 `example/` 不要拆开。

最简单的 URL 文件预览:

```html
<iframe
  src="/file-viewer/iframe.html?url=/files/demo.docx"
  style="width:100%;height:720px;border:0"
  allow="fullscreen"
></iframe>
```

如果文件只能由父页面鉴权接口取回，父页面拿到 `Blob` 后再传给 Demo:

```html
<input id="file" type="file">
<iframe id="viewer" style="width:100%;height:720px;border:0"></iframe>

<script>
  const viewer = document.querySelector('#viewer')

  function openFile(file) {
    const src = new URL('/file-viewer/iframe.html', location.origin)
    src.searchParams.set('from', location.origin)
    src.searchParams.set('name', file.name)
    viewer.src = src
    viewer.addEventListener('load', () => {
      viewer.contentWindow.postMessage(file, src.origin)
    }, { once: true })
  }

  document.querySelector('#file').addEventListener('change', event => {
    const file = event.target.files && event.target.files[0]
    if (file) openFile(file)
  })
</script>
```

`from` 必须等于父页面 origin，Demo 只接受该来源发来的 `Blob`。推荐使用 `/iframe.html` 作为无外壳入口，支持 clean URL 的静态平台也可以写成 `/iframe`；原主 Demo `/index.html` 也保留同一套 `url`、`from`、`name` 和 `postMessage(Blob)` 协议，用于兼容已有客户集成。

## 下一步建议

- 想了解 Demo 中每个示例文件的作用: 看 [Demo 说明](/zh/guide/demo)
- 想查看 Vanilla JS / Pure Web、Vue3、Vue2、React、jQuery、Svelte、Core、PPT 与 PPTX 引擎的完整包矩阵: 看 [生态组件总览](/zh/guide/ecosystem)
- 想明确 `file`、`url`、水印、工具栏、压缩包缓存和导出的参数行为: 看 [组件用法](/zh/guide/usage)
- 准备做本地验证和打包: 看 [本地开发与打包](/zh/guide/development)
- 想下载公开源码、成品或了解优先支持: 看 [发布与开源分发](/zh/guide/distribution)

### 日语语言

使用 `locale: 'ja-JP'` 可固定为日语。默认的 `auto` 模式会按顺序检查完整的 `navigator.languages` 语言偏好列表，并识别 `ja`、`ja-JP` 等日语标签；浏览器语言均不受支持时回退到英文。
