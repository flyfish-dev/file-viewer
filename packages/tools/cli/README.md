# @file-viewer/cli

File Viewer 的项目创建、已有项目接入、能力选择和离线交付 CLI。它只携带冻结的能力目录，不重复打包 renderer、Worker、WASM、字体或其他静态资源。

- [CLI 使用主页](https://file-viewer.app/cli/)
- [完整中文指南](https://doc.file-viewer.app/zh/guide/cli)
- [English README](./README.en.md)

## 快速开始

创建一个可运行项目：

```bash
npm create file-viewer@latest my-viewer
```

接入当前 `package.json` 项目：

```bash
npx file-viewer-cli@latest add .
```

`file-viewer-cli` 是便于 `npx` 自动选择命令的单 bin 入口，并严格依赖同版本的本 scoped 包。项目已经安装 `@file-viewer/cli` 时，直接运行 `file-viewer add .`。

向导可选择框架及其已校验版本、File Viewer 版本、profile、格式、包管理器和资源目录。交互模式会按 renderer/格式族列出复选项，profile 已包含的能力预先打勾并保持启用；额外能力可用单个编号或范围切换，无需手写扩展名。支持 Vanilla/Web Component、Vue 3、Vue 2.7、Vue 2.6、React、React Legacy、Svelte 和 jQuery。

新建项目使用 Vite 8。生成的 `package.json` 会声明 Node `^20.19.0 || >=22.12.0`，并在 `dev`/`build` 前执行版本检查；不兼容环境会直接给出升级和重新安装依赖的操作提示，而不是以间接的 `CustomEvent` 异常失败。

```bash
npx file-viewer-cli create my-viewer \
  --framework vue3 \
  --profile standard \
  --formats pdf,docx,xlsx,pptx \
  --package-manager pnpm \
  --non-interactive \
  --yes
```

`add` 会检测 `packageManager`、lockfile、框架及版本、既有 preset/Full 包、Vite、Vue CLI、Webpack、Next.js、Nuxt 2/3、可静态证明的公开目录和应用入口。存在多个候选或无法安全推导静态目录时会生成 `manualSteps`，并在安装或写文件前失败关闭；确认实际构建目标后可显式传入 `--asset-target`。

## Standard 与 Full

`standard` 是新项目推荐的常用格式基线。现有八个 `@file-viewer/*-full` 包继续保持已发布的 `preset-all`、API、资产和格式行为，不会被静默改成 `standard`。

直接安装 Full 包不会自动带入以后新增的专业能力；通过 CLI 明确选择 `--profile full` 时，CLI 会保留对应 Full 包并加入目录中的后续可选能力。当前额外能力是 DICOM 和数字签名/证据容器，因此确认前会显示体积和许可证信息。DICOM 仅预览本地单个 DICOM Part 10 文件及其多帧，不包含 series、PACS/DICOMweb、MPR、分割、诊断或内嵌 OHIF。签名 renderer 仅声明有界容器检查和密码学验证结果，不代替证书信任、政策或法律效力判定。

## 配置、资产与旧命令兼容

```bash
npx file-viewer-cli list
npx file-viewer-cli config add dicom --write
npx file-viewer-cli config add p7m --write
npx file-viewer-cli plan --framework vue3 --profile full
npx file-viewer-cli install --yes
npx file-viewer-cli assets --write
npx file-viewer-cli doctor --json
npx file-viewer-cli verify --json
```

原有命令和包继续可用：

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer \
  --renderers pdf,office-word-openxml

# 同一兼容实现的统一入口
npx file-viewer-cli copy-assets ./public/file-viewer \
  --renderers pdf,office-word-openxml
```

未提供项目配置时，`file-viewer assets` 的参数、环境变量、合并模式、回执及安全校验与 `file-viewer-copy-assets` 保持一致。默认合并并保留无关文件；只有同时传入 `--clean --confirm` 才会清理并替换专用且通过安全边界校验的 `file-viewer` 目标目录。完整部署 `@file-viewer/web-full/dist/` 时无需再复制资产。

## 私有源和离线 tgz

```bash
npx file-viewer-cli prepare \
  --framework vue3 \
  --profile standard \
  --registry https://registry.example.com/ \
  --offline-dir .file-viewer/offline \
  --concurrency 4 \
  --yes

npx file-viewer-cli add . \
  --profile standard \
  --offline-dir .file-viewer/offline \
  --cache-dir .file-viewer/package-cache \
  --non-interactive \
  --yes
```

离线目录包含精确 CLI，带完整性清单并按精确版本复用；tarball 还会核对包身份，但完整性不等于 registry 来源可信。远程源必须使用 HTTPS（HTTP 只允许回环地址）。`prepare` 并发为 `1-8`，安装并发为 `1-32`。Registry 凭据应配置在包管理器或 CI 中；CLI 拒绝 URL 内嵌账号密码，也不会把凭据写入项目配置。

## 失败恢复与依赖所有权

确认安装后，CLI 会先把已有的项目内 `node_modules` 及 Yarn unplugged 目录原子移动到同文件系统备份区，同时保存 manifest、lockfile、Yarn PnP/install-state、生成模块和受管资产目录。包管理器或资产步骤正常抛错时会恢复这些字节；无法建立安全原子备份时，会在调用包管理器前停止。

进程或主机被强制中断时，项目同级可能留下 `.<项目名>.file-viewer-install-*` 备份。再次执行前应先检查并恢复，不能直接删除。包管理器 cache（包括项目内 Yarn cache）不在该事务范围内。只有在配置的 `managedPackages` 中明确记录为 CLI 所有的过期重型依赖才会被移除；CLI 未安装、未跟踪的用户依赖保持不动。

## 帮助与语言

CLI 的交互和帮助支持英文、简体中文、日文和德文；`--json` 始终使用稳定英文键。

```bash
file-viewer --help --lang zh-CN
file-viewer create --help --lang en
file-viewer add --help --lang ja-JP
file-viewer prepare --help --lang de-DE
```

完整命令、配置字段、CI 模式、离线限制和故障排查请查看[完整 CLI 指南](https://doc.file-viewer.app/zh/guide/cli)。
