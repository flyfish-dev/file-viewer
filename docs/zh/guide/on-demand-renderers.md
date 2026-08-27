# 按需渲染架构

> **Maintainer-only commands:** this page contains complete-workspace release or verification examples that are not part of the public checkout. Public contributors should use the commands in `/README.md` or `/docs/guide/development.md`.

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->

<div class="doc-kicker">On-demand Renderer Architecture</div>

<p class="doc-lead">
  文件预览器的格式越来越多，不能让每个项目在安装阶段都承担全部 Office、CAD、Typst、3D、压缩包、邮件和工程格式依赖。
  2.x 的目标是把 core 收敛为轻量、框架无关、纯 TypeScript 的预览底座，把重渲染链路拆成可组合、可自动装配、可独立发布的 renderer package。
</p>

## 设计目标

| 目标       | 要求                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 安装更快   | 默认组件包只安装 core、组件本身和必要轻量依赖；PDF、Office、CAD、Typst、3D、archive 等重链路不再默认进入 core `dependencies`。 |
| 打包更轻   | 用户只 `import` 自己装配的 renderer，Vite / Rollup / Webpack / Rspack 才会把对应依赖打进最终产物。                             |
| 调试简单   | Vue、React、Svelte、jQuery、Vanilla JS 都仍然是原生组件体验，不回退 iframe；Vite 项目默认由插件自动发现已安装 preset，也保留手动 renderer 控制。 |
| 自动化友好 | 提供 preset、Vite 插件、资产复制 CLI 和校验脚本，让用户可以“一行装配”，也能精确控制企业内网部署资源。                          |
| 渐进兼容   | 先支持 `@file-viewer/preset-all` 维持完整能力，再逐步把默认安装切到 lightweight preset，避免一次性破坏现有客户。               |

## 架构决策

最终方案采用“轻 core + 独立 renderer + preset 编排 + 构建插件自动装配”的四层模型。

| 层级              | 责任                                                                                                  | 不允许做的事                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Core              | 文件源加载、格式识别、renderer registry、生命周期、搜索/定位、缩放、打印导出、统一 options 和事件 API | 直接依赖 PDF.js、Office、CAD、Typst、WASM、地图、3D、压缩包等重库  |
| Renderer package  | 单条格式链路的解析、渲染、worker/wasm/vendor assets、样例、smoke 测试和 README                        | 把 Vue/React/Svelte 组件逻辑塞进 renderer；依赖其它 wrapper 的实现 |
| Preset package    | 把多个 renderer 组合成 `lite`、`office`、`engineering`、`all` 等业务能力包                            | 隐式修改用户 options；在默认组件里偷偷安装全量依赖                 |
| Component package | Vue3、React、Svelte、jQuery、Vanilla JS 等原生组件体验，接收同一套 options 和 renderer/preset         | 使用 iframe 作为主链路；复制 renderer 逻辑；制造不同框架的参数差异 |

关键原则：

- **默认轻量**：安装 `@file-viewer/vue3`、`@file-viewer/react`、`@file-viewer/web` 只得到 core 和组件能力，不得到全部重渲染依赖。
- **显式能力**：用户要 PDF、Office、CAD、Typst、Archive、3D 等能力时，安装对应 renderer 或 preset。
- **安装即装配**：Vite 项目使用 `@file-viewer/vite-plugin` 后，会自动发现已安装 preset 并注入 virtual module；没有安装的能力不进入最终 bundle。
- **全量仍简单**：需要最完整体验时，`@file-viewer/preset-all` 保留“一行安装、一行自动装配”的路径，官方 demo 使用它展示完整能力。
- **资产可追踪**：每个 renderer 的 worker、wasm、字体、vendor 文件必须通过 manifest/CLI 暴露，避免业务方手抄路径。

## 行业基线

- 使用 ESM `import()` 做运行时拆分。插件读取业务项目实际安装的 Vite 主版本：Vite 5—7 写入 `build.rollupOptions.output.manualChunks`，Vite 8 写入 `build.rolldownOptions.output.codeSplitting.groups`。业务已有分组、优先级、输出数组和 `codeSplitting:false` 不会被覆盖。
- 使用 `package.json#exports` 暴露稳定子路径。Node.js 官方文档建议显式定义导出入口，避免用户引用内部文件。
- 使用 renderer 级 chunk 命名策略给 demo / 官网这类应用稳定命名大型渲染链路，便于缓存和排查首屏体积。
- 使用 optional peer / peerDependenciesMeta 时只作为“插件提示”，不把重依赖放回 core；renderer package 自己声明真实依赖。

## 最终包形态

| 包                                                                  | 定位                                                                                                       | 依赖原则                                                                                  |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `@file-viewer/core`                                                 | 纯 TS 核心：类型、格式注册表、source loader、dispatcher、生命周期、搜索、缩放、打印/导出 API、资产解析协议 | 只保留无渲染重依赖的基础代码；不依赖 Vue/React/Svelte，不依赖 Office/CAD/PDF/Typst 等重库 |
| `@file-viewer/vue3`、`@file-viewer/react`、`@file-viewer/svelte` 等 | 生产可用标准组件                                                                                           | 只依赖 core 和自身生态依赖；通过 props/options 接收 `preset` / `renderers`                     |
| `@file-viewer/renderer-*`                                           | 单条或一组强相关渲染链路                                                                                   | 自己声明真实重依赖、worker、wasm、vendor assets 和 smoke 样本                             |
| `@file-viewer/preset-lite`                                          | 文本、Markdown、图片、音视频基础预览                                                                       | 聚合 `renderer-text`、`renderer-image`、`renderer-media`，适合常见轻附件场景               |
| `@file-viewer/preset-office`                                        | Word、Spreadsheet、PPT、PDF、OFD 均由独立 renderer 承接                                                   | 聚合文档链路，避免业务手写多个 Office renderer import                                    |
| `@file-viewer/preset-engineering`                                   | CAD、3D、XMind、Draw.io、Excalidraw、Geo、Typst、Archive、EDA 和 Data 结构预览                            | 聚合工程附件链路；仍比 `preset-all` 更窄                                                  |
| `@file-viewer/preset-all`                                           | 完整能力聚合包                                                                                             | 需要全格式时一行安装，demo 和全量发行版使用                                               |
| `@file-viewer/vite-plugin`                                          | 自动生成 renderer virtual module、复制 assets、设置 manual chunks                                          | 让业务项目按配置自动装配，不需要手写大量 import                                           |

## 用户最佳体验路径

| 场景                            | 推荐方式                                                  | 安装体验                        | 打包体验                                 |
| ------------------------------- | --------------------------------------------------------- | ------------------------------- | ---------------------------------------- |
| 只预览常见轻量附件              | 安装组件包 + `@file-viewer/preset-lite` 或 text/image/media 单 renderer | 最快，依赖最少                  | 主包只包含轻量 renderer                  |
| 只需要 PDF/Word/Excel/PPT/OFD   | 安装组件包 + `@file-viewer/preset-office`，极致裁剪时再按 renderer 安装 | Office 依赖按文档 preset 聚合   | 只会产生文档相关异步 chunk               |
| CAD/3D/Typst/Archive 等专项能力 | 安装组件包 + `@file-viewer/preset-engineering` 或对应单 renderer | 工程链路按产品形态聚合          | worker/wasm 跟随 renderer asset manifest |
| 企业内网全格式平台              | 安装组件包 + `@file-viewer/preset-all` + asset copy CLI   | 一次性完整安装                  | chunk 按 renderer 拆分，避免首屏全部执行 |
| 大型业务前端希望自动化          | `@file-viewer/vite-plugin` 自动发现已安装 preset，必要时配置 `formats` / `scan` | 由插件提示缺失 renderer         | 自动生成 virtual module 和部署 manifest  |

