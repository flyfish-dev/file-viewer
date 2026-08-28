---
description: 使用 File Viewer CLI 创建新项目、检测并接入已有项目、精确选择 renderer 或 preset、兼容 copy-assets，并为私有源或离线环境准备安装包。
---

# File Viewer CLI

零安装运行时使用 `npx file-viewer-cli@latest ...`：这个单 bin 入口严格委托给同版本 `@file-viewer/cli`。项目已经安装 scoped 包后，直接使用本地 `file-viewer` 命令。

<div class="doc-kicker">创建、接入、交付</div>

<p class="doc-lead">
用同一个 CLI 创建可运行项目、把 File Viewer 加入已有应用、精确选择格式能力、发布自托管静态资源，并为私有源或完全离线环境准备经过完整性校验的安装包。
</p>

<div class="doc-grid">
  <div class="doc-card">
    <strong>创建项目</strong><br />选择框架、经过验证的运行时版本、格式方案、额外格式、包管理器和资源目录。
  </div>
  <div class="doc-card">
    <strong>接入已有项目</strong><br />检查 package.json 项目，先展示完整计划，再安装精确版本并接入生成模块。
  </div>
  <div class="doc-card">
    <strong>发布资源</strong><br />只发布所选能力的资源，同时完整保留原 copy-assets 命令和 Full 包兼容契约。
  </div>
  <div class="doc-card">
    <strong>离线准备</strong><br />从显式 npm / 私有源并发准备带完整性清单的本地 tgz 目录。
  </div>
</div>

## 从这里开始

运行交互式脚手架：

```bash
npm create file-viewer@latest my-viewer
# 或
pnpm create file-viewer my-viewer
```

向导会依次展示框架、方案、File Viewer 发行版、已验证框架版本和可选格式，最后再统一确认。取消或选择不执行时不会修改项目。

需要在 CI 中稳定复现时，把所有选择写明：

```bash
npx file-viewer-cli@latest create my-viewer \
  --framework vue3 \
  --profile standard \
  --formats pdf,docx,xlsx,pptx \
  --package-manager pnpm \
  --non-interactive \
  --yes
```

`--yes` 是 `create`、`add`、`install` 的安装和写入确认。非交互模式没有它时只打印计划，不安装依赖，也不写文件。

## 选择框架和版本

| CLI 值         | 生成的接入方式                                  | 版本选择                           |
| -------------- | ----------------------------------------------- | ---------------------------------- |
| `web`          | Vanilla JavaScript + File Viewer Custom Element | 浏览器模板                         |
| `vue3`         | Vue 3 原生组件                                  | 当前 CLI 目录中的已验证 Vue 3 版本 |
| `vue2.7`       | Vue 2.7 原生组件                                | 已验证 Vue 2.7 版本                |
| `vue2.6`       | Vue 2.6 原生组件                                | 已验证 Vue 2.6 版本                |
| `react`        | React 18 / 19 组件                              | 选择已验证 React 18 或 19 版本     |
| `react-legacy` | React 16.8 / 17 兼容组件                        | 已验证旧版 React 版本              |
| `svelte`       | Svelte 原生 action / 组件配置                   | 选择已验证 Svelte 3、4 或 5 版本   |
| `jquery`       | jQuery 插件接入                                 | 已验证 jQuery 版本                 |

交互式向导会列出当前 CLI 目录冻结的精确版本。CI 使用 `--framework-version <精确版本>`。Vite 与框架插件版本作为一套经过构建验证的模板选择，CLI 不会任意拼接未经验证的运行时组合。

## 选择方案

| 方案          | 实际含义                                                                                         | 推荐场景                              |
| ------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `standard`    | 常用 Word、PDF/OFD、现代 PPTX、Spreadsheet、Archive、Email、Text、Image、Media，并配套精选资源包 | 新项目默认推荐                        |
| `lite`        | 文本、Markdown/代码、图片、音频、视频                                                            | 轻附件预览                            |
| `office`      | 已发布的 Office preset，包含其历史兼容格式                                                       | 需要保持现有 Office preset 契约的项目 |
| `engineering` | 已发布的工程 preset                                                                              | CAD、3D、EDA、Geo 与工程附件          |
| `all`         | 已发布的 `preset-all` 兼容矩阵                                                                   | 已明确使用 `preset-all` 的模块化项目  |
| `full`        | 对应的历史 `@file-viewer/*-full` 包，加上 CLI 目录中后续新增的全部显式能力                       | 能接受安装体积、明确要求全部能力      |
| `custom`      | 不使用固定 preset，只安装所选格式/能力包                                                         | 严格控制依赖                          |

