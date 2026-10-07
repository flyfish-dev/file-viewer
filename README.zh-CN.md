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
  <a href="README.md">English</a> · <strong>简体中文</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@file-viewer/core"><img src="https://img.shields.io/npm/v/@file-viewer/core?logo=npm" alt="npm version"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/releases"><img src="https://img.shields.io/github/v/release/flyfish-dev/file-viewer?logo=github" alt="Latest release"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/actions/workflows/public-ci.yml"><img src="https://github.com/flyfish-dev/file-viewer/actions/workflows/public-ci.yml/badge.svg?branch=main" alt="Public CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/source%20license-Apache--2.0-blue" alt="Source license: Apache-2.0"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@file-viewer/core"><img src="https://img.shields.io/npm/dm/@file-viewer/core?logo=npm&amp;label=core%20downloads%2Fmonth" alt="Core npm downloads per month"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/stargazers"><img src="https://img.shields.io/github/stars/flyfish-dev/file-viewer?style=flat&amp;logo=github" alt="GitHub stars"></a>
  <a href="https://hub.docker.com/r/flyfishdev/file-viewer"><img src="https://img.shields.io/docker/pulls/flyfishdev/file-viewer?logo=docker" alt="Docker pulls"></a>
  <a href="https://github.com/sponsors/wybaby168"><img src="https://img.shields.io/badge/sponsor-GitHub-ea4aaa?logo=githubsponsors" alt="GitHub Sponsors"></a>
</p>

<p align="center">
  <a href="https://demo.file-viewer.app"><img src="docs/public/_media/file-viewer-demo-v2.2.6-desktop-zh.webp" width="920" alt="File Viewer 浏览器原生 DOCX 预览工作区" /></a>
</p>

---

<details>
<summary>阅读目录</summary>