因此“分包”不是让用户手动拼很多碎片，而是把默认能力变轻，把完整能力保留为 preset，把工程化项目交给插件自动装配。

## Vite 插件免配置自动装配

`@file-viewer/vite-plugin` 的默认体验是“装了哪个 preset，就自动激活哪个 preset”。当配置为空或只配置 `copyAssets:true`，插件会扫描当前项目依赖中的 `@file-viewer/preset-*`，优先使用 `preset-all`，否则按已安装的 `lite`、`office`、`engineering` 组合注入能力。

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      copyAssets: true
    })
  ]
})
```

框架组件默认 `autoRenderers:true`，因此 Vue、React、Svelte、jQuery、Vanilla JS / Pure Web 都会自动读取插件注入的 renderer registry。业务侧只有在严格裁剪、源码扫描、或需要完全手动管理 registry 时，才需要额外配置。

| 定制项 | 作用 |
| --- | --- |
| `copyAssets:true` | 复制命中的 Worker、WASM、字体、PDF/CAD/Typst/Archive/Data 等离线资源 |
| `preset:'auto'` / `autoPresets:true` | 与 `scan:true` 同时使用时，继续保留“按已安装 preset 自动激活能力” |
| `formats` / `renderers` | 在 preset 外补充少数格式，或完全使用单 renderer 精确裁剪 |
| `scan:true` | 从源码中的 `fileViewerFormats`、`data-file-viewer-formats`、`accept` 等 hint 收集格式 |
| `inject:false` | 关闭自动注入，改为手动导入 `virtual:file-viewer-renderers` 并传给 `options.renderers` |
| `chunkStrategy:'renderer'` | 使用 renderer 级 chunk 命名，便于缓存和定位体积问题 |

PPTX-only 项目可以直接从 `@file-viewer/renderer-presentation/pptx` 导入 `pptxRenderer`，或配置 `fileViewerRenderers({ formats: ['pptx'] })`。两条路径都不会把传统 `.ppt` 的 CJK 字体和 WASM 写入生产产物。只需要二进制 `.ppt` 时使用 `@file-viewer/renderer-presentation/ppt`；两种格式都需要时继续使用根入口 `presentationRenderer`。

## 2.1.0 推荐接入步骤

### 最小化引入：只要一个格式就只装一个 renderer

以 PDF-only 场景为例：

```bash
npm i @file-viewer/vue3 @file-viewer/renderer-pdf
```

```ts
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer]
}
```

这条路径不依赖 Vite，Webpack、Rspack、Rollup、Umi、传统多页应用和微前端壳都可以稳定使用。Vite 项目可以额外安装插件，让插件生成 import 并自动注入：

```bash
npm i -D @file-viewer/vite-plugin
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      formats: ['pdf'],
      copyAssets: true,
      chunkStrategy: 'renderer'
    })
  ]
})
```

插件默认 `inject:true`，会把生成的 renderer 模块注入 Vite HTML 入口，组件通过 `autoRenderers` 自动获得能力。常规业务代码无需再手动传 `renderers`。

把 `@file-viewer/vue3` 换成 `@file-viewer/web`、`@file-viewer/react`、`@file-viewer/svelte`、`@file-viewer/jquery`、`@file-viewer/vue2.7` 或 `@file-viewer/vue2.6` 后，仍然使用同一份 `options`。

### 组合引入：按产品形态选 preset

办公文档平台推荐：

```bash
npm i @file-viewer/vue3 @file-viewer/preset-office
```

```ts
import officePreset from '@file-viewer/preset-office'

const options = {
  rendererMode: 'replace',
  preset: officePreset
}
```

如果项目使用 Vite，可以再装插件省去手动 import：

```bash
npm i -D @file-viewer/vite-plugin
```

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      copyAssets: true
      // 无需 preset:'office'，插件会自动发现已安装 preset。
    })
  ]
})
```

常见轻附件使用 `preset-lite`，CAD / 3D / Typst / EDA / 数据资产等工程附件使用 `preset-engineering`，完整样例矩阵或全格式后台使用 `preset-all`。插件无参或只传 `copyAssets:true` 时会自动发现已安装 preset；`copyAssets:true` 会把 Worker、WASM、PDF 字体、CAD、Typst WASM/字体、Archive、Data 等离线资源复制到部署目录，避免企业内网环境依赖公共 CDN。

全量一键安装:

```bash
npm i @file-viewer/vue3 @file-viewer/preset-all
# Vite 项目再安装插件:
npm i -D @file-viewer/vite-plugin
```

如果需要同时扫描源码 hint 并自动发现已安装 preset，请使用 `preset:'auto'` 或 `autoPresets:true`：

```ts
fileViewerRenderers({
  preset: 'auto',
  scan: true,
  formats: ['pdf'],
  copyAssets: true,
  chunkStrategy: 'renderer'
})
```

如果需要完全手动控制 registry，可以关闭注入并显式传入 virtual module：

```ts
fileViewerRenderers({
  formats: ['pdf'],
  inject: false,
  copyAssets: true
})
```

```ts
import { configuredFileViewerRenderers } from 'virtual:file-viewer-renderers'

const options = {
  rendererMode: 'replace',
  renderers: configuredFileViewerRenderers
}
```

## renderer 包参考

只需要少数格式时，可以跳过 preset，直接安装对应 renderer 并传给 `options.renderers`：

| Renderer 包 | 导出 | 主要链路 |
| --- | --- | --- |
| `@file-viewer/renderer-pdf` | `pdfRenderer` | PDF |
| `@file-viewer/renderer-word` | `wordRenderer` | DOCX、DOC、DOT、RTF、ODT |
| `@file-viewer/renderer-spreadsheet` | `spreadsheetRenderer` | Excel、OpenDocument 表格、CSV 类表格 |
| `@file-viewer/renderer-presentation` | `presentationRenderer` | 二进制 `.ppt` 使用 `@file-viewer/ppt`；OpenXML 演示文稿使用 `@file-viewer/pptx` |
| `@file-viewer/renderer-ofd` | `ofdRenderer` | OFD |
| `@file-viewer/renderer-cad` | `cadRenderer` | DWG、DXF、DWF、DWFx、XPS |
| `@file-viewer/renderer-3d` | `modelRenderer` | 3D 模型和轻量几何签名 |
| `@file-viewer/renderer-signature` | `signatureRenderer` | 显式按需、实验性的 CMS/CAdES、时间戳与公开 OpenPGP 检查；不进入 `preset-all` 和任何 `*-full` 包 |
| `@file-viewer/renderer-drawing` | `drawingRenderer` | draw.io、Excalidraw、Mermaid、PlantUML |
| `@file-viewer/renderer-mindmap` | `mindmapRenderer` | XMind |
| `@file-viewer/renderer-geo` | `geoRenderer` | GeoJSON、KML、GPX、SHP |
| `@file-viewer/renderer-typst` | `typstRenderer` | Typst 源文件本地 WASM 预览 |
| `@file-viewer/renderer-archive` | `archiveRenderer` | 压缩包和内部文件预览 |
| `@file-viewer/renderer-email` | `emailRenderer` | EML、MSG、MBOX |
| `@file-viewer/renderer-epub` | `ebookRenderer` | EPUB、UMD |
| `@file-viewer/renderer-text` | `textRenderer` | Markdown、代码高亮、patch、git bundle |
| `@file-viewer/renderer-image` | `imageRenderer` | 图片、HEIC / HEIF 链路 |
| `@file-viewer/renderer-media` | `mediaRenderer` | 音频、视频、HLS、MIDI 摘要 |
| `@file-viewer/renderer-data` | `dataRenderer` | PSD、字体、SQLite、Parquet、Avro、WASM、WebArchive |
| `@file-viewer/renderer-eda` | `edaRenderer` | OLB、DRA、GDS、OAS/OASIS |