<div class="doc-callout">
<strong>standard 与 Full 是两份不同契约。</strong>`standard` 是常用格式默认方案。已经发布的 8 个 `@file-viewer/*-full` 包继续保持原来的 `preset-all`、运行时资源、API 和格式行为，不会被静默替换成 `standard`。直接安装 Full 包也不会自动增加后续专业包；在本 CLI 中选择 `--profile full` 时，会完整保留原 Full 包，再加入目录中后续声明的显式能力。当前新增项包括 DICOM 和数字签名容器，因此 CLI 会在最终确认前醒目展示它们的体积、运行时与许可证边界。
</div>

如果安装体积会影响交付，先看 Full 计划：

```bash
npx file-viewer-cli plan --framework react --profile full
```

计划会列出锁定版本、资源命令、重型能力、许可证声明和当前实测 Full 安装区间，不会用一个很小的顶层 tgz 数字掩盖完整依赖闭包。

## 选择格式与可选能力

创建或接入时可以直接写文件扩展名或能力 id：

```bash
npx file-viewer-cli create viewer \
  --framework react \
  --profile standard \
  --formats dwg,typst \
  --yes
```

先检查目录，再修改已经初始化的项目：

```bash
npx file-viewer-cli list
npx file-viewer-cli config add dwg --write
npx file-viewer-cli config add dicom --write
npx file-viewer-cli config add p7m --write
npx file-viewer-cli config remove dwg --write
npx file-viewer-cli plan
npx file-viewer-cli install --yes
```

`standard` 中的重型能力始终需要显式选择。生成模块只 import 固定 profile 与额外能力；运行时仍然只在打开对应格式后才加载 renderer。

### DICOM 边界

`dicom` 安装可选的本地 DICOM Part 10 renderer，只支持单个本地单帧或多帧文件，包含有界解码和帧切换。它**不提供**多文件序列组装、PACS/DICOMweb、MPR、分割、诊断解读，也不嵌入整套 OHIF 应用。

### 数字签名能力边界

`p7m`（或能力 id `signature`）安装可选的本地签名与证据容器 renderer。它在 Worker 中有界检查 CMS/CAdES、RFC 3161/5544 时间戳、ASiC-S/E、RFC 4998 证据记录、JWS 与公开 OpenPGP 材料。密码学验证结果与证书/密钥信任、合格签名身份、政策合规和法律效力分开呈现。私钥操作、自动解密、远程 `jku`/`x5u` 获取、完整 XAdES 和归档政策验证不在该能力声明内。

## 创建新项目

脚手架只在确认计划后写入一个小型 Vite 项目和 File Viewer 接入层。按框架不同，会生成：

- `package.json`、`index.html`、`src/main.mjs`；
- Svelte 所需的 `src/App.svelte` 与 `vite.config.mjs`；
- 持久记录选择的 `file-viewer.config.json`；
- 默认确定性 renderer 注册模块 `file-viewer.generated.mjs`；
- 业务入口中的一条生成模块 import 标记；
- 精确版本 File Viewer 依赖和所选静态资源。

只预览、不写入：

```bash
npx file-viewer-cli create ./viewer \
  --framework svelte \
  --framework-version <已验证版本> \
  --profile standard \
  --non-interactive \
  --json
```

只有审阅 dry-run 后才使用 `--force`。它允许替换冲突的 CLI 脚手架、配置和生成文件，不是任意重写业务文件的通行证。

## 接入已有项目

在 `package.json` 所在目录运行 `add`，或者用位置参数传目录：

```bash
cd existing-app
npx file-viewer-cli add

# 在其它目录执行同一操作
npx file-viewer-cli add ./existing-app
```

检查范围包括：

- 优先读取 `packageManager`，然后检查 lockfile；
- Vue、React、Svelte、jQuery 依赖及其声明的运行时版本线；
- 已安装的 standard / preset / Full File Viewer 方案；
- Vite、Vue CLI、Webpack、Next.js、Nuxt 2/3 构建配置；
- 可静态证明的 Vite `publicDir`、Nuxt `dir.public` / `dir.static`，以及 Vue CLI、Next.js 的约定静态目录；
- 已有 File Viewer 包与当前目录版本是否漂移；
- 可以自动加入生成模块 import 的应用入口。

