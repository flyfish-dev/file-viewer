# @file-viewer/thumbnail

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/thumbnail/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/thumbnail/README.zh-CN.md)

Flyfish File Viewer 的浏览器缩略图生成器。它复用 `createViewer()`、已安装的 renderer 与可选的原生缩略图 adapter，支持固定并发、批量有序结果和低内存流式输出。

```bash
pnpm add @file-viewer/thumbnail @file-viewer/preset-all
```

```ts
import { createFileViewerThumbnailGenerator } from '@file-viewer/thumbnail'
import allPreset from '@file-viewer/preset-all'

const generator = createFileViewerThumbnailGenerator({
  // 与 createViewer() 使用相同的 preset/renderers 配置。
  viewerOptions: { preset: allPreset },
  concurrency: 2,
  timeoutMs: 30_000,
})

const thumbnail = await generator.generate({
  file,
  filename: file.name,
}, {
  width: 320,
  height: 240,
  format: 'webp',
  quality: 0.8,
})

for await (const item of generator.generateStream(files)) {
  if (item.ok) await upload(item.result.blob)
}

await generator.destroy()
```

单项可覆盖 `width`、`height`、`format: 'webp' | 'jpeg' | 'png'`、`quality`、`fit`、`background`、`timeoutMs` 和 `signal`。`generate()` 返回 Blob、实际 MIME、renderer ID、耗时、`embedded | provider-native | provider-dom | dom-fallback` 策略及 `degraded`；`generateBatch()` 逐项返回成功或失败且保持输入顺序，`generateStream()` 按完成顺序返回原始索引，并把待消费 Blob 数量限制在并发窗口内。

失败会使用 `FileViewerThumbnailError`，稳定错误码包括 `browser-required`、`unsupported`、`timeout`、`aborted`、`capture-failed`、`capture-unavailable`、`tainted-canvas`、`empty-output`、`destroyed` 和 `invalid-options`。

- 只支持真实浏览器；服务端需要自行在 Chromium 页面中调用。
- 字符串形式的 `preset: 'all'` 只在 Vite 插件或 preset side-effect import 已完成注册时有效；跨 bundler 示例应直接传入上面导入的 preset 对象。
- 内嵌预览始终优先于完整渲染：EPUB 使用声明的封面，其解析引擎作为安全固定、按需加载的离线产物随包发布；OOXML 与 3MF 使用 package thumbnail relationship，OpenDocument 与 XMind 使用包内缩略图，Apple Numbers 存在 Quick Look 缩略图时直接复用。
- 内嵌图片缺失、损坏、为空或浏览器无法解码时，会安全回退到 renderer 原生直出或首页捕获。
- PDF 与图片使用原生直出；没有内嵌预览时，Office、OFD、电子书等使用 renderer 提供的首页目标。
- 其他 renderer 使用 DOM fallback，并在结果中设置 `degraded: true`。
- 不持久化源文件或缩略图；缓存与上传由调用方负责。
- EPUB 引擎及内联依赖的版本、来源和许可证文本记录在 `dist/vendor/epubjs.NOTICE.txt`。
