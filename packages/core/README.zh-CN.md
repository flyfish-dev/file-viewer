# @file-viewer/core

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/core/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/core/README.zh-CN.md)

<!-- FILE_VIEWER_PACKAGE_HEADER -->
<p>
  <a href="https://www.npmjs.com/package/@file-viewer/core"><img src="https://img.shields.io/npm/v/@file-viewer%2Fcore?logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@file-viewer/core"><img src="https://img.shields.io/npm/dm/@file-viewer%2Fcore?logo=npm" alt="npm downloads"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/stargazers"><img src="https://img.shields.io/github/stars/flyfish-dev/file-viewer?style=flat&logo=github" alt="GitHub stars"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0"></a>
</p>

<p>
  <a href="https://github.com/flyfish-dev/file-viewer">GitHub</a> · <a href="https://doc.file-viewer.app/zh/">文档</a> · <a href="https://demo.file-viewer.app/">在线 Demo</a> · <a href="https://doc.file-viewer.app/guide/formats">格式矩阵</a> · <a href="https://github.com/flyfish-dev/file-viewer/issues">问题反馈</a> · <a href="https://github.com/flyfish-dev/file-viewer/blob/main/packages/core/README.md">English</a>
</p>

<p>
  <a href="https://demo.file-viewer.app/"><img src="https://raw.githubusercontent.com/flyfish-dev/file-viewer/main/docs/public/_media/file-viewer-demo-v3-zh.webp" width="760" alt="File Viewer 在线演示：Word、Excel、PPT、3D 模型、CAD 图纸与二进制检查器"></a>
</p>

