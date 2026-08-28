# Vue2 集成

<div class="doc-kicker">For Vue 2 Projects</div>

<p class="doc-lead">
  Vue2 已拆成 <code>@file-viewer/vue2.7</code> 和 <code>@file-viewer/vue2.6</code> 两条标准包线。
  它们面向仍在 Vue2 的业务系统，格式能力、示例文件和 options / 事件语义与 Vue3 包保持一致。
</p>

> Vue 2 上游已经结束维护。File Viewer 会继续保留 Vue 2.6/2.7 兼容包，但新项目优先使用 Vue 3；安全敏感的存量系统还应单独评估宿主 Vue 2 的 [GHSA-5j4c-8p2g-v4jx](https://github.com/advisories/GHSA-5j4c-8p2g-v4jx)，因为上游没有可用的 Vue 2 修复版本。

## 安装

```bash
pnpm add @file-viewer/vue2.7 @file-viewer/preset-office
```

Vue2.6 项目请安装:

```bash
pnpm add @file-viewer/vue2.6 @file-viewer/preset-office
```

只安装 `@file-viewer/vue2.7` 或 `@file-viewer/vue2.6` 是最轻组件入口；PDF、Office、CAD、Typst、压缩包等具体格式能力由 preset 或 renderer 提供。Webpack、Rspack、Rollup、Umi、传统多页应用等非 Vite 项目优先通过 `options.preset` 显式注入能力：

```ts
import officePreset from '@file-viewer/preset-office'

const viewerOptions = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  styleIsolation: 'shadow',
  toolbar: { position: 'bottom-right' }
}
```

Vue2 默认使用 Shadow DOM，宿主全局 CSS、低代码 reset 和微前端样式不会破坏工具栏或正文。只有依赖深层 class 覆盖的旧项目才使用 `styleIsolation:'none'`；tokens 和 `::part()` 主题定制见 [样式隔离与主题定制](/zh/guide/style-isolation)。

Vite 项目可以额外加入插件，插件会自动发现已安装的 `@file-viewer/preset-*` 并省去手动 import preset。注意：只安装插件包不会让 Vite 自动运行，仍需要在 `vite.config.ts` 注册一次插件：

```bash
pnpm add -D @file-viewer/vite-plugin
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

需要完整格式矩阵时，把 `@file-viewer/preset-office` 换成 `@file-viewer/preset-all`，Vite 配置保持一致：

```bash
pnpm add @file-viewer/vue2.7 @file-viewer/preset-all
```

也可以使用 full 包一步到位：Vue2.7 使用 `@file-viewer/vue2.7-full`，Vue2.6 使用 `@file-viewer/vue2.6-full`。full 包默认启用完整格式矩阵，组件、事件和 controller API 与标准包一致：

```bash
pnpm add @file-viewer/vue2.7-full
```

```ts
import Vue from 'vue'
import FileViewer from '@file-viewer/vue2.7-full'

Vue.use(FileViewer)
```

`@file-viewer/vue2.7-full` 和 `@file-viewer/vue2.6-full` 已内置 `preset-all`，不要重复安装或传入。Vite 使用上面的 `copyAssets:true` 后会在 dev/build 自动发布完整同版本资产；Vue CLI、Webpack 4、Rspack、Rollup 等非 Vite 项目运行 Full 包自带的同版本 CLI：

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer
```

如果是 Vue 2.6 项目，把组件包替换为 `@file-viewer/vue2.6` 或 `@file-viewer/vue2.6-full` 即可。需要更强自定义时，再配置 `formats`、`renderers`、`scan:true`、`inject:false` 或 `chunkStrategy:'renderer'`；常规项目保持 `fileViewerRenderers({ copyAssets:true })` 即可。

## Vue 2.6 + Vue CLI 3 / webpack 4

如果旧项目里“只要导入 `@file-viewer/preset-office` 就报错，注释掉就不报错”，通常不是 Vue2.6 组件失效，而是 `preset-office` 会把 PDF、Word、Excel、PPTX、OFD 等 renderer 依赖链一起纳入构建；Vue CLI 3 的 webpack 4 默认不转译 `node_modules`，也不理解部分 package `exports` 子路径和 `import.meta.url` worker 写法。

仓库提供了一个独立可运行示例，技术栈按客户常见后台项目抽取：`vue@2.6`、`@vue/cli-service@3.1`、webpack 4、Element UI、Ant Design Vue 1.x、`babel-polyfill` 和 `@file-viewer/preset-office`。

```bash
cd examples/vue2.6-cli3-office
npm install
npm run serve
```

Node 17+ 跑 webpack 4 时，如果遇到 OpenSSL/MD4 报错，可以临时加：

```bash
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

客户项目里优先整份参考示例的 `vue.config.js`，至少需要搬这几类配置。当前 `@file-viewer/renderer-pdf` 发布包已经在构建时隔离内封 PDF.js 的 webpack runtime，消费项目不应再为 renderer 内部的 `dist/vendor/pdfjs` 路径增加 loader：

```js
// vue.config.js
const path = require('path')

const resolveApp = value => path.resolve(__dirname, value)
const resolvePackageRoot = packageName => path.dirname(require.resolve(`${packageName}/package.json`))
const resolvePackageFile = (packageName, relativePath) => path.join(resolvePackageRoot(packageName), relativePath)

module.exports = {
  transpileDependencies: [
    /@file-viewer/,
    /pdfjs-dist/,
    /e-virt-table/,
    /styled-exceljs/
  ],
  configureWebpack: {
    resolve: {
      alias: {
        '@file-viewer/core/assets$': resolvePackageFile('@file-viewer/core', 'dist/assets.js'),
        '@file-viewer/core/browser$': resolvePackageFile('@file-viewer/core', 'dist/browser.js'),
        '@file-viewer/core/headless$': resolvePackageFile('@file-viewer/core', 'dist/headless.js'),
        '@file-viewer/docx$': resolvePackageFile('@file-viewer/docx', 'dist/docx-preview.mjs')
      },
      extensions: ['.mjs', '.js', '.vue', '.json']
    }
  }
}
```

renderer 构建会在发布 tarball 前同时隔离 PDF.js 的 `modules`、`module_cache`、`exports`、`require` 四个内部标识，并在 `dist/vendor/pdfjs/provenance.json` 记录源文件哈希、变换次数和产物哈希，避免 PDF.js 内部 webpack bootstrap 遮蔽 webpack 4 宿主导出。如果业务代码另外直接导入 `pdfjs-dist` 源模块，那部分仍由业务构建配置负责；File Viewer 示例只把该包作为复制静态资产时的构建期来源。

`@file-viewer/docx` 的 alias 也必须保留：webpack 4 默认优先选择 UMD `browser` 入口，该文件经过 Babel 转译后会丢失 CommonJS 导出，上传 DOCX 时表现为 `@file-viewer/docx did not expose a compatible renderAsync function`。另一个补丁 `build/babel-transform-import-meta-url.cjs` 负责让 webpack 4 解析 PPTX worker 模块。`scripts/copy-file-viewer-assets.cjs` 会把 PDF/DOCX/PPTX/Excel 资产和 `@file-viewer/ppt@0.3.3` 的 ESM、Worker、帧缓存、WASM、CJK 字体、manifest、package metadata、LICENSE、NOTICE 九个文件复制到 `public/file-viewer/`。

`npm run serve` 对应的 `.env.normalServe` 使用 `NODE_ENV=production`，是为了避开 Vue CLI 3.1 dev server 对 HMR 客户端的强注入；真实项目可以先用这个模式确认 `preset-office` 构建链可用，再决定是否保留热更新。

业务代码里继续通过 `options.preset` 注入能力，同时把离线资产路径显式传进去：

```js
import officePreset from '@file-viewer/preset-office'

const assetBaseUrl = './file-viewer/'

export const viewerOptions = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  styleIsolation: 'shadow',
  pdf: {
    workerUrl: `${assetBaseUrl}vendor/pdf/pdf.worker.mjs`,
    cMapUrl: `${assetBaseUrl}vendor/pdf/cmaps/`,
    wasmUrl: `${assetBaseUrl}vendor/pdf/wasm/`,
    standardFontDataUrl: `${assetBaseUrl}vendor/pdf/standard_fonts/`
  },
  docx: {
    workerUrl: `${assetBaseUrl}vendor/docx/docx.worker.js`,
    workerJsZipUrl: `${assetBaseUrl}vendor/docx/jszip.min.js`
  },
  presentation: {
    pptModuleUrl: `${assetBaseUrl}vendor/ppt/index.mjs`,
    pptWorkerUrl: `${assetBaseUrl}vendor/ppt/worker.mjs`,
    pptWasmUrl: `${assetBaseUrl}vendor/ppt/ppt-native.wasm`,
    pptFontUrl: `${assetBaseUrl}vendor/ppt/ppt-font-cjk.otf`,
    workerUrl: `${assetBaseUrl}vendor/pptx/pptx.worker.js`
  },
  spreadsheet: {
    workerUrl: `${assetBaseUrl}vendor/xlsx/sheet.worker.js`
  }
}
```

`preset-office` 只负责 PDF、Word、Excel、PowerPoint、OFD 和 OpenDocument，不包含图片或音视频。业务还需要 `.jpg` / `.mp4` 时，应像仓库 Vue 2.6 示例一样显式补充 renderer，或改用 `preset: [officePreset, litePreset]`：

```js
import officePreset from '@file-viewer/preset-office'
import { imageRenderer } from '@file-viewer/renderer-image'
import { mediaRenderer } from '@file-viewer/renderer-media'