- [项目定位](#项目定位) · [当前版本与新增能力](#当前版本与新增能力) · [在线效果](#在线效果)
- [快速开始](#快速开始) · [支持格式](#支持格式) · [能力组合](#能力组合)
- [当前 npm 生态](#当前-npm-生态) · [标准生态包与公开仓库](#标准生态包与公开仓库)
- [工程级按需 renderer 装配](#工程级按需-renderer-装配) · [使用说明](#使用说明)
- [Demo 与 Docker](#demo-与-docker) · [本地开发](#本地开发) · [打包与部署](#打包与部署)
- [支持项目与商业版](#支持项目与商业版) · [开源说明](#开源说明)

</details>

## 项目定位

为了预览一份内部 DOCX 就把文件上传到第三方，既慢也不合适。File Viewer 把预览留在浏览器内，让企业后台、OA、知识库、工单、附件中心和工程资料库使用同一套 API，而不是继续拼接一堆互不一致的查看器。

当前内置 275 个已注册扩展名（225 个稳定、50 个实验）和 47 条预览链路。Office、PDF、OFD、Typst、CAD、STEP、XMind、压缩包、邮件、绘图、音视频、代码、Adobe 设计文件、字体、结构化数据、DICOM、数字签名容器和显式二进制检查器共享文件源、生命周期、搜索、缩放、打印、导出和下载契约；重型 Worker、WASM、字体与 vendor 资产保持按需加载，并可完全托管在自己的网络中。

源码新增显式启用的 [BPMN 流程图](docs/zh/guide/bpmn.md) 和 [XML 校验与转换配置](docs/zh/guide/xml-profiles.md)，尚未包含在 npm 3.1.1 中。Full 包的默认依赖和兼容范围不变。

新项目优先使用 `@file-viewer/*`；`@flyfish-group/*` 历史包继续同步维护。

## 当前版本与新增能力

当前稳定版为 [v3.1.1](https://github.com/flyfish-dev/file-viewer/releases/tag/v3.1.1)。本页说明当前源码的能力；主分支与在线 Demo 可能包含稳定版之后的修复，使用 npm 或 Release 归档时请按对应版本验证。

- 二进制检查器 `@file-viewer/renderer-binary` 提供十六进制、ASCII、字段树和字节范围联动，可检查 BIN、HEX、ELF、PE、Java Class 与 Mach-O 文件，只读分析，不执行文件。
- IFC 可通过 `@file-viewer/renderer-3d/ifc` 显式启用，提供本地几何预览、构件选择与属性查看；需要另行安装依赖并自托管 Worker/WASM，见 [IFC 接入说明](packages/renderers/3d/IFC.md)。
- Adobe 设计文件、DICOM、数字签名容器和二进制检查按需安装，不会悄悄进入现有 Full 包。签名的密码学检查结果与证书信任、策略符合性及法律有效性分别呈现。
- Vue 2.6/2.7、React 16.8/17 等旧项目仍有对应组件和示例；Full 包保持已发布的兼容范围，具体边界见下文。

## 亮点

- **一个组件起步。** Vanilla JS / Web Component 优先，并提供 Vue、React、Svelte、jQuery 原生组件。
- **矩阵可核验。** 275 个已注册扩展名（225 个稳定、50 个显式按需实验项）映射到 47 条预览链路，覆盖办公、工程、设计、数据、音视频、代码、DICOM、数字签名和二进制检查附件。
- **部署不出网。** 浏览器内解析和渲染，支持离线网络、Docker、私有 CDN 和完整资源自托管。
- **模块化。** 轻量组件、renderer、preset、full 包分层清晰，可以只安装需要的格式，也可以使用预置组合。
- **按需加载。** PDF、Office、CAD、Typst、压缩包、图纸、PSD、Mermaid 等重型能力只在命中格式时加载。
- **有界多页 TIFF。** CCITT Group 4 TIFF 在独立懒加载边界逐页解码，并支持整组缩放、旋转、适宽、页码状态和大图查看。
- **识别 Vite 版本。** Vite 5 至 7 继续使用 Rollup `manualChunks`；Vite 8 使用 Rolldown 分组，不覆盖业务已有分组和优先级。
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

![File Viewer 中文产品演示：在沉浸式工作台中预览特色 DOCX、PPTX、DWG 与可交互的三维 STEP 模型](docs/public/_media/file-viewer-demo-v2.2.6-formats-zh.gif)

打开 [demo.file-viewer.app](https://demo.file-viewer.app) 即可使用上图中的产品工作台：固定玻璃工具栏、点击文件名展开的样例库、本地最近打开记录、明暗主题、移动端单一“更多”入口，以及只让文档容器滚动的沉浸画布。内置样例覆盖 Word、Excel、二进制 PPT、PPTX、PDF/OFD、DWG、STEP、压缩包、邮件和其余已注册矩阵；也可以上传脱敏文件或粘贴 URL。

## 兼容性反馈

这个项目还在持续打磨，尤其需要真实业务文件来验证兼容性。

如果文件渲染异常，请先在 [Demo](https://demo.file-viewer.app) 验证，再使用带标注说明的 [Bug 表单](https://github.com/flyfish-dev/file-viewer/issues/new?template=bug_report.yml) 或 [文件兼容性表单](https://github.com/flyfish-dev/file-viewer/issues/new?template=compatibility.yml)。所有 Bug 必须提供公开/脱敏样例、公开复现链接，或注明私有样例已发送到 `admin@flyfish.dev`；截图可以帮助对比，但不能替代样例。

如果这个方向刚好对你有用，也欢迎收藏项目。比起单纯 Star，我更希望收到真实场景下的兼容性反馈。

## 快速开始

新项目可以用 CLI 生成示例，已有项目可按提示添加组件和资产配置：

```bash
npm create file-viewer@latest my-viewer
# 在已有项目中接入
npx file-viewer-cli@latest add .
```

CLI 默认使用 Standard 组合；`--profile full` 选择 Full 兼容包并添加 DICOM、数字签名能力，Adobe 设计和二进制检查仍需显式选择。各选项见 [CLI 文档](https://doc.file-viewer.app/guide/cli)。

手动接入时，先选组件，再选格式能力。`*-full` 已内置 `preset-all` 的兼容基线：221 个扩展名、32 条预览链路；npm 项目还需一次性部署同版本运行时资产。

| 场景 | 推荐安装 |
| --- | --- |
| Script 标签 / 自托管 Full | `@file-viewer/web-full` |
| Vanilla JS npm | `@file-viewer/web` + `@file-viewer/preset-all` |
| Vue 3 | `@file-viewer/vue3-full`，或 `@file-viewer/vue3` + preset |
| Vue 2.7 / 2.6 | `@file-viewer/vue2.7-full` / `@file-viewer/vue2.6-full` |
| React 18/19 | `@file-viewer/react-full` |
| React 16.8/17 | `@file-viewer/react-legacy-full` |
| Svelte | `@file-viewer/svelte-full` |
| jQuery | `@file-viewer/jquery-full` |
| 精确裁剪 | 任意组件包 + `@file-viewer/preset-*` 或独立 renderer |

官方 8 个 Full 包是 `@file-viewer/web-full`、`@file-viewer/vue3-full`、`@file-viewer/vue2.7-full`、`@file-viewer/vue2.6-full`、`@file-viewer/react-full`、`@file-viewer/react-legacy-full`、`@file-viewer/svelte-full` 和 `@file-viewer/jquery-full`。

`*-full` 表示已内置 `preset-all` 兼容矩阵及其同版本 Worker、WASM、字体和 vendor 资产，使用这部分能力无需重复安装 preset。Adobe 设计、DICOM、数字签名、二进制检查等专业 renderer，以及 IFC 可选入口，需显式装配。Vite 配置资产插件后可自动复制资源；其它构建工具使用 Full 包自带的同版本 CLI 完成自托管。

| 构建 / 交付方式 | 必须完成的资产步骤 |
| --- | --- |
| Vite | 安装 `@file-viewer/vite-plugin` 并使用 `fileViewerRenderers({ copyAssets: true })`；dev 和 build 会自动发布同版本资源。 |
| Webpack / Rspack / Rollup / Vue CLI / Umi | 运行 Full 包自带的同版本 CLI：`npx --no-install file-viewer-copy-assets ./public/file-viewer`。 |
| `@file-viewer/web-full` IIFE 自托管 | 原样部署完整 `dist/` 目录；无需执行复制命令。只复制入口 IIFE 文件不完整。 |

默认资产 URL 是 `<部署基址>/file-viewer/`（根部署即 `/file-viewer/`）。缺少该目录时，轻量格式和少数兼容路径可能仍能工作，但不属于完整格式支持。

### Script 标签 / 自托管

```html
<script src="/file-viewer/dist/flyfish-file-viewer-web-full.iife.js"></script>

<flyfish-file-viewer
  src="/files/report.pdf"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

先将 `@file-viewer/web-full` 的完整 `dist/` 部署到示例中的 `/file-viewer/dist/`。IIFE 首包只注册 Custom Element、controller 和 lazy full preset；PDF、Word、Excel、二进制 PPT、PPTX、CAD、Typst、压缩包、CHM 等重型 renderer 会在命中文件类型时从 `dist/renderers/*.iife.js` 异步加载。完整部署 `dist/` 即可：其中 `vendor/ppt/` 已包含经过完整性校验的 `@file-viewer/ppt@0.3.4` ESM、Worker、WASM、CJK 字体与帧缓存模块，`vendor/chm/` 包含 CHM Rust/WASM Worker，并与其它版本对齐的资产一起交付。二进制 `.ppt` 和 CHM 默认无需配置运行时 URL；格式专用 URL 选项只用于非标准资产路径覆盖。

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

Vue 2.6 + Vue CLI 3 / webpack 4 老项目可参考独立示例 [`examples/vue2.6-cli3-office`](./examples/vue2.6-cli3-office)，其中保留旧工具链所需的转译、alias、预览服务和离线资产配置。PDF runtime 的包内路径冲突已在源码修复，无需业务侧修改 renderer。升级时仍请保留适用于项目工具链的配置。

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

所有 full 包默认把 Archive、CHM、PDF、DOCX、Excel、二进制 PPT、PPTX、CAD、Typst、Draw.io、SQLite 等运行时资产指向部署基址下的 `file-viewer/`（根部署即 `/file-viewer/`）。Vite 配置资产插件复制资源或随包 CLI 写入 `./public/file-viewer` 后，这些 URL 不需要逐项配置；经过校验的 `@file-viewer/ppt@0.3.4` 运行时位于 `vendor/ppt/`，CHM Worker、JavaScript bridge 与 Rust/WASM 文件位于 `vendor/chm/`，并保留各自 LICENSE 与 NOTICE。

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
<iframe id="viewer" title="文件预览" style="width:100%;height:720px;border:0"></iframe>
<script type="module">
  const iframe = document.querySelector('#viewer')
  const ready = new Promise(resolve => iframe.addEventListener('load', resolve, { once: true }))
  iframe.src = 'https://static.example.com/file-viewer/iframe.html?from=https%3A%2F%2Fapp.example.com&name=report.docx'
  const file = await fetch('/api/files/report.docx').then(response => response.blob())
  await ready
  iframe.contentWindow.postMessage(file, 'https://static.example.com')
</script>
```

`iframe.html` 是推荐的无外壳入口，支持 clean URL 的静态平台也可以写成 `/iframe`；原主 Demo `index.html` 也保留同一套 `url`、`from`、`name` 和 `postMessage(Blob)` 协议，方便兼容已有客户集成。

## 架构

- `@file-viewer/core`: 格式识别、资源加载、renderer 协议、生命周期、搜索、缩放、打印、导出和 controller API。
- `@file-viewer/renderer-*`: PDF、Word、PPT/PPTX、CAD、Typst、Archive、CHM、Drawing、Data、EDA 等独立渲染能力。
- `@file-viewer/preset-*`: `lite`、`standard`、`office`、`engineering`、`all` 五类能力组合。
- `@file-viewer/web|vue3|vue2.7|vue2.6|react|react-legacy|svelte|jquery`: 各生态的原生组件。
- `@file-viewer/*-full`: 组件 + `preset-all`；完整支持还需把同版本运行时资源发布到 `<部署基址>/file-viewer/`，适合需要 Full 兼容范围的附件中心。

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
| 企业技术支持 | [dev.flyfish.group/shop](https://dev.flyfish.group/shop) |

## 支持格式

[`ecosystem/format-catalog.json`](ecosystem/format-catalog.json) 是唯一格式事实源：当前源码注册 275 个不重复扩展名和 47 条预览链路，其中 225 个稳定、50 个实验。下表按文件家族列出已注册扩展名。注册并不代表所有格式都能高还原：具体支持级别、已知限制和验证样例见 [格式矩阵](https://doc.file-viewer.app/guide/formats)，上线前请用业务文件验证。

| 类别 | 扩展名 | 当前表现 | 适合场景 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Word | `docx`、`docm`、`dotx`、`dotm` | `@file-viewer/renderer-word` + 自研 `@file-viewer/docx`，Worker 解析、连续流式阅读、目录字段缓存和异步分批渲染；模板/宏格式按只读预览处理 | 新生成的 Word 文档、正式文档、Word 模板 |
| Word | `doc`、`dot` | `@file-viewer/renderer-word` + `msdoc-viewer`，使用 Word 风格页面容器，增强 CFB 容错和表格布局 | 历史 `.doc` 老文档、Word 97-2003 模板 |
| 兼容文档 | `rtf`、`odt` | `@file-viewer/renderer-word` + `rtf.js` / ODF `content.xml` 兼容预览 | RTF 富文本、OpenDocument 文本文档 |
| Excel | `xlsx`、`xltx` | `@file-viewer/renderer-spreadsheet` + `styled-exceljs` + 虚拟滚动，支持尺寸、合并、常见样式、自动文本色、workbook drawing 图片和可选表头拖拽调整列宽；默认 `worker: auto`，大文件自动启用 Worker，小文件保留主线程兼容路径；打印按钮按能力隐藏，避免只打印当前视口 | 需要保留表格结构和样式的业务、Excel 模板 |
| Excel 兼容格式 | `xlsm`、`xlsb`、`xls`、`xlt`、`xltm`、`xla`、`xlam`、`csv`、`tsv`、`ods`、`fods` | CSV / TSV 自动识别 UTF-8、GBK 和 GB18030，也可通过 `options.spreadsheet.textEncoding` 显式覆盖；其余格式按可用信息渐进还原样式；加载项和宏只读取已保存数据，不执行代码；同样遵循虚拟表格打印边界 | 老表格、轻量数据查看 |
| PowerPoint | `ppt`、`pot`、`pptx`、`pptm`、`potx`、`potm`、`ppsx`、`ppsm`、`odp` | 二进制 `.ppt` 使用独立原生 WASM `@file-viewer/ppt` 引擎；OpenXML 文件使用 `@file-viewer/pptx` Worker 渐进解析；ODP 走 OpenDocument 幻灯片文本预览 | 汇报材料、课件、方案、演示模板 |
| Apple iWork | `pages`、`numbers`、`key` | `@file-viewer/renderer-iwork` 支持 iWork XML/IWA 静态预览；Numbers 读取保存的公式结果，Keynote 不执行动画、转场和视频；加密文件只识别、不解密 | Pages 文档、Numbers 表格、Keynote 演示 |
| WordPerfect | `wpd`、`wp`、`wp5`、`wp6` | `@file-viewer/renderer-wordperfect` 解析 WP5/WP6 文档，提供结构化静态预览；不执行宏，不承诺完整分页和嵌入对象还原 | 历史办公文档 |
| Hangul | `hwp`、`hwpx` | `@file-viewer/renderer-hangul` 提供段落、表格与可用图片的静态预览；加密、DRM 和分发文档只识别，不解密 | 韩文办公文档 |
| dBASE 表格 | `dbf` | `@file-viewer/renderer-spreadsheet` 读取字段与记录；缺失 DBT/FPT memo 附件时明确提示不完整 | 历史业务数据库、GIS 属性表 |
| PDF | `pdf` | 基于 `pdfjs-dist` 预览，同源 URL 默认渐进读取；服务端支持 Range 时自动分片加载，支持缩放工具栏、旋转页、页侧边栏/目录树侧边栏切换、宽度自适应、完整打印和导出 HTML | 合同、票据、版式成品 |
| OFD | `ofd` | 基于 `DLTech21/ofd.js` 仓库源码在线预览国产版式文档，避开 npm dist 授权 wasm 分支 | 电子发票、公文、归档材料 |
| Typst | `typ`、`typst` | 直接读取 Typst 源文件，按需加载 `@myriaddreamin/typst.ts` 浏览器 WASM 编译器、SVG 渲染器和本地字体资产；支持完整预览、打印和导出 HTML | 技术报告、论文草稿、工程文档模板 |
| 压缩包 | `zip`、`zipx`、`7z`、`rar`、`tar`、`gz`、`gzip`、`tgz`、`bz2`、`bzip2`、`tbz`、`tbz2`、`xz`、`txz`、`lzma`、`zst`、`tzst`、`cab`、`ar`、`cpio`、`iso`、`xar`、`lha`、`lzh`、`jar`、`war`、`ear`、`apk`、`cbz`、`cbr` | `@file-viewer/renderer-archive` 基于 `libarchive.js` WASM Worker 读取目录，点击后按需解压内部文件并复用统一预览器；CBZ/CBR 自动提供自然页序、翻页、键盘和触摸阅读体验；支持 IndexedDB 缓存、GBK/GB18030 旧 ZIP 中文文件名、ZIP/TAR/GZIP 兼容降级和体积上限 | 归档附件、漫画书、批量交付包、压缩包内文档快速查看 |
| CHM 帮助文档 | `chm` | `@file-viewer/renderer-chm` 在自托管 Rust/WASM Worker 中解析 ITSF/ITSP 目录与 LZX 内容，提供目录、索引、正文搜索、内部链接和按需资源；主题 HTML 在禁用脚本的 sandbox iframe 中显示，并由严格 CSP 阻断插件、表单和外网活动内容 | 离线帮助文档、旧版 SDK 与软件手册 |
| 邮件 | `eml`、`msg`、`mbox` | `@file-viewer/renderer-email` 独立承接邮件链路；EML/MBOX 使用 `postal-mime`，MSG 使用 `@kenjiuno/msgreader`，支持头信息、HTML/文本正文、附件下载与附件预览 | 邮件归档、工单邮件、客户来信附件 |
| EDA | `olb`、`dra`、`gds`、`oas`、`oasis` | `@file-viewer/renderer-eda` 独立承接；使用 `cfb` 解析 OrCAD/Allegro 常见 CFB 容器；标准 GDSII 会读取 structure、boundary、path、text、reference，小图输出 SVG，大元素集自动切到 WebGL canvas；OAS/OASIS 可读文本版图夹具会输出 SVG 预览，真实 SEMI 二进制 OASIS 先做安全结构索引、可读字符串、实体候选和诊断，不虚标专业电气/几何校核 | 元件库、封装图纸、芯片版图附件初筛 |
| CAD | `dwg`、`dxf`、`dwf`、`dwfx`、`xps` | 基于 `@flyfish-dev/cad-viewer` 预览图纸；DWG 通过 Worker + LibreDWG WASM 解析，DXF 使用 JS parser，DWF/DWFx/XPS 使用 native `dwf-viewer` 渲染 W2D/W3D/XPS 图形 | 工程图纸、二维 CAD 附件、AutoCAD 归档文件 |
| 3D 模型 | `glb`、`gltf`、`obj`、`stl`、`ply`、`fbx`、`dae`、`3ds`、`3mf`、`amf`、`usd`、`usda`、`usdc`、`usdz`、`kmz`、`pcd`、`wrl`、`vrml`、`xyz`、`vtk`、`vtp`、`step`、`stp`、`iges`、`igs`、`ifc`、`3dm`、`brep` | 常见网格与场景格式使用 Three.js loaders；STEP/STP、IGES/IGS、BREP 使用随包交付的本地 OCCT Worker/WASM 完成真实三角化，并保留装配层级、实例、法线和面颜色；IFC 可显式启用 `@file-viewer/renderer-3d/ifc`，配合自托管 Worker/WASM 提供几何、构件选择与属性查看；普通 3D 入口不会自动加载 IFC 引擎，3DM 仍为结构识别 | 设计模型、点云、三维资产、工程模型 |
| 地理数据 | `geojson`、`kml`、`gpx`、`shp` | `@file-viewer/renderer-geo` 独立承接；`@tmcw/togeojson` / `shpjs` 转 GeoJSON，支持 CRS 归一化，并用离线 MapLibre 矢量地图叠加点线面，失败时回退 SVG 预览 | 地理附件、轨迹、边界和轻量 GIS 数据 |
| XMind 脑图 | `xmind` | 基于 `@ljheee/xmind-parser` 解析 XMind 8 XML 与 XMind 2020+ JSON 包结构，离线渲染多 sheet 脑图、节点、标签、备注、链接、标记、图片和目录树，使用 `@panzoom/panzoom` 提供成熟的拖拽平移、移动端双指缩放、滚轮锚点缩放、键盘平移、统一 toolbar 状态同步、适配画布、搜索、打印、HTML 导出和缩放 | 脑图、项目规划、知识结构、会议纪要 |
| Excalidraw | `excalidraw` | `@file-viewer/renderer-drawing` 默认使用 `roughjs` 输出稳定只读 SVG；运行环境提供官方 `@excalidraw/excalidraw` ESM 模块时会优先尝试 `restore` + `exportToSvg` 并自动回退 | 白板草图、流程草稿、产品沟通图 |
| draw.io | `drawio`、`dio` | 基于官方 diagrams.net `GraphViewer` 预览 mxGraphModel / mxfile | 流程图、架构图、业务泳道图 |
| Mermaid | `mermaid`、`mmd` | `@file-viewer/renderer-drawing` 按需加载官方 `mermaid`，输出主题适配 SVG，并通过 `@panzoom/panzoom` 支持拖动、缩放、重置和统一工具栏联动 | 架构图、流程图、状态图、序列图 |
| PlantUML | `plantuml`、`puml` | 使用 `plantuml-encoder` 生成渲染 payload，支持配置自托管 PlantUML SVG 服务；预览层同样支持拖动、缩放和主题容器适配 | UML 时序图、组件图、部署图 |
| 电子书 | `epub` | `@file-viewer/renderer-epub` 按需加载随包交付的离线 EPUB 引擎，解析元数据、目录、章节并提供搜索与滚动阅读；使用安全 XML DOM 实现，不增加公网 CDN 依赖 | 电子书、培训手册、长篇阅读材料 |
| 电子书 | `umd` | 按 UMD 移动电子书结构解析元数据、目录和 zlib 压缩正文 | 旧移动电子书、历史小说附件 |
| FictionBook | `fb2` | `@file-viewer/renderer-epub` 解析本地 XML、章节和内嵌图片，不加载外网资源 | FictionBook 电子书 |
| Markdown | `md`、`markdown` | `@file-viewer/renderer-text` 提供 Markdown 阅读样式和明暗主题；超大源码自动切换为有界虚拟文本渲染 | README、知识文档、说明文档 |
| 图片 | `gif`、`jpg`、`jpeg`、`bmp`、`tiff`、`tif`、`png`、`svg`、`webp`、`avif`、`ico`、`heic`、`heif`、`jxl` | 原生图片浏览；TIFF 命中时按需进行有界多页 CCITT Group 4 解码；HEIC/HEIF 命中时按需使用 `heic2any` 转换 | 图片附件、设计稿、Logo、移动端照片 |
| 代码/文本 | `txt`、`json`、`jsonc`、`json5`、`ipynb`、`yaml`、`yml`、`toml`、`ini`、`proto`、`hcl`、`tex`、`gv`、`http`、`js`、`mjs`、`cjs`、`jsx`、`ts`、`tsx`、`vue`、`react`、`css`、`html`、`htm`、`xml`、`log`、`java`、`py`、`go`、`rs`、`rb`、`swift`、`kt`、`php`、`c`、`cpp`、`cc`、`h`、`hpp`、`cs`、`sh`、`bash`、`sql`、`diff`、`patch`、`bundle`、`bdl` | 普通文件使用 `highlight.js`；超大文件改用稀疏行索引、有界虚拟行、全源搜索和超长单行分段浏览。普通体积的 patch 与 git bundle 仍按需启用增强视图 | 日志、配置、代码片段、接口响应、代码评审 |
| 音频 | `mp3`、`mpeg`、`wav`、`ogg`、`oga`、`opus`、`m4a`、`aac`、`flac`、`weba`、`midi`、`mid` | `@file-viewer/renderer-media` 使用浏览器原生音频播放；MIDI 命中时按需加载 `@tonejs/midi` 展示轨道结构 | 录音、播客、语音附件、音效素材、MIDI 文件 |
| 视频 | `mp4`、`webm`、`m3u8` | `@file-viewer/renderer-media` 使用浏览器原生视频播放；HLS 清单必要时按需加载 `hls.js` | 演示视频、录屏、HLS 流 |
| Adobe 设计文件 | `psd`、`psb`、`pdd`、`psdt`、`ai`、`ait`、`eps`、`ps`、`idml`、`icml`、`idms`、`inx`、`xd`、`indd`、`indt`、`fla`、`xfl`、`ase`、`aco`、`abr`、`csh`、`pat`、`grd`、`asl` | 显式安装 `@file-viewer/renderer-design`：覆盖 PSD/PSB 保存像素与图层、Illustrator PDF-compatible 高还原表面及原生 PGF 画板/图层/路径、IDML CPU-WASM 页面、InDesign/XD/Animate 有界结构与预览、Photoshop 资源、色板和 PostScript WASM；未支持的原生语义持续展示边界 | 设计审阅、素材库、离线创意文件收件 |
| 字体和结构化数据 | `ttf`、`otf`、`woff`、`woff2`、`sqlite`、`wasm`、`parquet`、`avro`、`webarchive` | `@file-viewer/renderer-data` 独立承接 FontFace、SQLite、Parquet、Avro、WASM 与 WebArchive 结构预览，并在未装配 design renderer 时保留 PSD/AI/EPS 的轻量兼容降级 | 字体、数据库、列式数据和 Web 归档 |
| DICOM | `dcm`、`dicom` | 显式安装 `@file-viewer/renderer-dicom`，预览本地单文件或多帧影像；不提供多文件序列组装、PACS/DICOMweb、MPR 或诊断用途 | 医学影像附件查看 |
| 数字签名与证据容器 | `p7m`、`p7s`、`p7c`、`p7b`、`pkcs7`、`cms`、`cmsc`、`tsd`、`tst`、`tsq`、`tsr`、`asics`、`scs`、`asice`、`sce`、`ers`、`asc`、`sig`、`pgp`、`gpg`、`jws` | 显式安装 `@file-viewer/renderer-signature`，在本地 Worker 中检查结构、签名与时间戳；密码学结果与证书/密钥信任分开，不提供私钥操作、自动解密或完整归档策略验证 | 签名附件、证据包初筛 |
| 二进制检查 | `bin`、`hex`、`elf`、`exe`、`dll`、`class`、`macho` | 显式安装 `@file-viewer/renderer-binary`，显示十六进制、ASCII、字段树和字节选区；默认上限 16 MiB，只读且不执行文件、不支持自定义模板 | 文件头检查、二进制结构分析 |

## 能力组合

组件包默认保持轻量，格式能力通过 preset 或 renderer 装配。

| 模式 | 适合场景 | 示例 |
| --- | --- | --- |
| `*-full` | 221 个扩展名、32 条预览链路的兼容基线 + 同版本资产部署 | `@file-viewer/vue3-full` |
| 组件 + preset | 大多数业务系统，体积和能力平衡 | `@file-viewer/vue3` + `@file-viewer/preset-office` |
| 组件 + 多 preset | 组合办公和工程附件 | `preset: [officePreset, engineeringPreset]` |
| 组件 + renderer | 只要一个或少数格式 | `@file-viewer/renderer-pdf` |
| IIFE full | 无构建工具、script 标签、自托管完整 dist | `@file-viewer/web-full` |
| Vite 插件 | Vite 项目自动发现已安装 preset 并复制资产 | `@file-viewer/vite-plugin` |

Preset 选择:

| preset | 覆盖范围 |
| --- | --- |
| `@file-viewer/preset-lite` | 文本、Markdown、代码、图片、音频、视频 |
| `@file-viewer/preset-standard` | 常用 Word、PDF、OFD、现代 PPTX、Excel、压缩包、邮件和轻量格式；不自动包含 CAD、3D、iWork、旧版二进制 PPT 等专业能力 |
| `@file-viewer/preset-office` | PDF、Word、Excel、PowerPoint、OFD、RTF、OpenDocument |
| `@file-viewer/preset-engineering` | CAD、3D、绘图、XMind、Geo、Typst、Archive、Data、EDA |
| `@file-viewer/preset-all` | 已发布的 Full 兼容基线；不是所有后续专业 renderer 的合集 |

国际化、主题、水印、工具栏、搜索、打印、导出、生命周期和前置权限校验都通过同一套 `options` 配置。完整 API 见 [官方文档](https://doc.file-viewer.app/guide/usage)。

## 当前 npm 生态

v3.1.1 对应 89 个 npm 发布目标：88 个包为 `3.1.1`，`msdoc-viewer` 独立版本为 `0.2.8`；按用途分为 81 个标准包和 8 个历史兼容包。`@file-viewer/docx`、`@file-viewer/ppt` 等独立引擎依赖有各自版本，不计入这 89 个目标。实际安装版本以 npm dist-tag 和项目锁文件为准。新项目优先使用 `@file-viewer/*`；历史兼容包继续维护。

Adobe 创意文件能力是显式专业包：安装 [`@file-viewer/renderer-design`](https://www.npmjs.com/package/@file-viewer/renderer-design) 后按需启用 PSD/PSB/PDD/PSDT、AI/AIT、EPS/PS、InDesign exchange 与嵌入预览、XD、现代 FLA/XFL、色板和 Photoshop 资源预设；它不会静默进入冻结的 `preset-all` / Full 兼容基线。

| 场景 | 推荐 npm 包 | 历史兼容包 | 版本策略 | 说明 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core 底座 | [`@file-viewer/core`](https://www.npmjs.com/package/@file-viewer/core) | 无 | `latest` | 框架无关的格式矩阵、预览能力、资源加载、生命周期事件、搜索、缩放、打印、导出和操作 API |
| PPTX 原生引擎 | [`@file-viewer/pptx`](https://www.npmjs.com/package/@file-viewer/pptx) | 无 | `latest` | 从 Flyfish 历史稳定实现拆出的独立 PPTX 渲染引擎，Worker 渐进解析，由 `@file-viewer/renderer-presentation` 按需加载 |
| 二进制 PPT 运行时 | [`@file-viewer/ppt`](https://www.npmjs.com/package/@file-viewer/ppt) | 无 | `0.3.4` | 独立版本的演示文稿依赖；Demo、Full 资产与 CDN/IIFE 会交付其经过校验的公开运行时 |
| Word renderer | [`@file-viewer/renderer-word`](https://www.npmjs.com/package/@file-viewer/renderer-word) | 无 | `latest` | 标准 renderer 插件，承接 DOCX/DOC/DOT/RTF/ODT 链路，内部按需加载 `@file-viewer/docx`、`msdoc-viewer` 和 `rtf.js`，core-only 安装不再拉取 Word 重依赖 |
| 演示文稿 renderer | [`@file-viewer/renderer-presentation`](https://www.npmjs.com/package/@file-viewer/renderer-presentation) | 无 | `latest` | 二进制 `.ppt` 路由到 `@file-viewer/ppt`，OpenXML 演示文稿路由到 `@file-viewer/pptx`，按需提供缩放、打印和导出 |
| 绘图 renderer | [`@file-viewer/renderer-drawing`](https://www.npmjs.com/package/@file-viewer/renderer-drawing) | 无 | `latest` | 标准 renderer 插件，提供 Draw.io / diagrams.net 离线 viewer、Excalidraw 只读 SVG、Mermaid 官方 SVG 渲染、PlantUML SVG 服务接入、Panzoom 拖拽缩放、打印和 HTML 导出 |
| 3D 模型 renderer | [`@file-viewer/renderer-3d`](https://www.npmjs.com/package/@file-viewer/renderer-3d) | 无 | `latest` | 标准 renderer 插件，基于 Three.js loaders 提供 GLTF/GLB、OBJ、STL、PLY、FBX、DAE、3DS、3MF、USD/USDZ、点云和 VTK 等按需 WebGL 预览；IFC 使用同包 `/ifc` 可选入口，单独部署依赖与资产 |
| 数据资产 renderer | [`@file-viewer/renderer-data`](https://www.npmjs.com/package/@file-viewer/renderer-data) | 无 | `latest` | 标准 renderer 插件，基于 `ag-psd`、`sql.js`、`hyparquet`、`avsc`、FontFace 和 WebAssembly Module 提供 PSD、SQLite、Parquet、Avro、字体、WASM、AI/EPS、WebArchive 预览 |
| EDA renderer | [`@file-viewer/renderer-eda`](https://www.npmjs.com/package/@file-viewer/renderer-eda) | 无 | `latest` | 标准 renderer 插件，提供 OLB、DRA、GDSII、OASIS 结构预览，标准 GDSII 可生成 SVG/WebGL 版图预览，OASIS 文本夹具可生成 SVG，真实二进制 OASIS 保持结构诊断边界 |
| 轻量 renderer preset | [`@file-viewer/preset-lite`](https://www.npmjs.com/package/@file-viewer/preset-lite) | 无 | `latest` | 一次装配文本、Markdown、代码、图片、音频和视频预览，适合常见轻附件场景 |
| Standard preset | [`@file-viewer/preset-standard`](https://www.npmjs.com/package/@file-viewer/preset-standard) | 无 | `latest` | CLI 默认的常用格式组合，保留专业能力的显式安装边界 |
| Office renderer preset | [`@file-viewer/preset-office`](https://www.npmjs.com/package/@file-viewer/preset-office) | 无 | `latest` | 一次装配 PDF、Word、Excel、PowerPoint、OFD、RTF 和 OpenDocument 文档链路 |
| 工程 renderer preset | [`@file-viewer/preset-engineering`](https://www.npmjs.com/package/@file-viewer/preset-engineering) | 无 | `latest` | 一次装配 CAD、3D、绘图、XMind、Geo、Typst、Archive、Data 和 EDA 工程附件链路 |
| 全量 renderer preset | [`@file-viewer/preset-all`](https://www.npmjs.com/package/@file-viewer/preset-all) | 无 | `latest` | 一次装配 Word、PDF、OFD、PPTX、CAD、Draw.io/Excalidraw/Mermaid/PlantUML、Typst、XMind、压缩包、邮件、电子书、代码/Markdown/Patch/Git Bundle、图片、音视频等 Full 兼容基线能力；后续专业 renderer 需显式安装 |
| Vite 按需装配插件 | [`@file-viewer/vite-plugin`](https://www.npmjs.com/package/@file-viewer/vite-plugin) | 无 | `latest` | 免配置自动发现已安装 `@file-viewer/preset-*` 并激活对应能力；也可按 `formats`、`renderers` 或源码 hint 生成 `virtual:file-viewer-renderers`，只 import 命中的 renderer 包，并提供 renderer chunk 分组和 PDF/OFD/CAD/Drawing/Typst/Archive/Data 离线资产路线 |
| 独立 renderer 包 | [`@file-viewer/renderer-word`](https://www.npmjs.com/package/@file-viewer/renderer-word)、[`@file-viewer/renderer-pdf`](https://www.npmjs.com/package/@file-viewer/renderer-pdf)、[`@file-viewer/renderer-ofd`](https://www.npmjs.com/package/@file-viewer/renderer-ofd)、[`@file-viewer/renderer-presentation`](https://www.npmjs.com/package/@file-viewer/renderer-presentation)、[`@file-viewer/renderer-cad`](https://www.npmjs.com/package/@file-viewer/renderer-cad)、[`@file-viewer/renderer-drawing`](https://www.npmjs.com/package/@file-viewer/renderer-drawing)、[`@file-viewer/renderer-3d`](https://www.npmjs.com/package/@file-viewer/renderer-3d)、[`@file-viewer/renderer-data`](https://www.npmjs.com/package/@file-viewer/renderer-data)、[`@file-viewer/renderer-eda`](https://www.npmjs.com/package/@file-viewer/renderer-eda)、[`@file-viewer/renderer-typst`](https://www.npmjs.com/package/@file-viewer/renderer-typst)、[`@file-viewer/renderer-archive`](https://www.npmjs.com/package/@file-viewer/renderer-archive)、[`@file-viewer/renderer-email`](https://www.npmjs.com/package/@file-viewer/renderer-email)、[`@file-viewer/renderer-epub`](https://www.npmjs.com/package/@file-viewer/renderer-epub)、[`@file-viewer/renderer-text`](https://www.npmjs.com/package/@file-viewer/renderer-text)、[`@file-viewer/renderer-image`](https://www.npmjs.com/package/@file-viewer/renderer-image)、[`@file-viewer/renderer-media`](https://www.npmjs.com/package/@file-viewer/renderer-media)、[`@file-viewer/renderer-mindmap`](https://www.npmjs.com/package/@file-viewer/renderer-mindmap)、[`@file-viewer/renderer-geo`](https://www.npmjs.com/package/@file-viewer/renderer-geo) | 无 | `latest` | 用于按需安装 Word、重型版式、文本阅读、图片、媒体、3D、数据资产、EDA 和地理数据链路，避免业务只看轻量格式时安装 DOCX/DOC/PDF/OFD/PPTX/CAD/Draw.io/Excalidraw/Mermaid/PlantUML/Typst/压缩包/邮件/EPUB/XMind/OLB/DRA/GDS/OASIS/GeoJSON/KML/GPX/SHP/PSD/SQLite/Patch/Git Bundle/代码高亮/HEIC/HLS/MIDI 依赖 |
| Vanilla JS / Pure Web / script 标签 | [`@file-viewer/web`](https://www.npmjs.com/package/@file-viewer/web) | [`@flyfish-group/file-viewer-web`](https://www.npmjs.com/package/@flyfish-group/file-viewer-web) | `latest` | `mountViewer(container, options)`、Custom Element、IIFE、资源复制 CLI、Worker/WASM 自托管工具 |
| Vue3 | [`@file-viewer/vue3`](https://www.npmjs.com/package/@file-viewer/vue3) | [`@flyfish-group/file-viewer3`](https://www.npmjs.com/package/@flyfish-group/file-viewer3)、[`file-viewer3`](https://www.npmjs.com/package/file-viewer3) | `latest` | Vue3 原生组件、插件安装、props、事件、ref/controller 和完整类型 |
| Vue2.7 | [`@file-viewer/vue2.7`](https://www.npmjs.com/package/@file-viewer/vue2.7) | [`@flyfish-group/file-viewer`](https://www.npmjs.com/package/@flyfish-group/file-viewer) | `latest` | Vue2.7 原生组件，能力和 Vue3 保持一致 |
| Vue2.6 | [`@file-viewer/vue2.6`](https://www.npmjs.com/package/@file-viewer/vue2.6) | 无 | `latest` | Vue2.6 专线，面向仍停留在 Vue 2.6 的老项目 |
| React 18/19 | [`@file-viewer/react`](https://www.npmjs.com/package/@file-viewer/react) | [`@flyfish-group/file-viewer-react`](https://www.npmjs.com/package/@flyfish-group/file-viewer-react) | `latest` | React 原生组件和 hooks/controller，不通过 Vue 或 iframe 转接 |
| React 16.8/17 | [`@file-viewer/react-legacy`](https://www.npmjs.com/package/@file-viewer/react-legacy) | 无 | `latest` | 面向旧 React 项目的兼容组件包 |
| jQuery | [`@file-viewer/jquery`](https://www.npmjs.com/package/@file-viewer/jquery) | 无 | `latest` | jQuery 插件式接入，适合传统后台系统 |
| Svelte | [`@file-viewer/svelte`](https://www.npmjs.com/package/@file-viewer/svelte) | 无 | `latest` | Svelte 组件、action 和类型入口 |
| CHM renderer | [`@file-viewer/renderer-chm`](https://www.npmjs.com/package/@file-viewer/renderer-chm) | 无 | `latest` | 浏览器本地 CHM 阅读器，使用 Rust/WASM Worker，提供目录、索引、搜索和无脚本 sandbox 主题阅读 |
| Adobe 设计 renderer | [`@file-viewer/renderer-design`](https://www.npmjs.com/package/@file-viewer/renderer-design) | 无 | `latest` | 显式装配设计文件预览，按各格式区分保存画面、结构信息与可渲染内容 |
| DICOM renderer | [`@file-viewer/renderer-dicom`](https://www.npmjs.com/package/@file-viewer/renderer-dicom) | 无 | `latest` | 本地单文件与多帧影像查看，不是诊断系统 |
| 数字签名 renderer | [`@file-viewer/renderer-signature`](https://www.npmjs.com/package/@file-viewer/renderer-signature) | 无 | `latest` | 签名、时间戳与证据容器检查，信任判断与解析结果分离 |
| 二进制 renderer | [`@file-viewer/renderer-binary`](https://www.npmjs.com/package/@file-viewer/renderer-binary) | 无 | `latest` | 只读十六进制、ASCII、字段树和字节选区，不进入默认 Full/Vue 2 依赖 |

独立 renderer 集合已包含 `@file-viewer/renderer-chm`，只需要 CHM 的业务无需安装完整 preset。生态边界很清楚: `@file-viewer/core` 只负责底层预览能力和 API；各标准组件包只依赖 core 和自己的框架依赖，不嵌套其他框架实现；历史兼容包只负责旧包名继续可用，不建议新项目优先选择。

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

内网或离线部署可以从 [GitHub Releases](https://github.com/flyfish-dev/file-viewer/releases) 下载同一版本的 npm tarball，放入项目自己的 `vendor/` 目录，或导入企业 npm 镜像。仓库不再保存 `artifacts/` 构建产物。

例如，下载 v3.1.1 的 core 与 Web 组件包：

```bash
gh release download v3.1.1 --repo flyfish-dev/file-viewer \
  --pattern 'file-viewer-core-3.1.1.tgz' \
  --pattern 'file-viewer-web-3.1.1.tgz' --dir ./vendor
npm install ./vendor/file-viewer-core-3.1.1.tgz ./vendor/file-viewer-web-3.1.1.tgz
```

这只安装示例中的两个包，不包含全部格式或所有传递依赖。完全断网前，还需准备所选组件、preset、renderer、框架及第三方依赖的完整缓存或内网镜像；运行时则部署匹配版本的 Worker、WASM、字体和 vendor 目录。

Core、PPTX、所有框架组件、Full 包和历史兼容包均可从 Release 获取。`file-viewer3` 和 `@flyfish-group/file-viewer3` 两个兼容包都提供 tarball。二进制 PPT 使用独立版本的 `@file-viewer/ppt@0.3.4`，其匹配运行时随 Demo、Full 资产和 IIFE 交付。非 Vite Full 项目仍使用随包 CLI 复制资产：`npx --no-install file-viewer-copy-assets ./public/file-viewer`。

GitHub Release 会同步提供完整下载项:

| 文件 | 用途 |
| ---------------------------------------- | --------------------------------------------------------------- |
| `file-viewer-v2-*-official-demo-iframe.tar.gz` | 官方 Demo 零依赖 iframe 交付包，包含 `iframe.html`、兼容原主 Demo 的 `index.html`、示例父页面、说明文件、样例和离线 Worker/WASM/vendor 资源 |
| `file-viewer-v2-*-demo.tar.gz` | 主 Demo 静态站，解压后即可体验主预览、`/iframe.html` 嵌入入口和 `/compare.html` 文档比对 |
| `file-viewer-v2-*-component-demo.tar.gz` | Vanilla JS、Vue、React、Svelte、jQuery 原生组件演示站 |
| `file-viewer-v2-*-lib-dist.tar.gz` | Vue3 组件库构建产物，适合离线检查 dist 内容 |
| `file-viewer-v2-*-docs.tar.gz` | 文档站静态产物 |
| `file-viewer-core-*.tgz` | `@file-viewer/core` 纯 TypeScript 底座本地 npm 安装包 |
| `file-viewer-pptx-*.tgz` | `@file-viewer/pptx` 原生 PPTX 渲染引擎本地 npm 安装包 |
| `file-viewer-vue3-*.tgz` | Vue3 标准包名本地 npm 安装包 |
| `file-viewer-vue2.7-*.tgz` | Vue2.7 标准组件包 本地 npm 安装包 |
| `file-viewer-vue2.6-*.tgz` | Vue2.6 标准组件包 本地 npm 安装包 |
| `file-viewer-react-*.tgz` | React 18/19 标准组件包 本地 npm 安装包 |
| `file-viewer-react-legacy-*.tgz` | React 16.8/17 标准组件包 本地 npm 安装包 |
| `file-viewer-web-*.tgz` | 纯 Web 标准组件包，本地安装后可复制 Worker/WASM viewer assets |
| `file-viewer-jquery-*.tgz` | jQuery 标准组件包 本地 npm 安装包 |
| `file-viewer-svelte-*.tgz` | Svelte 标准组件包 本地 npm 安装包 |
| `flyfish-group-file-viewer3-*.tgz` | Vue3 本地 npm 安装包 |
| `file-viewer3-*.tgz` | 非 scoped Vue3 历史兼容包 |
| `file-viewer-renderer-*.tgz` | 独立格式 renderer，本地安装时仍需解析各自依赖 |
| `file-viewer-preset-*.tgz` | lite、standard、office、engineering、all 能力组合 |
| `file-viewer-*-full-*.tgz` | 各框架 Full 兼容包，包含匹配运行时资产 |
| `msdoc-viewer-*.tgz` | 独立版本的旧 Word 文档预览引擎 |
| `flyfish-group-file-viewer-*.tgz` | Vue2.7 本地 npm 安装包 |
| `flyfish-group-file-viewer-web-*.tgz` | 纯 JS 历史兼容包，提供 `mountViewer` 原生挂载和资源复制工具 |
| `flyfish-group-file-viewer-react-*.tgz` | React 历史兼容包，提供原生 React 组件入口 |

客户只想把官方 Demo 当成独立页面嵌入时，优先下载 `file-viewer-v2-*-official-demo-iframe.tar.gz`。解压后把整个目录发布到同一个静态路径，然后使用:

```html
<iframe
  src="/file-viewer/iframe.html?url=/files/demo.docx"
  style="width:100%;height:720px;border:0"
  allow="fullscreen"
></iframe>
```

如果文件只能由父页面接口取回，可使用包内 `iframe-example.html` 展示的 `postMessage(Blob)` 方案: `iframe.html?from=<父页面 origin>&name=<文件名>` 会保持无 Demo 外壳状态，收到父页面传入的 `Blob` 后按指定文件名预览。原主 Demo `index.html` 使用同一套协议，已有 `index.html?from=...&name=...` 集成不需要迁移。

如果 npm 11 安装 tgz 或依赖时报 `Cannot read properties of null (reading 'matches')`，先在空目录中用同一包管理器复现，并检查 Node/npm 版本、锁文件和依赖来源；混用包管理器留下的 symlink 是可能原因之一，不要直接删除项目锁文件。离线安装还需确认同版本 core、preset、renderer 与组件依赖都能从本地缓存或内网镜像解析。仍可复现时，请在 issue 中提供最小项目和完整安装日志。

<!-- FILE_VIEWER_PUBLIC_GENERATED:START -->
## 标准生态包与公开仓库

包与组件入口见 `ecosystem/wrappers.json`，格式范围见 `ecosystem/format-catalog.json`。本仓库包含 core、renderers、presets、标准组件、兼容包、CLI、Demo 与文档源码；发布包和静态站归档放在 [GitHub Releases](https://github.com/flyfish-dev/file-viewer/releases)，不随源码重复存储。

Core 也可从 [file-viewer-core](https://github.com/flyfish-dev/file-viewer-core) 查看。各框架组件入口如下：

| 框架 | 标准 npm 包 | 入口格式 | GitHub | 兼容历史包 |
| --- | --- | --- | --- | --- |
| Vanilla JS / Pure Web | `@file-viewer/web` | ESM, 类型声明, script 标签 IIFE, RequireJS AMD | [file-viewer-web](https://github.com/flyfish-dev/file-viewer-web) | `@flyfish-group/file-viewer-web` |
| Vanilla JS / Pure Web Full | `@file-viewer/web-full` | ESM, 类型声明, script 标签 IIFE, RequireJS AMD | [file-viewer-web-full](https://github.com/flyfish-dev/file-viewer-web-full) | 无 |
| Vue 3 | `@file-viewer/vue3` | ESM, 类型声明 | [file-viewer-vue3](https://github.com/flyfish-dev/file-viewer-vue3) | `@flyfish-group/file-viewer3`, `file-viewer3` |
| Vue 3 Full | `@file-viewer/vue3-full` | ESM, 类型声明 | [file-viewer-vue3-full](https://github.com/flyfish-dev/file-viewer-vue3-full) | 无 |
| Vue 2.7 | `@file-viewer/vue2.7` | ESM, 类型声明 | [file-viewer-vue2.7](https://github.com/flyfish-dev/file-viewer-vue2.7) | `@flyfish-group/file-viewer` |
| Vue 2.7 Full | `@file-viewer/vue2.7-full` | ESM, 类型声明 | [file-viewer-vue2.7-full](https://github.com/flyfish-dev/file-viewer-vue2.7-full) | 无 |
| Vue 2.6 | `@file-viewer/vue2.6` | ESM, 类型声明 | [file-viewer-vue2.6](https://github.com/flyfish-dev/file-viewer-vue2.6) | 无 |
| Vue 2.6 Full | `@file-viewer/vue2.6-full` | ESM, 类型声明 | [file-viewer-vue2.6-full](https://github.com/flyfish-dev/file-viewer-vue2.6-full) | 无 |
| React 18/19 | `@file-viewer/react` | ESM, 类型声明 | [file-viewer-react](https://github.com/flyfish-dev/file-viewer-react) | `@flyfish-group/file-viewer-react` |
| React 18/19 Full | `@file-viewer/react-full` | ESM, 类型声明 | [file-viewer-react-full](https://github.com/flyfish-dev/file-viewer-react-full) | 无 |
| React 16.8/17 | `@file-viewer/react-legacy` | ESM, 类型声明 | [file-viewer-react-legacy](https://github.com/flyfish-dev/file-viewer-react-legacy) | 无 |
| React 16.8/17 Full | `@file-viewer/react-legacy-full` | ESM, 类型声明 | [file-viewer-react-legacy-full](https://github.com/flyfish-dev/file-viewer-react-legacy-full) | 无 |
| jQuery | `@file-viewer/jquery` | ESM, 类型声明 | [file-viewer-jquery](https://github.com/flyfish-dev/file-viewer-jquery) | 无 |
| jQuery Full | `@file-viewer/jquery-full` | ESM, 类型声明 | [file-viewer-jquery-full](https://github.com/flyfish-dev/file-viewer-jquery-full) | 无 |
| Svelte | `@file-viewer/svelte` | Svelte 组件, ESM, 类型声明 | [file-viewer-svelte](https://github.com/flyfish-dev/file-viewer-svelte) | 无 |
| Svelte Full | `@file-viewer/svelte-full` | Svelte 组件, ESM, 类型声明 | [file-viewer-svelte-full](https://github.com/flyfish-dev/file-viewer-svelte-full) | 无 |

## 工程级按需 renderer 装配

快速开始的核心是先跑通组件，再明确格式能力边界。推荐先安装当前生态组件包，再按产品形态选择 `@file-viewer/preset-lite`、`@file-viewer/preset-standard`、`@file-viewer/preset-office`、`@file-viewer/preset-engineering` 或 `@file-viewer/preset-all`。Webpack、Rspack、Rollup、Umi、传统多页应用等非 Vite 项目，优先通过 `options.preset` 或 `options.renderers` 显式注入能力；Vite 插件只是进一步省掉手动 import 并复制离线资产。

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

需要 Full 兼容范围时，可将 preset 换成 `preset-all`；非 Vite 项目继续传 `options.preset`，Vite 配置保持不变。在线 Demo 还显式装配了专业 renderer，不能把 Demo 的全部能力等同于 `preset-all`：

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
- `@file-viewer/preset-all` 提供 Full 兼容基线，不自动包含后续专业 renderer；Worker、WASM、字体和 vendor 资源仍需通过 Vite 插件或 `file-viewer-copy-assets` 部署。`*-full` 包已内置该 preset，无需重复安装。

### 二进制检查器

安装 `@file-viewer/renderer-binary` 后，可在已有组件中显式添加：

```ts
import { binaryRenderer } from '@file-viewer/renderer-binary'

const options = {
  rendererMode: 'extend',
  renderers: [binaryRenderer],
  binary: { maxFileBytes: 16 * 1024 * 1024 }
}
```

它只接管已声明的二进制扩展名，不会抢占 PNG、ZIP、WASM 等已有专用预览。更多限制见 [二进制检查器说明](packages/renderers/binary/README.md)。

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

生态当前维护 89 个 npm 发布目标（81 个标准包 + 8 个历史兼容包）；格式目录声明 47 条预览链路、275 个扩展名（已注册），其中 225 个稳定、50 个实验。格式说明见官方文档: https://doc.file-viewer.app/guide/formats
<!-- FILE_VIEWER_PUBLIC_GENERATED:END -->

## 支持项目与商业版

File Viewer 自有源码保持 Apache-2.0 开源，部分运行时依赖采用独立许可证，见文末说明。GitHub Sponsors 支持一次性或持续赞助；国内支持方式见下方入口。赞助用于开源维护，不影响开源功能；私有化交付、定制适配或需要明确响应时间的需求，请使用企业技术支持入口。

- GitHub Sponsors: [github.com/sponsors/wybaby168](https://github.com/sponsors/wybaby168)
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

国内赞赏、联系与商业支持请使用 [官方支持入口](https://dev.flyfish.group/shop)。

商业版来自 Flyfish Office 产品线，提供自研 Office 文档引擎，面向复杂版式、大文件和分页渲染等需求。开源版会继续维护；商业支持提供私有化评估、定制适配和约定的响应时间，具体效果请用业务样例评估。

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

从源码构建自己的镜像时，先按下文完成安装并运行 `pnpm build`，然后在仓库根目录添加 `Dockerfile.demo`：

```dockerfile
FROM nginx:alpine
COPY apps/viewer-demo/dist/ /usr/share/nginx/html/
```

```bash
docker build -f Dockerfile.demo -t file-viewer-local .
docker run --rm -p 8080:80 file-viewer-local
```

该镜像只托管已构建的静态 Demo，不负责转码。生产部署还应配置 HTTPS、缓存及访问控制；使用预构建镜像时，可固定镜像摘要以避免 `latest` 漂移。

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
- 普通业务优先通过 `options.preset` 装配 `@file-viewer/preset-lite`、`@file-viewer/preset-standard`、`@file-viewer/preset-office`、`@file-viewer/preset-engineering` 或 `@file-viewer/preset-all`；多个能力包直接使用 `preset: [officePreset, engineeringPreset]`。`builtinRenderers` 仅作为高级基线控制或历史兼容开关保留；UMD / EPUB 电子书均由 `@file-viewer/renderer-epub` 按需提供
- `options.ui.density` 支持 `comfortable` 和 `compact`。默认 `comfortable` 保持历史间距；`compact` 会收紧工具栏、压缩包目录、嵌套预览头部、徽标、小按钮和搜索输入等操作界面，适合效率型附件中心或数据密集后台
- `options.text.toolbar: false` 可隐藏文本 renderer 内部的文件类型、索引状态和行数元信息栏，不影响 Viewer 全局工具栏。普通文本和代码可通过 `options.text.lineNumbers: true` 显示行号；`wrapLongLines: true` 会在普通和虚拟文本路径中按逻辑行视觉换行，不修改源码字节。`prettyPrint: true` 会为 JSON、JSONC、JSON5、HTML、XML、Vue、JavaScript、TypeScript、CSS、YAML 等已安装 Prettier parser 支持的格式生成明确标记且可切回原文的显示副本；`prettyPrintMaxBytes` 只限制格式化，默认继承 `virtualizeAboveBytes`（未配置时 512 KiB）。超限、异常、不支持或 whitespace-sensitive XML 会无错误回退到原始源码，下载始终使用原文件。文本和代码超过 `virtualizeAboveBytes` 后仍使用稀疏索引和有界虚拟行；Markdown 默认保持排版阅读视图，只有显式设置 `markdownVirtualizeAboveBytes` 时才切换为有界源码视图。全文搜索仍覆盖完整源文件；超长单行按 `maxRenderedLineBytes`（默认 16 KiB）分段浏览，可用 `virtualOverscanLines` 调整可视区缓冲行数
- `options.archive` 一般只需要配置 `cache`、`workerTimeoutMs` 和体积上限；需要控制压缩包内部文件的下载按钮时，可用 `archive.entryActions.download: false` 全局隐藏，或传 `(entry) => boolean` 按路径、扩展名、大小等元数据判断。这个选项只影响内部条目，不会关闭顶层 viewer 下载原始压缩包的动作。预览器会先尝试当前部署 base 下的 `vendor/libarchive/worker-bundle.js`。手机 WebView、本地临时服务器、MIME 或 CSP 导致 Worker 初始化超时时，会继续降级到 ZIP/TAR/GZIP 兼容模式，避免压缩包一直停在 loading。只有静态目录、CDN 路径或 WASM 位置特殊时，才需要显式传 `archive.workerUrl` / `archive.wasmUrl`
- 表格列宽拖拽通过 `options.spreadsheet.resizableColumns: true` 显式开启，默认关闭以保持历史交互兼容；官方 Demo 默认开启，方便查看被截断的长文本
- `options.theme` 支持 `light`、`dark`、`system`，默认继续跟随系统；DOCX 由 `@file-viewer/renderer-word` 内部 `@file-viewer/docx` 自动选择 Worker 或主线程解析，HTTP/HTTPS 默认 Worker，Electron `file://` 等本地不安全协议自动回退，真实浏览器 DOM 渲染、连续流式阅读、目录字段缓存和异步分批挂载，可通过 `options.docx.workerUrl`、`options.docx.workerJsZipUrl` 覆盖离线资源路径；如业务明确需要页式预览，可显式设置 `options.docx.visualPagination: true`；Excel/XLSX 默认使用 `options.spreadsheet.worker: 'auto'`，小文件走主线程兼容路径，大文件达到 `options.spreadsheet.workerAutoThreshold`（默认 1MB）后自动尝试 `vendor/xlsx/sheet.worker.js`，静态目录特殊时再传 `options.spreadsheet.workerUrl`，不希望自动启用时设为 `worker: false`；PDF 默认探测站点根路径的 PDF.js Worker，可用时使用真实 Worker，不存在或被回退成 HTML 时自动懒加载包内 worker handler 兜底，`options.pdf.workerUrl` 可覆盖为内网、离线或严格 CSP 的自托管地址；`options.watermark` 支持文字或图片水印；`options.toolbar` 可控制下载原文件、打印完整渲染结果、导出 HTML、统一缩放按钮和操作栏位置，`toolbar.zoom` 可单独控制缩放按钮显示，`toolbar.position` 支持 `auto`、`top`、`top-center`、`bottom-right`，PDF 默认悬浮到右下角以避开自身导航栏；统一缩放通过渲染器内部 provider 适配 PDF、Word、PPTX、Excel 虚拟表格、图片、CAD、OFD、Typst、Markdown、代码和绘图等链路，首屏自适应后的 `zoom-change` 会返回真实比例，避免业务侧外层 CSS 缩放或默认缓存 `100%` 造成表格坐标、canvas 交互或工具栏状态偏移；Excel 多 sheet 时标签栏按内容宽度展示并横向滚动，不会被平均压缩；`options.pdf.toolbar` 可隐藏 PDF 自身页码缩放工具栏；`options.search` 可控制搜索高亮、整词/大小写和命中数量；`options.ai` 可开启文本切片结构，返回行号、页码、锚点和 label 等溯源字段，便于业务侧做向量化、召回、AI 摘要、高亮回填和来源定位；`options.hooks` 可接收加载/卸载生命周期；`options.beforeOperation` 可在下载、打印、导出和缩放前做权限校验；打印按钮会结合当前文件类型、渲染完成状态和导出适配器动态显隐，Word / PDF 会生成完整页面，Excel 等虚拟表格会隐藏打印按钮，避免只打印当前视口或第一页

```ts
const blob = await response.blob()
const file = new File([blob], 'contract.pdf', { type: blob.type })
```

## 本地开发

建议使用 Node.js 24，并按根目录 `package.json` 的 `packageManager` 字段选择 pnpm 版本。首次运行需要先构建 workspace 依赖：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm dev
```

| 命令 | 说明 |
| --- | --- |
| `pnpm build` | 构建 core、renderers、presets、组件、工具、样例与主 Demo |
| `pnpm dev` | 启动主 Demo 开发服务 |
| `pnpm dev:components` | 启动多框架组件 Demo |
| `pnpm build:component-demo` | 构建组件 Demo 静态站 |
| `pnpm docs:dev` | 启动 Fumadocs / Next.js 文档站 |
| `pnpm docs:build` | 构建文档静态站 |
| `pnpm type-check` | 检查各包与 Demo 的 TypeScript 类型 |
| `pnpm test` | 执行仓库配置的兼容性回归 |
| `pnpm verify:browser-smoke` | 对已构建的 Demo 执行浏览器冒烟验证，需要 Playwright 浏览器环境 |

首次运行浏览器测试可用 `pnpm exec playwright install chromium` 准备 Chromium。贡献规范见 [CONTRIBUTING.md](CONTRIBUTING.md)；只改文档不必重复构建全部 renderer，修改代码时按受影响范围执行检查。

## 打包与部署

不需要自己构建时，直接下载 [GitHub Release](https://github.com/flyfish-dev/file-viewer/releases) 中对应版本的完整归档。需要从源码部署时，在完成上节安装后执行：

```bash
pnpm build
pnpm build:component-demo
pnpm docs:build
```

| 输出目录 | 内容 |
| --- | --- |
| `apps/viewer-demo/dist/` | 主 Demo、iframe 入口、文档比对页及离线资产 |
| `apps/component-demo/dist/` | 各框架组件演示站 |
| `apps/docs-site/out/` | 文档静态站 |
| `packages/components/*/dist/` | 标准组件包构建产物 |
| `packages/renderers/*/dist/` | 独立 renderer 构建产物 |

部署时保留完整目录结构，不要只复制入口 JavaScript。WASM 应返回 `application/wasm`，Worker 应返回 JavaScript MIME；静态资源请求不能被 SPA 回退为 HTML。跨域文件和资产需配置相应 CORS，子路径部署需保持构建基址与资源基址一致。内网环境应使用已准备好的本地字体、Worker 和 WASM，而不是临时依赖公网 CDN。

组件接入、资产路径覆盖与静态托管配置见 [发布与分发](https://doc.file-viewer.app/guide/distribution) 和 [Docker 部署](https://doc.file-viewer.app/guide/docker)。

## 文档导航

- [文档导览](https://doc.file-viewer.app/guide/)
- [快速开始](https://doc.file-viewer.app/guide/quickstart)
- [Demo 说明](https://doc.file-viewer.app/guide/demo)
- [组件用法](https://doc.file-viewer.app/guide/usage)
- [支持格式](https://doc.file-viewer.app/guide/formats)
- [本地开发与打包](https://doc.file-viewer.app/guide/development)
- [Docker 部署](https://doc.file-viewer.app/guide/docker)

## 开源说明

File Viewer 自有源码采用 [Apache-2.0](LICENSE)。DWG/DWF/DWFX 运行时（`@flyfish-dev/cad-viewer`、`dwf-viewer`）采用 **AGPL-3.0-only**，使用或分发 CAD 能力时需遵守其许可证。

旧版 PPT 运行时 `@file-viewer/ppt` 保留独立 LICENSE、NOTICE 和内置水印；移除水印需商业授权。其他依赖按各自许可证使用，不因被 File Viewer 引用而改为 Apache-2.0。

欢迎通过 issue / PR 贡献通用修复与改进，参与方式见 [CONTRIBUTING.md](CONTRIBUTING.md)。
