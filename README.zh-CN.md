<p align="center">
  <a href="https://file-viewer.app">
    <img src="docs/public/_media/logo.png" width="92" alt="File Viewer logo" />
  </a>
</p>

<h1 align="center">File Viewer</h1>

<p align="center">
  <strong>面向企业后台、内网和私有化系统的纯前端文件预览组件。</strong>
</p>

<p align="center">
  私有文件留在浏览器内。无需服务端转码，即可预览 Office、PDF/OFD、CAD、压缩包、邮件、图片、音视频和代码。
</p>

<p align="center">
  <a href="https://demo.file-viewer.app">在线 Demo</a> ·
  <a href="https://doc.file-viewer.app">文档</a> ·
  <a href="https://github.com/flyfish-dev/file-viewer/wiki">GitHub Wiki</a> ·
  <a href="https://github.com/sponsors/wybaby168">GitHub Sponsors</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#支持格式">支持格式</a> ·
  <a href="CONTRIBUTING.md">参与贡献</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@file-viewer/core"><img alt="npm core" src="https://img.shields.io/npm/v/@file-viewer/core?label=core&color=31a66f" /></a>
  <a href="https://www.npmjs.com/package/@file-viewer/vue3"><img alt="npm vue3" src="https://img.shields.io/npm/v/@file-viewer/vue3?label=vue3&color=278cff" /></a>
  <a href="https://github.com/flyfish-dev/file-viewer"><img alt="GitHub stars" src="https://img.shields.io/github/stars/flyfish-dev/file-viewer?style=flat&logo=github&color=111827" /></a>
  <a href="https://github.com/sponsors/wybaby168"><img alt="GitHub Sponsors" src="https://img.shields.io/badge/GitHub-Sponsor-ea4aaa?logo=githubsponsors&logoColor=white" /></a>
  <a href="https://github.com/flyfish-dev/file-viewer/releases"><img alt="GitHub release" src="https://img.shields.io/github/v/release/flyfish-dev/file-viewer?label=release&color=35c8c0" /></a>
  <a href="https://doc.file-viewer.app"><img alt="Documentation" src="https://img.shields.io/badge/docs-doc.file--viewer.app-278cff" /></a>
  <a href="https://github.com/flyfish-dev/file-viewer/wiki"><img alt="GitHub Wiki" src="https://img.shields.io/badge/wiki-GitHub%20Wiki-111827?logo=github" /></a>
  <a href="https://demo.file-viewer.app"><img alt="Live demo" src="https://img.shields.io/badge/demo-demo.file--viewer.app-16a34a" /></a>
  <a href="https://linux.do"><img alt="Linux Do" src="https://img.shields.io/badge/Linux%20Do-community-1f2937" /></a>
  <a href="https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/flyfish-dev/file-viewer?color=0f766e" /></a>
  <a href="https://hub.docker.com/r/flyfishdev/file-viewer"><img alt="Docker" src="https://img.shields.io/badge/docker-flyfishdev%2Ffile--viewer-2496ed?logo=docker" /></a>
  <img alt="Supported formats" src="https://img.shields.io/badge/formats-221-31a66f" />
  <img alt="Modular architecture" src="https://img.shields.io/badge/architecture-modular%20renderers-278cff" />
  <img alt="Ecosystem packages" src="https://img.shields.io/badge/npm%20targets-57-0f766e" />
</p>

<p align="center">
  <a href="https://demo.file-viewer.app"><img src="docs/public/_media/file-viewer-demo-v2.2.6-desktop-zh.webp" width="1280" alt="File Viewer v2.3.2 浏览器原生 DOCX 预览工作区" /></a>
</p>

---

> **公开仓说明：** 本中文长文档保留完整技术背景；其中 release、deploy、sync、完整 verify 等命令仅供完整私有维护者工作区使用。公开 checkout 请以默认英文 README 的七条命令为准。

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->


## 项目定位

为了预览一份内部 DOCX 就把文件上传到第三方，既慢也不合适。File Viewer 把预览留在浏览器内，让企业后台、OA、知识库、工单、附件中心和工程资料库使用同一套 API，而不是继续拼接一堆互不一致的查看器。

v2.3.2 当前内置 221 个已注册扩展名（221 个稳定、0 个实验）和 32 条预览链路。Office、PDF、OFD、Typst、CAD、STEP、XMind、压缩包、邮件、绘图、音视频、代码、PSD、字体和结构化数据共享文件源、生命周期、搜索、缩放、打印、导出和下载契约；重型 Worker、WASM、字体与 vendor 资产保持按需加载，并可完全托管在自己的网络中。

新项目优先使用 `@file-viewer/*`；`@flyfish-group/*` 历史包继续同步维护。

## 亮点

- **一个组件起步。** Vanilla JS / Web Component 优先，并提供 Vue、React、Svelte、jQuery 原生组件。
- **矩阵可核验。** 221 个已注册扩展名（221 个稳定、0 个实验）映射到 32 条预览链路，覆盖办公、工程、设计、数据、音视频和代码附件。
- **部署不出网。** 浏览器内解析和渲染，支持离线网络、Docker、私有 CDN 和完整资源自托管。
- **模块化。** 轻量组件、renderer、preset、full 包分层清晰，既能极简安装，也能一键全量。
- **按需加载。** PDF、Office、CAD、Typst、压缩包、图纸、PSD、Mermaid 等重型能力只在命中格式时加载。
- **有界多页 TIFF。** CCITT Group 4 TIFF 在独立懒加载边界逐页解码，并支持整组缩放、旋转、适宽、页码状态和大图查看。
- **识别 Vite 版本。** Vite 5—7 继续使用 Rollup `manualChunks`；Vite 8 使用 Rolldown 分组，不覆盖业务已有分组和优先级。
- **操作完整。** 搜索、高亮、缩放、打印、导出 HTML、下载、水印、主题、生命周期钩子和按钮前置校验都走统一 API。
- **生态一致。** Core 聚焦底层能力，各框架组件只做原生封装，参数、事件和 controller 体验保持一致。

## 按场景选择入口