export const viewerOptions = {
  preset: officePreset,
  renderers: [imageRenderer, mediaRenderer],
  rendererMode: 'replace'
}
```

这四个 `ppt*Url` 仅用于这个显式把资产托管在 `public/file-viewer/` 的 Vue CLI 3 兼容示例；复制脚本和 options 已经配套，业务侧不需要再手工拼路径。常规 Vite/full 包会自动发布并解析同一套运行时。

Vue CLI 3 / webpack 4 可以继续使用这条接入路径，但建议面向现代浏览器构建；如果项目仍强依赖 IE11 或旧版 `uglifyjs-webpack-plugin` 压缩全量 Office 依赖链，优先考虑升级压缩器、升级构建链，或改用 `@file-viewer/vue2.6-full` / Web Component IIFE 形态做边界隔离。

## 注册插件

```ts
import Vue from 'vue'
import App from './App.vue'
import FileViewer from '@file-viewer/vue2.7'

Vue.use(FileViewer)

new Vue({
  render: h => h(App)
}).$mount('#app')
```

Vue2 入口会自动带上样式，不需要再额外 import CSS。

## URL 预览

```vue
<template>
  <div style="height: 100vh">
    <file-viewer :url="url" :options="options" />
  </div>
</template>

<script>
import officePreset from '@file-viewer/preset-office'

