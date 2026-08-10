# file-viewer-copy-assets

Flyfish File Viewer 官方静态资源复制 CLI。full 包已经内置 `preset-all`，但 Worker、WASM、字体和 vendor 文件仍需要发布到静态目录；缺少这些文件时只能使用部分格式。

所有 `*-full` 包都会自动安装与自身完全同版本的 CLI。Webpack、Vue CLI 等非 Vite 项目直接运行它并复制到默认静态目录：

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer
# pnpm 项目也可以运行：
pnpm exec file-viewer-copy-assets ./public/file-viewer
```

单独使用标准包时先显式安装同版本 CLI；需要独立执行时，也可以使用带明确版本的 `npx` 入口：

```bash
npm install -D file-viewer-copy-assets@2.2.6
npx --yes file-viewer-copy-assets@2.2.6 ./public/file-viewer
```

CLI 自带与当前版本严格匹配的资源载荷，会将 Worker、WASM、字体、PDF、CAD、Typst、Archive、Draw.io 和 Office vendor 资源复制到目标目录，并生成 `flyfish-viewer-assets.json` 完整性清单。安装或执行 `--version` 不会修改项目目录；只有执行复制命令时才会写入指定目标。运行时资源全部自托管，不依赖公共 CDN。

复制完成后，静态服务必须把目标目录映射为部署基址下的 `file-viewer/`（根部署即 `/file-viewer/`），并让清单、JavaScript、WASM、字体等 URL 以正确 MIME 返回。清单通过只能证明本地资源完整，不能替代 HTTP 部署检查。若资源不在这个约定目录，请同步调用 full 包导出的 `setDefaultFullAssetBaseUrl()`。

Vite 项目优先使用 `@file-viewer/vite-plugin` 的 `copyAssets: true`，插件会按已安装的 full/preset 自动发布资源。完整部署 `@file-viewer/web-full/dist/` 的 CDN/IIFE 场景已经携带 assets，无需再次复制；只部署入口 IIFE 文件并不完整，可改用随包安装的 CLI。

## 用法

```bash
# 默认输出到 ./public/file-viewer
npx --no-install file-viewer-copy-assets
# pnpm 等价命令
pnpm exec file-viewer-copy-assets

# 保留目标目录中已有的其他文件
pnpm exec file-viewer-copy-assets ./public/file-viewer --no-clean

# 未安装本地依赖时，显式锁定独立 CLI 版本
pnpm dlx file-viewer-copy-assets@2.2.6 ./public/file-viewer
```

可使用 `FILE_VIEWER_PUBLIC_DIR` 设置默认输出目录，或将 `FILE_VIEWER_SKIP_ASSET_COPY=1` 用于需要跳过复制步骤的 CI 场景。完整部署说明见 [File Viewer 文档](https://doc.file-viewer.app/guide/distribution)。

English: [README.en.md](./README.en.md)
