# 发布与开源分发

> **Maintainer-only commands:** this page contains complete-workspace release or verification examples that are not part of the public checkout. Public contributors should use the commands in `/README.md` or `/docs/guide/development.md`.

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->

<div class="doc-kicker">Release For Users</div>

<p class="doc-lead">
  这一页说明 File Viewer by Flyfish 对外分发时包含什么、如何安装、如何发布私有化 Worker/WASM viewer assets，以及开源总仓库和私有 Gitea 聚合仓之间的职责。
  GitHub / Gitee 的 <code>flyfish-dev/file-viewer</code> 是开源总仓库和主分发入口，包含可运行的主 Demo 源码、core、标准组件包、兼容包、文档源码和 release 索引；完整静态站点产物通过 GitHub Release 或 Cloudflare Pages 分发。
  为控制国内镜像仓库体积，Gitee 同步使用最新完整快照的干净历史，避免多轮二进制构建历史叠加。
  Gitee 镜像同步同一份开源总仓库内容，方便国内网络环境下载和部署。
</p>

## 分发渠道

| 渠道 | 地址 | 内容 |
| --- | --- | --- |
| 官方网站 | [file-viewer.app](https://file-viewer.app) | 一站式组件门户、产品定位、应用场景、资源导航和商业支持入口 |
| 官方文档/组件主页 | [doc.file-viewer.app](https://doc.file-viewer.app) | 主文档域名，提供组件主页、接入文档、格式说明和开源分发说明 |
| 在线 Demo | [demo.file-viewer.app](https://demo.file-viewer.app) | 可直接体验完整预览器，用于快速验证能力 |
| 文档比对 Demo | [demo.file-viewer.app/compare.html](https://demo.file-viewer.app/compare.html) | 独立入口，支持左右并排预览、上传、URL、同步滚动、聚焦搜索，以及 jsdiff 逐行对齐和字符级文字差异 |
| 官方 iframe Demo 交付包 | GitHub Release: `file-viewer-v2-*-official-demo-iframe.tar.gz` | 官方 Demo 的零依赖构建产物，包含 `iframe.html`、兼容原主 Demo 的 `index.html`、父页面示例、说明文件、样例和离线 Worker/WASM/vendor 资源 |
| Docker 镜像发布目标 | `flyfishdev/file-viewer:latest` | 可一键部署的 nginx 静态镜像，发布时支持 `linux/amd64` 和 `linux/arm64` |
| npm 标准生态 | [生态组件总览](/zh/guide/ecosystem) | 本仓库 54 个发布目标：`@file-viewer/core`、独立 renderer、preset、`@file-viewer/pptx` 引擎、Vanilla JS / Pure Web、Vue3、Vue2.7、Vue2.6、React、React Legacy、jQuery、Svelte 和历史兼容包；独立版本的 renderer 依赖不计入 npm 目标数 |
| 自托管静态资源 | `file-viewer/assets/*`、`file-viewer/vendor/*`、`file-viewer/wasm/*` | Worker、WASM、示例文件和重型渲染器资源，按需自托管 |
| GitHub 开源总仓库 | [github.com/flyfish-dev/file-viewer](https://github.com/flyfish-dev/file-viewer) | 一站式入口: README、LICENSE、主 Demo 源码、core、标准组件包、兼容包、文档源码、构建产物、示例和 release tarball |
| Gitee 开源总仓库 | [gitee.com/flyfish-dev/file-viewer](https://gitee.com/flyfish-dev/file-viewer) | 国内镜像目标，使用干净历史控制仓库体积；如远端配额阻塞，以 GitHub 开源总仓库和 release 为准 |
| GitHub Sponsors | [github.com/sponsors/wybaby168](https://github.com/sponsors/wybaby168) | 一次性或持续赞助开源维护 |
| 微信 / 支付宝赞赏 | [dev.flyfish.group/sponsor?source=github](https://dev.flyfish.group/sponsor?source=github) | 国内用户便捷的一次性支持入口 |
| 企业技术支持 | [dev.flyfish.group/shop](https://dev.flyfish.group/shop) | 私有化、定制兼容、聚合交付和需要明确响应时间的需求 |

## npm 安装

新项目优先使用 `@file-viewer/*` 标准包名。历史 `@flyfish-group/*` 包继续同步发布，但主要用于旧项目平滑升级。

| 场景 | 标准包 | 历史兼容包 |
| --- | --- | --- |
| Core 底座 | `@file-viewer/core` | 无 |
| 二进制 PPT 运行时 | `@file-viewer/ppt@0.3.3` | 独立版本 npm 依赖；公开资产纳入 Demo/Full/CDN 交付 |
| PPTX 原生引擎 | `@file-viewer/pptx` | 无 |
| Word renderer | `@file-viewer/renderer-word` | 无 |
| 演示文稿 renderer | `@file-viewer/renderer-presentation` | 无 |
| 绘图 renderer | `@file-viewer/renderer-drawing` | 无 |
| 3D 模型 renderer | `@file-viewer/renderer-3d` | 无 |
| 数据资产 renderer | `@file-viewer/renderer-data` | 无 |
| EDA renderer | `@file-viewer/renderer-eda` | 无 |
| 轻量 renderer preset | `@file-viewer/preset-lite` | 无 |
| Office renderer preset | `@file-viewer/preset-office` | 无 |
| 工程 renderer preset | `@file-viewer/preset-engineering` | 无 |
| 全量 renderer preset | `@file-viewer/preset-all` | 无 |
| Vite 按需装配插件 | `@file-viewer/vite-plugin` | 无 |
| Vanilla JS / Pure Web / script 标签 | `@file-viewer/web` | `@flyfish-group/file-viewer-web` |
| Vue3 | `@file-viewer/vue3` | `@flyfish-group/file-viewer3`、`file-viewer3` |
| Vue2.7 | `@file-viewer/vue2.7` | `@flyfish-group/file-viewer` |
| Vue2.6 | `@file-viewer/vue2.6` | 无 |
| React 18/19 | `@file-viewer/react` | `@flyfish-group/file-viewer-react` |
| React 16.8/17 | `@file-viewer/react-legacy` | 无 |
| jQuery | `@file-viewer/jquery` | 无 |
| Svelte | `@file-viewer/svelte` | 无 |

所有生态还提供对应的 `*-full` 包：`web-full`、`vue3-full`、`vue2.7-full`、`vue2.6-full`、`react-full`、`react-legacy-full`、`jquery-full`、`svelte-full`。full 包已内置 `preset-all` 和版本对齐的 renderer/Worker/WASM/字体/vendor 资产，不要重复安装 preset；Vite 或随包 CLI 会把包内资产发布到 `<部署基址>/file-viewer/`，其中包括 `vendor/ppt/` 下完整的二进制 PPT 0.3.3 公开运行时。

常用安装命令:

```bash
pnpm add @file-viewer/vue3 @file-viewer/preset-office
# 重度用户 / 全格式附件中心:
pnpm add @file-viewer/vue3-full
# 非 Vite 或特定生态也可把 @file-viewer/vue3 替换为 @file-viewer/web / react / vue2.7 / vue2.6 / jquery / svelte。
```

Webpack、Rspack、Rollup、Umi、传统多页应用和内部组件库通过 `options.preset` 显式注入 preset。Vite 项目可以额外安装插件并使用免配置自动装配：

```bash
pnpm add -D @file-viewer/vite-plugin
```

```ts
fileViewerRenderers({
  copyAssets: true
})
```

插件会自动发现已安装的 full / `@file-viewer/preset-*`，注入能力，并在 full 场景把完整 Worker、WASM、字体和 vendor 资源发布到 `<部署基址>/file-viewer/`；需要极致裁剪时再用单 renderer + `formats`。

常用定制边界：

| 配置 | 说明 |
| --- | --- |
| `copyAssets:true` | 识别 full / preset；full 在开发与生产构建中发布到 `<部署基址>/file-viewer/`，标准包/preset 保持原有根目录行为；full 包必须开启 |
| `formats` / `renderers` | 不使用 preset、或在 preset 外补充少数格式时，生成精确 renderer import |
| `scan:true` | 扫描源码中的 `fileViewerFormats`、`data-file-viewer-formats`、上传 `accept` 等格式 hint |
| `preset:'auto'` / `autoPresets:true` | 开启 `scan:true` 时继续保留已安装 preset 的自动激活 |
| `inject:false` | 关闭自动注入，改为手动导入 `virtual:file-viewer-renderers` 并传入 `options.renderers` |

Vanilla JS / Pure Web:

```html
<flyfish-file-viewer
  src="/files/demo.pdf"
  theme="light"
  style="display:block;height:100vh"
></flyfish-file-viewer>

<script type="module">
  import { defineFileViewerElement } from '@file-viewer/web'
  defineFileViewerElement()
</script>
```

Vue3:

```ts
import { createApp } from 'vue'
import App from './App.vue'
import FileViewer from '@file-viewer/vue3'

createApp(App).use(FileViewer).mount('#app')
```

Vue2.7:

```ts
import Vue from 'vue'
import App from './App.vue'
import FileViewer from '@file-viewer/vue2.7'

Vue.use(FileViewer)

new Vue({
  render: h => h(App)
}).$mount('#app')
```

React:

```tsx
import FileViewer from '@file-viewer/react'

export function Preview() {
  return (
    <div style={{ height: '100vh' }}>
      <FileViewer url="/files/demo.docx" />
    </div>
  )
}
```

Svelte、jQuery、React Legacy、Vue2.6、Core 自定义接入和 script 标签示例见 [生态组件总览](/zh/guide/ecosystem)。标准包只在其所选 renderer 需要静态资源时发布对应资产；full 包要保证完整格式支持，必须使用 Vite `copyAssets:true`，或运行随包安装的同版本 CLI：`npx --no-install file-viewer-copy-assets ./public/file-viewer`。复制脚本会写入 `flyfish-viewer-assets.json`，并按 core renderer asset manifest 校验 Archive、CAD、DOCX、Spreadsheet、Typst、SQLite、PDF 等 Worker/WASM/字体/vendor 资源。`web-full` 也可直接部署已含资源的完整 `dist/`。

## Release Tarball 安装

如果你在内网、离线环境，或者 npm 发布权限还没有完成配置，也可以直接使用开源总仓库 `artifacts/` 里的 release tarball:

```bash
npm install ./artifacts/flyfish-group-file-viewer3-*.tgz
npm install ./artifacts/file-viewer-core-*.tgz
npm install ./artifacts/file-viewer-vue3-*.tgz
npm install ./artifacts/file-viewer-vue2.7-*.tgz
npm install ./artifacts/file-viewer-vue2.6-*.tgz
npm install ./artifacts/file-viewer-react-*.tgz
npm install ./artifacts/file-viewer-react-legacy-*.tgz
npm install ./artifacts/file-viewer-web-*.tgz
npm install ./artifacts/file-viewer-jquery-*.tgz
npm install ./artifacts/file-viewer-svelte-*.tgz
npm install ./artifacts/file-viewer-renderer-word-*.tgz
npm install ./artifacts/file-viewer-renderer-presentation-*.tgz
npm install ./artifacts/file-viewer-preset-all-*.tgz
npm install ./artifacts/file-viewer-pptx-*.tgz
npm install ./artifacts/flyfish-group-file-viewer-*.tgz
npm install ./artifacts/flyfish-group-file-viewer-web-*.tgz
npm install ./artifacts/flyfish-group-file-viewer-react-*.tgz
```

Core、独立 renderer、preset、PPTX 原生引擎、Vanilla JS / Pure Web、Vue3、Vue2.7、Vue2.6、React、React Legacy、jQuery、Svelte 和历史兼容 tarball 都会随开源总仓库一起生成。`@file-viewer/ppt@0.3.3` 是独立版本的 npm 运行时依赖，不计入 54 个 File Viewer npm 发布目标；普通 ESM/Vite 由包管理器直接解析，Demo、Full、copy-assets 与 CDN/IIFE 则在 `vendor/ppt/` 交付同一套经过清单与 SHA-256 校验的公开运行时。默认无需配置 URL；`pptModuleUrl`、`pptWorkerUrl`、`pptWasmUrl` 与 `pptFontUrl` 仅用于自定义资源路径。`file-viewer3` 非 scoped 兼容包仍会同步发布到 npm，但它和 `@flyfish-group/file-viewer3` 包体重复，开源总仓库下载区只保留 `flyfish-group-file-viewer3-*.tgz` 这一份 Vue3 兼容 tarball。React tarball 依赖 web viewer 包，离线安装时请按 npm 依赖关系一起放入本地源或依次安装。

完整 full 部署会从包内自托管 viewer assets。每个 full 包安装的同版本 `npx --no-install file-viewer-copy-assets ./public/file-viewer` 会发布 PDF.js worker/CMap/WASM/standard fonts、二进制 PPT 0.3.3、PPTX Worker、CAD WASM、Typst WASM/默认字体、SQLite WASM、压缩包 worker 和其它资产，并生成 `flyfish-viewer-assets.json` 供验收。`web-full` 可直接部署完整 `dist/`，无需为二进制 `.ppt` 额外配置运行时 URL。

所有 full 包的默认静态目录都是部署基址下的 `file-viewer/`（根部署即 `/file-viewer/`），会自动指向该目录下的 PDF.js、DOCX、二进制 PPT、PPTX、Excel、CAD、Typst、Draw.io、SQLite 和 Archive 资源。资源放在其它位置时，启动前调用 `setDefaultFullAssetBaseUrl('/your-prefix/')`；显式 `options.*Url` 仍保持最高优先级。直接使用 CDN `web-full`，或完整部署它的整个 `dist/` 目录时，包括 `vendor/ppt/` 在内的包内资源都会按脚本 URL 自动解析。

## 官方 Demo iframe 交付包

客户需要“直接拿官方 Demo 构建产物做 iframe 集成”时，使用 GitHub Release 中的 `file-viewer-v2-*-official-demo-iframe.tar.gz`。这个包不要求业务项目安装 npm 包，解压后把所有文件发布到同一个静态目录即可，目录中的 `assets/`、`vendor/`、`wasm/` 和 `example/` 必须保持相对位置不变。

`/iframe.html` 是推荐的无 Demo 外壳入口，支持 clean URL 的静态平台也可以写成 `/iframe`；`/index.html` 保留原主 Demo 能力，并兼容同一套 `url`、`from`、`name` 和 `postMessage(Blob)` 协议。

URL 文件嵌入:

```html
<iframe
  src="/file-viewer/iframe.html?url=/files/demo.docx"
  style="width:100%;height:720px;border:0"
  allow="fullscreen"
></iframe>
```

父页面拿到二进制后再传入 iframe:

```html
<iframe
  id="viewer"
  src="/file-viewer/iframe.html?from=https%3A%2F%2Fapp.example.com&name=contract.docx"
></iframe>
<script>
  const file = await fetch('/api/files/contract.docx').then(response => response.blob())
  document.querySelector('#viewer').contentWindow.postMessage(file, 'https://static.example.com')
</script>
```

`from` 必须等于父页面 origin，Demo 只接受该 origin 发来的 `Blob`。包内的 `iframe-example.html` 同时覆盖 URL 与本地文件 `postMessage` 两条路径；发布前由 `pnpm release:demo-iframe:pack` 和 `pnpm verify:demo-iframe-artifact` 生成并校验，随后进入 `release:standard:build`、`release:public` 和 GitHub Release 附件校验链路。

部署到 Cloudflare Pages 时，平台会根据访客 `Accept-Encoding` 自动启用边缘压缩。项目的 `scripts/deploy-cloudflare-pages.mjs` 还会在 Direct Upload 前对超过 Pages 单文件限制的 WASM 做 Brotli 预压缩，并在 `_headers` 中写入 `Content-Encoding: br`、`Vary: Accept-Encoding`、`Content-Type: application/wasm` 和长期缓存策略，确保 27MB 级 Typst compiler WASM 仍然通过原始 `.wasm` URL 稳定加载。上线后运行下面的命令确认官网、文档站、Demo 和 Typst WASM 都已经走 Cloudflare 压缩:

```bash
pnpm verify:cloudflare-compression
```

## 开源总仓库内容

GitHub / Gitee 的 `flyfish-dev/file-viewer` 是开源总仓库，用于分发开源源码、Demo / 文档源码和 release 元数据。私有 Gitea 继续作为完整聚合仓、统一发布脚本、内部自动化和优先技术支持入口。仓库内容包括:

- `packages/core/`: framework-neutral core 源码
- `packages/components/`: Vanilla JS / Pure Web、Vue、React、jQuery、Svelte 等标准组件包源码
- `packages/compat/`: 历史 npm 包名兼容 alias 源码
- `apps/`: 主 Demo 和组件 Demo 源码
- `dist/`: 混淆压缩后的组件库产物
- `docs/` + `apps/docs-site/`: Markdown 内容源与 Fumadocs + Next.js 文档应用
- `artifacts/`: release manifest、状态报告和可上传到 GitHub Release 的 tarball
- `Dockerfile` / Docker Hub 标签: 可直接部署的静态镜像构建与发布信息
- `README.md`: 默认英文入口，便于 GitHub 与海外用户直接评估和接入
- `README.zh-CN.md`: 完整中文入口，与默认英文 README 互相提供语言切换链接
- `README.en.md`: npm 包与历史发布工具兼容使用的英文入口
- `LICENSE`: 项目许可证

其中 `README.md` 会承担开源总仓库首页职责，写明官方文档、在线 Demo、npm 包、私有化部署、源码目录、release 下载物和支持入口。`apps/`、`packages/` 和 `docs/` 默认保留源码，主 Demo、component demo、文档站和样例文件的构建产物不再作为顶层目录常驻提交，避免 GitHub clone 被静态站点和二进制样例拖大。需要下载站点产物时，从 GitHub Release 或 Cloudflare Pages 部署域名获取。

如果确实需要生成完整展开目录，可以显式使用 `FILE_VIEWER_PUBLIC_EXPANDED_ASSETS=1` 或 `--expanded-assets`。该模式只用于一次性交付、离线包检查或临时镜像排障，不作为公开 GitHub / Gitee 的默认发布形态。

开源总仓库会包含 `apps/`、`packages/core/`、`packages/components/`、`packages/compat/` 和 `docs/` 等源码，同时继续保留可直接部署或下载的 release 产物。

## 发版命令

2.x 之后，生态包从完整聚合仓统一构建、校验和发布。发布前建议执行:

```bash
pnpm type-check
pnpm build
pnpm build:vue3
pnpm obfuscate
pnpm docs:build
pnpm release:ecosystem:pack
```

其中 `pnpm obfuscate` 会处理 `packages/components/vue3/dist/` 中的 `.js` / `.mjs` 文件。类型声明、CSS、图片和示例文件不会被混淆，便于业务方正常接入和排查。

正式发布前建议先执行:

```bash
npm publish --dry-run --access public
```

确认包名、版本、README 和 `dist/` 文件无误后，再执行 `npm publish --access public`。如果 npm 账号启用了 MFA，请使用交互式会话完成浏览器确认。

生态包发布:

```bash
pnpm type-check:components
pnpm build:component-demo
pnpm release:ecosystem:list
pnpm release:ecosystem:pack
pnpm release:ecosystem:publish:dry-run
pnpm release:ecosystem:publish
```

`release:ecosystem:pack` 会先构建 core、独立 renderer、preset、PPTX 原生引擎、标准组件包和历史兼容包，再统一打包本仓库当前 88 个 npm 目标。`@file-viewer/ppt` 作为独立版本依赖解析；其公开运行时由 Full/copy-assets/CDN 产物交付。发布前请确认 tarball 中包含必要的 viewer assets、`dist/*`、README / README.en.md，且没有 `.DS_Store`。

开源总仓库使用私有 Gitea `main` 完整聚合仓生成，发布前执行:

```bash
pnpm release:public
```

该命令会同步开源源码、混淆后的 `dist/`、release 元数据和生态 tarball，并在写入后自动执行 `pnpm verify:public-main`。默认不会把 Demo、component demo、文档静态产物和示例文件展开写入开源总仓；如需完整展开，请显式追加 `--expanded-assets`。如果只想检查已经生成的开源总仓库内容，可以执行:

```bash
pnpm verify:public-main
```

校验会反查 `artifacts/release-manifest.json`、`artifacts/release-status.json`、`artifacts/release-status.schema.json`、所有应公开 tarball、README / README.en.md、组件 GitHub / Gitee 索引和顶层目录边界，避免漏掉源码、重复 tarball 或发布过期产物。`release-manifest.json` 会通过 `metadataAssets` 索引 manifest、status 和 schema 三份元数据；`release-status.json` 的 `sourceBaseline` 会明确私有 Gitea `main` 才是完整原始聚合仓基线，本地 checkout 分支名只是执行上下文；`release-status.schema.json` 是状态报告的公开 JSON Schema，可用于 CI 或下载端判断哪些缺口是本地可修项、哪些是 npm / Gitee / GitHub 等外部发布阻塞。

## Docker 镜像发布

Docker 镜像用于一键部署主 Demo、零依赖 iframe 入口和文档比对页。发布前先确保 Docker Hub 已登录，并且当前账号对 `flyfishdev/file-viewer` 有推送权限:

```bash
docker login
DOCKER_IMAGE=flyfishdev/file-viewer pnpm docker:publish
```

默认会推送 `latest` 和 `latest` 两个标签，并生成 `linux/amd64` / `linux/arm64` 多架构 manifest。发布后至少验证:

```bash
docker run --rm -p 8080:80 flyfishdev/file-viewer:latest
```

然后打开 `/`、`/iframe.html?url=/example/word.docx`、`/compare.html` 和 `/healthz`。

## 授权和贡献

本仓库编写的 File Viewer 源码和软件包使用 `Apache-2.0` 许可证；完整发行物中随附的 `@file-viewer/ppt` 运行时保留自身独立 LICENSE 与 NOTICE，其他依赖也保留各自包内许可证，不会被 File Viewer 重新授权。二开或商用本仓库代码时，请保留许可证、版权和来源说明，并注明项目来源为 File Viewer by Flyfish / `@flyfish-group/file-viewer3` 或 `@flyfish-group/file-viewer`。

如果你修复了通用问题或增强了通用能力，建议通过 issue / PR 一起贡献回来。这样后续升级时，大家都能少走一点弯路。
