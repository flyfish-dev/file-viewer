# @file-viewer/renderer-pdf

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/pdf/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/pdf/README.zh-CN.md)

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

## PDF URL 读取

标准 PDF 渲染器在 Vanilla/Web Component、React、Svelte、jQuery 和 Vue 使用相同的 URL 策略。`pdf.streaming` 默认 `same-origin`；跨域或签名 URL 可显式设为 `true`，无扩展名 URL 同时提供 `filename: 'document.pdf'` 或 `type: 'pdf'`。此时直接交给 PDF.js，不先在 core 完整下载。Range 需要服务端支持；跨域还须通过 CORS 暴露 `Accept-Ranges`、`Content-Length`、`Content-Range`。

`pdf.streaming: false` 会先下载一次再预览。显式 buffer/file、自定义 `fetchFile` 仍优先提供字节；原 URL 保留为元数据，不会触发 PDF.js 重复下载。自定义仅支持 buffer 的渲染器继续遵循其能力声明。PDF.js 默认可在后台继续取流；如需仅按需读取 Range，同时设置 `pdf.disableStream: true` 和 `pdf.disableAutoFetch: true`。禁用自动预取需要同时禁用流读取；未配置时保留 PDF.js 默认值。

## 深色阅读

无需重载的实时更新适用于 renderer 观察到的主题属性、系统配色及 Vanilla core 的主题更新路径。框架组件与工具栏/controller 的选项更新可能重新初始化预览。

PDF 正文跟随 `options.theme`（`light`、`dark`、`system`），支持实时切换。深色阅读只在预览画布上应用颜色滤镜，图片颜色也会随之变化；需要保持原始配色时设置 `pdf.darkMode: false`，设为 `true` 则可独立强制深色阅读。原文件下载、打印和导出的画布像素仍保持原始颜色。

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

默认未显式配置时，渲染器优先使用 Vite 等构建器提供的公开基址，并可从页面入口脚本回退识别部署子路径。因此应用部署在 `/workspace/`、当前 SPA 路由为 `/workspace/c/` 时，仍会请求 `/workspace/vendor/pdf/pdf.worker.mjs`。UMI、自定义代理或无法自动识别的构建环境可以设置 `pdf.assetBaseUrl: '/workspace/'` 固定全部 PDF 离线资源的基址。真实 Worker 在解析前通过 PDF.js API 握手确认版本；旧版本不匹配时会被销毁，并安全重试包内同版本 handler，不额外发送版本探测请求。项目未执行 `file-viewer-copy-assets`、未使用 `@file-viewer/vite-plugin`，或本地临时服务器把该路径回退成 HTML 时，也会使用同一兜底，避免 `Setting up fake worker failed` 直接中断预览。需要最佳性能、完整 cMap/standard fonts/WASM 解码或严格离线部署时，仍建议复制 viewer assets 并配置真实静态地址。当前锁定的 PDF.js 5.4 稳定线会通过 `wasmUrl` 本地加载 JBIG2、JPEG 2000、颜色管理等辅助资源；这些资源由 viewer assets 和 Vite 插件统一复制，不依赖公网。

`cjkFontFallback` 默认开启。PDF 引用了 `MicrosoftYaHei-Bold`、宋体、黑体或其他中文字体但没有嵌入字体数据时，渲染器优先使用本机字体；本机缺失时，会把原 PDF 字体名映射到 `@file-viewer/assets-standard` 提供的本地 Noto Sans SC 可变字体，并根据当前页实际文字只加载需要的 WOFF2 分片。Vite 插件会优先复用这份标准资源，避免在 renderer 中重复打包字体。首屏会在字体就绪后再渲染，后续页发现新字形时会自动重绘。可设为 `false` 完全关闭，或用 `cjkFontFallbackPath` 指向同结构的自托管字体目录。

`identityFontRepair` 也默认开启，用于少数把 TrueType 字形 ID 写入 `Identity-H`/`Identity-V`、却遗漏 `ToUnicode` 的异常 PDF。只有检测到中文字体替换和多个控制字符乱码时，渲染器才会懒加载修复模块；若文件内同时嵌入了可用的同族 TrueType 字体，就从其 cmap 重建内存预览所需的 Unicode 映射。修复只作用于预览副本，不覆盖原始文件和下载源；无法安全修复时继续使用原预览。可设为 `false` 关闭。

字体遗漏 `FontDescriptor` 时，`UniGB-UCS2-H/V`、GBK、Big5 等预定义 CID CMap 仍按多字节编码解码，并保留文件提供的 `ToUnicode` 映射。这类 PDF 无需额外安装 Identity 字体修复能力，原始 PDF 字节也不会改写。

## 迁移说明

直接启动真实 Worker，不再额外读取版本前缀或重复下载 Worker。
PDF.js 在解析前通过 API 握手检查版本；不匹配时销毁旧 Worker，并用保留的输入安全重试包内同版本回退。
主线程回退使用异步资源读取，不依赖窗口中不允许的同步二进制 XHR。

PDF 渲染已经从 `@file-viewer/core` 移入本包，`pdfjs-dist` 只由 `@file-viewer/renderer-pdf` 声明。只安装 core 或标准组件包时不会再拉取 PDF.js；需要 PDF 预览时请显式装配本 renderer，或使用 `@file-viewer/preset-all`。

发布产物会把 Apache-2.0 的 PDF.js runtime 内封到 `dist/vendor/pdfjs`，并在打包前隔离 PDF.js 内部 webpack bootstrap。`provenance.json` 会记录应用声明补丁后的源文件哈希、变换次数和产物哈希，因此 webpack 4 消费项目不需要再为 renderer 内部路径配置 loader。

内封运行时还包含 PDF.js 5.4.624 的文档初始化取消补丁，避免快速切换文件时主线程降级路径产生未处理的 Promise 异常；正常解析和密码错误仍会报告。补丁原文保留在 `dist/vendor/pdfjs/patches/`，其哈希记入 `provenance.json`。`pnpm verify:worker-lifecycle` 使用 Chromium/WebKit 分别验证真实 Worker 和主线程降级路径的取消、后续渲染及损坏文件报错。

## 鼠标拖拽浏览

设置 `options.pdf.handTool: true`，可在 PDF 阅读区按住鼠标左键拖动页面。默认关闭，
保留原有文字选择行为。触摸滚动与双指缩放、链接、表单控件、滚动条及带修饰键的操作
保持原生行为。

```ts
const options = { pdf: { handTool: true } }
```

## 页面方向与打印

适配缩放、侧栏和首页缩略图、导出图片及打印均叠加 PDF 页面原有旋转角度
与查看器旋转偏移。视图状态中的 `rotation` 仍表示查看器偏移，不包含文件
中的原始旋转。混合尺寸和方向的页面使用独立 CSS 页面规则打印，不改写
源 PDF。打印对话框的纸张覆盖设置仍可能强制统一尺寸。
