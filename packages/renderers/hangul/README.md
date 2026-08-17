# @file-viewer/renderer-hangul

File Viewer 的 HWP v5 / HWPX 离线 renderer。HWPX 解析 ZIP/XML、段落、表格与媒体；HWP v5 解析 CFB、FileHeader、BodyText 和 BinData。解析默认在按需加载的模块 Worker 内执行，并限制解压量、压缩率、ZIP 条目数、HWP 记录数和超时。加密、DRM 与发行文档会被明确拒绝，不会尝试绕过保护。

可通过 `options.hangul` 覆盖 `workerUrl`、`workerTimeoutMs` 和解析安全上限；`useWorker: false` 只适用于没有 Worker 的兼容环境。可再分发的 Apache-2.0 HWP v5/HWPX fixture 已覆盖页面几何、样式、合并表格、页眉页脚、注释和图片，并通过 Chromium、Firefox、WebKit，公开格式目录标记为 `structured / stable`。罕见控件与生产者私有版式仍是已知限制。
