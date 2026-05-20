# Flyfish Viewer

这是 Flyfish Viewer 的公开成品仓库，只提供可直接下载和接入的构建产物，不提交源码目录。需要完整源码、二开包或商业自助开通，请前往 [https://dev.flyfish.group/shop](https://dev.flyfish.group/shop)，付费 4.99 后自助开通。

## 快速入口

- 官方文档/组件主页: [doc.flyfish.dev](https://doc.flyfish.dev)
- 在线 Demo: [viewer.flyfish.dev](https://viewer.flyfish.dev)
- npm(Vue3): [@flyfish-group/file-viewer3](https://www.npmjs.com/package/@flyfish-group/file-viewer3)
- npm(Vue2.7): [@flyfish-group/file-viewer](https://www.npmjs.com/package/@flyfish-group/file-viewer)
- 公开成品仓库: [github.com/flyfish-dev/file-viewer](https://github.com/flyfish-dev/file-viewer)
- 源码自助开通: [https://dev.flyfish.group/shop](https://dev.flyfish.group/shop)
- 当前版本: `1.0.9`

## 仓库内容

| 路径 | 内容 |
| --- | --- |
| `dist/` | 混淆压缩后的 Vue 3 组件库产物和类型声明 |
| `demo/` | 可独立部署的在线预览器静态站点 |
| `docs/` | 官方文档站静态构建产物 |
| `example/` | 完整样例文件列表，覆盖当前已注册格式 |
| `artifacts/` | 可下载 tarball，包括 npm 包、Demo、文档和库产物 |
| `LICENSE` | Apache-2.0 许可证 |

## 项目简介

把 Word、Excel、PPT、PDF、音频和电子书稳稳带进浏览器里。

`@flyfish-group/file-viewer3` 是一款基于 Vue 3、TypeScript 和 Vite 构建的纯前端文件预览组件。Vue2.7 项目请使用同能力包 `@flyfish-group/file-viewer`。两条 npm 包线保持一致的格式覆盖、示例体验和 API 语义，在线 Demo 始终使用 `v3` 分支产物作为最新体验基准。

它不依赖后端转码服务，适合接入 OA、知识库、附件中心、流程系统和需要离线能力的业务场景。这个项目的目标很直接: 让文档预览不再像临时拼出来的功能，而是像一个可以放心交付、能独立演示、能持续维护的产品模块。

## 当前发布版本

| 技术栈 | npm 包 | 最新版本 | 推荐分支 | 说明 |
| --- | --- | --- | --- | --- |
| Vue3 | `@flyfish-group/file-viewer3` | `1.0.9` | `v3` | 主推版本，在线 Demo 与后续上线均以此为准 |
| Vue2.7 | `@flyfish-group/file-viewer` | `1.0.9` | `main` | 兼容 Vue2 项目，格式能力与 Vue3 保持一致 |

![Flyfish Viewer demo](https://doc.flyfish.dev/_images/demo-main.png)

## 为什么值得接入

- **纯前端 Serverless。** 文档解析和展示全部在浏览器内完成，部署简单，不依赖 Office 服务端、LibreOffice 守护进程或额外转码链路。
- **格式覆盖完整。** 当前内置 74 个扩展名映射，覆盖 Word、Excel、PowerPoint、PDF、OFD、CAD、Excalidraw、draw.io、EPUB、UMD、Markdown、图片、音频、代码/文本和 MP4，能覆盖绝大多数业务附件场景。
- **按需异步加载。** PDF、OFD、CAD、绘图、Office、EPUB、UMD、Markdown 和代码高亮渲染器都按需加载，重型解析依赖不会进入其他格式的首屏路径。
- **阅读体验更像产品。** `.doc`、`.docx`、PDF 都保留灰色工作台、白色纸张、居中阅读和自适应缩放，避免“内容能打开但不好读”的落差。
- **Demo 更适合验收。** 示例文件按文档、表格、图纸、电子书、代码、图片等类型分组展示，点击样例即可打开并自动收起选择器；再次打开时会自动展开当前选中样例所在分组。
- **Vue2 / Vue3 体验一致。** `main` 分支面向 Vue2.7，`v3` 分支面向 Vue3；两边共享完整格式覆盖、示例文件盒子、文档站和 iframe 集成体验。
- **组件和独立站两用。** 既支持在 Vue 项目里直接作为组件使用，也支持独立部署后通过 iframe 嵌入到任意系统，方便多业务线复用。
- **适合成品交付。** 官方文档、在线 Demo、公开成品仓库、混淆压缩产物、npm tarball 和静态部署产物都一起维护，便于下载、验收和二次接入。

## 支持格式

当前版本内置 74 个扩展名映射，覆盖 15 条预览链路。

| 类别 | 扩展名 | 当前表现 | 适合场景 |
| --- | --- | --- | --- |
| Word | `docx` | `docx-preview`，更适合保留文档结构和版式 | 新生成的 Word 文档、正式文档 |
| Word | `doc` | `msdoc-viewer` + Word 风格页面容器 | 历史 `.doc` 老文档 |
| Excel | `xlsx` | `styled-exceljs` + 虚拟滚动，支持尺寸、合并和常见样式 | 需要保留表格结构和样式的业务 |
| Excel 兼容格式 | `xlsm`、`xlsb`、`xls`、`csv`、`ods`、`fods`、`numbers` | 统一解析，按格式可用信息渐进还原样式 | 老表格、轻量数据查看 |
| PowerPoint | `pptx` | 浏览幻灯片内容，增强组合图形、主题背景、图片裁剪与 EMF 矢量图预览 | 汇报材料、课件、方案 |
| PDF | `pdf` | 基于 `pdfjs-dist` 预览，支持缩放工具栏、页码状态和可显隐导航窗格 | 合同、票据、版式成品 |
| OFD | `ofd` | 基于 `DLTech21/ofd.js` 仓库源码在线预览国产版式文档，避开 npm dist 授权 wasm 分支 | 电子发票、公文、归档材料 |
| CAD | `dxf` | 基于 `@cadview/core` 预览图纸，支持缩放、平移、图层控制 | 工程图纸、二维 CAD 附件 |
| CAD 兼容入口 | `dwg` | 提示转换为 DXF 后预览，不内置 GPL DWG 解析器 | 需要兼容上传入口的业务 |
| Excalidraw | `excalidraw` | 基于官方 `@excalidraw/excalidraw` 的 `restore` + `exportToSvg` 输出只读预览 | 白板草图、流程草稿、产品沟通图 |
| draw.io | `drawio`、`dio` | 基于官方 diagrams.net `GraphViewer` 预览 mxGraphModel / mxfile | 流程图、架构图、业务泳道图 |
| 电子书 | `epub` | 基于 `epubjs` 解析目录和章节资源，使用兼容性更好的滚动阅读 | 电子书、培训手册、长篇阅读材料 |
| 电子书 | `umd` | 按 UMD 移动电子书结构解析元数据、目录和 zlib 压缩正文 | 旧移动电子书、历史小说附件 |
| Markdown | `md`、`markdown` | Markdown 阅读样式 | README、知识文档、说明文档 |
| 图片 | `gif`、`jpg`、`jpeg`、`bmp`、`tiff`、`tif`、`png`、`svg`、`webp` | 原生图片浏览 | 图片附件、设计稿、Logo |
| 代码/文本 | `txt`、`json`、`js`、`mjs`、`cjs`、`css`、`java`、`py`、`html`、`htm`、`jsx`、`ts`、`tsx`、`xml`、`log`、`vue`、`yaml`、`yml`、`ini`、`sh`、`bash`、`sql`、`go`、`rs`、`php`、`c`、`cpp`、`cc`、`h`、`hpp`、`cs`、`diff` | 使用 `highlight.js` 轻量高亮，HTML 按源码展示 | 日志、配置、代码片段、接口响应 |
| 音频 | `mp3`、`mpeg`、`wav`、`ogg`、`oga`、`opus`、`m4a`、`aac`、`flac`、`weba` | 浏览器原生音频播放，带控制条和基础进度信息 | 录音、播客、语音附件、音效素材 |
| 视频 | `mp4` | 浏览器原生视频播放 | 演示视频、录屏 |

## 三条接入路线

### 1. Vue 3 组件集成

适合已经在 Vue 3 项目里开发，希望最短路径完成接入的团队。当前在线 Demo 和生产上线均以 `v3` 分支作为最终产物来源。

```bash
pnpm add @flyfish-group/file-viewer3
```

```ts
import { createApp } from 'vue'
import App from './App.vue'
import FileViewer from '@flyfish-group/file-viewer3'

createApp(App).use(FileViewer).mount('#app')
```

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

适合仍在 Vue2.7 技术栈上，希望直接以内嵌组件方式完成接入的团队。

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
  src="https://viewer.flyfish.dev?url=https%3A%2F%2Fexample.com%2Fdemo.docx"
  style="width: 100%; height: 100%; border: 0"
></iframe>
```

更完整的二进制推送方案、`from` 安全校验和宿主页面示例，请查看文档站中的 [Iframe 嵌入说明](https://doc.flyfish.dev/guide/iframe)。

## 使用本仓库成品

如果你不想走 npm，可以下载 `artifacts/flyfish-group-file-viewer3-1.0.9.tgz`:

```bash
pnpm add ./artifacts/flyfish-group-file-viewer3-1.0.9.tgz
```

如果你要独立部署预览器，可以把 `demo/` 目录直接发布到任意静态资源服务。iframe 集成示例:

```html
<iframe
  src="https://viewer.flyfish.dev?url=https%3A%2F%2Fexample.com%2Fdemo.pdf"
  style="width: 100%; height: 100%; border: 0"
></iframe>
```

更完整的组件参数、iframe 二进制推送、格式说明和部署说明，请查看 [官方文档](https://doc.flyfish.dev)。

## 使用说明

- 组件支持两条主要输入路径: `url?: string` 与 `file?: File`
- 当 `file` 和 `url` 同时存在时，会优先渲染 `file`
- 如果业务侧拿到的是 `Blob` 或 `ArrayBuffer`，推荐先包装成带扩展名的 `File`
- 预览器会填满父容器，请为父容器提供稳定高度
- 使用 `url` 预览时，目标资源需要允许浏览器访问；跨域场景下需要正确配置 CORS
- 如果下载地址本身没有明确扩展名，建议先在业务侧取回文件，再包装成 `File`
- PPTX 渲染器会尽量还原常见组合图形、旋转/翻转、主题背景、图片裁剪和 EMF 矢量图片；复杂 Office 特效仍建议用真实业务文件做回归
- OFD、CAD、绘图、EPUB、UMD、PDF、Office、Markdown、音频和代码高亮渲染器都按需异步加载，只有命中格式时才拉取对应代码块

```ts
const blob = await response.blob()
const file = new File([blob], 'contract.pdf', { type: blob.type })
```

## 授权与贡献

项目使用 `Apache-2.0` 许可证。二开或商用时，请保留许可证、版权和来源说明，并注明项目来源为 Flyfish Viewer / `@flyfish-group/file-viewer3` / `@flyfish-group/file-viewer`。

如果你修复了通用问题或增强了通用能力，欢迎通过 issue / PR 一起贡献回来。
