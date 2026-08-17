# 生态组件总览

<div class="doc-kicker">Native Ecosystem Packages</div>

<p class="doc-lead">
  File Viewer by Flyfish 的 2.x 架构把底层预览能力、重型渲染引擎和各框架组件拆清楚了。
  新项目优先选择 <code>@file-viewer/*</code> 标准包名；历史 <code>@flyfish-group/*</code> 包名仍同步维护，用于平滑升级旧项目。
  生态目标是让每个技术栈都有原生接入体验，同时通过 preset 或 renderer 明确控制格式能力和安装边界。
  当前源码共维护 57 个 npm 发布目标，共享 221 个已注册扩展名、32 条预览链路的一份能力矩阵；其中 221 个稳定、0 个实验。
</p>

## 导览

| 技术栈 / 场景 | 推荐入口 |
| --- | --- |
| 无框架页面、微前端壳、script 标签 | [纯 JS / Pure Web 集成](/zh/guide/quickstart-web) |
| Vue 3 项目 | [Vue3 集成](/zh/guide/quickstart-vue3) |
| Vue 2.7 / 2.6 项目 | [Vue2.7 / 2.6 集成](/zh/guide/quickstart-vue2) |
| React 18 / 19 项目 | [React 集成](/zh/guide/quickstart-react) |
| React 16.8 / 17 老项目 | [React Legacy 集成](#react-legacy) |
| 传统 jQuery 后台 | [jQuery 集成](#jquery) |
| Svelte / SvelteKit 项目 | [Svelte 集成](#svelte) |
| 自研组件或深度二开 | [Core 自定义接入](#core) |
| 单独验证 PPT / PPTX 渲染能力 | [PPT 与 PPTX 引擎接入](#ppt-与-pptx-引擎接入) |

## 安装策略

标准组件包是最轻入口。直接安装 `@file-viewer/vue3`、`@file-viewer/react`、`@file-viewer/web`、`@file-viewer/svelte`、`@file-viewer/jquery` 或 Vue2 组件包时，只会获得对应生态的原生组件体验、类型声明、controller 和 core 基础能力；具体格式能力由 preset 或单个 renderer 装配。

| 策略 | 安装方式 | 说明 |
| --- | --- | --- |
| 最轻组件入口 | `npm i @file-viewer/vue3` | 适合先接入组件壳、再按业务选择格式能力 |
| 常见轻附件 | `npm i @file-viewer/vue3 @file-viewer/preset-lite` | 文本、Markdown、代码、图片、音频、视频，通过 `options.preset` 注入 |
| 办公文档平台 | `npm i @file-viewer/vue3 @file-viewer/preset-office` | PDF、Word、Excel、PowerPoint、OFD、RTF、OpenDocument，推荐业务默认路线 |
| 工程附件平台 | `npm i @file-viewer/vue3 @file-viewer/preset-engineering` | CAD、3D、绘图、XMind、Geo、Typst、Archive、Data、EDA |
| 完整 Demo 能力 | `npm i @file-viewer/vue3 @file-viewer/preset-all` | 全量一键安装，适合演示站、后台运维和内部全格式附件中心 |
| 完整 full 包 | `npm i @file-viewer/vue3-full` | 默认启用 `preset-all`，不需要手动传 `options.preset` |
| CDN 完整体验 | `https://unpkg.com/@file-viewer/web-full@latest/dist/flyfish-file-viewer-web-full.iife.js` | 适合 script 标签试跑；二进制 `.ppt` 从包内 `vendor/ppt/` 自动加载，无需配置运行时 URL |
| 极致裁剪 | `npm i @file-viewer/vue3 @file-viewer/renderer-pdf` | 只安装需要的 renderer，并通过 `options.renderers` 注入 |

## Full 包完整资产契约

从 `2.1.30` 起，八个 Full 包使用同一套交付契约。它们已内置并启用 `preset-all`，同时携带版本对齐的 renderer、Worker、WASM、字体、Draw.io、SQLite 等 vendor 资产；Vite 或随包 CLI 会把这份包内资产发布到业务自己的静态源。当前标准布局同时包含经过完整性校验的二进制 `.ppt` 0.3.3 公开运行时，以及按需加载的 EPUB 本地引擎和对应 NOTICE；两条链路都不需要运行时 CDN。

| 构建方式 | 完整部署方式 |
| --- | --- |
| Vite | 注册 `fileViewerRenderers({ copyAssets:true })`；插件会识别已安装的 Full 包，并在 dev/build 自动提供、复制全部资产 |
| Webpack、Vue CLI、Rspack、Rollup、Umi 等 | 运行 `npx --no-install file-viewer-copy-assets ./public/file-viewer`；Full 包已带同版本 CLI |
| script 标签 / CDN | 直接使用 jsDelivr/unpkg，或完整部署 `@file-viewer/web-full/dist/`；无需复制 |

Full 包旁边不要再安装另一个 `preset-all` 或不同版本的资产复制工具。所有 Full 包默认访问部署基址下的 `file-viewer/`；只有静态目录不同才调用 `setDefaultFullAssetBaseUrl('/your-prefix/')`。

`options.preset` 是跨构建工具的稳定装配方式。Webpack、Rspack、Rollup、Umi、传统多页应用、微前端壳和内部组件库都可以显式 import preset，然后传给当前生态组件:

```ts
import officePreset from '@file-viewer/preset-office'

const viewerOptions = {
  preset: officePreset,
  rendererMode: 'replace'
}
```

Vite 项目可以额外安装 `@file-viewer/vite-plugin` 省去手动 import。Vite 不会因为安装了插件包就自动运行，仍需要在 `vite.config.ts` 注册一次；注册后 `fileViewerRenderers()` 或 `fileViewerRenderers({ copyAssets:true })` 会自动发现已安装的 `@file-viewer/preset-*`，并把生成的 virtual module 注入 Vite HTML 入口。组件默认 `autoRenderers:true`，所以 Vue、React、Svelte、jQuery 和 Vanilla JS / Pure Web 都能直接获得对应预览能力。`preset-all` 能力最完整，但安装依赖也最多；生产业务建议优先选择 `preset-lite`、`preset-office`、`preset-engineering` 或单个 renderer。

```ts
// vite.config.ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default {
  plugins: [
    fileViewerRenderers({
      copyAssets: true
      // 已安装的 preset 会自动激活，不需要手写 import 或 renderers。
    })
  ]
}
```

## 选型一览

| 场景 | 推荐包 | 适合项目 | 入口能力 |
| --- | --- | --- | --- |
| 底层能力 | `@file-viewer/core` | 自研组件、二次封装、框架适配 | 纯 TypeScript 预览能力、格式矩阵、事件、搜索、缩放、打印、导出和共享类型 |
| 二进制 PPT 运行时 | `@file-viewer/ppt@0.3.3` | 单独验证 PowerPoint 97–2003 `.ppt` | 独立版本依赖；Full/CDN 在 `vendor/ppt/` 交付公开运行时，与 PPTX Worker 严格分路 |
| PPTX 引擎 | `@file-viewer/pptx` | 单独优化或验证 PPTX 渲染 | 独立 OpenXML 演示文稿引擎、Worker 渐进解析和样式文件 |
| 轻量 preset | `@file-viewer/preset-lite` | 常见轻附件预览 | 文本、Markdown、代码、图片、音频和视频的轻量组合 |
| 文档 preset | `@file-viewer/preset-office` | PDF / Office / OFD 文档平台 | PDF、Word、Excel、PowerPoint、OFD、RTF 和 OpenDocument |
| 工程 preset | `@file-viewer/preset-engineering` | CAD、研发、设计、工程和 EDA 附件平台 | CAD、3D、绘图、XMind、Geo、Typst、Archive、Data 和 EDA |
| 全量 preset | `@file-viewer/preset-all` | 官方 Demo、内部全格式附件中心 | 当前完整格式矩阵 |
| Word renderer | `@file-viewer/renderer-word` | 只需要 DOCX/DOC/RTF/ODT 的业务 | 标准 renderer 插件，按需加载自研 DOCX、老 DOC 和 RTF/OpenDocument 链路 |
| Vanilla JS / Pure Web | `@file-viewer/web` | 无框架页面、微前端壳、传统系统 | `<flyfish-file-viewer>` 原生组件、`mountViewer(container, options)`、IIFE script 标签包、资源复制 CLI |
| Vanilla JS / Pure Web Full | `@file-viewer/web-full` | script 标签、POC、全格式传统页面 | 默认启用完整矩阵的 Custom Element、IIFE 和命令式挂载 |
| Vue 3 | `@file-viewer/vue3` | Vue 3.3+ | Vue 插件、`<file-viewer>` 组件、props、事件、ref/controller 和完整类型 |
| Vue 3 Full | `@file-viewer/vue3-full` | Vue 3 全格式附件中心 | 默认启用完整矩阵，组件 API 与 `@file-viewer/vue3` 一致 |
| Vue 2.7 | `@file-viewer/vue2.7` | Vue 2.7 项目 | `Vue.use(FileViewer)` 插件式注册，能力与 Vue 3 线保持一致 |
| Vue 2.7 Full | `@file-viewer/vue2.7-full` | Vue 2.7 全格式附件中心 | 默认启用完整矩阵，适合存量 Vue2.7 项目快速升级 |
| Vue 2.6 | `@file-viewer/vue2.6` | 仍停留在 Vue 2.6 的老项目 | Vue 2.6 专线，避免强迫业务升级到 2.7 |
| Vue 2.6 Full | `@file-viewer/vue2.6-full` | Vue 2.6 全格式附件中心 | 默认启用完整矩阵 |
| React 18/19 | `@file-viewer/react` | React 18 / 19，也兼容 React 17 | 原生 React 组件、`useFileViewer`、`useFileViewerState` 和 ref handle |
| React 18/19 Full | `@file-viewer/react-full` | React 全格式附件中心 | 默认启用完整矩阵，组件和 hooks 体验与标准包一致 |
| React 16.8/17 | `@file-viewer/react-legacy` | 旧 React hooks 项目 | 面向 React 16.8 / 17 的独立组件包 |
| React 16.8/17 Full | `@file-viewer/react-legacy-full` | 旧 React 全格式附件中心 | 默认启用完整矩阵 |
| jQuery | `@file-viewer/jquery` | 传统后台、jQuery 插件体系 | `$(el).fileViewer(options)` 和插件方法调用 |
| jQuery Full | `@file-viewer/jquery-full` | 传统后台全格式附件中心 | 默认启用完整矩阵 |
| Svelte | `@file-viewer/svelte` | Svelte / SvelteKit | Svelte 组件、action、事件和 controller 方法 |
| Svelte Full | `@file-viewer/svelte-full` | Svelte 全格式附件中心 | 默认启用完整矩阵，组件与 action 入口保持一致 |

历史兼容包继续发布: `@flyfish-group/file-viewer3`、`file-viewer3`、`@flyfish-group/file-viewer`、`@flyfish-group/file-viewer-react`、`@flyfish-group/file-viewer-web`。新系统建议使用标准包名，便于理解依赖边界和后续迁移。

## 架构边界

- `@file-viewer/core` 是 framework-neutral 底座，不依赖 Vue、React、Svelte 或 jQuery。
- 各标准组件包只依赖 core 和自己的生态依赖，不嵌套其他框架实现。
- 所有组件包共享同一套 `ViewerMountOptions`、`FileViewerOptions`、生命周期事件、操作回调、搜索、缩放、水印、打印和导出语义。
- Office、PDF、OFD、Typst、CAD、压缩包、邮件、3D、绘图、数据文件等重型链路按格式异步加载，未命中的格式不会进入首屏。常见业务优先选 `preset-lite`、`preset-office`、`preset-engineering`，极致裁剪再安装单个 renderer。
- 私有化或内网部署时，运行 `file-viewer-copy-assets` 复制 Worker、WASM、PDF.js、Draw.io、Typst WASM/字体、CAD、SQLite、压缩包和 Office 静态资源，运行时默认不依赖公共 CDN。
- 样式隔离由同一套 `options.styleIsolation` 控制。所有标准组件默认使用 Shadow DOM，避免宿主全局 CSS 破坏预览器；主题定制使用 `--file-viewer-*` tokens 和 `::part()`，仅旧版深层样式覆盖场景显式使用 `styleIsolation:'none'`。完整说明见 [样式隔离与主题定制](/zh/guide/style-isolation)。

## 组件属性与定制入口

下面是各标准组件包当前实际暴露的属性、事件和控制入口。需要 `buffer`、`name`、`type`、`size` 这类命令式挂载参数时，优先使用 Vanilla JS / Pure Web、React、Svelte、jQuery 或 Vue2 组件；Vue3 声明式组件保持 `url` / `file` / `options` 的轻入口，二进制来源建议包装成带扩展名的 `File` 后传入。

| 组件 | 实际属性 / 入口 | 事件入口 | 控制与定制入口 |
| --- | --- | --- | --- |
| Vanilla JS / Pure Web `@file-viewer/web` | `<flyfish-file-viewer>` 属性 `src/url`、`filename/name`、`type`、`size`、`theme`、`toolbar`、`toolbar-position`、`watermark`、`search`、`options`；也支持 `mountViewer(...)` | `viewer-ready`、`viewer-event`、`viewer-state-change`、`viewer-error`、`onEvent`、`onStateChange`、`controller.subscribe()` | Custom Element 实例暴露完整 controller handle；IIFE script 标签自动注册元素，同时保留命令式挂载和资源复制 CLI |
| Vue 3 `@file-viewer/vue3` | `url`、`file`、`options` | `load-start`、`load-complete`、`unload-start`、`unload-complete`、`operation-before`、`operation-cancel`、`operation-availability-change`、`search-change`、`location-change`、`zoom-change` | 模板 `ref` 暴露 `FileViewerExpose`，可调用下载、打印、导出、缩放、搜索、定位和文本切片 API |
| Vue 2.7 `@file-viewer/vue2.7` | `url`、`file`、`buffer`、`name`、`filename`、`type`、`size`、`options`、`containerClass`、`containerStyle` | `viewer-event` / `viewerEvent` | 组件实例暴露 controller handle 全量方法 |
| Vue 2.6 `@file-viewer/vue2.6` | 同 Vue 2.7 | `viewer-event` / `viewerEvent` | 独立 Vue 2.6 构建，不要求业务升级到 Vue 2.7 |
| React `@file-viewer/react` | `ViewerMountOptions` + `div` 原生属性，如 `className`、`style`、`data-*`、`aria-*` | `onEvent`、`onStateChange` | `ref` 暴露 `FileViewerHandle`；`useFileViewer()` 返回 `ref`、`props`、`state`、`handle` |
| React Legacy `@file-viewer/react-legacy` | 同 React 标准包 | `onEvent`、`onStateChange` | 面向 React 16.8 / 17 的独立组件包 |
| jQuery `@file-viewer/jquery` | `$(el).fileViewer(ViewerMountOptions & { replace?: boolean })` | `onEvent`、`onStateChange` 或 `getFileViewerController(el).subscribe()` | 插件方法支持 `zoomIn`、`printRenderedHtml`、`searchDocument` 等；`replace:false` 可原地更新 |
| Svelte `@file-viewer/svelte` | `ViewerMountOptions` + `className`、`containerStyle` | `on:viewerEvent`、`onEvent`、`onStateChange` | `bind:this` 暴露 controller handle；`use:fileViewer` action 额外支持 `replace` |

## 工具栏定制

内置工具栏适合大多数后台和附件中心场景；如果业务需要权限按钮、审计提示、设计系统菜单或移动端悬浮操作区，可以关闭内置工具栏，改用各生态原生 UI 调用同一套 controller API。

| 配置 | 说明 |
| --- | --- |
| `toolbar: false` | 隐藏内置工具栏，但不关闭下载、打印、导出、缩放等 API，适合完全自定义工具栏 |
| `toolbar: true` | 使用默认工具栏，按钮仍按当前格式能力动态显隐 |
| `toolbar.download` / `print` / `exportHtml` / `zoom` | 表达业务是否允许展示对应按钮；最终还会结合文件类型、渲染完成状态、导出适配器和缩放 provider 计算真实可用性 |
| `toolbar.order` | 调整内置工具栏分组顺序，默认 `['search', 'zoom', 'download', 'print', 'exportHtml']`；例如 `['zoom', 'search', 'download', 'print']` 可让缩放排在搜索前，未列出的项按默认顺序追加 |
| `toolbar.position` | `auto`、`top`、`top-center`、`bottom-right`。默认 `auto`，PDF 自动悬浮右下角，其他格式保持顶部靠右；需要顶部水平居中时传 `top-center` |
| `toolbar.beforeOperation` | 工具栏层统一前置校验，会在 `options.beforeOperation` 后执行 |
| `toolbar.beforeDownload` / `beforePrint` / `beforeExportHtml` | 单按钮前置校验，适合下载权限、打印审计和导出确认 |

自定义工具栏不要在预览器外层套 `transform: scale()`。PDF、Excel、CAD、canvas 和文本层格式都要通过内部缩放 provider 保持坐标正确。外部按钮应读取 `operation-availability-change` / `onStateChange` / `subscribe()` 的能力状态，动态禁用不可用操作。

### Vue 3 自定义工具栏

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FileViewerExpose, FileViewerOperationAvailability } from '@file-viewer/vue3'

const viewer = ref<FileViewerExpose | null>(null)
const availability = ref<FileViewerOperationAvailability | null>(null)
const canPrint = computed(() => !!availability.value?.print)

async function checkPrintPermission(filename: string) {
  return window.confirm(`确认打印 ${filename}？`)
}

const options = {
  theme: 'light',
  toolbar: false,
  async beforeOperation(context) {
    if (context.operation === 'print') {
      return await checkPrintPermission(context.filename)
    }
    return true
  }
}
</script>

<template>
  <div class="preview-shell">
    <div class="business-toolbar">
      <button @click="viewer?.downloadOriginalFile()" :disabled="!availability?.download">下载</button>
      <button @click="viewer?.printRenderedHtml()" :disabled="!canPrint">打印</button>
      <button @click="viewer?.exportRenderedHtml()" :disabled="!availability?.exportHtml">HTML</button>
      <button @click="viewer?.zoomOut()" :disabled="!availability?.zoomOut">-</button>
      <button @click="viewer?.resetZoom()" :disabled="!availability?.zoomReset">100%</button>
      <button @click="viewer?.zoomIn()" :disabled="!availability?.zoomIn">+</button>
    </div>

    <file-viewer
      ref="viewer"
      url="/files/report.pdf"
      :options="options"
      @operation-availability-change="availability = $event"
    />
  </div>
</template>
```

### React 自定义工具栏

```tsx
import FileViewer, { useFileViewer } from '@file-viewer/react'

export function Preview() {
  const viewer = useFileViewer({
    url: '/files/report.docx',
    options: { theme: 'light', toolbar: false }
  })
  const availability = viewer.state.availability

  return (
    <section className="preview-shell">
      <div className="business-toolbar">
        <button disabled={!availability?.download} onClick={() => viewer.handle.downloadOriginalFile()}>下载</button>
        <button disabled={!availability?.print} onClick={() => viewer.handle.printRenderedHtml()}>打印</button>
        <button disabled={!availability?.exportHtml} onClick={() => viewer.handle.exportRenderedHtml()}>HTML</button>
        <button disabled={!availability?.zoomOut} onClick={() => viewer.handle.zoomOut()}>-</button>
        <button disabled={!availability?.zoomReset} onClick={() => viewer.handle.resetZoom()}>100%</button>
        <button disabled={!availability?.zoomIn} onClick={() => viewer.handle.zoomIn()}>+</button>
      </div>
      <FileViewer ref={viewer.ref} {...viewer.props} />
    </section>
  )
}
```

### Vanilla JS / Pure Web / Script 标签

```html
<div id="toolbar">
  <button data-action="download">下载</button>
  <button data-action="print">打印</button>
  <button data-action="zoom-in">放大</button>
</div>
<flyfish-file-viewer id="viewer" style="height: 80vh"></flyfish-file-viewer>

<script type="module">
  import { defineFileViewerElement } from '@file-viewer/web'

  defineFileViewerElement()

  const viewer = document.getElementById('viewer')
  viewer.src = '/files/demo.pdf'
  viewer.options = { toolbar: false }

  const buttons = {
    download: document.querySelector('[data-action="download"]'),
    print: document.querySelector('[data-action="print"]'),
    zoomIn: document.querySelector('[data-action="zoom-in"]')
  }

  viewer.addEventListener('viewer-state-change', event => {
    const state = event.detail.state
    buttons.download.disabled = !state.availability?.download
    buttons.print.disabled = !state.availability?.print
    buttons.zoomIn.disabled = !state.availability?.zoomIn
  })

  buttons.download.onclick = () => viewer.downloadOriginalFile()
  buttons.print.onclick = () => viewer.printRenderedHtml()
  buttons.zoomIn.onclick = () => viewer.zoomIn()
</script>
```

无构建工具时，引入 IIFE 后直接写 `<flyfish-file-viewer>` 即可；`window.FlyfishFileViewerWeb.mountViewer(...)` 仍可用于完全命令式场景。

### Vue 2、jQuery 和 Svelte

```vue
<!-- Vue 2.7 / 2.6 -->
<file-viewer
  ref="viewer"
  url="/files/report.pdf"
  :options="{ toolbar: false }"
  @viewer-event="handleViewerEvent"
/>
```

```ts
// jQuery
import { getFileViewerController } from '@file-viewer/jquery'

$('#viewer').fileViewer({
  url: '/files/report.xlsx',
  options: { toolbar: false }
})

$('#zoomIn').on('click', () => $('#viewer').fileViewer('zoomIn'))
getFileViewerController($('#viewer'))?.subscribe((state) => {
  $('#zoomIn').prop('disabled', !state.availability?.zoomIn)
})
```

```svelte
<script lang="ts">
  import FileViewer from '@file-viewer/svelte'

  let viewer
  let availability
</script>

<button disabled={!availability?.print} on:click={() => viewer.printRenderedHtml()}>打印</button>
<FileViewer
  bind:this={viewer}
  url="/files/report.pdf"
  options={{ toolbar: false }}
  on:viewerEvent={(event) => {
    if (event.detail.type === 'operation-availability-change') {
      availability = event.detail.payload
    }
  }}
/>
```

<span id="vue3"></span>

## Vue 3

```bash
pnpm add @file-viewer/vue3
```

```ts
import { createApp } from 'vue'
import App from './App.vue'
import FileViewer from '@file-viewer/vue3'

createApp(App).use(FileViewer).mount('#app')
```

```vue
<script setup lang="ts">
const options = {
  theme: 'light',
  toolbar: { position: 'bottom-right', zoom: true },
  watermark: { text: '内部预览', opacity: 0.14 }
}
</script>

<template>
  <div style="height: 100vh">
    <file-viewer url="/files/demo.docx" :options="options" />
  </div>
</template>
```

## Vue 2.7 / Vue 2.6

Vue 2.7:

```bash
pnpm add @file-viewer/vue2.7
```

Vue 2.6:

```bash
pnpm add @file-viewer/vue2.6
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

历史 Vue 2 包 `@flyfish-group/file-viewer` 仍对应 Vue 2.7 线。新项目如果无法升级 Vue，先按运行时版本选择 `@file-viewer/vue2.7` 或 `@file-viewer/vue2.6`。

<span id="react"></span>

## React

```bash
npm install @file-viewer/react
```

```tsx
import { useRef } from 'react'
import FileViewer, { type FileViewerHandle } from '@file-viewer/react'

export function Preview() {
  const viewerRef = useRef<FileViewerHandle | null>(null)

  return (
    <div style={{ height: '100vh' }}>
      <FileViewer
        ref={viewerRef}
        url="/files/demo.pdf"
        options={{ theme: 'light', toolbar: { position: 'bottom-right' } }}
        onEvent={(event) => console.log(event.type, event.payload)}
      />
    </div>
  )
}
```

需要状态同步时可以使用 `useFileViewer`:

```tsx
import FileViewer, { useFileViewer } from '@file-viewer/react'

export function SearchablePreview() {
  const viewer = useFileViewer({
    url: '/files/report.docx',
    options: { search: true }
  })

  return (
    <>
      <button onClick={() => viewer.handle.searchDocument('合同')}>搜索</button>
      <div style={{ height: '70vh' }}>
        <FileViewer ref={viewer.ref} {...viewer.props} />
      </div>
    </>
  )
}
```

<span id="react-legacy"></span>

### React Legacy

React 16.8 / 17 的旧项目可改用 `@file-viewer/react-legacy`，API 保持同一套 props 与 controller 语义。

<span id="web"></span>

## Vanilla JS / Pure Web

```bash
npm install @file-viewer/web
```

```html
<flyfish-file-viewer
  id="viewer"
  src="/files/demo.xlsx"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:100vh"
></flyfish-file-viewer>

<script type="module">
  import { defineFileViewerElement } from '@file-viewer/web'

  defineFileViewerElement()

  window.zoomIn = () => document.getElementById('viewer').zoomIn()
</script>
```

无构建工具页面可以使用 IIFE:

```html
<link rel="stylesheet" href="/file-viewer/viewer/style.css" />
<script src="/file-viewer/viewer/flyfish-file-viewer-web.iife.js"></script>
<flyfish-file-viewer
  src="/files/demo.pdf"
  theme="light"
  style="display:block;height:100vh"
></flyfish-file-viewer>
```

`@file-viewer/web` 还提供 `file-viewer-copy-assets`，用于把离线资源复制到业务静态目录。

<span id="jquery"></span>

## jQuery

```bash
npm install jquery @file-viewer/jquery
```

```ts
import $ from 'jquery'
import { installJQueryFileViewer } from '@file-viewer/jquery'

installJQueryFileViewer($)

$('#viewer').fileViewer({
  url: '/files/demo.pdf',
  options: {
    theme: 'light',
    toolbar: { position: 'bottom-right' }
  }
})

$('#viewer').fileViewer('searchDocument', '发票')
$('#viewer').fileViewer('zoomIn')
```

如果页面已经有全局 jQuery，插件包会尽量自动挂载；显式调用 `installJQueryFileViewer($)` 更稳，也更适合模块化项目。

完整格式矩阵使用 `@file-viewer/jquery-full`，无需再 import preset。Vite 保持 `copyAssets:true`；非 Vite jQuery 项目运行 Full 包自带的 `npx --no-install file-viewer-copy-assets ./public/file-viewer`。

<span id="svelte"></span>

## Svelte

```bash
npm install @file-viewer/svelte
```

```svelte
<script lang="ts">
  import FileViewer from '@file-viewer/svelte'

  let viewer
  const options = {
    theme: 'light',
    toolbar: { position: 'bottom-right' },
    search: true
  }

  function searchContract() {
    viewer.searchDocument('合同')
  }
</script>

<button on:click={searchContract}>搜索合同</button>
<div style="height: 80vh">
  <FileViewer
    bind:this={viewer}
    url="/files/demo.docx"
    {options}
    on:viewerEvent={(event) => console.log(event.detail.type)}
  />
</div>
```

也可以在普通 DOM 节点上使用 action:

```svelte
<script lang="ts">
  import { fileViewer } from '@file-viewer/svelte/action'

  const viewerOptions = {
    url: '/files/demo.pdf',
    options: { theme: 'light' }
  }
</script>

<div use:fileViewer={viewerOptions} style="height: 100vh" />
```

SvelteKit 中请确保预览器只在浏览器端挂载，并给容器稳定高度；服务端渲染阶段不要访问 `window`、`document` 或真实文件对象。

完整格式矩阵使用 `@file-viewer/svelte-full`，无需再 import preset。SvelteKit/Vite 保持 `copyAssets:true`；其它构建链运行 Full 包自带的 `npx --no-install file-viewer-copy-assets ./public/file-viewer`。

<span id="core"></span>

## Core 自定义接入

业务如果要做自己的组件层，可以直接依赖 `@file-viewer/core`，但建议只有在标准组件包无法覆盖交互模型时才这么做。

```bash
npm install @file-viewer/core
```

Core 暴露格式矩阵、资源路径解析、搜索/缩放/打印导出工具、生命周期上下文和渲染器注册能力。上层组件应只负责容器、状态管理、事件桥接和生态交互，不要把 Vue / React / Svelte 运行时下沉到 core。

<span id="pptx"></span>

## PPT 与 PPTX 引擎接入

```bash
npm install @file-viewer/pptx
```

`@file-viewer/renderer-presentation` 对外提供统一演示文稿能力，但内部保持两条严格隔离的引擎：PowerPoint 97–2003 `.ppt` 使用 `@file-viewer/ppt@0.3.3` 原生 WASM，PPTX/OpenXML 使用 `@file-viewer/pptx` Worker。两者都不会进入 core-only 安装。标准 Vanilla JS / Pure Web、Vue、React、jQuery 和 Svelte 项目应优先安装 presentation renderer，或通过 `preset-office` / `preset-all` 获得完整路由；只有自研 renderer 时才直接调用底层引擎。

```bash
npm install @file-viewer/ppt@0.3.3 @file-viewer/pptx
```

## 离线资源

所有生态包都可以使用同一套离线资源复制流程:

```bash
npx --yes file-viewer-copy-assets ./public/file-viewer
```

发布后确认这些路径能直接访问，并且 `.wasm`、`.mjs`、Worker 脚本不会被网关回退为 HTML:

| 资源 | 默认目录 |
| --- | --- |
| PDF.js worker / CMap / WASM / standard fonts | `file-viewer/vendor/pdf/` |
| Draw.io 官方离线 viewer | `file-viewer/vendor/drawio/` |
| CAD DWG / DWF / DWFx WASM | `file-viewer/wasm/cad/` |
| Typst compiler / renderer WASM / 默认字体 | `file-viewer/wasm/typst/`、`file-viewer/wasm/typst/fonts/` |
| SQLite WASM | `file-viewer/wasm/sqlite/` |
| libarchive Worker / WASM | `file-viewer/vendor/libarchive/` |
| Office Worker | `file-viewer/vendor/docx/`、`file-viewer/vendor/xlsx/` |

## 统一 API

| 能力 | 说明 |
| --- | --- |
| 输入 | `url`、`file`、`buffer`、`name`、`filename`、`type`、`size` |
| 事件 | `onEvent` / `viewerEvent`，包含加载开始、加载完成、卸载开始、卸载完成、错误、搜索、缩放、fit、位置变化等上下文 |
| 状态 | React `useFileViewerState`、controller `subscribe()`，其他生态可通过事件和 controller 获取 |
| 操作 | `downloadOriginalFile()`、`printRenderedHtml()`、`exportRenderedHtml()`、`zoomIn()`、`zoomOut()`、`resetZoom()`、`fitToView()` |
| 搜索定位 | `searchDocument()`、`clearDocumentSearch()`、`nextSearchResult()`、`previousSearchResult()`、`collectDocumentAnchors()`、`scrollToAnchor()`、`scrollToLine()` |
| AI 友好能力 | `getDocumentTextChunks()` 返回文本块、页码、行号、锚点和 label 上下文，业务侧可用于向量化、溯源和召回高亮 |
| 权限前置 | `options.beforeOperation` 可在下载、打印、导出、缩放等操作前返回 `true` / `false` 或 Promise，便于做权限校验 |

## 推荐决策

- Vue 项目优先使用对应 Vue 标准包，不建议把 Vanilla JS / Pure Web 包再包一层组件。
- React 项目优先使用 `@file-viewer/react`；React 16.8 / 17 老项目用 `@file-viewer/react-legacy`。
- Svelte、jQuery 和普通 HTML 页面都有独立入口，不需要借用 Vue 组件。
- 内网部署先把 viewer assets 复制到业务静态目录，再根据网关路径覆盖 `options.pdf.*`、`options.cad.*`、`options.typst.*`、`options.archive.*` 等资源地址。
- 所有生态都要给父容器稳定高度；如果传入 `Blob` / `ArrayBuffer`，请同时提供带扩展名的 `name` 或包装成 `File`。