检测到多个框架或多个已安装方案时会停止，要求显式传入 `--framework` 或 `--profile`。动态或禁用的静态目录、多份构建配置、通用 Webpack 输出和未知构建系统会生成明确的 `manualSteps`，并在安装和写文件前失败关闭；确认实际构建目标后可传入受项目边界约束的 `--asset-target` 继续。已有框架版本没有精确命中已验证模板时，CLI 会保留现有运行时并提示风险，不会静默改版本。

先检查检测结果和命令：

```bash
npx file-viewer-cli add . --profile standard --json
```

再应用同一选择：

```bash
npx file-viewer-cli add . --profile standard --yes --non-interactive
npx file-viewer-cli verify --json
```

找不到已支持的业务入口时，`add` 会在安装和写入前失败关闭。请显式传入 `--entry <项目内客户端入口>`；不要把浏览器接入代码注入仅用于 SSR 的入口。

## 配置与生成模块

默认 `file-viewer.config.json` 只包含项目相对路径，可以提交到版本库：

```json
{
  "schemaVersion": 1,
  "framework": "vue3",
  "profile": "standard",
  "formats": ["dwg"],
  "capabilities": [],
  "assetTarget": "public/file-viewer",
  "generatedModule": "file-viewer.generated.mjs",
  "locale": "zh-CN"
}
```

| 字段                             | 用途                                                |
| -------------------------------- | --------------------------------------------------- |
| `framework` / `frameworkVersion` | 原生接入方式和精确的已验证运行时目标                |
| `profile`                        | 固定 preset、兼容 Full 或 custom 选择               |
| `formats` / `capabilities`       | 通过冻结目录解析的显式增量                          |
| `assetTarget`                    | 项目相对静态目录，默认 `public/file-viewer`         |
| `generatedModule`                | 项目相对的确定性注册模块                            |
| `source`                         | 显式 registry 或带完整性清单的离线目录              |
| `assetBaseUrl`                   | 显式自托管/CDN 运行时根地址；省略时使用本地同源资源 |
| `managedPackages`                | CLI 安装并拥有的包，用于安全清理过期重型依赖        |
| `locale`                         | CLI 显示语言；JSON 字段始终使用稳定英文键           |

也可以单独查看或生成模块：

```bash
npx file-viewer-cli generate
npx file-viewer-cli generate --write
```

应修改配置后重新生成，不要直接维护生成文件。除非明确使用 `--force`，CLI 不会覆盖用户自有文件。

### 安装失败恢复边界

确认执行 create/add/install 后，CLI 会在包管理器步骤前，把已有的项目内 `node_modules` 及 Yarn unplugged 目录原子移动到项目同级、同文件系统的备份区；同时保存 `package.json`、已有 lockfile、Yarn PnP/install-state、CLI 配置/生成模块和受管资产目录。包管理器或资产步骤正常抛错时会恢复这些字节。无法建立安全原子备份区时，CLI 会在调用包管理器前失败关闭。

进程或主机被强制中断不属于正常异常事务，项目同级可能留下 `.<项目名>.file-viewer-install-*`。再次执行前应先检查并恢复该备份，不能直接删除。包管理器 cache（包括项目内 Yarn cache）不会回滚。只有 `managedPackages` 明确记录为 CLI 所有的过期重型依赖才会被移除；未跟踪的依赖声明视为用户所有并保留。

## 资源命令与 copy-assets 兼容

已经配置的模块化项目只安装或修复所选资产所有者：

```bash
npx file-viewer-cli assets --write
```

原聚合命令、包名和 bin 完整保留：

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer

# 统一 CLI 中的等价入口
npx file-viewer-cli copy-assets ./public/file-viewer
```

没有项目配置、并传入旧目标/选项时，`file-viewer assets` 也保持旧 copy 行为；存在模块化配置时，它执行所选资产计划，不能把旧参数混进新计划。

| 旧选项 / 环境变量               | 行为                                                          |
| ------------------------------- | ------------------------------------------------------------- |
| `[target-directory]`            | 默认 `public/file-viewer`                                     |
| `--renderers <csv>`             | 只复制指定 renderer 资源组                                    |
| `--no-clean`                    | 合并模式，也是默认值，保留无关文件                            |
| `--clean --confirm`             | 两个参数同时存在时，才替换专用且安全的 `file-viewer` 目标目录 |
| `FILE_VIEWER_PUBLIC_DIR`        | 默认输出目录                                                  |
| `FILE_VIEWER_SKIP_ASSET_COPY=1` | CI 显式跳过复制                                               |
| `INIT_CWD`                      | 包管理器调用时的项目根目录                                    |

复制过程写入 manifest 和 receipt，校验必需文件，拒绝路径越界和符号链接目标，不覆盖无所有者文件或被外部修改的受管资源。现有 Full 包命令继续委托给同版本实现。完整部署 `@file-viewer/web-full/dist/` 已经包含自身资源，不需要再次复制。

## 私有 registry

远程 registry 必须使用 HTTPS；明文 HTTP 只允许显式的 `127.0.0.1` 等回环地址用于本地测试：

```bash
npx file-viewer-cli add . \
  --profile standard \
  --registry https://registry.example.com/ \
  --cache-dir .file-viewer/package-cache \
  --yes