| 用户 | 他们关心什么 | 推荐入口 |
| --- | --- | --- |
| 企业后台 / OA 开发 | Word、Excel、PPT、PDF 附件预览 | [快速开始](#快速开始) / [Office preset](https://doc.file-viewer.app/guide/quickstart) |
| 工程资料系统 | DWG、DXF、DWF、图纸初筛 | [支持格式](#支持格式) / [格式完整度](https://doc.file-viewer.app/guide/format-fidelity) |
| 前端组件使用者 | Vue / React / Web Component 接入 | [生态组件总览](https://doc.file-viewer.app/guide/ecosystem) |
| 私有化交付团队 | 离线、内网、Worker / WASM 自托管 | [发布与分发](https://doc.file-viewer.app/guide/distribution) / [Docker 部署](https://doc.file-viewer.app/guide/docker) |

## 在线效果

![File Viewer v2.3.2 中文产品演示：在沉浸式工作台中预览特色 DOCX、PPTX、DWG 与可交互的三维 STEP 模型](docs/public/_media/file-viewer-demo-v2.2.6-formats-zh.gif)

打开 [demo.file-viewer.app](https://demo.file-viewer.app) 即可使用上图中的产品工作台：固定玻璃工具栏、点击文件名展开的样例库、本地最近打开记录、明暗主题、移动端单一“更多”入口，以及只让文档容器滚动的沉浸画布。内置样例覆盖 Word、Excel、二进制 PPT、PPTX、PDF/OFD、DWG、STEP、压缩包、邮件和其余已注册矩阵；也可以上传脱敏文件或粘贴 URL。

## 兼容性反馈

这个项目还在持续打磨，尤其需要真实业务文件来验证兼容性。

如果文件渲染异常，请先在 [Demo](https://demo.file-viewer.app) 验证，再使用带标注说明的 [Bug 表单](https://github.com/flyfish-dev/file-viewer/issues/new?template=bug_report.yml) 或 [文件兼容性表单](https://github.com/flyfish-dev/file-viewer/issues/new?template=compatibility.yml)。所有 Bug 必须提供公开/脱敏样例、公开复现链接，或注明私有样例已发送到 `admin@flyfish.dev`；截图可以帮助对比，但不能替代样例。

如果这个方向刚好对你有用，也欢迎收藏项目。比起单纯 Star，我更希望收到真实场景下的兼容性反馈。

## 快速开始

先选接入层，再按需选择格式能力。`*-full` 已内置 `preset-all`；npm 项目还需一次性发布同版本运行时资产。

| 场景 | 推荐安装 |
| --- | --- |
| Script 标签 / CDN 完整能力 | `@file-viewer/web-full` |
| Vanilla JS npm | `@file-viewer/web` + `@file-viewer/preset-all` |
| Vue 3 | `@file-viewer/vue3-full`，或 `@file-viewer/vue3` + preset |
| Vue 2.7 / 2.6 | `@file-viewer/vue2.7-full` / `@file-viewer/vue2.6-full` |
| React 18/19 | `@file-viewer/react-full` |
| React 16.8/17 | `@file-viewer/react-legacy-full` |
| Svelte | `@file-viewer/svelte-full` |
| jQuery | `@file-viewer/jquery-full` |
| 精确裁剪 | 任意组件包 + `@file-viewer/preset-*` 或独立 renderer |

官方 8 个 Full 包是 `@file-viewer/web-full`、`@file-viewer/vue3-full`、`@file-viewer/vue2.7-full`、`@file-viewer/vue2.6-full`、`@file-viewer/react-full`、`@file-viewer/react-legacy-full`、`@file-viewer/svelte-full` 和 `@file-viewer/jquery-full`。

`*-full` 表示完整 renderer 矩阵及其同版本 Worker、WASM、字体和 vendor 资产已内置，不要再安装或传入其它 preset。Vite 会自动发布包内资产；其它构建工具使用 Full 包自带的同版本 CLI 完成自托管。

| 构建 / 交付方式 | 必须完成的资产步骤 |
| --- | --- |
| Vite | 安装 `@file-viewer/vite-plugin` 并使用 `fileViewerRenderers({ copyAssets: true })`；dev 和 build 会自动发布同版本资源。 |
| Webpack / Rspack / Rollup / Vue CLI / Umi | 运行 Full 包自带的同版本 CLI：`npx --no-install file-viewer-copy-assets ./public/file-viewer`。 |
| `@file-viewer/web-full` CDN/IIFE 或自托管 | 直接使用 CDN 入口，或原样部署完整 `dist/` 目录；无需执行复制命令。只复制入口 IIFE 文件不完整。 |

默认资产 URL 是 `<部署基址>/file-viewer/`（根部署即 `/file-viewer/`）。缺少该目录时，轻量格式和少数兼容路径可能仍能工作，但不属于完整格式支持。

### CDN / Script 标签

```html
<script src="https://unpkg.com/@file-viewer/web-full@latest/dist/flyfish-file-viewer-web-full.iife.js"></script>

<flyfish-file-viewer
  src="/files/report.pdf"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

`web-full` 的 CDN IIFE 首包只注册 Custom Element、controller 和 lazy full preset；PDF、Word、Excel、二进制 PPT、PPTX、CAD、Typst、压缩包等重型 renderer 会在命中文件类型时从 `dist/renderers/*.iife.js` 异步加载。完整部署 `dist/` 即可：其中 `vendor/ppt/` 已包含经过完整性校验的 `@file-viewer/ppt@0.3.3` ESM、Worker、WASM、CJK 字体与帧缓存模块，并与其它版本对齐的资产一起交付。二进制 `.ppt` 默认无需配置运行时 URL；`pptModuleUrl`、`pptWorkerUrl`、`pptWasmUrl` 和 `pptFontUrl` 只用于非标准资产路径覆盖。

### Vanilla JS

```bash
npm i @file-viewer/web @file-viewer/preset-all
```

```ts
import { mountViewer } from '@file-viewer/web'
import presetAll from '@file-viewer/preset-all'

mountViewer(document.querySelector('#viewer')!, {
  url: '/files/report.docx',
  options: { preset: presetAll, theme: 'light' }
})
```

### Vue 3

```bash
npm i @file-viewer/vue3-full
```

```ts
import { createApp } from 'vue'
import App from './App.vue'
import FileViewer from '@file-viewer/vue3-full'

createApp(App).use(FileViewer).mount('#app')
```

```vue
<file-viewer url="/files/report.docx" />
```

### Vue 2

```bash
npm i @file-viewer/vue2.7-full
# Vue 2.6 项目使用 @file-viewer/vue2.6-full
```

```ts
import Vue from 'vue'
import FileViewer from '@file-viewer/vue2.7-full'

Vue.use(FileViewer)
```

Vue 2.6 + Vue CLI 3 / webpack 4 老后台如果在导入 `@file-viewer/preset-office` 后构建报错，可直接参考独立示例 [`examples/vue2.6-cli3-office`](./examples/vue2.6-cli3-office)，里面包含 `transpileDependencies`、webpack 4 子路径 alias、PDF.js legacy `.mjs` 兼容、PPTX `import.meta.url` 兼容、Vue CLI 3.1 HMR 预览规避和离线 worker 资产复制脚本。

### React

```bash
npm i @file-viewer/react-full
```

```tsx
import FileViewer from '@file-viewer/react-full'

export function Preview() {
  return <FileViewer url="/files/report.pdf" style={{ height: 720 }} />
}
```

### Svelte

```bash
npm i @file-viewer/svelte-full
```

```svelte
<script>
  import FileViewer from '@file-viewer/svelte-full'
</script>

<FileViewer url="/files/report.pdf" containerStyle="height:720px" />
```

### jQuery

```bash
npm i @file-viewer/jquery-full
```

```ts
import $ from 'jquery'
import installFileViewer from '@file-viewer/jquery-full'

installFileViewer($)
$('#viewer').fileViewer({ url: '/files/report.pdf' })
```

### full 包运行时资产

所有 full 包默认把 Archive、PDF、DOCX、Excel、二进制 PPT、PPTX、CAD、Typst、Draw.io、SQLite 等运行时资产指向部署基址下的 `file-viewer/`（根部署即 `/file-viewer/`）。Vite 自动发布包内资产或随包 CLI 写入 `./public/file-viewer` 后，这些 URL 不需要逐项配置；经过校验的 `@file-viewer/ppt@0.3.3` 运行时位于 `vendor/ppt/`，并保留自身 LICENSE 与 NOTICE。

```ts
import { setDefaultFullAssetBaseUrl } from '@file-viewer/vue3-full'

setDefaultFullAssetBaseUrl('/static/file-viewer/')
```

显式传入的 `options.archive.*`、`options.pdf.*`、`options.typst.*` 等配置仍然优先，便于内网网关、租户路径或灰度静态资源覆盖。

### 按需组合

```bash
npm i @file-viewer/vue3 @file-viewer/preset-office
```

```ts
import officePreset from '@file-viewer/preset-office'

const options = {
  preset: officePreset,
  theme: 'light',
  toolbar: { position: 'bottom-right' }
}
```

Vite 项目可额外安装 `@file-viewer/vite-plugin`，自动发现已安装 preset 并复制 Worker/WASM/字体/vendor 资源；非 Vite 项目直接使用 `options.preset`，不需要额外插件。

### 零依赖 iframe 集成

不想在业务项目安装任何 npm 包时，下载 GitHub Release 的 `file-viewer-v2-*-official-demo-iframe.tar.gz`，解压到静态目录后直接嵌入:

```html
<iframe
  src="/file-viewer/iframe.html?url=/files/report.docx"
  style="width:100%;height:720px;border:0"
  allow="fullscreen"
></iframe>
```

业务接口返回二进制时，父页面只需要把 `Blob` 发给 Demo 入口:

```html
<iframe id="viewer" src="/file-viewer/iframe.html?from=https%3A%2F%2Fapp.example.com&name=report.docx"></iframe>
<script>
  const file = await fetch('/api/files/report.docx').then(response => response.blob())
  document.querySelector('#viewer').contentWindow.postMessage(file, 'https://static.example.com')
</script>
```

`iframe.html` 是推荐的无外壳入口，支持 clean URL 的静态平台也可以写成 `/iframe`；原主 Demo `index.html` 也保留同一套 `url`、`from`、`name` 和 `postMessage(Blob)` 协议，方便兼容已有客户集成。

## 架构

- `@file-viewer/core`: 格式识别、资源加载、renderer 协议、生命周期、搜索、缩放、打印、导出和 controller API。
- `@file-viewer/renderer-*`: PDF、Word、PPT/PPTX、CAD、Typst、Archive、Drawing、Data、EDA 等独立渲染能力。
- `@file-viewer/preset-*`: `lite`、`office`、`engineering`、`all` 四类能力组合。
- `@file-viewer/web|vue3|vue2.7|vue2.6|react|react-legacy|svelte|jquery`: 各生态的原生组件。
- `@file-viewer/*-full`: 组件 + `preset-all`；完整支持还需把同版本运行时资源发布到 `<部署基址>/file-viewer/`，适合全格式附件中心。

## 入口

| 入口 | 地址 |
| --- | --- |
| 官方网站 | [file-viewer.app](https://file-viewer.app) |
| 官方文档 | [doc.file-viewer.app](https://doc.file-viewer.app) |
| 在线 Demo | [demo.file-viewer.app](https://demo.file-viewer.app) |
| 文档比对 Demo | [demo.file-viewer.app/compare.html](https://demo.file-viewer.app/compare.html) |
| Release 下载 | [github.com/flyfish-dev/file-viewer/releases](https://github.com/flyfish-dev/file-viewer/releases) |
| Docker 镜像 | `flyfishdev/file-viewer:latest` |
| Linux Do 友链 | [linux.do](https://linux.do) |
| GitHub Sponsors | [github.com/sponsors/wybaby168](https://github.com/sponsors/wybaby168) |
| 微信 / 支付宝赞赏 | [dev.flyfish.group/sponsor?source=github](https://dev.flyfish.group/sponsor?source=github) |
| 企业技术支持 | [dev.flyfish.group/shop](https://dev.flyfish.group/shop) |

## 支持格式

[`ecosystem/format-catalog.json`](ecosystem/format-catalog.json) 是唯一格式事实源：v2.3.2 注册 221 个不重复扩展名和 32 条预览链路，其中 221 个稳定、0 个实验。下表按用户可理解的文件家族分组，并完整列出所有已注册扩展名。

| 类别           | 扩展名                                                                                                                                                                                                                                                                                                                         | 当前表现                                                                                                                                                                                                            | 适合场景                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Word           | `docx`、`docm`、`dotx`、`dotm`                                                                                                                                                                                                                                                                                                 | `@file-viewer/renderer-word` + 自研 `@file-viewer/docx`，Worker 解析、连续流式阅读、目录字段缓存和异步分批渲染；模板/宏格式按只读预览处理                                                                            | 新生成的 Word 文档、正式文档、Word 模板     |
| Word           | `doc`、`dot`                                                                                                                                                                                                                                                                                                                   | `@file-viewer/renderer-word` + `msdoc-viewer`，使用 Word 风格页面容器，增强 CFB 容错和表格布局                                                                                                                       | 历史 `.doc` 老文档、Word 97-2003 模板       |
| 兼容文档       | `rtf`、`odt`                                                                                                                                                                                                                                                                                                                   | `@file-viewer/renderer-word` + `rtf.js` / ODF `content.xml` 兼容预览                                                                                                                                                 | RTF 富文本、OpenDocument 文本文档           |
| Excel          | `xlsx`、`xltx`                                                                                                                                                                                                                                                                                                                 | `@file-viewer/renderer-spreadsheet` + `styled-exceljs` + 虚拟滚动，支持尺寸、合并、常见样式、自动文本色、workbook drawing 图片和可选表头拖拽调整列宽；默认 `worker: auto`，大文件自动启用 Worker，小文件保留主线程兼容路径；打印按钮按能力隐藏，避免只打印当前视口 | 需要保留表格结构和样式的业务、Excel 模板    |
| Excel 兼容格式 | `xlsm`、`xlsb`、`xls`、`xlt`、`xltm`、`csv`、`tsv`、`ods`、`fods`、`numbers`                                                                                                                                                                                                                                                  | CSV / TSV 自动识别 UTF-8、GBK 和 GB18030，也可通过 `options.spreadsheet.textEncoding` 显式覆盖；其余格式按可用信息渐进还原样式；同样遵循虚拟表格打印边界                                                             | 老表格、轻量数据查看                        |
| PowerPoint     | `ppt`、`pptx`、`pptm`、`potx`、`potm`、`ppsx`、`ppsm`、`odp`                                                                                                                                                                                                                                                                   | 二进制 `.ppt` 使用独立原生 WASM `@file-viewer/ppt` 引擎；OpenXML 文件使用 `@file-viewer/pptx` Worker 渐进解析；ODP 走 OpenDocument 幻灯片文本预览                                                                      | 汇报材料、课件、方案、演示模板              |
| PDF            | `pdf`                                                                                                                                                                                                                                                                                                                          | 基于 `pdfjs-dist` 预览，同源 URL 默认渐进读取；服务端支持 Range 时自动分片加载，支持缩放工具栏、旋转页、页侧边栏/目录树侧边栏切换、宽度自适应、完整打印和导出 HTML                                                  | 合同、票据、版式成品                        |
| OFD            | `ofd`                                                                                                                                                                                                                                                                                                                          | 基于 `DLTech21/ofd.js` 仓库源码在线预览国产版式文档，避开 npm dist 授权 wasm 分支                                                                                                                                   | 电子发票、公文、归档材料                    |
| Typst          | `typ`、`typst`                                                                                                                                                                                                                                                                                                                 | 直接读取 Typst 源文件，按需加载 `@myriaddreamin/typst.ts` 浏览器 WASM 编译器、SVG 渲染器和本地字体资产；支持完整预览、打印和导出 HTML                                                                                          | 技术报告、论文草稿、工程文档模板            |
| 压缩包         | `zip`、`zipx`、`7z`、`rar`、`tar`、`gz`、`gzip`、`tgz`、`bz2`、`bzip2`、`tbz`、`tbz2`、`xz`、`txz`、`lzma`、`zst`、`tzst`、`cab`、`ar`、`cpio`、`iso`、`xar`、`lha`、`lzh`、`jar`、`war`、`ear`、`apk`、`cbz`、`cbr`                                                                                                           | `@file-viewer/renderer-archive` 基于 `libarchive.js` WASM Worker 读取目录，点击后按需解压内部文件并复用统一预览器；CBZ/CBR 自动提供自然页序、翻页、键盘和触摸阅读体验；支持 IndexedDB 缓存、GBK/GB18030 旧 ZIP 中文文件名、ZIP/TAR/GZIP 兼容降级和体积上限                         | 归档附件、漫画书、批量交付包、压缩包内文档快速查看  |
| 邮件           | `eml`、`msg`、`mbox`                                                                                                                                                                                                                                                                                                           | `@file-viewer/renderer-email` 独立承接邮件链路；EML/MBOX 使用 `postal-mime`，MSG 使用 `@kenjiuno/msgreader`，支持头信息、HTML/文本正文、附件下载与附件预览                                                          | 邮件归档、工单邮件、客户来信附件            |
| EDA            | `olb`、`dra`、`gds`、`oas`、`oasis`                                                                                                                                                                                                                                                                                            | `@file-viewer/renderer-eda` 独立承接；使用 `cfb` 解析 OrCAD/Allegro 常见 CFB 容器；标准 GDSII 会读取 structure、boundary、path、text、reference，小图输出 SVG，大元素集自动切到 WebGL canvas；OAS/OASIS 可读文本版图夹具会输出 SVG 预览，真实 SEMI 二进制 OASIS 先做安全结构索引、可读字符串、实体候选和诊断，不虚标专业电气/几何校核 | 元件库、封装图纸、芯片版图附件初筛          |
| CAD            | `dwg`、`dxf`、`dwf`、`dwfx`、`xps`                                                                                                                                                                                                                                                                                             | 基于 `@flyfish-dev/cad-viewer` 预览图纸；DWG 通过 Worker + LibreDWG WASM 解析，DXF 使用 JS parser，DWF/DWFx/XPS 使用 native `dwf-viewer` 渲染 W2D/W3D/XPS 图形                                                      | 工程图纸、二维 CAD 附件、AutoCAD 归档文件   |
| 3D 模型        | `glb`、`gltf`、`obj`、`stl`、`ply`、`fbx`、`dae`、`3ds`、`3mf`、`amf`、`usd`、`usda`、`usdc`、`usdz`、`kmz`、`pcd`、`wrl`、`vrml`、`xyz`、`vtk`、`vtp`、`step`、`stp`、`iges`、`igs`、`ifc`、`3dm`、`brep`                                                                                                                     | 常见网格与场景格式使用 Three.js loaders；STEP/STP、IGES/IGS、BREP 使用随包交付的本地 OCCT Worker/WASM 完成真实三角化，并保留装配层级、实例、法线和面颜色；IFC 与 3DM 会准确提示当前能力边界                          | 设计模型、点云、三维资产、工程模型          |
| 地理数据       | `geojson`、`kml`、`gpx`、`shp`                                                                                                                                                                                                                                                                                                 | `@file-viewer/renderer-geo` 独立承接；`@tmcw/togeojson` / `shpjs` 转 GeoJSON，支持 CRS 归一化，并用离线 MapLibre 矢量地图叠加点线面，失败时回退 SVG 预览                                                              | 地理附件、轨迹、边界和轻量 GIS 数据         |
| XMind 脑图     | `xmind`                                                                                                                                                                                                                                                                                                                        | 基于 `@ljheee/xmind-parser` 解析 XMind 8 XML 与 XMind 2020+ JSON 包结构，离线渲染多 sheet 脑图、节点、标签、备注、链接、标记、图片和目录树，使用 `@panzoom/panzoom` 提供成熟的拖拽平移、移动端双指缩放、滚轮锚点缩放、键盘平移、统一 toolbar 状态同步、适配画布、搜索、打印、HTML 导出和缩放 | 脑图、项目规划、知识结构、会议纪要          |
| Excalidraw     | `excalidraw`                                                                                                                                                                                                                                                                                                                   | `@file-viewer/renderer-drawing` 默认使用 `roughjs` 输出稳定只读 SVG；运行环境提供官方 `@excalidraw/excalidraw` ESM 模块时会优先尝试 `restore` + `exportToSvg` 并自动回退 | 白板草图、流程草稿、产品沟通图              |
| draw.io        | `drawio`、`dio`                                                                                                                                                                                                                                                                                                                | 基于官方 diagrams.net `GraphViewer` 预览 mxGraphModel / mxfile                                                                                                                                                      | 流程图、架构图、业务泳道图                  |
| Mermaid        | `mermaid`、`mmd`                                                                                                                                                                                                                                                                                                               | `@file-viewer/renderer-drawing` 按需加载官方 `mermaid`，输出主题适配 SVG，并通过 `@panzoom/panzoom` 支持拖动、缩放、重置和统一工具栏联动                                                                             | 架构图、流程图、状态图、序列图              |
| PlantUML       | `plantuml`、`puml`                                                                                                                                                                                                                                                                                                             | 使用 `plantuml-encoder` 生成渲染 payload，支持配置自托管 PlantUML SVG 服务；预览层同样支持拖动、缩放和主题容器适配                                                                                                  | UML 时序图、组件图、部署图                  |
| 电子书         | `epub`                                                                                                                                                                                                                                                                                                                         | `@file-viewer/renderer-epub` 按需加载随包交付的离线 EPUB 引擎，解析元数据、目录、章节并提供搜索与滚动阅读；v2.3.2 固定使用安全 XML DOM 实现，不增加外部运行时或 CDN 依赖                                          | 电子书、培训手册、长篇阅读材料              |
| 电子书         | `umd`                                                                                                                                                                                                                                                                                                                          | 按 UMD 移动电子书结构解析元数据、目录和 zlib 压缩正文                                                                                                                                                               | 旧移动电子书、历史小说附件                  |
| Markdown       | `md`、`markdown`                                                                                                                                                                                                                                                                                                               | `@file-viewer/renderer-text` 提供 Markdown 阅读样式和明暗主题；超大源码自动切换为有界虚拟文本渲染                                                                                                                   | README、知识文档、说明文档                  |
| 图片           | `gif`、`jpg`、`jpeg`、`bmp`、`tiff`、`tif`、`png`、`svg`、`webp`、`avif`、`ico`、`heic`、`heif`、`jxl`                                                                                                                                                                                                                         | 原生图片浏览；TIFF 命中时按需进行有界多页 CCITT Group 4 解码；HEIC/HEIF 命中时按需使用 `heic2any` 转换                                                                                                            | 图片附件、设计稿、Logo、移动端照片          |
| 代码/文本      | `txt`、`json`、`jsonc`、`json5`、`ipynb`、`yaml`、`yml`、`toml`、`ini`、`proto`、`hcl`、`tex`、`gv`、`http`、`js`、`mjs`、`cjs`、`jsx`、`ts`、`tsx`、`vue`、`react`、`css`、`html`、`htm`、`xml`、`log`、`java`、`py`、`go`、`rs`、`rb`、`swift`、`kt`、`php`、`c`、`cpp`、`cc`、`h`、`hpp`、`cs`、`sh`、`bash`、`sql`、`diff`、`patch`、`bundle`、`bdl` | 普通文件使用 `highlight.js`；超大文件改用稀疏行索引、有界虚拟行、全源搜索和超长单行分段浏览。普通体积的 patch 与 git bundle 仍按需启用增强视图                                               | 日志、配置、代码片段、接口响应、代码评审    |
| 音频           | `mp3`、`mpeg`、`wav`、`ogg`、`oga`、`opus`、`m4a`、`aac`、`flac`、`weba`、`midi`、`mid`                                                                                                                                                                                                                                        | `@file-viewer/renderer-media` 使用浏览器原生音频播放；MIDI 命中时按需加载 `@tonejs/midi` 展示轨道结构                                                                                                               | 录音、播客、语音附件、音效素材、MIDI 文件   |
| 视频           | `mp4`、`webm`、`m3u8`                                                                                                                                                                                                                                                                                                          | `@file-viewer/renderer-media` 使用浏览器原生视频播放；HLS 清单必要时按需加载 `hls.js`                                                                                                                               | 演示视频、录屏、HLS 流                      |
| 字体/设计/数据 | `ttf`、`otf`、`woff`、`woff2`、`psd`、`ai`、`eps`、`sqlite`、`wasm`、`parquet`、`avro`、`webarchive`                                                                                                                                                                                                                           | `@file-viewer/renderer-data` 独立承接，基于 FontFace、`ag-psd`、`sql.js`、`hyparquet`、`avsc`、WebAssembly Module 和安全摘要；PSD 支持图层选择显隐、重绘和统一缩放；SQLite WASM 支持私有化配置                  | 字体、设计资产、数据库、列式数据和 Web 归档 |

## 能力组合

组件包默认保持轻量，格式能力通过 preset 或 renderer 装配。

| 模式 | 适合场景 | 示例 |
| --- | --- | --- |
| `*-full` | 完整 renderer 矩阵 + 一次 `<部署基址>/file-viewer/` 资产发布 | `@file-viewer/vue3-full` |
| 组件 + preset | 大多数业务系统，体积和能力平衡 | `@file-viewer/vue3` + `@file-viewer/preset-office` |
| 组件 + 多 preset | 组合办公和工程附件 | `preset: [officePreset, engineeringPreset]` |
| 组件 + renderer | 只要一个或少数格式 | `@file-viewer/renderer-pdf` |
| CDN full | 无构建工具、script 标签、快速验证 | `@file-viewer/web-full` |
| Vite 插件 | Vite 项目自动发现已安装 preset 并复制资产 | `@file-viewer/vite-plugin` |

Preset 选择:

| preset | 覆盖范围 |
| --- | --- |
| `@file-viewer/preset-lite` | 文本、Markdown、代码、图片、音频、视频 |
| `@file-viewer/preset-office` | PDF、Word、Excel、PowerPoint、OFD、RTF、OpenDocument |
| `@file-viewer/preset-engineering` | CAD、3D、绘图、XMind、Geo、Typst、Archive、Data、EDA |
| `@file-viewer/preset-all` | 官方 Demo 完整格式矩阵 |

国际化、主题、水印、工具栏、搜索、打印、导出、生命周期和前置权限校验都通过同一套 `options` 配置。完整 API 见 [官方文档](https://doc.file-viewer.app/guide/usage)。

## 当前 npm 生态

当前版本以 npm registry 的 `latest` dist-tag 为准，本仓库共发布 57 个 npm 目标: 51 个标准组件/完整 full 包/核心/renderer/preset/工程插件包 + 6 个历史兼容 alias；独立版本的 renderer 依赖不计入该数字。新项目建议优先使用 `@file-viewer/*` 标准包名；旧项目继续使用 `@flyfish-group/*` 或 `file-viewer3` 时也会拿到同版本能力。

| 场景                                | 推荐 npm 包                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 历史兼容包                                                                                                                                               | 版本策略 | 说明                                                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core 底座                           | [`@file-viewer/core`](https://www.npmjs.com/package/@file-viewer/core)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 无                                                                                                                                                       | `latest` | 框架无关的格式矩阵、预览能力、资源加载、生命周期事件、搜索、缩放、打印、导出和操作 API                                                                                  |
| PPTX 原生引擎                       | [`@file-viewer/pptx`](https://www.npmjs.com/package/@file-viewer/pptx)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 无                                                                                                                                                       | `latest` | 从 Flyfish 历史稳定实现拆出的独立 PPTX 渲染引擎，Worker 渐进解析，由 `@file-viewer/renderer-presentation` 按需加载                                                     |
| 二进制 PPT 运行时                    | [`@file-viewer/ppt`](https://www.npmjs.com/package/@file-viewer/ppt)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 无                                                                                                                                                       | `0.3.3`  | 独立版本的演示文稿依赖；Demo、Full 资产与 CDN/IIFE 会交付其经过校验的公开运行时                                                                       |
| Word renderer                       | [`@file-viewer/renderer-word`](https://www.npmjs.com/package/@file-viewer/renderer-word)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 无                                                                                                                                                       | `latest` | 标准 renderer 插件，承接 DOCX/DOC/DOT/RTF/ODT 链路，内部按需加载 `@file-viewer/docx`、`msdoc-viewer` 和 `rtf.js`，core-only 安装不再拉取 Word 重依赖                  |
| 演示文稿 renderer                   | [`@file-viewer/renderer-presentation`](https://www.npmjs.com/package/@file-viewer/renderer-presentation)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 无                                                                                                                                                       | `latest` | 二进制 `.ppt` 路由到 `@file-viewer/ppt`，OpenXML 演示文稿路由到 `@file-viewer/pptx`，按需提供缩放、打印和导出                                                           |
| 绘图 renderer                       | [`@file-viewer/renderer-drawing`](https://www.npmjs.com/package/@file-viewer/renderer-drawing)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 无                                                                                                                                                       | `latest` | 标准 renderer 插件，提供 Draw.io / diagrams.net 离线 viewer、Excalidraw 只读 SVG、Mermaid 官方 SVG 渲染、PlantUML SVG 服务接入、Panzoom 拖拽缩放、打印和 HTML 导出 |
| 3D 模型 renderer                    | [`@file-viewer/renderer-3d`](https://www.npmjs.com/package/@file-viewer/renderer-3d)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 无                                                                                                                                                       | `latest` | 标准 renderer 插件，基于 Three.js loaders 提供 GLTF/GLB、OBJ、STL、PLY、FBX、DAE、3DS、3MF、USD/USDZ、点云和 VTK 等按需 WebGL 预览                                    |
| 数据资产 renderer                   | [`@file-viewer/renderer-data`](https://www.npmjs.com/package/@file-viewer/renderer-data)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 无                                                                                                                                                       | `latest` | 标准 renderer 插件，基于 `ag-psd`、`sql.js`、`hyparquet`、`avsc`、FontFace 和 WebAssembly Module 提供 PSD、SQLite、Parquet、Avro、字体、WASM、AI/EPS、WebArchive 预览 |
| EDA renderer                        | [`@file-viewer/renderer-eda`](https://www.npmjs.com/package/@file-viewer/renderer-eda)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 无                                                                                                                                                       | `latest` | 标准 renderer 插件，提供 OLB、DRA、GDSII、OASIS 结构预览，标准 GDSII 可生成 SVG/WebGL 版图预览，OASIS 文本夹具可生成 SVG，真实二进制 OASIS 保持结构诊断边界                  |
| 轻量 renderer preset                | [`@file-viewer/preset-lite`](https://www.npmjs.com/package/@file-viewer/preset-lite)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 无                                                                                                                                                       | `latest` | 一次装配文本、Markdown、代码、图片、音频和视频预览，适合常见轻附件场景                                                                                                |
| Office renderer preset              | [`@file-viewer/preset-office`](https://www.npmjs.com/package/@file-viewer/preset-office)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 无                                                                                                                                                       | `latest` | 一次装配 PDF、Word、Excel、PowerPoint、OFD、RTF 和 OpenDocument 文档链路                                                                                             |
| 工程 renderer preset                | [`@file-viewer/preset-engineering`](https://www.npmjs.com/package/@file-viewer/preset-engineering)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 无                                                                                                                                                       | `latest` | 一次装配 CAD、3D、绘图、XMind、Geo、Typst、Archive、Data 和 EDA 工程附件链路                                                                                          |
| 全量 renderer preset                | [`@file-viewer/preset-all`](https://www.npmjs.com/package/@file-viewer/preset-all)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 无                                                                                                                                                       | `latest` | 一次装配 Word、PDF、OFD、PPTX、CAD、Draw.io/Excalidraw/Mermaid/PlantUML、Typst、XMind、压缩包、邮件、电子书、代码/Markdown/Patch/Git Bundle、图片、音视频和 core 其余完整格式能力 |
| Vite 按需装配插件                   | [`@file-viewer/vite-plugin`](https://www.npmjs.com/package/@file-viewer/vite-plugin)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 无                                                                                                                                                       | `latest` | 免配置自动发现已安装 `@file-viewer/preset-*` 并激活对应能力；也可按 `formats`、`renderers` 或源码 hint 生成 `virtual:file-viewer-renderers`，只 import 命中的 renderer 包，并提供 renderer chunk 分组和 PDF/OFD/CAD/Drawing/Typst/Archive/Data 离线资产路线 |
| 独立 renderer 包                    | [`@file-viewer/renderer-word`](https://www.npmjs.com/package/@file-viewer/renderer-word)、[`@file-viewer/renderer-pdf`](https://www.npmjs.com/package/@file-viewer/renderer-pdf)、[`@file-viewer/renderer-ofd`](https://www.npmjs.com/package/@file-viewer/renderer-ofd)、[`@file-viewer/renderer-presentation`](https://www.npmjs.com/package/@file-viewer/renderer-presentation)、[`@file-viewer/renderer-cad`](https://www.npmjs.com/package/@file-viewer/renderer-cad)、[`@file-viewer/renderer-drawing`](https://www.npmjs.com/package/@file-viewer/renderer-drawing)、[`@file-viewer/renderer-3d`](https://www.npmjs.com/package/@file-viewer/renderer-3d)、[`@file-viewer/renderer-data`](https://www.npmjs.com/package/@file-viewer/renderer-data)、[`@file-viewer/renderer-eda`](https://www.npmjs.com/package/@file-viewer/renderer-eda)、[`@file-viewer/renderer-typst`](https://www.npmjs.com/package/@file-viewer/renderer-typst)、[`@file-viewer/renderer-archive`](https://www.npmjs.com/package/@file-viewer/renderer-archive)、[`@file-viewer/renderer-email`](https://www.npmjs.com/package/@file-viewer/renderer-email)、[`@file-viewer/renderer-epub`](https://www.npmjs.com/package/@file-viewer/renderer-epub)、[`@file-viewer/renderer-text`](https://www.npmjs.com/package/@file-viewer/renderer-text)、[`@file-viewer/renderer-image`](https://www.npmjs.com/package/@file-viewer/renderer-image)、[`@file-viewer/renderer-media`](https://www.npmjs.com/package/@file-viewer/renderer-media)、[`@file-viewer/renderer-mindmap`](https://www.npmjs.com/package/@file-viewer/renderer-mindmap)、[`@file-viewer/renderer-geo`](https://www.npmjs.com/package/@file-viewer/renderer-geo) | 无                                                                                                                                                       | `latest` | 用于按需安装 Word、重型版式、文本阅读、图片、媒体、3D、数据资产、EDA 和地理数据链路，避免业务只看轻量格式时安装 DOCX/DOC/PDF/OFD/PPTX/CAD/Draw.io/Excalidraw/Mermaid/PlantUML/Typst/压缩包/邮件/EPUB/XMind/OLB/DRA/GDS/OASIS/GeoJSON/KML/GPX/SHP/PSD/SQLite/Patch/Git Bundle/代码高亮/HEIC/HLS/MIDI 依赖 |
| Vanilla JS / Pure Web / script 标签 | [`@file-viewer/web`](https://www.npmjs.com/package/@file-viewer/web)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | [`@flyfish-group/file-viewer-web`](https://www.npmjs.com/package/@flyfish-group/file-viewer-web)                                                         | `latest` | `mountViewer(container, options)`、Custom Element、IIFE、资源复制 CLI、Worker/WASM 自托管工具                                                                           |
| Vue3                                | [`@file-viewer/vue3`](https://www.npmjs.com/package/@file-viewer/vue3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | [`@flyfish-group/file-viewer3`](https://www.npmjs.com/package/@flyfish-group/file-viewer3)、[`file-viewer3`](https://www.npmjs.com/package/file-viewer3) | `latest` | Vue3 原生组件、插件安装、props、事件、ref/controller 和完整类型                                                                                                         |
| Vue2.7                              | [`@file-viewer/vue2.7`](https://www.npmjs.com/package/@file-viewer/vue2.7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | [`@flyfish-group/file-viewer`](https://www.npmjs.com/package/@flyfish-group/file-viewer)                                                                 | `latest` | Vue2.7 原生组件，能力和 Vue3 保持一致                                                                                                                                   |
| Vue2.6                              | [`@file-viewer/vue2.6`](https://www.npmjs.com/package/@file-viewer/vue2.6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 无                                                                                                                                                       | `latest` | Vue2.6 专线，面向仍停留在 Vue 2.6 的老项目                                                                                                                              |
| React 18/19                         | [`@file-viewer/react`](https://www.npmjs.com/package/@file-viewer/react)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | [`@flyfish-group/file-viewer-react`](https://www.npmjs.com/package/@flyfish-group/file-viewer-react)                                                     | `latest` | React 原生组件和 hooks/controller，不通过 Vue 或 iframe 转接                                                                                                            |
| React 16.8/17                       | [`@file-viewer/react-legacy`](https://www.npmjs.com/package/@file-viewer/react-legacy)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 无                                                                                                                                                       | `latest` | 面向旧 React 项目的兼容组件包                                                                                                                                           |
| jQuery                              | [`@file-viewer/jquery`](https://www.npmjs.com/package/@file-viewer/jquery)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 无                                                                                                                                                       | `latest` | jQuery 插件式接入，适合传统后台系统                                                                                                                                     |
| Svelte                              | [`@file-viewer/svelte`](https://www.npmjs.com/package/@file-viewer/svelte)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 无                                                                                                                                                       | `latest` | Svelte 组件、action 和类型入口                                                                                                                                          |

生态边界很清楚: `@file-viewer/core` 只负责底层预览能力和 API；各标准组件包只依赖 core 和自己的框架依赖，不嵌套其他框架实现；历史兼容包只负责旧包名继续可用，不建议新项目优先选择。

文件列表需要批量生成缩略图时，可安装独立的 `@file-viewer/thumbnail`。它会先复用 EPUB 封面、OOXML/OpenDocument/3MF 缩略图、XMind 预览图、Numbers Quick Look 图片等包内资源，再回退到浏览器 renderer、固定并发 viewer 池和可选的原生 thumbnail adapter，默认输出 `320 × 240` WebP；`generateBatch()` 保持输入顺序，`generateStream()` 支持边生成边上传。该包不会把截图或压缩包依赖加入 core，也不会持久化源文件或结果。

常见安装方式:

```bash
pnpm add @file-viewer/web
pnpm add @file-viewer/vue3
pnpm add @file-viewer/react
pnpm add @file-viewer/core
pnpm add @file-viewer/thumbnail
pnpm add @file-viewer/renderer-word
pnpm add @file-viewer/pptx
```

如果你在内网、离线环境，或者 npm 发布权限还没有完成配置，也可以直接使用开源总仓库 `artifacts/` 里的 release tarball。离线安装 React 包时请先安装同版本 web 包:

```bash
npm install ./artifacts/file-viewer-core-*.tgz
npm install ./artifacts/file-viewer-pptx-*.tgz
npm install ./artifacts/file-viewer-renderer-word-*.tgz
npm install ./artifacts/file-viewer-web-*.tgz
npm install ./artifacts/file-viewer-vue3-*.tgz
npm install ./artifacts/file-viewer-vue2.7-*.tgz
npm install ./artifacts/file-viewer-vue2.6-*.tgz
npm install ./artifacts/file-viewer-react-*.tgz
npm install ./artifacts/file-viewer-react-legacy-*.tgz
npm install ./artifacts/file-viewer-jquery-*.tgz
npm install ./artifacts/file-viewer-svelte-*.tgz
npm install ./artifacts/flyfish-group-file-viewer3-*.tgz
npm install ./artifacts/flyfish-group-file-viewer-*.tgz
npm install ./artifacts/flyfish-group-file-viewer-web-*.tgz
npm install ./artifacts/flyfish-group-file-viewer-react-*.tgz
```

Core、PPTX 原生引擎、Vanilla JS / Pure Web、Vue3、Vue2、React、React legacy、jQuery、Svelte 和历史兼容 tarball 都会随开源总仓库一起生成。二进制 PPT 使用独立版本的 `@file-viewer/ppt@0.3.3`；Demo、full 资产包与 CDN/IIFE 会交付其匹配的公开运行时文件。`file-viewer3` 非 scoped 兼容包仍会同步发布到 npm，但它和 `@flyfish-group/file-viewer3` 包体重复，开源总仓库不再重复存储该 tarball。非 Vite full 项目使用随包安装的同版本 CLI 发布完整资源：`npx --no-install file-viewer-copy-assets ./public/file-viewer`；`web-full` 完整部署其 `dist/` 也可直接使用。

GitHub Release 会同步提供完整下载项:

| 文件                                     | 用途                                                            |
| ---------------------------------------- | --------------------------------------------------------------- |
| `file-viewer-v2-*-official-demo-iframe.tar.gz` | 官方 Demo 零依赖 iframe 交付包，包含 `iframe.html`、兼容原主 Demo 的 `index.html`、示例父页面、说明文件、样例和离线 Worker/WASM/vendor 资源 |
| `file-viewer-v2-*-demo.tar.gz`           | 主 Demo 静态站，解压后即可体验主预览、`/iframe.html` 嵌入入口和 `/compare.html` 文档比对 |
| `file-viewer-v2-*-component-demo.tar.gz` | Vanilla JS / React 原生组件演示站                               |
| `file-viewer-v2-*-lib-dist.tar.gz`       | Vue3 组件库构建产物，适合离线检查 dist 内容                     |
| `file-viewer-v2-*-docs.tar.gz`           | 文档站静态产物                                                  |
| `file-viewer-core-*.tgz`                 | `@file-viewer/core` 纯 TypeScript 底座本地 npm 安装包           |
| `file-viewer-pptx-*.tgz`                 | `@file-viewer/pptx` 原生 PPTX 渲染引擎本地 npm 安装包           |
| `file-viewer-vue3-*.tgz`                 | Vue3 标准包名本地 npm 安装包                                    |
| `file-viewer-vue2.7-*.tgz`               | Vue2.7 标准组件包 本地 npm 安装包                               |
| `file-viewer-vue2.6-*.tgz`               | Vue2.6 标准组件包 本地 npm 安装包                               |
| `file-viewer-react-*.tgz`                | React 18/19 标准组件包 本地 npm 安装包                          |
| `file-viewer-react-legacy-*.tgz`         | React 16.8/17 标准组件包 本地 npm 安装包                        |
| `file-viewer-web-*.tgz`                  | 纯 Web 标准组件包，本地安装后可复制 Worker/WASM viewer assets   |
| `file-viewer-jquery-*.tgz`               | jQuery 标准组件包 本地 npm 安装包                               |
| `file-viewer-svelte-*.tgz`               | Svelte 标准组件包 本地 npm 安装包                               |
| `flyfish-group-file-viewer3-*.tgz`       | Vue3 本地 npm 安装包                                            |
| `flyfish-group-file-viewer-*.tgz`        | Vue2.7 本地 npm 安装包                                          |
| `flyfish-group-file-viewer-web-*.tgz`    | 纯 JS 历史兼容包，提供 `mountViewer` 原生挂载和资源复制工具     |
| `flyfish-group-file-viewer-react-*.tgz`  | React 历史兼容包，提供原生 React 组件入口                       |

客户只想把官方 Demo 当成独立页面嵌入时，优先下载 `file-viewer-v2-*-official-demo-iframe.tar.gz`。解压后把整个目录发布到同一个静态路径，然后使用:

```html
<iframe
  src="/file-viewer/iframe.html?url=/files/demo.docx"
  style="width:100%;height:720px;border:0"
  allow="fullscreen"
></iframe>
```

如果文件只能由父页面接口取回，可使用包内 `iframe-example.html` 展示的 `postMessage(Blob)` 方案: `iframe.html?from=<父页面 origin>&name=<文件名>` 会保持无 Demo 外壳状态，收到父页面传入的 `Blob` 后按指定文件名预览。原主 Demo `index.html` 使用同一套协议，已有 `index.html?from=...&name=...` 集成不需要迁移。

`file-viewer3` 非 scoped 历史兼容包仍会走 npm 发布链路；开源总仓库下载区使用 `flyfish-group-file-viewer3-*.tgz` 作为 Vue3 兼容 tarball，避免重复存储相同包体。

如果 npm 11 安装 tgz 或依赖时报 `Cannot read properties of null (reading 'matches')`，通常不是 File Viewer 版本不匹配，而是 npm 在混用包管理器后的 `node_modules` symlink 上触发 Arborist 内部错误。请删除 `node_modules` 和当前锁文件后，用同一个包管理器重新安装；离线 tgz 场景请确保同版本 core、preset、renderer 和组件包能从私有 npm 源或本地 tarball 依赖闭包解析。项目发布前可运行 `pnpm verify:npm-install-smoke`，它会用 npm 11.17.0 验证 registry 与 tgz 安装。

<!-- FILE_VIEWER_PUBLIC_GENERATED:START -->
## 标准生态包与公开仓库

下面内容由 `ecosystem/wrappers.json` 和 `ecosystem/format-catalog.json` 自动生成。开源总仓库同步 README 时会携带同一份索引，确保用户可以从任意入口找到标准 npm 包、历史兼容包、分散组件仓库和 release 下载物。

核心底座包: `@file-viewer/core`。core 源码已公开，GitHub: https://github.com/flyfish-dev/file-viewer-core，Gitee: https://gitee.com/flyfish-dev/file-viewer-core。开源总仓库提供可运行的主 Demo 源码、core、标准组件包、兼容包、文档源码和 release 索引；官方 Demo iframe 交付包、完整 Demo、component demo、文档站和样例构建产物通过 GitHub Release 或 Cloudflare Pages 分发，避免普通 clone 被静态产物拖大。私有 Gitea `main` 是完整原始聚合仓，用于统一自动化、内部集成历史、打赏支持和优先技术支持，不等同于 GitHub 开源总仓库。

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

## 工程级按需 renderer 装配

快速开始的核心是先跑通组件，再明确格式能力边界。推荐先安装当前生态组件包，再按产品形态选择 `@file-viewer/preset-lite`、`@file-viewer/preset-office`、`@file-viewer/preset-engineering` 或 `@file-viewer/preset-all`。Webpack、Rspack、Rollup、Umi、传统多页应用等非 Vite 项目，优先通过 `options.preset` 或 `options.renderers` 显式注入能力；Vite 插件只是进一步省掉手动 import 并复制离线资产。

```bash
npm i @file-viewer/vue3 @file-viewer/preset-office
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
npm i @file-viewer/vue3 @file-viewer/preset-all
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

### 组件属性与工具栏定制摘要

每个生态包都暴露原生接入方式。Vanilla JS / Pure Web 优先面向非框架、Custom Element 和 script 标签场景；Vue3 保持轻量声明式 props；React、Svelte、jQuery 和 Vue2 适合需要 `buffer`、`name`、`type`、`size` 等命令式挂载参数的场景。完整示例见官方文档: https://doc.file-viewer.app/guide/ecosystem

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

### 样式隔离与主题定制

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

内置工具栏可直接使用，也可以通过 `toolbar:false` 进入 headless 操作模式，自行用组件 ref、hook、controller、action 或 jQuery plugin method 组装业务工具栏。

| 工具栏配置 | 说明 |
| --- | --- |
| `toolbar: false` | 隐藏内置工具栏，但不关闭下载、打印、导出、缩放等 controller API，适合完全自定义业务工具栏。 |
| `toolbar: true` | 使用默认内置工具栏；主题切换默认显示，下载、打印、HTML 导出和缩放按钮按能力动态显隐。 |
| `download` / `print` / `exportHtml` / `zoom` | 表达业务是否允许展示对应按钮；最终仍会结合文件类型、渲染完成状态、导出适配器和缩放 provider 计算真实可用性。 |
| `theme` | 控制浅色/深色切换按钮，默认 `true`；切换后触发 `theme-change`，传 `false` 可隐藏。 |
| `order` | 设置内置分组顺序，可使用 `search`、`zoom`、`download`、`print`、`exportHtml`、`theme`；遗漏项保持默认相对顺序。 |
| `position` | `auto`、`top`、`top-center`、`bottom-right`。默认 `auto`，PDF 自动悬浮右下角，其他格式保持顶部靠右；需要顶部水平居中时传 `top-center`。 |
| `beforeOperation` | 工具栏层统一前置校验，会在 `options.beforeOperation` 后执行。返回 `false` 或抛错都会取消本次操作。 |
| `beforeDownload` / `beforePrint` / `beforeExportHtml` | 单按钮前置校验；适合下载权限、打印审计、导出水印确认等细粒度业务规则。 |

缩放状态由各格式 renderer 的内部 provider 上报。首屏自适应、容器尺寸变化或 PDF / Word / 图片等异步布局完成后，内置工具栏会显示真实缩放比例，而不是固定显示 `100%`；自定义工具栏也应监听 `zoom-change` / `operation-availability-change`，或读取 `getZoomState()` / `getOperationAvailability()`。

视图状态同步用于投屏、双端协同和恢复阅读进度。所有通过标准 renderer loader 挂载的格式都会获得通用 view-state provider，至少能记录 `renderer`、当前缩放和滚动位置；PDF、XMind、Geo、3D、CAD 等高交互路径会补充页码、导航、画布 pan、地图中心、相机视角或底层视图快照。初始化可传 `options.initialViewState`，运行中监听 `view-state-change`；Pure Web / Vue3 controller 可直接调用 `getViewState()` 和 `applyViewState(state, { source: "api", action: "restore" })`。

生态当前维护 57 个 npm 发布目标（51 个标准包 + 6 个历史兼容包）；格式目录声明 32 条预览链路、221 个扩展名（已注册），其中 221 个稳定、0 个实验。格式说明见官方文档: https://doc.file-viewer.app/guide/formats
<!-- FILE_VIEWER_PUBLIC_GENERATED:END -->

## 支持项目与商业版

Flyfish Viewer 会持续保持 Apache-2.0 开源。GitHub Sponsors 适合一次性或持续赞助，国内用户也可通过微信或支付宝请我们喝杯柠檬水。赞助用于开源维护，不影响开源功能；私有化交付、定制适配或需要明确响应时间的需求，请使用企业技术支持入口。

- GitHub Sponsors: [github.com/sponsors/wybaby168](https://github.com/sponsors/wybaby168)
- 微信 / 支付宝赞赏: [dev.flyfish.group/sponsor?source=github](https://dev.flyfish.group/sponsor?source=github)
- 企业技术支持: [dev.flyfish.group/shop](https://dev.flyfish.group/shop)
- 商业版介绍: [product.flyfish.group](https://product.flyfish.group/)
- 商业版 Demo: [office.flyfish.dev](https://office.flyfish.dev/)
- 飞鱼开源工作室: [flyfish.dev](https://flyfish.dev/)

### 感谢以下赞助者

感谢你对 File Viewer 兼容性修复、文档完善和持续发布工作的支持。

<p align="center">
  <a href="https://github.com/p4535992" title="在 GitHub 查看 @p4535992">
    <img src="docs/public/_media/sponsors/sponsors.svg" width="320" alt="GitHub 赞助者 @p4535992" />
  </a>
</p>

| 微信赞赏码                                                                       | 支付宝收款码                                                                | 微信公众号二维码                                                                                     | 用户交流群                                                                                           |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| <img src="docs/_media/support/wechat-reward.jpg" width="150" alt="微信赞赏码" /> | <img src="docs/_media/support/alipay.jpg" width="150" alt="支付宝收款码" /> | <img src="docs/_media/support/wechat-mp.png" width="150" alt="飞鱼开源 WorkShop 微信公众号二维码" /> | <img src="docs/_media/support/invite.webp" width="150" alt="File Viewer 用户交流群二维码" /> |

商业版来自 Flyfish Office 产品线，面向严肃企业场景提供自研原生 Office 文档引擎，重点解决 Word、Excel、PowerPoint 在复杂版式、大文件、分页布局、高保真渲染和稳定性能上的更高要求。开源版会继续维护，商业支持主要用于更快响应、私有化评估和定制交付。

## Demo 与 Docker

本仓库保留多个可运行演示入口:

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 主 Demo，和 [demo.file-viewer.app](https://demo.file-viewer.app) 使用同一条链路 |
| `pnpm dev:components` | Vanilla JS、Vue、React、Svelte、jQuery 生态组件演示 |
| `pnpm build:component-demo` | 构建组件演示静态产物 |
| `pnpm docs:dev` | 启动文档站 |

Docker 适合内网、私有云、客户现场或希望直接运行完整 Demo 的场景:

```bash
docker run -d \
  --name flyfish-viewer \
  --restart unless-stopped \
  -p 8080:80 \
  flyfishdev/file-viewer:latest
```

访问:

- 主预览: `http://localhost:8080/`
- iframe 嵌入: `http://localhost:8080/iframe.html?url=/example/word.docx`
- 文档比对: `http://localhost:8080/compare.html`

源码仓库内也提供 `Dockerfile`，本地构建运行:

```bash
pnpm docker:build
docker run --rm -p 8080:80 flyfishdev/file-viewer:latest
```

## 使用说明

- 组件支持两条主要输入路径: `url?: string` 与 `file?: File`
- 官方零依赖 iframe 入口位于 `/iframe.html`，支持 `?url=` 直接传文件地址，也支持 `?from=<父页面 origin>&name=<文件名>` 后由父页面 `postMessage(Blob)` 传文件数据；原主 Demo `/index.html` 保留同一套协议，完整说明见 [Demo 文档](docs/guide/demo.md#demo-文件传入协议)
- 独立文档比对页位于 `/compare.html`，可通过 `?left=/example/test.doc&right=/example/word.docx` 预置左右文件；它支持同步滚动、当前聚焦文档的浮层搜索、高亮命中、上一个 / 下一个、行级定位和 PDF 工具栏隐藏，但只做视觉并排预览，不做语义 diff，完整说明见 [Demo 文档](docs/guide/demo.md#文档比对页)
- 当 `file` 和 `url` 同时存在时，会优先渲染 `file`
- 如果业务侧拿到的是 `Blob` 或 `ArrayBuffer`，推荐先包装成带扩展名的 `File`
- 预览器会填满父容器，请为父容器提供稳定高度
- 使用 `url` 预览时，目标资源需要允许浏览器访问；跨域场景下需要正确配置 CORS
- 如果下载地址本身没有明确扩展名，建议先在业务侧取回文件，再包装成 `File`
- PPTX 渲染器已拆分为独立包 `@file-viewer/pptx` / `flyfish-dev/pptxjs`，会尽量还原常见组合图形、旋转/翻转、主题背景、图片裁剪和 EMF 矢量图片；内网、严格 CSP、自托管 CDN 或旧 WebView 可通过 `options.presentation.workerUrl` / `options.presentation.workerType` 固定 PPTX Worker；复杂 Office 特效仍建议用真实业务文件做回归
- OFD、Typst、XMind、压缩包、邮件、OLB/DRA/GDS/OASIS、CAD、地理数据、3D 模型、绘图、EPUB、UMD、PDF、Office、Markdown、音视频、HLS、HEIC、字体/数据资产和代码高亮渲染器都按需异步加载，只有命中格式时才拉取对应代码块；Typst compiler / renderer WASM 和默认字体可通过 `options.typst.compilerWasmUrl`、`options.typst.rendererWasmUrl`、`options.typst.fontAssetsUrl` 指向自托管地址，默认仅在打开 `.typ` / `.typst` 时加载
- 普通业务优先通过 `options.preset` 装配 `@file-viewer/preset-lite`、`@file-viewer/preset-office`、`@file-viewer/preset-engineering` 或 `@file-viewer/preset-all`；多个能力包直接使用 `preset: [officePreset, engineeringPreset]`。`builtinRenderers` 仅作为高级基线控制或历史兼容开关保留；UMD / EPUB 电子书均由 `@file-viewer/renderer-epub` 按需提供
- `options.ui.density` 支持 `comfortable` 和 `compact`。默认 `comfortable` 保持历史间距；`compact` 会收紧工具栏、压缩包目录、嵌套预览头部、徽标、小按钮和搜索输入等操作界面，适合效率型附件中心或数据密集后台
- `options.text.toolbar: false` 可隐藏文本 renderer 内部的文件类型、索引状态和行数元信息栏，不影响 Viewer 全局工具栏。普通文本和代码可通过 `options.text.lineNumbers: true` 显示行号，行号不会混入复制、搜索或无障碍朗读。文本和代码超过 `options.text.virtualizeAboveBytes`（默认 512 KiB）时会自动启用稀疏索引和有界虚拟行；Markdown 默认始终保持排版后的阅读视图，只有显式设置 `markdownVirtualizeAboveBytes` 时才会在超限后切换为有界源码视图。全文搜索仍覆盖完整源文件；超长单行按 `maxRenderedLineBytes`（默认 16 KiB）分段浏览，可用 `virtualOverscanLines` 调整可视区缓冲行数
- `options.archive` 一般只需要配置 `cache`、`workerTimeoutMs` 和体积上限；需要控制压缩包内部文件的下载按钮时，可用 `archive.entryActions.download: false` 全局隐藏，或传 `(entry) => boolean` 按路径、扩展名、大小等元数据判断。这个选项只影响内部条目，不会关闭顶层 viewer 下载原始压缩包的动作。预览器会先尝试当前部署 base 下的 `vendor/libarchive/worker-bundle.js`。手机 WebView、本地临时服务器、MIME 或 CSP 导致 Worker 初始化超时时，会继续降级到 ZIP/TAR/GZIP 兼容模式，避免压缩包一直停在 loading。只有静态目录、CDN 路径或 WASM 位置特殊时，才需要显式传 `archive.workerUrl` / `archive.wasmUrl`
- 表格列宽拖拽通过 `options.spreadsheet.resizableColumns: true` 显式开启，默认关闭以保持历史交互兼容；官方 Demo 默认开启，方便查看被截断的长文本
- `options.theme` 支持 `light`、`dark`、`system`，默认继续跟随系统；DOCX 由 `@file-viewer/renderer-word` 内部 `@file-viewer/docx` 自动选择 Worker 或主线程解析，HTTP/HTTPS 默认 Worker，Electron `file://` 等本地不安全协议自动回退，真实浏览器 DOM 渲染、连续流式阅读、目录字段缓存和异步分批挂载，可通过 `options.docx.workerUrl`、`options.docx.workerJsZipUrl` 覆盖离线资源路径；如业务明确需要页式预览，可显式设置 `options.docx.visualPagination: true`；Excel/XLSX 默认使用 `options.spreadsheet.worker: 'auto'`，小文件走主线程兼容路径，大文件达到 `options.spreadsheet.workerAutoThreshold`（默认 1MB）后自动尝试 `vendor/xlsx/sheet.worker.js`，静态目录特殊时再传 `options.spreadsheet.workerUrl`，不希望自动启用时设为 `worker: false`；PDF 默认探测站点根路径的 PDF.js Worker，可用时使用真实 Worker，不存在或被回退成 HTML 时自动懒加载包内 worker handler 兜底，`options.pdf.workerUrl` 可覆盖为内网、离线或严格 CSP 的自托管地址；`options.watermark` 支持文字或图片水印；`options.toolbar` 可控制下载原文件、打印完整渲染结果、导出 HTML、统一缩放按钮和操作栏位置，`toolbar.zoom` 可单独控制缩放按钮显示，`toolbar.position` 支持 `auto`、`top`、`top-center`、`bottom-right`，PDF 默认悬浮到右下角以避开自身导航栏；统一缩放通过渲染器内部 provider 适配 PDF、Word、PPTX、Excel 虚拟表格、图片、CAD、OFD、Typst、Markdown、代码和绘图等链路，首屏自适应后的 `zoom-change` 会返回真实比例，避免业务侧外层 CSS 缩放或默认缓存 `100%` 造成表格坐标、canvas 交互或工具栏状态偏移；Excel 多 sheet 时标签栏按内容宽度展示并横向滚动，不会被平均压缩；`options.pdf.toolbar` 可隐藏 PDF 自身页码缩放工具栏；`options.search` 可控制搜索高亮、整词/大小写和命中数量；`options.ai` 可开启文本切片结构，返回行号、页码、锚点和 label 等溯源字段，便于业务侧做向量化、召回、AI 摘要、高亮回填和来源定位；`options.hooks` 可接收加载/卸载生命周期；`options.beforeOperation` 可在下载、打印、导出和缩放前做权限校验；打印按钮会结合当前文件类型、渲染完成状态和导出适配器动态显隐，Word / PDF 会生成完整页面，Excel 等虚拟表格会隐藏打印按钮，避免只打印当前视口或第一页

```ts
const blob = await response.blob()
const file = new File([blob], 'contract.pdf', { type: blob.type })
```

## 本地开发

下面的命令适用于开源总仓库和私有 Gitea 完整聚合仓。GitHub / Gitee 会公开 core、独立渲染引擎包、Demo、标准组件包、兼容包和文档站源码；私有 Gitea 提供完整聚合仓、统一发布脚本、内部自动化和优先技术支持。普通用户仍建议优先通过 npm、开源总仓库 `dist/` 或 `artifacts/` 里的 tarball 使用。

```bash
pnpm install
pnpm dev
```

常用脚本:

- `pnpm build`: 构建示例站点
- `pnpm build:vue3`: 构建 Vue3 标准组件包产物
- `pnpm docs:dev`: 启动 Fumadocs + Next.js 文档站
- `pnpm docs:build`: 构建文档站
- `pnpm type-check`: 执行 TypeScript 类型检查
- `pnpm dev:components`: 启动 React + 纯 JS 组件 Demo
- `pnpm build:component-demo`: 构建 组件 Demo
- `pnpm docker:build`: 构建本机架构 Docker 镜像
- `pnpm docker:publish`: 推送 Docker Hub `linux/amd64` / `linux/arm64` 多架构镜像；可通过 `DOCKER_IMAGE` 替换命名空间
- `pnpm release:ecosystem:list`: 列出当前完整生态 npm 发布目标
- `pnpm release:ecosystem:pack`: 构建并打包 core、标准组件包 和历史兼容 npm tarball

## 打包发布

Vue3 和 Vue2 发包时分别在对应分支执行同一套发布链路:

| 包         | 分支                                 | npm 名称                                                                                                                    |
| ---------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Vue3       | `v3`                                 | `@flyfish-group/file-viewer3`                                                                                               |
| Vue2.7     | `v2`                                 | `@flyfish-group/file-viewer`                                                                                                |
| Core       | `packages/core` / `file-viewer-core` | `@file-viewer/core`                                                                                                         |
| React      | 当前仓库子工程                       | `@file-viewer/react` / `@flyfish-group/file-viewer-react`                                                                   |
| 纯 JS      | 当前仓库子工程                       | `@file-viewer/web` / `@flyfish-group/file-viewer-web`                                                                       |
| 其他组件包 | 当前仓库子工程                       | `@file-viewer/vue2.7` / `@file-viewer/vue2.6` / `@file-viewer/react-legacy` / `@file-viewer/jquery` / `@file-viewer/svelte` |

建议在发布前执行下面这组命令:

```bash
pnpm type-check
pnpm build
pnpm build:vue3
pnpm obfuscate
pnpm docs:build
pnpm release:ecosystem:pack
```

其中:

- `apps/viewer-demo/dist/` 是正式在线 Demo 和文档比对页的部署产物
- `packages/components/vue3/dist/` 是 Vue3 标准组件包构建产物；执行 `pnpm obfuscate` 后会对其中的 `.js` / `.mjs` 进行压缩混淆
- `pnpm build` 会生成可独立部署的 Demo 静态站点产物
- `apps/docs-site/out/` 是 Fumadocs / Next.js 文档站静态产物
- `npm pack` 会生成可直接发布或分发的 npm 包 tarball

如果只是准备 npm 包，可以直接执行:

```bash
pnpm release:ecosystem:pack
```

完整生态包发布前执行:

```bash
pnpm type-check:components
pnpm build:component-demo
pnpm release:ecosystem:list
pnpm release:ecosystem:pack
pnpm release:ecosystem:publish:dry-run
pnpm release:ecosystem:publish
```

发布到 npm:

```bash
npm publish --dry-run --access public
npm publish --access public
```

如果 npm 账号启用了 MFA，请使用交互式终端完成浏览器确认后再等待发布结果。

开源总仓库会提交 core、Demo、标准组件包、兼容包和文档源码；完整 Demo、component demo、文档静态站和样例构建产物改由 GitHub Release 或 Cloudflare Pages 分发，避免普通 clone 被大体积静态产物拖慢。为避免 Gitee 因历史二进制膨胀超过 1GB，同步 Gitee 时会使用最新源码快照的干净历史。私有 Gitea 仍作为完整聚合仓，保留统一发布脚本和内部集成历史。需要支持开源维护的用户可使用 [GitHub Sponsors](https://github.com/sponsors/wybaby168) 或 [微信 / 支付宝](https://dev.flyfish.group/sponsor?source=github)；需要私有化、定制或明确响应时间时，请使用 [企业技术支持](https://dev.flyfish.group/shop)。

## 文档导航

- [文档导览](https://doc.file-viewer.app/guide/)
- [快速开始](https://doc.file-viewer.app/guide/quickstart)
- [Demo 说明](https://doc.file-viewer.app/guide/demo)
- [组件用法](https://doc.file-viewer.app/guide/usage)
- [支持格式](https://doc.file-viewer.app/guide/formats)
- [本地开发与打包](https://doc.file-viewer.app/guide/development)
- [Docker 部署](https://doc.file-viewer.app/guide/docker)

## 开源说明

本仓库编写的 File Viewer 源码和 release 软件包使用 `Apache-2.0` 许可证。完整发行物中的 `@file-viewer/ppt` 运行时保留自身独立 LICENSE 与 NOTICE；File Viewer 不会用 Apache-2.0 对它或其他依赖重新授权。

二开或商用时，请按许可证要求保留版权、许可证和来源说明，并注明项目来源为 File Viewer（`@flyfish-group/file-viewer3` 或 `@flyfish-group/file-viewer`）。如果你基于本项目修复了通用问题或增强了通用能力，也欢迎通过 issue / PR 一起贡献回来，让这套预览能力继续变得更稳。
