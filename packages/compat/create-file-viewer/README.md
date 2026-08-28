# create-file-viewer

`create-file-viewer` 是 File Viewer 官方脚手架入口，适用于：

```bash
npm create file-viewer@latest
pnpm create file-viewer
yarn create file-viewer
bun create file-viewer
```

它会调用同版本的 `@file-viewer/cli`，让你选择框架、已验证的框架版本、功能方案、支持格式、包来源和自托管资产目录，并生成可直接启动的项目。

```bash
npm create file-viewer@latest -- my-viewer
npx file-viewer-cli create --help
```

npm 包版本与 CLI catalog 始终严格对齐。固定执行 `npm create file-viewer@3.0.0` 会使用 `@file-viewer/cli@3.0.0`，`@latest` 使用当前稳定版本。需要从私有或镜像 registry 选择版本时，必须显式提供不含用户名、密码或 token 的 registry URL：

```bash
npm create file-viewer@latest -- my-viewer \
  --registry https://registry.example.com/npm/ \
  --file-viewer-version 3.0.0

npm create file-viewer@latest -- my-viewer \
  --registry https://registry.example.com/npm/ \
  --file-viewer-version latest \
  --non-interactive --yes
```

离线环境可通过 `--offline-dir` 指向一个带完整性清单的版本目录，也可以指向包含多个一级版本子目录的父目录。每个可选版本目录必须包含 `file-viewer-offline-manifest.json`、精确版本的 `@file-viewer/cli` tgz 及其 File Viewer 自有依赖闭包；执行前会逐个校验清单声明的 SHA-512。

```bash
npm create file-viewer@latest -- my-viewer \
  --offline-dir ./file-viewer-releases \
  --file-viewer-version 3.0.0 \
  --non-interactive --yes
```

交互式终端会显示稳定版本的编号菜单。非交互式多版本场景必须明确指定精确版本或 `latest`。包含凭据的 registry URL 会被拒绝；npm 凭据只保留在用户自己的 npm 配置中，不会写入生成项目，也不会出现在执行参数输出中。环境变量中的 registry 不会被当作静默版本发现来源。

此包只提供轻量入口，不包含 renderer、Worker、WASM、字体或其他静态资产。新项目默认使用轻量的 `standard` 方案；专业格式按需选择。已有八个 Full 包的历史格式矩阵和资产行为保持兼容。

- [CLI 使用主页](https://file-viewer.app/cli/)
- [完整中文指南](https://doc.file-viewer.app/zh/guide/cli)