```

CLI 不会为了获取缺失的 copy-assets 载荷而静默使用环境中的 registry。包含用户名或密码的 registry URL 会被拒绝。认证应放在包管理器的用户/CI 配置中，不要写入项目配置或命令历史。

`--registry` 只影响 npm 包获取。Worker、WASM、字体和 vendor 运行时资源仍然自托管；只有显式设置 `--asset-base-url` 时才会使用经过批准的其它源。

## 准备离线 tgz 目录

`prepare` 及别名 `cache` 会从显式 registry 下载精确的 File Viewer 自有依赖闭包，并发范围为 `1-8`。每个 tarball 都会校验为目录内普通文件，并核对 SHA-512、包名、版本和依赖元数据，最终以原子方式写入目录和 `file-viewer-offline-manifest.json`。完整性只能证明字节与准备清单一致，不能证明 registry 来源可信，因此必须使用受信任的软件源。

先预览：

```bash
npx file-viewer-cli prepare \
  --framework vue3 \
  --profile standard \
  --registry https://registry.npmjs.org/ \
  --offline-dir .file-viewer/offline
```

审阅后准备：

```bash
npx file-viewer-cli prepare \
  --framework vue3 \
  --profile standard \
  --registry https://registry.npmjs.org/ \
  --offline-dir .file-viewer/offline \
  --concurrency 4 \
  --yes
```

在目标环境使用经过校验的目录：

```bash
npx file-viewer-cli add . \
  --profile standard \
  --offline-dir .file-viewer/offline \
  --cache-dir .file-viewer/package-cache \
  --yes \
  --non-interactive
```

离线目录包含所选能力所需的 File Viewer 自有包闭包、必要兼容包，以及供 `create-file-viewer` 使用的精确 `@file-viewer/cli`。它不会顺带镜像无关框架包或业务项目的全部第三方依赖；真正断网安装仍需为这些依赖准备包管理器 cache。npm、pnpm、Yarn Classic 与 Yarn Berry 都会收到各自正确的离线约束；Bun 仍需预热 cache。

安装时 `--registry` 与 `--offline-dir` 互斥。只有根包选择、registry、文件名、版本和完整性哈希全部相同时，已有离线目录才会被复用。

## 帮助与语言

CLI 会尽量跟随系统语言，也支持显式指定四种帮助语言：

```bash
file-viewer --help --lang en
file-viewer --help --lang zh-CN
file-viewer --help --lang ja-JP
file-viewer --help --lang de-DE

