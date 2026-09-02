# @file-viewer/renderer-chm

File Viewer 的浏览器原生 CHM 阅读器。ITSF/ITSP 目录和 LZX 内容由专用 Rust/WASM Worker 在本地解析，文件不会上传到服务端。

阅读器提供目录、关键词索引、正文搜索、内部链接和按需资源加载。主题 HTML 始终在无脚本 sandbox 中显示，并由 CSP 阻断 ActiveX、脚本、表单、插件和外网资源。

默认离线资产路径：

- `vendor/chm/chm.worker.js`
- `vendor/chm/chm_wasm.js`
- `vendor/chm/chm_wasm_bg.wasm`

私有部署可以通过 `options.chm.workerUrl`、`options.chm.wasmModuleUrl` 和 `options.chm.wasmUrl` 覆盖这些路径。
