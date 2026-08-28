# file-viewer-cli

用于通过 `npx` 友好运行 File Viewer CLI 的单 bin 入口：

```bash
npx file-viewer-cli@latest add .
npx file-viewer-cli@latest plan --profile standard
```

本包不携带 renderer 或静态资源，只委托给严格同版本的 `@file-viewer/cli`。项目已安装 scoped 包后，可直接使用它提供的 `file-viewer` 命令。历史 `file-viewer-copy-assets` 命令和统一的 `copy-assets` 子命令均继续保留。

- [CLI 使用主页](https://file-viewer.app/cli/)
- [完整中文指南](https://doc.file-viewer.app/zh/guide/cli)
- [English](./README.en.md)