> ⭐ 如果 File Viewer 对你有帮助，欢迎到 [GitHub](https://github.com/flyfish-dev/file-viewer) 点个 Star。

Framework-neutral TypeScript foundation for Flyfish File Viewer.

This package is the migration base for the next architecture: one pure TypeScript core package with internal `headless`, `browser`, and `renderers` layers, plus multiple native standard component packages for Vue, React, pure JavaScript, jQuery and Svelte. Core owns the shared format matrix, source detection, renderer protocol, capability calculation, lifecycle context, operation/event/search/location/zoom/print/export contracts, heavy renderer asset manifests, option normalization, pure state models, and framework-neutral browser rendering engine.

Browser execution belongs inside core only when it remains framework-neutral TypeScript. DOM mounting, the standard browser shell and toolbar, `HTMLElement` traversal, search highlights, zoom provider discovery, print windows, download triggers, Canvas, Worker and WASM renderers must not depend on Vue, React, Svelte or any component package. Framework component packages keep their own component lifecycle, public type surface, compatibility defaults, and ecosystem interaction layer while depending on `@file-viewer/core` as the only shared base.

`@file-viewer/core` is the only shared foundation package. It owns the headless contracts plus browser/renderers layers for the direct `createViewer(container, options)` engine, renderer registry, DOM provider registry, print layout helpers, browser asset resolution, and framework-neutral DOM/Canvas/Worker/WASM rendering contracts. Core source is public; the private Gitea aggregate remains available for the complete workspace, unified release automation, sponsorship, and priority support.

Current framework-neutral browser renderers still inside core are limited to the low-cost image path. Spreadsheet rendering has moved to `@file-viewer/renderer-spreadsheet`; CAD rendering has moved to `@file-viewer/renderer-cad`; Typst rendering has moved to `@file-viewer/renderer-typst`; OFD rendering has moved to `@file-viewer/renderer-ofd`; PDF rendering has moved to `@file-viewer/renderer-pdf`; archive rendering has moved to `@file-viewer/renderer-archive`; email rendering has moved to `@file-viewer/renderer-email`; EPUB and UMD ebook rendering has moved to `@file-viewer/renderer-epub`; 3D model rendering has moved to `@file-viewer/renderer-3d`; Draw.io, Excalidraw, Mermaid, and PlantUML rendering has moved to `@file-viewer/renderer-drawing`; audio, video, HLS and MIDI rendering has moved to `@file-viewer/renderer-media`; code, text, Markdown, patch and git bundle rendering has moved to `@file-viewer/renderer-text`; Word DOCX/DOC/RTF/ODT rendering has moved to `@file-viewer/renderer-word`; PowerPoint rendering has moved to `@file-viewer/renderer-presentation`; XMind rendering has moved to `@file-viewer/renderer-mindmap`; geospatial rendering has moved to `@file-viewer/renderer-geo`; data asset rendering has moved to `@file-viewer/renderer-data`; EDA rendering and parsing has moved to `@file-viewer/renderer-eda`. Core-only installs now avoid direct OFD, PDF, Word, Spreadsheet, PPTX, CAD, Typst, XMind, Geo, media, 3D, drawing, archive, email, EPUB, UMD, data asset, EDA, `ofd-xml-parser`, `jszip`, `pdfjs-dist`, `styled-exceljs`, `e-virt-table`, `tinycolor2`, `@flyfish-dev/cad-viewer`, `@myriaddreamin/*`, `highlight.js`, `marked`, `diff2html`, `pako`, `mermaid`, `plantuml-encoder`, `@panzoom/panzoom`, `hls.js`, `@tonejs/midi`, `three`, `@excalidraw/excalidraw`, `roughjs`, `libarchive.js`, `postal-mime`, `@kenjiuno/msgreader`, `epubjs`, `ag-psd`, `sql.js`, `hyparquet`, `avsc` and `cfb` engine dependencies.

```bash
npm install @file-viewer/core
```

## 浏览器源加载反馈（未发布）

浏览器 `mountViewer` 在缓冲 URL 时显示本地化的下载提示，随后显示读取提示，直至渲染器接管。File 和 buffer 输入显示读取提示。状态遵循配置的语言和主题，展示获取失败，并在切源或销毁时清理。

## 渲染前预检

`precheckFileViewerSource()` 不会创建 viewer，也不会加载重型 renderer。它先检查当前扩展名是否在能力范围内，并对 PDF、OpenXML / OpenDocument、旧版 OLE Office、RTF 等格式执行签名或包结构检查。`valid: null` 明确表示该格式只有能力检查、没有做完整解析；真实 renderer 仍是畸形文件的最终判断者。

```ts
import { precheckFileViewerSource } from '@file-viewer/core/headless'

const result = await precheckFileViewerSource(file, {
  // 可传当前产品实际安装的扩展名列表，避免把未装 preset 的格式报成可预览
  supportedExtensions: ['pdf', 'docx', 'xlsx', 'pptx']
})

if (!result.previewable) {
  console.warn(result.reason, result.missingParts)
}
```

## Entry points

Use `@file-viewer/core/headless` when a component package, server-side helper or build script only needs framework-neutral contracts: format support, source normalization, renderer capability metadata, lifecycle/operation context, option normalization, state helpers and static asset resolution. This entry intentionally does not expose the DOM viewer engine or browser renderers.

```ts
import {
  DEFAULT_SUPPORTED_EXTENSIONS,
  normalizeSource,
  resolveFileViewerRendererAssets
} from '@file-viewer/core/headless'

const source = normalizeSource({ url: '/files/report.pdf' })
const pdfAssets = resolveFileViewerRendererAssets('pdf', {
  baseUrl: '/file-viewer/'
})
```

Use `@file-viewer/core/browser` when a native component package or a pure browser integration needs the shared browser shell and toolbar, direct DOM engine, renderer registry, search/zoom providers, print/export adapters and framework-neutral Canvas/Worker/WASM renderers.

```ts
import {
  createViewer,
  coreBrowserRendererHandlers
} from '@file-viewer/core/browser'

const viewer = createViewer(document.querySelector('#viewer')!, {
  options: {
    toolbar: true,
    styleIsolation: 'shadow'
  }
})

await viewer.load({ url: '/files/report.pdf' })
```

缩放按钮在达到边界时保持位置并禁用。使用现有的 `toolbar.items` 配置隐藏重置入口，`resetZoom()` API 仍然可用。设置 `pdf.zoomToolbar: false` 可仅隐藏 PDF 渲染器内部的缩放组，同时保留翻页和旋转控件：

```ts
const options = {
  toolbar: { items: { 'zoom-reset': false } },
  pdf: { zoomToolbar: false }
}
```

HTML document builders live in the opt-in export entry so ordinary previews do
not download the sanitizer. The viewer's `exportHtml()` and `print()` methods
load this entry only when invoked. For v3, migrate direct builder imports from
the package root to the explicit subpath:

```ts
import {
  buildExportHtmlDocument,
  buildFileViewerRenderedHtmlDocument
} from '@file-viewer/core/export'
```

Vue 3 模板中已弃用的兼容导出在 v3 中改为异步，以保持这条懒加载边界；
旧调用需要使用 `await buildExportHtmlDocument(...)` 或
`await collectDocumentStyles()`。直接从 `export` 子路径导入时，返回类型仍
按该子路径的 API 文档保持不变。

`options.styleIsolation` accepts `auto`, `shadow`, `scoped`, or `none`. Use `shadow` when a custom host or framework wrapper needs a ShadowRoot-backed render surface. Core passes the resolved `surface` to renderer `load(context)`, so custom renderers should inject styles into `context.surface.shadowRoot` or the renderer container instead of `document.head`, and should mount overlays inside the same isolated surface when possible.

The root `@file-viewer/core` entry remains the normal browser-compatible entry. New component packages should prefer the narrowest explicit entry point they need: `headless` for contracts and build-time helpers, `browser` for real browser preview, and `export` for sanitized standalone HTML documents.

```ts
import {
  listFileViewerRendererAssetManifests,
  resolveFileViewerRendererAssets
} from '@file-viewer/core'

const manifests = listFileViewerRendererAssetManifests()
const cadAssets = resolveFileViewerRendererAssets('cad', {
  baseUrl: '/file-viewer/',
  options: {
    cad: {
      wasmPath: '/file-viewer/wasm/cad/'
    }
  }
})
```

For non-Vite hosts or custom static directories, configure one runtime asset
base before loading a file. Renderer-specific URLs still take priority. The
Vite plugin sets this automatically from `copyAssets.baseDir`.

```ts
import { setDefaultFileViewerAssetBaseUrl } from '@file-viewer/core'

setDefaultFileViewerAssetBaseUrl('/tenant/static/file-viewer/')
```

The manifest API lets wrappers and deployment scripts discover archive, DOCX, Spreadsheet, CAD, Typst and data-asset worker/WASM resources from the same core contract instead of hard-coding per-framework paths. Spreadsheet assets remain part of the shared deployment contract for `@file-viewer/renderer-spreadsheet`; CAD assets remain part of the shared deployment contract for `@file-viewer/renderer-cad`; archive assets remain part of the shared deployment contract for `@file-viewer/renderer-archive`; DOCX assets remain part of the shared deployment contract for `@file-viewer/renderer-word`; SQLite WASM asset resolution remains in core so `@file-viewer/renderer-data` and deployment tools share one stable offline path.

Official documentation: https://doc.file-viewer.app/

Online demo: https://demo.file-viewer.app/

Public source repositories:

- GitHub: https://github.com/flyfish-dev/file-viewer-core
- Gitee: https://gitee.com/flyfish-dev/file-viewer-core

The GitHub/Gitee repositories are distributed public source packages. The private Gitea aggregate remains useful for the complete workspace, release automation, integration history, sponsorship, and priority support.

License: Apache-2.0. For second development or commercial use, keep clear Flyfish Viewer attribution and contribute shared compatibility improvements where possible.

## 格式与相关包

File Viewer 在浏览器内预览 275+ 种扩展名，覆盖 Office、PDF/OFD、CAD、3D、压缩包、邮件、图片、音视频和代码，无需服务端转码；完整清单见 [格式矩阵](https://doc.file-viewer.app/guide/formats)。

- 组件：`@file-viewer/web`、`@file-viewer/vue3`、`@file-viewer/vue2.7`、`@file-viewer/vue2.6`、`@file-viewer/react`、`@file-viewer/react-legacy`、`@file-viewer/svelte`、`@file-viewer/jquery`，以及对应的 `-full` 包
- 能力组合：`@file-viewer/preset-lite`、`@file-viewer/preset-office`、`@file-viewer/preset-engineering`、`@file-viewer/preset-all`
- 构建：`@file-viewer/vite-plugin`、`file-viewer-copy-assets`

## 许可证

本包采用 Apache-2.0。详见 [LICENSE](https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE)。
