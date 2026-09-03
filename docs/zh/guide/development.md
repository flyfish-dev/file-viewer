# 本地开发与打包

> **Maintainer-only commands:** this page contains complete-workspace release or verification examples that are not part of the public checkout. Public contributors should use the commands in `/README.md` or `/docs/guide/development.md`.

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->

<div class="doc-kicker">Build With Confidence</div>

<p class="doc-lead">
  当你准备发布一个可分发组件时，代码、文档、Demo 和打包产物最好能在本地一次性对齐。
  这一页把常用命令、建议验证顺序和发版前检查项整理在一起，方便团队复用。
</p>

## 安装依赖

```bash
pnpm install
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动示例站点 |
| `pnpm build` | 类型检查并构建正式示例站点 |
| `pnpm build:vue3` | 构建 Vue3 标准组件包产物 |
| `pnpm obfuscate` | 对 `packages/components/vue3/dist/` 中的库 JS 产物做压缩混淆 |
| `pnpm release:ecosystem:pack` | 构建 core、标准组件包、历史兼容 alias，并生成完整 npm tarball |
| `pnpm build:viewer-assets` | 构建 Vue3 基线产物，并同步 Worker/WASM viewer assets 到 `packages/compat/web/viewer` |
| `pnpm build:components` | 构建 Vue3 基线 viewer、历史兼容包和所有标准组件包 |
| `pnpm verify:demo-output` | 校验 Demo 多入口 HTML 及其引用的静态资源，防止比对页或 hash 资源漏传 |
| `pnpm verify:demo-browser-smoke` | 使用 Playwright 打开构建后的主 Demo 和文档比对页，验证轻量样例渲染、双栏组件挂载和比对页快捷键搜索 |
| `pnpm verify:browser-smoke` | 构建主 Demo 和 组件 Demo，并统一跑主 Demo、文档比对、React/Web/Vue3/jQuery/Svelte 和 script tag IIFE 浏览器 smoke |
| `pnpm verify:branch-roles` | 校验 `origin` 私有 Gitea 聚合仓、main/v2/v3 分支职责、core 公开策略、标准组件包公开仓库和公开仓库策略 |
| `pnpm verify:core-api` | 校验 `@file-viewer/core` 根入口、`@file-viewer/core/headless` 契约入口、`@file-viewer/core/browser` 浏览器渲染入口、实例方法、framework-neutral 类型、ESM/声明产物元数据和纯 TS 源码边界 |
| `pnpm verify:format-support` | 校验格式目录保持 266 个注册扩展名、224 个稳定、42 个实验、45 条预览链路、无重复扩展名归属，并确认生成表、README / 文档站 / 组件 README 口径一致 |
| `pnpm verify:ecosystem-readmes` | 校验根 README / README.zh-CN.md / README.en.md 的公开生态索引、官方文档/Demo、GitHub/Gitee 组件仓库、入口格式、历史兼容包、core 公开仓和格式数量口径 |
| `pnpm verify:compatibility-api` | 校验历史兼容包的运行门面边界: React 兼容包转发到标准 React 组件包，纯 Web 兼容包转发到标准 web 组件包，scoped Vue3 根包只保留 core 类型门面、登记过的 alias 和受控公共类型出口，`file-viewer3` 保持薄 alias |
| `pnpm verify:compatibility-readmes` | 校验历史兼容包 README / README.en.md 明确推荐迁移到对应 `@file-viewer/*` 标准包名 |
| `pnpm verify:wrapper-api` | 校验标准组件包的运行入口、组件/插件/action/helper 导出和 controller 方法，并阻止 `mountViewerFrame`、`postFileToViewer` 等旧独立页面 API 回流，防止不同框架接入体验漂移 |
| `pnpm verify:wrapper-options` | 校验标准组件包使用本包本地 controller 暴露统一参数和 handle，controller 只消费 `@file-viewer/core` 底层契约，不重新声明 theme、toolbar、watermark、search、AI、Office、CAD 等预览选项，也不依赖其他组件包 |
| `pnpm verify:smoke-matrix` | 校验 `ecosystem/smoke-matrix.json` 覆盖当前 renderer pipeline、标准组件包和真实示例文件 |
| `pnpm verify:experience-baseline` | 校验 `ecosystem/experience-baseline.json` 中的 Vue3 当前组件、比对页、历史 React、历史纯 JS 和 script 标签 IIFE 基线体验证据 |
| `pnpm verify:ecosystem-tarballs` | 使用 npm dry-run 校验生态包包含中英文 README 和声明入口，且不会打入未声明源码、工作区文件、source map、`.DS_Store` 或非 bin 脚本 |
| `pnpm verify:ecosystem-versions` | 校验 core、标准组件包和兼容包版本一致、内部 workspace 依赖范围一致、README 打包声明、标准组件包仓库元数据和历史包依赖边界 |
| `pnpm verify:release-status-schema` | 校验开源总仓 `artifacts/release-status.json` 符合 `release-status.schema.json`，并确认 gap 分类摘要结构稳定 |
| `pnpm verify:public-main` | 校验开源总仓库的 release manifest、tarball、README、组件仓库索引、入口格式、历史兼容包和源码边界 |
| `pnpm verify:production-entrypoints` | 校验完整生态构建后的 package 入口、纯 Web viewer 资源、可导入 ESM 入口，以及 组件 manifest 声明的 ESM、类型、IIFE、viewer assets、复制 CLI 和 Svelte 组件入口 |
| `pnpm verify:migration-gates` | 迁移门禁: 类型检查、主 Demo 构建、文档站构建、格式矩阵、根 README 生态索引、smoke 矩阵、分支职责、组件源包、组件运行 API、组件参数面、兼容包 API/README、生态版本和 npm manifest 校验 |
| `pnpm deploy:cloudflare` | 构建 Demo、校验多入口产物，并通过 Wrangler Direct Upload 发布到 Cloudflare Pages |
| `pnpm docs:deploy:cloudflare` | 构建文档站，并发布到 `flyfish-file-viewer-docs` Cloudflare Pages 项目 |
| `pnpm docker:build` | 使用 Dockerfile 构建本机架构镜像 |
| `pnpm docker:publish` | 使用 buildx 推送 `linux/amd64` / `linux/arm64` Docker Hub 镜像 |
| `pnpm dev:components` | 启动 React + Pure Web + Vue3 + jQuery + Svelte 组件 Demo |
| `pnpm build:component-demo` | 构建 组件 Demo，验证上线静态产物 |
| `pnpm release:components:pack` | 构建并打包 core、历史兼容包和标准组件包 npm tarball |
| `pnpm release:components:publish` | 构建并发布 core、历史兼容包和标准组件包 npm 包 |
| `pnpm release:ecosystem:list` | 列出本仓库当前会统一发布的 npm 生态包 |
| `pnpm release:ecosystem:pack` | 构建完整生态并生成可离线安装的 npm tarball |
| `pnpm release:ecosystem:publish:dry-run` | 对完整生态包执行 npm publish dry-run |
| `pnpm release:ecosystem:publish` | 正式发布完整生态包；MFA 账号请使用交互式终端确认 |
| `pnpm components:readme` | 根据 `ecosystem/wrapper-readme-template.json`、组件 manifest 和 core 格式定义刷新所有标准组件包中英文 README 与根 README 生态矩阵 |
| `pnpm components:verify` | 校验 标准组件包和导出仓库的 README 模板、格式矩阵、仓库元数据、入口、依赖边界和源码边界 |
| `pnpm components:publish:dry-run` | 导出并校验独立 组件仓库，发布脚本复跑目标仓库预检后预览 GitHub/Gitee 推送动作 |
| `pnpm components:standalone-smoke` | 构建 core 与 标准组件包，导出独立 组件仓库，并用 npm 在临时独立仓库中安装、构建验证 |
| `pnpm components:publish` | 导出、校验，并由发布脚本复跑 freshness / 依赖边界预检后提交推送所有独立 组件仓库到 GitHub 和 Gitee |
| `pnpm docs:dev` | 启动 Fumadocs + Next.js 文档站 |
| `pnpm docs:build` | 构建 Fumadocs + Next.js 静态文档站 |
| `pnpm type-check` | 执行 Vue3 基线 TypeScript 类型检查 |
| `pnpm type-check:components` | 执行 React / Pure Web / jQuery / Svelte 等标准组件包类型检查 |
| `pnpm test` | 运行测试 |

## 推荐验证顺序

```bash
pnpm type-check
pnpm type-check:components
pnpm build
pnpm build:vue3
pnpm obfuscate
pnpm verify:browser-smoke
pnpm verify:demo-browser-smoke
pnpm build:component-demo
pnpm release:ecosystem:list
pnpm verify:branch-roles
pnpm verify:core-api
pnpm verify:format-support
pnpm verify:experience-baseline
pnpm verify:ecosystem-versions
pnpm components:readme
pnpm components:verify --source-only
pnpm verify:wrapper-api
pnpm components:standalone-smoke
pnpm components:publish:dry-run
pnpm docker:build
pnpm release:ecosystem:pack
pnpm verify:production-entrypoints
pnpm docs:build
pnpm test
```

如果你要发布 npm 包，再执行:

```bash
npm pack
```

或者直接使用项目内置的发包准备命令:

```bash
pnpm release:ecosystem:pack
```

## 完整生态发版

当前生态包线都使用 `latest`:

| 技术栈 | 分支 | npm 包 | 注册方式 |
| --- | --- | --- | --- |
| 私有原始聚合仓 | `main` | `@flyfish-group/file-viewer-workspace` | 完整 monorepo、apps、docs、core、标准组件包、兼容包、发布自动化和内部集成历史 |
| Core | `packages/core` / `file-viewer-core` | `@file-viewer/core` | framework-neutral 预览能力、能力矩阵、事件和操作 API |
| Vue3 | `v3` | `@file-viewer/vue3` / `@flyfish-group/file-viewer3` / `file-viewer3` | `createApp(App).use(FileViewer)` |
| Vue2.7 | `v2` | `@file-viewer/vue2.7` / `@flyfish-group/file-viewer` | 兼容 Vue2.7 插件式注册 |
| Vue2.6 标准组件包 | 当前仓库子工程 | `@file-viewer/vue2.6` | 兼容 Vue2.6 插件式注册 |
| React 18 / 19 | 当前仓库子工程 | `@file-viewer/react` / `@flyfish-group/file-viewer-react` | `<FileViewer url="/files/demo.pdf" />` |
| React 16.8 / 17 | 当前仓库子工程 | `@file-viewer/react-legacy` | legacy React 原生组件 |
| Pure Web | 当前仓库子工程 | `@file-viewer/web` / `@flyfish-group/file-viewer-web` | `<flyfish-file-viewer>` / `mountViewer(container, options)` |
| jQuery | 当前仓库子工程 | `@file-viewer/jquery` | `$(el).fileViewer(options)` |
| Svelte | 当前仓库子工程 | `@file-viewer/svelte` | Svelte component package |

分支职责以 `ecosystem/branch-roles.json` 和仓库根目录 `BRANCHES.md` 为准: 私有 Gitea 的 `main` 是完整原始聚合仓，保留完整 monorepo、统一发布自动化和内部集成历史，不缩减为 core-only，也不等同于 GitHub 开源总仓库。`@file-viewer/core` 的源码通过 `packages/core`、独立公开仓 `flyfish-dev/file-viewer-core` 和开源总仓库分发。标准组件包、core、PPTX 引擎和历史兼容包在当前仓库内作为子工程统一发布；`@file-viewer/ppt@0.3.3` 保持独立 npm 版本和包内许可证，不计入本仓库 88 个 npm 目标，但其公开运行时会作为 `vendor/ppt/` 资产纳入 Demo、Full、copy-assets 与 CDN/IIFE 统一交付。发版前必须通过 `pnpm verify:branch-roles`、`pnpm release:ecosystem:pack` 或 `pnpm release:ecosystem:publish:dry-run`，确保源码边界正确且组件入口使用最新 core 能力。

## 主要产物位置

- 正式 Demo 构建产物: `apps/viewer-demo/dist/`
- Docker 镜像运行产物: `apps/viewer-demo/dist/` 会被复制到 nginx 的 `/usr/share/nginx/html/`
- Vue3 标准组件包产物: `packages/components/vue3/dist/`
- 文档站构建产物: `apps/docs-site/out/`
- npm 包 tarball: 仓库根目录下的 `*.tgz`，完整生态 tarball 默认位于 `.release/ecosystem/`，组件离线安装包位于 `.release/components/`
- Pure Web 随包 viewer assets: `packages/compat/web/viewer/`
- 组件 Demo 构建产物: `apps/component-demo/dist/`
- 公开 GitHub / Gitee 仓库: 提供 core、标准组件包、兼容包、Demo、文档源码，同时保留混淆压缩后的库产物、Demo 静态站点、文档静态站点、示例文件和 tarball

## 发版前检查清单

- README 是否和当前代码能力一致
- README 和文档站是否同时写清 Vue3 / Vue2.7 / Vue2.6 / React / React Legacy / Pure Web / jQuery / Svelte / Core / PPTX 包名、版本和接入方式
- 文档站中的支持格式、native component package 接入说明和 Demo 截图是否最新
- `file` / `url` 的行为说明是否与运行逻辑一致
- 每轮迁移是否已经运行 `pnpm verify:migration-gates`，覆盖类型检查、主 Demo 构建、文档站构建、格式矩阵、根 README 生态索引、smoke 矩阵、体验基线证据、分支职责/源码边界、core API 与纯 TS 边界、组件源包校验、组件运行 API 与参数面一致性、兼容包运行/类型门面、兼容包 README 迁移提示、生态版本/依赖一致性和 npm manifest 列表校验
- 生态目标、包名、仓库和分支职责是否已经通过 `pnpm verify:ecosystem-readmes` / `pnpm verify:branch-roles`，确认 `ecosystem/wrappers.json` / `ecosystem/branch-roles.json` / core 格式矩阵口径一致
- 新增格式、示例或标准组件包时，`ecosystem/smoke-matrix.json` 是否已经同步补充对应样本、surface 和断言项
- 修改主入口、文档比对、历史 React / 纯 JS 组件或 script tag 接入时，`ecosystem/experience-baseline.json` 是否同步补充对应页面、特性组、事件/按钮/打印导出/视觉证据和验证脚本
- 每个标准组件包是否仍由 `wrapperCoverage.requiredFamilies` 覆盖 PDF、DOCX、XLSX、图片、Markdown、CAD、压缩包、邮件和地理数据这些关键族
- 生态 npm 版本、内部 workspace 依赖和仓库元数据是否已经通过 `pnpm verify:ecosystem-versions`，确认 core、标准组件包和历史兼容包不会漂移，且标准组件包仍指向对应 GitHub 公开仓库
- 根 README 与开源总仓库 README 是否已经通过 `pnpm verify:ecosystem-readmes` / `pnpm verify:public-main`，确认组件入口格式、GitHub/Gitee 仓库和历史兼容包口径没有漂移
- 生态 npm tarball 是否已经通过 `pnpm verify:ecosystem-tarballs` 或正式 pack 后的自动校验，确认每个包都包含中英文 README，并避免未声明源码、工作区目录、source map、构建配置和本地元数据泄露
- npm 最新版安装链路是否已经通过 `pnpm verify:npm-install-smoke`，确认 registry 安装和本地 tgz 依赖闭包安装在 npm 11.17.0 下都能正常完成并导入
- 生产入口是否已经通过 `pnpm verify:production-entrypoints`，确认 core、PPTX、Vanilla JS / Pure Web、Vue3、Vue2.7、Vue2.6、React、React Legacy、jQuery、Svelte 和历史兼容包的声明入口存在且 ESM 入口可被真实导入，并确认组件 manifest 的 ESM、类型、IIFE、viewer assets、复制 CLI 和 Svelte 组件入口与 package 字段、实际文件一致
- 本地构建和文档构建是否全部通过
- 主 Demo、文档比对页和 组件 Demo 是否已经通过 `pnpm verify:browser-smoke`，确认轻量文档实际渲染、左右比对组件挂载、`Ctrl/Command+F` 搜索浮层、React/Web/Vue3/jQuery/Svelte standard component package 和 script tag IIFE 行为正常
- React / Pure Web / jQuery / Svelte 组件 Demo 是否在开发服务和 build preview 中都能显示内容
- `packages/compat/web` / `packages/components/web` 的资源复制结果是否已经由最新构建产物同步
- `file-viewer-copy-assets` 是否生成 `flyfish-viewer-assets.json`，且 archive / CAD 等 worker/WASM 资源校验为 `valid: true`
- `.release/component-repos/*` 是否已经通过 `pnpm components:publish:dry-run` 预检，确认 GitHub/Gitee remotes、README、manifest、source HEAD freshness、依赖边界和 npm 入口元数据均来自 `ecosystem/wrappers.json`
- 组件 README 是否已经通过 `pnpm components:readme` 和 `pnpm components:verify --source-only`，确认中英文模板、生态矩阵、格式矩阵、官方文档和 Demo 链接与 `ecosystem/wrapper-readme-template.json` 一致
- 根 README 是否已经通过 `pnpm verify:ecosystem-readmes`，确认公开仓库同步前已包含 core 公开仓、标准包、历史兼容包、GitHub/Gitee 组件仓库、官方文档/Demo、私有聚合仓与优先支持说明
- 独立 组件仓库是否已经通过 `pnpm components:standalone-smoke`，确认离开 monorepo 后可用 npm 安装本地生态 tarball 并完成构建
- `npm pack` 产物中是否包含正确的 `dist/` 和 README
- 生态 tarball 是否包含 core、标准组件包、历史兼容包、README 中英文说明和必要的 `viewer/` / `dist/` 文件，且不包含 `.DS_Store`、source map 或私有源码
- 开源总仓库是否在 `pnpm release:public` 后自动通过 `pnpm verify:public-main`，确认 `artifacts/release-manifest.json`、`artifacts/release-status.json`、`artifacts/release-status.schema.json`、tarball、README 和 组件仓库索引均与当前生态清单一致
- 混淆后的 `packages/components/vue3/dist/index.mjs` 是否仍可被业务项目正常导入
- README 是否包含官方文档、在线 Demo、完整 npm 生态、私有化部署、GitHub / Gitee 公开仓库、私有聚合仓与优先支持和 Apache-2.0 许可证说明

## 部署建议

项目可以部署在 Cloudflare Pages、Vercel 或任意静态资源服务上。对外提供 Demo 和文档站时，建议:

- 使用 `file-viewer.app` 承载官方组件门户，负责产品定位、资源导航、生态入口和商业支持入口
- 使用稳定域名承载官网 Demo，方便用户快速验证能力
- 性能敏感场景优先使用 Cloudflare Pages / CDN 边缘节点承载官网、Demo 和文档静态产物，并保持 `file-viewer.app`、`demo.file-viewer.app`、`doc.file-viewer.app` 作为产品主入口
- 官方门户 Cloudflare Pages Direct Upload 可执行 `pnpm site:deploy:cloudflare`，默认发布到 `flyfish-file-viewer-site`
- Cloudflare Pages Direct Upload 可执行 `CLOUDFLARE_PAGES_PROJECT=flyfish-file-viewer pnpm deploy:cloudflare`，项目名可按控制台实际项目覆盖
- 文档站 Cloudflare Pages Direct Upload 可执行 `pnpm docs:deploy:cloudflare`，默认发布到 `flyfish-file-viewer-docs`
- 首次切换到 Cloudflare Pages 时，需先在 Pages 项目中添加 `demo.file-viewer.app` 自定义域名；如果 `flyfish.dev` 的 DNS 不在当前 Cloudflare 账号，需要在 DNS 托管处把 `demo.file-viewer.app` 的 CNAME 指向 `flyfish-file-viewer.pages.dev`
- 文档站切到 Cloudflare Pages 时同理，需要把 `doc.file-viewer.app` 添加到 `flyfish-file-viewer-docs` 的自定义域名，并让 DNS CNAME 指向 `flyfish-file-viewer-docs.pages.dev`
- `apps/viewer-demo/public/_headers` 已为哈希资源、WASM/Worker、示例文件和 HTML 配置缓存策略，部署到 Cloudflare 后会自动生效
- `docs/public/_headers` 已为 Next.js 哈希资源、图片、原始 Markdown 入口和 HTML 配置缓存策略，部署到 Cloudflare 后会自动生效
- Vanilla JS / Pure Web、React、jQuery 和 Svelte 包默认在用户项目内原生挂载预览器；如需 Worker/WASM 自托管，请使用资源复制命令并配置对应 options
- Docker 镜像发布后可直接运行 `flyfishdev/file-viewer:latest`，主预览入口是 `/`，零依赖嵌入入口是 `/iframe.html`，文档比对入口是 `/compare.html`
- 不要把已移除的旧式页面协议写成推荐接入方式
- 发布前先用本地构建产物做一次完整 smoke test

## 开源总仓库与支持

开源总仓库用于分发可直接运行的主 Demo 源码、core、标准组件包、兼容包、文档源码、构建产物、示例和 release tarball。私有 Gitea 继续作为完整聚合仓，保留统一发布自动化和内部集成历史。需要支持开源维护时，可使用 [GitHub Sponsors](https://github.com/sponsors/wybaby168) 或 [微信 / 支付宝](https://dev.flyfish.group/sponsor?source=github)；需要私有化、定制或明确响应时间时，请使用 [企业技术支持](https://dev.flyfish.group/shop)。

二开或商用时，请保留 File Viewer by Flyfish / `@flyfish-group/file-viewer3` 或 `@flyfish-group/file-viewer` 的来源说明、许可证和版权信息。通用问题修复和通用增强建议通过 issue / PR 贡献回来。