`@file-viewer/ppt`、`@file-viewer/pptx`、`@file-viewer/geometry-engine`、`@file-viewer/eda-layout` 和 `@file-viewer/eda-orcad` 是 renderer 内部引擎包；常规业务预览优先使用上表 renderer 或 preset。

需要签名容器能力时，应直接安装 `@file-viewer/renderer-signature` 并把 `signatureRenderer` 传给 `options.renderers`。它的可选 Rust/WASM 工具链和密码学边界不会被带入既有 Full 安装。

`preset: 'auto'` 会发现项目中已安装的 preset 包；当 `preset-all` 存在时会优先使用它，避免重复导入其它 preset。

## 缺失 renderer 的友好提示

core 始终保留完整支持矩阵。用户打开矩阵内但当前项目未装配 renderer 的格式时，预览器会显示“需要装配预览能力”，并提示推荐安装的 preset / renderer 包，例如 `.pdf` 会引导安装 `@file-viewer/preset-office` 或 `@file-viewer/renderer-pdf`。只有真正不在支持矩阵中的扩展名才显示“不支持在线预览”，避免用户误以为产品不支持该格式。

## 用户接入方式

### 方式一：轻量默认

```ts
import { FileViewer } from '@file-viewer/vue3'

// Vue / React / Svelte / jQuery / Vanilla JS 都保持同一套 options 语义。
const options = {
  // 当前已可用: 只启用图片这类 core 原生轻量链路。
  // 音视频请额外装配 @file-viewer/renderer-media。
  // 代码、文本和 Markdown 请额外装配 @file-viewer/renderer-text。
  builtinRenderers: 'lite'
}
```

### 方式二：业务按需组合

```ts
import { FileViewer } from '@file-viewer/vue3'
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { ofdRenderer } from '@file-viewer/renderer-ofd'
import { wordRenderer } from '@file-viewer/renderer-word'
import { spreadsheetRenderer } from '@file-viewer/renderer-spreadsheet'
import { cadRenderer } from '@file-viewer/renderer-cad'

const options = {
  renderers: [pdfRenderer, ofdRenderer, wordRenderer, spreadsheetRenderer, cadRenderer]
}
```

### 方式三：全量体验

```bash
npm i @file-viewer/vue3 @file-viewer/preset-all
npm i -D @file-viewer/vite-plugin
```

```ts
fileViewerRenderers({
  copyAssets: true
})
```

### 方式四：构建插件自动装配

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      formats: ['pdf', 'ofd', 'dwg', 'dxf', 'typst', 'zip', 'xmind', 'geojson'],
      copyAssets: true,
      chunkStrategy: 'renderer'
    })
  ]
})
```

插件默认注入 virtual module；业务组件会自动读取已注册 renderer。只有需要 `rendererMode:'replace'` 的严格裁剪场景，才需要关闭 `inject` 并手动引入 `configuredFileViewerRenderers`。

## Renderer 插件协议

每个 renderer package 暴露稳定的装配对象：

```ts
import type { FileViewerRendererPlugin } from '@file-viewer/core'

