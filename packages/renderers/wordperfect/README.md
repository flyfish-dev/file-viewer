# @file-viewer/renderer-wordperfect

WordPerfect `.wpd/.wp/.wp5/.wp6` 独立 renderer。文件按 `FF 57 50 43` 内容签名路由，不执行宏。Worker 按需加载以 MPL-2.0 构建的 `libwpd 0.10.3` / `librevenge 0.0.6` WebAssembly，提取段落、标题、列表、内联样式、表格、页眉页脚和脚注；WASM 不可用时才退回有界文本预览。

源码归属、校验和和复现命令见 `vendor/libwpd-src/PROVENANCE.md`。许可明确的 WP 4.2、5.0、5.1、6.x 真实 fixture 已通过解析断言和 Chromium、Firefox、WebKit 浏览器 smoke，公开格式目录标记为 `structured / stable`；`.wp5/.wp6` 是内容签名路由别名，不以改后缀文件计作证据。