export default {
  data() {
    return {
      url: 'https://example.com/demo.pdf',
      options: {
        theme: 'light',
        preset: officePreset,
        rendererMode: 'replace',
        toolbar: { position: 'bottom-right' },
        watermark: { text: '内部预览', opacity: 0.14 },
        archive: {
          cache: true,
          workerTimeoutMs: 30000
        }
      }
    }
  }
}
</script>
```

## File 预览

```vue
<template>
  <div style="height: 100vh">
    <input type="file" @change="onChange" />
    <div style="height: calc(100vh - 40px)">
      <file-viewer :file="file" :options="options" />
    </div>
  </div>
</template>

<script>
import officePreset from '@file-viewer/preset-office'

export default {
  data() {
    return {
      file: undefined,
      options: {
        preset: officePreset,
        rendererMode: 'replace'
      }
    }
  },
  methods: {
    onChange(event) {
      const value = event.target.files && event.target.files.item(0)
      if (value) {
        this.file = value
      }
      // 允许用户连续选择同一个本地文件。
      event.target.value = ''
    }
  }
}
</script>
```

## 与其他生态版本保持一致

Vue2.7 / Vue2.6 标准包共享同一套 core 接口和 renderer/preset 装配能力；完整矩阵可覆盖 Word、Excel、PPT、PDF、OFD、Typst、XMind 脑图、压缩包、邮件、OLB/DRA/GDS/OASIS、CAD、地理数据、3D 模型、Excalidraw、draw.io、EPUB、UMD、Markdown、代码高亮、图片、音视频、字体、设计资产和结构化数据。差异主要在包名和 Vue 运行时版本:

两条分支也共享同一套打印和缩放能力判断: `toolbar.print` / `toolbar.zoom` 只表示业务是否显示按钮，真实按钮会结合当前文件类型、渲染完成状态、导出适配器和缩放 provider 动态显隐。`toolbar.position` 支持 `auto`、`top`、`top-center`、`bottom-right`，默认 `auto`，PDF 会自动悬浮到右下角以避开自身导航栏；需要顶部水平居中时传 `top-center`。Word / PDF 会输出完整页面，不适合直接打印的表格、压缩包、邮件、EPUB、音视频、3D / 模型等链路会隐藏打印按钮；Excel 等虚拟表格不会被外层 CSS 强行缩放。`options.theme` 支持 `light`、`dark`、`system`，默认继续跟随系统；浅色业务系统建议显式传 `light`。

| 版本 | npm 包 | 最新版本 | 注册方式 |
| --- | --- | --- | --- |
| Vue2.7 | `@file-viewer/vue2.7` | `latest` | `Vue.use(FileViewer)` |
| Vue2.6 | `@file-viewer/vue2.6` | `latest` | `Vue.use(FileViewer)` |
| Vue2.7 Full | `@file-viewer/vue2.7-full` | `latest` | 默认启用完整格式矩阵 |
| Vue2.6 Full | `@file-viewer/vue2.6-full` | `latest` | 默认启用完整格式矩阵 |
| Vue3 | `@file-viewer/vue3` | `latest` | `createApp(App).use(FileViewer)` |

历史包名 `@flyfish-group/file-viewer` 仍同步维护，对应 Vue2.7 线；新项目建议优先使用标准包名。

<div class="doc-note">
  如果一个预览能力需要被多个不同技术栈系统复用，建议统一使用标准组件包线，让 Vanilla JS / Pure Web、Vue、React、jQuery 和 Svelte 共享同一套 core 能力和运行参数。完整矩阵见 <a href="/zh/guide/ecosystem">生态组件总览</a>。
</div>
