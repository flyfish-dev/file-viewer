# @file-viewer/renderer-pdf

Flyfish File Viewer 的独立 PDF renderer 包，基于 PDF.js，提供 PDF 页面渲染、导航、目录、搜索、缩放、打印和 HTML 导出能力。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  rendererMode: 'replace',
  renderers: pdfRenderer,
}
```

也可以和其他 renderer 一起组合：

```ts
const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer],
}
```

## 离线资源

PDF 预览依赖 PDF.js worker、cMaps、WASM、standard fonts，以及未嵌入中文字体的离线回退资源。资源路径沿用 `@file-viewer/core` 的统一 options：

```ts
const options = {
  renderers: pdfRenderer,
  pdf: {
    assetBaseUrl: '/workspace/',
    workerUrl: '/vendor/pdf/pdf.worker.mjs',
    cMapUrl: '/vendor/pdf/cmaps/',
    wasmUrl: '/vendor/pdf/wasm/',
    standardFontDataUrl: '/vendor/pdf/standard_fonts/',
    cjkFontFallbackPath: '/vendor/pdf/fonts/',
    identityFontRepair: true,
  },
}
```

默认未显式配置时，渲染器优先使用 Vite 等构建器提供的公开基址，并可从页面入口脚本回退识别部署子路径。因此应用部署在 `/workspace/`、当前 SPA 路由为 `/workspace/c/` 时，仍会请求 `/workspace/vendor/pdf/pdf.worker.mjs`。UMI、自定义代理或无法自动识别的构建环境可以设置 `pdf.assetBaseUrl: '/workspace/'` 固定全部 PDF 离线资源的基址。创建静态 Worker 前会先读取 PDF.js 官方版本标记；若部署目录残留的旧 Worker 与当前 API 不一致，会拒绝旧文件并自动使用包内同版本 handler。项目未执行 `file-viewer-copy-assets`、未使用 `@file-viewer/vite-plugin`，或本地临时服务器把该路径回退成 HTML 时，也会使用同一兜底，避免 `Setting up fake worker failed` 直接中断预览。需要最佳性能、完整 cMap/standard fonts/WASM 解码或严格离线部署时，仍建议复制 viewer assets 并配置真实静态地址。当前锁定的 PDF.js 5.4 稳定线会通过 `wasmUrl` 本地加载 JBIG2、JPEG 2000、颜色管理等辅助资源；这些资源由 viewer assets 和 Vite 插件统一复制，不依赖公网。

`cjkFontFallback` 默认开启。PDF 引用了 `MicrosoftYaHei-Bold`、宋体、黑体或其他中文字体但没有嵌入字体数据时，渲染器优先使用本机字体；本机缺失时，会把原 PDF 字体名映射到 `@file-viewer/assets-standard` 提供的本地 Noto Sans SC 可变字体，并根据当前页实际文字只加载需要的 WOFF2 分片。Vite 插件会优先复用这份标准资源，避免在 renderer 中重复打包字体。首屏会在字体就绪后再渲染，后续页发现新字形时会自动重绘。可设为 `false` 完全关闭，或用 `cjkFontFallbackPath` 指向同结构的自托管字体目录。

`identityFontRepair` 也默认开启，用于少数把 TrueType 字形 ID 写入 `Identity-H`/`Identity-V`、却遗漏 `ToUnicode` 的异常 PDF。只有检测到中文字体替换和多个控制字符乱码时，渲染器才会懒加载修复模块；若文件内同时嵌入了可用的同族 TrueType 字体，就从其 cmap 重建内存预览所需的 Unicode 映射。修复只作用于预览副本，不覆盖原始文件和下载源；无法安全修复时继续使用原预览。可设为 `false` 关闭。

## 迁移说明

PDF 渲染已经从 `@file-viewer/core` 移入本包，`pdfjs-dist` 只由 `@file-viewer/renderer-pdf` 声明。只安装 core 或标准组件包时不会再拉取 PDF.js；需要 PDF 预览时请显式装配本 renderer，或使用 `@file-viewer/preset-all`。

发布产物会把 Apache-2.0 的 PDF.js runtime 内封到 `dist/vendor/pdfjs`，并在打包前隔离 PDF.js 内部 webpack bootstrap。`provenance.json` 会记录每个上游源文件哈希、变换次数和产物哈希，因此 webpack 4 消费项目不需要再为 renderer 内部路径配置 loader。