export const pdfRenderer: FileViewerRendererPlugin = {
  id: 'pdf',
  definitions: [{ id: 'pdf', extensions: ['pdf'], label: 'PDF' }],
  assets: [{ id: 'pdf.worker', kind: 'worker', source: 'dist/assets/pdf.worker.mjs' }],
  install(registry) {
    registry.register({
      id: 'pdf',
      extensions: ['pdf'],
      handler: async (...args) => {
        const { renderPdf } = await import('./pdfRenderer')
        return renderPdf(...args)
      }
    })
  }
}
```

核心原则：

- `core` 只认识协议，不知道具体 PDF、CAD、Typst、Office 的依赖。
- renderer 的 worker/wasm/vendor 静态资源跟着 renderer 包走，通过统一 asset manifest 暴露。
- wrapper 只负责把用户传入的 renderers 安装进 viewer，不复制渲染逻辑。
- preset 只是 renderer plugin 数组，不再隐藏性地把所有依赖塞进默认组件包。

## Renderer 交付契约

每条独立 renderer 线路必须按同一套标准交付，防止“包拆出来了，但体验和维护反而变差”。

| 项目             | 必须交付                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Package manifest | `package.json` 包含 `exports`、`types`、`files`、`publishConfig`、`repository.directory`、准确 `dependencies`，不引用其它 wrapper。 |
| Public API       | 默认导出 renderer plugin，同时命名导出 `xxxRenderer`、`xxxRendererDefinition` 和必要的低阶 `renderFileViewerXxx()`。                |
| Lazy boundary    | renderer 入口只注册定义和 handler；真实重库必须在 handler 内部 `import()`，避免装配时立即执行重逻辑。                               |
| Assets           | worker/wasm/vendor/fonts 通过 manifest 或 copy helper 暴露；不能要求用户猜测 `node_modules` 内部路径。                              |
| Offline          | 所有运行时资源可从 npm 包或 demo public 目录复制，不能依赖第三方 CDN。                                                              |
| Samples          | 每个主要扩展名至少一个真实样例；复杂格式注明“结构预览 / 完整可视预览 / 需要商业转换链路”的边界。                                    |
| Tests            | `type-check`、`build`、format registry smoke、至少一个浏览器 smoke；WASM/worker renderer 需要资产存在校验。                         |
| Documentation    | 中文/英文 README、文档站接入示例、支持格式矩阵、故障排查和内网部署说明。                                                            |
| Release          | npm tarball 校验、公开源码仓同步、root README 和生态矩阵同步。                                                                      |

## 自动装配设计

`@file-viewer/vite-plugin` 是最终的工程化入口，目标不是替代显式 import，而是把显式 import 自动生成。

```ts
fileViewerRenderers({
  formats: ['pdf', 'docx', 'xlsx', 'dwg', 'typst'],
  scan: true,
  copyAssets: true,
  chunkStrategy: 'renderer',
  missingRenderer: 'error'
})
```

插件需要完成：

- 根据 `formats` 查 `renderer manifest`，生成 `virtual:file-viewer-renderers`。
- 支持 `scan: true` 从源码中的 `fileViewerFormats`、`fileViewerRenderers`、`data-file-viewer-formats` 和上传 `accept` 声明自动发现格式，减少手写 import 清单。
- 如果用户选择 `preset: 'all' | 'office' | 'engineering' | 'lite'`，自动 import 对应 preset。
- 检查 package 是否已安装；缺失时给出明确安装命令，而不是运行时报错。
- 复制 worker/wasm/vendor assets，并生成部署清单，服务于 Cloudflare Pages、Vercel、Docker、内网静态部署。
- 为 Vite 8 生成 Rolldown code splitting 配置；为 Vite 7/Rollup/Rspack/Webpack 提供对应 adapter 或文档 fallback。
- 产出 bundle 预算报告，让用户知道每条 renderer 带来的安装和打包成本。

## 分阶段实施路线

| 波次   | 目标                      | 关键动作                                                                                       | 完成证据                                                            |
| ------ | ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Wave 0 | 建立依赖账本              | `audit:renderer-deps` 输出 core 直接重依赖、目标包、阶段和状态；新增安装体积和 bundle 预算脚本 | CI 能报告 core 依赖数、packed size、安装依赖闭包、demo 首屏 chunk   |
| Wave 1 | 完成 Phase 2 重链路拆出   | Word、Spreadsheet、OFD、Presentation、PDF、Typst、CAD、Archive 全部从 core 迁到 renderer 包    | `@file-viewer/core` 不再声明这些依赖；`preset-all` 格式矩阵不掉格式 |
| Wave 2 | 完成 Phase 3 体验链路拆出 | Drawing、3D、MindMap、Geo、Email、Ebook、Text、Media、Image 独立维护                           | 默认组件安装不带相关重库；各 renderer 有独立 smoke；core 只保留普通图片等轻量原生能力 |
| Wave 3 | 完成 Phase 4 专业内核     | Data Asset 与 EDA 结构预览已先拆出独立 renderer；OASIS 大版图、OrCAD/Allegro 高保真图形继续独立内核化，复杂格式不挤进 core | 文档明确边界，复杂样例能结构化预览或进入专用内核                    |
| Wave 4 | 工程自动化                | `@file-viewer/vite-plugin`、asset manifest、virtual module、chunk strategy、源码 hint scan、离线部署校验 | 用户按 `formats` 配置或在源码声明 hint 即可自动生成 renderer 装配    |
| Wave 5 | 默认轻量切换              | 组件包默认 `builtinRenderers: 'lite'` 或 `none`，全量能力改由 preset 显式启用                  | 新项目 cold install 明显下降；旧全量 demo 仍完整                    |

## 当前渲染线拆分计划

| 阶段    | 渲染线                                                                         | 目标包                                                                                                                                                                                                                                                                              |
| ------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 | core 插件协议、wrapper 传参、preset-all 兼容层、资产 manifest v2、迁移校验脚本 | `@file-viewer/core`、所有组件包                                                                                                                                                                                                                                                     |
| Phase 2 | PDF、Word/DOCX/DOC/ODT/RTF、Excel、PPT、OFD、Typst、CAD、Archive               | `@file-viewer/renderer-pdf`、`@file-viewer/renderer-word`、`@file-viewer/renderer-spreadsheet`、`@file-viewer/renderer-presentation`、`@file-viewer/renderer-ofd`、`@file-viewer/renderer-typst`、`@file-viewer/renderer-cad`、`@file-viewer/renderer-archive`                      |
| Phase 3 | XMind、Geo、Draw.io/Excalidraw/Mermaid/PlantUML、3D、Email、EPUB、Code/Markdown/Patch/Git Bundle、Media、Image   | `@file-viewer/renderer-mindmap`、`@file-viewer/renderer-geo`、`@file-viewer/renderer-drawing`、`@file-viewer/renderer-3d`、`@file-viewer/renderer-email`、`@file-viewer/renderer-epub`、`@file-viewer/renderer-text`、`@file-viewer/renderer-media`、`@file-viewer/renderer-image` |
| Phase 4 | EDA、GDSII/OASIS、OrCAD/Allegro、复杂数据资产                                  | `@file-viewer/renderer-eda`、`@file-viewer/eda-layout`、`@file-viewer/eda-orcad`、`@file-viewer/renderer-data`                                                                                                                                                                      |
| Phase 5 | Vite 插件、自动 sample smoke matrix、安装体积预算、release pipeline 分发       | `@file-viewer/vite-plugin`、release scripts                                                                                                                                                                                                                                         |

## 复杂格式方案边界

| 格式线                      | 当前优先方案                                                                                                                                                  | 后续拆包方向                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Presentation / PPT / PPTX   | `@file-viewer/renderer-presentation` 作为标准 renderer 插件；二进制 `.ppt` 按需加载包内 `@file-viewer/ppt@0.3.3` Worker/OffscreenCanvas/WASM 与有界帧缓存，OpenXML 文件按需加载 `@file-viewer/pptx` 和另一条 Worker，ODP 仍归 OpenDocument 兼容链路。 | core 不直接依赖任何演示文稿引擎；标准资产布局零配置，`.ppt` 只在自定义路径时使用 `presentation.pptModuleUrl` / `pptWorkerUrl` / `pptWasmUrl` / `pptFontUrl` 覆盖，PPTX 使用 `workerUrl` / `workerType` 覆盖自托管资源。 |
| Word / DOCX / DOC / RTF / ODT | `@file-viewer/renderer-word` 作为标准 renderer 插件，底层按需加载自研 `@file-viewer/docx`、`msdoc-viewer` 和 RTF/OpenDocument 兼容链路。 | core 已移除 `@file-viewer/docx`、`msdoc-viewer`、`rtf.js`、`linkedom` 等 Word 直接依赖，Word 完整预览统一通过 renderer-word 或 preset-all 装配。 |
| OFD                         | 使用 `@file-viewer/renderer-ofd` + `DLTech21/ofd.js` 源码链路在线预览，避开 npm dist 授权 WASM 分支；vendor 源码随 renderer 包离线分发。                  | core 已移除 OFD 兼容入口、`jszip`、`ofd-xml-parser` 和 OFD vendor，OFD 完整预览统一通过 renderer-ofd 或 preset-all 装配。 |
| Typst                       | 使用官方 Typst Rust/WASM 生态在浏览器内编译并渲染，不退化为源码查看。                                                                                         | `@file-viewer/renderer-typst` 独立维护 compiler/renderer WASM、字体和缓存策略。                          |
| Draw.io / diagrams.net / Mermaid / PlantUML | `@file-viewer/renderer-drawing` 以 diagrams.net 官方离线 viewer 包、Excalidraw rough.js 只读 SVG 兜底、Mermaid 官方 SVG 渲染和 PlantUML 离线源码预览 / 可配置 SVG 服务为基准，优先保证离线或自托管预览，不依赖公网 CDN。 | 绘图类格式统一在该包内维护 pan/zoom、主题适配、打印和 HTML 导出；PlantUML 需要完整图形渲染时再配置自托管 `plantumlServerUrl`。 |
| OpenDocument / WPS 兼容格式 | 常规 ODT/ODS/ODP 走 ZIP+XML 结构解析；高保真 Office 兼容方向预留 LibreOffice WASM 路线。                                                                      | Office renderer 拆出后，复杂版式可继续独立演进为 WASM 后端。                                             |
| XMind                       | 解析现代 `content.json` 和经典 `content.xml`，渲染层使用 `@panzoom/panzoom` 提供可拖拽、移动端双指缩放、定位的只读画布；官方 XMind TS/SVG viewer 可作为后续高保真对照，但不直接引入不可控交互。 | core 已移除 XMind 兼容入口和 `@ljheee/xmind-parser` 直接依赖，`@file-viewer/renderer-mindmap` 单独维护 XMind/FreeMind/OPML 等思维导图体验。 |
| GeoJSON / KML / GPX / SHP   | GeoJSON 直接读取，KML/GPX 转 GeoJSON，SHP 走 Shapefile 到 GeoJSON，CRS 归一化后用离线 MapLibre 矢量地图渲染叠加层，WebGL 不可用时回退 SVG。 | core 已移除 geo 兼容入口和 `@tmcw/togeojson` / `shpjs` / `maplibre-gl` / `proj4` 直接依赖，`@file-viewer/renderer-geo` 单独维护地理数据预览体验。 |
| Archive                     | 优先 `libarchive.js` Worker + WASM，覆盖 RAR/7z/TAR/ZIP 等多格式；Worker 不可用时降级 ZIP/TAR/GZIP，内部文件点击后再按需解压和嵌套预览。                      | `@file-viewer/renderer-archive` 独立维护 worker/wasm、缓存、内存上限和移动端 fallback。                  |
| EDA / 工程二进制            | `@file-viewer/renderer-eda` 先承接 OLB/DRA/GDSII/OASIS 的结构预览；标准 GDSII 用纯 TS 解析 records，小图生成 SVG 快速版图，大元素集使用 `@file-viewer/eda-layout` 的 WebGL typed-array 批次和 canvas 渲染；OASIS 文本夹具可生成 SVG，真实二进制 OASIS 与 Cadence 专有二进制先做安全索引和诊断。 | OASIS 后续适合引入 KLayout / dump_oas_gds2 路线的 WASM 或 WebGL 增量渲染；Cadence DRA/OLB/DSN 高保真预览以后续 OpenAllegroParser/OpenOrCadParser WASM 化为主。 |

调研结论是：能用成熟官方或事实标准开源链路的格式不手搓；规格复杂、二进制重、需要长期迭代的能力，应该像 PPTX 一样拆成独立内核和独立 renderer 包持续维护。

## 验收 checklist

### Phase 1：协议与装配

- [x] 新增 `FileViewerRendererPlugin`、`FileViewerRendererPreset`、`installFileViewerRendererPlugins()` 类型和 API。
- [x] `createViewer()` 支持传入 renderer plugins，并能通过 `rendererMode: 'replace' | 'extend'` 覆盖或追加默认 registry。
- [x] 所有 wrapper 共享的 `FileViewerOptions` / `ViewerOptions` 类型暴露 `renderers` 和 `rendererMode`，可直接接收 renderer plugin 或 preset。
- [x] `FileViewerOptions.builtinRenderers` 支持 `all`、`lite`、`none`，为默认轻量化和显式全量装配提供稳定开关。
- [x] wrapper README 和开源总仓 README 补齐 `renderers` / `rendererMode` / `builtinRenderers` 的按需装配示例，并由 `verify:ecosystem-readmes` 校验 `@file-viewer/vite-plugin`、`virtual:file-viewer-renderers` 和 `configuredFileViewerRenderers` 等关键接入口径。
- [x] Vue3 原生组件渲染面板切换到同一套 renderer plugin/preset 装配链路，`options.renderers`、`rendererMode` 和 `builtinRenderers` 会在组件路径真实生效。
- [x] `@file-viewer/preset-all` 能复现当前 221 个已注册扩展名的完整能力，并保留 221 个稳定、0 个实验的证据边界。
- [x] `pnpm audit:renderer-deps` 输出所有 core 直接依赖对应的目标 renderer package，不允许 unclassified。
- [x] `pnpm verify:on-demand-boundaries` 守住按需加载边界：core 不依赖 renderer/preset/wrapper，标准组件包不依赖 renderer/preset，compat 包只 alias 到目标组件，`preset-lite` / `preset-office` / `preset-engineering` 只能聚合各自白名单 renderer，`preset-all` 才聚合完整 renderer。

### Phase 2：第一批重链路拆包

- [x] `@file-viewer/core` 移除 PDF/Office/OFD/Typst/CAD/UMD 等剩余重链路直接依赖；当前 core 运行时依赖为 0。
- [x] 建立 `@file-viewer/renderer-pdf` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 PDF renderer。
- [x] `@file-viewer/core` 已移除 PDF 兼容入口和 `pdfjs-dist` 直接依赖，PDF 完整能力统一通过 `@file-viewer/renderer-pdf` 或 preset 装配；PDF worker、CMap、WASM 和 standard fonts 资产路径仍由 core manifest 统一发现。
- [x] 建立 `@file-viewer/renderer-word` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 DOCX / DOC / RTF / ODT renderer。
- [x] 建立 `@file-viewer/renderer-ofd` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 OFD renderer。
- [x] `@file-viewer/core` 已移除 OFD 兼容入口、`jszip`、`ofd-xml-parser` 和 OFD vendor，OFD 完整能力统一通过 `@file-viewer/renderer-ofd` 或 preset 装配。
- [x] 建立 `@file-viewer/renderer-presentation` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 OOXML 演示文稿 renderer。
- [x] 建立 `@file-viewer/renderer-cad` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 CAD renderer。
- [x] 建立 `@file-viewer/renderer-typst` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 Typst renderer。
- [x] `@file-viewer/core` 已移除 Typst 兼容入口和 `@myriaddreamin/*` 直接依赖，Typst 真实 WASM 预览统一通过 `@file-viewer/renderer-typst` 或 preset 装配；compiler / renderer WASM 资产路径仍由 core manifest 统一发现。
- [x] 建立 `@file-viewer/renderer-archive` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 archive renderer。
- [x] 建立 `@file-viewer/renderer-email` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 EML / MSG / MBOX renderer。
- [x] 建立 `@file-viewer/renderer-epub` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 EPUB / UMD renderer。
- [x] `@file-viewer/core` 已移除 archive 兼容入口和 `libarchive.js` 直接依赖，压缩包完整能力统一通过 `@file-viewer/renderer-archive` 或 preset 装配；UMD 已迁移到 `@file-viewer/renderer-epub`，不再让 core 保留 `pako`。
- [x] `@file-viewer/core` 已移除 email 兼容入口和 `postal-mime` / `@kenjiuno/msgreader` 直接依赖，邮件完整能力统一通过 `@file-viewer/renderer-email` 或 preset 装配。
- [x] `@file-viewer/core` 已移除 EPUB / UMD 兼容入口和 `epubjs` / `pako` 直接依赖，电子书完整能力统一通过 `@file-viewer/renderer-epub` 或 preset 装配。
- [x] 建立 `@file-viewer/renderer-mindmap` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 XMind renderer。
- [x] `@file-viewer/core` 已移除 XMind 兼容入口和 `@ljheee/xmind-parser` 直接依赖，XMind 完整能力统一通过 `@file-viewer/renderer-mindmap` 或 preset 装配。
- [x] 官方 Demo 的 Vue3 入口已验证 `@file-viewer/preset-all` 会真实装配 XMind renderer，并通过浏览器 PointerEvent 与真实鼠标拖拽回归确认 Panzoom 画布可平移；通用浏览器冒烟脚本也会对 `.xmind` 执行拖拽断言。
- [x] 建立 `@file-viewer/renderer-drawing` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 Draw.io / Excalidraw / Mermaid / PlantUML renderer。
- [x] `@file-viewer/core` 已移除 drawing renderer 兼容入口和 `@excalidraw/excalidraw` / `roughjs` 直接依赖，绘图完整能力统一通过 `@file-viewer/renderer-drawing` 或 preset 装配。
- [x] 建立 `@file-viewer/renderer-3d` 独立包，并让 `@file-viewer/preset-all` 和 `@file-viewer/vite-plugin` 优先聚合该包的 3D renderer。
- [x] `@file-viewer/core` 已移除 3D model renderer 兼容入口和 `three` 直接依赖，模型完整能力统一通过 `@file-viewer/renderer-3d` 或 preset 装配。
- [x] 建立 `@file-viewer/renderer-text` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的代码 / Markdown renderer。
- [x] `@file-viewer/core` 已移除 code / markdown renderer 兼容入口和 `highlight.js` / `marked` 直接依赖，文本类完整能力统一通过 `@file-viewer/renderer-text` 或 preset 装配。
- [x] 建立 `@file-viewer/renderer-image` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的图片 / HEIC renderer。
- [x] `@file-viewer/core` 已移除 HEIC / HEIF 转换依赖 `heic2any`，普通图片继续由 core 轻量原生预览，完整图片链路统一通过 `@file-viewer/renderer-image` 或 preset 装配。
- [x] 建立 `@file-viewer/renderer-media` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的音频 / 视频 / HLS / MIDI renderer。
- [x] `@file-viewer/core` 已移除 audio / video renderer 兼容入口和 `hls.js` / `@tonejs/midi` 直接依赖，媒体完整能力统一通过 `@file-viewer/renderer-media` 或 preset 装配。
- [x] 建立 `@file-viewer/renderer-geo` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 GeoJSON / KML / GPX / SHP renderer。
- [x] `@file-viewer/core` 已移除 geo 兼容入口和 `@tmcw/togeojson` / `shpjs` / `maplibre-gl` / `proj4` 直接依赖，地理数据完整能力统一通过 `@file-viewer/renderer-geo` 或 preset 装配。
- [x] 建立 `@file-viewer/renderer-data` 独立包，并让 `@file-viewer/preset-all` 和 `@file-viewer/vite-plugin` 优先聚合 PSD / SQLite / Parquet / Avro / WASM / 字体 / AI / EPS / WebArchive renderer。
- [x] 建立 `@file-viewer/renderer-eda` 独立包，并让 `@file-viewer/preset-all` 和 `@file-viewer/vite-plugin` 优先聚合 OLB / DRA / GDSII / OASIS renderer。
- [x] 建立 `@file-viewer/renderer-spreadsheet` 独立包，并让 `@file-viewer/preset-all` 和 `@file-viewer/vite-plugin` 优先聚合 XLSX / XLSM / XLSB / XLS / CSV / ODS / FODS / Numbers renderer。
- [x] `@file-viewer/core` 已移除 data-asset 兼容入口和 `ag-psd` / `sql.js` / `hyparquet` / `avsc` 直接依赖，数据资产完整能力统一通过 `@file-viewer/renderer-data` 或 preset 装配；SQLite WASM 资产路径仍由 core manifest 统一发现。
- [x] `@file-viewer/core` 已移除 EDA 兼容入口和 `cfb` 直接依赖，OLB / DRA / GDSII / OASIS 完整结构预览统一通过 `@file-viewer/renderer-eda` 或 preset 装配。
- [x] `@file-viewer/core` 已移除 spreadsheet 兼容入口和 `styled-exceljs` / `e-virt-table` / `tinycolor2` 直接依赖，表格完整能力统一通过 `@file-viewer/renderer-spreadsheet` 或 preset 装配；Spreadsheet Worker 资产路径仍由 core manifest 统一发现。
- [x] 每个 renderer 包有独立 `package.json#exports`、README、assets manifest、type-check、build 和 smoke 覆盖；`verify:renderer-contracts`、`verify:renderer-assets`、`verify:renderer-standalone-smoke` 与 `verify:smoke-matrix` 会分别检查包契约、资产、独立安装和 renderer package 对应样例覆盖。
- [x] demo 使用 `preset-all`，业务组件 README 默认展示 `preset-lite` / `preset-office` / `preset-engineering` 和单 renderer 精确裁剪两种路线；`verify:ecosystem-readmes` 会检查这些 preset 包名、`@file-viewer/vite-plugin` 和 `virtual:file-viewer-renderers` 口径。
- [x] 全量 preset 和历史兼容包仍能覆盖原来的格式矩阵；`verify:format-support`、`verify:compatibility-api` 和 `verify:compatibility-readmes` 纳入迁移门禁。
- [x] 安装 `@file-viewer/vue3` 不再安装 `@flyfish-dev/cad-viewer`、`styled-exceljs`、`e-virt-table` 或 `tinycolor2`；PDF.js、OFD 解析依赖和 Typst `@myriaddreamin/*` 已随独立 renderer 从默认 core 安装面移出。
- [x] Phase 2 重型链路已从 core 默认安装面全部摘除，Spreadsheet 作为最后一条 Office 重链路已拆到 `@file-viewer/renderer-spreadsheet`。

### Phase 3：体验与自动化

- [x] `@file-viewer/vite-plugin` 能按 `formats` 自动生成 `virtual:file-viewer-renderers`，已覆盖 Word、Spreadsheet、PDF、OFD、Presentation、CAD、Drawing、3D、Typst、Archive、Email、EPUB、Text、Image、Media、XMind、Geo、Data 和 EDA；未知格式会给出明确缺失提示。
- [x] `@file-viewer/vite-plugin` 支持 `scan: true` 源码 hint 自动发现：`fileViewerFormats` / `fileViewerRenderers` / `data-file-viewer-formats` / `accept` 会合并进 renderer 选择，开发和构建阶段都能生成相同 virtual module。
- [x] `@file-viewer/vite-plugin` 的扩展映射覆盖 `@file-viewer/core` 中所有已拆 renderer 的完整扩展列表，`.zipx`、`.cbz`、`.tiff`、`.mjs`、`.gv`、`.mpeg` 等真实业务后缀不会因为插件手写表漂移而漏装；`verify:vite-plugin-format-coverage` 会对照 core 格式矩阵逐项校验。
- [x] `@file-viewer/vite-plugin` 支持 `preset: 'lite' | 'office' | 'engineering' | 'all'`，会导入对应 `@file-viewer/preset-*` 包；同时声明 `formats` 时只补充 preset 外的额外 renderer，适配 pnpm 严格依赖模型。
- [x] 插件能复制已拆 renderer 中需要自托管的 PDF/CAD/Typst/Archive/Data worker、wasm 和 vendor assets，并输出 `flyfish-viewer-assets.json` 部署 manifest；OFD vendor 随 `@file-viewer/renderer-ofd` npm 包离线分发，3D 与 EDA renderer 当前无额外外部资产，Office 等待对应 renderer 拆包后补入。
- [x] demo 构建 chunk 按 renderer 命名，PDF/Office/CAD/Typst/3D 等不会进入首屏主包；`verify:bundle-budget` 会检查主 Demo、文档比对入口和异步 renderer chunk。
- [x] 每个标准组件的文档都提供“快速可运行接入”和“按需 renderer”两种接入方式；生成器会同步到 Vanilla JS / Pure Web、Vue 3、Vue 2.7、Vue 2.6、React、React Legacy、jQuery 和 Svelte 的中英文 README。
- [x] 增加独立安装 smoke：`verify:renderer-standalone-smoke` 会在临时目录安装本地 tarball 版 `@file-viewer/core`、`@file-viewer/vite-plugin`、全部独立 renderer plugin 以及本地依赖闭包，验证每个 renderer 可注册、处理器可挂载，并逐个确认 Vite virtual module 只导入当前选择的 renderer 包。

### Phase 4：专业格式独立内核

- [x] EDA/GDS/OASIS/OrCAD/Allegro 独立 renderer 包建立结构预览入口、README 和解析边界说明。
- [x] GDSII 大元素集会在 `@file-viewer/eda-layout` 生成 WebGL triangle/line/point typed arrays，并由 `@file-viewer/renderer-eda` 自动使用 WebGL canvas；OASIS 文本夹具可生成 SVG，真实二进制 OASIS 仍保持结构索引和后续 WASM/增量渲染边界，不进入 core 首屏链路。
- [x] `@file-viewer/eda-layout` 和 `@file-viewer/eda-orcad` 已作为独立 engine package 建立 package manifest、README、类型导出、安装预算和发布合同；`@file-viewer/renderer-eda` 只负责 UI renderer 协议。
- [x] `@file-viewer/geometry-engine` 已作为独立 geometry engine boundary package 建立 STEP / IGES / IFC / 3DM / BREP 的签名检查、推荐 WASM 内核路线和安装预算；OpenCascade、web-ifc、rhino3dm 不进入 core、标准组件或普通 3D renderer 的默认安装路径。
- [x] docs 明确“结构预览”和“完整可视预览”的差异，避免营销口径误导；`format-fidelity` 已按 XMind、Typst、Draw.io、EDA、OASIS、OLB/DRA、OpenDocument 等格式线写明成熟库、WASM 路线和当前边界。

### Phase 5：发布与质量门禁

- [x] 新增安装体积预算：`@file-viewer/core`、`@file-viewer/vue3`、`@file-viewer/web`、`@file-viewer/preset-lite`、`@file-viewer/preset-office`、`@file-viewer/preset-engineering`、`@file-viewer/preset-all` 的 packed size、unpacked size、文件数、直接依赖数和安装依赖闭包纳入 CI；真实 cold install 秒级计时已由 `verify:cold-install-time` 覆盖。
- [x] 新增 demo bundle 预算：`index.html` 和 `compare.html` 首屏入口统计 raw/gzip/brotli，PDF、Office、CAD、Typst、Archive、3D、Geo、XMind 等重链路必须保持异步 renderer chunk；`verify:bundle-budget` 同时按 `lite` / `office` / `engineering` / `all` preset 统计异步 renderer chunk 预算，防止 preset 聚合线重新互相拖重。
- [x] 新增 release 校验：`verify:renderer-contracts`、`verify:renderer-assets`、`verify:ecosystem-tarballs` 和 `release:ecosystem:list` 会检查 renderer 包 exports、README、发布文件、assets manifest、npm dry-run tarball 和生态 release 清单。
- [x] 官网、文档站、README 的支持矩阵能区分 core、独立 renderer 包、`@file-viewer/preset-lite`、`@file-viewer/preset-office`、`@file-viewer/preset-engineering` 和 `@file-viewer/preset-all`；官网视觉站、文档站、README 和生态总览均已补齐，并由 `verify:ecosystem-readmes` / `site:build` / `docs:build` 纳入回归。
- [x] 迁移完成后 `@file-viewer/core` 的 `dependencies` 只保留真正跨 renderer 的轻量工具，重依赖直接数量接近 0；`verify:core-dependency-budget` 当前要求 core 只有 1 个直接运行时依赖且 0 个 renderer 依赖。

## 当前状态

运行以下命令可以查看当前 core 直接依赖和目标拆包路线：

```bash
pnpm audit:renderer-deps
pnpm audit:renderer-deps -- --json
```

截至当前工作区，`@file-viewer/core` 仍直接声明 1 个运行时依赖：

- Phase 2 已无依赖留在 core；Presentation、Word、Spreadsheet、PDF、OFD、Typst、Archive 和 CAD 均通过独立 renderer 或 preset 装配。
- Phase 3 已无重型体验链路依赖留在 core；XMind、Geo、HEIC、Drawing、3D、Email、Ebook、Text 和 Media 均通过独立 renderer 或 preset 装配。
- Phase 4 已无依赖留在 core；Data Asset 与 EDA 已分别由 `@file-viewer/renderer-data`、`@file-viewer/renderer-eda` 独立承接，复杂数据和工程二进制的后续内核演进不再污染默认安装面。

这说明 renderer 包、分层 preset 和 `preset-all` 已经具备完整重链路拆包基础。短期先保留 `preset-all` 兼容完整能力，常见业务优先使用 `preset-lite`、`preset-office`、`preset-engineering`，长期验收标准是继续补齐 renderer tarball / smoke / release 自动化，并让组件包默认安装始终不拉取 PDF、Office、CAD、Typst、Archive、3D 等重依赖。

## 新增格式解析策略

新增格式不再默认塞进 core。能找到成熟浏览器离线库或 WASM 的链路，优先独立 renderer 包维护；只有体积小、协议简单、跨格式复用明确的解析工具才允许留在 core。

| 格式族 | 当前策略 | 后续演进 |
| --- | --- | --- |
| XMind | `.xmind` 按 ZIP 容器读取，现代文件优先解析 `content.json`，经典文件解析 `content.xml`；Panzoom 交互由 `@file-viewer/renderer-mindmap` 维护。 | 继续补多结构布局、更多 marker 图标和复杂图片资源还原，交互回归覆盖 Pointer、真实鼠标、触摸和移动端双指缩放。 |
| Archive | `@file-viewer/renderer-archive` 使用 `libarchive.js` Worker + WASM，Worker 不可用时降级 ZIP/TAR/GZIP。 | 保持 Worker 超时、IndexedDB 缓存和体积上限，不把压缩包依赖带回 core。 |
| Email | `@file-viewer/renderer-email` 使用 `postal-mime` 和 `@kenjiuno/msgreader`，邮件附件复用统一嵌套预览。 | 增强 MSG 边界样例和附件安全策略。 |
| EPUB/UMD | EPUB 使用 `@file-viewer/renderer-epub` 与按需加载的包内本地引擎；UMD 同样由 `@file-viewer/renderer-epub` 维护结构解析和 `pako` 解压。 | 电子书能力统一在 ebook renderer 中维护，core 保持零运行时依赖；v2.3.0 的 EPUB vendor 不从公网加载，也不向业务生产依赖树暴露内部 XML 解析器。 |
| OLB/DRA | `@file-viewer/renderer-eda` 当前基于 CFB 和二进制线索做安全结构树、实体候选、属性、字符串和诊断展示。 | OrCAD/Allegro 属于专业私有工程格式，完整几何/电气语义会像 PPTX 一样拆独立引擎长期维护，必要时引入自研 WASM。 |
| GDS/OASIS | GDSII 已做记录级解析，小图输出 SVG，大元素集输出 WebGL canvas；OASIS 文本夹具可输出 SVG，真实二进制 OASIS 先做安全结构索引和诊断。 | OASIS 完整几何继续走独立 WASM/增量渲染路线，不进入 core 首屏链路。 |
| DWF/DWFx/CAD | CAD 能力由 `@file-viewer/renderer-cad` 和 `@flyfish-dev/cad-viewer` 承接，WASM/Worker 资源通过资产 manifest 自托管。 | 随 cad-viewer 持续升级 DWF/DWFx、DWG/DXF 体验，core 只保留协议和资源发现。 |
| Typst | `@file-viewer/renderer-typst` 按需加载 Typst WASM 编译、SVG 渲染和本地字体资产。 | 保持离线 WASM / 字体配置入口，后续评估更轻量只读渲染内核。 |
| Draw.io / Excalidraw / Mermaid / PlantUML | Draw.io 使用 diagrams.net 离线 viewer 与安全 SVG fallback；Excalidraw 默认使用 rough.js 只读 SVG，运行环境提供官方 ESM 模块时尝试 restore/exportToSvg；Mermaid 使用官方 SVG renderer；PlantUML 默认离线源码预览，可接入自托管 SVG 服务。 | 保持 vendor 离线随包分发；PlantUML 需要完整图形渲染时推荐企业内网自托管服务端点，避免依赖公共公网服务。 |
| OpenDocument | 常规 ODT/ODS/ODP 走 ZIP+XML 结构解析和 Office renderer 兼容链路。 | 复杂版式继续评估 WebODF / LibreOffice WASM，不进入 core 默认依赖。 |

## 终态验收门禁

完成精细化渲染架构前，以下门禁必须全部通过：

```bash
pnpm audit:renderer-deps
pnpm verify:core-framework-neutral
pnpm verify:core-api
pnpm verify:core-dependency-budget
pnpm verify:renderer-contracts
pnpm verify:renderer-assets
pnpm verify:on-demand-boundaries
pnpm verify:vite-plugin-auto-scan
pnpm verify:vite-plugin-format-coverage
pnpm verify:renderer-standalone-smoke
pnpm verify:install-budget
pnpm verify:cold-install-time
pnpm verify:bundle-budget
pnpm verify:format-support
pnpm verify:ecosystem-versions
pnpm verify:production-entrypoints
pnpm renderers:verify
pnpm docs:build
pnpm build-only
```

已落地与计划中的精细门禁：

- `verify:core-dependency-budget`：已落地。默认按当前基线阻止 core 直接渲染依赖继续膨胀；`verify:core-dependency-budget:strict` 用于拆包完成后的终态，要求 core 重渲染依赖为 0。
- `verify:renderer-contracts`：已落地。检查每个 renderer 包的 `exports`、`files`、README、LICENSE、dist 入口、build/type-check 脚本、wrapper 依赖隔离和 plugin 懒加载出口。
- `verify:renderer-assets`：已落地。检查每个 renderer npm dry-run 中的入口、`new URL(..., import.meta.url)` 本地运行时资源、core asset manifest 字段，以及 `@file-viewer/web` 发布包内的 viewer worker/wasm/vendor assets。
- `verify:on-demand-boundaries`：已落地。检查 core、renderer、preset、标准组件和兼容 alias 的依赖方向，防止组件包重新捆绑重 renderer，确保按需安装边界不会回退。
- `verify:vite-plugin-auto-scan`：已落地。构建 Vite 插件后用临时源码项目验证 `fileViewerFormats`、`data-file-viewer-formats`、`accept` 和注释 hint 能自动映射到对应 renderer 包。
- `verify:vite-plugin-format-coverage`：已落地。构建 core 与 Vite 插件后，对照 `DEFAULT_RENDERER_DEFINITIONS` 逐一验证所有已拆 renderer 扩展都能选中正确包，防止格式矩阵和插件自动装配映射漂移。
- `verify:renderer-standalone-smoke`：已落地全 renderer plugin 独立安装 smoke。它用本地 tarball 构造隔离业务项目，安装 core、Vite 插件、19 个独立 renderer plugin 以及 `@file-viewer/pptx` 等本地依赖闭包；逐个验证 renderer 注册、handler 挂载、Vite selection 映射和 virtual module 只导入当前 renderer 包。后续可扩展为 wrapper 矩阵与真实样例渲染 smoke。
- `verify:install-budget`：已落地。检查关键包和 renderer/wrapper 默认预算的 npm packed size、unpacked size、文件数、直接 runtime dependencies、外部依赖闭包和本地生态包闭包，防止安装面继续膨胀。
- `verify:cold-install-time`：已落地。完整命令会先构建 core、全部 renderer、全部 preset 和 Vue3 组件，再把当前工作区的 core、Vue3 组件、lite / office / engineering / all preset 及其本地依赖闭包打成本地 tarball，在隔离临时目录中执行 `npm install --install-strategy=shallow`，记录真实冷安装耗时、参与安装的本地包数量和 `node_modules` 体积。默认覆盖 `core`、`vue3`、`vue3-lite`、`vue3-office`、`vue3-engineering`、`vue3-all` 六条路线；`verify:migration-gates` 会运行 `pnpm verify:cold-install-time:fast` 覆盖 core、Vue3 基础和 lite preset，专项排查可用 `node scripts/verify-cold-install-time.mjs --target=vue3-office`。
- `verify:bundle-budget`：已落地。检查官方 demo 与文档比对入口的 raw/gzip/brotli 首屏体积，确认完整格式能力仍被拆到异步 renderer chunk，避免 Office/CAD/Typst/Archive/3D 等重链路污染入口包。

## 外部参考

- Vite 生产构建、动态导入错误处理和 Vite 8 chunk 策略: <https://vite.dev/guide/build>
- Rollup `manualChunks` 配置: <https://rollupjs.org/configuration-options/>
- Node.js package `exports` 与 conditional exports: <https://nodejs.org/api/packages.html>
- pnpm optional peer metadata: <https://pnpm.io/package_json#peerdependenciesmeta>
- XMind ZIP / `content.json` 解析事实标准参考: <https://wanglin2.github.io/mind-map-docs/en/api/xmind.html>
- Typst 浏览器 WASM 渲染链路: <https://github.com/myriad-dreamin/typst.ts>
- diagrams.net / draw.io 离线 viewer 和 XML 格式参考: <https://github.com/jgraph/drawio>
- Excalidraw 官方 restore / export utilities: <https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils>
- libarchive.js 本地 Worker/WASM：发布前由 `pnpm archive:copy-assets` 从当前 lockfile 固定的 `libarchive.js` 包同步到 `vendor/libarchive/`，运行时不依赖公网资源。
- WebODF / ODF 浏览器渲染参考: <https://webodf.org/>
- OrCAD / Allegro 开源解析器路线: <https://github.com/Werni2A/OpenOrCadParser>、<https://github.com/Werni2A/OpenAllegroParser>
- GDSII 格式与 JS 解析参考: <https://layouteditor.org/layout/file-formats/gdsii>、<https://github.com/TinyTapeout/gdsii>

<div class="doc-note">
  这个计划的核心不是“拆很多包”本身，而是让用户用到什么才安装什么、打包什么、部署什么。完整能力仍然保留，但默认体验必须轻。
</div>
