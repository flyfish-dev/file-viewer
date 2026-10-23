# @flyfish-group/file-viewer-web

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/web/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/web/README.zh-CN.md)

纯 Web 文件预览组件。这个包是 `@file-viewer/web` 的历史包名同步版本，提供同样的 `<flyfish-file-viewer>` 原生 Web Component、`mountViewer` 命令式 controller、IIFE 全局脚本和资源复制 CLI。

```bash
npm install @flyfish-group/file-viewer-web
```

```html
<flyfish-file-viewer
  id="viewer"
  src="https://example.com/demo.pdf"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

```ts
import { defineFileViewerElement } from '@flyfish-group/file-viewer-web'

defineFileViewerElement()

const viewer = document.getElementById('viewer')
viewer.addEventListener('viewer-event', event => {
  console.log(event.detail.type, event.detail.payload)
})
viewer.reload()
```

需要完全命令式控制时，仍可使用 `mountViewer(container, options)` 返回完整 controller。

鉴权文件可以由宿主系统先下载成 `Blob`，再通过 `file` 和 `name` 交给预览器:

```ts
const blob = await fetch('/api/files/contract', { credentials: 'include' }).then(res => res.blob())

const viewer = document.querySelector('flyfish-file-viewer')
viewer.file = blob
viewer.name = 'contract.pdf'
```

## Script 标签接入

无构建工具项目可以自托管 IIFE 包，它会暴露 `window.FlyfishFileViewerWeb`:

```html
<script src="/vendor/file-viewer-web/flyfish-file-viewer-web.iife.js"></script>
<flyfish-file-viewer
  src="/files/demo.docx"
  theme="light"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

浏览器不能直接解析 `@flyfish-group/file-viewer-web` 这种裸包名；没有构建工具时请使用静态 URL、IIFE 全局包，或配置 import map。Worker、WASM 和示例资源可以通过复制命令自托管:

```bash
npx --yes file-viewer-copy-assets ./public/file-viewer
```

`options` 会透传给共享预览底座，可配置主题、下载/打印/导出 HTML 操作栏、文字或图片水印、搜索高亮、AI 友好文本切片、统一缩放，以及压缩包预览的 Worker、IndexedDB 缓存和体积上限。生命周期、操作能力变化、搜索状态和当前位置会通过 `onEvent` 回传给宿主，适合记录加载耗时、审计下载/打印尝试、搜索命中、页码/行号、AI 切片和溯源状态。

新项目建议优先使用标准包名 `@file-viewer/web`。官方文档: https://doc.file-viewer.app/