file-viewer create --help --lang en
file-viewer add --help --lang zh-CN
file-viewer doctor --help --lang ja-JP
```

提示和可读计划标签会本地化；`--json` 始终使用稳定英文键，方便 CI 和工具解析。

### 命令

| 命令                        | 用途                                                | 写入门禁                                 |
| --------------------------- | --------------------------------------------------- | ---------------------------------------- |
| `create [dir]`              | 创建可构建项目                                      | 交互确认或 `--yes`                       |
| `add [dir]`                 | 检测并接入已有项目                                  | 交互确认或 `--yes`                       |
| `list`                      | 列出格式、renderer id、包、体积、许可证和资产所有者 | 只读                                     |
| `plan`                      | 打印精确安装与资产计划                              | 只读                                     |
| `init`                      | 创建/更新项目配置                                   | `--write`                                |
| `config add/remove <token>` | 修改显式格式/能力                                   | `--write`                                |
| `generate`                  | 生成确定性接入模块                                  | `--write`                                |
| `install`                   | 按配置安装精确包和资产                              | `--yes`                                  |
| `assets`                    | 安装/修复配置资产；无配置时兼容旧模式               | 配置模式使用 `--write`                   |
| `copy-assets`               | 执行完整旧 copy-assets 契约                         | 直接写目标；清理还需 `--clean --confirm` |
| `prepare` / `cache`         | 构建经过校验的本地 tgz 目录                         | `--yes`                                  |
| `doctor`                    | 报告依赖、入口、receipt、哈希和资产问题             | 只读                                     |
| `verify`                    | 执行 doctor，有错误时非零退出                       | 只读                                     |

### 常用选项

| 选项                                       | 用途                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| `--project <dir>`                          | 项目根目录，也支持位置参数 `create/add <dir>`                             |
| `--framework <name>`                       | 选择 8 种框架接入之一                                                     |
| `--framework-version <version>`            | 选择目录中精确且已验证的运行时模板                                        |
| `--profile <name>`                         | `standard`、`lite`、`office`、`engineering`、`all`、`full`、`custom`      |
| `--formats <csv>` / `--capabilities <csv>` | 增加精确目录项                                                            |
| `--package-manager <name>`                 | `npm`、`pnpm`、`yarn` 或 `bun`                                            |
| `--package-manager-version <version>`      | 精确包管理器版本，用于记录并区分 Yarn Classic 与 Yarn Berry               |
| `--asset-target <dir>`                     | 受项目边界约束的相对资源目录                                              |
| `--output <file>` / `--config <file>`      | 受项目边界约束的生成/配置文件                                             |
| `--registry <url>`                         | 显式 npm / 私有源                                                         |
| `--offline-dir <dir>`                      | 带完整性清单的本地 tgz 目录                                               |
| `--cache-dir <dir>`                        | 可控包管理器 cache/store                                                  |
| `--concurrency <n>`                        | `prepare/cache` 为 `1-8`；安装阶段的包管理器网络/脚本并发为 `1-32`        |
| `--file-viewer-version <version>`          | 要求与已安装 CLI 目录精确匹配                                             |
| `--asset-base-url <url>`                   | 显式批准的运行时资源根地址；默认仍是本地                                  |
| `--json`                                   | 使用稳定英文键的机器可读输出                                              |
| `--non-interactive`                        | 在 CI 中关闭提示                                                          |
| `--yes` / `--write`                        | 对应命令组的显式执行门禁                                                  |
| `--force`                                  | 审阅后替换冲突的 CLI 管理配置/生成/脚手架文件                             |
| `--dry-run`                                | 即使同时传入 `--yes` 或 `--write`，所有写命令也强制变为零写入、零安装预览 |

## CI 模式

把计划和修改分开：

```bash
# 可审阅，不写入
npx file-viewer-cli plan \
  --framework vue3 \
  --profile standard \
  --formats dwg \
  --json > file-viewer-plan.json

# 应用精确目录选择
npx file-viewer-cli add . \
  --framework vue3 \
  --profile standard \
  --formats dwg \
  --non-interactive \
  --yes

# 版本、入口 import、receipt、哈希或资产漂移时让 CI 失败
npx file-viewer-cli verify --json
```

JSON 计划保存 command 与 args 数组，而不是经过 shell 插值的字符串，自动化可以先审阅再执行，不需要求值用户可控 shell 文本。

## 常见问题

| 提示或现象                           | 处理方式                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `No package.json was found`          | 新项目运行 `create`；已有项目在 package.json 目录运行 `add`。                 |
| 检测到多个框架/方案                  | 明确传入目标 `--framework` / `--profile`，CLI 不猜。                          |
| 请求版本与目录不一致                 | 使用匹配的 `@file-viewer/cli@<version>`，不要混用发行目录。                   |
| 现有框架不是已验证脚手架版本         | 保留并审阅提示，或主动选择已验证 `--framework-version`。                      |
| 缺少 copy-assets 载荷                | 安装匹配 Full/copy 包、配置显式 registry，或提供经过校验的离线目录。          |
| Worker/WASM/字体请求返回 HTML 或 404 | 执行配置资源步骤，按配置根地址提供静态文件，并在正式域名检查 MIME。           |
| Full 安装耗时太长                    | 优先选 `standard` 或 `custom`；确有 Full 需求时使用私有源/离线 cache 预准备。 |

继续阅读：[模块化方案](/zh/guide/v3-modular-profiles)、[按需 renderer](/zh/guide/on-demand-renderers)、[发布与分发](/zh/guide/distribution)、[格式事实](/zh/guide/formats)。
