# @file-viewer/renderer-ofd

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/ofd/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/ofd/README.zh-CN.md)

Flyfish File Viewer 的独立 OFD 渲染器。它基于 DLTech21/ofd.js 的纯前端解析链路，按需加载 OFD vendor、XML parser 和 ZIP 解析依赖，适合电子发票、公文和国产版式文件在线预览。

## 安装

```bash
pnpm add @file-viewer/core @file-viewer/renderer-ofd
```

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { ofdRenderer } from '@file-viewer/renderer-ofd'

const options = {
  rendererMode: 'replace',
  renderers: ofdRenderer,
}
```

也可以通过 `@file-viewer/preset-all` 一次性启用官方 demo 的完整格式矩阵，或与其他 renderer 组合:

```ts
import { ofdRenderer } from '@file-viewer/renderer-ofd'
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer, ofdRenderer],
}
```

## 能力

- 支持 `.ofd` 国产版式文件。
- 支持电子签章外观预览（SES 印章图片与嵌套 OFD 印章），按 `StampAnnot` 边界叠加显示；预览不做国密验签。
- 按需动态导入 OFD 解析/渲染代码，不污染首屏。
- vendor 文件随 npm 包发布，支持企业内网和纯离线部署。
- 支持统一缩放、打印、HTML 导出和生命周期上下文。

## 迁移说明

OFD 渲染已经从 `@file-viewer/core` 移入本包，`jszip`、本地 XML 解析逻辑和 DLTech21/ofd.js vendor 只由 `@file-viewer/renderer-ofd` 承接。只安装 core 或标准组件包时不会再拉取 OFD 解析依赖；需要 OFD 预览时请显式装配本 renderer，或使用 `@file-viewer/preset-all`。

## 文档

- 按需渲染架构: <https://doc.file-viewer.app/guide/on-demand-renderers>
- 支持格式: <https://doc.file-viewer.app/guide/formats>
