# Flyfish Viewer

把 Word、Excel、PPT、PDF、压缩包、邮件、音频和电子书稳稳带进浏览器里。

`@flyfish-group/file-viewer3` 是一款基于 Vue 3、TypeScript 和 Vite 构建的纯前端文件预览组件。Vue2.7 项目请使用同能力包 `@flyfish-group/file-viewer`。两条 npm 包线保持一致的格式覆盖、示例体验和 API 语义，Vue3 构建产物作为 React、纯 Web 和其他适配层的统一预览基线。

它不依赖后端转码服务，适合接入 OA、知识库、附件中心、流程系统和需要离线能力的业务场景。这个项目的目标很直接: 让文档预览不再像临时拼出来的功能，而是像一个可以放心交付、能独立演示、能持续维护的产品模块。

- npm(Vue3): [@flyfish-group/file-viewer3](https://www.npmjs.com/package/@flyfish-group/file-viewer3)
- npm(Vue2): [@flyfish-group/file-viewer](https://www.npmjs.com/package/@flyfish-group/file-viewer)
- npm(React): [@flyfish-group/file-viewer-react](https://www.npmjs.com/package/@flyfish-group/file-viewer-react)
- npm(纯 JS): [@flyfish-group/file-viewer-web](https://www.npmjs.com/package/@flyfish-group/file-viewer-web)
- 官方文档: [doc.flyfish.dev](https://doc.flyfish.dev)
- 在线 Demo: [viewer.flyfish.dev](https://viewer.flyfish.dev)
- 公开成品仓库: [github.com/flyfish-dev/file-viewer](https://github.com/flyfish-dev/file-viewer)
- 源码自助开通: [https://dev.flyfish.group/shop](https://dev.flyfish.group/shop)

## 当前发布版本

| 技术栈 | npm 包 | 最新版本 | 推荐分支 | 说明 |
| --- | --- | --- | --- | --- |
| Vue3 | `@flyfish-group/file-viewer3` | `1.0.13` | `v3` | 主推版本，也是 React / 纯 Web 私有化 iframe 适配层的构建基线 |
| Vue2.7 | `@flyfish-group/file-viewer` | `1.0.13` | `main` | 兼容 Vue2 项目，格式能力与 Vue3 保持一致 |
| React 17 / 18 / 19 | `@flyfish-group/file-viewer-react` | `1.0.13` | 当前仓库子工程 | iframe 组件，默认加载 `/file-viewer/index.html` |
| 纯 JS | `@flyfish-group/file-viewer-web` | `1.0.13` | 当前仓库子工程 | iframe helper 和 viewer 产物复制工具 |

如果你在内网、离线环境，或者 npm 发布权限还没有完成配置，也可以直接使用公开成品仓库 `artifacts/` 里的 tarball。离线安装 React 包时请先安装同版本 web 包:

```bash
npm install ./artifacts/flyfish-group-file-viewer-web-1.0.13.tgz
npm install ./artifacts/flyfish-group-file-viewer-react-1.0.13.tgz
```

React / 纯 JS 包推荐用 `npm install` 获得安装即复制的体验。pnpm 10 默认会拦截依赖包的 `postinstall`，如果看到 `Ignored build scripts: @flyfish-group/file-viewer-web`，请执行 `pnpm approve-builds` 允许该包，或安装后运行 `pnpm exec file-viewer-copy-assets ./public/file-viewer`。

![Flyfish Viewer demo](docs/_images/demo-main.png)

## 为什么值得接入

- **纯前端 Serverless。** 文档解析和展示全部在浏览器内完成，部署简单，不依赖 Office 服务端、LibreOffice 守护进程或额外转码链路。
- **格式覆盖完整。** 当前内置 135 个扩展名映射，覆盖 Word、Excel、PowerPoint、PDF、OFD、压缩包、邮件、OLB/DRA、CAD、3D 模型、Excalidraw、draw.io、EPUB、UMD、Markdown、图片、音频、代码/文本和 MP4，能覆盖绝大多数业务附件场景。
- **按需异步加载。** PDF、OFD、压缩包、邮件、OLB/DRA、CAD、3D 模型、绘图、Office、EPUB、UMD、Markdown 和代码高亮渲染器都按需加载，重型解析依赖不会进入其他格式的首屏路径。
- **预览器操作完整。** 内置下载原文件、打印完整渲染结果、导出渲染后 HTML、水印开关和水印 options；PDF 会逐页输出完整页面，不依赖当前视口，适合合同、归档和审批类场景。
- **阅读体验更像产品。** `.doc`、`.docx`、PDF 都保留灰色工作台、白色纸张、居中阅读和自适应缩放，避免“内容能打开但不好读”的落差。
- **Demo 更适合验收。** 示例文件按文档、表格、图纸、代码、图片等类型分组展示，点击样例即可打开并自动收起选择器。
- **Vue2 / Vue3 体验一致。** `main` 分支面向 Vue2.7，`v3` 分支面向 Vue3；两边共享完整格式覆盖、示例文件盒子、文档站和 iframe 集成体验。
- **组件和独立站两用。** 既支持在 Vue 项目里直接作为组件使用，也支持独立部署后通过 iframe 嵌入到任意系统，方便多业务线复用。
- **适合成品交付。** 公开成品仓库、混淆压缩产物、npm tarball、静态部署产物和私有化 iframe 适配包都一起维护，便于下载、验收和二次接入。

## 支持格式

当前版本内置 135 个扩展名映射，覆盖 19 条预览链路。

| 类别 | 扩展名 | 当前表现 | 适合场景 |
| --- | --- | --- | --- |
| Word | `docx` | `docx-preview`，更适合保留文档结构和版式 | 新生成的 Word 文档、正式文档 |
| Word | `doc` | `msdoc-viewer` + Word 风格页面容器 | 历史 `.doc` 老文档 |
| Excel | `xlsx` | `styled-exceljs` + 虚拟滚动，支持尺寸、合并和常见样式 | 需要保留表格结构和样式的业务 |
| Excel 兼容格式 | `xlsm`、`xlsb`、`xls`、`csv`、`ods`、`fods`、`numbers` | 统一解析，按格式可用信息渐进还原样式 | 老表格、轻量数据查看 |
| PowerPoint | `pptx` | 浏览幻灯片内容，增强组合图形、主题背景、图片裁剪与 EMF 矢量图预览 | 汇报材料、课件、方案 |
| PDF | `pdf` | 基于 `pdfjs-dist` 预览，支持缩放工具栏、页码状态、可显隐导航窗格、宽度自适应、完整打印和导出 HTML | 合同、票据、版式成品 |
| OFD | `ofd` | 基于 `DLTech21/ofd.js` 仓库源码在线预览国产版式文档，避开 npm dist 授权 wasm 分支 | 电子发票、公文、归档材料 |
| 压缩包 | `zip`、`zipx`、`7z`、`rar`、`tar`、`gz`、`gzip`、`tgz`、`bz2`、`bzip2`、`tbz`、`tbz2`、`xz`、`txz`、`lzma`、`zst`、`tzst`、`cab`、`ar`、`cpio`、`iso`、`xar`、`lha`、`lzh`、`jar`、`war`、`ear`、`apk`、`cbz`、`cbr` | 基于 `libarchive.js` 的 WASM Worker 读取目录，点击后按需解压内部文件并复用统一预览器，支持 IndexedDB 缓存和体积上限 | 归档附件、批量交付包、压缩包内文档快速查看 |
| 邮件 | `eml`、`msg` | EML 使用 `postal-mime`，MSG 使用 `@kenjiuno/msgreader`，支持头信息、HTML/文本正文、附件下载与附件预览 | 邮件归档、工单邮件、客户来信附件 |
| EDA | `olb`、`dra` | 使用 `cfb` 解析 OrCAD/Allegro 常见 CFB 容器，展示结构树、元件/封装/Padstack 候选、属性、诊断和可读字符串；退化时提供安全二进制索引 | 元件库、封装图纸、EDA 附件初筛 |
| CAD | `dxf` | 基于 `@cadview/core` 预览图纸，支持缩放、平移、图层控制 | 工程图纸、二维 CAD 附件 |
| CAD 兼容入口 | `dwg` | 优先识别误命名 DXF；真实 DWG 会尽量提取内嵌预览图，并说明未完整解析几何的原因 | 需要兼容上传入口的业务 |
| 3D 模型 | `glb`、`gltf`、`obj`、`stl`、`ply`、`fbx`、`dae`、`3ds`、`3mf`、`amf`、`usd`、`usda`、`usdc`、`usdz`、`kmz`、`pcd`、`wrl`、`vrml`、`xyz`、`vtk`、`vtp`、`step`、`stp`、`iges`、`igs`、`ifc`、`3dm` | 基于 Three.js 交互预览；工程 CAD/BIM 格式会给出不内置几何内核的原因和转换建议 | 设计模型、点云、三维资产、工程模型 |
| Excalidraw | `excalidraw` | 基于官方 `@excalidraw/excalidraw` 的 `restore` + `exportToSvg` 输出只读预览 | 白板草图、流程草稿、产品沟通图 |
| draw.io | `drawio`、`dio` | 基于官方 diagrams.net `GraphViewer` 预览 mxGraphModel / mxfile | 流程图、架构图、业务泳道图 |
| 电子书 | `epub` | 基于 `epubjs` 解析目录和章节资源，使用兼容性更好的滚动阅读 | 电子书、培训手册、长篇阅读材料 |
| 电子书 | `umd` | 按 UMD 移动电子书结构解析元数据、目录和 zlib 压缩正文 | 旧移动电子书、历史小说附件 |
| Markdown | `md`、`markdown` | Markdown 阅读样式 | README、知识文档、说明文档 |
| 图片 | `gif`、`jpg`、`jpeg`、`bmp`、`tiff`、`tif`、`png`、`svg`、`webp` | 原生图片浏览 | 图片附件、设计稿、Logo |
| 代码/文本 | `txt`、`json`、`js`、`mjs`、`cjs`、`css`、`java`、`py`、`html`、`htm`、`jsx`、`ts`、`tsx`、`xml`、`log`、`vue`、`yaml`、`yml`、`ini`、`sh`、`bash`、`sql`、`go`、`rs`、`php`、`c`、`cpp`、`cc`、`h`、`hpp`、`cs`、`diff` | 使用 `highlight.js` 轻量高亮，HTML 按源码展示 | 日志、配置、代码片段、接口响应 |
| 音频 | `mp3`、`mpeg`、`wav`、`ogg`、`oga`、`opus`、`m4a`、`aac`、`flac`、`weba` | 浏览器原生音频播放，带控制条和基础进度信息 | 录音、播客、语音附件、音效素材 |
| 视频 | `mp4` | 浏览器原生视频播放 | 演示视频、录屏 |

## 接入路线

### 1. Vue 3 组件集成

适合已经在 Vue 3 项目里开发，希望最短路径完成接入的团队。React、纯 Web 和后续其他框架适配层都以这套 Vue3 构建产物作为 iframe 预览基线。

```bash
pnpm add @flyfish-group/file-viewer3
```

```ts
import { createApp } from 'vue'
import App from './App.vue'
import FileViewer from '@flyfish-group/file-viewer3'

createApp(App).use(FileViewer).mount('#app')
```

Vue3 入口会把样式一起带到安装器里，所以这里不需要再额外引入 `dist/file-viewer3.css`。

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

### 2. Vue 2 组件集成

适合仍在 Vue2.7 技术栈上，希望直接以内嵌组件方式完成接入的团队。Vue2 入口也会自动带上样式，不需要再额外 import CSS。

```bash
pnpm add @flyfish-group/file-viewer
```

```ts
import Vue from 'vue'
import App from './App.vue'
import FileViewer from '@flyfish-group/file-viewer'

Vue.use(FileViewer)

new Vue({
  render: h => h(App)
}).$mount('#app')
```

```vue
<template>
  <div style="height: 100vh">
    <file-viewer :url="url" />
  </div>
</template>

<script>
export default {
  data() {
    return {
      url: 'https://example.com/demo.pdf'
    }
  }
}
</script>
```

### 3. Iframe 嵌入

适合多系统共用一套预览器、想把预览能力独立部署、或者不希望把解析依赖带进业务包的场景。

```html
<iframe
  id="viewer"
  src="/file-viewer/index.html?url=https%3A%2F%2Fexample.com%2Fdemo.docx"
  style="width: 100%; height: 100%; border: 0"
></iframe>
```

更完整的二进制推送方案、`from` 安全校验和宿主页面示例，请查看仓库内的 [Iframe 嵌入说明](docs/guide/iframe.md)。

### 4. React / 纯 Web 子工程

React 与纯 Web 适配层不再复制渲染器，只通过 iframe 加载 Vue3 基线预览器产物。包里会携带主工程构建产物，安装后复制到宿主项目 `public/file-viewer`，组件默认加载 `/file-viewer/index.html`，只提供私有化静态部署路线:

官网 Demo 可用于快速验证预览效果，但 React / 纯 JS 组件不会把官网 Demo 地址作为内置 viewer 地址。

```bash
npm install @flyfish-group/file-viewer-react@1.0.13
npm install @flyfish-group/file-viewer-web@1.0.13
```

```tsx
import FileViewer from '@flyfish-group/file-viewer-react'

export function Preview() {
  return (
    <div style={{ height: '100vh' }}>
      <FileViewer
        url="https://example.com/demo.docx"
      />
    </div>
  )
}
```

`@flyfish-group/file-viewer-react` 支持 React 17 / 18 / 19，内部复用 `@flyfish-group/file-viewer-web` 的 iframe 协议工具。鉴权文件仍建议由宿主系统先下载成 `Blob`，再用 `file` + `name` 推送给预览器。静态目录不是 `public/file-viewer` 时，可以运行 `npx file-viewer-copy-assets ./public/vendor/file-viewer` 并覆盖 `viewerUrl="/vendor/file-viewer/index.html"`。

本仓库内置了一个私有化适配层演示应用，覆盖 React 组件和纯 Web helper 两种入口。调试时直接运行:

```bash
pnpm dev:adapters
```

它会先构建并同步 Vue3 基线预览器到演示应用的 `public/file-viewer`，打开本地地址即可看到预览效果。验证静态部署产物时运行:

```bash
pnpm build:adapter-demo
pnpm --filter @flyfish-group/file-viewer-demo preview
```

确认无误后，`packages/demo/dist` 可以作为普通静态目录部署；其中已经包含 `file-viewer/index.html` 和演示文件。

## 使用说明

- 组件支持两条主要输入路径: `url?: string` 与 `file?: File`
- 当 `file` 和 `url` 同时存在时，会优先渲染 `file`
- 如果业务侧拿到的是 `Blob` 或 `ArrayBuffer`，推荐先包装成带扩展名的 `File`
- 预览器会填满父容器，请为父容器提供稳定高度
- 使用 `url` 预览时，目标资源需要允许浏览器访问；跨域场景下需要正确配置 CORS
- 如果下载地址本身没有明确扩展名，建议先在业务侧取回文件，再包装成 `File`
- PPTX 渲染器会尽量还原常见组合图形、旋转/翻转、主题背景、图片裁剪和 EMF 矢量图片；复杂 Office 特效仍建议用真实业务文件做回归
- OFD、压缩包、邮件、OLB/DRA、CAD、3D 模型、绘图、EPUB、UMD、PDF、Office、Markdown、音频和代码高亮渲染器都按需异步加载，只有命中格式时才拉取对应代码块
- `options.watermark` 支持文字或图片水印；`options.toolbar` 可控制下载原文件、打印完整渲染结果和导出 HTML；PDF 打印会逐页生成完整页面，避免只打印当前视口；`options.archive` 可配置 libarchive worker、缓存和体积上限

```ts
const blob = await response.blob()
const file = new File([blob], 'contract.pdf', { type: blob.type })
```

## 本地开发

下面的命令适用于源码开通后的完整项目。公开 GitHub 成品仓库不包含源码目录，普通用户建议直接通过 npm、`dist/` 或 `artifacts/` 里的 tarball 使用。

```bash
pnpm install
pnpm dev
```

常用脚本:

- `pnpm build`: 构建示例站点
- `pnpm build-lib`: 构建组件库产物
- `pnpm docs:dev`: 启动 VitePress 文档站
- `pnpm docs:build`: 构建文档站
- `pnpm type-check`: 执行 TypeScript 类型检查
- `pnpm dev:adapters`: 启动 React + 纯 JS 适配层 Demo
- `pnpm build:adapter-demo`: 构建适配层 Demo
- `pnpm release:adapters:pack`: 打包 React / 纯 JS npm tarball

## 打包发布

Vue3 和 Vue2 发包时分别在对应分支执行同一套发布链路:

| 包 | 分支 | npm 名称 |
| --- | --- | --- |
| Vue3 | `v3` | `@flyfish-group/file-viewer3` |
| Vue2.7 | `main` | `@flyfish-group/file-viewer` |
| React | 当前仓库子工程 | `@flyfish-group/file-viewer-react` |
| 纯 JS | 当前仓库子工程 | `@flyfish-group/file-viewer-web` |

建议在发布前执行下面这组命令:

```bash
pnpm type-check
pnpm build
pnpm build-lib
pnpm obfuscate
pnpm docs:build
npm pack
```

其中:

- `dist/` 是库构建产物；执行 `pnpm obfuscate` 后会对其中的 `.js` / `.mjs` 进行压缩混淆
- `pnpm build` 会生成可独立部署的 Demo 静态站点产物
- `docs/.vitepress/dist/` 是文档站静态产物
- `npm pack` 会生成可直接发布或分发的 npm 包 tarball

如果只是准备 npm 包，可以直接执行:

```bash
pnpm release:pack
```

React 和纯 JS 适配包发布前执行:

```bash
pnpm type-check:adapters
pnpm build:adapter-demo
pnpm release:adapters:pack
pnpm release:adapters:publish
```

发布到 npm:

```bash
npm publish --dry-run --access public
npm publish --access public
```

如果 npm 账号启用了 MFA，请使用交互式终端完成浏览器确认后再等待发布结果。

公开 GitHub 仓库只提交可直接使用的构建产物、示例、文档和 npm tarball，不提交当前源码目录。需要源码、二开包或商业自助开通的用户，可以前往 [https://dev.flyfish.group/shop](https://dev.flyfish.group/shop)，付费 4.99 后自助开通。

## 文档导航

- [文档导览](docs/guide/index.md)
- [快速开始](docs/guide/quickstart.md)
- [Demo 说明](docs/guide/demo.md)
- [组件用法](docs/guide/usage.md)
- [支持格式](docs/guide/formats.md)
- [本地开发与打包](docs/guide/development.md)

## 开源说明

本项目使用 `Apache-2.0` 许可证。

二开或商用时，请按许可证要求保留版权、许可证和来源说明，并注明项目来源为 Flyfish Viewer / `@flyfish-group/file-viewer3` 或 `@flyfish-group/file-viewer`。如果你基于本项目修复了通用问题或增强了通用能力，也欢迎通过 issue / PR 一起贡献回来，让这套预览能力继续变得更稳。
